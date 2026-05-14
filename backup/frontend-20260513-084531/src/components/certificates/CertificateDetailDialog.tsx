import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileText, Calendar, Building, MapPin, Hash, User, Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  description_pt?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  issuing_organization?: string;
  certificate_number?: string;
  country?: string;
  tags?: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  full_name?: string;
  has_rejection_history?: boolean;
  latest_rejection_reason?: string;
}

interface ProfessionalCertificate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  description_pt?: string;
  description_en?: string;
  description_es?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  professional_registration_number?: string;
  professional_council?: string;
  institution?: string;
  certification_type?: string;
  specialization_area?: string;
  course_hours?: number;
  status: string;
  issued_date?: string;
  valid_from?: string;
  valid_until?: string;
  country?: string;
  state_province?: string;
  city?: string;
  is_verified: boolean;
  verification_notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  full_name?: string;
  has_rejection_history?: boolean;
  latest_rejection_reason?: string;
}

interface CertificateDetailDialogProps {
  certificate: Certificate | ProfessionalCertificate | null;
  type: 'certificate' | 'professional_certificate';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (type: 'certificates' | 'professional_certificates', id: string) => Promise<void>;
  onReject: (type: 'certificates' | 'professional_certificates', id: string, reason: string) => Promise<void>;
  loading: boolean;
  showApprovalActions?: boolean;
  canReject?: boolean;
}

