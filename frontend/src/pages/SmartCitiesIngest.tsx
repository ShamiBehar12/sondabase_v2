import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { Upload, FolderOpen, CheckCircle, AlertCircle, Copy, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FileStatus = "pending" | "uploading" | "ingesting" | "done" | "duplicate" | "error" | "empty";

type FileEntry = {
  id:          string;
  file:        File;
  status:      FileStatus;
  chunks?:     number;
  duplicateOf?: string;
  error?:      string;
  uploadedPath?: string;
};

type RacerDoc = { original_filename: string };

const STATUS_ICON: Record<FileStatus, React.ReactNode> = {
  pending:    <Loader2 className="w-4 h-4 text-muted-foreground" />,
  uploading:  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
  ingesting:  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />,
  done:       <CheckCircle className="w-4 h-4 text-green-500" />,
  duplicate:  <Copy className="w-4 h-4 text-orange-400" />,
  error:      <AlertCircle className="w-4 h-4 text-red-500" />,
  empty:      <AlertCircle className="w-4 h-4 text-muted-foreground" />,
};

const STATUS_LABEL: Record<FileStatus, string> = {
  pending:   "En cola",
  uploading: "Subiendo",
  ingesting: "Procesando",
  done:      "Listo",
  duplicate: "Ya ingestado",
  error:     "Error",
  empty:     "Sin texto",
};

export default function SmartCitiesIngest() {
  const { toast } = useToast();
  const inputRef  = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [files,   setFiles]   = useState<FileEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const entries: FileEntry[] = Array.from(newFiles)
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({
        id:     (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)),
        file:   f,
        status: "pending",
      }));
    if (!entries.length) {
      toast({ variant: "destructive", title: "Solo se aceptan archivos PDF" });
      return;
    }
    setFiles(prev => [...prev, ...entries]);
  };

  const onDrop = useCallback((y: React.DragEvent) => {
    y.preventDefault();
    setDragOver(false);
    addFiles(y.dataTransfer.files);
  }, []);

  const updateFile = (id: string, patch: Partial<FileEntry>) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const processAll = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) return;
    setRunning(true);

    // Fetch already-ingested documents so we can skip them without re-uploading
    const { data: existingDocs } = await apiFetch<RacerDoc[]>("/api/racer/documents");
    const existingFilenames = new Set(
      (existingDocs ?? []).map(d => d.original_filename?.toLowerCase())
    );

    for (const entry of pending) {
      // Skip files already present in RACER
      if (existingFilenames.has(entry.file.name.toLowerCase())) {
        updateFile(entry.id, { status: "duplicate", duplicateOf: entry.file.name });
        continue;
      }

      // 1 — Upload to storage
      updateFile(entry.id, { status: "uploading" });
      const formData = new FormData();
      formData.append("file", entry.file);
      const uploadPath = `smart-cities-ingest/${entry.file.name}`;

      const { error: uploadErr } = await apiFetch<{ path: string }>(
        `/api/storage/certificates/upload?path=${encodeURIComponent(uploadPath)}`,
        { method: "POST", body: formData }
      );
      if (uploadErr) {
        updateFile(entry.id, { status: "error", error: uploadErr.message });
        continue;
      }

      // 2 — Ingest to RACER
      updateFile(entry.id, { status: "ingesting", uploadedPath: uploadPath });
      const { data, error: ingestErr } = await apiFetch<{
        status: string; chunks_added: number; duplicate_of?: string;
      }>("/api/racer/ingest", {
        method: "POST",
        body: { bucket: "certificates", filePath: uploadPath },
      });

      if (ingestErr || !data) {
        updateFile(entry.id, { status: "error", error: ingestErr?.message ?? "Error desconocido" });
        continue;
      }

      if (data.status === "duplicate") {
        updateFile(entry.id, { status: "duplicate", duplicateOf: data.duplicate_of });
      } else {
        updateFile(entry.id, { status: "done", chunks: data.chunks_added });
      }
    }

    setRunning(false);
    toast({ title: "Carga masiva completada" });
  };

  const clear = () => setFiles([]);
  const done  = files.filter(f => f.status === "done").length;
  const total = files.length;
  const progress = total ? Math.round((files.filter(f =>
    ["done","duplicate","error","empty"].includes(f.status)
  ).length / total) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <FolderOpen className="w-8 h-8" />
          Carga Masiva RAG
        </h1>
        <p className="text-foreground-muted mt-2">
          Sube PDFs o carpetas completas. Los documentos ya ingestados se omiten automáticamente.
        </p>
      </div>

      {/* Drop zone */}
      <Card
        className={`premium-card border-2 border-dashed transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
        onDragOver={y => { y.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Upload className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-foreground-muted">
            Arrastra PDFs aquí o haz clic para seleccionar
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={y => { y.stopPropagation(); inputRef.current?.click(); }}>
              Seleccionar archivos
            </Button>
            <Button variant="outline" size="sm" onClick={y => { y.stopPropagation(); folderRef.current?.click(); }}>
              Seleccionar carpeta
            </Button>
          </div>
        </CardContent>
      </Card>

      <input ref={inputRef}    type="file" multiple accept=".pdf" className="hidden"
        onChange={y => addFiles(y.target.files)} />
      <input ref={folderRef}   type="file" className="hidden"
        {...{ webkitdirectory: "", multiple: true } as any}
        onChange={y => addFiles(y.target.files)} />

      {/* Controls */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={processAll} disabled={running || !files.some(f => f.status === "pending")}
            className="bg-gradient-primary hover:opacity-90">
            {running
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
              : <><Upload className="w-4 h-4 mr-2" />Ingestar {files.filter(f => f.status === "pending").length} archivo(s)</>}
          </Button>
          <Button variant="outline" size="sm" onClick={clear} disabled={running}>
            <X className="w-4 h-4 mr-1" />Limpiar
          </Button>
          <span className="text-sm text-foreground-muted ml-auto">
            {done}/{total} completados
          </span>
        </div>
      )}

      {running && <Progress value={progress} className="h-2" />}

      {/* File table */}
      {files.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Archivos</CardTitle>
            <CardDescription>{total} archivo(s) en cola</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map(entry => (
                <div key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-2">
                  {STATUS_ICON[entry.status]}
                  <span className="flex-1 text-sm truncate">{entry.file.name}</span>
                  <span className="text-xs text-foreground-muted">
                    {(entry.file.size / 1024).toFixed(0)} KB
                  </span>
                  <Badge variant={
                    entry.status === "done"      ? "default"     :
                    entry.status === "duplicate" ? "secondary"   :
                    entry.status === "error"     ? "destructive" : "outline"
                  } className="text-xs">
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                  {entry.status === "done" && entry.chunks !== undefined && (
                    <span className="text-xs text-green-500">{entry.chunks} chunks</span>
                  )}
                  {entry.status === "duplicate" && entry.duplicateOf && (
                    <span className="text-xs text-orange-400 truncate max-w-[120px]" title={entry.duplicateOf}>
                      = {entry.duplicateOf}
                    </span>
                  )}
                  {entry.status === "error" && (
                    <span className="text-xs text-red-400 truncate max-w-[140px]" title={entry.error}>
                      {entry.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
