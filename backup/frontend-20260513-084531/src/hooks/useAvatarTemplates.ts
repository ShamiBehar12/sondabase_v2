import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface AvatarTemplate {
  id: string;
  name: string;
  file_path: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAvatarTemplates() {
  const [templates, setTemplates] = useState<AvatarTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await apiClient
        .from('avatar_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching avatar templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching avatar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (filePath: string) => {
    const { data } = apiClient.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  const uploadDefaultAvatars = async () => {
    try {
      const { data, error } = await apiClient.functions.invoke('upload-default-avatars');
      
      if (error) {
        console.error('Error uploading default avatars:', error);
        throw error;
      }

      // Refresh templates after upload
      await fetchTemplates();
      return data;
    } catch (error) {
      console.error('Error uploading default avatars:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    getAvatarUrl,
    uploadDefaultAvatars,
    refetch: fetchTemplates,
  };
}
