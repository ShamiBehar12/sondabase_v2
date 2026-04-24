import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSearch, Download, ExternalLink } from "lucide-react";

type RagChunk = {
  id: string;
  chunkOrder: number;
  chunkText: string;
  tokenCount: number;
};

export type CertificateRagDocument = {
  id: string;
  recordType: string;
  recordId: string;
  title: string | null;
  fileName: string;
  status: string;
  isVerifiedSnapshot: boolean;
  updatedAt: string;
  searchText: string;
  chunkCount: number;
  chunks: RagChunk[];
};

interface CertificateRagCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateName?: string;
  pdfUrl: string | null;
  ragDocument: CertificateRagDocument | null;
  loading?: boolean;
  onDownloadPdf?: () => void;
}

export function CertificateRagCompareDialog({
  open,
  onOpenChange,
  certificateName,
  pdfUrl,
  ragDocument,
  loading = false,
  onDownloadPdf,
}: CertificateRagCompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-background border-border">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Comparar PDF x Documento RAG
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {certificateName || "Certificado"}: comparação entre o arquivo original e o conteúdo indexado para IA.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {ragDocument && (
                <>
                  <Badge variant="outline">{ragDocument.status}</Badge>
                  <Badge variant="secondary">{ragDocument.chunkCount} páginas indexadas</Badge>
                </>
              )}
              {onDownloadPdf && (
                <Button variant="outline" size="sm" onClick={onDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              )}
              {pdfUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir PDF
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full min-h-0">
          <div className="border-r border-border p-6 min-h-0">
            <h3 className="font-semibold mb-3">PDF original</h3>
            <div className="h-[72vh] rounded-lg border border-border overflow-hidden bg-muted/20">
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  title={certificateName || "PDF original"}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Não foi possível carregar o PDF.
                </div>
              )}
            </div>
          </div>

          <div className="p-6 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Documento RAG</h3>
              {ragDocument?.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  Atualizado em {new Date(ragDocument.updatedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Carregando documento indexado...
              </div>
            ) : !ragDocument ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Este certificado ainda não possui documento RAG disponível.
              </div>
            ) : (
              <div className="grid grid-rows-[auto_1fr_1fr] gap-4 min-h-0 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Tipo</div>
                    <div className="text-sm font-medium">{ragDocument.recordType}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Páginas indexadas</div>
                    <div className="text-sm font-medium">{ragDocument.chunkCount}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Verificado</div>
                    <div className="text-sm font-medium">{ragDocument.isVerifiedSnapshot ? "Sim" : "Não"}</div>
                  </div>
                </div>

                <div className="min-h-0">
                  <div className="text-sm font-medium mb-2">Texto consolidado do índice</div>
                  <ScrollArea className="h-full rounded-lg border border-border bg-muted/10 p-4">
                    <pre className="text-xs whitespace-pre-wrap break-words text-foreground font-mono">
                      {ragDocument.searchText || "Sem texto consolidado."}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="min-h-0">
                  <div className="text-sm font-medium mb-2">Páginas indexadas</div>
                  <ScrollArea className="h-full rounded-lg border border-border bg-muted/10 p-4">
                    <div className="space-y-4">
                      {ragDocument.chunks.map((chunk) => (
                        <div key={chunk.id} className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Página {chunk.chunkOrder + 1}</Badge>
                            <span className="text-xs text-muted-foreground">{chunk.tokenCount} tokens aprox.</span>
                          </div>
                          <pre className="text-xs whitespace-pre-wrap break-words text-foreground font-mono">
                            {chunk.chunkText}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
