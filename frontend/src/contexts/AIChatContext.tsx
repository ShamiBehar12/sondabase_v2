import { createContext, useContext, ReactNode } from "react";
import { useAIChat } from "@/hooks/useAI";
import type { AiChatSession, AiChatMessage } from "@/hooks/useAI";

type AIChatContextValue = {
  sessions: AiChatSession[];
  messages: AiChatMessage[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  loading: boolean;
  createSession: (title?: string) => Promise<any>;
  deleteSession: (id: string) => Promise<any>;
  sendMessage: (message: string) => Promise<any>;
  reloadSessions: () => Promise<void>;
  reloadMessages: (sessionId: string) => Promise<void>;
};

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIChatProvider({ children }: { children: ReactNode }) {
  const chat = useAIChat();
  return <AIChatContext.Provider value={chat}>{children}</AIChatContext.Provider>;
}

export function useAIChatContext() {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error("useAIChatContext must be used within AIChatProvider");
  return ctx;
}
