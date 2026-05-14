import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { nanoid } from "nanoid";
import { env } from "./env.js";
import {
  AI_PROVIDER_MODELS,
  buildFallbackAnswer,
  buildDocumentHash,
  buildSearchText,
  classifyQueryIntent,
  defaultAiSettings,
  estimateTokenCount,
  isStrongMatch,
  rankDocumentMatch,
  type MatchStats,
} from "./lib/ai.js";
import { extractPdfTextDirect, extractPdfTextWithOcrFallback } from "./lib/pdf.js";
import { generateOpenAIAnswer, generateOpenAIEmbedding, testOpenAIConnection, type ChatMessage } from "./lib/openai.js";
import { prisma } from "./lib/prisma.js";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
} from "./lib/auth.js";
import { bucketFilePath, ensureBucket, fileExists } from "./lib/files.js";
import { delegateFor, tableMap, type TableName } from "./lib/mappers.js";
import { parseOrFilter, queryPayloadSchema } from "./lib/query.js";

type AppUser = {
  id: string;
  email: string;
  role: string;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AppUser;
  }
}

const app = Fastify({
  logger: { level: "warn" },
  disableRequestLogging: true,
  bodyLimit: 50 * 1024 * 1024,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});
await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
await app.register(sensible);

app.addHook("preHandler", async (request) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token);
    request.authUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    request.authUser = undefined;
  }
});

function requireAuth(request: typeof app extends any ? any : never) {
  if (!request.authUser) {
    throw app.httpErrors.unauthorized("Authentication required");
  }
  return request.authUser as AppUser;
}

function requireAdmin(request: typeof app extends any ? any : never) {
  const user = requireAuth(request);
  if (user.role !== "admin") {
    throw app.httpErrors.forbidden("Administrator access required");
  }
  return user;
}

function normalizeLookupName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/i, "")
    .replace(/[^\w\s()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveContentType(absolutePath: string) {
  const extension = path.extname(absolutePath).toLowerCase();
  return extension === ".pdf"
    ? "application/pdf"
    : extension === ".png"
      ? "image/png"
      : extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
}

async function sendStoredFile(reply: any, absolutePath: string, fileName: string, download?: string) {
  reply.header("Content-Type", resolveContentType(absolutePath));
  const disposition = download === "1" ? "attachment" : "inline";
  const encodedFileName = encodeURIComponent(fileName);
  reply.header("Content-Disposition", `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`);
  return reply.send(await fs.readFile(absolutePath));
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pathParam(request: { params: unknown }, key: string) {
  return (request.params as Record<string, string>)[key];
}

function buildAiMatchReference(
  document: any,
  options?: {
    source?: "chunk" | "metadata";
    bestChunk?: { chunk?: any } | null;
    referencePages?: number[];
  },
): { referenceLabel: string; referencePages: number[]; citations: string[] } {
  const source = options?.source ?? "metadata";
  const chunkText = options?.bestChunk?.chunk?.chunkText?.trim();
  const referencePages = (options?.referencePages || []).filter(
    (page): page is number => typeof page === "number" && Number.isFinite(page) && page > 0,
  );
  if (source === "chunk" && chunkText) {
    const label =
      referencePages.length > 1
        ? `Páginas ${referencePages.join(", ")}`
        : `Página ${referencePages[0] || Number(options?.bestChunk?.chunk?.chunkOrder ?? 0) + 1}`;
    return {
      referenceLabel: label,
      referencePages,
      citations: [chunkText.slice(0, 320)],
    };
  }

  return {
    referenceLabel: "Metadados do certificado",
    referencePages: [],
    citations: [document.searchText?.slice(0, 240) || ""].filter(Boolean),
  };
}

function collectMatchTerms(stats: MatchStats): string[] {
  return Array.from(new Set<string>((stats.matchedTokens || []).filter(Boolean))).slice(0, 6);
}

function normalizeRole(roles: { role: string }[]) {
  if (roles.some((entry) => entry.role === "admin")) return "admin";
  if (roles.some((entry) => entry.role === "moderator")) return "moderator";
  return "user";
}

function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function convertKeysDeep(input: any, direction: "camel" | "snake"): any {
  if (Array.isArray(input)) {
    return input.map((item) => convertKeysDeep(item, direction));
  }

  if (!input || typeof input !== "object" || input instanceof Date) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      direction === "camel" ? toCamelCase(key) : toSnakeCase(key),
      convertKeysDeep(value, direction),
    ]),
  );
}

function toSession(user: {
  id: string;
  email: string;
  profile?: { fullName: string | null; avatarUrl: string | null } | null;
  roles?: { role: string }[];
}) {
  const role = normalizeRole(user.roles || []);
  return {
    accessToken: signAccessToken(user.id, user.email, role),
    refreshToken: signRefreshToken(user.id, user.email, role),
    user: {
      id: user.id,
      email: user.email,
      role,
      full_name: user.profile?.fullName ?? "",
      avatar_url: user.profile?.avatarUrl ?? "",
    },
  };
}

function matchesFilters(row: Record<string, any>, filters: { field: string; value: any }[]) {
  return filters.every((filter) => {
    const current = row[filter.field];
    return String(current ?? "") === String(filter.value ?? "");
  });
}

function buildWhere(filters: { field: string; op: "eq" | "gte" | "lte" | "in"; value?: any }[]) {
  const where: Record<string, any> = {};

  filters.forEach((filter) => {
    const key = toCamelCase(filter.field);
    if (filter.op === "eq") {
      where[key] = filter.value;
      return;
    }

    if (filter.op === "in") {
      where[key] = {
        in: Array.isArray(filter.value) ? filter.value : [filter.value],
      };
      return;
    }

    where[key] = {
      ...(where[key] || {}),
      [filter.op]: filter.value,
    };
  });

  return where;
}

function normalizeRow(table: TableName, row: Record<string, any>) {
  if (table === "content_items" && row.contentType && !row.content_type) {
    row.content_type = row.contentType;
    delete row.contentType;
  }
  if (row.author?.profile && !row.author_name) {
    row.author_name = row.author.profile.fullName ?? "Unknown";
  }
  if (row.reviewer?.profile && !row.reviewer_name) {
    row.reviewer_name = row.reviewer.profile.fullName ?? "Unknown";
  }
  return convertKeysDeep(row, "snake");
}

function canReadRow(table: TableName, row: Record<string, any>, user?: AppUser) {
  if (user?.role === "admin") return true;

  switch (table) {
    case "profiles":
      return Boolean(user && row.user_id === user.id);
    case "user_roles":
      return Boolean(user && row.user_id === user.id);
    case "certificates":
    case "professional_certificates":
      return row.is_verified === true || row.user_id === user?.id;
    case "success_stories":
      return row.is_verified === true || row.user_id === user?.id;
    case "certificate_approvals":
    case "certificate_rejections":
    case "success_story_approvals":
    case "success_story_rejections":
      return row.user_id === user?.id;
    case "content_types":
    case "tags":
    case "avatar_templates":
      return true;
    case "content_items":
      return row.autor_id === user?.id || ["admin", "moderator"].includes(user?.role || "") || row.status === "aprovado";
    case "content_reviews":
    case "content_notifications":
    case "content_audit_logs":
    case "content_attachments":
      return Boolean(user);
    default:
      return Boolean(user);
  }
}