export function CertificateDetailDialog({
  certificate,
  type,
  open,
  onOpenChange,
  onApprove,
  onReject,
  loading,
  showApprovalActions = true,
  canReject = true,
}: CertificateDetailDialogProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleViewPdf = async () => {
    if (!certificate) return;

    try {
      const { data, error } = await apiClient.storage
        .from('certificates')
        .createSignedUrl(certificate.file_path, 3600, { fileName: certificate.file_name });

      if (error) throw error;

      if (data?.signedUrl) {
        setPdfUrl(data.signedUrl);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error ao carregar PDF",
        description: "No fue posible carregar o archivo PDF.",
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!certificate) return;

    try {
      const { data, error } = await apiClient.storage
        .from('certificates')
        .download(certificate.file_path, { fileName: certificate.file_name });

      if (error || !data) throw error;

      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = certificate.file_name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast({
        variant: "destructive",
        title: "Error ao descargar PDF",
        description: "No fue posible descargar o archivo PDF.",
      });
    }
  };

  const handleReject = async () => {
    if (!certificate || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, forneça un motivo para a rechazo.",
      });
      return;
    }

    const tableType = type === 'certificate' ? 'certificates' : 'professional_certificates';
    await onReject(tableType, certificate.id, rejectionReason);
    setRejectionReason('');
    setShowRejectDialog(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!certificate) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {certificate.title}
              <Badge variant="outline">
                {type === 'certificate' ? 'Experiência' : 'Profissional'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Certificate Details */}
            <div className="space-y-4">
              <div className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações del Usuario
                </h3>
                <p><strong>Nombre:</strong> {certificate.full_name || 'Nombre no disponible'}</p>
                <p><strong>Criado em:</strong> {formatDate(certificate.created_at)}</p>
                <p><strong>Atualizado em:</strong> {formatDate(certificate.updated_at)}</p>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Detalhes Básicos</h3>
                <div className="space-y-2">
                  <p><strong>Título:</strong> {certificate.title}</p>
                  {certificate.description && (
                    <div>
                      <strong>Descrição:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{certificate.description}</p>
                    </div>
                  )}
                  {certificate.description_pt && (
                    <div>
                      <strong>Descrição (PT):</strong>
                      <p className="text-sm text-muted-foreground mt-1">{certificate.description_pt}</p>
                    </div>
                  )}
                  {certificate.description_en && (
                    <div>
                      <strong>Descrição (EN):</strong>
                      <p className="text-sm text-muted-foreground mt-1">{certificate.description_en}</p>
                    </div>
                  )}
                  {certificate.description_es && (
                    <div>
                      <strong>Descrição (ES):</strong>
                      <p className="text-sm text-muted-foreground mt-1">{certificate.description_es}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Informações del Arquivo</h3>
                <div className="space-y-2">
                  <p><strong>Nombre del archivo:</strong> {certificate.file_name}</p>
                  <p><strong>Tipo:</strong> {certificate.mime_type}</p>
                  <p><strong>Tamanho:</strong> {formatFileSize(certificate.file_size)}</p>
                </div>
              </div>

              {type === 'certificate' ? (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Informações de Experiência</h3>
                  <div className="space-y-2">
                    {(certificate as Certificate).issuing_organization && (
                      <p><strong>Organização:</strong> {(certificate as Certificate).issuing_organization}</p>
                    )}
                    {certificate.country && (
                      <p><strong>País:</strong> {certificate.country}</p>
                    )}
                    {certificate.issued_date && (
                      <p><strong>Data de emissão:</strong> {formatDate(certificate.issued_date)}</p>
                    )}
                    {(certificate as Certificate).contract_start_date && (
                      <p><strong>Data início contrato:</strong> {formatDate((certificate as Certificate).contract_start_date)}</p>
                    )}
                    {(certificate as Certificate).contract_end_date && (
                      <p><strong>Data fim contrato:</strong> {formatDate((certificate as Certificate).contract_end_date)}</p>
                    )}
                    {(certificate as Certificate).certificate_number && (
                      <p><strong>Número del certificado:</strong> {(certificate as Certificate).certificate_number}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Informações Profissionais</h3>
                  <div className="space-y-2">
                    {'institution' in certificate && certificate.institution && (
                      <p><strong>Instituição:</strong> {certificate.institution}</p>
                    )}
                    {'certification_type' in certificate && certificate.certification_type && (
                      <p><strong>Tipo de certificação:</strong> {certificate.certification_type}</p>
                    )}
                    {'professional_council' in certificate && certificate.professional_council && (
                      <p><strong>Conselho:</strong> {certificate.professional_council}</p>
                    )}
                    {'professional_registration_number' in certificate && certificate.professional_registration_number && (
                      <p><strong>Número de registro:</strong> {certificate.professional_registration_number}</p>
                    )}
                    {'specialization_area' in certificate && certificate.specialization_area && (
                      <p><strong>Área de especialização:</strong> {certificate.specialization_area}</p>
                    )}
                    {'course_hours' in certificate && certificate.course_hours && (
                      <p><strong>Horas del curso:</strong> {certificate.course_hours}</p>
                    )}
                    {'valid_from' in certificate && certificate.valid_from && (
                      <p><strong>Válido de:</strong> {formatDate(certificate.valid_from)}</p>
                    )}
                    {'valid_until' in certificate && certificate.valid_until && (
                      <p><strong>Válido até:</strong> {formatDate(certificate.valid_until)}</p>
                    )}
                    {'state_province' in certificate && certificate.state_province && (
                      <p><strong>Estado/Província:</strong> {certificate.state_province}</p>
                    )}
                    {'city' in certificate && certificate.city && (
                      <p><strong>Cidade:</strong> {certificate.city}</p>
                    )}
                  </div>
                </div>
              )}

              {certificate.tags && certificate.tags.length > 0 && (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {certificate.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - PDF Viewer */}
            <div className="space-y-4">
              <div className="bg-muted/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Visualização del Documento</h3>
                <div className="flex gap-2 mb-4">
                  <Button onClick={handleViewPdf} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Carregar PDF
                  </Button>
                  <Button onClick={handleDownloadPdf} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                </div>
                
                {pdfUrl && (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-96"
                      title="Visualização del Certificado"
                    />
                  </div>
                )}
              </div>

              {showApprovalActions && (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Ações de Aprobación</h3>
                  {certificate.has_rejection_history ? (
                    <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                      Este certificado já foi rechazado anteriormente y foi reenviado para revisão. Nesta etapa ele pode ser revisado y aprovado, mas no deve ser rechazado novamente.
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      onClick={(y) => {
                        y.stopPropagation();
                        onApprove(type === 'certificate' ? 'certificates' : 'professional_certificates', certificate.id);
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 flex-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </Button>
                    {canReject ? (
                      <Button
                        onClick={(y) => {
                          y.stopPropagation();
                          setShowRejectDialog(true);
                        }}
                        disabled={loading}
                        variant="destructive"
                        className="flex items-center gap-2 flex-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Certificado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">
                Motivo de la rechazo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique o motivo del rechazo para que el usuario pueda corregir..."
                value={rejectionReason}
                onChange={(y) => setRejectionReason(y.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
