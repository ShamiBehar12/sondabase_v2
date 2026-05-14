import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export type AiSettings = {
  id: string;
  activeProvider: string;
  activeChatModel: string;
  activeEmbeddingModel: string;
  ragMode: string;
  topK: number;
  maxChunks: number;
  temperature: number;
  updatedAt: string;
};

export type AiProviderCatalogItem = {
  provider: string;
  chat_models: string[];
  embedding_models: string[];
};

export type AiIndexStatus = {
  summary: { status: string; count: number }[];
  recent: Array<{
    id: string;
    title: string | null;
    recordType: string;
    status: string;
    updatedAt: string;
  }>;
};

export type AiChatMatch = {
  recordType: string;
  recordId: string;
  title: string;
  fileName: string;
  filePath: string;
  score: number;
  reason: string;
  matchTerms?: string[];
  referenceLabel?: string;
  referencePages?: number[];
  citations: string[];
};

export type AiChatSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiChatMessage = {
  id: string;
  role: string;
  content: string;
  sourcesJson?: AiChatMatch[] | null;
  createdAt: string;
};

export function useAIAdmin() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [providers, setProviders] = useState<AiProviderCatalogItem[]>([]);
  const [indexStatus, setIndexStatus] = useState<AiIndexStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsResponse, providersResponse, indexResponse] = await Promise.all([
      apiFetch<AiSettings>("/api/ai/settings"),
      apiFetch<AiProviderCatalogItem[]>("/api/ai/providers"),
      apiFetch<AiIndexStatus>("/api/ai/index/status"),
    ]);

    if (settingsResponse.data) setSettings(settingsResponse.data);
    if (providersResponse.data) setProviders(providersResponse.data);
    if (indexResponse.data) setIndexStatus(indexResponse.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (payload: Partial<AiSettings>) => {
    const response = await apiFetch<AiSettings>("/api/ai/settings", {
      method: "PATCH",
      body: payload,
    });
    if (response.data) {
      setSettings(response.data);
    }
    return response;
  };

  const testProvider = async (provider: string) => {
    return apiFetch<{ ok: boolean; provider: string; message: string }>("/api/ai/providers/test", {
      method: "POST",
      body: { provider },
    });
  };

  const reindexAll = async () => {
    const response = await apiFetch<{ indexed: number }>("/api/ai/index/reindex-all", {
      method: "POST",
    });
    await load();
    return response;
  };

  return {
    settings,
    providers,
    indexStatus,
    loading,
    saveSettings,
    testProvider,
    reindexAll,
    reload: load,
  };
}

export function useAIChat() {
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const response = await apiFetch<AiChatSession[]>("/api/ai/chat/sessions");
    if (response.data) {
      setSessions(response.data);
      if (!activeSessionId && response.data[0]?.id) {
        setActiveSessionId(response.data[0].id);
      }
    }
  }, [activeSessionId]);

  const loadMessages = useCallback(async (sessionId: string) => {
    const response = await apiFetch<AiChatMessage[]>(`/api/ai/chat/sessions/${sessionId}/messages`);
    if (response.data) {
      setMessages(response.data);
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await loadSessions();
      setLoading(false);
    };

    boot();
  }, [loadSessions]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadMessages]);

  const createSession = async (title?: string) => {
    const response = await apiFetch<AiChatSession>("/api/ai/chat/sessions", {
      method: "POST",
      body: { title },
    });
    if (response.data) {
      setActiveSessionId(response.data.id);
      await loadSessions();
    }
    return response;
  };

  const deleteSession = async (sessionId: string) => {
    const response = await apiFetch<{ id: string; deleted: boolean }>(`/api/ai/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });

    if (response.data?.deleted) {
      const remainingSessions = sessions.filter((session) => session.id !== sessionId);
      setSessions(remainingSessions);

      if (activeSessionId === sessionId) {
        const fallbackSessionId = remainingSessions[0]?.id || null;
        setActiveSessionId(fallbackSessionId);
        if (!fallbackSessionId) {
          setMessages([]);
        }
      }

      await loadSessions();
    }

    return response;
  };

  const sendMessage = async (message: string) => {
    let sessionId = activeSessionId;
    console.group("[RAG] Nueva consulta");
    console.log("[RAG] 1. Mensaje del usuario:", message);

    if (!sessionId) {
      console.log("[RAG] 2. Sin sesión activa → creando sesión nueva...");
      const created = await createSession(message.slice(0, 60));
      sessionId = created.data?.id || null;
      console.log("[RAG] 2. Sesión creada:", sessionId);
    } else {
      console.log("[RAG] 2. Usando sesión existente:", sessionId);
    }

    console.log("[RAG] 3. Enviando POST /api/ai/chat/query...");
    const response = await apiFetch<{
      sessionId: string;
      answer: string;
      matches: AiChatMatch[];
      providerUsed: string;
      modelUsed: string;
      ragMode?: string;
      intent?: string;
    }>("/api/ai/chat/query", {
      method: "POST",
      body: {
        message,
        sessionId,
      },
    });

    if (response.error) {
      console.error(
        "[RAG] 4. ERROR en la respuesta:",
        response.error.message,
        "| status:",
        response.error.statusCode,
        "| raw:",
        response.error,
      );
    } else {
      const d = response.data!;
      console.log("[RAG] 4. Respuesta recibida:");
      console.log("      provider:", d.providerUsed, "| modelo:", d.modelUsed);
      console.log("      intent detectado:", d.intent);
      console.log("      ragMode:", d.ragMode);
      console.log("      docs indexados (total):", (d as any)._debug?.totalIndexed, "| verificados (isVerified=true):", (d as any)._debug?.totalVerified);
      console.log("      matches encontrados:", d.matches?.length ?? 0, d.matches);
      console.log("      respuesta (preview):", d.answer?.slice(0, 200));
    }

    if (response.data?.sessionId) {
      console.log("[RAG] 5. Cargando mensajes de la sesión:", response.data.sessionId);
      setActiveSessionId(response.data.sessionId);
      await loadSessions();
      await loadMessages(response.data.sessionId);
      console.log("[RAG] 6. Mensajes cargados en estado.");
    }

    console.groupEnd();
    return response;
  };

  return {
    sessions,
    messages,
    activeSessionId,
    setActiveSessionId,
    loading,
    createSession,
    deleteSession,
    sendMessage,
    reloadSessions: loadSessions,
    reloadMessages: loadMessages,
  };
}
