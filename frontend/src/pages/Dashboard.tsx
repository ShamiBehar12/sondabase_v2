import {
  FileText,
  Award,
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  Edit,
  CheckCircle
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCertificates } from "@/hooks/useCertificates";
import { useProfessionalCertificates } from "@/hooks/useProfessionalCertificates";
import { useRecentDocuments } from "@/hooks/useRecentDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecentDocument } from "@/hooks/useRecentDocuments";
import { apiFetch } from "@/lib/api-client";

type DashStats = {
  totalStories: number;
  totalCerts: number;
  totalProfCerts: number;
  pendingApprovals: number;
  pendingCerts: number;
  pendingStories: number;
  totalUsers: number;
  recentActivity: Array<{ id: string; action: string; document: string; user: string; time: string; type: string }>;
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

const getDocumentIcon = (type: string) => {
  return type === "story" ? FileText : Award;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
    case "active":
      return "bg-success";
    case "review":
      return "bg-warning";
    case "expiring":
      return "bg-error";
    default:
      return "bg-foreground-muted";
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case "success":
      return CheckCircle;
    case "warning":
      return AlertTriangle;
    default:
      return Clock;
  }
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { certificates, loading, refetch } = useCertificates();
  const { certificates: professionalCertificates, loading: professionalLoading } = useProfessionalCertificates();
  const { documents: recentDocuments, loading: documentsLoading, refetch: refetchDocuments } = useRecentDocuments();
  const navigate = useNavigate();

  const [dashStats, setDashStats] = useState<DashStats | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<RecentDocument | null>(null);
  const [documentSummaryOpen, setDocumentSummaryOpen] = useState(false);

  useEffect(() => {
    apiFetch<DashStats>("/api/stats/dashboard").then(({ data }) => {
      if (data) setDashStats(data);
    }).catch(() => {});
  }, []);

  // Função para abrir resumo del documento
  const handleDocumentClick = (documentId: string, documentType: 'certificate' | 'story') => {
    const document = recentDocuments.find(doc => doc.id === documentId);
    if (document) {
      setSelectedDocument(document);
      setDocumentSummaryOpen(true);
    }
  };

  // Atualiza dados quando entrar na página dashboard
  useEffect(() => {
    if (user) {
      refetch();
      refetchDocuments();
    }
  }, [user]); // Remove refetch de la dependência para evitar loop

  // Calculate certificate statistics
  const certificateStats = useMemo(() => {
    if (!certificates.length) {
      return {
        totalCertificates: 0,
        expiringSoon: 0,
        activeCertificates: 0,
        editedThisWeek: 0
      };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Calcular início de la semana (segunda-feira)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Considerar todos os certificados como total
    const totalCertificates = certificates.length;

    // Certificados que expiram nos próximos 30 dias
    const expiringSoon = certificates.filter(cert => {
      if (!cert.contract_end_date) return false;
      const endDate = new Date(cert.contract_end_date);
      return endDate > now && endDate <= thirtyDaysFromNow;
    }).length;

    // Certificados ativos: sem data de fim OU com data de fim no futuro
    const activeCertificates = certificates.filter(cert => {
      // Si no tiene fecha de fin, se considera activo
      if (!cert.contract_end_date) return true;
      // Si tiene fecha de fin, verifica si aún no expiró
      return new Date(cert.contract_end_date) > now;
    }).length;

    // Certificados editados esta semana
    const editedThisWeek = certificates.filter(cert => {
      const createdAt = new Date(cert.created_at);
      const updatedAt = new Date(cert.updated_at);
      // Verificar se foi editado (diferença entre created_at y updated_at > 1 minuto)
      const timeDiff = updatedAt.getTime() - createdAt.getTime();
      const wasEdited = timeDiff > 60000; // 1 minuto
      // Verificar se a edição foi esta semana
      return wasEdited && updatedAt >= startOfWeek;
    }).length;

    return {
      totalCertificates,
      activeCertificates,
      expiringSoon,
      editedThisWeek
    };
  }, [certificates]);

  // Calculate professional certificate statistics  
  const professionalStats = useMemo(() => {
    if (!professionalCertificates.length) {
      return {
        totalProfessional: 0,
        activeProfessional: 0
      };
    }

    const now = new Date();
    
    const totalProfessional = professionalCertificates.length;
    
    // Certificados profissionais ativos: sem data de validade OU com data de validade no futuro
    const activeProfessional = professionalCertificates.filter(cert => {
      if (!cert.valid_until) return true;
      return new Date(cert.valid_until) > now;
    }).length;

    return {
      totalProfessional,
      activeProfessional
    };
  }, [professionalCertificates]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-foreground-secondary">
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('dashboard.totalStories')}
          value={dashStats ? dashStats.totalStories : "..."}
          change={dashStats ? `${dashStats.pendingStories} pendentes` : t('dashboard.loading')}
          changeType="neutral"
          icon={FileText}
        />
        <StatsCard
          title={t('dashboard.totalCertificates')}
          value={loading ? "..." : certificateStats.totalCertificates}
          change={loading ? t('dashboard.loading') : 
            certificateStats.activeCertificates > 0 ? 
            `${certificateStats.activeCertificates} ${t('dashboard.active')}` : 
            t('dashboard.none')}
          changeType={certificateStats.activeCertificates > 0 ? "positive" : "neutral"}
          icon={Award}
        />
        <StatsCard
          title={t('dashboard.totalProfessionalCertificates')}
          value={professionalLoading ? "..." : professionalStats.totalProfessional}
          change={professionalLoading ? t('dashboard.loading') : 
            professionalStats.activeProfessional > 0 ? 
            `${professionalStats.activeProfessional} ${t('dashboard.active')}` : 
            t('dashboard.none')}
          changeType={professionalStats.activeProfessional > 0 ? "positive" : "neutral"}
          icon={Award}
        />
        <StatsCard
          title={t('dashboard.documentsEdited')}
          value={loading ? "..." : certificateStats.editedThisWeek}
          change={t('dashboard.thisWeek')}
          changeType="neutral"
          icon={Edit}
        />
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <h3 className="font-semibold text-sm">{t('dashboard.alertsExpiring')}</h3>
            </div>
            <Badge variant="outline" className="text-xs">{certificateStats.expiringSoon}</Badge>
          </div>
          <p className="text-sm text-foreground-secondary">{certificateStats.expiringSoon} {t('dashboard.alertsExpiringMessage')}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-info"></div>
              <h3 className="font-semibold text-sm">{t('dashboard.alertsPending')}</h3>
            </div>
            <Badge variant="outline" className="text-xs">{dashStats ? dashStats.pendingApprovals : "..."}</Badge>
          </div>
          <p className="text-sm text-foreground-secondary">{dashStats ? dashStats.pendingApprovals : "..."} {t('dashboard.alertsPendingMessage')}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <h3 className="font-semibold text-sm">{t('dashboard.alertsGoal')}</h3>
            </div>
            <Badge variant="outline" className="text-xs">
              {dashStats && dashStats.totalCerts > 0
                ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
                : 0}%
            </Badge>
          </div>
          <p className="text-sm text-foreground-secondary">
            {dashStats && dashStats.totalCerts > 0
              ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
              : 0}% {t('dashboard.alertsGoalMessage')}
          </p>
          <Progress
            value={dashStats && dashStats.totalCerts > 0
              ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
              : 0}
            className="mt-3 h-2"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Documents - Takes 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {t('dashboard.recentDocuments')}
            </h2>
            <Button variant="ghost" size="sm">
              {t('dashboard.viewAll')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {documentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="premium-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3"></div>
                      </div>
                      <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => {
                const Icon = getDocumentIcon(doc.type);
                const isNewDocument = doc.isNew || false;
                const isEdited = doc.wasEdited || false;
                
                return (
                  <div 
                    key={doc.id} 
                    className="premium-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleDocumentClick(doc.id, doc.type)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-gradient-primary rounded-lg">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground truncate">
                              {doc.title}
                            </h3>
                          </div>
                          <p className="text-sm text-foreground-secondary">
                            {doc.client || t('dashboard.noOrganization')} • por {doc.editedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Substituir status ativo por badge de editado o nuevo */}
                        {isEdited ? (
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                            {t('dashboard.edited')}
                          </Badge>
                        ) : isNewDocument ? (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            {t('dashboard.new')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted/20">
                            -
                          </Badge>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-foreground-muted">
                            {new Date(doc.lastEdited).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-foreground-muted">
                            {new Date(doc.lastEdited).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="premium-card p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">{t('dashboard.noRecentDocuments')}</h3>
                <p className="text-sm text-foreground-secondary">
                  {t('dashboard.noRecentDocumentsText')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline - Takes 1/3 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {t('dashboard.recentActivities')}
            </h2>
            <Button variant="ghost" size="sm">
              <Clock className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="premium-card p-4 space-y-4">
            {!dashStats ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-muted rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted rounded animate-pulse"></div>
                      <div className="h-2 bg-muted rounded animate-pulse w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashStats.recentActivity.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-4">Ninguna atividade recente</p>
            ) : dashStats.recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${
                    activity.type === "success" ? "bg-success/20" :
                    activity.type === "warning" ? "bg-warning/20" : "bg-info/20"
                  }`}>
                    <Icon className={`w-3 h-3 ${
                      activity.type === "success" ? "text-success" :
                      activity.type === "warning" ? "text-warning" : "text-info"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium truncate">{activity.document}</span>
                    </p>
                    <p className="text-xs text-foreground-muted">{timeAgo(activity.time)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Aprovações pendentes"
          value={dashStats ? dashStats.pendingApprovals : "..."}
          change={dashStats ? `${dashStats.pendingCerts} cert. · ${dashStats.pendingStories} hist.` : t('dashboard.loading')}
          changeType={dashStats && dashStats.pendingApprovals > 0 ? "neutral" : "positive"}
          icon={AlertTriangle}
        />
        <StatsCard
          title={t('dashboard.activeUsers')}
          value={dashStats ? dashStats.totalUsers : "..."}
          change={dashStats ? `${dashStats.totalUsers} cadastrados` : t('dashboard.loading')}
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Historias publicadas"
          value={dashStats ? dashStats.totalStories : "..."}
          change={dashStats ? `${dashStats.pendingStories} esperando revisão` : t('dashboard.loading')}
          changeType="neutral"
          icon={FileText}
        />
        <StatsCard
          title="Cert. profissionais"
          value={dashStats ? dashStats.totalProfCerts : "..."}
          change={professionalLoading ? t('dashboard.loading') : `${professionalStats.activeProfessional} ativos`}
          changeType="positive"
          icon={Award}
        />
      </div>

      {/* Quick Actions Enhanced */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-6 flex flex-col gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">{t('dashboard.newSuccessStory')}</p>
              <p className="text-sm text-foreground-muted">{t('dashboard.createSuccessCase')}</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-6 flex flex-col gap-3">
            <Award className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">{t('dashboard.uploadCertificate')}</p>
              <p className="text-sm text-foreground-muted">{t('dashboard.addCertificate')}</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-6 flex flex-col gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">{t('dashboard.completeReport')}</p>
              <p className="text-sm text-foreground-muted">{t('dashboard.consolidatedAnalysis')}</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-6 flex flex-col gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">{t('dashboard.manageUsers')}</p>
              <p className="text-sm text-foreground-muted">{t('dashboard.accessControl')}</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Modal de Resumo del Documento */}
      <Dialog open={documentSummaryOpen} onOpenChange={setDocumentSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('dashboard.documentSummary')}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-6">
              {/* Cabeçalho del documento */}
              <div className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedDocument.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDocument.type === 'certificate' ? t('dashboard.certificate') : t('dashboard.successStory')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDocument.isNew && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {t('dashboard.new')}
                      </Badge>
                    )}
                    {selectedDocument.wasEdited && (
                      <Badge variant="outline">
                        {t('dashboard.edited')}
                      </Badge>
                    )}
                    <Badge variant={
                      selectedDocument.status === 'active' ? 'default' :
                      selectedDocument.status === 'expiring' ? 'destructive' :
                      selectedDocument.status === 'published' ? 'secondary' : 'outline'
                    }>
                      {selectedDocument.status === 'active' ? t('dashboard.statusActive') :
                       selectedDocument.status === 'expiring' ? t('dashboard.statusExpiring') :
                       selectedDocument.status === 'published' ? t('dashboard.statusPublished') : t('dashboard.statusReview')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {selectedDocument.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.description')}</label>
                  <p className="mt-1 text-sm leading-relaxed">{selectedDocument.description}</p>
                </div>
              )}

              {/* Informações del documento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.type')}</label>
                  <p className="mt-1">{selectedDocument.type === 'certificate' ? t('dashboard.certificate') : t('dashboard.successStory')}</p>
                </div>
                {selectedDocument.client && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.issuingOrganization')}</label>
                    <p className="mt-1">{selectedDocument.client}</p>
                  </div>
                )}
                {selectedDocument.certificate_number && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.certificateNumber')}</label>
                    <p className="mt-1">{selectedDocument.certificate_number}</p>
                  </div>
                )}
                {selectedDocument.country && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.country')}</label>
                    <p className="mt-1">{selectedDocument.country}</p>
                  </div>
                )}
                {selectedDocument.issued_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.issueDate')}</label>
                    <p className="mt-1">{new Date(selectedDocument.issued_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {selectedDocument.contract_start_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.contractStart')}</label>
                    <p className="mt-1">{new Date(selectedDocument.contract_start_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {selectedDocument.contract_end_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.contractEnd')}</label>
                    <p className="mt-1">{new Date(selectedDocument.contract_end_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.createdAt')}</label>
                  <p className="mt-1">{new Date(selectedDocument.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.lastEdit')}</label>
                  <p className="mt-1">{new Date(selectedDocument.lastEdited).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.tags')}</label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedDocument.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => {
                    setDocumentSummaryOpen(false);
                    if (selectedDocument.type === 'certificate') {
                      navigate('/certificates', { state: { openCertificateId: selectedDocument.id } });
                    } else {
                      navigate('/success-stories');
                    }
                  }}
                  className="flex-1"
                >
                  {t('dashboard.openDocument')}
                </Button>
                <Button variant="outline" onClick={() => setDocumentSummaryOpen(false)}>
                  {t('dashboard.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}