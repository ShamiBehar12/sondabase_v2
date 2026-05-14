import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  Building2, 
  GraduationCap,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProfessionalCertificateCardProps {
  certificate: {
    id: string;
    title: string;
    description?: string;
    file_name: string;
    file_path: string;
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
    tags?: string[];
    created_at: string;
  };
  onEdit: (certificate: any) => void;
  onDelete: (id: string) => void;
  onDownload: (certificate: any) => void;
}

const certificationTypeLabels = {
  graduation: 'Graduação',
  specialization: 'Especialização', 
  master: 'Mestrado',
  doctorate: 'Doutorado',
  course: 'Curso',
  license: 'Licença/Registro'
};

const statusLabels = {
  active: 'Ativo',
  suspended: 'Suspenso',
  expired: 'Expirado',
  revoked: 'Revogado'
};

const statusColors = {
  active: 'bg-green-500',
  suspended: 'bg-yellow-500',
  expired: 'bg-red-500',
  revoked: 'bg-gray-500'
};

export function ProfessionalCertificateCard({ 
  certificate, 
  onEdit, 
  onDelete, 
  onDownload 
}: ProfessionalCertificateCardProps) {
  const { t } = useTranslation();

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const isExpiringSoon = () => {
    if (!certificate.valid_until) return false;
    const validUntil = new Date(certificate.valid_until);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return validUntil <= thirtyDaysFromNow && validUntil > now;
  };

  const isExpired = () => {
    if (!certificate.valid_until) return false;
    return new Date(certificate.valid_until) <= new Date();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 premium-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-5 w-5 text-[#3B82F6] flex-shrink-0" />
              <h3 className="font-semibold text-[#F3F7FC] line-clamp-2 leading-tight">
                {certificate.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="secondary" 
                className={`${statusColors[certificate.status as keyof typeof statusColors]} text-white text-xs`}
              >
                {statusLabels[certificate.status as keyof typeof statusLabels] || certificate.status}
              </Badge>
              
              {certificate.certification_type && (
                <Badge variant="outline" className="text-xs">
                  {certificationTypeLabels[certificate.certification_type as keyof typeof certificationTypeLabels] || certificate.certification_type}
                </Badge>
              )}
              
              {certificate.is_verified && (
                <Badge variant="default" className="bg-blue-500 text-white text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verificado
                </Badge>
              )}
              
              {isExpired() && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expirado
                </Badge>
              )}
              
              {isExpiringSoon() && !isExpired() && (
                <Badge variant="default" className="bg-yellow-500 text-white text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Expira em breve
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(certificate)}
              className="opacity-0 group-hover:opacity-100 transition-all"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(certificate)}
              className="opacity-0 group-hover:opacity-100 transition-all"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(certificate.id)}
              className="opacity-0 group-hover:opacity-100 transition-all text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {certificate.description && (
          <p className="text-sm text-white line-clamp-2">
            {certificate.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          {certificate.institution && (
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{certificate.institution}</span>
            </div>
          )}

          {certificate.professional_council && (
            <div className="flex items-center gap-2 text-white">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {certificate.professional_council}
                {certificate.professional_registration_number && 
                  ` - ${certificate.professional_registration_number}`
                }
              </span>
            </div>
          )}

          {(certificate.country || certificate.state_province || certificate.city) && (
            <div className="flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {[certificate.city, certificate.state_province, certificate.country]
                  .filter(Boolean)
                  .join(', ')
                }
              </span>
            </div>
          )}

          {(certificate.issued_date || certificate.valid_until) && (
            <div className="flex items-center gap-2 text-white">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {certificate.issued_date && `Emitido: ${formatDate(certificate.issued_date)}`}
                {certificate.issued_date && certificate.valid_until && ' • '}
                {certificate.valid_until && `Válido até: ${formatDate(certificate.valid_until)}`}
              </span>
            </div>
          )}

          {certificate.course_hours && (
            <div className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{certificate.course_hours}h de carga horária</span>
            </div>
          )}
        </div>

        {certificate.specialization_area && (
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              {certificate.specialization_area}
            </Badge>
          </div>
        )}

        {certificate.tags && certificate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {certificate.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {certificate.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{certificate.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

