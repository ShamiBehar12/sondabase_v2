import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, User, Eye, Calendar, Building } from 'lucide-react';
import { CertificateDetailDialog } from '@/components/certificates/CertificateDetailDialog';

interface CertificateWithUser {
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
  // Profile information
  full_name?: string;
  has_rejection_history?: boolean;
  latest_rejection_reason?: string;
}

interface ProfessionalCertificateWithUser {
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
  // Profile information
  full_name?: string;
  has_rejection_history?: boolean;
  latest_rejection_reason?: string;
}

interface RejectionHistoryEntry {
  id: string;
  user_id?: string;
  original_title?: string;
  rejection_reason: string;
  created_at: string;
  snapshot?: {
    title?: string;
  };
}

const normalizeTitle = (value?: string) => (value || '').trim().toLocaleLowerCase();

const buildRejectionHistoryMap = (rejections: RejectionHistoryEntry[]) => {
  const map = new Map<string, RejectionHistoryEntry>();

  for (const rejection of rejections) {
    const title = rejection.original_title || rejection.snapshot?.title;
    const key = `${rejection.user_id || ''}::${normalizeTitle(title)}`;
    const existing = map.get(key);

    if (!existing || new Date(rejection.created_at).getTime() > new Date(existing.created_at).getTime()) {
      map.set(key, rejection);
    }
  }

  return map;
};

