import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Grid3x3, LayoutList, Upload, FolderOpen, CheckCircle, AlertCircle, Copy, Loader2, X, FileText as FileTextIcon } from 'lucide-react';
import { CertificateUploadForm } from '@/components/certificates/CertificateUploadForm';
import { CertificateList } from '@/components/certificates/CertificateList';
import { useCertificates } from '@/hooks/useCertificates';
import { useUserPreferences } from '@/hooks/useUserPreferences';
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
  pending:   <Loader2 className="w-4 h-4 text-muted-foreground" />,
  uploading: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
  ingesting: <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />,
  done:      <CheckCircle className="w-4 h-4 text-green-500" />,
  duplicate: <Copy className="w-4 h-4 text-orange-400" />,
  error:     <AlertCircle className="w-4 h-4 text-red-500" />,
  empty:     <AlertCircle className="w-4 h-4 text-muted-foreground" />,
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
  const { trackUpload, trackTabClick } = useAnalytics();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<'individual' | 'bulk'>('individual');
  const [openCertificateId, setOpenCertificateId] = useState<string | null>(null);
  const { certificates } = useCertificates();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bulk upload state
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [bulkFiles, setBulkFiles] = useState<FileEntry[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!preferencesLoading && preferences.certificates_view_mode) {
      setViewMode(preferences.certificates_view_mode);
    }
  }, [preferences.certificates_view_mode, preferencesLoading]);

  useEffect(() => {
    if (location.state?.openCertificateId) {
      setOpenCertificateId(location.state.openCertificateId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const allTags = Array.from(
    new Set(certificates.flatMap(cert => cert.tags || []))
  ).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  // Bulk upload helpers
  const addBulkFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const entries: FileEntry[] = Array.from(newFiles)
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({ id: crypto.randomUUID(), file: f, status: "pending" }));
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
  const bulkDone = bulkFiles.filter(f => f.status === "done").length;
  const bulkTotal = bulkFiles.length;
  const bulkProgress = bulkTotal ? Math.round((bulkFiles.filter(f =>
    ["done", "duplicate", "error", "empty"].includes(f.status)
  ).length / bulkTotal) * 100) : 0;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">{t('certificates.title')}</h2>
          <p className="text-foreground-muted mt-2">{t('certificates.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6" value={showUploadForm ? "upload" : "list"} onValueChange={(value) => { setShowUploadForm(value === "upload"); if (value === "list") setUploadMode('individual'); trackTabClick(value); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('certificates.listTab')}
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('certificates.addTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('individual')}
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              Certificado individual
            </Button>
            <Button
              variant={uploadMode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('bulk')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Carga masiva
            </Button>
          </div>

          {uploadMode === 'individual' && (
            <CertificateUploadForm onSuccess={() => setShowUploadForm(false)} />
          )}

          {uploadMode === 'bulk' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <Card
                className={`premium-card border-2 border-dashed transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
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
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                      Seleccionar archivos
                    </Button>
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); folderRef.current?.click(); }}>
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
                    className="bg-gradient-primary hover:opacity-90">
                    {bulkRunning
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
                      : <><Upload className="w-4 h-4 mr-2" />Ingestar {bulkFiles.filter(f => f.status === "pending").length} archivo(s)</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearBulk} disabled={bulkRunning}>
                    <X className="w-4 h-4 mr-1" />Limpiar
                  </Button>
                  <span className="text-sm text-foreground-muted ml-auto">
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
                        <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2">
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
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* View Mode Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground-muted">{t('common.view')}:</span>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-none"
                >
                  <Grid3x3 className="h-4 w-4 mr-1" />
                  {t('certificates.gridView')}
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-none"
                >
                  <LayoutList className="h-4 w-4 mr-1" />
                  {t('certificates.listView')}
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('certificates.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(y) => setSearchTerm(y.target.value)}
                  className="pl-10"
                />
              </div>
              {(searchTerm || selectedTags.length > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  {t('common.clear')}
                </Button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('common.filter')} {t('common.tags')}:</p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('common.tags')}:</span>
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <CertificateList
            searchTerm={searchTerm}
            selectedTags={selectedTags}
            viewMode={viewMode}
            openCertificateId={openCertificateId}
            onCertificateOpened={() => setOpenCertificateId(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
