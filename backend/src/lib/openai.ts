import OpenAI from "openai";
import { env } from "../env.js";

let client: OpenAI | null = null;
let disabledUntil = 0;

function isQuotaError(error: any) {
  const message = String(error?.message || "");
  return error?.status === 429 || message.includes("429") || message.toLowerCase().includes("quota");
}

function assertAvailable() {
  if (disabledUntil > Date.now()) {
    throw new Error("OpenAI temporarily disabled after quota/rate-limit error.");
  }
}

function handleOpenAIError(error: any) {
  if (isQuotaError(error)) {
    disabledUntil = Date.now() + 5 * 60 * 1000;
  }
  throw error;
}

export function getOpenAIClient() {
  if (!env.openAiApiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openAiApiKey,
    });
  }

  return client;
}

export async function generateOpenAIEmbedding(input: string, model: string) {
  assertAvailable();
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const response = await openai.embeddings.create({
      model,
      input,
    });

    return response.data[0]?.embedding || null;
  } catch (error) {
    handleOpenAIError(error);
    return null;
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type QueryIntent = "rag" | "clarification";

export async function generateOpenAIAnswer(
  model: string,
  question: string,
  context: string,
  history: ChatMessage[] = [],
  intent: QueryIntent = "rag",
) {
  assertAvailable();
  const openai = getOpenAIClient();
  if (!openai) return null;

  const systemPrompt =
    intent === "clarification"
      ? "Eres un asistente experto en certificados y documentos de proyectos de ciudades inteligentes. El usuario pide aclaración o contexto adicional sobre algo mencionado en la conversación. Usa el historial de la conversación como fuente principal. Si hay documentos recuperados, úsalos como referencia de apoyo. No inventes información ausente. Responde en el mismo idioma que el usuario."
      : "Eres un asistente experto en certificados y documentos de proyectos de ciudades inteligentes. Usa los documentos recuperados en el contexto para responder la consulta. Resume cuáles certificados son más relevantes, explica por qué y no inventes información ausente. Si el historial de conversación aporta contexto relevante, tenlo en cuenta. Responde en el mismo idioma que el usuario.";

  const userContent = context
    ? `${question}\n\nDocumentos recuperados:\n${context}`
    : question;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userContent },
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    handleOpenAIError(error);
    return null;
  }
}

export async function testOpenAIConnection() {
  assertAvailable();
  const openai = getOpenAIClient();
  if (!openai) {
    return {
      ok: false,
      message: "OPENAI_API_KEY não configurada.",
    };
  }

  try {
    await openai.models.list();
  } catch (error) {
    handleOpenAIError(error);
  }
  return {
    ok: true,
    message: "Conexão com OpenAI validada com sucesso.",
  };
}
