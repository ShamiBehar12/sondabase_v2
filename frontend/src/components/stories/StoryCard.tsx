import { FileText, Eye, Download, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface StoryCardProps {
  id: string;
  title: string;
  client: string;
  country: string;
  status: "draft" | "review" | "published" | "archived";
  image?: string;
  createdAt: string;
  author: string;
}

const statusConfig = {
  draft: { label: "Rascunho", color: "bg-foreground-muted" },
  review: { label: "Revisão", color: "bg-warning" },
  published: { label: "Publicado", color: "bg-success" },
  archived: { label: "Arquivado", color: "bg-error" }
};

export function StoryCard({
  id,
  title,
  client,
  country,
  status,
  image,
  createdAt,
  author
}: StoryCardProps) {
  return (
    <div className="premium-card group overflow-hidden">
      {/* Image/Header */}
      <div className="relative h-48 bg-[linear-gradient(135deg,#171C25_0%,#1D2430_100%)] overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-16 h-16 text-white" />
          </div>
        )}
        
        {/* Status Badge */}
        <Badge 
          className={`absolute top-3 left-3 ${statusConfig[status].color} text-white border-0`}
        >
          {statusConfig[status].label}
        </Badge>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all bg-[#171C25]/80 backdrop-blur-sm hover:bg-[#171C25]/90"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-[#F3F7FC] mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-white">
            <span>{client}</span>
            <span>•</span>
            <span>{country}</span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-white">
          <span>Por {author}</span>
          <span>{new Date(createdAt).toLocaleDateString('pt-BR')}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes
          </Button>
          <Button size="sm" className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white text-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  );
}

