import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAIChat } from "@/hooks/useAI";
import { apiFetch } from "@/lib/api-client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, Send, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type RacerSource = {
  archivo: string;
  pais: string;
  ano: string;
  apostillado: boolean;
  distancia: number;
};

export default function AIChat() {
  const { t } = useTranslation();
  const { messages, activeSessionId, setActiveSessionId, loading, createSession, reloadSessions, reloadMessages } = useAIChat();
  const { toast } = useToast();
  const { trackAIQuery } = useAnalytics();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const queryStartRef = useRef<number>(0);

  const [selectedSource, setSelectedSource] = useState<RacerSource | null>(null);
  const [sourceViewMode, setSourceViewMode] = useState<'pdf' | 'txt'>('pdf');
  const [sourcePdfUrl, setSourcePdfUrl] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  const racerSources = useMemo<RacerSource[]>(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && Array.isArray(m.sourcesJson));
    if (!lastAssistant?.sourcesJson) return [];
    const sources = lastAssistant.sourcesJson as unknown[];
    if (!sources.length || !(sources[0] as any)?.archivo) return [];
    return sources as RacerSource[];
  }, [messages]);

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
        if (!sessionId) throw new Error(t('aiChat.newSessionError'));
      }

      // Include last 6 messages as conversation history so the RAG can
      // resolve follow-up questions that lack explicit context (e.g. "¿cuáles son apostillados?")
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await apiFetch<{
        answer: string;
        sources: RacerSource[];
        tipo: string;
        filtros: Record<string, unknown>;
      }>("/api/racer/query", {
        method: "POST",
        body: { question: prompt, history },
      });

      if (error || !data) {
        throw new Error(error?.message ?? t('aiChat.chatError'));
      }

      await apiFetch(`/api/ai/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: { role: "user", content: prompt },
      });

      await apiFetch(`/api/ai/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: {
          role: "assistant",
          content: data.answer,
          sourcesJson: data.sources,
        },
      });

      trackAIQuery(Date.now() - queryStartRef.current);
      await reloadSessions();
      setActiveSessionId(sessionId);
      await reloadMessages(sessionId);
    } catch (err: any) {
      toast({ variant: "destructive", title: t('aiChat.chatError'), description: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleSourceClick = async (src: RacerSource) => {
    setSelectedSource(src);
    setSourceViewMode('pdf');
    setSourceLoading(true);
    setSourcePdfUrl(null);

    const { data } = await apiFetch<{ filePath: string; fileUrl: string }>(
      `/api/racer/source-file?name=${encodeURIComponent(src.archivo)}`
    );
    if (data?.fileUrl) setSourcePdfUrl(data.fileUrl);
    setSourceLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-8 h-8" />
          {t('aiChat.title')}
        </h1>
        <p className="text-foreground-muted mt-2">
          {t('aiChat.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Chat panel */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>{t('aiChat.chat')}</CardTitle>
            <CardDescription>{t('aiChat.chatDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[520px] rounded-lg border border-border p-4">
              <div className="space-y-4">
                {loading && <div className="text-sm text-foreground-muted">{t('aiChat.loading')}</div>}
                {!loading && messages.length === 0 && (
                  <div className="text-sm text-foreground-muted">
                    {t('aiChat.noMessages')}
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-4 ${message.role === "user" ? "bg-primary/10" : "bg-surface"}`}>
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {message.role === "user" ? t('aiChat.question') : t('aiChat.assistant')}
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
                ))}
                {sending && (
                  <div className="rounded-xl p-4 bg-surface text-sm text-foreground-muted animate-pulse">
                    {t('aiChat.querying')}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('aiChat.inputPlaceholder')}
                disabled={sending}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
              <Button onClick={handleSubmit} disabled={sending} className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                {t('aiChat.send')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sources panel */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>{t('aiChat.sources')}</CardTitle>
            <CardDescription>{t('aiChat.sourcesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-2">
              {racerSources.length === 0 ? (
                <div className="text-sm text-foreground-muted">
                  {t('aiChat.sourcesEmpty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {racerSources.map((src, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3 space-y-1 cursor-pointer hover:border-cyan-400/30 hover:bg-surface-hover transition-colors"
                      onClick={() => handleSourceClick(src)}
                    >
                      <p className="text-sm font-medium break-all">{src.archivo}</p>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {src.pais && <Badge variant="secondary">{src.pais}</Badge>}
                        {src.ano && <Badge variant="outline">{src.ano}</Badge>}
                        {src.apostillado && <Badge className="bg-green-600 text-white">Apostillado</Badge>}
                      </div>
                      <p className="text-xs text-foreground-muted">distancia: {src.distancia}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* PDF/Text document viewer */}
      <Dialog open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-surface border-border p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedSource?.archivo}</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedSource?.pais && <Badge variant="secondary">{selectedSource.pais}</Badge>}
                {selectedSource?.ano && <Badge variant="outline">{selectedSource.ano}</Badge>}
                {selectedSource?.apostillado && <Badge className="bg-green-600 text-white">Apostillado</Badge>}
                <span className="text-xs text-foreground-muted self-center ml-1">dist: {selectedSource?.distancia}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 px-6 py-3 border-b border-border">
            <Button
              size="sm"
              variant={sourceViewMode === 'pdf' ? 'default' : 'outline'}
              onClick={() => setSourceViewMode('pdf')}
              className="h-7 text-xs"
            >
              {t('aiChat.viewPdf')}
            </Button>
            <Button
              size="sm"
              variant={sourceViewMode === 'txt' ? 'default' : 'outline'}
              onClick={() => setSourceViewMode('txt')}
              className="h-7 text-xs"
            >
              {t('aiChat.viewText')}
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {sourceViewMode === 'pdf' ? (
              sourceLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
                </div>
              ) : sourcePdfUrl ? (
                <iframe
                  src={`${sourcePdfUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title={selectedSource?.archivo}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-foreground-muted text-sm px-6 text-center">
                  {t('aiChat.pdfUnavailable')}
                </div>
              )
            ) : (
              <div className="p-6 space-y-4 text-sm overflow-auto h-full">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Archivo</p>
                    <p className="font-medium break-all">{selectedSource?.archivo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">País</p>
                    <p className="font-medium">{selectedSource?.pais || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Año</p>
                    <p className="font-medium">{selectedSource?.ano || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Apostillado</p>
                    <p className="font-medium">{selectedSource?.apostillado ? 'Sí' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Distancia</p>
                    <p className="font-medium">{selectedSource?.distancia}</p>
                  </div>
                </div>
                <p className="text-foreground-muted text-xs mt-4 pt-4 border-t border-border">
                  {t('aiChat.textViewInfo')}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
