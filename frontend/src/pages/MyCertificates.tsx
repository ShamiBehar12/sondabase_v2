import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Pencil, ExternalLink, Clock, CheckCircle2, XCircle, FileText, MessageCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useContentApproval } from '@/hooks/useContentApproval';
import { useTranslation } from 'react-i18next';
import { RejectionCommentDialog } from '@/components/certificates/RejectionCommentDialog';
import { CertificateEditDialog } from '@/components/certificates/CertificateEditDialog';
import { useCertificates } from '@/hooks/useCertificates';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

interface Certificate {
  id: string;
  title: string;
  description: string;
  issuing_organization?: string;
  issued_date?: string;
  created_at: string;
  is_verified: boolean | null;
  type: 'certificate' | 'professional_certificate';
  approver_name?: string;
}

export default function MyCertificates() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: contentItems } = useContentApproval();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRejection, setSelectedRejection] = useState<{
    certificateId: string;
    certificateType: 'certificate' | 'professional_certificate';
  } | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { getRejectedCertificateData } = useCertificates();

  // Calculate content counts
  const contentCounts = contentItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return ptBR;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCertificates();
    }
  }, [user?.id]);

  const fetchCertificates = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch regular certificates
      const { data: regularCerts, error: regularError } = await apiClient
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (regularError) {
        console.error('Error fetching certificates:', regularError);
        toast.error('Error loading certificates');
        return;
      }
      
      // Fetch professional certificates
      const { data: professionalCerts, error: professionalError } = await apiClient
        .from('professional_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (professionalError) {
        console.error('Error fetching professional certificates:', professionalError);
        toast.error('Error loading professional certificates');
        return;
      }

      // Fetch rejected certificates from certificate_rejections table
      console.log('Fetching rejected certificates for user:', user.id);
      const { data: rejectedCerts, error: rejectionsError } = await apiClient
        .from('certificate_rejections')
        .select(`
          certificate_id,
          certificate_type,
          rejection_reason,
          created_at,
          admin_id,
          user_id,
          original_title
        `)
        .eq('user_id', user.id) // Filter at database level instead of JS level
        .order('created_at', { ascending: false });

      console.log('Rejected certificates from DB for user:', rejectedCerts);
      console.log('Rejected certificates error:', rejectionsError);

      if (rejectionsError) {
        console.error('Error fetching rejected certificates:', rejectionsError);
        toast.error('Error ao carregar certificados rejeitados: ' + rejectionsError.message);
      }

      // Fetch approved certificates from certificate_approvals table
      console.log('Fetching approved certificates for user:', user.id);
      const { data: approvedCerts, error: approvalsError } = await apiClient
        .from('certificate_approvals')
        .select(`
          certificate_id,
          certificate_type,
          admin_id,
          user_id,
          original_title,
          created_at
        `)
        .eq('user_id', user.id) // Filter at database level
        .order('created_at', { ascending: false });

      console.log('Approved certificates from DB for user:', approvedCerts);
      console.log('Approved certificates error:', approvalsError);

      if (approvalsError) {
        console.error('Error fetching approved certificates:', approvalsError);
        toast.error('Error ao carregar certificados aprovados: ' + approvalsError.message);
      }

      // Filter rejections for current user only (already filtered at DB level, but separate by type)
      console.log('Rejected certs from DB for user:', rejectedCerts);
      
      const userRejectedCerts = (rejectedCerts || []).filter(rejection => 
        rejection.certificate_type === 'certificate'
      );
      const userRejectedProfCerts = (rejectedCerts || []).filter(rejection => 
        rejection.certificate_type === 'professional_certificate'
      );

      // Filter approvals for current user only (already filtered at DB level, but separate by type)
      const userApprovedCerts = (approvedCerts || []).filter(approval => 
        approval.certificate_type === 'certificate'
      );
      const userApprovedProfCerts = (approvedCerts || []).filter(approval => 
        approval.certificate_type === 'professional_certificate'
      );

      console.log('Filtered rejected certificates:', userRejectedCerts);
      console.log('Filtered rejected professional certificates:', userRejectedProfCerts);
      console.log('Filtered approved certificates:', userApprovedCerts);
      console.log('Filtered approved professional certificates:', userApprovedProfCerts);

      // Get all unique admin IDs from rejections AND approvals
      const rejectionAdminIds = [
        ...(userRejectedCerts || []).map(r => r.admin_id),
        ...(userRejectedProfCerts || []).map(r => r.admin_id)
      ];
      
      const approvalAdminIds = [
        ...(userApprovedCerts || []).map(a => a.admin_id),
        ...(userApprovedProfCerts || []).map(a => a.admin_id)
      ];
      
      let allAdminIds = [...rejectionAdminIds, ...approvalAdminIds];
      
      // Get admin profiles
      const uniqueAdminIds = [...new Set(allAdminIds)].filter(id => id);
      let adminProfiles = [];
      if (uniqueAdminIds.length > 0) {
        const { data: profiles, error: profilesError } = await apiClient
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uniqueAdminIds);
        
        if (!profilesError) {
          adminProfiles = profiles || [];
        }
      }
      
      // Transform and combine certificates
      const allCertificates: Certificate[] = [
        // Active certificates (approved or pending)
        ...(regularCerts || []).map(cert => {
          // Check if this certificate has an approval record
          const approvalRecord = userApprovedCerts.find(a => a.certificate_id === cert.id);
          let approverName: string | undefined = undefined;
          
          if (cert.is_verified === true) {
            if (approvalRecord) {
              // Find admin profile for this approval
              const adminProfile = adminProfiles.find(p => p.user_id === approvalRecord.admin_id);
              approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
            } else {
              // Legacy approved certificate without approval record
              approverName = 'Sistema de Aprobación';
            }
          }
          // For pending certificates, leave approver_name undefined
          
          return {
            id: cert.id,
            title: cert.title,
            description: cert.description || '',
            issuing_organization: cert.issuing_organization,
            issued_date: cert.issued_date,
            created_at: cert.created_at,
            is_verified: cert.is_verified,
            type: 'certificate' as const,
            approver_name: approverName
          };
        }),
        ...(professionalCerts || []).map(cert => {
          // Check if this certificate has an approval record
          const approvalRecord = userApprovedProfCerts.find(a => a.certificate_id === cert.id);
          let approverName: string | undefined = undefined;
          
          if (cert.is_verified === true) {
            if (approvalRecord) {
              // Find admin profile for this approval
              const adminProfile = adminProfiles.find(p => p.user_id === approvalRecord.admin_id);
              approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
            } else {
              // Legacy approved certificate without approval record
              approverName = 'Sistema de Aprobación';
            }
          }
          // For pending certificates, leave approver_name undefined
          
          return {
            id: cert.id,
            title: cert.title,
            description: cert.description || '',
            issuing_organization: cert.institution,
            issued_date: cert.issued_date,
            created_at: cert.created_at,
            is_verified: cert.is_verified,
            type: 'professional_certificate' as const,
            approver_name: approverName
          };
        }),
      // Rejected certificates (is_verified = null to indicate rejected)
        ...(userRejectedCerts || []).map(rejection => {
          console.log('Processing rejected cert:', rejection);
          const adminProfile = adminProfiles.find(p => p.user_id === rejection.admin_id);
          const approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
          
          const rejectedCert = {
            id: rejection.certificate_id,
            title: rejection.original_title || t('myCertificates.rejectedCertificate'),
            description: rejection.rejection_reason || '',
            issuing_organization: undefined,
            issued_date: undefined,
            created_at: rejection.created_at,
            is_verified: null, // null indicates rejected
            type: 'certificate' as const,
            approver_name: approverName
          };
          
          console.log('Created rejected cert object:', rejectedCert);
          return rejectedCert;
        }),
        ...(userRejectedProfCerts || []).map(rejection => {
          const adminProfile = adminProfiles.find(p => p.user_id === rejection.admin_id);
          const approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
          
          return {
            id: rejection.certificate_id,
            title: rejection.original_title || t('myCertificates.rejectedProfessionalCertificate'),
            description: rejection.rejection_reason || '',
            issuing_organization: undefined,
            issued_date: undefined,
            created_at: rejection.created_at,
            is_verified: null, // null indicates rejected
            type: 'professional_certificate' as const,
            approver_name: approverName
          };
        })
      ];
      
      console.log('Final certificates array:', allCertificates);
      console.log('Total certificates:', allCertificates.length);
      console.log('Rejected certificates count:', allCertificates.filter(c => c.is_verified === null).length);
      setCertificates(allCertificates);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (cert: Certificate) => {
    try {
      if (cert.type === 'certificate') {
        // Check if this is a rejected certificate (is_verified === null)
        if (cert.is_verified === null) {
          // For rejected certificates, get the original data from rejection table
          const rejectedCertData = await getRejectedCertificateData(cert.id, 'certificate');
          if (rejectedCertData) {
            setEditingCertificate(rejectedCertData);
            setEditDialogOpen(true);
          }
          return;
        }
        
        // Fetch the full certificate data for non-rejected certificates
        const { data: fullCert, error } = await apiClient
          .from('certificates')
          .select('*')
          .eq('id', cert.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle not found
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        if (!fullCert) {
          toast.error('Certificado no encontrado o fue eliminado.');
          return;
        }
        
        setEditingCertificate(fullCert);
        setEditDialogOpen(true);
      } else if (cert.type === 'professional_certificate') {
        if (cert.is_verified === null) {
          toast.error('Certificados profissionais rejeitados no pueden ser editados. Crea un nuevo certificado.');
          return;
        }
        
        const { data: fullCert, error } = await apiClient
          .from('professional_certificates')
          .select('*')
          .eq('id', cert.id)
          .maybeSingle();
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        if (!fullCert) {
          toast.error('Certificado profissional no encontrado o fue eliminado.');
          return;
        }
        
        toast.error('Edición de certificados profissionais aún no implementada');
      }
    } catch (error) {
      console.error('Error fetching certificate for editing:', error);
      toast.error('Error ao carregar certificado para edição');
    }
  };

  // Filter certificates based on search
  const filteredCertificates = certificates.filter(cert =>
    cert.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Separate certificates by verification status
  const verifiedCertificates = filteredCertificates.filter(cert => cert.is_verified === true);
  const pendingCertificates = filteredCertificates.filter(cert => cert.is_verified === false);
  const rejectedCertificates = filteredCertificates.filter(cert => cert.is_verified === null);

  const getStatusColor = (isVerified: boolean | null) => {
    if (isVerified === true) return 'default';
    if (isVerified === false) return 'secondary';
    return 'destructive';
  };
  
  const getStatusText = (isVerified: boolean | null) => {
    if (isVerified === true) return t('myCertificates.statusApproved');
    if (isVerified === false) return t('myCertificates.statusPending');
    return t('myCertificates.statusRejected');
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', {
      locale: getDateLocale()
    });
  };

  // Function to normalize approver name value  
  const normalizeApproverName = (approverName: any): string => {
    if (approverName === null || approverName === undefined) {
      return '-';
    }
    
    // Handle object with _type: 'undefined'
    if (typeof approverName === 'object' && approverName._type === 'undefined') {
      return '-';
    }
    
    // Handle object with value property
    if (typeof approverName === 'object' && approverName.value !== undefined) {
      if (approverName.value === 'undefined' || approverName.value === null) {
        return '-';
      }
      return String(approverName.value);
    }
    
    // Handle regular string
    if (typeof approverName === 'string' && approverName.trim() !== '') {
      return approverName;
    }
    
    // Handle any other object
    if (typeof approverName === 'object') {
      return '-';
    }
    
    return '-';
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">{t('myCertificates.title')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('myCertificates.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('myCertificates.approved')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCertificates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('myCertificates.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCertificates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('myCertificates.rejected')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCertificates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('myCertificates.total')}</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('myCertificates.searchPlaceholder')}
          value={searchTerm}
          onChange={(y) => setSearchTerm(y.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t('myCertificates.all')}</TabsTrigger>
          <TabsTrigger value="approved">{t('myCertificates.approved')}</TabsTrigger>
          <TabsTrigger value="pending">{t('myCertificates.pending')}</TabsTrigger>
          <TabsTrigger value="rejected">{t('myCertificates.rejected')}</TabsTrigger>
          
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('common.organization')}</TableHead>
                  <TableHead>{t('myCertificates.created')}</TableHead>
                  <TableHead>{t('myCertificates.approver')}</TableHead>
                  <TableHead>{t('myCertificates.status')}</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('myCertificates.noTotal')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.title}</TableCell>
                      <TableCell>{cert.issuing_organization || '-'}</TableCell>
                      <TableCell>{formatDate(cert.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(cert.approver_name)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(cert.is_verified)}>
                            {getStatusText(cert.is_verified)}
                          </Badge>
                          {cert.is_verified === null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRejection({
                                certificateId: cert.id,
                                certificateType: cert.type
                              })}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className="ml-1">{t('myCertificates.viewRejectionComment')}</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                       <TableCell>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleEdit(cert)}
                            title={t('common.edit')}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('common.organization')}</TableHead>
                  <TableHead>{t('myCertificates.created')}</TableHead>
                  <TableHead>{t('myCertificates.approver')}</TableHead>
                  <TableHead>{t('myCertificates.status')}</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifiedCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('myCertificates.noApproved')}
                    </TableCell>
                  </TableRow>
                ) : (
                  verifiedCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.title}</TableCell>
                      <TableCell>{cert.issuing_organization || '-'}</TableCell>
                      <TableCell>{formatDate(cert.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(cert.approver_name)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(cert.is_verified)}>
                          {getStatusText(cert.is_verified)}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleEdit(cert)}
                            title={t('common.edit')}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('common.organization')}</TableHead>
                  <TableHead>{t('myCertificates.created')}</TableHead>
                  <TableHead>{t('myCertificates.approver')}</TableHead>
                  <TableHead>{t('myCertificates.status')}</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('myCertificates.noPending')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.title}</TableCell>
                      <TableCell>{cert.issuing_organization || '-'}</TableCell>
                      <TableCell>{formatDate(cert.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(cert.approver_name)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(cert.is_verified)}>
                          {getStatusText(cert.is_verified)}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleEdit(cert)}
                            title={t('common.edit')}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('common.organization')}</TableHead>
                  <TableHead>{t('myCertificates.created')}</TableHead>
                  <TableHead>{t('myCertificates.approver')}</TableHead>
                  <TableHead>{t('myCertificates.status')}</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('myCertificates.noRejected')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rejectedCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.title}</TableCell>
                      <TableCell>{cert.issuing_organization || '-'}</TableCell>
                      <TableCell>{formatDate(cert.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(cert.approver_name)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(cert.is_verified)}>
                            {getStatusText(cert.is_verified)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRejection({
                              certificateId: cert.id,
                              certificateType: cert.type
                            })}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="ml-1">{t('myCertificates.viewRejectionComment')}</span>
                          </Button>
                        </div>
                      </TableCell>
                       <TableCell>
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleEdit(cert)}
                           title={t('common.edit')}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

      </Tabs>
      
      {/* Rejection Comment Dialog */}
      {selectedRejection && (
        <RejectionCommentDialog
          open={!!selectedRejection}
          onOpenChange={(open) => !open && setSelectedRejection(null)}
          certificateId={selectedRejection.certificateId}
          certificateType={selectedRejection.certificateType}
        />
      )}

      {/* Certificate Edit Dialog */}
      <CertificateEditDialog
        certificate={editingCertificate}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingCertificate(null);
            // Refresh the certificates after editing
            fetchCertificates();
          }
        }}
      />
    </div>
  );
}
