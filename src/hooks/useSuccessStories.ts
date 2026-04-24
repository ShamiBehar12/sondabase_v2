import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SuccessStory {
  id: string;
  user_id: string;
  title_pt?: string;
  title_en?: string;
  title_es?: string;
  client_pt?: string;
  client_en?: string;
  client_es?: string;
  country_pt?: string;
  country_en?: string;
  country_es?: string;
  product_pt?: string;
  product_en?: string;
  product_es?: string;
  challenge_pt?: string;
  challenge_en?: string;
  challenge_es?: string;
  solution_pt?: string;
  solution_en?: string;
  solution_es?: string;
  benefits_pt?: string;
  benefits_en?: string;
  benefits_es?: string;
  contract_period?: string;
  contract_value?: string;
  closure_year?: string;
  client_logo?: string;
  image_01?: string;
  image_02?: string;
  image_03?: string;
  image_04?: string;
  tags?: string[];
  status: 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SuccessStoryUpload {
  title_pt?: string;
  title_en?: string;
  title_es?: string;
  client_pt?: string;
  client_en?: string;
  client_es?: string;
  country?: string;
  product_pt?: string;
  product_en?: string;
  product_es?: string;
  challenge_pt?: string;
  challenge_en?: string;
  challenge_es?: string;
  solution_pt?: string;
  solution_en?: string;
  solution_es?: string;
  benefits_pt?: string;
  benefits_en?: string;
  benefits_es?: string;
  contract_period?: string;
  contract_value?: string;
  closure_year?: string;
  client_logo?: File;
  image_01?: File;
  image_02?: File;
  image_03?: File;
  image_04?: File;
  tags?: string[];
}

export interface SuccessStoryUpdate {
  title_pt?: string;
  title_en?: string;
  title_es?: string;
  client_pt?: string;
  client_en?: string;
  client_es?: string;
  country?: string;
  product_pt?: string;
  product_en?: string;
  product_es?: string;
  challenge_pt?: string;
  challenge_en?: string;
  challenge_es?: string;
  solution_pt?: string;
  solution_en?: string;
  solution_es?: string;
  benefits_pt?: string;
  benefits_en?: string;
  benefits_es?: string;
  contract_period?: string;
  contract_value?: string;
  closure_year?: string;
  tags?: string[];
}

export const useSuccessStories = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Fetch all approved success stories
  const fetchSuccessStories = async () => {
    if (!user) {
      setStories([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await apiClient
        .from('success_stories')
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database status to interface status
      const mappedStories = (data || []).map(story => ({
        ...story,
        status: story.status as 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado'
      }));
      
      setStories(mappedStories);
    } catch (error: any) {
      if (user && error?.message !== 'Load failed') {
        toast({
          title: "Erro ao carregar histórias de sucesso",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  // Upload images to storage
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${folder}/${fileName}`;

      const { error: uploadError } = await apiClient.storage
        .from('certificates') // Using same bucket
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Upload success story
  const uploadSuccessStory = async (storyData: SuccessStoryUpload): Promise<SuccessStory | null> => {
    try {
      setUploading(true);
      const { data: { user } } = await apiClient.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload images
      const uploadPromises = [];
      const imageFields = ['client_logo', 'image_01', 'image_02', 'image_03', 'image_04'] as const;
      const uploadedPaths: Record<string, string | undefined> = {};

      for (const field of imageFields) {
        const file = storyData[field];
        if (file) {
          uploadPromises.push(
            uploadImage(file, field).then(path => {
              if (path) uploadedPaths[field] = path;
            })
          );
        }
      }

      await Promise.all(uploadPromises);

      // Create database record
      const { data, error } = await apiClient
        .from('success_stories')
        .insert({
          user_id: user.id,
          title_pt: storyData.title_pt,
          title_en: storyData.title_en,
          title_es: storyData.title_es,
        client_pt: storyData.client_pt,
        client_en: storyData.client_en,
        client_es: storyData.client_es,
        country_pt: storyData.country, // Mapear para country_pt no banco
        country_en: null,
        country_es: null,
        product_pt: storyData.product_pt,
        product_en: storyData.product_en,
        product_es: storyData.product_es,
          challenge_pt: storyData.challenge_pt,
          challenge_en: storyData.challenge_en,
          challenge_es: storyData.challenge_es,
          solution_pt: storyData.solution_pt,
          solution_en: storyData.solution_en,
          solution_es: storyData.solution_es,
          benefits_pt: storyData.benefits_pt,
          benefits_en: storyData.benefits_en,
          benefits_es: storyData.benefits_es,
          contract_period: storyData.contract_period,
          contract_value: storyData.contract_value,
          closure_year: storyData.closure_year,
          client_logo: uploadedPaths.client_logo,
          image_01: uploadedPaths.image_01,
          image_02: uploadedPaths.image_02,
          image_03: uploadedPaths.image_03,
          image_04: uploadedPaths.image_04,
          tags: storyData.tags,
          status: 'em_revisao',
          is_verified: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "História de sucesso enviada",
        description: "Sua história foi enviada e está aguardando aprovação.",
      });

      await fetchSuccessStories(); 
      return data;
    } catch (error) {
      toast({
        title: "Erro ao enviar história",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Update success story
  const updateSuccessStory = async (id: string, storyData: SuccessStoryUpdate): Promise<SuccessStory | null> => {
    try {
      const { data, error } = await apiClient
        .from('success_stories')
        .update({
          title_pt: storyData.title_pt,
          title_en: storyData.title_en,
          title_es: storyData.title_es,
        client_pt: storyData.client_pt,
        client_en: storyData.client_en,
        client_es: storyData.client_es,
        country_pt: storyData.country, // Mapear para country_pt no banco
        country_en: null,
        country_es: null,
        product_pt: storyData.product_pt,
        product_en: storyData.product_en,
        product_es: storyData.product_es,
          challenge_pt: storyData.challenge_pt,
          challenge_en: storyData.challenge_en,
          challenge_es: storyData.challenge_es,
          solution_pt: storyData.solution_pt,
          solution_en: storyData.solution_en,
          solution_es: storyData.solution_es,
          benefits_pt: storyData.benefits_pt,
          benefits_en: storyData.benefits_en,
          benefits_es: storyData.benefits_es,
          contract_period: storyData.contract_period,
          contract_value: storyData.contract_value,
          closure_year: storyData.closure_year,
          tags: storyData.tags,
          status: 'em_revisao',
          is_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "História atualizada",
        description: "Sua história foi atualizada e enviada novamente para aprovação.",
      });

      await fetchSuccessStories();
      return data;
    } catch (error) {
      toast({
        title: "Erro ao atualizar história",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete success story
  const deleteSuccessStory = async (id: string): Promise<boolean> => {
    try {
      const story = stories.find(s => s.id === id);
      if (!story) return false;

      // Delete images from storage
      const imageFields = ['client_logo', 'image_01', 'image_02', 'image_03', 'image_04'];
      const deletePromises = imageFields
        .map(field => story[field as keyof SuccessStory])
        .filter(Boolean)
        .map(path => 
          apiClient.storage
            .from('certificates')
            .remove([path as string])
        );

      await Promise.all(deletePromises);

      // Delete from database
      const { error } = await apiClient
        .from('success_stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "História removida",
        description: "A história de sucesso foi removida com sucesso.",
      });

      await fetchSuccessStories();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao remover história",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get download URL for images
  const getImageUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await apiClient.storage
        .from('certificates')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        return data.signedUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating image URL:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchSuccessStories();
    }
    if (!authLoading && !user) {
      setStories([]);
    }
  }, [user, authLoading]);

  return {
    stories,
    loading,
    uploading,
    uploadSuccessStory,
    updateSuccessStory,
    deleteSuccessStory,
    getImageUrl,
    refetch: fetchSuccessStories,
  };
};
