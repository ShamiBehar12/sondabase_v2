import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface ContentType {
  id: string;
  slug: string;
  name_pt: string;
  name_es: string;
  name_en: string;
  description_pt?: string;
  description_es?: string;
  description_en?: string;
  schema_campos: any;
  regras_aprovacao: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  type_id: string;
  autor_id: string;
  status: 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
  dados: any;
  version: number;
  publish_at?: string;
  created_at: string;
  updated_at: string;
  content_type?: ContentType;
  author_name?: string;
}

export interface ContentReview {
  id: string;
  item_id: string;
  reviewer_id: string;
  decisao: 'aprovar' | 'rejeitar' | 'ajustes';
  comentario: string;
  created_at: string;
  reviewer_name?: string;
}

export interface ContentAttachment {
  id: string;
  item_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export function useContentApproval() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch content types
  const fetchContentTypes = async () => {
    try {
      const { data, error } = await apiClient
        .from('content_types')
        .select('*')
        .eq('is_active', true)
        .order('name_pt');

      if (error) throw error;
      setContentTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching content types:', error);
      toast.error('Erro ao carregar tipos de conteúdo');
    }
  };

  // Fetch user's content items
  const fetchMyItems = async () => {
    setLoading(true);
    try {
      const { data: user } = await apiClient.auth.getUser();
      if (!user.user) {
        setItems([]);
        return;
      }

      const { data, error } = await apiClient
        .from('content_items')
        .select(`
          *,
          content_type:content_types(*)
        `)
        .eq('autor_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  // Fetch review queue (for reviewers)
  const fetchReviewQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient
        .from('content_items')
        .select(`
          *,
          content_type:content_types(*)
        `)
        .eq('status', 'em_revisao')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch author names separately to avoid relation issues
      const itemsWithAuthor = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await apiClient
            .from('profiles')
            .select('full_name')
            .eq('user_id', item.autor_id)
            .single();
          
          return {
            ...item,
            author_name: profile?.full_name || 'Unknown'
          };
        })
      );
      
