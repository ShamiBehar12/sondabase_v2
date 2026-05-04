import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAIChat } from "@/hooks/useAI";
import { apiFetch } from "@/lib/api-client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { sessions, messages, activeSessionId, setActiveSessionId, loading, createSession, deleteSession, reloadSessions } = useAIChat();
  const { toast } = useToast();
  const { trackAIQuery } = useAnalytics();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const queryStartRef = useRef<number>(0);

  const racerSources = useMemo<RacerSource[]>(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && Array.isArray(m.sourcesJson));
    if (!lastAssistant?.sourcesJson) return [];
    const sources = lastAssistant.sourcesJson as unknown[];
    if (!sources.length || !(sources[0] as any)?.archivo) return [];
    return sources as RacerSource[];
  }, [messages]);

  const handleNewSession = async () => {
    const { error } = await createSession("Nova conversación");
    if (error) {
      toast({ variant: "destructive", title: "Error ao crear conversación", description: error.message });
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
        if (!sessionId) throw new Error("No se pudo crear la sesión");
      }

      const { data, error } = await apiFetch<{
        answer: string;
        sources: RacerSource[];
        tipo: string;
        filtros: Record<string, unknown>;
      }>("/api/racer/query", {
        method: "POST",
        body: { question: prompt },
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Error al consultar el asistente");
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
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error en el chat", description: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const { error } = await deleteSession(sessionId);
    if (error) {
      toast({ variant: "destructive", title: "Error al eliminar conversación", description: error.message });
      return;
    }
    toast({ title: "Conversación eliminada", description: "La sesión fue eliminada con éxito." });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-8 h-8" />
          Assistente de Certificados
        </h1>
        <p className="text-foreground-muted mt-2">
          Consulta en lenguaje natural y recibe los documentos más relevantes con fuentes y contexto.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr_360px]">
        {/* Sessions panel */}
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Conversaciones</CardTitle>
                <CardDescription>Sesiones recientes del asistente.</CardDescription>
              </div>
              <Button size="icon" variant="outline" onClick={handleNewSession}>
                <MessageSquarePlus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px] pr-3">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-start gap-2 rounded-lg border px-3 py-2 transition ${
                      activeSessionId === session.id ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <button
                      className="min-w-0 flex-1 overflow-hidden pr-2 text-left"
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      <div className="break-words text-sm font-medium leading-snug">
                        {session.title || "Sin título"}
                      </div>
                      <div className="text-xs text-foreground-muted mt-1">
                        {new Date(session.updatedAt).toLocaleString("pt-BR")}
                      </div>
                    </button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-foreground-muted opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-surface border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Excluir conversación</AlertDialogTitle>
                          <AlertDialogDescription className="text-foreground-muted">
                            ¿Estás seguro de que deseas eliminar la conversación "{session.title || "Sin título"}"? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Consulta orientada aos certificados aprovados y indexados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[460px] rounded-lg border border-border p-4">
              <div className="space-y-4">
                {loading && <div className="text-sm text-foreground-muted">Cargando conversaciones...</div>}
                {!loading && messages.length === 0 && (
                  <div className="text-sm text-foreground-muted">
                    Aún no hay mensajes. Ejemplo: "¿Qué contratos tenemos apostillados en Chile?"
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-4 ${message.role === "user" ? "bg-primary/10" : "bg-surface"}`}>
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {message.role === "user" ? "Pregunta" : "Asistente"}
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
                    Consultando documentos...
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Describe el perfil, tecnología o requisito que quieres atender..."
                disabled={sending}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
              <Button onClick={handleSubmit} disabled={sending} className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sources panel */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Fuentes</CardTitle>
            <CardDescription>Documentos encontrados en la última respuesta.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px] pr-2">
              {racerSources.length === 0 ? (
                <div className="text-sm text-foreground-muted">
                  Las fuentes aparecerán aquí tras la primera consulta.
                </div>
              ) : (
                <div className="space-y-3">
                  {racerSources.map((src, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-1">
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
    </div>
  );
}
