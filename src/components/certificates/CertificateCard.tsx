import { Award, Download, Eye, MoreHorizontal, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface CertificateCardProps {
  id: string;
  title: string;
  certificateNumber: string;
  client: string;
  country: string;
  certifyingEntity: string;
  issueDate: string;
  expiryDate: string;
  type: string;
  confidentiality: "public" | "internal" | "confidential";
  onPreview?: () => void;
  onDownload?: () => void;
}

const confidentialityConfig = {
  public: { label: "Público", color: "bg-success" },
  internal: { label: "Interno", color: "bg-warning" },
  confidential: { label: "Confidencial", color: "bg-error" }
};

export function CertificateCard({
  id,
  title,
  certificateNumber,
  client,
  country,
  certifyingEntity,
  issueDate,
  expiryDate,
  type,
  confidentiality,
  onPreview,
  onDownload
}: CertificateCardProps) {
  const isExpiringSoon = new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="premium-card group">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{title}</h3>
              <p className="text-sm text-foreground-secondary">#{certificateNumber}</p>
            </div>
          </div>

          {/* Ícones de ação */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="h-8 px-2"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-8 px-2"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge 
            className={`${confidentialityConfig[confidentiality].color} text-white border-0`}
          >
            {confidentialityConfig[confidentiality].label}
          </Badge>
          <Badge variant="outline">{type}</Badge>
          {isExpiringSoon && (
            <Badge className="bg-warning text-white border-0">
              Expira em breve
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Client & Country */}
        <div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Cliente</p>
          <p className="text-foreground">{client} • {country}</p>
        </div>

        {/* Certifying Entity */}
        <div>
          <p className="text-sm font-medium text-foreground-secondary mb-1">Entidade Certificadora</p>
          <p className="text-foreground">{certifyingEntity}</p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-foreground-secondary mb-1">Emissão</p>
            <p className="text-foreground text-sm">{new Date(issueDate).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground-secondary mb-1">Validade</p>
            <p className={`text-sm ${isExpiringSoon ? 'text-warning' : 'text-foreground'}`}>
              {new Date(expiryDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}