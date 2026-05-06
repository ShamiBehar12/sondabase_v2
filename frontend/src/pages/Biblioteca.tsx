import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BookOpen, Trash2, RefreshCw, Search, AlertTriangle } from "lucide-react";

interface RacerDocument {
  document_id: string;
  original_filename: string;
  doc_type: string | null;
  client: string | null;
  country: string | null;
  year: number | null;
  is_apostilled: number | null;
  summary_one_line: string | null;
  ingested_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Biblioteca() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<RacerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteAllPassword, setDeleteAllPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<RacerDocument[]>("/api/racer/documents");
    if (data) setDocs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    return (
      d.original_filename?.toLowerCase().includes(q) ||
      d.client?.toLowerCase().includes(q) ||
      d.country?.toLowerCase().includes(q) ||
      d.doc_type?.toLowerCase().includes(q)
    );
  });

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(d => d.document_id)));
    }
  };

  const deleteOne = async (id: string) => {
    setDeleting(true);
    const { error } = await apiFetch(`/api/racer/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (error) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } else {
      toast({ title: "Documento eliminado" });
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      await load();
    }
    setDeleting(false);
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    setDeleting(true);
    const { error } = await apiFetch("/api/racer/documents", {
      method: "DELETE",
      body: { ids: Array.from(selected) },
    });
    if (error) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } else {
      toast({ title: `${selected.size} documento(s) eliminados` });
      setSelected(new Set());
      await load();
    }
    setDeleting(false);
  };

  const deleteAll = async () => {
    setDeleting(true);
    const { error, data } = await apiFetch<{ deleted: number }>("/api/racer/documents/all", {
      method: "DELETE",
      body: { password: deleteAllPassword },
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Índice limpiado — ${data?.deleted ?? 0} documentos eliminados` });
      setSelected(new Set());
      setDeleteAllPassword("");
      await load();
    }
    setDeleting(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Biblioteca de Conocimiento
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            {loading ? "Cargando…" : `${docs.length} documento${docs.length !== 1 ? "s" : ""} indexado${docs.length !== 1 ? "s" : ""} en el asistente IA`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <Input
            placeholder="Buscar por nombre, cliente, país…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-background/50"
          />
        </div>

        {selected.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                Eliminar seleccionados ({selected.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-surface border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar {selected.size} documento(s)</AlertDialogTitle>
                <AlertDialogDescription className="text-foreground-muted">
                  Se eliminarán del índice del asistente IA. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={deleteSelected}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Delete all */}
        <AlertDialog onOpenChange={() => setDeleteAllPassword("")}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10" disabled={deleting || docs.length === 0}>
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Borrar todo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-surface border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Borrar toda la biblioteca</AlertDialogTitle>
              <AlertDialogDescription className="text-foreground-muted">
                Se eliminarán <strong className="text-foreground">{docs.length} documentos</strong> del índice del asistente IA. Esta acción no se puede deshacer.
                <br /><br />
                Escribe <strong className="text-foreground">borrar todo</strong> para confirmar:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteAllPassword}
              onChange={e => setDeleteAllPassword(e.target.value)}
              placeholder="borrar todo"
              className="bg-background/50"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={deleteAll}
                disabled={deleteAllPassword !== "borrar todo"}
              >
                Borrar todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-foreground-muted text-xs uppercase tracking-wider">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
                <th className="text-left py-3 pr-4">Archivo</th>
                <th className="text-left py-3 px-3">Cliente</th>
                <th className="text-left py-3 px-3">País</th>
                <th className="text-left py-3 px-3">Tipo</th>
                <th className="text-right py-3 px-3">Año</th>
                <th className="text-center py-3 px-3">Apostillado</th>
                <th className="text-right py-3 px-3">Ingestado</th>
                <th className="w-10 py-3 pl-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Cargando documentos…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground-muted">
                    {search ? "Sin resultados para esa búsqueda." : "No hay documentos indexados aún."}
                  </td>
                </tr>
              )}
              {filtered.map(doc => (
                <tr key={doc.document_id} className={`hover:bg-white/[0.03] transition-colors ${selected.has(doc.document_id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(doc.document_id)}
                      onCheckedChange={() => toggleOne(doc.document_id)}
                      className="h-3.5 w-3.5"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-foreground truncate max-w-[280px]" title={doc.original_filename}>
                      {doc.original_filename}
                    </p>
                    {doc.summary_one_line && (
                      <p className="text-xs text-foreground-muted truncate max-w-[280px]" title={doc.summary_one_line}>
                        {doc.summary_one_line}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-foreground-secondary">{doc.client ?? "—"}</td>
                  <td className="py-3 px-3 text-foreground-secondary">{doc.country ?? "—"}</td>
                  <td className="py-3 px-3">
                    {doc.doc_type ? (
                      <Badge variant="outline" className="text-[10px] capitalize border-border/60 text-foreground-muted">
                        {doc.doc_type.replace(/_/g, " ")}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-3 text-right text-foreground-secondary">{doc.year ?? "—"}</td>
                  <td className="py-3 px-3 text-center">
                    {doc.is_apostilled === 1
                      ? <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">Sí</Badge>
                      : doc.is_apostilled === 0
                      ? <span className="text-xs text-foreground-muted">No</span>
                      : <span className="text-xs text-foreground-muted">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-foreground-muted whitespace-nowrap">
                    {formatDate(doc.ingested_at)}
                  </td>
                  <td className="py-3 pl-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="text-foreground-muted hover:text-destructive transition-colors"
                          title="Eliminar"
                          disabled={deleting}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-surface border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
                          <AlertDialogDescription className="text-foreground-muted">
                            ¿Eliminar <strong className="text-foreground">{doc.original_filename}</strong> del índice? El archivo físico no se borrará.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteOne(doc.document_id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
