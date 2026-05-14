import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIAdmin } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import {
  Bot,
  RefreshCw,
  Save,
  Wrench,
  MapPin,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Sprout,
  FileText,
  RotateCcw,
} from "lucide-react";

type RacerHealth = { status: string; chunks: number; docs: number };
type RacerDoc = {
  document_id: string;
  source_file: string;
  doc_type: string;
  client: string;
  country: string;
  year: number;
  is_apostilled: boolean | number;
  summary_one_line: string;
  ingested_at: string;
};
type SeedResult = { created: number; skipped: number; total: number };

export default function AIAdmin() {
  const { t } = useTranslation();
  const { settings, providers, indexStatus, loading, saveSettings, testProvider, reindexAll } = useAIAdmin();
  const { toast } = useToast();

  // ── existing AI config form ──────────────────────────────────────────────
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
      toast({ variant: "destructive", title: "Error ao guardar configuração", description: error.message });
      return;
    }
    toast({ title: "Configuração guardada", description: "A configuração de IA foi atualizada com éxito." });
  };

  const handleTest = async () => {
    const { data, error } = await testProvider(form.activeProvider);
    if (error) {
      toast({ variant: "destructive", title: "Falha ao testar provider", description: error.message });
      return;
    }
    toast({ title: data?.ok ? "Provider configurado" : "Provider sem chave", description: data?.message });
  };

  const handleReindex = async () => {
    const { data, error } = await reindexAll();
    if (error) {
      toast({ variant: "destructive", title: "Error na reindexação", description: error.message });
      return;
    }
    toast({ title: "Reindexação concluída", description: `${data?.indexed || 0} documento(s) sincronizados.` });
  };

  // ── RACER Smart Cities ───────────────────────────────────────────────────
  const [racerHealth, setRacerHealth] = useState<RacerHealth | null>(null);
  const [racerHealthErr, setRacerHealthErr] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  const [racerDocs, setRacerDocs] = useState<RacerDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsSearch, setDocsSearch] = useState("");

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [reingesting, setReingesting] = useState<Set<string>>(new Set());
  const [reingestResults, setReingestResults] = useState<Record<string, "ok" | "error">>({});

  const fetchHealth = async () => {
    setHealthLoading(true);
    setRacerHealthErr(false);
    const { data, error } = await apiFetch<RacerHealth>("/api/racer/health");
    setHealthLoading(false);
    if (error || !data) { setRacerHealthErr(true); return; }
    setRacerHealth(data);
  };

  const fetchDocs = async () => {
    setDocsLoading(true);
    const { data } = await apiFetch<RacerDoc[]>("/api/racer/docs");
    setDocsLoading(false);
    if (data) setRacerDocs(data);
  };

  useEffect(() => {
    fetchHealth();
    fetchDocs();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    const { data, error } = await apiFetch<SeedResult>("/api/admin/seed-racer", { method: "POST" });
    setSeeding(false);
    if (error) {
      toast({ variant: "destructive", title: "Error ao sembrar", description: error.message });
      return;
    }
    setSeedResult(data!);
    toast({
      title: "Documentos sembrados",
      description: `${data!.created} creados · ${data!.skipped} ya existían`,
    });
    fetchDocs();
    fetchHealth();
  };

  const failedDocs = useMemo(
    () => racerDocs.filter(d => (d.summary_one_line || "").startsWith("No se pudo procesar")),
    [racerDocs],
  );

  const handleReingest = async (documentId: string) => {
    setReingesting(prev => new Set(prev).add(documentId));
    const { data, error } = await apiFetch<{ status: string; metadata: any }>(
      "/api/racer/reingest-metadata",
      { method: "POST", body: { document_id: documentId } },
    );
    setReingesting(prev => { const s = new Set(prev); s.delete(documentId); return s; });
    if (error || !data) {
      setReingestResults(prev => ({ ...prev, [documentId]: "error" }));
      toast({ variant: "destructive", title: "Error al re-extraer", description: error?.message });
      return;
    }
    setReingestResults(prev => ({ ...prev, [documentId]: "ok" }));
    toast({ title: "Metadata actualizada", description: `${documentId}: ${data.metadata?.summary_one_line || "OK"}` });
    fetchDocs();
  };

  const handleReingestAll = async () => {
    for (const doc of failedDocs) {
      await handleReingest(doc.document_id);
    }
    toast({ title: "Re-extracción masiva completada" });
  };

  const filteredDocs = useMemo(() => {
    const q = docsSearch.toLowerCase().trim();
    if (!q) return racerDocs;
    return racerDocs.filter(d =>
      (d.source_file || "").toLowerCase().includes(q) ||
      (d.client || "").toLowerCase().includes(q) ||
      (d.country || "").toLowerCase().includes(q) ||
      (d.doc_type || "").toLowerCase().includes(q),
    );
  }, [racerDocs, docsSearch]);

  if (loading) {
    return <div className="container mx-auto p-6 text-white">Carregando configuração de IA...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white bg-clip-text text-transparent flex items-center gap-3">
          <Bot className="w-8 h-8" />
          {t('navigation.aiAdministration')}
        </h1>
        <p className="text-white mt-2">
          {t('navigation.aiAdministrationSubtitle')}
        </p>
      </div>

      {/* ── AI Config ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Configuração ativa</CardTitle>
            <CardDescription>Seleciona provider, modelo y comportamento del RAG.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <Select
                  value={form.activeProvider}
                  onValueChange={(value) =>
                    setForm((cur) => ({
                      ...cur,
                      activeProvider: value,
                      activeChatModel: providers.find((i) => i.provider === value)?.chat_models[0] || cur.activeChatModel,
                      activeEmbeddingModel: providers.find((i) => i.provider === value)?.embedding_models[0] || cur.activeEmbeddingModel,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((item) => (
                      <SelectItem key={item.provider} value={item.provider}>{item.provider}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modo de RAG</label>
                <Select value={form.ragMode} onValueChange={(v) => setForm((cur) => ({ ...cur, ragMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="provider_managed">Gerido pelo provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo de chat</label>
                <Select value={form.activeChatModel} onValueChange={(v) => setForm((cur) => ({ ...cur, activeChatModel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(provider?.chat_models || []).map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo de embeddings</label>
                <Select value={form.activeEmbeddingModel} onValueChange={(v) => setForm((cur) => ({ ...cur, activeEmbeddingModel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(provider?.embedding_models || []).map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Top K</label>
                <Input type="number" value={form.topK}
                  onChange={(y) => setForm((cur) => ({ ...cur, topK: Number(y.target.value) }))} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Chunks</label>
                <Input type="number" value={form.maxChunks}
                  onChange={(y) => setForm((cur) => ({ ...cur, maxChunks: Number(y.target.value) }))} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature</label>
              <Input type="number" step="0.1" value={form.temperature}
                onChange={(y) => setForm((cur) => ({ ...cur, temperature: Number(y.target.value) }))} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110">
                <Save className="w-4 h-4 mr-2" />Guardar
              </Button>
              <Button variant="outline" onClick={handleTest}>
                <Wrench className="w-4 h-4 mr-2" />Testar conexão
              </Button>
              <Button variant="outline" onClick={handleReindex}>
                <RefreshCw className="w-4 h-4 mr-2" />Reindexar tudo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Estado del índice</CardTitle>
            <CardDescription>Resumo dos certificados de experiência preparados para o chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {indexStatus?.summary.map((item) => (
                <Badge key={item.status} variant="outline">{item.status}: {item.count}</Badge>
              ))}
            </div>
            <div className="space-y-3">
              {indexStatus?.recent.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#3E4A5F] p-3">
                  <div className="font-medium text-[#F3F7FC]">{item.title || "Sin título"}</div>
                  <div className="text-sm text-white">{item.recordType}</div>
                  <div className="text-xs text-white mt-1">
                    {item.status} em {new Date(item.updatedAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── RACER Smart Cities ─────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="border-t border-[#3E4A5F] pt-6">
          <h2 className="text-2xl font-bold bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white bg-clip-text text-transparent flex items-center gap-3">
            <MapPin className="w-6 h-6" />
            RACER Smart Cities
          </h2>
          <p className="text-white mt-1">
            Gestión del índice vectorial de documentos Smart Cities (ChromaDB + SQLite).
          </p>
        </div>

        {/* Stats + actions */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Health */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />Estado del servidor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthLoading ? (
                <div className="flex items-center gap-2 text-white">
                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Verificando...</span>
                </div>
              ) : racerHealthErr ? (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-4 h-4" /><span className="text-sm font-medium">Sin conexión</span>
                </div>
              ) : racerHealth ? (
                <>
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-4 h-4" /><span className="text-sm font-medium">Activo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-lg bg-[rgba(35,44,58,0.5)] p-2 text-center">
                      <p className="text-2xl font-bold text-[#F3F7FC]">{racerHealth.docs}</p>
                      <p className="text-xs text-white">documentos</p>
                    </div>
                    <div className="rounded-lg bg-[rgba(35,44,58,0.5)] p-2 text-center">
                      <p className="text-2xl font-bold text-[#F3F7FC]">{racerHealth.chunks}</p>
                      <p className="text-xs text-white">chunks</p>
                    </div>
                  </div>
                </>
              ) : null}
              <Button variant="outline" size="sm" className="w-full" onClick={fetchHealth} disabled={healthLoading}>
                <RefreshCw className={`w-3 h-3 mr-2 ${healthLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </CardContent>
          </Card>

          {/* Seed */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sprout className="w-4 h-4" />Sembrar en base de datos
              </CardTitle>
              <CardDescription className="text-xs">
                Migra los documentos del índice RACER como certificados verificados en MySQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {seedResult && (
                <div className="rounded-lg bg-success/10 border border-success/20 p-3 space-y-1">
                  <p className="text-sm font-medium text-success">Completado</p>
                  <p className="text-xs text-white">
                    <span className="font-medium">{seedResult.created}</span> creados ·{" "}
                    <span className="font-medium">{seedResult.skipped}</span> ya existían
                  </p>
                </div>
              )}
              <Button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110"
              >
                {seeding
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sembrando...</>
                  : <><Sprout className="w-4 h-4 mr-2" />Sembrar {racerDocs.length} documentos</>}
              </Button>
              <p className="text-xs text-white text-center">
                Los ya existentes se omiten automáticamente.
              </p>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />Resumen del índice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docsLoading ? (
                <div className="flex items-center gap-2 text-white text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />Cargando...
                </div>
              ) : (
                <>
                  <StatRow label="Total documentos" value={racerDocs.length} />
                  <StatRow label="Países únicos"
                    value={new Set(racerDocs.map(d => d.country).filter(Boolean)).size} />
                  <StatRow label="Con apostilla"
                    value={racerDocs.filter(d => d.is_apostilled === true || d.is_apostilled === 1).length} />
                  <StatRow label="Tipos únicos"
                    value={new Set(racerDocs.map(d => d.doc_type).filter(Boolean)).size} />
                </>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={fetchDocs} disabled={docsLoading}>
                <RefreshCw className={`w-3 h-3 mr-2 ${docsLoading ? "animate-spin" : ""}`} />
                Actualizar lista
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Failed docs banner */}
        {failedDocs.length > 0 && (
          <Card className="premium-card border-orange-400/40 bg-orange-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-orange-400">
                      {failedDocs.length} documento{failedDocs.length > 1 ? "s" : ""} sin metadata
                    </p>
                    <p className="text-xs text-white">
                      La extracción con GPT falló durante la ingesta inicial. Puedes re-intentarlo ahora.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-400/40 text-orange-400 hover:bg-orange-400/10"
                  onClick={handleReingestAll}
                  disabled={reingesting.size > 0}
                >
                  {reingesting.size > 0
                    ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Re-extrayendo {reingesting.size}...</>
                    : <><RotateCcw className="w-3 h-3 mr-2" />Re-extraer los {failedDocs.length}</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents table */}
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Documentos en el índice RACER</CardTitle>
                <CardDescription>
                  {filteredDocs.length} de {racerDocs.length} documentos
                  {failedDocs.length > 0 && (
                    <span className="ml-2 text-orange-400">· {failedDocs.length} sin metadata</span>
                  )}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-white" />
                <Input
                  placeholder="Buscar por nombre, país, cliente..."
                  className="pl-8"
                  value={docsSearch}
                  onChange={(y) => setDocsSearch(y.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" /><span>Cargando documentos...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-white text-sm">
                {racerDocs.length === 0
                  ? "No hay documentos en el índice. Verifica que el RACER esté activo y que metadata.jsonl exista."
                  : "Ningún documento coincide con la búsqueda."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3E4A5F] text-left">
                      <th className="pb-2 pr-4 font-medium text-white">Archivo</th>
                      <th className="pb-2 pr-4 font-medium text-white">Tipo</th>
                      <th className="pb-2 pr-4 font-medium text-white">Cliente</th>
                      <th className="pb-2 pr-4 font-medium text-white">País</th>
                      <th className="pb-2 pr-4 font-medium text-white">Año</th>
                      <th className="pb-2 pr-4 font-medium text-white">Apostilla</th>
                      <th className="pb-2 font-medium text-white">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => {
                      const isFailed = (doc.summary_one_line || "").startsWith("No se pudo procesar");
                      const isLoading = reingesting.has(doc.document_id);
                      const result = reingestResults[doc.document_id];
                      return (
                        <tr
                          key={doc.document_id}
                          className={`border-b border-[rgba(62,74,95,0.5)] transition-colors ${
                            isFailed ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-[rgba(35,44,58,0.2)]"
                          }`}
                        >
                          <td className="py-2 pr-4 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              {isFailed && <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                              {result === "ok" && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                              <span className="truncate font-mono text-xs text-[#F3F7FC]" title={doc.source_file}>
                                {doc.source_file}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge
                              variant="outline"
                              className={`text-xs whitespace-nowrap ${isFailed ? "border-orange-400/40 text-orange-400" : ""}`}
                            >
                              {doc.doc_type || "—"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-white max-w-[160px] truncate" title={doc.client}>
                            {doc.client || <span className="text-white italic text-xs">sin datos</span>}
                          </td>
                          <td className="py-2 pr-4 text-white">{doc.country || "—"}</td>
                          <td className="py-2 pr-4 text-white">{doc.year || "—"}</td>
                          <td className="py-2 pr-4">
                            {doc.is_apostilled === true || doc.is_apostilled === 1 ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-white">—</span>
                            )}
                          </td>
                          <td className="py-2">
                            {isFailed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
                                onClick={() => handleReingest(doc.document_id)}
                                disabled={isLoading}
                              >
                                {isLoading
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <><RotateCcw className="w-3 h-3 mr-1" />Re-extraer</>}
                              </Button>
                            )}
                            {result === "ok" && !isFailed && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[rgba(62,74,95,0.4)] last:border-0">
      <span className="text-xs text-white">{label}</span>
      <span className="text-sm font-semibold text-[#F3F7FC]">{value}</span>
    </div>
  );
}



