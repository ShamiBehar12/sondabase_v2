import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface ProfessionalCertificate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  description_pt?: string;
  description_en?: string;
  description_es?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  
  // Professional-specific fields
  professional_registration_number?: string;
  professional_council?: string;
  institution?: string;
  certification_type?: string;
  specialization_area?: string;
  course_hours?: number;
  status: string;
  
  // Dates
  issued_date?: string;
  valid_from?: string;
  valid_until?: string;
  
  // Location
  country?: string;
  state_province?: string;
  city?: string;
  
  // Verification
  is_verified: boolean;
  verification_notes?: string;
  
  // Tags
  tags?: string[];
  
  created_at: string;
  updated_at: string;
}

export const useProfessionalCertificates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<ProfessionalCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    } else {
      setCertificates([]);
      setLoading(false);
    }
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await apiClient
        .from('professional_certificates')
        .select('*')
        .or(`user_id.eq.${user.id},is_verified.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching professional certificates:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar certificados",
        description: "Não foi possível carregar seus certificados profissionais.",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCertificate = async (certificateData: Omit<ProfessionalCertificate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await apiClient
        .from('professional_certificates')
        .insert({
          ...certificateData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCertificates(prev => [data, ...prev]);
      toast({
        title: "Certificado criado",
        description: "Certificado profissional criado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('Error creating professional certificate:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar certificado",
        description: "Não foi possível criar o certificado profissional.",
      });
      return null;
    }
  };

  const updateCertificate = async (id: string, updates: Partial<ProfessionalCertificate>) => {
    try {
      const { data, error } = await apiClient
        .from('professional_certificates')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      setCertificates(prev => 
        prev.map(cert => cert.id === id ? data : cert)
      );

      toast({
        title: "Certificado atualizado",
        description: "Certificado profissional atualizado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error('Error updating professional certificate:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar certificado",
        description: "Não foi possível atualizar o certificado profissional.",
      });
      return null;
    }
  };

  const deleteCertificate = async (id: string) => {
    try {
      const { error } = await apiClient
        .from('professional_certificates')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setCertificates(prev => prev.filter(cert => cert.id !== id));
      
      toast({
        title: "Certificado excluído",
        description: "Certificado profissional excluído com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting professional certificate:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir certificado",
        description: "Não foi possível excluir o certificado profissional.",
      });
      return false;
    }
  };

  return {
    certificates,
    loading,
    createCertificate,
    updateCertificate,
    deleteCertificate,
    refetch: fetchCertificates,
  };
};
