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

export async function generateOpenAIAnswer(model: string, question: string, context: string) {
  assertAvailable();
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const response = await openai.responses.create({
      model,
      instructions:
        "Responde em português claro. Usa apenas os certificados fornecidos no contexto. Resume quais certificados atendem melhor ao pedido, explica por quê e não inventes informação ausente.",
      input: `Pedido do utilizador:\n${question}\n\nContexto recuperado:\n${context}`,
    });

    return response.output_text?.trim() || null;
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
