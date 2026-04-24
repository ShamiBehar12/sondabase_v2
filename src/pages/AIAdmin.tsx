import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIAdmin } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { Bot, RefreshCw, Save, Wrench } from "lucide-react";

export default function AIAdmin() {
  const { settings, providers, indexStatus, loading, saveSettings, testProvider, reindexAll } = useAIAdmin();
  const { toast } = useToast();
  const [form, setForm] = useState({
    activeProvider: "openai",
    activeChatModel: "gpt-5",
    activeEmbeddingModel: "text-embedding-3-large",
    ragMode: "internal",
    topK: 5,
    maxChunks: 8,
    temperature: 0.2,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        activeProvider: settings.activeProvider,
        activeChatModel: settings.activeChatModel,
        activeEmbeddingModel: settings.activeEmbeddingModel,
        ragMode: settings.ragMode,
        topK: settings.topK,
        maxChunks: settings.maxChunks,
        temperature: settings.temperature,
      });
    }
  }, [settings]);

  const provider = useMemo(
    () => providers.find((item) => item.provider === form.activeProvider),
    [providers, form.activeProvider],
  );

  const handleSave = async () => {
    const { error } = await saveSettings(form);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao guardar configuração",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Configuração guardada",
      description: "A configuração de IA foi atualizada com sucesso.",
    });
  };

  const handleTest = async () => {
    const { data, error } = await testProvider(form.activeProvider);
    if (error) {
      toast({
        variant: "destructive",
        title: "Falha ao testar provider",
        description: error.message,
      });
      return;
    }

    toast({
      title: data?.ok ? "Provider configurado" : "Provider sem chave",
      description: data?.message,
    });
  };

  const handleReindex = async () => {
    const { data, error } = await reindexAll();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro na reindexação",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Reindexação concluída",
      description: `${data?.indexed || 0} documento(s) sincronizados com o índice interno.`,
    });
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-foreground-muted">Carregando configuração de IA...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Bot className="w-8 h-8" />
          Administração de IA
        </h1>
        <p className="text-foreground-muted mt-2">
          Configura provider, modelo ativo e estado do índice para o chat de certificados de experiência.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Configuração ativa</CardTitle>
            <CardDescription>Seleciona provider, modelo e comportamento do RAG.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <Select
                  value={form.activeProvider}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      activeProvider: value,
                      activeChatModel: providers.find((item) => item.provider === value)?.chat_models[0] || current.activeChatModel,
                      activeEmbeddingModel:
                        providers.find((item) => item.provider === value)?.embedding_models[0] || current.activeEmbeddingModel,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((item) => (
                      <SelectItem key={item.provider} value={item.provider}>
                        {item.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modo de RAG</label>
                <Select value={form.ragMode} onValueChange={(value) => setForm((current) => ({ ...current, ragMode: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="provider_managed">Gerido pelo provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo de chat</label>
                <Select value={form.activeChatModel} onValueChange={(value) => setForm((current) => ({ ...current, activeChatModel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(provider?.chat_models || []).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo de embeddings</label>
                <Select
                  value={form.activeEmbeddingModel}
                  onValueChange={(value) => setForm((current) => ({ ...current, activeEmbeddingModel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(provider?.embedding_models || []).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Top K</label>
                <Input
                  type="number"
                  value={form.topK}
                  onChange={(event) => setForm((current) => ({ ...current, topK: Number(event.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Chunks</label>
                <Input
                  type="number"
                  value={form.maxChunks}
                  onChange={(event) => setForm((current) => ({ ...current, maxChunks: Number(event.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature</label>
              <Input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(event) => setForm((current) => ({ ...current, temperature: Number(event.target.value) }))}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button variant="outline" onClick={handleTest}>
                <Wrench className="w-4 h-4 mr-2" />
                Testar conexão
              </Button>
              <Button variant="outline" onClick={handleReindex}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reindexar tudo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Estado do índice</CardTitle>
            <CardDescription>Resumo dos certificados de experiência preparados para o chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {indexStatus?.summary.map((item) => (
                <Badge key={item.status} variant="outline">
                  {item.status}: {item.count}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              {indexStatus?.recent.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="font-medium text-foreground">{item.title || "Sem título"}</div>
                  <div className="text-sm text-foreground-muted">{item.recordType}</div>
                  <div className="text-xs text-foreground-muted mt-1">
                    {item.status} em {new Date(item.updatedAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
