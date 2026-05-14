import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, AlertCircle, Copy, Loader2, X, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';

type FileStatus = "pending" | "uploading" | "ingesting" | "done" | "duplicate" | "error" | "empty";

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  chunks?: number;
  duplicateOf?: string;
  error?: string;
  uploadedPath?: string;
};

const STATUS_ICON: Record<FileStatus, React.ReactNode> = {
  pending:   <Loader2 className="w-4 h-4 text-white" />,
  uploading: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
  ingesting: <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />,
  done:      <CheckCircle className="w-4 h-4 text-green-500" />,
  duplicate: <Copy className="w-4 h-4 text-orange-400" />,
  error:     <AlertCircle className="w-4 h-4 text-red-500" />,
  empty:     <AlertCircle className="w-4 h-4 text-white" />,
};

const STATUS_LABEL: Record<FileStatus, string> = {
  pending:   "En cola",
  uploading: "Subiendo",
  ingesting: "Procesando",
  done:      "Listo",
  duplicate: "Duplicado",
  error:     "Error",
  empty:     "Sin texto",
};

export default function Certificates() {
  const { t } = useTranslation();
  const location = useLocation();
  const { toast } = useToast();
  const { trackUpload } = useAnalytics();

  // Bulk upload state
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [bulkFiles, setBulkFiles] = useState<FileEntry[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Bulk upload helpers
  const addBulkFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const entries: FileEntry[] = Array.from(newFiles)
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({ id: (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)), file: f, status: "pending" }));
    if (!entries.length) {
      toast({ variant: "destructive", title: "Solo se aceptan archivos PDF" });
      return;
    }
    setBulkFiles(prev => [...prev, ...entries]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addBulkFiles(e.dataTransfer.files);
  }, []);

  const updateBulkFile = (id: string, patch: Partial<FileEntry>) =>
    setBulkFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const processAll = async () => {
    const pending = bulkFiles.filter(f => f.status === "pending");
    if (!pending.length) return;
    setBulkRunning(true);
    const uploadStart = Date.now();

    for (const entry of pending) {
      updateBulkFile(entry.id, { status: "uploading" });
      const formData = new FormData();
      formData.append("file", entry.file);
      const uploadPath = `smart-cities-ingest/${entry.file.name}`;

      const { error: uploadErr } = await apiFetch<{ path: string }>(
        `/api/storage/certificates/upload?path=${encodeURIComponent(uploadPath)}`,
        { method: "POST", body: formData }
      );
      if (uploadErr) {
        updateBulkFile(entry.id, { status: "error", error: uploadErr.message });
        continue;
      }

      updateBulkFile(entry.id, { status: "ingesting", uploadedPath: uploadPath });
      const { data, error: ingestErr } = await apiFetch<{
        status: string; chunks_added: number; duplicate_of?: string;
      }>("/api/racer/ingest", {
        method: "POST",
        body: { bucket: "certificates", filePath: uploadPath },
      });

      if (ingestErr || !data) {
        updateBulkFile(entry.id, { status: "error", error: ingestErr?.message ?? "Error desconocido" });
        continue;
      }

      if (data.status === "duplicate") {
        updateBulkFile(entry.id, { status: "duplicate", duplicateOf: data.duplicate_of });
      } else {
        updateBulkFile(entry.id, { status: "done", chunks: data.chunks_added });
      }
    }

    setBulkRunning(false);
    trackUpload(Date.now() - uploadStart, pending.length);
    toast({ title: "Carga masiva completada" });
  };

  const clearBulk = () => setBulkFiles([]);
  const retryErrors = () => setBulkFiles(prev => prev.map(f => f.status === "error" ? { ...f, status: "pending", error: undefined } : f));
  const retryOne = (id: string) => setBulkFiles(prev => prev.map(f => f.id === id && f.status === "error" ? { ...f, status: "pending", error: undefined } : f));
  const bulkDone = bulkFiles.filter(f => f.status === "done").length;
  const bulkTotal = bulkFiles.length;
  const bulkProgress = bulkTotal ? Math.round((bulkFiles.filter(f =>
    ["done", "duplicate", "error", "empty"].includes(f.status)
  ).length / bulkTotal) * 100) : 0;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="relative z-20 flex items-center justify-between">
        <div>
          <h2
            className="text-3xl font-bold"
            style={{ color: "#FFFFFF", textShadow: "0 1px 10px rgba(0,0,0,0.28)" }}
          >
            {t('certificates.title')}
          </h2>
          <p
            className="mt-2"
            style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
          >
            {t('certificates.subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Drop zone */}
        <Card
          className={`premium-card border-2 border-dashed transition-colors cursor-pointer ${dragOver ? "border-[#3B82F6] bg-[rgba(59,130,246,0.05)]" : "border-[#3E4A5F]"}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <CardContent className="relative z-20 flex flex-col items-center justify-center py-12 gap-3">
            <Upload
              className="w-10 h-10"
              style={{ color: "#FFFFFF", filter: "drop-shadow(0 1px 8px rgba(0,0,0,0.22))" }}
            />
            <p
              className="text-sm"
              style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
            >
              Arrastra PDFs aquí o haz clic para seleccionar
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
              >
                Seleccionar archivos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={e => { e.stopPropagation(); folderRef.current?.click(); }}
                style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
              >
                Seleccionar carpeta
              </Button>
            </div>
          </CardContent>
        </Card>

        <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden"
          onChange={e => addBulkFiles(e.target.files)} />
        <input ref={folderRef} type="file" className="hidden"
          {...{ webkitdirectory: "", multiple: true } as any}
          onChange={e => addBulkFiles(e.target.files)} />

        {bulkFiles.length > 0 && (
          <div className="flex items-center gap-3">
            <Button onClick={processAll} disabled={bulkRunning || !bulkFiles.some(f => f.status === "pending")}
              className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110">
              {bulkRunning
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
                : <><Upload className="w-4 h-4 mr-2" />Ingestar {bulkFiles.filter(f => f.status === "pending").length} archivo(s)</>}
            </Button>
            {bulkFiles.some(f => f.status === "error") && (
              <Button variant="outline" size="sm" onClick={retryErrors} disabled={bulkRunning}>
                <RefreshCw className="w-4 h-4 mr-1" />Reintentar errores ({bulkFiles.filter(f => f.status === "error").length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearBulk} disabled={bulkRunning}>
              <X className="w-4 h-4 mr-1" />Limpiar
            </Button>
            <span
              className="text-sm ml-auto"
              style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
            >
              {bulkDone}/{bulkTotal} completados
            </span>
          </div>
        )}

        {bulkRunning && <Progress value={bulkProgress} className="h-2" />}

        {bulkFiles.length > 0 && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Archivos</CardTitle>
              <CardDescription>{bulkTotal} archivo(s) en cola</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bulkFiles.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-[#3E4A5F] px-4 py-2">
                    {STATUS_ICON[entry.status]}
                    <span className="flex-1 text-sm truncate">{entry.file.name}</span>
                    <span className="text-xs text-white">
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
                      <>
                        <span className="text-xs text-red-400 truncate max-w-[140px]" title={entry.error}>
                          {entry.error}
                        </span>
                        <button
                          onClick={() => retryOne(entry.id)}
                          disabled={bulkRunning}
                          className="text-white hover:text-white transition-colors disabled:opacity-50"
                          title="Reintentar"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}



