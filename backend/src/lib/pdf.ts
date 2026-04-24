import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { env } from "../env.js";

const OCR_LANGUAGES = ["eng", "spa", "por"];
const OCR_CACHE_PATH = path.join(os.tmpdir(), "sondabase-tesseract-cache");
const OCR_MAX_PAGES = 12;
const MIN_MEANINGFUL_CHARACTERS = 180;
const PAGE_MARKER_REGEX = /--\s*\d+\s+of\s+\d+\s*--/gi;
const PAGE_SPLIT_REGEX = /--\s*(\d+)\s+of\s+\d+\s*--/gi;
const APOSTILLE_HINTS = [
  "apostille",
  "convention de la haye",
  "ministerio de relaciones exteriores",
  "republica de colombia",
  "libertad y orden",
];

type PdfPageText = {
  pageNumber: number;
  text: string;
};

export async function extractPdfText(absolutePath: string) {
  const buffer = await fs.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return (result.text || "").trim();
}

export async function extractPdfTextDirect(absolutePath: string) {
  const directText = normalizeExtractedText(await extractPdfText(absolutePath));
  const pages = extractDirectPageTexts(directText);

  return {
    text: pages.map((page) => page.text).join("\n\n") || directText,
    pages: pages.length ? pages : directText ? [{ pageNumber: 1, text: directText }] : [],
    mode: "direct" as const,
  };
}

export function normalizeExtractedText(input: string) {
  return input
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function countMeaningfulCharacters(input: string) {
  return (input.match(/[\p{L}\p{N}]/gu) || []).length;
}

function hasPoorDirectExtraction(input: string) {
  const normalized = normalizeExtractedText(input);
  if (!normalized) {
    return true;
  }

  const withoutPageMarkers = normalized.replace(PAGE_MARKER_REGEX, "").replace(/\s+/g, "").trim();
  if (withoutPageMarkers.length < 40) {
    return true;
  }

  const meaningfulCharacters = countMeaningfulCharacters(normalized);
  if (meaningfulCharacters < MIN_MEANINGFUL_CHARACTERS) {
    return true;
  }

  if (isLikelyApostillePage(normalized) && meaningfulCharacters < 5000) {
    return true;
  }

  const pageMarkers = normalized.match(PAGE_MARKER_REGEX) || [];
  return pageMarkers.length > 0 && meaningfulCharacters / Math.max(pageMarkers.length, 1) < 50;
}

async function renderPdfPagesForOcr(absolutePath: string, maxPages = OCR_MAX_PAGES) {
  const buffer = await fs.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getScreenshot({
      first: maxPages,
      imageBuffer: true,
      imageDataUrl: false,
      scale: 1.8,
    });

    return result.pages
      .map((page: any, index: number) => {
        if (Buffer.isBuffer(page.data)) {
          return { pageNumber: index + 1, data: page.data };
        }
        if (ArrayBuffer.isView(page.data)) {
          return { pageNumber: index + 1, data: Buffer.from(page.data) };
        }
        return null;
      })
      .filter((pageData: { pageNumber: number; data: Buffer } | null): pageData is { pageNumber: number; data: Buffer } => Boolean(pageData));
  } finally {
    await parser.destroy();
  }
}

async function performOcrOnRenderedPages(images: Array<{ pageNumber: number; data: Buffer }>) {
  if (images.length === 0) {
    return [];
  }

  const useLocalLanguageFiles = Boolean(env.tesseractLangPath);
  if (env.tesseractLangPath) {
    for (const language of OCR_LANGUAGES) {
      const expectedFile = path.join(env.tesseractLangPath, `${language}.traineddata`);
      try {
        await fs.access(expectedFile);
      } catch {
        throw new Error(
          `OCR language file not found: ${expectedFile}. Add the required .traineddata files or remove TESSERACT_LANG_PATH to use runtime downloads.`,
        );
      }
    }
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    worker = await createWorker(OCR_LANGUAGES, 1, {
      cachePath: OCR_CACHE_PATH,
      langPath: env.tesseractLangPath || undefined,
      gzip: !useLocalLanguageFiles,
    });

    const texts: PdfPageText[] = [];
    for (const image of images) {
      const result = await worker.recognize(image.data);
      const text = result.data?.text?.trim();
      if (text) {
        texts.push({
          pageNumber: image.pageNumber,
          text: normalizeExtractedText(text),
        });
      }
    }
    return texts;
  } catch (error: any) {
    const message = error?.message || String(error);
    if (message.toLowerCase().includes("fetch failed")) {
      throw new Error(
        "OCR could not download Tesseract language data. Configure TESSERACT_LANG_PATH or allow internet access for the first OCR run.",
      );
    }
    throw error;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

export async function extractPdfTextWithOcrFallback(absolutePath: string) {
  const directText = normalizeExtractedText(await extractPdfText(absolutePath));
  if (!hasPoorDirectExtraction(directText)) {
    const pages = extractDirectPageTexts(directText);
    return {
      text: pages.map((page) => page.text).join("\n\n"),
      pages: pages.length ? pages : [{ pageNumber: 1, text: directText }],
      mode: "direct" as const,
    };
  }

  const renderedPages = await renderPdfPagesForOcr(absolutePath);
  const ocrPages = filterMeaningfulPages(await performOcrOnRenderedPages(renderedPages));
  const ocrText = ocrPages.map((page) => page.text).join("\n\n");
  const combinedText = normalizeExtractedText([directText, ocrText].filter(Boolean).join("\n\n"));

  return {
    text: combinedText,
    pages: ocrPages,
    mode: ocrText ? ("ocr" as const) : ("direct" as const),
  };
}

export function splitIntoChunks(input: string, chunkSize = 1200, overlap = 150) {
  const text = normalizeExtractedText(input);
  if (!text) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + chunkSize);
    const chunk = text.slice(cursor, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}

function extractDirectPageTexts(input: string) {
  const matches = [...input.matchAll(PAGE_SPLIT_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  const pages: PdfPageText[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const pageNumber = Number(current[1]);
    const start = current.index! + current[0].length;
    const end = next?.index ?? input.length;
    const pageText = normalizeExtractedText(input.slice(start, end));
    if (pageText) {
      pages.push({ pageNumber, text: pageText });
    }
  }

  return filterMeaningfulPages(pages);
}

function isLikelyApostillePage(text: string) {
  const normalized = text.toLowerCase();
  const hits = APOSTILLE_HINTS.filter((hint) => normalized.includes(hint)).length;
  return hits >= 3;
}

function filterMeaningfulPages(pages: PdfPageText[]) {
  const normalized = pages
    .map((page) => ({
      pageNumber: page.pageNumber,
      text: normalizeExtractedText(page.text),
    }))
    .filter((page) => countMeaningfulCharacters(page.text) >= 60);

  const substantialPages = normalized.filter((page) => countMeaningfulCharacters(page.text) >= 220);
  if (substantialPages.length >= 2) {
    const withoutApostille = normalized.filter((page) => !isLikelyApostillePage(page.text));
    if (withoutApostille.length > 0) {
      return withoutApostille;
    }
  }

  return normalized;
}
