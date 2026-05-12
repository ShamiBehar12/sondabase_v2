import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { apiFetch, apiClient } from "@/lib/api-client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, FileText, ExternalLink, Send } from "lucide-react";
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
  const { messages, activeSessionId, setActiveSessionId, loading, createSession, reloadSessions } = useAIChatContext();
  const { toast } = useToast();
  const { trackAIQuery } = useAnalytics();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const queryStartRef = useRef<number>(0);

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

  const openSource = (src: InternalSource) => {
    if (!src.filePath) return;
    const { data } = apiClient.storage.from('certificates').getPublicUrl(src.filePath);
    window.open(data.publicUrl, '_blank');
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

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>{t("aiChat.chat")}</CardTitle>
          <CardDescription>{t("aiChat.chatDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[560px] rounded-lg border border-border p-4">
            <div className="space-y-4">
              {loading && (
                <div className="text-sm text-foreground-muted">{t("aiChat.loading")}</div>
              )}
              {!loading && messages.length === 0 && (
                <div className="text-sm text-foreground-muted">{t("aiChat.noMessages")}</div>
              )}
              {messages.map((message) => {
                const sources =
                  message.role === "assistant" &&
                  Array.isArray(message.sourcesJson) &&
                  (message.sourcesJson as unknown[]).length > 0 &&
                  (message.sourcesJson[0] as any)?.fileName
                    ? (message.sourcesJson as unknown as InternalSource[])
                    : [];

                return (
                  <div
                    key={message.id}
                    className={`rounded-xl p-4 ${message.role === "user" ? "bg-primary/10" : "bg-surface"}`}
                  >
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {message.role === "user" ? t("aiChat.question") : t("aiChat.assistant")}
                    </div>
                    <div className="text-sm prose prose-invert prose-sm max-w-none
                      [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                      [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_th]:text-left
                      [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                      [&_tr:nth-child(even)]:bg-muted/30
                      [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                    {sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                        {sources.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => openSource(src)}
                            title={t("aiChat.openDoc")}
                            className="text-xs px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{src.title || src.fileName}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
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
    </div>
  );
}
