import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, Send, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiChatMatch } from "@/hooks/useAI";

function getDocumentUrl(src: AiChatMatch): string {
  const bucket =
    src.recordType === "professional_certificate"
      ? "professional-certificates"
      : "certificates";
  return `/api/storage/${bucket}/file?path=${encodeURIComponent(src.filePath)}`;
}

export default function AIChat() {
  const { t } = useTranslation();
  const { messages, loading, sendMessage } = useAIChatContext();
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
      const { error } = await sendMessage(prompt);
      if (error) throw new Error(error.message);
      trackAIQuery(Date.now() - queryStartRef.current);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("aiChat.chatError"), description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-8 h-8" />
          {t("aiChat.title")}
        </h1>
        <p className="text-foreground-muted mt-2">{t("aiChat.subtitle")}</p>
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
                const msgSources =
                  Array.isArray(message.sourcesJson) &&
                  (message.sourcesJson as any[]).length > 0 &&
                  (message.sourcesJson[0] as any)?.fileName
                    ? (message.sourcesJson as unknown as AiChatMatch[])
                    : [];

                return (
                  <div
                    key={message.id}
                    className={`rounded-xl p-4 ${
                      message.role === "user" ? "bg-primary/10" : "bg-surface"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {message.role === "user" ? t("aiChat.question") : t("aiChat.assistant")}
                    </div>
                    <div
                      className="text-sm prose prose-invert prose-sm max-w-none
                        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                        [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_th]:text-left
                        [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                        [&_tr:nth-child(even)]:bg-muted/30
                        [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {msgSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-foreground-muted mb-2">
                          {t("aiChat.sources")}:
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {msgSources.map((src, i) => (
                            <a
                              key={i}
                              href={getDocumentUrl(src)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {src.title || src.fileName}
                                {src.referenceLabel ? ` — ${src.referenceLabel}` : ""}
                              </span>
                            </a>
                          ))}
                        </div>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={sending}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-2" />
              {t("aiChat.send")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
