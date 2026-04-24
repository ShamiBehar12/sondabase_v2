import { useMemo, useState } from "react";
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
import { apiClient } from "@/lib/api-client";
import { Bot, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIChat() {
  const { sessions, messages, activeSessionId, setActiveSessionId, loading, createSession, deleteSession, sendMessage } = useAIChat();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const latestAssistantSources = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && Array.isArray(message.sourcesJson))?.sourcesJson || [],
    [messages],
  );

  const formatReference = (reason: string) => {
    if (!reason?.trim()) {
      return "Referência localizada no documento indexado.";
    }

    return reason
      .replace(/^Correspondencia encontrada para:\s*/i, "Referência encontrada para: ")
      .replace(/^Correspondencia baseada em metadados gerais do certificado\.?$/i, "Referência localizada nos metadados do certificado.");
  };

  const formatMatch = (reason?: string) => {
    if (!reason?.trim()) {
      return null;
    }

    const normalized = reason
      .replace(/^Correspondencia encontrada para:\s*/i, "")
      .replace(/\.$/, "")
      .trim();

    if (!normalized || /metadados gerais/i.test(reason)) {
      return null;
    }

    return normalized;
  };

  const formatReferencePages = (pages?: number[]) => {
    if (!pages || pages.length === 0) {
      return null;
    }

    return pages.length === 1 ? `Página ${pages[0]}` : `Páginas ${pages.join(", ")}`;
  };

  const handleNewSession = async () => {
    const { error } = await createSession("Nova conversa");
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conversa",
        description: error.message,
      });
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) return;
    const prompt = question;
    setQuestion("");

    const { error } = await sendMessage(prompt);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro no chat",
        description: error.message,
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const { error } = await deleteSession(sessionId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir conversa",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Conversa excluída",
      description: "A sessão foi removida com sucesso.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-8 h-8" />
          Assistente de Certificados
        </h1>
        <p className="text-foreground-muted mt-2">
          Pergunta em linguagem natural e recebe os certificados aprovados mais aderentes, com ranking e fontes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr_360px]">
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Conversas</CardTitle>
                <CardDescription>Sessões recentes do assistente.</CardDescription>
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
                        {session.title || "Sem título"}
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
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-surface border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Excluir conversa</AlertDialogTitle>
                          <AlertDialogDescription className="text-foreground-muted">
                            Tem certeza de que deseja excluir a conversa "{session.title || "Sem título"}"? Esta ação não pode ser desfeita.
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

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Consulta orientada aos certificados aprovados e indexados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[460px] rounded-lg border border-border p-4">
              <div className="space-y-4">
                {loading && <div className="text-sm text-foreground-muted">Carregando conversas...</div>}
                {!loading && messages.length === 0 && (
                  <div className="text-sm text-foreground-muted">
                    Ainda não há mensagens. Exemplo: "Que certificados atendem a uma experiência em gestão de contratos no Chile?"
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-4 ${message.role === "user" ? "bg-primary/10" : "bg-surface"}`}>
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {message.role === "user" ? "Pergunta" : "Assistente"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Descreve o perfil, tecnologia ou requisito que queres atender..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSubmit();
                  }
                }}
              />
              <Button onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Ranking</CardTitle>
            <CardDescription>Certificados encontrados na última resposta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAssistantSources.length === 0 ? (
              <div className="text-sm text-foreground-muted">O ranking aparecerá aqui depois da primeira resposta.</div>
            ) : (
              latestAssistantSources.map((match) => (
                <div key={`${match.recordType}-${match.recordId}`} className="rounded-lg border border-border p-4 space-y-3">
                  {(() => {
                    const pdfBaseUrl = apiClient.storage
                      .from("certificates")
                      .getPublicUrl(match.filePath, { fileName: match.fileName }).data.publicUrl;
                    const firstPage = match.referencePages?.[0];
                    const pdfUrl = firstPage ? `${pdfBaseUrl}#page=${firstPage}` : pdfBaseUrl;
                    const matchText = formatMatch(match.reason);
                    const pageLabel = formatReferencePages(match.referencePages);
                    const matchTermsLabel = match.matchTerms?.length ? match.matchTerms.join(", ") : matchText;

                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{match.title}</div>
                            <div className="text-xs text-foreground-muted">{match.fileName}</div>
                          </div>
                          <Badge variant="outline">Score {match.score}</Badge>
                        </div>

                        {pageLabel && (
                          <div className="text-xs text-foreground-muted">
                            Páginas no PDF original: <span className="font-medium text-foreground">{pageLabel}</span>
                          </div>
                        )}

                        {matchTermsLabel && (
                          <div className="text-xs text-foreground-muted">
                            Match encontrado: <span className="font-medium text-foreground">{matchTermsLabel}</span>
                          </div>
                        )}

                        <a
                          className="text-sm text-primary underline"
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir PDF
                        </a>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
