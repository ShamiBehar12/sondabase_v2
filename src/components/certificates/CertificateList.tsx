import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Trash2, Calendar, Building, Hash, CheckCircle, Eye, Pencil, FileSearch } from 'lucide-react';
import { useCertificates, type Certificate } from '@/hooks/useCertificates';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CertificateEditDialog } from './CertificateEditDialog';
import { CertificatePreviewDialog } from './CertificatePreviewDialog';
import { CertificateDetailDialog } from './CertificateDetailDialog';
import { CertificateRagCompareDialog, type CertificateRagDocument } from './CertificateRagCompareDialog';
import { useTranslation } from 'react-i18next';

interface CertificateListProps {
  searchTerm?: string;
  selectedTags?: string[];
  viewMode?: 'grid' | 'list';
  openCertificateId?: string | null;
  onCertificateOpened?: () => void;
}

export const CertificateList = ({ 
  searchTerm = '', 
  selectedTags = [], 
  viewMode = 'grid',
  openCertificateId = null,
  onCertificateOpened
}: CertificateListProps) => {
  const { t, i18n } = useTranslation();
  const { certificates, loading, deleteCertificate, getDownloadUrl } = useCertificates();
  const { userRole, user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [ragCompareOpen, setRagCompareOpen] = useState(false);
  const [ragCompareCertificate, setRagCompareCertificate] = useState<Certificate | null>(null);
  const [ragCompareDocument, setRagCompareDocument] = useState<CertificateRagDocument | null>(null);
  const [ragComparePdfUrl, setRagComparePdfUrl] = useState<string | null>(null);
  const [ragCompareLoading, setRagCompareLoading] = useState(false);

  // Abrir automaticamente o certificado se for passado um ID
  useEffect(() => {
    if (openCertificateId && certificates.length > 0) {
      const certificate = certificates.find(cert => cert.id === openCertificateId);
      if (certificate) {
        setEditingCertificate(certificate);
        setEditDialogOpen(true);
        onCertificateOpened?.();
      }
    }
  }, [openCertificateId, certificates, onCertificateOpened]);

  const isAdmin = userRole === 'admin';

  // Function to get description in current language
  const getLocalizedDescription = (certificate: Certificate) => {
    const currentLang = i18n.language;
    if (currentLang === 'pt' && certificate.description_pt) return certificate.description_pt;
    if (currentLang === 'en' && certificate.description_en) return certificate.description_en;
    if (currentLang === 'es' && certificate.description_es) return certificate.description_es;
    
    // Fallback to any available description
    return certificate.description_pt || certificate.description_en || certificate.description_es || certificate.description || '';
  };

  const filteredCertificates = certificates.filter(cert => {
    const localizedDescription = getLocalizedDescription(cert);
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         localizedDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.issuing_organization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => cert.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const handleDownload = async (certificate: Certificate) => {
    try {
      setDownloadingId(certificate.id);
      const url = await getDownloadUrl(certificate.file_path, certificate.file_name);
      if (url) {
        // Fetch the file as blob to force download
        const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}download=1`);
        const blob = await response.blob();
        
        // Create blob URL and download link
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = certificate.file_name;
        link.style.display = 'none';
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (certificate: Certificate) => {
    try {
      setPreviewingId(certificate.id);
      const url = await getDownloadUrl(certificate.file_path, certificate.file_name);
      if (url) {
        setPreviewUrl(url);
        setPreviewCertificate(certificate);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setPreviewingId(null);
    }
  };

  const handleEdit = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setEditDialogOpen(true);
  };

  const handleView = (certificate: Certificate) => {
    setViewingCertificate(certificate);
    setViewDialogOpen(true);
  };

  const handleCompareRag = async (certificate: Certificate) => {
    try {
      setRagCompareOpen(true);
      setRagCompareCertificate(certificate);
      setRagCompareLoading(true);
      setRagCompareDocument(null);
      setRagComparePdfUrl(null);

      const [pdfUrl, ragResponse] = await Promise.all([
        getDownloadUrl(certificate.file_path, certificate.file_name),
        apiFetch<CertificateRagDocument>(`/api/ai/index/certificate/${certificate.id}`),
      ]);

      setRagComparePdfUrl(pdfUrl);

      if (ragResponse.error) {
        throw new Error(ragResponse.error.message || 'Não foi possível carregar o documento RAG.');
      }

      setRagCompareDocument(ragResponse.data || null);
    } catch (error) {
      console.error('Error comparing RAG document:', error);
      setRagCompareDocument(null);
    } finally {
      setRagCompareLoading(false);
    }
  };

  const canEditCertificate = (certificate: Certificate) => {
    return userRole === 'admin' || certificate.user_id === user?.id;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredCertificates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('certificates.noCertificatesFound')}</h3>
          <p className="text-muted-foreground text-center">
            {searchTerm || selectedTags.length > 0
              ? t('certificates.noCertificatesMessage')
              : t('certificates.noCertificatesInitial')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Grid View Component
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCertificates.map((certificate) => (
        <Card 
          key={certificate.id} 
          className="premium-card hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight mb-1 flex items-center gap-2">
                  {certificate.title}
                  {certificate.is_verified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </CardTitle>
                {certificate.issuing_organization && (
                  <CardDescription className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {certificate.issuing_organization}
                  </CardDescription>
                )}
              </div>
              
              {/* Action Icons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(certificate)}
                  className="h-7 w-7 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(certificate)}
                  disabled={downloadingId === certificate.id}
                  className="h-7 w-7 p-0"
                >
                  <Download className="h-3 w-3" />
                </Button>

                {canEditCertificate(certificate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(certificate)}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCompareRag(certificate)}
                    className="h-7 w-7 p-0"
                    title="Comparar PDF x RAG"
                  >
                    <FileSearch className="h-3 w-3" />
                  </Button>
                )}

                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">{t('common.delete')} {t('certificates.title')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground-muted">
                          Tem certeza de que deseja excluir o certificado "{certificate.title}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCertificate(certificate.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {getLocalizedDescription(certificate) && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getLocalizedDescription(certificate)}
              </p>
            )}

            <div className="space-y-2 text-xs text-muted-foreground">
              {certificate.issued_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('certificates.emittedOn')}: {format(new Date(certificate.issued_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              )}

              {certificate.contract_start_date && certificate.contract_end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('certificates.contract')}: {format(new Date(certificate.contract_start_date), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(certificate.contract_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              )}

              {certificate.contract_start_date && !certificate.contract_end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('certificates.contractStart')}: {format(new Date(certificate.contract_start_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              )}

              {!certificate.contract_start_date && certificate.contract_end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('certificates.contractEnd')}: {format(new Date(certificate.contract_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              )}
              
              {certificate.certificate_number && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Nº: {certificate.certificate_number}
                </div>
              )}

              {certificate.country && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {t('common.country')}: {certificate.country}
                </div>
              )}
              
              <div className="text-xs">
                {t('certificates.size')}: {formatFileSize(certificate.file_size)}
              </div>
            </div>

            {certificate.tags && certificate.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {certificate.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {certificate.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{certificate.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}


          </CardContent>
        </Card>
      ))}
    </div>
  );

  // List View Component - Table Format
  const ListView = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="min-w-[200px]">{t('certificates.tableTitle')}</TableHead>
            <TableHead className="min-w-[150px]">{t('certificates.tableOrganization')}</TableHead>
            <TableHead className="w-[120px]">{t('certificates.tableIssueDate')}</TableHead>
            <TableHead className="w-[180px]">{t('certificates.tableContractPeriod')}</TableHead>
            <TableHead className="w-[100px]">{t('certificates.tableCountry')}</TableHead>
            <TableHead className="w-[100px]">{t('certificates.tableTags')}</TableHead>
            <TableHead className="w-[80px]">{t('certificates.tableSize')}</TableHead>
            <TableHead className="w-[120px] text-center">{t('certificates.tableActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCertificates.map((certificate) => (
            <TableRow 
              key={certificate.id}
              className="hover:bg-muted/50 transition-colors"
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {certificate.is_verified && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-sm leading-tight">
                    {certificate.title}
                  </div>
                  {getLocalizedDescription(certificate) && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {getLocalizedDescription(certificate)}
                    </div>
                  )}
                  {certificate.certificate_number && (
                    <div className="text-xs text-muted-foreground">
                      Nº: {certificate.certificate_number}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  {certificate.issuing_organization || '-'}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-xs">
                  {certificate.issued_date 
                    ? format(new Date(certificate.issued_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'
                  }
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-xs">
                  {certificate.contract_start_date && certificate.contract_end_date ? (
                    `${format(new Date(certificate.contract_start_date), 'dd/MM/yy', { locale: ptBR })} - ${format(new Date(certificate.contract_end_date), 'dd/MM/yy', { locale: ptBR })}`
                  ) : certificate.contract_start_date ? (
                    `Início: ${format(new Date(certificate.contract_start_date), 'dd/MM/yy', { locale: ptBR })}`
                  ) : certificate.contract_end_date ? (
                    `Fim: ${format(new Date(certificate.contract_end_date), 'dd/MM/yy', { locale: ptBR })}`
                  ) : '-'}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-xs">
                  {certificate.country || t('dashboard.noOrganization')}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {certificate.tags && certificate.tags.length > 0 ? (
                    <>
                      {certificate.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {certificate.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{certificate.tags.length - 2}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(certificate.file_size)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(certificate)}
                    className="h-8 w-8 p-0"
                    title={t('common.view')}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(certificate)}
                    disabled={downloadingId === certificate.id}
                    className="h-8 w-8 p-0"
                    title={t('common.download')}
                  >
                    <Download className="h-3 w-3" />
                  </Button>

                  {canEditCertificate(certificate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(certificate)}
                      className="h-8 w-8 p-0"
                      title={t('common.edit')}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCompareRag(certificate)}
                      className="h-8 w-8 p-0"
                      title="Comparar PDF x RAG"
                    >
                      <FileSearch className="h-3 w-3" />
                    </Button>
                  )}

                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-surface border-border" onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription className="text-foreground-muted">
                            Tem certeza de que deseja excluir o certificado "{certificate.title}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCertificate(certificate.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {filteredCertificates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum certificado encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedTags.length > 0
              ? 'Nenhum certificado corresponde aos filtros aplicados.'
              : 'Você ainda não possui certificados. Comece fazendo o upload do seu primeiro certificado!'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {viewMode === 'grid' ? <GridView /> : <ListView />}
      
      {/* Edit Dialog */}
      <CertificateEditDialog
        certificate={editingCertificate}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingCertificate(null);
          }
        }}
      />

      {/* Preview Dialog */}
      <CertificatePreviewDialog
        isOpen={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setPreviewUrl(null);
          setPreviewCertificate(null);
        }}
        pdfUrl={previewUrl}
        certificateName={previewCertificate?.title}
        onDownload={previewCertificate ? () => handleDownload(previewCertificate) : undefined}
      />

      {/* Detail Dialog */}
      <CertificateDetailDialog
        certificate={viewingCertificate}
        type="certificate"
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onApprove={async () => {}}
        onReject={async () => {}}
        loading={false}
        showApprovalActions={false}
      />

      <CertificateRagCompareDialog
        open={ragCompareOpen}
        onOpenChange={(open) => {
          setRagCompareOpen(open);
          if (!open) {
            setRagCompareCertificate(null);
            setRagCompareDocument(null);
            setRagComparePdfUrl(null);
          }
        }}
        certificateName={ragCompareCertificate?.title}
        pdfUrl={ragComparePdfUrl}
        ragDocument={ragCompareDocument}
        loading={ragCompareLoading}
        onDownloadPdf={ragCompareCertificate ? () => handleDownload(ragCompareCertificate) : undefined}
      />
    </>
  );
};
