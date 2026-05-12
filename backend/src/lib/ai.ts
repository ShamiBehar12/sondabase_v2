import { createHash } from "node:crypto";

export type AiProviderName = "openai" | "anthropic" | "gemini";
export type AiRagMode = "internal" | "provider_managed";

export const AI_PROVIDER_MODELS: Record<AiProviderName, { chat: string[]; embeddings: string[] }> = {
  openai: {
    chat: ["gpt-5", "gpt-4.1"],
    embeddings: ["text-embedding-3-large", "text-embedding-3-small"],
  },
  anthropic: {
    chat: ["claude-sonnet-4-0", "claude-opus-4-1"],
    embeddings: ["text-embedding-3-large"],
  },
  gemini: {
    chat: ["gemini-2.5-pro", "gemini-2.5-flash"],
    embeddings: ["text-embedding-3-large"],
  },
};

export function defaultAiSettings() {
  return {
    activeProvider: "openai" as AiProviderName,
    activeChatModel: "gpt-5",
    activeEmbeddingModel: "text-embedding-3-large",
    ragMode: "internal" as AiRagMode,
    topK: 5,
    maxChunks: 8,
    temperature: 0.2,
  };
}

export function tokenize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

const STOPWORDS = new Set([
  "a", "al", "algo", "algum", "alguna", "alguno", "ante", "ano", "anos",
  "ao", "aos", "as", "at", "ate", "com", "como", "con", "contra",
  "certificacion", "certificado", "certificados", "count",
  "da", "das", "de", "del", "desde", "do", "dos",
  "e", "el", "ella", "em", "en", "entre", "era", "es", "esa", "ese",
  "esta", "estado", "este", "esto", "experiencia", "experiencias",
  "for", "forma", "ha", "hasta", "hay", "individual", "junto",
  "la", "las", "le", "legalmente", "lo", "los",
  "mais", "menos", "na", "nas", "no", "nos",
  "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos",
  "per", "por", "porque", "projeto", "projetos", "project", "projects",
  "proyecto", "proyectos", "publica", "publicas", "publico", "publicos",
  "que", "relacionadas", "relacionado", "relacionados",
  "se", "sem", "ser", "si", "sin", "so", "solicitado", "su", "sus",
  "te", "tem", "to", "um", "uma", "un", "una", "uno", "y",
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  ajuda: ["ayuda", "soporte", "suporte"],
  ayuda: ["ajuda", "soporte", "suporte"],
  suporte: ["soporte", "ajuda", "ayuda"],
  soporte: ["suporte", "ajuda", "ayuda"],
  bilhetagem: ["bilhetagem", "biletagem", "recaudo", "ticketing"],
  biletagem: ["bilhetagem", "biletagem", "recaudo", "ticketing"],
  recaudo: ["bilhetagem", "biletagem", "ticketing"],
  cof: ["cof"],
};

function normalizeForSearch(input: string) {
  return input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function isRelevantToken(token: string) {
  if (/^\d+$/.test(token)) return true;
  if (token.length < 3) return false;
  return !STOPWORDS.has(token);
}

export function meaningfulTokens(input: string) {
  return [...new Set(tokenize(input).filter(isRelevantToken))];
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandTokenVariants(token: string) {
  return [...new Set([token, ...(TOKEN_SYNONYMS[token] || [])].filter(isRelevantToken))];
}

function matchesWholeWord(haystack: string, token: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, "i").test(haystack);
}

export function uniqueTokens(input: string) {
  return [...new Set(tokenize(input))];
}

export function buildDocumentHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function buildSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("\n").trim();
}

export function estimateTokenCount(input: string) {
  return Math.ceil(input.trim().split(/\s+/).filter(Boolean).length * 1.3);
}

export function computeMatchStats(query: string, searchText: string, title?: string | null) {
  const queryTokens = meaningfulTokens(query);
  const haystack = normalizeForSearch(searchText);
  const normalizedTitle = normalizeForSearch(title || "");
  let score = 0;
  const matchedTokens: string[] = [];
  let titleMatches = 0;
  let bodyMatches = 0;
  let exactMatches = 0;

  for (const token of queryTokens) {
    const tokenVariants = expandTokenVariants(token);
    const matchedVariantInTitle = tokenVariants.find((variant) => normalizedTitle.includes(variant));
    const matchedVariantInBody = tokenVariants.find((variant) => haystack.includes(variant));
    const exactMatch =
      matchesWholeWord(normalizedTitle, token) || matchesWholeWord(haystack, token);
    const matchedInTitle = Boolean(matchedVariantInTitle);
    const matchedInBody = Boolean(matchedVariantInBody);

    if (matchedInTitle || matchedInBody) {
      matchedTokens.push(token);
    }

    if (matchedInTitle) {
      titleMatches += 1;
      score += 8;
      if (exactMatch) {
        exactMatches += 1;
        score += token.length <= 4 ? 4 : 2;
      }
      continue;
    }

    if (matchedInBody) {
      bodyMatches += 1;
      score += 3;
      if (exactMatch) {
        exactMatches += 1;
        score += token.length <= 4 ? 4 : 1.5;
      }
    }
  }

  const coverage = queryTokens.length ? matchedTokens.length / queryTokens.length : 0;
  const normalizedScore = queryTokens.length ? score / queryTokens.length : 0;

  return {
    queryTokens,
    matchedTokens,
    titleMatches,
    bodyMatches,
    exactMatches,
    coverage: Number(coverage.toFixed(3)),
    score: Number((normalizedScore * (1 + Math.min(coverage, 0.6))).toFixed(2)),
  };
}

export type MatchStats = ReturnType<typeof computeMatchStats>;

export type RankedChunk = {
  chunk: any;
  lexicalStats: MatchStats;
  vectorScore: number;
  hybridScore: number;
  page: number;
};

export type HybridDocumentMatch = {
  document: any;
  lexicalStats: MatchStats;
  documentVectorScore: number;
  finalScore: number;
  bestChunk: RankedChunk | null;
  matchSource: "chunk" | "metadata";
  referencePages: number[];
  matchTerms: string[];
  reason: string;
};

export function computeMatchScore(query: string, searchText: string, title?: string | null) {
  return computeMatchStats(query, searchText, title).score;
}

export function isStrongMatch(stats: ReturnType<typeof computeMatchStats>) {
  const tokenCount = stats.queryTokens.length;
  if (!tokenCount) return false;

  if (tokenCount <= 3) {
    return (
      (stats.exactMatches >= 1 && stats.score >= 2) ||
      (stats.matchedTokens.length >= 1 && stats.score >= 2.5)
    );
  }

  if (tokenCount <= 7) {
    return stats.matchedTokens.length >= 2 && stats.coverage >= 0.28 && stats.score >= 2.2;
  }

  return stats.matchedTokens.length >= 3 && stats.coverage >= 0.2 && stats.score >= 1.8;
}

export function extractReason(query: string, searchText: string) {
  const stats = computeMatchStats(query, searchText);
  const matched = stats.matchedTokens.slice(0, 5);

  if (!matched.length) {
    return "Correspondencia baseada em metadados gerais do certificado.";
  }

  return `Correspondencia encontrada para: ${matched.join(", ")}.`;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function normalizeVectorScore(score: number) {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Number((score * 8).toFixed(2));
}

function computeHybridScore(stats: MatchStats, vectorScore: number, source: "chunk" | "metadata") {
  const coverageBoost = stats.coverage * 4;
  const exactBoost = stats.exactMatches * 0.8;
  const titleBoost = source === "metadata" ? stats.titleMatches * 1.1 : stats.titleMatches * 0.6;
  const vectorBoost = normalizeVectorScore(vectorScore);
  const sourceBias = source === "chunk" ? 0.4 : 0;

  return Number((stats.score + coverageBoost + exactBoost + titleBoost + vectorBoost + sourceBias).toFixed(2));
}

function getEmbeddingVector(input: unknown) {
  return Array.isArray(input) ? input.map(Number) : null;
}

export function collectMatchedPages(chunks: RankedChunk[]) {
  return Array.from(
    new Set(
      chunks
        .filter((entry) => entry.lexicalStats.matchedTokens.length > 0)
        .sort((left, right) => right.hybridScore - left.hybridScore)
        .map((entry) => entry.page),
    ),
  ).slice(0, 3);
}

export function rankDocumentMatch(query: string, document: any, queryEmbedding?: number[] | null): HybridDocumentMatch {
  const lexicalStats = computeMatchStats(query, document.searchText || "", document.title);
  const documentVector = queryEmbedding ? getEmbeddingVector(document.embeddingJson) : null;
  const documentVectorScore = queryEmbedding && documentVector ? cosineSimilarity(queryEmbedding, documentVector) : 0;

  const rankedChunks: RankedChunk[] = (document.chunks || [])
    .map((chunk: any) => {
      const chunkLexicalStats = computeMatchStats(query, chunk.chunkText || "", document.title);
      const chunkVector = queryEmbedding ? getEmbeddingVector(chunk.embeddingJson) : null;
      const vectorScore = queryEmbedding && chunkVector ? cosineSimilarity(queryEmbedding, chunkVector) : 0;
      return {
        chunk,
        lexicalStats: chunkLexicalStats,
        vectorScore,
        hybridScore: computeHybridScore(chunkLexicalStats, vectorScore, "chunk"),
        page: Number(chunk.chunkOrder || 0) + 1,
      };
    })
    .sort((left: RankedChunk, right: RankedChunk) => right.hybridScore - left.hybridScore);

  const bestChunk = rankedChunks[0] || null;
  const metadataScore = computeHybridScore(lexicalStats, documentVectorScore, "metadata");
  const useChunk = Boolean(bestChunk && bestChunk.hybridScore >= metadataScore);
  const activeStats = useChunk && bestChunk ? bestChunk.lexicalStats : lexicalStats;

  return {
    document,
    lexicalStats: activeStats,
    documentVectorScore,
    finalScore: useChunk && bestChunk ? bestChunk.hybridScore : metadataScore,
    bestChunk,
    matchSource: useChunk ? "chunk" : "metadata",
    referencePages: useChunk ? collectMatchedPages(rankedChunks) : [],
    matchTerms: [...new Set(activeStats.matchedTokens)].slice(0, 6),
    reason: extractReason(query, useChunk && bestChunk ? bestChunk.chunk.chunkText || "" : document.searchText || ""),
  };
}

export function buildFallbackAnswer(matches: Array<{
  title: string;
  matchTerms?: string[];
  referencePages?: number[];
}>) {
  if (!matches.length) {
    return "Não encontrei certificados aprovados com aderência suficiente ao pedido informado.";
  }

  const topMatch = matches[0];
  const matchTerms = (topMatch.matchTerms || []).slice(0, 4).join(", ");
  const pages =
    topMatch.referencePages && topMatch.referencePages.length > 0
      ? topMatch.referencePages.length === 1
        ? `na página ${topMatch.referencePages[0]}`
        : `nas páginas ${topMatch.referencePages.join(", ")}`
      : null;

  const firstSentence = `Encontrei ${matches.length} certificado(s) aderentes ao pedido.`;
  const secondSentence = topMatch.title
    ? `O resultado mais forte é "${topMatch.title}"${pages ? `, com referência ${pages}` : ""}.`
    : null;
  const thirdSentence = matchTerms ? `Principais matches: ${matchTerms}.` : null;

  return [firstSentence, secondSentence, thirdSentence].filter(Boolean).join(" ");
}

export function classifyQueryIntent(
  message: string,
  history: Array<{ role: string; content: string }>,
): "rag" | "clarification" {
  if (history.length < 2) return "rag";
  const lower = message.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const clarificationPatterns = [
    /\b(ese|eso|este|esto|esa|esta|aquel|aquello)\b/,
    /\b(that|this|those|these)\b/,
    /\b(el|la|los|las) (certificado|documento|resultado|primero|segundo|tercero|ultimo|anterior|mencionado)\b/,
    /^(y |e |pero |ademas |tambien |and |but |also )/,
    /\b(explica|explicame|detalla|amplia|elabora|cuentame mas|dime mas)\b/,
    /\b(explain|elaborate|tell me more|give me more details)\b/,
    /^(por que|porque|why|how come)\b/,
    /\b(que significa|que quiere decir|what does|what is|what are)\b/,
    /\b(mismo|misma|el de|la de)\b/,
  ];
  const tokens = meaningfulTokens(message);
  const matchesClarification = clarificationPatterns.some((p) => p.test(lower));
  const isShortWithoutSearchTerms =
    tokens.length <= 3 &&
    !/\b(busca|buscar|encuentra|muestra|show|find|search|necesito|quiero|dame|lista|listar)\b/.test(lower);
  if (matchesClarification || isShortWithoutSearchTerms) return "clarification";
  return "rag";
}
