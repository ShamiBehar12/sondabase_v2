import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { apiFetch } from "@/lib/api-client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, FileText, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type InternalSource = {
  recordType: string;
  recordId: string;
  title: string;
  fileName: string;
  filePath: string;
  score: number;
  reason: string;
  matchTerms: string[];
  referenceLabel: string;
  referencePages: number[];
  citations: string[];
};

export default function AIChat() {
  const { t } = useTranslation();
  const { sessions, messages, activeSessionId, setActiveSessionId, loading, createSession, reloadSessions } = useAIChatContext();
  const { toast } = useToast();
  const { trackAIQuery } = useAnalytics();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const queryStartRef = useRef<number>(0);

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(
      (m) => m.role === "assistant" && Array.isArray(m.sourcesJson) && (m.sourcesJson as unknown[]).length > 0,
    );
    if (lastAssistant) setSelectedMsgId(lastAssistant.id);
  }, [messages]);

  const activeSources = useMemo<InternalSource[]>(() => {
    if (!selectedMsgId) return [];
    const msg = messages.find((m) => m.id === selectedMsgId);
    if (!msg?.sourcesJson) return [];
    const sources = msg.sourcesJson as unknown[];
    if (!sources.length || !(sources[0] as any)?.fileName) return [];
    return sources as InternalSource[];
  }, [messages, selectedMsgId]);

  const handleNewSession = async () => {
    const result = await createSession(t("aiChat.newChat"));
    if (result.error) {
      toast({ variant: "destructive", title: t("aiChat.newSessionError"), description: result.error.message });
    }
  };

  const handleSubmit = async () => {
    const prompt = question.trim();
    if (!prompt || sending) return;
    setQuestion("");
    setSending(true);
    queryStartRef.current = Date.now();

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const created = await createSession(prompt.slice(0, 60));
        sessionId = created.data?.id ?? null;
        if (!sessionId) throw new Error(t("aiChat.newSessionError"));
      }

      const { data, error } = await apiFetch<{
        answer: string;
        matches: InternalSource[];
        sessionId: string;
        intent: string;
      }>("/api/ai/chat/query", {
        method: "POST",
        body: { message: prompt, sessionId },
      });

      if (error || !data) throw new Error(error?.message ?? t("aiChat.chatError"));

      trackAIQuery(Date.now() - queryStartRef.current);
      await reloadSessions();
      setActiveSessionId(data.sessionId);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("aiChat.chatError"), description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-6 h-6" />
          {t("aiChat.title")}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">{t("aiChat.subtitle")}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="flex items-center gap-1 shrink-0" onClick={handleNewSession}>
          <Plus className="w-4 h-4" />
          {t("aiChat.newChat")}
        </Button>
        {(sessions ?? []).map((session: any) => (
          <button
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors truncate max-w-[160px] ${
              session.id === activeSessionId
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-foreground-muted hover:border-primary/50"
            }`}
            title={session.title}
          >
            {session.title || t("aiChat.newChat")}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>{t("aiChat.chat")}</CardTitle>
            <CardDescription>{t("aiChat.chatDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[460px] rounded-lg border border-border p-4">
              <div className="space-y-4">
                {loading && <div className="text-sm text-foreground-muted">{t("aiChat.loading")}</div>}
                {!loading && messages.length === 0 && (
                  <div className="text-sm text-foreground-muted">{t("aiChat.noMessages")}</div>
                )}
                {messages.map((message) => {
                  const hasSources =
                    message.role === "assistant" &&
                    Array.isArray(message.sourcesJson) &&
                    (message.sourcesJson as unknown[]).length > 0;
                  const isSelected = message.id === selectedMsgId;
                  return (
                    <div
                      key={message.id}
                      onClick={() => { if (hasSources) setSelectedMsgId(message.id); }}
                      className={`rounded-xl p-4 transition-all ${
                        message.role === "user" ? "bg-primary/10" : "bg-surface"
                      } ${hasSources ? "cursor-pointer hover:ring-1 hover:ring-primary/40" : ""} ${
                        isSelected ? "ring-1 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs uppercase tracking-wide text-foreground-muted">
                          {message.role === "user" ? t("aiChat.question") : t("aiChat.assistant")}
                        </div>
                        {hasSources && (
                          <div className="flex items-center gap-1 text-xs text-foreground-muted">
                            <FileText className="w-3 h-3" />
                            <span>{(message.sourcesJson as unknown[]).length}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm prose prose-invert prose-sm max-w-none
                        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                        [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_th]:text-left
                        [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                        [&_tr:nth-child(even)]:bg-muted/30
                        [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="rounded-xl p-4 bg-surface text-sm text-foreground-muted animate-pulse">
                    {t("aiChat.querying")}
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("aiChat.inputPlaceholder")}
                disabled={sending}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
              <Button onClick={handleSubmit} disabled={sending} className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                {t("aiChat.send")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>{t("aiChat.sources")}</CardTitle>
            <CardDescription>
              {selectedMsgId ? t("aiChat.sourcesFor") : t("aiChat.sourcesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px] pr-2">
              {activeSources.length === 0 ? (
                <div className="text-sm text-foreground-muted">{t("aiChat.sourcesEmpty")}</div>
              ) : (
                <div className="space-y-3">
                  {activeSources.map((src, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                      <p className="text-sm font-medium break-all">{src.title || src.fileName}</p>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {src.matchTerms?.slice(0, 3).map((term) => (
                          <Badge key={term} variant="secondary">{term}</Badge>
                        ))}
                        {src.referencePages?.length > 0 && (
                          <Badge variant="outline">{src.referenceLabel}</Badge>
                        )}
                      </div>
                      {src.citations?.length > 0 && (
                        <p className="text-xs text-foreground-muted line-clamp-2">{src.citations[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
