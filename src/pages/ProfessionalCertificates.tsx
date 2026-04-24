import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter, 
  Grid3x3, 
  List,
  Download,
  Calendar,
  Building2,
  Award
} from 'lucide-react';
import { useProfessionalCertificates } from '@/hooks/useProfessionalCertificates';
import { ProfessionalCertificateCard } from '@/components/professional-certificates/ProfessionalCertificateCard';
import { ProfessionalCertificateUploadForm } from '@/components/professional-certificates/ProfessionalCertificateUploadForm';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

const certificationTypes = [
  { value: 'graduation', label: 'Graduação' },
  { value: 'specialization', label: 'Especialização' },
  { value: 'master', label: 'Mestrado' },
  { value: 'doctorate', label: 'Doutorado' },
  { value: 'course', label: 'Curso' },
  { value: 'license', label: 'Licença/Registro' }
];

const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'expired', label: 'Expirado' },
  { value: 'revoked', label: 'Revogado' }
];

export default function ProfessionalCertificates() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { preferences } = useUserPreferences();
  const { certificates, loading, deleteCertificate, refetch } = useProfessionalCertificates();
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    preferences.certificates_view_mode as 'grid' | 'list'
  );

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.professional_council?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || typeFilter === 'all' || cert.certification_type === typeFilter;
    const matchesStatus = !statusFilter || statusFilter === 'all' || cert.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDownload = async (certificate: any) => {
    try {
      const { data, error } = await apiClient.storage
        .from('certificates')
        .download(certificate.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = certificate.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este certificado?')) {
      await deleteCertificate(id);
    }
  };

  const handleEdit = (certificate: any) => {
    // TODO: Implement edit functionality
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de edição em desenvolvimento.",
    });
  };

  const getStats = () => {
    const total = certificates.length;
    const active = certificates.filter(c => c.status === 'active').length;
    const expiringSoon = certificates.filter(c => {
      if (!c.valid_until) return false;
      const validUntil = new Date(c.valid_until);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return validUntil <= thirtyDaysFromNow && validUntil > now;
    }).length;
    const verified = certificates.filter(c => c.is_verified).length;

    return { total, active, expiringSoon, verified };
  };

  const stats = getStats();

  if (showUploadForm) {
    return (
      <div className="container mx-auto p-6">
        <ProfessionalCertificateUploadForm
          onUploadComplete={() => {
            setShowUploadForm(false);
            refetch();
          }}
          onCancel={() => setShowUploadForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gradient">Certificados Profissionais</h1>
            <p className="text-foreground-muted mt-2">
              Gerencie seus certificados profissionais, registros e qualificações
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setShowUploadForm(true)}
          className="bg-gradient-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Certificado
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-foreground-muted">Total de Certificados</p>
            </div>
          </div>
        </div>
        
        <div className="premium-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-foreground-muted">Ativos</p>
            </div>
          </div>
        </div>
        
        <div className="premium-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.expiringSoon}</p>
              <p className="text-sm text-foreground-muted">Expiram em breve</p>
            </div>
          </div>
        </div>
        
        <div className="premium-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.verified}</p>
              <p className="text-sm text-foreground-muted">Verificados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <Input
              placeholder="Buscar certificados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 bg-surface border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {certificationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-surface border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Certificates Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-foreground-muted">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            Carregando certificados...
          </div>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-foreground-muted mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm || typeFilter || statusFilter 
              ? 'Nenhum certificado encontrado' 
              : 'Nenhum certificado profissional ainda'
            }
          </h3>
          <p className="text-foreground-muted mb-6">
            {searchTerm || typeFilter || statusFilter
              ? 'Tente ajustar seus filtros de busca.'
              : 'Comece adicionando seus primeiros certificados profissionais.'
            }
          </p>
          {!searchTerm && !typeFilter && !statusFilter && (
            <Button 
              onClick={() => setShowUploadForm(true)}
              className="bg-gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Certificado
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredCertificates.map((certificate) => (
            <ProfessionalCertificateCard
              key={certificate.id}
              certificate={certificate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
