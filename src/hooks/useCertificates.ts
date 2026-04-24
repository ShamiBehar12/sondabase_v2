import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Certificate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  description_pt?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  ocr_file_name?: string | null;
  ocr_file_path?: string | null;
  ocr_file_size?: number | null;
  ocr_mime_type?: string | null;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  issuing_organization?: string;
  certificate_number?: string;
  country?: string;
  tags?: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificateUpload {
  title: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  description_pt?: string;
  file: File;
  ocr_file?: File;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  issuing_organization?: string;
  certificate_number?: string;
  country?: string;
  tags?: string[];
}

export interface CertificateUpdate {
  title: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  description_pt?: string;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  issuing_organization?: string;
  certificate_number?: string;
  country?: string;
  tags?: string[];
}

export interface RejectedCertificateRecreate {
  title: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  description_pt?: string;
  file?: File;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  ocr_file?: File;
  ocr_file_name?: string;
  ocr_file_path?: string;
  ocr_file_size?: number;
  ocr_mime_type?: string;
  issued_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  issuing_organization?: string;
  certificate_number?: string;
  country?: string;
  tags?: string[];
}

export const useCertificates = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return "Erro desconhecido";
  };

  // Fetch all approved certificates (for Certificates page)
  const fetchCertificates = async () => {
    if (!user) {
      setCertificates([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await apiClient
        .from('certificates')
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCertificates(data || []);
    } catch (error: any) {
      // Only show error if user is still authenticated
      if (user && error?.message !== 'Load failed') {
        toast({
          title: "Erro ao carregar certificados",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Upload certificate
  const uploadCertificate = async (certificateData: CertificateUpload): Promise<Certificate | null> => {
    try {
      setUploading(true);
      const { data: { user } } = await apiClient.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload file to storage
      const fileExt = certificateData.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await apiClient.storage
        .from('certificates')
        .upload(filePath, certificateData.file);

      if (uploadError) throw uploadError;

      let ocrFilePath: string | null = null;
      let ocrFileName: string | null = null;
      let ocrFileSize: number | null = null;
      let ocrMimeType: string | null = null;

      if (certificateData.ocr_file) {
        const ocrFileExt = certificateData.ocr_file.name.split('.').pop();
        const generatedOcrFileName = `${Date.now()}-ocr.${ocrFileExt}`;
        ocrFilePath = `${user.id}/${generatedOcrFileName}`;

        const { error: uploadOcrError } = await apiClient.storage
          .from('certificates')
          .upload(ocrFilePath, certificateData.ocr_file);

        if (uploadOcrError) throw uploadOcrError;

        ocrFileName = certificateData.ocr_file.name;
        ocrFileSize = certificateData.ocr_file.size;
        ocrMimeType = certificateData.ocr_file.type;
      }

      // Create database record
      const { data, error } = await apiClient
        .from('certificates')
        .insert({
          user_id: user.id,
          title: certificateData.title,
          description: certificateData.description,
          description_en: certificateData.description_en,
          description_es: certificateData.description_es,
          description_pt: certificateData.description_pt,
          file_name: certificateData.file.name,
          file_path: filePath,
          file_size: certificateData.file.size,
          mime_type: certificateData.file.type,
          ocr_file_name: ocrFileName,
          ocr_file_path: ocrFilePath,
          ocr_file_size: ocrFileSize,
          ocr_mime_type: ocrMimeType,
          issued_date: certificateData.issued_date || null,
          contract_start_date: certificateData.contract_start_date || null,
          contract_end_date: certificateData.contract_end_date || null,
          issuing_organization: certificateData.issuing_organization,
          certificate_number: certificateData.certificate_number,
          country: certificateData.country,
          tags: certificateData.tags,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Certificado enviado com sucesso",
        description: `${certificateData.title} foi adicionado aos seus certificados.`,
      });

      await fetchCertificates(); // Refresh list
      return data;
    } catch (error) {
      toast({
        title: "Erro ao enviar certificado",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const recreateRejectedCertificate = async (certificateData: RejectedCertificateRecreate): Promise<Certificate | null> => {
    try {
      setUploading(true);
      const { data: { user } } = await apiClient.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      let filePath = certificateData.file_path || '';
      let fileName = certificateData.file_name || '';
      let fileSize = certificateData.file_size || 0;
      let mimeType = certificateData.mime_type || 'application/pdf';
      let ocrFilePath = certificateData.ocr_file_path || '';
      let ocrFileName = certificateData.ocr_file_name || '';
      let ocrFileSize = certificateData.ocr_file_size || 0;
      let ocrMimeType = certificateData.ocr_mime_type || '';

      if (certificateData.file) {
        const fileExt = certificateData.file.name.split('.').pop();
        const generatedFileName = `${Date.now()}.${fileExt}`;
        filePath = `${user.id}/${generatedFileName}`;

        const { error: uploadError } = await apiClient.storage
          .from('certificates')
          .upload(filePath, certificateData.file);

        if (uploadError) throw uploadError;

        fileName = certificateData.file.name;
        fileSize = certificateData.file.size;
        mimeType = certificateData.file.type;
      }

      if (certificateData.ocr_file) {
        const fileExt = certificateData.ocr_file.name.split('.').pop();
        const generatedFileName = `${Date.now()}-ocr.${fileExt}`;
        ocrFilePath = `${user.id}/${generatedFileName}`;

        const { error: uploadOcrError } = await apiClient.storage
          .from('certificates')
          .upload(ocrFilePath, certificateData.ocr_file);

        if (uploadOcrError) throw uploadOcrError;

        ocrFileName = certificateData.ocr_file.name;
        ocrFileSize = certificateData.ocr_file.size;
        ocrMimeType = certificateData.ocr_file.type;
      }

      if (!filePath || !fileName) {
        throw new Error('Nenhum PDF disponível para recriar o certificado.');
      }

      const { data, error } = await apiClient
        .from('certificates')
        .insert({
          user_id: user.id,
          title: certificateData.title,
          description: certificateData.description,
          description_en: certificateData.description_en,
          description_es: certificateData.description_es,
          description_pt: certificateData.description_pt,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          mime_type: mimeType,
          ocr_file_name: ocrFileName || null,
          ocr_file_path: ocrFilePath || null,
          ocr_file_size: ocrFileSize || null,
          ocr_mime_type: ocrMimeType || null,
          issued_date: certificateData.issued_date || null,
          contract_start_date: certificateData.contract_start_date || null,
          contract_end_date: certificateData.contract_end_date || null,
          issuing_organization: certificateData.issuing_organization,
          certificate_number: certificateData.certificate_number,
          country: certificateData.country,
          tags: certificateData.tags,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Certificado reenviado com sucesso",
        description: `${certificateData.title} foi reenviado para aprovação.`,
      });

      await fetchCertificates();
      return data;
    } catch (error) {
      toast({
        title: "Erro ao recriar certificado rejeitado",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Update certificate
  const updateCertificate = async (id: string, certificateData: CertificateUpdate): Promise<Certificate | null> => {
    try {
      const { data, error } = await apiClient
        .from('certificates')
        .update({
          title: certificateData.title,
          description: certificateData.description,
          description_en: certificateData.description_en,
          description_es: certificateData.description_es,
          description_pt: certificateData.description_pt,
          issued_date: certificateData.issued_date || null,
          contract_start_date: certificateData.contract_start_date || null,
          contract_end_date: certificateData.contract_end_date || null,
          issuing_organization: certificateData.issuing_organization,
          certificate_number: certificateData.certificate_number,
          country: certificateData.country,
          tags: certificateData.tags,
          is_verified: false, // Reset verification status when edited
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Certificado atualizado com sucesso",
        description: `${certificateData.title} foi atualizado e enviado novamente para aprovação.`,
      });

      await fetchCertificates(); // Refresh list
      return data;
    } catch (error) {
      toast({
        title: "Erro ao atualizar certificado",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete certificate
  const deleteCertificate = async (id: string): Promise<boolean> => {
    try {
      const certificate = certificates.find(cert => cert.id === id);
      if (!certificate) return false;

      // Delete from storage
      const { error: storageError } = await apiClient.storage
        .from('certificates')
        .remove([certificate.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await apiClient
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Certificado removido",
        description: "O certificado foi removido com sucesso.",
      });

      await fetchCertificates(); // Refresh list
      return true;
    } catch (error) {
      toast({
        title: "Erro ao remover certificado",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  // Get download URL
  const getDownloadUrl = async (filePath: string, fileName?: string): Promise<string | null> => {
    try {
      const { data, error } = await apiClient.storage
        .from('certificates')
        .createSignedUrl(filePath, 3600, { fileName }); // 1 hour expiry

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        return data.signedUrl;
      }
      
      return null;
    } catch (error) {
      toast({
        title: "Erro ao gerar link",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  // Get rejected certificate data for editing
  const getRejectedCertificateData = async (certificateId: string, certificateType: 'certificate' | 'professional_certificate'): Promise<any | null> => {
    try {
      // Get rejection data
      const { data: rejectionData, error: rejectionError } = await apiClient
        .from('certificate_rejections')
        .select('*')
        .eq('certificate_id', certificateId)
        .eq('certificate_type', certificateType)
        .single();

      if (rejectionError) throw rejectionError;

      const snapshot = rejectionData.snapshot || {};
      const hasSnapshot = Object.keys(snapshot).length > 0;

      // Rehydrate the original user submission so the dialog opens in edit mode.
      const mockCertificate = {
        id: certificateId,
        user_id: rejectionData.user_id,
        title: snapshot.title || rejectionData.original_title || 'Certificado Rejeitado',
        description: snapshot.description || '',
        description_pt: snapshot.description_pt || '',
        description_en: snapshot.description_en || '',
        description_es: snapshot.description_es || '',
        file_name: snapshot.file_name || 'certificado_rejeitado.pdf',
        file_path: snapshot.file_path || '',
        file_size: snapshot.file_size || 0,
        mime_type: snapshot.mime_type || 'application/pdf',
        ocr_file_name: snapshot.ocr_file_name || '',
        ocr_file_path: snapshot.ocr_file_path || '',
        ocr_file_size: snapshot.ocr_file_size || 0,
        ocr_mime_type: snapshot.ocr_mime_type || '',
        issued_date: snapshot.issued_date || null,
        contract_start_date: snapshot.contract_start_date || null,
        contract_end_date: snapshot.contract_end_date || null,
        issuing_organization: snapshot.issuing_organization || '',
        certificate_number: snapshot.certificate_number || '',
        country: snapshot.country || '',
        tags: snapshot.tags || [],
        is_verified: false, // Will be false when recreated
        created_at: rejectionData.created_at,
        updated_at: rejectionData.created_at,
        _isFromRejection: true, // Flag to indicate this is from rejection data
        _rejectionId: rejectionData.id,
        _rejectionReason: rejectionData.rejection_reason,
        _hasIncompleteSnapshot: !hasSnapshot,
      };

      return mockCertificate;
    } catch (error) {
      toast({
        title: "Erro ao carregar dados do certificado rejeitado",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchCertificates();
    }
    // Reset certificates when user logs out
    if (!authLoading && !user) {
      setCertificates([]);
    }
  }, [user, authLoading]);

  return {
    certificates,
    loading,
    uploading,
    uploadCertificate,
    recreateRejectedCertificate,
    updateCertificate,
    deleteCertificate,
    getDownloadUrl,
    refetch: fetchCertificates,
    getRejectedCertificateData,
  };
};
