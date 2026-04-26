import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-client";
import { Building2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Source = {
  archivo: string;
  pais: string;
  ano: string;
  apostillado: boolean;
  distancia: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  tipo?: string;
};

export default function SmartCitiesChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const text = question.trim();
    if (!text || loading) return;

    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const { data, error } = await apiFetch<{
      answer: string;
      sources: Source[];
      tipo: string;
      filtros: Record<string, unknown>;
    }>("/api/racer/query", {
      method: "POST",
      body: { question: text },
    });

    setLoading(false);

    if (error || !data) {
      toast({ variant: "destructive", title: "Error al consultar RACER", description: error?.message });
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.answer, sources: data.sources, tipo: data.tipo },
    ]);
  };

  const lastSources = [...messages].reverse().find((m) => m.role === "assistant" && m.sources?.length)?.sources ?? [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          Smart Cities RAG
        </h1>
        <p className="text-foreground-muted mt-2">
          Consulta los documentos de SONDA Smart Cities en lenguaje natural.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Pregunta sobre contratos, certificados o licitaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[480px] rounded-lg border border-border p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-sm text-foreground-muted">
                    Ejemplo: "¿Qué contratos tenemos apostillados en Chile?" o "Documentos de gestión de tráfico en Colombia"
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`rounded-xl p-4 ${msg.role === "user" ? "bg-primary/10" : "bg-surface"}`}>
                    <div className="text-xs uppercase tracking-wide text-foreground-muted mb-2">
                      {msg.role === "user" ? "Tú" : "Asistente"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    {msg.tipo && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        búsqueda: {msg.tipo}
                      </Badge>
                    )}
                  </div>
                ))}
                {loading && (
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
                placeholder="Escribe tu pregunta..."
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                disabled={loading}
              />
              <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Fuentes</CardTitle>
            <CardDescription>Documentos encontrados en la última respuesta.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[480px] pr-2">
              {lastSources.length === 0 ? (
                <p className="text-sm text-foreground-muted">Las fuentes aparecerán aquí tras la primera consulta.</p>
              ) : (
                <div className="space-y-3">
                  {lastSources.map((src, i) => (
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
