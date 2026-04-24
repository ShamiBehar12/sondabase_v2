import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentDocument {
  id: string;
  title: string;
  type: 'certificate' | 'story';
  client?: string;
  lastEdited: string;
  editedBy: string;
  status: 'published' | 'active' | 'review' | 'expiring';
  created_at: string;
  updated_at: string;
  wasEdited?: boolean;
  isNew?: boolean;
  mostRecentDate?: string;
  // Dados específicos do certificado
  description?: string;
  certificate_number?: string;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  country?: string;
  tags?: string[];
}

export const useRecentDocuments = () => {
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const fetchRecentDocuments = async () => {
    if (!user) {
      setDocuments([]);
      return;
    }

    try {
      setLoading(true);

      // Buscar certificados recentes (últimos 7 dias para criados, 30 dias para editados)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar apenas certificados aprovados (is_verified = true)
      const { data: certificates, error: certError } = await apiClient
        .from('certificates')
        .select(`
          id,
          title,
          description,
          certificate_number,
          issued_date,
          contract_start_date,
          contract_end_date,
          country,
          tags,
          created_at,
          updated_at,
          issuing_organization,
          user_id,
          is_verified
        `)
        .eq('is_verified', true)
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      if (certError) throw certError;

      // Converter certificados para formato de documento
      const certificateDocuments: RecentDocument[] = (certificates || []).map(cert => {
        const now = new Date();
        const createdAt = new Date(cert.created_at);
        const updatedAt = new Date(cert.updated_at);
        const endDate = cert.contract_end_date ? new Date(cert.contract_end_date) : null;
        
        // Verificar se foi editado (diferença entre created_at e updated_at > 1 minuto)
        const timeDiff = updatedAt.getTime() - createdAt.getTime();
        const wasEdited = timeDiff > 60000; // 1 minuto
        
        // Verificar se é novo (criado nos últimos 7 dias)
        const isNew = createdAt >= sevenDaysAgo;
        
        // Verificar se está expirando
        const isExpiring = endDate && endDate > now && endDate <= new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        return {
          id: cert.id,
          title: cert.title,
          type: 'certificate' as const,
          client: cert.issuing_organization || undefined,
          lastEdited: cert.updated_at,
          editedBy: cert.user_id === user.id ? 'Você' : 'Administrador',
          status: 'published' as const,
          created_at: cert.created_at,
          updated_at: cert.updated_at,
          wasEdited,
          isNew,
          // Data mais recente entre criação e atualização
          mostRecentDate: updatedAt > createdAt ? cert.updated_at : cert.created_at,
          // Dados específicos do certificado
          description: cert.description,
          certificate_number: cert.certificate_number,
          issued_date: cert.issued_date,
          contract_start_date: cert.contract_start_date,
          contract_end_date: cert.contract_end_date,
          country: cert.country,
          tags: cert.tags
        };
      });

      // TODO: Quando houver tabela de success stories, adicionar aqui
      // Por enquanto, vamos usar apenas certificados
      
      // Ordenar pela data mais recente (criação ou atualização)
      const allDocuments = [...certificateDocuments]
        .sort((a, b) => new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime())
        .slice(0, 5); // Limitar a 5 documentos mais recentes

      setDocuments(allDocuments);
    } catch (error: any) {
      // Only show error if user is still authenticated
      if (user && error?.message !== 'Load failed') {
        toast({
          title: "Erro ao carregar documentos recentes",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchRecentDocuments();
    }
    // Reset documents when user logs out
    if (!authLoading && !user) {
      setDocuments([]);
    }
  }, [user, authLoading]);

  return {
    documents,
    loading,
    refetch: fetchRecentDocuments,
  };
};