async function enforceMutationAccess(table: TableName, request: any, filters: any[], data?: Record<string, any>) {
  const user = requireAuth(request);
  if (user.role === "admin") return;

  const ownerFields = ["userId", "user_id", "autorId", "autor_id", "reviewerId", "reviewer_id", "actorId", "actor_id"];
  const ownerField = ownerFields.find((field) => field in (data || {}));
  if (ownerField && String((data || {})[ownerField]) === user.id) return;

  if (filters.some((filter) => String(filter.value) === user.id)) return;

  throw app.httpErrors.forbidden("Operation not allowed");
}

async function ensureAiSettings() {
  const existing = await prisma.aiSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    if (existing.activeChatModel === "gpt-5") {
      return prisma.aiSettings.update({
        where: { id: existing.id },
        data: { activeChatModel: "gpt-4o-mini" },
      });
    }
    return existing;
  }

  return prisma.aiSettings.create({
    data: defaultAiSettings(),
  });
}

function createCertificateSearchText(record: Record<string, any>) {
  return buildSearchText([
    record.title,
    record.description,
    record.descriptionPt,
    record.descriptionEn,
    record.descriptionEs,
    record.issuingOrganization,
    record.certificateNumber,
    record.country,
    Array.isArray(record.tags) ? record.tags.join(", ") : JSON.stringify(record.tags ?? []),
  ]);
}

function createProfessionalCertificateSearchText(record: Record<string, any>) {
  return buildSearchText([
    record.title,
    record.description,
    record.descriptionPt,
    record.descriptionEn,
    record.descriptionEs,
    record.professionalCouncil,
    record.institution,
    record.certificationType,
    record.specializationArea,
    record.country,
    record.stateProvince,
    record.city,
    Array.isArray(record.tags) ? record.tags.join(", ") : JSON.stringify(record.tags ?? []),
  ]);
}

async function syncAiIndexForRecord(table: "certificates" | "professional_certificates", row: Record<string, any>) {
  const settings = await ensureAiSettings();
  const recordType = table === "certificates" ? "certificate" : "professional_certificate";
  const metadataSearchText =
    table === "certificates"
      ? createCertificateSearchText(row)
      : createProfessionalCertificateSearchText(row);
  let extractedPdfText = "";
  let extractedPdfPages: Array<{ pageNumber: number; text: string }> = [];

  try {
    const aiFilePath =
      table === "certificates" && row.ocrFilePath
        ? bucketFilePath("certificates", row.ocrFilePath)
        : null;
    const aiMimeType =
      table === "certificates" && row.ocrMimeType
        ? row.ocrMimeType
        : null;

    if (aiFilePath && aiMimeType === "application/pdf") {
      const extraction = await extractPdfTextDirect(aiFilePath);
      extractedPdfText = extraction.text;
      extractedPdfPages = extraction.pages || [];
    }
  } catch (error: any) {
    app.log.warn(`Failed to extract AI PDF text for ${row.ocrFilePath || row.filePath}: ${error?.message || error}`);
  }

  const searchText = buildSearchText([metadataSearchText, extractedPdfText]);
  const contentChunks = extractedPdfPages.length
    ? extractedPdfPages
    : extractedPdfText
      ? [{ pageNumber: 1, text: extractedPdfText }]
      : [];

  const metadataJson = {
    userId: row.userId,
    country: row.country ?? null,
    tags: row.tags ?? [],
    certificateType: recordType,
    title: row.title ?? "",
  };

  let generatedEmbedding: number[] | null = null;
  if (settings.activeProvider === "openai" && env.openAiApiKey) {
    try {
      generatedEmbedding = await generateOpenAIEmbedding(searchText, settings.activeEmbeddingModel);
    } catch (error: any) {
      app.log.warn(`OpenAI document embedding fallback for ${row.filePath}: ${error?.message || error}`);
    }
  }
  const embeddingJson = generatedEmbedding ?? undefined;
  const aiDocumentIndex = await prisma.aiDocumentIndex.upsert({
    where: {
      recordType_recordId: {
        recordType,
        recordId: row.id,
      },
    },
    update: {
      userId: row.userId,
      title: row.title,
      filePath: row.filePath,
      fileName: row.fileName,
      mimeType: row.mimeType,
      documentHash: buildDocumentHash(`${row.filePath}:${row.updatedAt?.toISOString?.() ?? ""}:${searchText}`),
      provider: settings.activeProvider,
      embeddingModel: settings.activeEmbeddingModel,
      status: "indexed",
      isVerifiedSnapshot: Boolean(row.isVerified),
      searchText,
      embeddingJson,
      metadataJson,
      lastError: null,
    },
    create: {
      userId: row.userId,
      recordType,
      recordId: row.id,
      title: row.title,
      filePath: row.filePath,
      fileName: row.fileName,
      mimeType: row.mimeType,
      documentHash: buildDocumentHash(`${row.filePath}:${row.createdAt?.toISOString?.() ?? ""}:${searchText}`),
      provider: settings.activeProvider,
      embeddingModel: settings.activeEmbeddingModel,
      status: "indexed",
      isVerifiedSnapshot: Boolean(row.isVerified),
      searchText,
      embeddingJson,
      metadataJson,
    },
  });

  await prisma.aiDocumentChunk.deleteMany({
    where: { documentIndexId: aiDocumentIndex.id },
  });

  for (let index = 0; index < contentChunks.length; index += 1) {
    const chunk = contentChunks[index];
    const chunkText = chunk.text;
    const chunkEmbedding =
      settings.activeProvider === "openai" && env.openAiApiKey
        ? await (async () => {
            try {
              return await generateOpenAIEmbedding(chunkText, settings.activeEmbeddingModel);
            } catch (error: any) {
              app.log.warn(`OpenAI chunk embedding fallback for ${row.filePath}#${chunk.pageNumber}: ${error?.message || error}`);
              return null;
            }
          })()
        : null;

    await prisma.aiDocumentChunk.create({
      data: {
        documentIndexId: aiDocumentIndex.id,
        chunkOrder: Math.max(0, chunk.pageNumber - 1),
        chunkText,
        embeddingJson: chunkEmbedding ?? undefined,
        tokenCount: estimateTokenCount(chunkText),
      },
    });
  }

  return aiDocumentIndex;
}

async function deleteAiIndexForRecord(recordType: "certificate" | "professional_certificate", recordId: string) {
  await prisma.aiDocumentIndex.deleteMany({
    where: { recordType, recordId },
  });
}

app.get("/health", async () => ({
  ok: true,
  service: "backend",
  timestamp: new Date().toISOString(),
}));

app.get("/api/ai/providers", async (request) => {
  requireAdmin(request);

  return {
    data: Object.entries(AI_PROVIDER_MODELS).map(([provider, models]) => ({
      provider,
      chat_models: models.chat,
      embedding_models: models.embeddings,
    })),
    error: null,
  };
});

app.get("/api/ai/settings", async (request) => {
  requireAdmin(request);
  const settings = await ensureAiSettings();
  return { data: settings, error: null };
});