      setItems(itemsWithAuthor);
    } catch (error: any) {
      console.error('Error fetching review queue:', error);
      toast.error('Erro ao carregar fila de revisão');
    } finally {
      setLoading(false);
    }
  };

  // Create new content item
  const createItem = async (typeId: string, data: any) => {
    try {
      const { data: newItem, error } = await apiClient
        .from('content_items')
        .insert({
          type_id: typeId,
          autor_id: (await apiClient.auth.getUser()).data.user?.id,
          dados: data,
          status: 'rascunho'
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await logAudit('criar_item', newItem.id, { type_id: typeId });
      
      toast.success('Item criado com sucesso');
      await fetchMyItems();
      return newItem;
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error('Erro ao criar item');
      throw error;
    }
  };

  // Update content item
  const updateItem = async (itemId: string, data: any) => {
    try {
      const { error } = await apiClient
        .from('content_items')
        .update({
          dados: data,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log audit
      await logAudit('editar_item', itemId, data);
      
      toast.success('Item atualizado com sucesso');
      await fetchMyItems();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
      throw error;
    }
  };

  // Submit item for review
  const submitForReview = async (itemId: string) => {
    try {
      const { error } = await apiClient
        .from('content_items')
        .update({ 
          status: 'em_revisao',
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      // Log audit
      await logAudit('enviar_revisao', itemId);
      
      // Create notification for reviewers
      await createNotification(itemId, 'envio_revisao');
      
      toast.success('Item enviado para revisão');
      await fetchMyItems();
    } catch (error: any) {
      console.error('Error submitting for review:', error);
      toast.error('Erro ao enviar para revisão');
      throw error;
    }
  };

  // Approve item
  const approveItem = async (itemId: string, comment: string = '') => {
    try {
      // Update item status
      const { error: updateError } = await apiClient
        .from('content_items')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Create review record
      const { error: reviewError } = await apiClient
        .from('content_reviews')
        .insert({
          item_id: itemId,
          reviewer_id: (await apiClient.auth.getUser()).data.user?.id,
          decisao: 'aprovar',
          comentario: comment || 'Aprovado'
        });

      if (reviewError) throw reviewError;

      // Log audit
      await logAudit('aprovar_item', itemId, { comentario: comment });
      
      // Create notification for author
      await createNotification(itemId, 'aprovado');
      
      toast.success('Item aprovado com sucesso');
      await fetchReviewQueue();
    } catch (error: any) {
      console.error('Error approving item:', error);
      toast.error('Erro ao aprovar item');
      throw error;
    }
  };

  // Reject item
  const rejectItem = async (itemId: string, comment: string) => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório para rejeição');
      return;
    }

    try {
      // Update item status
      const { error: updateError } = await apiClient
        .from('content_items')
        .update({ 
          status: 'rejeitado',
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Create review record
      const { error: reviewError } = await apiClient
        .from('content_reviews')
        .insert({
          item_id: itemId,
          reviewer_id: (await apiClient.auth.getUser()).data.user?.id,
          decisao: 'rejeitar',
          comentario: comment
        });

      if (reviewError) throw reviewError;

      // Log audit
      await logAudit('rejeitar_item', itemId, { comentario: comment });
      
      // Create notification for author
      await createNotification(itemId, 'rejeitado');
      
      toast.success('Item rejeitado');
      await fetchReviewQueue();
    } catch (error: any) {
      console.error('Error rejecting item:', error);
      toast.error('Erro ao rejeitar item');
      throw error;
    }
  };

  // Request changes
  const requestChanges = async (itemId: string, comment: string) => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório para solicitar ajustes');
      return;
    }

    try {
      // Update item status back to draft
      const { error: updateError } = await apiClient
        .from('content_items')
        .update({ 
          status: 'rascunho',
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Create review record
      const { error: reviewError } = await apiClient
        .from('content_reviews')
        .insert({
          item_id: itemId,
          reviewer_id: (await apiClient.auth.getUser()).data.user?.id,
          decisao: 'ajustes',
          comentario: comment
        });

      if (reviewError) throw reviewError;

      // Log audit
      await logAudit('solicitar_ajustes', itemId, { comentario: comment });
      
      // Create notification for author
      await createNotification(itemId, 'pedido_ajustes');
      
      toast.success('Ajustes solicitados');
      await fetchReviewQueue();
    } catch (error: any) {
      console.error('Error requesting changes:', error);
      toast.error('Erro ao solicitar ajustes');
      throw error;
    }
  };

  // Get item reviews
  const getItemReviews = async (itemId: string): Promise<ContentReview[]> => {
    try {
      const { data, error } = await apiClient
        .from('content_reviews')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch reviewer names separately
      const reviewsWithNames = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await apiClient
            .from('profiles')
            .select('full_name')
            .eq('user_id', review.reviewer_id)
            .single();
          
          return {
            ...review,
            reviewer_name: profile?.full_name || 'Unknown'
          };
        })
      );
      
      return reviewsWithNames;
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  };

  // Helper function to log audit events
  const logAudit = async (action: string, itemId?: string, payload?: any) => {
    try {
      await apiClient
        .from('content_audit_logs')
        .insert({
          actor_id: (await apiClient.auth.getUser()).data.user?.id,
          item_id: itemId,
          acao: action,
          payload: payload || {},
          ip_address: null, // Could be populated in edge function
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  };

  // Helper function to create notifications
  const createNotification = async (itemId: string, type: 'envio_revisao' | 'aprovado' | 'rejeitado' | 'pedido_ajustes') => {
    try {
      // Get item details
      const { data: item } = await apiClient
        .from('content_items')
        .select('*, content_type:content_types(*)')
        .eq('id', itemId)
        .single();

      if (!item) return;

      let title = '';
      let message = '';
      let targetUserId = '';

      const itemData = item.dados as any;
      const titulo = itemData?.titulo || 'Sem título';

      switch (type) {
        case 'envio_revisao':
          title = 'Novo item para revisão';
          message = `Item "${titulo}" foi enviado para revisão`;
          // TODO: Send to all reviewers - for now we'll skip this
          return;
          
        case 'aprovado':
          title = 'Item aprovado';
          message = `Seu item "${titulo}" foi aprovado`;
          targetUserId = item.autor_id;
          break;
          
        case 'rejeitado':
          title = 'Item rejeitado';
          message = `Seu item "${titulo}" foi rejeitado`;
          targetUserId = item.autor_id;
          break;
          
        case 'pedido_ajustes':
          title = 'Ajustes solicitados';
          message = `Ajustes foram solicitados para o item "${titulo}"`;
          targetUserId = item.autor_id;
          break;
      }

      if (targetUserId) {
        await apiClient
          .from('content_notifications')
          .insert({
            user_id: targetUserId,
            item_id: itemId,
            type,
            title,
            message
          });
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  useEffect(() => {
    fetchContentTypes();
  }, []);

  return {
    contentTypes,
    items,
    loading,
    fetchMyItems,
    fetchReviewQueue,
    createItem,
    updateItem,
    submitForReview,
    approveItem,
    rejectItem,
    requestChanges,
    getItemReviews,
    refetch: fetchMyItems
  };
}
