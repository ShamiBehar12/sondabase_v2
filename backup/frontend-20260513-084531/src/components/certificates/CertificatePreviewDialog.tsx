import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface CertificatePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  certificateName?: string;
  onDownload?: () => void;
}

export function CertificatePreviewDialog({
  isOpen,
  onClose,
  pdfUrl,
  certificateName = "Certificado",
  onDownload
}: CertificatePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pdfUrl) {
      setIsLoading(true);
    }
  }, [pdfUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleExternalOpen = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-background border-border">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">{certificateName}</DialogTitle>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExternalOpen}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em nova aba
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-4">
          {pdfUrl ? (
            <div className="relative w-full h-[75vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Carregando PDF...</p>
                  </div>
                </div>
              )}
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitV&page=1&view=FitV,0,0,1`}
                className="w-full max-w-4xl h-full border-0 rounded"
                title={certificateName}
                onLoad={handleIframeLoad}
                style={{ 
                  display: isLoading ? 'none' : 'block',
                  aspectRatio: '8.5/11'
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[70vh] bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">No fue posible carregar o PDF</p>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="mt-4"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}