app.patch("/api/ai/settings", async (request) => {
  const user = requireAdmin(request);
  const settings = await ensureAiSettings();
  const body = request.body as Partial<{
    activeProvider: string;
    activeChatModel: string;
    activeEmbeddingModel: string;
    ragMode: string;
    topK: number;
    maxChunks: number;
    temperature: number;
  }>;

  const provider = (body.activeProvider || settings.activeProvider) as keyof typeof AI_PROVIDER_MODELS;
  if (!(provider in AI_PROVIDER_MODELS)) {
    throw app.httpErrors.badRequest("Unknown AI provider");
  }

  const updated = await prisma.aiSettings.update({
    where: { id: settings.id },
    data: {
      activeProvider: provider,
      activeChatModel: body.activeChatModel || settings.activeChatModel,
      activeEmbeddingModel: body.activeEmbeddingModel || settings.activeEmbeddingModel,
      ragMode: body.ragMode || settings.ragMode,
      topK: body.topK ?? settings.topK,
      maxChunks: body.maxChunks ?? settings.maxChunks,
      temperature: body.temperature ?? settings.temperature,
      updatedBy: user.id,
    },
  });

  return { data: updated, error: null };
});

app.post("/api/ai/providers/test", async (request) => {
  requireAdmin(request);
  const body = request.body as { provider?: string };
  const provider = (body.provider || env.aiProvider || "openai").toLowerCase();

  if (provider === "openai") {
    try {
      const result = await testOpenAIConnection();
      return {
        data: {
          provider,
          ok: result.ok,
          message: result.message,
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: {
          provider,
          ok: false,
          message: error?.message || "Falha ao validar a OpenAI.",
        },
        error: null,
      };
    }
  }

  return {
    data: {
      provider,
      ok:
        provider === "anthropic"
          ? Boolean(env.anthropicApiKey)
          : provider === "gemini"
            ? Boolean(env.geminiApiKey)
            : false,
      message: "Provider configurado apenas em modo placeholder nesta versão.",
    },
    error: null,
  };
});

app.get("/api/ai/index/status", async (request) => {
  requireAdmin(request);
  const [summary, recent] = await Promise.all([
    prisma.aiDocumentIndex.groupBy({
      by: ["status"],
      where: {
        recordType: "certificate",
      },
      _count: { _all: true },
    }),
    prisma.aiDocumentIndex.findMany({
      where: {
        recordType: "certificate",
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    data: {
      summary: summary.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      recent,
    },
    error: null,
  };
});

app.get("/api/ai/index/certificate/:id", async (request) => {
  requireAdmin(request);
  const id = pathParam(request, "id");

  const indexedDocument = await prisma.aiDocumentIndex.findUnique({
    where: {
      recordType_recordId: {
        recordType: "certificate",
        recordId: id,
      },
    },
    include: {
      chunks: {
        orderBy: { chunkOrder: "asc" },
      },
    },
  });

  if (!indexedDocument) {
    throw app.httpErrors.notFound("Indexed AI document not found for this certificate");
  }

  return {
    data: {
      id: indexedDocument.id,
      recordType: indexedDocument.recordType,
      recordId: indexedDocument.recordId,
      title: indexedDocument.title,
      fileName: indexedDocument.fileName,
      status: indexedDocument.status,
      isVerifiedSnapshot: indexedDocument.isVerifiedSnapshot,
      updatedAt: indexedDocument.updatedAt,
      searchText: indexedDocument.searchText || "",
      chunkCount: indexedDocument.chunks.length,
      chunks: indexedDocument.chunks.map((chunk) => ({
        id: chunk.id,
        chunkOrder: chunk.chunkOrder,
        chunkText: chunk.chunkText,
        tokenCount: chunk.tokenCount,
      })),
    },
    error: null,
  };
});

app.post("/api/ai/index/reindex-all", async (request) => {
  requireAdmin(request);

  const certificates = await prisma.certificate.findMany();

  for (const certificate of certificates) {
    await syncAiIndexForRecord("certificates", certificate as any);
  }

  return {
    data: {
      indexed: certificates.length,
    },
    error: null,
  };
});

app.post("/api/ai/index/reindex/:type/:id", async (request) => {
  requireAdmin(request);
  const type = pathParam(request, "type");
  const id = pathParam(request, "id");

  if (type === "certificate") {
    const record = await prisma.certificate.findUnique({ where: { id } });
    if (!record) throw app.httpErrors.notFound("Certificate not found");
    await syncAiIndexForRecord("certificates", record as any);
    return { data: { ok: true }, error: null };
  }

  if (type === "professional_certificate") {
    throw app.httpErrors.badRequest("Professional certificates are not indexed by AI at this time");
  }

  throw app.httpErrors.badRequest("Unknown document type");
});

app.get("/api/ai/chat/sessions", async (request) => {
  const user = requireAuth(request);
  const sessions = await prisma.aiChatSession.findMany({
    where: user.role === "admin" ? undefined : { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return { data: sessions, error: null };
});

app.post("/api/ai/chat/sessions", async (request) => {
  const user = requireAuth(request);
  const body = request.body as { title?: string };
  const session = await prisma.aiChatSession.create({
    data: {
      userId: user.id,
      title: body.title?.trim() || "Nova conversa",
    },
  });
  return { data: session, error: null };
});

app.get("/api/ai/chat/sessions/:id/messages", async (request) => {
  const user = requireAuth(request);
  const sessionId = pathParam(request, "id");
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw app.httpErrors.notFound("Session not found");
  if (user.role !== "admin" && session.userId !== user.id) {
    throw app.httpErrors.forbidden("Operation not allowed");
  }

  const messages = await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return { data: messages, error: null };
});

app.post("/api/ai/chat/sessions/:id/messages", async (request) => {
  const user = requireAuth(request);
  const sessionId = pathParam(request, "id");
  const body = request.body as { role: string; content: string; sourcesJson?: unknown };

  const session = await prisma.aiChatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw app.httpErrors.notFound("Session not found");
  if (user.role !== "admin" && session.userId !== user.id)
    throw app.httpErrors.forbidden("Operation not allowed");

  const msg = await prisma.aiChatMessage.create({
    data: {
      sessionId,
      userId: user.id,
      role: body.role,
      content: body.content,
      sourcesJson: (body.sourcesJson as any) ?? undefined,
    },
  });

  await prisma.aiChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return { data: msg, error: null };
});

app.delete("/api/ai/chat/sessions/:id", async (request) => {
  const user = requireAuth(request);
  const sessionId = pathParam(request, "id");
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw app.httpErrors.notFound("Session not found");
  if (user.role !== "admin" && session.userId !== user.id) {
    throw app.httpErrors.forbidden("Operation not allowed");
  }

  await prisma.aiChatSession.delete({
    where: { id: sessionId },
  });

  return {
    data: {
      id: sessionId,
      deleted: true,
    },
    error: null,
  };
});

app.post("/api/ai/chat/query", async (request) => {
  const user = requireAuth(request);
  const body = request.body as { message?: string; sessionId?: string | null; topK?: number };
  const message = body.message?.trim();
  if (!message) {
    throw app.httpErrors.badRequest("Message is required");
  }

  const settings = await ensureAiSettings();
  const session =
    body.sessionId
      ? await prisma.aiChatSession.findUnique({ where: { id: body.sessionId } })
      : await prisma.aiChatSession.create({
          data: {
            userId: user.id,
            title: message.slice(0, 80),
          },
        });

  if (!session) {
    throw app.httpErrors.notFound("Chat session not found");
  }

  if (user.role !== "admin" && session.userId !== user.id) {
    throw app.httpErrors.forbidden("Operation not allowed");
  }

  const previousMessages = await prisma.aiChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const historyForAI: ChatMessage[] = previousMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.role === "assistant" ? m.content.slice(0, 3000) : m.content,
    }));

  const intent = classifyQueryIntent(message, historyForAI);

  const topK = Math.max(1, Math.min(body.topK ?? settings.topK, 10));

  const [totalIndexed, totalVerified] = await Promise.all([
    prisma.aiDocumentIndex.count({ where: { status: "indexed", recordType: "certificate" } }),
    prisma.aiDocumentIndex.count({ where: { status: "indexed", isVerifiedSnapshot: true, recordType: "certificate" } }),
  ]);

  const indexedDocuments = totalVerified > 0
    ? await prisma.aiDocumentIndex.findMany({
        where: { status: "indexed", isVerifiedSnapshot: true, recordType: "certificate" },
        orderBy: { updatedAt: "desc" },
        include: { chunks: { orderBy: { chunkOrder: "asc" } } },
      })
    : [];

  const shouldUseOpenAI = settings.activeProvider === "openai" && Boolean(env.openAiApiKey);
  let queryEmbedding: number[] | null = null;

  type MatchEntry = {
    recordType: string; recordId: string; title: string; fileName: string;
    filePath: string; score: number; reason: string; matchTerms: string[];
    referenceLabel?: string; referencePages: number[]; citations: string[];
  };
  // Try RACER search when aiDocumentIndex is empty
  let racerMatches: MatchEntry[] = [];
  if (totalVerified === 0) {
    try {
      const racerResp = await fetch(`${RACER_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: message, n: topK }),
        signal: AbortSignal.timeout(8000),
      });
      if (racerResp.ok) {
        const racerData = await racerResp.json() as {
          items: Array<{
            id: string; text: string; source_file: string; country: string;
            year: number | null; apostillado: boolean; doc_type: string | null;
            client: string | null; summary: string | null; distance: number;
          }>;
        };
        racerMatches = racerData.items.map((item) => ({
          recordType: item.doc_type || "certificate",
          recordId: item.id,
          title: item.source_file.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
          fileName: item.source_file,
          filePath: item.relative_path || item.source_file,
          score: Math.max(0, Number((1 - item.distance).toFixed(3))),
          reason: item.summary || item.doc_type || "Documento de RACER",
          matchTerms: [],
          referenceLabel: item.country || undefined,
          referencePages: [],
          citations: [item.text.slice(0, 300)],
        }));
      }
    } catch (err: any) {
      app.log.warn(`RACER search fallback failed: ${err?.message || err}`);
    }
  }

  if (shouldUseOpenAI && totalVerified === 0 && racerMatches.length === 0) {
    try {
      queryEmbedding = await generateOpenAIEmbedding(message, settings.activeEmbeddingModel);
    } catch (error: any) {
      app.log.warn(`OpenAI query embedding fallback: ${error?.message || error}`);
    }
  }

  const rankedCandidates = indexedDocuments
    .map((document: any) => rankDocumentMatch(message, document, queryEmbedding))
    .filter((item) => isStrongMatch(item.lexicalStats));

  const sqlMatches = rankedCandidates
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, topK)
    .map((item) => {
      const reference = buildAiMatchReference(item.document, {
        source: item.matchSource,
        bestChunk: item.bestChunk,
        referencePages: item.referencePages,
      });
      return {
        recordType: item.document.recordType,
        recordId: item.document.recordId,
        title: item.document.title || item.document.fileName,
        fileName: item.document.fileName,
        filePath: item.document.filePath,
        score: item.finalScore,
        reason: item.reason,
        matchTerms: item.matchTerms.length ? item.matchTerms : collectMatchTerms(item.lexicalStats),
        referenceLabel: reference.referenceLabel,
        referencePages: reference.referencePages,
        citations: reference.citations,
      };
    });

  let mergedMatches: MatchEntry[] = sqlMatches.length > 0 ? sqlMatches : racerMatches;

  // Enforce document-level permissions for non-admin users
  if (user.role !== "admin" && user.role !== "moderator") {
    const access = await prisma.userDocumentAccess.findUnique({ where: { userId: user.id } });
    if (access && !access.allowAll && access.filters) {
      const f = access.filters as {
        countries?: string[];
        docTypes?: string[];
        clients?: string[];
        apostilledOnly?: boolean;
      };
      mergedMatches = mergedMatches.filter((m) => {
        if (f.countries?.length && !f.countries.includes(m.referenceLabel ?? "")) return false;
        if (f.docTypes?.length && !f.docTypes.includes(m.recordType)) return false;
        if (f.apostilledOnly && !(m as any).apostillado) return false;
        return true;
      });
    }
  }

  const finalMatches: MatchEntry[] = mergedMatches;
  const serializableMatches = toJsonSafe(finalMatches);

  const providerContext = finalMatches
    .map(
      (match, index) =>
        `#${index + 1}\nTítulo: ${match.title}\nTipo: ${match.recordType}\nFicheiro: ${match.fileName}\nScore: ${match.score}\nMotivo: ${match.reason}\nTrecho: ${(match.citations || []).join("\n")}`,
    )
    .join("\n\n");

  let answer = buildFallbackAnswer(finalMatches);

  if (shouldUseOpenAI && (finalMatches.length > 0 || intent === "clarification")) {
    try {
      const generated = await generateOpenAIAnswer(
        settings.activeChatModel,
        message,
        providerContext,
        historyForAI,
        intent,
      );
      if (generated) {
        answer = generated;
      }
    } catch (error: any) {
      app.log.warn(`OpenAI answer fallback: ${error?.message || error}`);
    }
  }

  const userMsgTime = new Date();
  const assistantMsgTime = new Date(userMsgTime.getTime() + 1);
  await prisma.aiChatMessage.createMany({
    data: [
      {
        sessionId: session.id,
        userId: user.id,
        role: "user",
        content: message,
        createdAt: userMsgTime,
      },
      {
        sessionId: session.id,
        userId: user.id,
        role: "assistant",
        content: answer,
        sourcesJson: serializableMatches,
        createdAt: assistantMsgTime,
      },
    ],
  });

  await prisma.aiChatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  });

  return {
    data: {
      sessionId: session.id,
      providerUsed: settings.activeProvider,
      modelUsed: settings.activeChatModel,
      ragMode: settings.ragMode,
      answer,
      matches: serializableMatches,
      intent,
      _debug: { totalIndexed, totalVerified },
    },
    error: null,
  };
});

app.post("/auth/register", async (request) => {
  const body = request.body as {
    email: string;
    password: string;
    fullName?: string;
    role?: string;
  };

  const passwordHash = await hashPassword(body.password);
  const role = request.authUser?.role === "admin" && body.role ? body.role : "user";

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash,
      profile: {
        create: {
          fullName: body.fullName || "",
          languagePreference: "pt",
          certificatesViewMode: "grid",
        },
      },
      roles: {
        create: {
          role,
        },
      },
    },
    include: {
      profile: true,
      roles: true,
    },
  });

  return toSession(user);
});

app.post("/auth/login", async (request) => {
  const body = request.body as { email: string; password: string };
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { profile: true, roles: true },
  });

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw app.httpErrors.unauthorized("Invalid login credentials");
  }

  return toSession(user);
});

