import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentItem, ContentReview } from '@/hooks/useContentApproval';
import { CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReviewDialogProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (itemId: string, comment: string) => Promise<void>;
  onReject: (itemId: string, comment: string) => Promise<void>;
  onRequestChanges: (itemId: string, comment: string) => Promise<void>;
  reviews: ContentReview[];
  isLoading?: boolean;
}

export function ReviewDialog({
  item,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onRequestChanges,
  reviews,
  isLoading = false
}: ReviewDialogProps) {
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setComment('');
    }
  }, [isOpen]);

  if (!item) return null;

  const itemData = item.dados as any;
  const fields = item.content_type?.schema_campos?.fields || [];

  const handleAction = async (action: 'approve' | 'reject' | 'changes') => {
    if (!item) return;
    
    setActionLoading(true);
    try {
      switch (action) {
        case 'approve':
          await onApprove(item.id, comment);
          break;
        case 'reject':
          if (!comment.trim()) {
            alert('Comentário é obrigatório para rechazo');
            return;
          }
          await onReject(item.id, comment);
          break;
        case 'changes':
          if (!comment.trim()) {
            alert('Comentário é obrigatório para solicitar ajustes');
            return;
          }
          await onRequestChanges(item.id, comment);
          break;
      }
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (!value && value !== 0) return <span className="text-muted-foreground">No informado</span>;
    
    switch (field.type) {
      case 'date':
        try {
          return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch {
          return value;
        }
      case 'richtext':
        return (
          <div className="prose prose-sm max-w-none">
            {value.split('\n').map((line: string, i: number) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        );
      default:
        return String(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Revisar Item: {itemData?.titulo || 'Sin título'}
            <Badge variant="outline">v{item.version}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content Preview */}
          <div className="lg:col-span-2">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Conteúdo</h4>
                  <div className="space-y-3">
                    {fields.map((field: any) => {
                      const value = itemData?.[field.name];
                      return (
                        <div key={field.name} className="border-l-2 border-muted pl-3">
                          <label className="text-sm font-medium text-muted-foreground">
                            {field.label_pt || field.name}
                          </label>
                          <div className="mt-1">
                            {renderFieldValue(field, value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Item Info */}
                <div>
                  <h4 className="font-semibold mb-2">Informações</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{item.content_type?.name_pt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Autor:</span>
                      <span>{item.author_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado em:</span>
                      <span>{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atualizado em:</span>
                      <span>{format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Review Panel */}
          <div className="space-y-4">
            {/* Previous Reviews */}
            {reviews.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Histórico de Revisões
                </h4>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-2 border rounded-sm text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          {review.decisao === 'aprobar' && <CheckCircle className="w-3 h-3 text-green-600" />}
                          {review.decisao === 'rejeitar' && <XCircle className="w-3 h-3 text-red-600" />}
                          {review.decisao === 'ajustes' && <AlertCircle className="w-3 h-3 text-orange-600" />}
                          <span className="font-medium">{review.reviewer_name}</span>
                        </div>
                        <p className="text-muted-foreground">{review.comentario}</p>
                        <p className="text-muted-foreground mt-1">
                          {format(new Date(review.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Review Actions */}
            <div>
              <h4 className="font-semibold mb-2">Decisão de Revisão</h4>
              <Textarea
                placeholder="Añade un comentário (obrigatório para rechazo y ajustes)"
                value={comment}
                onChange={(y) => setComment(y.target.value)}
                rows={3}
                className="mb-3"
              />
              
              <div className="space-y-2">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                
                <Button
                  onClick={() => handleAction('changes')}
                  disabled={actionLoading || !comment.trim()}
                  variant="outline"
                  className="w-full"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Solicitar Ajustes
                </Button>
                
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading || !comment.trim()}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}