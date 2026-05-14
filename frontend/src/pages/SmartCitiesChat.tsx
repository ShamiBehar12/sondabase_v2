import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-client";
import { Building2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        <h1 className="text-3xl font-bold bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white bg-clip-text text-transparent flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          Smart Cities RAG
        </h1>
        <p className="text-white mt-2">
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
            <ScrollArea className="h-[480px] rounded-lg border border-[#3E4A5F] p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-sm text-white">
                    Ejemplo: "¿Qué contratos tenemos apostillados en Chile?" o "Documentos de gestión de tráfico en Colombia"
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`rounded-xl p-4 ${msg.role === "user" ? "bg-[rgba(59,130,246,0.1)]" : "bg-[#202938]"}`}>
                    <div className="text-xs uppercase tracking-wide text-white mb-2">
                      {msg.role === "user" ? "Tú" : "Asistente"}
                    </div>
                    <div className="text-sm prose prose-invert prose-sm max-w-none
                      [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                      [&_th]:border [&_th]:border-[#3E4A5F] [&_th]:px-2 [&_th]:py-1 [&_th]:bg-[#232C3A] [&_th]:text-left
                      [&_td]:border [&_td]:border-[#3E4A5F] [&_td]:px-2 [&_td]:py-1
                      [&_tr:nth-child(even)]:bg-[rgba(35,44,58,0.3)]
                      [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.tipo && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        búsqueda: {msg.tipo}
                      </Badge>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="rounded-xl p-4 bg-[#202938] text-sm text-white animate-pulse">
                    Consultando documentos...
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(y) => setQuestion(y.target.value)}
                placeholder="Escribe tu pregunta..."
                onKeyDown={(y) => { if (y.key === "Enter") handleSubmit(); }}
                disabled={loading}
              />
              <Button onClick={handleSubmit} disabled={loading} className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110">
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
                <p className="text-sm text-white">Las fuentes aparecerán aquí tras la primera consulta.</p>
              ) : (
                <div className="space-y-3">
                  {lastSources.map((src, i) => (
                    <div key={i} className="rounded-lg border border-[#3E4A5F] p-3 space-y-1">
                      <p className="text-sm font-medium break-all">{src.archivo}</p>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {src.pais && <Badge variant="secondary">{src.pais}</Badge>}
                        {src.ano && <Badge variant="outline">{src.ano}</Badge>}
                        {src.apostillado && <Badge className="bg-green-600 text-white">Apostillado</Badge>}
                      </div>
                      <p className="text-xs text-white">distancia: {src.distancia}</p>
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