app.get("/auth/me", async (request) => {
  const authUser = requireAuth(request);
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { profile: true, roles: true },
  });

  if (!user) {
    throw app.httpErrors.notFound("User not found");
  }

  return {
    user: toSession(user).user,
  };
});

app.post("/auth/logout", async () => ({ ok: true }));

app.post("/auth/forgot-password", async (request) => {
  const body = request.body as { email: string };
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) return { ok: true };

  const resetToken = nanoid(48);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  app.log.info(
    `Password reset link for ${user.email}: ${env.frontendUrl}/auth?reset_token=${resetToken}`,
  );

  return { ok: true };
});

app.post("/auth/reset-password", async (request) => {
  const body = request.body as { token: string; password: string };
  const user = await prisma.user.findFirst({
    where: {
      resetToken: body.token,
      resetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw app.httpErrors.badRequest("Invalid or expired token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.password),
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  return { ok: true };
});

app.put("/api/users/me/password", async (request) => {
  const authUser = requireAuth(request);
  const body = request.body as { currentPassword: string; newPassword: string };
  if (!body.currentPassword || !body.newPassword)
    throw app.httpErrors.badRequest("currentPassword y newPassword son requeridos");
  if (body.newPassword.length < 8)
    throw app.httpErrors.badRequest("La nueva contraseña debe tener al menos 8 caracteres");
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) throw app.httpErrors.notFound("User not found");
  if (!(await verifyPassword(body.currentPassword, user.passwordHash)))
    throw app.httpErrors.badRequest("Contraseña actual incorrecta");
  await prisma.user.update({
    where: { id: authUser.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });
  return { data: { ok: true }, error: null };
});

app.post("/api/query/:table", async (request) => {
  const table = pathParam(request, "table") as TableName;
  if (!(table in tableMap)) throw app.httpErrors.notFound("Unknown table");

  const payload = queryPayloadSchema.parse(request.body || {});
  const delegate: any = delegateFor(prisma, table);
  const include =
    table === "content_items"
      ? { contentType: true, author: { include: { profile: true } } }
      : table === "content_reviews"
        ? { reviewer: { include: { profile: true } } }
        : undefined;

  const where = buildWhere(payload.filters);

  const orderBy = payload.order.map((entry) => ({
    [toCamelCase(entry.field)]: entry.ascending ? "asc" : "desc",
  }));

  const rows = await delegate.findMany({
    where,
    orderBy: orderBy.length ? orderBy : undefined,
    take: payload.limit,
    include,
  });

  const filtered = rows
    .map((row: Record<string, any>) => normalizeRow(table, row))
    .filter((row: Record<string, any>) =>
      payload.or.length
        ? payload.or.some((entry) =>
            matchesFilters(row, [
              {
                field: toSnakeCase(toCamelCase(entry.field)),
                value: entry.value ?? null,
              },
            ]),
          )
        : true,
    )
    .filter((row: Record<string, any>) => canReadRow(table, row, request.authUser));

  if (payload.single || payload.maybeSingle) {
    return {
      data: filtered[0] ?? null,
      error: null,
    };
  }

  return {
    data: filtered,
    error: null,
  };
});

app.post("/api/db/:table", async (request) => {
  const table = pathParam(request, "table") as TableName;
  if (!(table in tableMap)) throw app.httpErrors.notFound("Unknown table");
  const user = requireAuth(request);
  const body = request.body as { data: Record<string, any> | Record<string, any>[] };
  await enforceMutationAccess(table, request, [], Array.isArray(body.data) ? body.data[0] : body.data);
  const delegate: any = delegateFor(prisma, table);

  const payloads = (Array.isArray(body.data) ? body.data : [body.data]).map((entry) =>
    convertKeysDeep(entry, "camel"),
  );
  const created = [];
  for (const payload of payloads) {
    if (!payload.createdAt && "createdAt" in payload) payload.createdAt = new Date().toISOString();
    const row = await delegate.create({ data: payload });
    created.push(row);

    if (table === "certificates") {
      await syncAiIndexForRecord(table, row);
    }
  }

  const normalized = created.map((entry) => normalizeRow(table, entry));

  return {
    data: normalized.length === 1 ? normalized[0] : normalized,
    error: null,
    actor: user.id,
  };
});

app.patch("/api/db/:table", async (request) => {
  const table = pathParam(request, "table") as TableName;
  if (!(table in tableMap)) throw app.httpErrors.notFound("Unknown table");
  const body = request.body as { filters: { field: string; value: any }[]; data: Record<string, any> };
  await enforceMutationAccess(table, request, body.filters, body.data);
  const delegate: any = delegateFor(prisma, table);

  const current = await delegate.findMany({
    where: buildWhere(body.filters.map((filter) => ({ field: filter.field, op: "eq" as const, value: filter.value }))),
  });

  const updated = [];
  for (const row of current) {
    const updatedRow = await delegate.update({
      where: { id: row.id },
      data: convertKeysDeep(body.data, "camel"),
    });
    updated.push(updatedRow);

    if (table === "certificates") {
      await syncAiIndexForRecord(table, updatedRow);
      const patchData = body.data as Record<string, unknown>;
      if (patchData.is_verified === true && (updatedRow as any).filePath) {
        const r = updatedRow as any;
        triggerRacerIngest(r.filePath, r.fileName, r.id).catch((err: any) =>
          app.log.warn(`RACER auto-ingest failed for ${r.fileName}: ${err?.message}`)
        );
      }
    }
  }

  const normalized = updated.map((entry) => normalizeRow(table, entry));

  return {
    data: normalized.length <= 1 ? (normalized[0] ?? null) : normalized,
    error: null,
  };
});

app.delete("/api/db/:table", async (request) => {
  const table = pathParam(request, "table") as TableName;
  if (!(table in tableMap)) throw app.httpErrors.notFound("Unknown table");
  const body = request.body as { filters: { field: string; value: any }[] };
  await enforceMutationAccess(table, request, body.filters);
  const delegate: any = delegateFor(prisma, table);
  const current = await delegate.findMany({
    where: buildWhere(body.filters.map((filter) => ({ field: filter.field, op: "eq" as const, value: filter.value }))),
  });

  for (const row of current) {
    await delegate.delete({ where: { id: row.id } });
    if (table === "certificates") {
      await deleteAiIndexForRecord("certificate", row.id);
    }
    if (table === "professional_certificates") {
      await deleteAiIndexForRecord("professional_certificate", row.id);
    }
  }

  return { data: current.map((entry: Record<string, any>) => normalizeRow(table, entry)), error: null };
});

app.post("/api/rpc/increment_tag_usage", async (request) => {
  requireAuth(request);
  const body = request.body as { tag_name?: string; slug?: string };
  const where = body.slug ? { slug: body.slug } : body.tag_name ? { name: body.tag_name } : null;
  if (!where) return { data: null, error: null };

  const tag = await prisma.tag.findFirst({ where });
  if (!tag) return { data: null, error: null };

  const updated = await prisma.tag.update({
    where: { id: tag.id },
    data: { usageCount: { increment: 1 } },
  });

  return { data: updated, error: null };
});

app.post("/api/functions/get-users-with-emails", async (request) => {
  requireAdmin(request);
  const users = await prisma.user.findMany({
    include: { profile: true, roles: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    data: users.map((user) => ({
      user_id: user.id,
      email: user.email,
      full_name: user.profile?.fullName ?? "",
      avatar_url: user.profile?.avatarUrl ?? "",
      role: normalizeRole(user.roles),
      created_at: user.createdAt,
    })),
    error: null,
  };
});

app.post("/api/functions/admin-create-user", async (request) => {
  requireAdmin(request);
  const body = request.body as {
    email?: string;
    password?: string;
    fullName?: string;
    role?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim() || "";
  const allowedRoles = new Set(["admin", "moderator", "user"]);
  const role = allowedRoles.has(body.role || "") ? (body.role as string) : "user";

  if (!email || !password) {
    throw app.httpErrors.badRequest("Email and password are required");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw app.httpErrors.conflict("User with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      profile: {
        create: {
          fullName,
          languagePreference: "pt",
          certificatesViewMode: "grid",
        },
      },
      roles: {
        create: {
          role,
        },
      },
    },
    include: {
      profile: true,
      roles: true,
    },
  });

  return {
    data: {
      user_id: user.id,
      email: user.email,
      full_name: user.profile?.fullName ?? "",
      avatar_url: user.profile?.avatarUrl ?? "",
      role: normalizeRole(user.roles),
      created_at: user.createdAt,
    },
    error: null,
  };
});

app.post("/api/functions/send-password-reset", async (request) => {
  requireAdmin(request);
  const body = request.body as { email: string };
  await app.inject({
    method: "POST",
    url: "/auth/forgot-password",
    payload: { email: body.email },
  });
  return { data: { ok: true }, error: null };
});

app.post("/api/functions/upload-default-avatars", async (request) => {
  requireAuth(request);
  await ensureBucket("avatars");
  const sourceDir = path.resolve(process.cwd(), "..", "src", "assets", "avatars");
  const files = await fs.readdir(sourceDir);
  const uploaded = [];

  for (const file of files) {
    const source = path.join(sourceDir, file);
    const relativePath = path.join("default", file);
    const target = bucketFilePath("avatars", relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (!(await fileExists(target))) {
      await fs.copyFile(source, target);
    }

    const existing = await prisma.avatarTemplate.findFirst({
      where: { filePath: relativePath },
    });

    if (!existing) {
      uploaded.push(
        await prisma.avatarTemplate.create({
          data: {
            name: file.replace(/\.[^.]+$/, ""),
            category: "default",
            filePath: relativePath,
            isActive: true,
          },
        }),
      );
    }
  }

  return { data: uploaded, error: null };
});

app.post("/api/storage/:bucket/upload", async (request, reply) => {
  const user = requireAuth(request);
  const bucket = pathParam(request, "bucket");
  const file = await request.file();
  const filePath = (request.query as { path?: string }).path;

  if (!file || !filePath) {
    throw app.httpErrors.badRequest("Missing upload payload");
  }

  await ensureBucket(bucket);
  const destination = bucketFilePath(bucket, filePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, await file.toBuffer());

  return reply.send({
    data: {
      path: filePath,
      actor: user.id,
    },
    error: null,
  });
});

app.post("/api/storage/:bucket/remove", async (request) => {
  requireAuth(request);
  const bucket = pathParam(request, "bucket");
  const body = request.body as { paths: string[] };

  for (const relativePath of body.paths) {
    const target = bucketFilePath(bucket, relativePath);
    if (await fileExists(target)) {
      await fs.unlink(target);
    }
  }

  return { data: body.paths, error: null };
});

app.post("/api/storage/:bucket/list", async (request) => {
  requireAuth(request);
  const bucket = pathParam(request, "bucket");
  const body = request.body as { prefix?: string };
  const base = bucketFilePath(bucket, body.prefix || "");

  if (!(await fileExists(base))) {
    return { data: [], error: null };
  }

  const entries = await fs.readdir(base, { withFileTypes: true });
  return {
    data: entries.map((entry) => ({
      name: entry.name,
      id: entry.name,
    })),
    error: null,
  };
});

app.get("/api/storage/:bucket/signed-url", async (request) => {
  requireAuth(request);
  const bucket = pathParam(request, "bucket");
  const { path: filePath } = request.query as { path: string };
  const signedUrl = `${env.frontendUrl.replace(/5173$/, "4000")}/api/storage/${bucket}/file?path=${encodeURIComponent(filePath)}`;
  return {
    data: { signedUrl },
    error: null,
  };
});

app.get("/api/storage/:bucket/public-url", async (request) => {
  const bucket = pathParam(request, "bucket");
  const { path: filePath } = request.query as { path: string };
  return {
    data: {
      publicUrl: `${env.frontendUrl.replace(/5173$/, "4000")}/api/storage/${bucket}/file?path=${encodeURIComponent(filePath)}`,
    },
    error: null,
  };
});

app.get("/api/storage/:bucket/file", async (request, reply) => {
  const bucket = pathParam(request, "bucket");
  const { path: filePath, token, filename, download } = request.query as {
    path: string;
    token?: string;
    filename?: string;
    download?: string;
  };
  if (!request.authUser && token) {
    try {
      const payload = verifyAccessToken(token);
      request.authUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      request.authUser = undefined;
    }
  }
  const absolute = bucketFilePath(bucket, filePath);

  if (!(await fileExists(absolute))) {
    throw app.httpErrors.notFound("File not found");
  }

  const fileName = filename || path.basename(absolute);
  return sendStoredFile(reply, absolute, fileName, download);
});

app.get("/api/storage/certificates/smart-cities-file", async (request, reply) => {
  const { name, download } = request.query as { name: string; download?: string };
  if (!name?.trim()) {
    throw app.httpErrors.badRequest("Name is required");
  }

  const baseDir = bucketFilePath("certificates", "smart-cities-ingest");
  if (!(await fileExists(baseDir))) {
    throw app.httpErrors.notFound("Smart Cities ingest folder not found");
  }

  const targetName = normalizeLookupName(name);
  const files = (await fs.readdir(baseDir)).filter((entry) => entry.toLowerCase().endsWith(".pdf"));

  const exact = files.find((entry) => normalizeLookupName(entry) === targetName);
  const partial = exact
    ? exact
    : files.find((entry) => normalizeLookupName(entry).includes(targetName) || targetName.includes(normalizeLookupName(entry)));

  if (!partial) {
    throw app.httpErrors.notFound(`File not found for citation: ${name}`);
  }

  const absolute = path.join(baseDir, partial);
  return sendStoredFile(reply, absolute, partial, download);
});

app.setErrorHandler((error: any, _request, reply) => {
  reply.status(error.statusCode || 500).send({
    data: null,
    error: {
      message: error.message,
      statusCode: error.statusCode || 500,
    },
  });
});

// ── RACER Smart Cities RAG proxy ────────────────────────────────────────────
const RACER_URL = process.env.RACER_URL ?? "http://localhost:8000";

async function sendPdfToRacer(absolutePath: string, fileName: string, documentId?: string) {
  const fileBuffer = await fs.readFile(absolutePath);
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, fileName);
  if (documentId) form.append("document_id", documentId);
  const resp = await fetch(`${RACER_URL}/ingest/pdf`, { method: "POST", body: form });
  return await resp.json() as any;
}

async function triggerRacerIngest(filePath: string, fileName: string, documentId: string) {
  const absolutePath = bucketFilePath("certificates", filePath);
  await sendPdfToRacer(absolutePath, fileName, documentId);
}

app.get("/api/racer/health", async (_req, reply) => {
  try {
    const resp = await fetch(`${RACER_URL}/health`);
    const json = await resp.json() as any;
    return reply.code(resp.status).send({ data: json, error: null });
  } catch {
    return reply.code(503).send({ data: null, error: { message: "RACER server not reachable" } });
  }
});

app.get("/api/racer/docs", async (req, reply) => {
  requireAuth(req);
  const metadataPath = path.join(process.cwd(), "../racer/data/metadata.jsonl");
  let raw: string;
  try {
    raw = await fs.readFile(metadataPath, "utf-8");
  } catch {
    return reply.send({ data: [], error: null });
  }
  const docs = raw
    .split("\n")
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .map((obj: any) => ({
      document_id:     obj.document_id,
      source_file:     obj.source_file,
      doc_type:        obj.doc_type,
      client:          obj.client,
      country:         obj.country,
      year:            obj.year,
      is_apostilled:   obj.is_apostilled,
      summary_one_line: obj.summary_one_line,
      ingested_at:     obj.ingested_at,
    }));
  return reply.send({ data: docs, error: null });
});

app.post("/api/racer/query", async (req, reply) => {
  try {
    const resp = await fetch(`${RACER_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await resp.json();
    return reply.code(resp.status).send(resp.ok ? { data: json, error: null } : { data: null, error: json });
  } catch {
    return reply.code(503).send({ data: null, error: { message: "RACER server not reachable" } });
  }
});

app.post("/api/racer/reingest-metadata", async (req, reply) => {
  requireAuth(req);
  try {
    const resp = await fetch(`${RACER_URL}/reingest/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await resp.json();
    return reply.code(resp.status).send(resp.ok ? { data: json, error: null } : { data: null, error: json });
  } catch {
    return reply.code(503).send({ data: null, error: { message: "RACER server not reachable" } });
  }
});

app.post("/api/racer/rfp", async (req, reply) => {
  try {
    const resp = await fetch(`${RACER_URL}/rfp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await resp.json();
    return reply.code(resp.status).send(resp.ok ? { data: json, error: null } : { data: null, error: json });
  } catch {
    return reply.code(503).send({ data: null, error: { message: "RACER server not reachable" } });
  }
});

app.post("/api/racer/ingest-batch", async (req, reply) => {
  requireAuth(req);
  const { files } = req.body as {
    files: Array<{ bucket: string; filePath: string; documentId?: string }>;
  };
  if (!Array.isArray(files) || files.length === 0) {
    throw app.httpErrors.badRequest("files array is required");
  }

  const results: Array<{ filePath: string; status: string; chunks_added?: number; duplicate_of?: string; error?: string }> = [];

  for (const file of files) {
    const absolutePath = bucketFilePath(file.bucket, file.filePath);
    const filename     = path.basename(file.filePath);
    try {
      const json = await sendPdfToRacer(absolutePath, filename, file.documentId);
      results.push({
        filePath:     file.filePath,
        status:       json.status ?? "ok",
        chunks_added: json.chunks_added,
        duplicate_of: json.duplicate_of,
      });
    } catch (err: any) {
      results.push({ filePath: file.filePath, status: "error", error: err?.message });
    }
  }

  return reply.send({ data: { results, total: results.length }, error: null });
});

app.post("/api/racer/ingest", async (req, reply) => {
  const user = requireAuth(req);
  const body = req.body as { bucket: string; filePath: string; documentId?: string };
  const { bucket, filePath, documentId } = body;

  if (!bucket || !filePath) {
    throw app.httpErrors.badRequest("bucket y filePath son requeridos");
  }

  const absolutePath = bucketFilePath(bucket, filePath);
  const filename     = path.basename(filePath);

  try {
    const json = await sendPdfToRacer(absolutePath, filename, documentId);

    if (json.status === "empty") {
      return reply.send({ data: null, error: { message: "No se pudo extraer texto del archivo" } });
    }

    if (json.status !== "duplicate") {
      try {
        const stat = await fs.stat(absolutePath).catch(() => ({ size: 0 }));
        const title = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
        const meta = json.metadata || {};
        const existing = await prisma.certificate.findFirst({ where: { filePath } });
        if (!existing) {
          await prisma.certificate.create({
            data: {
              userId: user.id,
              title,
              fileName: filename,
              filePath,
              fileSize: (stat as any).size ?? 0,
              mimeType: "application/pdf",
              isVerified: true,
              issuingOrganization: meta.client ?? null,
              country: meta.country ?? null,
              description: meta.summary_one_line ?? null,
              tags: meta.project_domain ? meta.project_domain : undefined,
            },
          });
        }
      } catch (e: any) {
        app.log.warn("Certificate record creation skipped: " + String(e?.message));
      }
    }
    return reply.send({ data: json, error: null });
  } catch {
    return reply.code(503).send({ data: null, error: { message: "RACER server not reachable" } });
  }
});

// ── RACER document management ────────────────────────────────────────────────

app.get("/api/racer/documents", async (req, reply) => {
  requireAuth(req);
  const resp = await fetch(`${RACER_URL}/documents`);
  const data = await resp.json();
  return reply.send({ data, error: null });
});

app.delete("/api/racer/documents/all", async (req, reply) => {
  const user = requireAuth(req);
  if (user.role !== "admin") throw app.httpErrors.forbidden("Solo admins");
  const { password } = req.body as { password: string };
  const resp = await fetch(`${RACER_URL}/documents/all/confirm`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await resp.json() as any;
  if (!resp.ok) return reply.code(resp.status).send({ data: null, error: { message: data.detail ?? "Error" } });
  return reply.send({ data, error: null });
});

app.delete("/api/racer/documents/:id", async (req, reply) => {
  requireAuth(req);
  const { id } = req.params as { id: string };
  const resp = await fetch(`${RACER_URL}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await resp.json();
  return reply.send({ data, error: null });
});

app.delete("/api/racer/documents", async (req, reply) => {
  requireAuth(req);
  const { ids } = req.body as { ids: string[] };
  const resp = await fetch(`${RACER_URL}/documents`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = await resp.json();
  return reply.send({ data, error: null });
});

// ── Dashboard stats ────────────────────────────────────────────────────────
app.get("/api/stats/dashboard", async (req, reply) => {
  requireAuth(req);
  const [
    totalStories,
    totalCerts,
    totalProfCerts,
    pendingCerts,
    pendingStories,
    totalUsers,
    recentCerts,
    recentStories,
  ] = await Promise.all([
    prisma.successStory.count({ where: { isVerified: true } }),
    prisma.certificate.count(),
    prisma.professionalCertificate.count(),
    prisma.certificate.count({ where: { isVerified: false } }),
    prisma.successStory.count({ where: { isVerified: false } }),
    prisma.user.count(),
    prisma.certificate.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { include: { profile: true } } },
    }),
    prisma.successStory.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { include: { profile: true } } },
    }),
  ]);

  type ActivityItem = { id: string; action: string; document: string; user: string; time: string; type: string };
  const activities: ActivityItem[] = [];

  for (const cert of recentCerts) {
    const userName = (cert as any).user?.profile?.fullName || (cert as any).user?.email || "Usuário";
    activities.push({
      id: cert.id,
      action: cert.isVerified ? "added_certificate" : "submitted_certificate",
      document: cert.title,
      user: userName,
      time: cert.createdAt.toISOString(),
      type: cert.isVerified ? "success" : "info",
    });
  }
  for (const story of recentStories) {
    const userName = (story as any).user?.profile?.fullName || (story as any).user?.email || "Usuário";
    activities.push({
      id: story.id,
      action: story.isVerified ? "published_story" : "submitted_story",
      document: (story as any).titlePt || (story as any).titleEs || (story as any).titleEn || "Sin título",
      user: userName,
      time: story.createdAt.toISOString(),
      type: story.isVerified ? "success" : "info",
    });
  }

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return reply.send({
    data: {
      totalStories,
      totalCerts,
      totalProfCerts,
      pendingApprovals: pendingCerts + pendingStories,
      pendingCerts,
      pendingStories,
      totalUsers,
      recentActivity: activities.slice(0, 6),
    },
    error: null,
  });
});

// ── Seed RACER documents as certificates ──────────────────────────────────────────────────────
app.post("/api/admin/seed-racer", async (req, reply) => {
  const user = requireAdmin(req);
  const metadataPath = path.join(process.cwd(), "../racer/data/metadata.jsonl");
  let raw: string;
  try {
    raw = await fs.readFile(metadataPath, "utf-8");
  } catch {
    throw app.httpErrors.notFound("metadata.jsonl not found at " + metadataPath);
  }

  const lines = raw.split("\n").filter(l => l.trim());
  let created = 0;
  let skipped = 0;

  for (const line of lines) {
    let obj: any;
    try { obj = JSON.parse(line); } catch { skipped++; continue; }
    const sourceFile: string = String(obj.source_file || "").trim();
    if (!sourceFile) { skipped++; continue; }
    try {
      const existing = await prisma.certificate.findFirst({ where: { fileName: sourceFile } });
      if (existing) { skipped++; continue; }
      const title = sourceFile.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      await prisma.certificate.create({
        data: {
          userId: user.id,
          title,
          fileName: sourceFile,
          filePath: String(obj.relative_path || `racer-seeded/${sourceFile}`),
          fileSize: 0,
          mimeType: "application/pdf",
          isVerified: true,
          issuingOrganization: obj.client ? String(obj.client) : null,
          country: obj.country ? String(obj.country) : null,
          description: obj.summary_one_line ? String(obj.summary_one_line) : null,
          tags: Array.isArray(obj.project_domain) ? obj.project_domain : undefined,
        },
      });
      created++;
    } catch { skipped++; }
  }

  return reply.send({ data: { created, skipped, total: lines.length }, error: null });
});

// ── Analytics ──────────────────────────────────────────────────────────────
app.post("/api/usage/events", async (req) => {
  const user = requireAuth(req);
  const events = req.body as Array<{
    eventType: string;
    page?: string;
    metadata?: unknown;
    durationMs?: number;
    createdAt?: string;
  }>;
  if (!Array.isArray(events) || events.length === 0) return { ok: true };

  await prisma.analyticsEvent.createMany({
    data: events.map((e) => ({
      userId: user.id,
      eventType: String(e.eventType),
      page: e.page ? String(e.page) : null,
      metadata: (e.metadata as any) ?? undefined,
      durationMs: typeof e.durationMs === "number" ? Math.round(e.durationMs) : null,
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
    })),
  });

  return { ok: true };
});

app.get("/api/usage/summary", async (req) => {
  const user = requireAuth(req);
  if (user.role !== "admin") throw app.httpErrors.forbidden("Admin only");

  const [events, profiles] = await Promise.all([
    prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50000,
    }),
    prisma.profile.findMany({
      select: { userId: true, fullName: true },
    }),
  ]);

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const profileMap = new Map(profiles.map((p) => [p.userId, p.fullName]));
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const byUser = new Map<string, {
    userId: string; name: string; email: string;
    pageVisits: number; totalTimeSec: number;
    aiQueries: number; totalAiMs: number;
    uploads: number; totalUploadMs: number;
    tabClicks: number; sessions: number;
  }>();

  for (const e of events) {
    if (!byUser.has(e.userId)) {
      byUser.set(e.userId, {
        userId: e.userId,
        name: profileMap.get(e.userId) || "Sin nombre",
        email: emailMap.get(e.userId) || "",
        pageVisits: 0, totalTimeSec: 0,
        aiQueries: 0, totalAiMs: 0,
        uploads: 0, totalUploadMs: 0,
        tabClicks: 0, sessions: 0,
      });
    }
    const u = byUser.get(e.userId)!;
    if (e.eventType === "page_visit" && e.durationMs) {
      u.pageVisits++;
      u.totalTimeSec += e.durationMs / 1000;
    }
    if (e.eventType === "session_start") u.sessions++;
    if (e.eventType === "ai_query") {
      u.aiQueries++;
      if (e.durationMs) u.totalAiMs += e.durationMs;
    }
    if (e.eventType === "file_upload") {
      u.uploads++;
      if (e.durationMs) u.totalUploadMs += e.durationMs;
    }
    if (e.eventType === "tab_click") u.tabClicks++;
  }

  const pageCount = new Map<string, { visits: number; totalMs: number }>();
  for (const e of events) {
    if (e.eventType === "page_visit" && e.page) {
      const p = pageCount.get(e.page) ?? { visits: 0, totalMs: 0 };
      p.visits++;
      if (e.durationMs) p.totalMs += e.durationMs;
      pageCount.set(e.page, p);
    }
  }
  const topPages = [...pageCount.entries()]
    .map(([page, { visits, totalMs }]) => ({
      page,
      visits,
      avgTimeSec: visits > 0 ? Math.round(totalMs / visits / 1000) : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  const hourly = new Array(24).fill(0);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const e of events) {
    if (e.createdAt.getTime() > cutoff) hourly[e.createdAt.getHours()]++;
  }

  const tabCount = new Map<string, number>();
  for (const e of events) {
    if (e.eventType === "tab_click" && e.metadata) {
      const tab = (e.metadata as any).tab as string;
      if (tab) tabCount.set(tab, (tabCount.get(tab) ?? 0) + 1);
    }
  }
  const topTabs = [...tabCount.entries()]
    .map(([tab, count]) => ({ tab, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    data: {
      users: [...byUser.values()].map((u) => ({
        ...u,
        avgTimeSec: u.pageVisits > 0 ? Math.round(u.totalTimeSec / u.pageVisits) : 0,
        avgAiMs: u.aiQueries > 0 ? Math.round(u.totalAiMs / u.aiQueries) : 0,
        avgUploadMs: u.uploads > 0 ? Math.round(u.totalUploadMs / u.uploads) : 0,
      })),
      topPages,
      topTabs,
      hourlyActivity: hourly,
      totalEvents: events.length,
    },
    error: null,
  };
});

// ── Admin: Chat Audit ──────────────────────────────────────────────────────
app.get("/api/admin/chat/sessions", async (request) => {
  requireAdmin(request);
  const sessions = await prisma.aiChatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: {
      user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      _count: { select: { messages: true } },
    },
  });
  return {
    data: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      userId: s.userId,
      messageCount: s._count.messages,
      user: s.user
        ? { id: s.user.id, email: s.user.email, fullName: s.user.profile?.fullName ?? null }
        : null,
    })),
    error: null,
  };
});

// ── Admin: Document Access ──────────────────────────────────────────────────
app.get("/api/admin/doc-access/:userId", async (request) => {
  requireAdmin(request);
  const userId = pathParam(request, "userId");
  const access = await prisma.userDocumentAccess.findUnique({ where: { userId } });
  return {
    data: access ?? { userId, allowAll: true, filters: null },
    error: null,
  };
});

app.put("/api/admin/doc-access/:userId", async (request) => {
  requireAdmin(request);
  const userId = pathParam(request, "userId");
  const body = request.body as { allowAll: boolean; filters?: Record<string, any> | null };
  const data = await prisma.userDocumentAccess.upsert({
    where: { userId },
    create: { userId, allowAll: body.allowAll, filters: body.filters ?? null },
    update: { allowAll: body.allowAll, filters: body.filters ?? null },
  });
  return { data, error: null };
});

app.listen({ port: env.port, host: env.host });
