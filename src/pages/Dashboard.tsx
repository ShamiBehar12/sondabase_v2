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
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
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
    <div className="p-6 space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title={t('dashboard.documentsEdited')}
          value={loading ? "..." : certificateStats.editedThisWeek}
          change={t('dashboard.thisWeek')}
          changeType="neutral"
          icon={Edit}
        />
        <StatsCard
          title="Aprobaciones Pendientes"
          value={dashStats ? dashStats.pendingApprovals : "..."}
          change={dashStats ? `${dashStats.pendingCerts} cert. · ${dashStats.pendingStories} hist.` : t('dashboard.loading')}
          changeType={dashStats && dashStats.pendingApprovals > 0 ? "neutral" : "positive"}
          icon={AlertTriangle}
        />
        <StatsCard
          title={t('dashboard.activeUsers')}
          value={dashStats ? dashStats.totalUsers : "..."}
          change={dashStats ? `${dashStats.totalUsers} registrados` : t('dashboard.loading')}
          changeType="positive"
          icon={Users}
        />
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expiring Alert */}
        <div className="premium-card p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-warning rounded-l-xl" />
          <div className="pl-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">{t('dashboard.alertsExpiring')}</h3>
              <Badge variant="outline" className="text-xs font-semibold border-warning/30 text-warning bg-warning/5">
                {certificateStats.expiringSoon}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{certificateStats.expiringSoon} {t('dashboard.alertsExpiringMessage')}</p>
          </div>
        </div>

        {/* Pending Alert */}
        <div className="premium-card p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-info rounded-l-xl" />
          <div className="pl-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">{t('dashboard.alertsPending')}</h3>
              <Badge variant="outline" className="text-xs font-semibold border-info/30 text-info bg-info/5">
                {dashStats ? dashStats.pendingApprovals : "..."}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{dashStats ? dashStats.pendingApprovals : "..."} {t('dashboard.alertsPendingMessage')}</p>
          </div>
        </div>

        {/* Goal Alert */}
        <div className="premium-card p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-success rounded-l-xl" />
          <div className="pl-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">{t('dashboard.alertsGoal')}</h3>
              <Badge variant="outline" className="text-xs font-semibold border-success/30 text-success bg-success/5">
                {dashStats && dashStats.totalCerts > 0
                  ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
                  : 0}%
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed mb-3">
              {dashStats && dashStats.totalCerts > 0
                ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
                : 0}% {t('dashboard.alertsGoalMessage')}
            </p>
            <Progress
              value={dashStats && dashStats.totalCerts > 0
                ? Math.round(((dashStats.totalCerts - dashStats.pendingCerts) / dashStats.totalCerts) * 100)
                : 0}
              className="h-1.5"
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Documents - Takes 2/3 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('dashboard.recentDocuments')}
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">{recentDocuments.length} documentos recientes</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-foreground-muted hover:text-foreground h-7 px-2">
              {t('dashboard.viewAll')}
            </Button>
          </div>

          <div className="premium-card overflow-hidden">
            {documentsLoading ? (
              <div className="divide-y divide-border/40">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                      </div>
                      <div className="w-14 h-5 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDocuments.length > 0 ? (
              <div className="divide-y divide-border/40">
                {recentDocuments.map((doc) => {
                  const Icon = getDocumentIcon(doc.type);
                  const isNewDocument = doc.isNew || false;
                  const isEdited = doc.wasEdited || false;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors group"
                      onClick={() => handleDocumentClick(doc.id, doc.type)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {doc.title}
                          </h3>
                          <p className="text-xs text-foreground-muted mt-0.5 truncate">
                            {doc.client || t('dashboard.noOrganization')} · {doc.editedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {isEdited ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-warning/8 text-warning border-warning/25 font-medium">
                            {t('dashboard.edited')}
                          </Badge>
                        ) : isNewDocument ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-success/8 text-success border-success/25 font-medium">
                            {t('dashboard.new')}
                          </Badge>
                        ) : (
                          <span className="w-1 h-1 rounded-full bg-border block" />
                        )}
                        <div className="text-right w-[70px]">
                          <p className="text-xs text-foreground-muted tabular-nums">
                            {new Date(doc.lastEdited).toLocaleDateString('es-CL')}
                          </p>
                          <p className="text-[10px] text-foreground-muted/70 tabular-nums">
                            {new Date(doc.lastEdited).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{t('dashboard.noRecentDocuments')}</h3>
                <p className="text-xs text-foreground-muted">
                  {t('dashboard.noRecentDocumentsText')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline - Takes 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('dashboard.recentActivities')}
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">Últimas acciones del sistema</p>
            </div>
            <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-foreground-muted hover:text-foreground">
              <Clock className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="premium-card p-4">
            {!dashStats ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-muted rounded-full animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-muted rounded animate-pulse" />
                      <div className="h-2.5 bg-muted rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dashStats.recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-foreground-muted">Ninguna actividad reciente</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical connector line */}
                {dashStats.recentActivity.length > 1 && (
                  <div className="timeline-connector" />
                )}
                <div className="space-y-4">
                  {dashStats.recentActivity.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 relative">
                        <div className={`p-1 rounded-full flex-shrink-0 z-10 ring-2 ring-surface ${
                          activity.type === "success" ? "bg-success/20" :
                          activity.type === "warning" ? "bg-warning/20" : "bg-info/20"
                        }`}>
                          <Icon className={`w-3 h-3 ${
                            activity.type === "success" ? "text-success" :
                            activity.type === "warning" ? "text-warning" : "text-info"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-xs text-foreground leading-relaxed">
                            <span className="font-semibold">{activity.user}</span>
                            {' '}{activity.action}{' '}
                            <span className="font-medium text-foreground-secondary truncate">{activity.document}</span>
                          </p>
                          <p className="text-[10px] text-foreground-muted mt-0.5">{timeAgo(activity.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
                    <p className="mt-1">{new Date(selectedDocument.issued_date).toLocaleDateString('es-CL')}</p>
                  </div>
                )}
                {selectedDocument.contract_start_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.contractStart')}</label>
                    <p className="mt-1">{new Date(selectedDocument.contract_start_date).toLocaleDateString('es-CL')}</p>
                  </div>
                )}
                {selectedDocument.contract_end_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('dashboard.contractEnd')}</label>
                    <p className="mt-1">{new Date(selectedDocument.contract_end_date).toLocaleDateString('es-CL')}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.createdAt')}</label>
                  <p className="mt-1">{new Date(selectedDocument.created_at).toLocaleDateString('es-CL')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('dashboard.lastEdit')}</label>
                  <p className="mt-1">{new Date(selectedDocument.lastEdited).toLocaleDateString('es-CL')}</p>
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