export default function CertificateApproval() {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState<Record<string, boolean>>({});
  const [loadingReject, setLoadingReject] = useState<Record<string, boolean>>({});
  const [certificates, setCertificates] = useState<CertificateWithUser[]>([]);
  const [professionalCertificates, setProfessionalCertificates] = useState<ProfessionalCertificateWithUser[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithUser | ProfessionalCertificateWithUser | null>(null);
  const [selectedType, setSelectedType] = useState<'certificate' | 'professional_certificate'>('certificate');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [certificateToReject, setCertificateToReject] = useState<{id: string, type: 'certificates' | 'professional_certificates'} | null>(null);

  // Fetch certificates with user information
  const fetchCertificatesWithUsers = async () => {
    try {
      console.log('Fetching certificates...');
      const { data, error } = await apiClient
        .from('certificates')
        .select(`
          id,
          user_id,
          title,
          description,
          description_en,
          description_es,
          description_pt,
          file_name,
          file_path,
          file_size,
          mime_type,
          issued_date,
          contract_start_date,
          contract_end_date,
          issuing_organization,
          certificate_number,
          country,
          tags,
          is_verified,
          created_at,
          updated_at
        `)
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Certificates found:', data?.length, data);

      const { data: rejections } = await apiClient
        .from('certificate_rejections')
        .select('id, user_id, original_title, rejection_reason, created_at, snapshot')
        .eq('certificate_type', 'certificate');

      // Fetch user profiles separately
      const userIds = data?.map(cert => cert.user_id) || [];
      console.log('User IDs:', userIds);
      
      const { data: profiles, error: profilesError } = await apiClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      console.log('Profiles found:', profiles);

      const rejectionHistoryMap = buildRejectionHistoryMap((rejections || []) as RejectionHistoryEntry[]);

      // Combine data
      const certificatesWithUsers = data?.map(cert => ({
        ...cert,
        full_name: profiles?.find(p => p.user_id === cert.user_id)?.full_name,
        has_rejection_history: rejectionHistoryMap.has(`${cert.user_id}::${normalizeTitle(cert.title)}`),
        latest_rejection_reason: rejectionHistoryMap.get(`${cert.user_id}::${normalizeTitle(cert.title)}`)?.rejection_reason,
      })) || [];

      console.log('Final certificates with users:', certificatesWithUsers);
      setCertificates(certificatesWithUsers);
    } catch (error) {
      console.error('Error in fetchCertificatesWithUsers:', error);
      toast({
        variant: "destructive",
        title: t('approval.approveError'),
        description: t('approval.approveError'),
      });
    }
  };

  // Fetch professional certificates with user information
  const fetchProfessionalCertificatesWithUsers = async () => {
    try {
      const { data, error } = await apiClient
        .from('professional_certificates')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: rejections } = await apiClient
        .from('certificate_rejections')
        .select('id, user_id, original_title, rejection_reason, created_at, snapshot')
        .eq('certificate_type', 'professional_certificate');

      // Fetch user profiles separately
      const userIds = data?.map(cert => cert.user_id) || [];
      const { data: profiles } = await apiClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const rejectionHistoryMap = buildRejectionHistoryMap((rejections || []) as RejectionHistoryEntry[]);

      // Combine data
      const certificatesWithUsers = data?.map(cert => ({
        ...cert,
        full_name: profiles?.find(p => p.user_id === cert.user_id)?.full_name,
        has_rejection_history: rejectionHistoryMap.has(`${cert.user_id}::${normalizeTitle(cert.title)}`),
        latest_rejection_reason: rejectionHistoryMap.get(`${cert.user_id}::${normalizeTitle(cert.title)}`)?.rejection_reason,
      })) || [];

      setProfessionalCertificates(certificatesWithUsers);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('approval.approveError'),
        description: t('approval.approveError'),
      });
    }
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'reviewer') {
      console.log('Fetching certificates for approval...');
      fetchCertificatesWithUsers();
      fetchProfessionalCertificatesWithUsers();
    }
  }, [userRole]);

  // Filter unverified certificates
  const unverifiedCertificates = certificates;
  const unverifiedProfessionalCertificates = professionalCertificates;

  const handleApprove = async (type: 'certificates' | 'professional_certificates', id: string) => {
    console.log('=== INICIO APROVAÇÃO ===');
    console.log('Params:', { type, id });
    console.log('User:', { userId: user?.id, userRole });
    
    if (userRole !== 'admin' && userRole !== 'reviewer') {
      console.log('❌ Usuário sem permissão:', { userRole });
      toast({
        variant: "destructive",
        title: "Sem permissão",
        description: "Você não tem permissão para aprovar certificados.",
      });
      return;
    }

    try {
      console.log('✅ Iniciando aprovação:', { type, id, userRole, userId: user?.id });
      setLoadingApprove(prev => ({ ...prev, [id]: true }));
      
      // Verificar se o certificado existe e obter dados antes de aprovar
      const { data: existingCert, error: checkError } = await apiClient
        .from(type)
        .select('id, is_verified, user_id, title')
        .eq('id', id)
        .single();
      
      if (checkError) {
        console.error('❌ Erro ao verificar certificado:', checkError);
        throw checkError;
      }
      
      console.log('📋 Certificado encontrado:', existingCert);

      // Primeiro, registrar a aprovação na tabela de aprovações
      const { data: approvalData, error: approvalError } = await apiClient
        .from('certificate_approvals')
        .insert({
          certificate_id: id,
          certificate_type: type === 'certificates' ? 'certificate' : 'professional_certificate',
          admin_id: user?.id,
          user_id: existingCert.user_id,
          original_title: existingCert.title
        })
        .select();

      if (approvalError) {
        console.error('Erro ao registrar aprovação:', approvalError);
        throw approvalError;
      }

      console.log('Aprovação registrada:', approvalData);
      
      // Depois, atualizar o certificado como verificado
      const { data, error } = await apiClient
        .from(type)
        .update({ is_verified: true })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro ao aprovar - detalhes:', error);
        throw error;
      }

      console.log('Certificado aprovado com sucesso - dados:', data);

      toast({
        title: "Certificado aprovado",
        description: "O certificado foi aprovado com sucesso.",
      });

      // Close the detail dialog
      setDetailDialogOpen(false);
      setSelectedCertificate(null);

      // Refresh the appropriate list
      console.log('Recarregando lista...');
      if (type === 'certificates') {
        await fetchCertificatesWithUsers();
      } else {
        await fetchProfessionalCertificatesWithUsers();
      }
      console.log('Lista recarregada');
    } catch (error: any) {
      console.error('Erro completo ao aprovar:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast({
        variant: "destructive",
        title: "Erro ao aprovar certificado",
        description: error?.message || "Não foi possível aprovar o certificado.",
      });
    } finally {
      setLoadingApprove(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (type: 'certificates' | 'professional_certificates', id: string, reason: string) => {
    if (userRole !== 'admin' && userRole !== 'reviewer') return;

    try {
      console.log('=== INÍCIO DA REJEIÇÃO ===');
      console.log('Parâmetros recebidos:', { type, id, reason, userRole, userId: user?.id });
      setLoadingReject(prev => ({ ...prev, [id]: true }));
      
      // First get the certificate to get the user_id and title
      console.log('Buscando certificado para obter user_id e título...');
      const tableName = type === 'certificates' ? 'certificates' : 'professional_certificates';
      const { data: certData, error: certError } = await apiClient
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (certError) {
        console.error('Erro ao buscar certificado:', certError);
        throw certError;
      }

      // Save the rejection reason with user_id and original title
      console.log('Tentando inserir motivo da rejeição...');
      const { data: rejectionData, error: rejectionError } = await apiClient
        .from('certificate_rejections')
        .insert({
          certificate_id: id,
          certificate_type: type === 'certificates' ? 'certificate' : 'professional_certificate',
          admin_id: user?.id,
          user_id: certData.user_id,
          original_title: certData.title,
          rejection_reason: reason,
          snapshot: certData
        })
        .select();

      console.log('Resultado da inserção de rejeição:', { rejectionData, rejectionError });

      if (rejectionError) {
        console.error('Erro ao salvar motivo da rejeição:', rejectionError);
        throw rejectionError;
      }

      // Then delete the certificate
      console.log('Tentando deletar certificado da tabela:', type);
      console.log('User atual:', user);
      console.log('UserRole atual:', userRole);
      
      // Primeira tentativa: usar admin bypass
      const { data: deleteData, error: deleteError } = await apiClient
        .from(type)
        .delete()
        .eq('id', id)
        .select();

      console.log('Resultado da deleção:', { deleteData, deleteError });

      if (deleteError) {
        console.error('Erro ao deletar certificado:', deleteError);
        throw deleteError;
      }

      console.log('Certificado rejeitado com sucesso');

      toast({
        title: "Certificado rejeitado",
        description: "O certificado foi rejeitado e o usuário foi notificado do motivo.",
      });

      // Close the detail dialog
      setDetailDialogOpen(false);
      setSelectedCertificate(null);

      // Close the detail dialog
      setDetailDialogOpen(false);
      setSelectedCertificate(null);

      // Force a complete refresh of the list
      console.log('Iniciando refresh da lista...');
      if (type === 'certificates') {
        console.log('Estado atual de certificates antes do refresh:', certificates.length, 'certificados');
        setCertificates([]);
        await fetchCertificatesWithUsers();
        console.log('fetchCertificatesWithUsers executado');
      } else {
        console.log('Estado atual de professionalCertificates antes do refresh:', professionalCertificates.length, 'certificados');
        setProfessionalCertificates([]);
        await fetchProfessionalCertificatesWithUsers();
        console.log('fetchProfessionalCertificatesWithUsers executado');
      }
      console.log('=== FIM DA REJEIÇÃO - SUCESSO ===');
      
    } catch (error: any) {
      console.error('=== ERRO NA REJEIÇÃO ===');
      console.error('Erro completo ao rejeitar:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast({
        variant: "destructive",
        title: "Erro ao rejeitar certificado",
        description: error?.message || "Não foi possível rejeitar o certificado.",
      });
    } finally {
      setLoadingReject(prev => ({ ...prev, [id]: false }));
    }
  };

  if (userRole !== 'admin' && userRole !== 'reviewer') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('approval.accessDenied')}</h1>
        <p>{t('approval.accessDeniedMessage')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('approval.certificateApproval')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('approval.certificateApprovalDescription')}
        </p>
      </div>

      <Tabs defaultValue="certificates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificates">
            Certificados de Experiência ({unverifiedCertificates.length})
          </TabsTrigger>
          <TabsTrigger value="professional">
            Certificados Profissionais ({unverifiedProfessionalCertificates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          {unverifiedCertificates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Nenhum certificado aguardando aprovação.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unverifiedCertificates.map((certificate) => {
                    console.log('Rendering certificate:', certificate.id, 'User name:', certificate.full_name);
                    return (
                      <TableRow key={certificate.id}>
                        <TableCell className="font-medium">{certificate.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 w-4 text-muted-foreground" />
                            <span>{certificate.full_name || 'Nome não disponível'}</span>
                          </div>
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span>{certificate.issuing_organization || 'Não informado'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{certificate.country || 'Não informado'}</TableCell>
                      <TableCell>
                        {new Date(certificate.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {certificate.has_rejection_history ? 'Reenviado para revisão' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCertificate(certificate);
                              setSelectedType('certificate');
                              setDetailDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalhes
                          </Button>
                          <Button
                            onClick={() => handleApprove('certificates', certificate.id)}
                            disabled={loadingApprove[certificate.id]}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprovar
                          </Button>
                          {!certificate.has_rejection_history ? (
                            <Button
                              onClick={() => {
                                setCertificateToReject({id: certificate.id, type: 'certificates'});
                                setRejectDialogOpen(true);
                              }}
                              disabled={loadingReject[certificate.id]}
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Rejeitar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          {unverifiedProfessionalCertificates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Nenhum certificado profissional aguardando aprovação.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Instituição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conselho</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unverifiedProfessionalCertificates.map((certificate) => {
                    console.log('Rendering prof certificate:', certificate.id, 'User name:', certificate.full_name);
                    return (
                      <TableRow key={certificate.id}>
                        <TableCell className="font-medium">{certificate.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 w-4 text-muted-foreground" />
                            <span>{certificate.full_name || 'Nome não disponível'}</span>
                          </div>
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span>{certificate.institution || 'Não informado'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{certificate.certification_type || 'Não informado'}</TableCell>
                      <TableCell>{certificate.professional_council || 'Não informado'}</TableCell>
                      <TableCell>
                        {new Date(certificate.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {certificate.has_rejection_history ? 'Reenviado para revisão' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCertificate(certificate);
                              setSelectedType('professional_certificate');
                              setDetailDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalhes
                          </Button>
                          <Button
                            onClick={() => handleApprove('professional_certificates', certificate.id)}
                            disabled={loadingApprove[certificate.id]}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprovar
                          </Button>
                          {!certificate.has_rejection_history ? (
                            <Button
                              onClick={() => {
                                setCertificateToReject({id: certificate.id, type: 'professional_certificates'});
                                setRejectDialogOpen(true);
                              }}
                              disabled={loadingReject[certificate.id]}
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Rejeitar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Certificado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">
                Motivo da rejeição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique o motivo da rejeição para que o usuário possa corrigir..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setCertificateToReject(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (!certificateToReject || !rejectionReason.trim()) {
                    toast({
                      variant: "destructive",
                      title: "Erro",
                      description: "Por favor, forneça um motivo para a rejeição.",
                    });
                    return;
                  }
                  
                  await handleReject(certificateToReject.type, certificateToReject.id, rejectionReason);
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setCertificateToReject(null);
                }}
                disabled={loading || !rejectionReason.trim()}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CertificateDetailDialog
        certificate={selectedCertificate}
        type={selectedType}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
        canReject={!selectedCertificate || !(selectedCertificate as CertificateWithUser | ProfessionalCertificateWithUser).has_rejection_history}
      />
    </div>
  );
}
