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

function isReasoningModel(model: string) {
  return /^o\d|^gpt-5/i.test(model);
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
      ? "Eres un asistente especializado en documentos y certificados. El usuario está pidiendo una aclaración sobre algo mencionado en la conversación. El historial previo es solo contexto — la pregunta activa es el ÚLTIMO mensaje del usuario. Responde de manera clara y directa. Usa el mismo idioma que el usuario."
      : "Eres un asistente especializado en documentos y certificados. El historial de conversación que recibes es contexto previo — NO son pedidos activos. La consulta activa y vigente es ÚNICAMENTE el último mensaje del usuario. Responde usando solo los certificados del contexto recuperado para esa consulta. No mezcles documentos de turnos anteriores a menos que el usuario los mencione explícitamente ahora. Usa el mismo idioma que el usuario.";

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
    {
      role: "user",
      content:
        intent === "clarification"
          ? question
          : `Consulta del usuario:\n${question}\n\nContexto recuperado:\n${context}`,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      ...(isReasoningModel(model) ? {} : { temperature: 0.2 }),
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
