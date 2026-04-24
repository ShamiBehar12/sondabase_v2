import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/hooks/useContentApproval';
import { Edit, Eye, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContentItemCardProps {
  item: ContentItem;
  onEdit?: (item: ContentItem) => void;
  onView?: (item: ContentItem) => void;
  onSubmitForReview?: (item: ContentItem) => void;
  showAuthor?: boolean;
  className?: string;
}

export function ContentItemCard({
  item,
  onEdit,
  onView,
  onSubmitForReview,
  showAuthor = false,
  className
}: ContentItemCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return (
          <Badge variant="secondary" className="gap-1">
            <Edit className="w-3 h-3" />
            Rascunho
          </Badge>
        );
      case 'em_revisao':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="w-3 h-3" />
            Em Revisão
          </Badge>
        );
      case 'aprovado':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </Badge>
        );
      case 'rejeitado':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {status}
          </Badge>
        );
    }
  };

  const itemData = item.dados as any;
  const title = itemData?.titulo || 'Sem título';
  const description = itemData?.descricao || itemData?.empresa || '';

  const canEdit = item.status === 'rascunho' || item.status === 'rejeitado';
  const canSubmitForReview = item.status === 'rascunho' && onSubmitForReview;

  return (
    <Card className={`hover:shadow-md transition-shadow border border-border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {item.content_type && (
              <p className="text-sm text-muted-foreground font-medium">
                {item.content_type.name_pt}
              </p>
            )}
            {showAuthor && item.author_name && (
              <p className="text-sm text-muted-foreground">
                Por: {item.author_name}
              </p>
            )}
          </div>
          <div className="ml-2">
            {getStatusBadge(item.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>
            Criado em {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </span>
          {item.updated_at !== item.created_at && (
            <span>
              Atualizado em {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(item)}>
              <Eye className="w-4 h-4 mr-1" />
              Visualizar
            </Button>
          )}
          
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
          
          {canSubmitForReview && (
            <Button size="sm" onClick={() => onSubmitForReview(item)} className="bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4 mr-1" />
              Enviar para Revisão
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}