import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, FileText, User, Pencil, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { RejectionCommentDialog } from '@/components/certificates/RejectionCommentDialog';

interface MySuccessStory {
  id: string;
  title_pt?: string;
  title_en?: string;
  title_es?: string;
  client_pt?: string;
  client_en?: string;
  client_es?: string;
  country_pt?: string;
  country_en?: string;
  country_es?: string;
  product_pt?: string;
  product_en?: string;
  product_es?: string;
  challenge_pt?: string;
  challenge_en?: string;
  challenge_es?: string;
  solution_pt?: string;
  solution_en?: string;
  solution_es?: string;
  benefits_pt?: string;
  benefits_en?: string;
  benefits_es?: string;
  contract_period?: string;
  contract_value?: string;
  closure_year?: string;
  client_logo?: string;
  image_01?: string;
  image_02?: string;
  image_03?: string;
  image_04?: string;
  tags?: string[];
  status: 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
  is_verified: boolean | null; // null = rejeitado, false = pendente, true = aprovado
  created_at: string;
  updated_at: string;
  user_id: string;
  type: 'success_story';
  approver_name?: string;
}

export default function MySuccessStories() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stories, setStories] = useState<MySuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRejection, setSelectedRejection] = useState<{
    storyId: string;
  } | null>(null);
  
  const { user } = useAuth();

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return ptBR;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMySuccessStories();
    }
  }, [user?.id]);

  const fetchMySuccessStories = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Buscar histórias ativas do usuário
      const { data: userStories, error: storiesError } = await apiClient
        .from('success_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (storiesError) {
        console.error('Error fetching success stories:', storiesError);
        toast.error('Erro ao carregar histórias de sucesso');
        return;
      }

      // Buscar histórias rejeitadas
      const { data: rejectedStories, error: rejectionsError } = await apiClient
        .from('success_story_rejections')
        .select(`
          success_story_id,
          rejection_reason,
          created_at,
          admin_id,
          user_id,
          original_title
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (rejectionsError) {
        console.error('Error fetching rejected stories:', rejectionsError);
        toast.error('Erro ao carregar histórias rejeitadas: ' + rejectionsError.message);
      }

      // Buscar histórias aprovadas
      const { data: approvedStories, error: approvalsError } = await apiClient
        .from('success_story_approvals')
        .select(`
          success_story_id,
          admin_id,
          user_id,
          original_title,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (approvalsError) {
        console.error('Error fetching approved stories:', approvalsError);
        toast.error('Erro ao carregar histórias aprovadas: ' + approvalsError.message);
      }

      // Buscar perfis dos administradores
      const allAdminIds = [
        ...(rejectedStories || []).map(r => r.admin_id),
        ...(approvedStories || []).map(a => a.admin_id)
      ];
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

      // Combinar todas as histórias
      const allStories: MySuccessStory[] = [
        // Histórias ativas (aprovadas ou pendentes)
        ...(userStories || []).map(story => {
          const approvalRecord = (approvedStories || []).find(a => a.success_story_id === story.id);
          let approverName: string | undefined = undefined;
          
          if (story.is_verified === true) {
            if (approvalRecord) {
              const adminProfile = adminProfiles.find(p => p.user_id === approvalRecord.admin_id);
              approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
            } else {
              approverName = t('myCertificates.newSystemMessage');
            }
          }
          
          return {
            ...story,
            type: 'success_story' as const,
            approver_name: approverName
          };
        }),
        // Histórias rejeitadas
        ...(rejectedStories || []).map(rejection => {
          const adminProfile = adminProfiles.find(p => p.user_id === rejection.admin_id);
          const approverName = adminProfile?.full_name || t('myCertificates.unknownAdmin');
          
          return {
            id: rejection.success_story_id,
            title_pt: rejection.original_title || t('myCertificates.rejectedCertificate'),
            title_en: undefined,
            title_es: undefined,
            client_pt: undefined,
            client_en: undefined,
            client_es: undefined,
            country_pt: undefined,
            country_en: undefined,
            country_es: undefined,
            product_pt: undefined,
            product_en: undefined,
            product_es: undefined,
            challenge_pt: rejection.rejection_reason,
            challenge_en: undefined,
            challenge_es: undefined,
            solution_pt: undefined,
            solution_en: undefined,
            solution_es: undefined,
            benefits_pt: undefined,
            benefits_en: undefined,
            benefits_es: undefined,
            contract_period: undefined,
            contract_value: undefined,
            closure_year: undefined,
            client_logo: undefined,
            image_01: undefined,
            image_02: undefined,
            image_03: undefined,
            image_04: undefined,
            tags: undefined,
            status: 'rejeitado' as const,
            is_verified: null, // null indica rejeitado
            created_at: rejection.created_at,
            updated_at: rejection.created_at,
            user_id: user.id,
            type: 'success_story' as const,
            approver_name: approverName
          };
        })
      ];
      
      setStories(allStories);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Erro inesperado ao carregar histórias');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (story: MySuccessStory) => {
    if (story.is_verified === false) {
      // Navigate to edit page or open edit dialog
      toast.info(t('mySuccessStories.editNotImplemented'));
    } else {
      toast.error(t('mySuccessStories.cannotEditApproved'));
    }
  };

  const normalizeApproverName = (approverName: any): string => {
    if (approverName === null || approverName === undefined) {
      return '-';
    }
    
    if (typeof approverName === 'object' && approverName._type === 'undefined') {
      return '-';
    }
    
    if (typeof approverName === 'object' && approverName.value !== undefined) {
      if (approverName.value === 'undefined' || approverName.value === null) {
        return '-';
      }
      return String(approverName.value);
    }
    
    if (typeof approverName === 'string' && approverName.trim() !== '') {
      return approverName;
    }
    
    if (typeof approverName === 'object') {
      return '-';
    }
    
    return '-';
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('auth.signInTitle')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Aplicar filtros
  const filteredStories = stories.filter(story => {
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const title = (story.title_pt || story.title_en || story.title_es || '').toLowerCase();
      const client = (story.client_pt || story.client_en || story.client_es || '').toLowerCase();
      const country = (story.country_pt || story.country_en || story.country_es || '').toLowerCase();
      
      if (!title.includes(searchLower) && 
          !client.includes(searchLower) && 
          !country.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Separar histórias por status
  const verifiedStories = filteredStories.filter(story => story.is_verified === true);
  const pendingStories = filteredStories.filter(story => story.is_verified === false);
  const rejectedStories = filteredStories.filter(story => story.is_verified === null);

  const getStatusColor = (isVerified: boolean | null) => {
    if (isVerified === true) return 'default';
    if (isVerified === false) return 'secondary';
    return 'destructive';
  };
  
  const getStatusText = (isVerified: boolean | null, status?: string) => {
    if (isVerified === true) return t('mySuccessStories.statusApproved');
    if (isVerified === false) {
      if (status === 'em_revisao') return t('successStories.pending');
      return t('mySuccessStories.statusPending');
    }
    return t('mySuccessStories.statusRejected');
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', {
      locale: getDateLocale()
    });
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">{t('mySuccessStories.title')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('mySuccessStories.subtitle')} • {stories.length} {t('mySuccessStories.storiesRegistered')}
          </p>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('mySuccessStories.approved')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedStories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('mySuccessStories.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingStories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('mySuccessStories.rejected')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedStories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('mySuccessStories.total')}</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('mySuccessStories.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">{t('mySuccessStories.all')}</TabsTrigger>
          <TabsTrigger value="approved">{t('mySuccessStories.approved')}</TabsTrigger>
          <TabsTrigger value="pending">{t('mySuccessStories.pending')}</TabsTrigger>
          <TabsTrigger value="rejected">{t('mySuccessStories.rejected')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t('mySuccessStories.loading')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('mySuccessStories.client')}</TableHead>
                  <TableHead>{t('mySuccessStories.created')}</TableHead>
                  <TableHead>{t('mySuccessStories.approver')}</TableHead>
                  <TableHead>{t('mySuccessStories.status')}</TableHead>
                  <TableHead>{t('mySuccessStories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('mySuccessStories.noTotal')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">
                        {story.title_pt || story.title_en || story.title_es || t('mySuccessStories.noTitle')}
                      </TableCell>
                      <TableCell>{story.client_pt || story.client_en || story.client_es || '-'}</TableCell>
                      <TableCell>{formatDate(story.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(story.approver_name)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(story.is_verified)}>
                          {getStatusText(story.is_verified, story.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(story)}
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
                  <TableHead>{t('mySuccessStories.client')}</TableHead>
                  <TableHead>{t('mySuccessStories.created')}</TableHead>
                  <TableHead>{t('mySuccessStories.approver')}</TableHead>
                  <TableHead>{t('mySuccessStories.status')}</TableHead>
                  <TableHead>{t('mySuccessStories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifiedStories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('mySuccessStories.noApproved')}
                    </TableCell>
                  </TableRow>
                ) : (
                  verifiedStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">
                        {story.title_pt || story.title_en || story.title_es || t('mySuccessStories.noTitle')}
                      </TableCell>
                      <TableCell>{story.client_pt || story.client_en || story.client_es || '-'}</TableCell>
                      <TableCell>{formatDate(story.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(story.approver_name)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(story.is_verified)}>
                          {getStatusText(story.is_verified, story.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(story)}
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
                  <TableHead>{t('mySuccessStories.client')}</TableHead>
                  <TableHead>{t('mySuccessStories.created')}</TableHead>
                  <TableHead>{t('mySuccessStories.approver')}</TableHead>
                  <TableHead>{t('mySuccessStories.status')}</TableHead>
                  <TableHead>{t('mySuccessStories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingStories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('mySuccessStories.noPending')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">
                        {story.title_pt || story.title_en || story.title_es || t('mySuccessStories.noTitle')}
                      </TableCell>
                      <TableCell>{story.client_pt || story.client_en || story.client_es || '-'}</TableCell>
                      <TableCell>{formatDate(story.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(story.approver_name)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(story.is_verified)}>
                          {getStatusText(story.is_verified, story.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(story)}
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
                  <TableHead>{t('mySuccessStories.client')}</TableHead>
                  <TableHead>{t('mySuccessStories.created')}</TableHead>
                  <TableHead>{t('mySuccessStories.approver')}</TableHead>
                  <TableHead>{t('mySuccessStories.status')}</TableHead>
                  <TableHead>{t('mySuccessStories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedStories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('mySuccessStories.noRejected')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rejectedStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">
                        {story.title_pt || story.title_en || story.title_es || t('mySuccessStories.noTitle')}
                      </TableCell>
                      <TableCell>{story.client_pt || story.client_en || story.client_es || '-'}</TableCell>
                      <TableCell>{formatDate(story.created_at)}</TableCell>
                      <TableCell>{normalizeApproverName(story.approver_name)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(story.is_verified)}>
                            {getStatusText(story.is_verified, story.status)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRejection({
                              storyId: story.id
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
                          onClick={() => handleEdit(story)}
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
          certificateId={selectedRejection.storyId}
          certificateType="success_story"
        />
      )}
    </div>
  );
}
