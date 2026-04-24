import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all tags ordered by usage
  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await apiClient
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search tags by name
  const searchTags = async (searchTerm: string): Promise<Tag[]> => {
    try {
      const { data, error } = await apiClient
        .from('tags')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  };

  // Increment tag usage
  const incrementTagUsage = async (tagNames: string[]) => {
    try {
      for (const tagName of tagNames) {
        const { error } = await apiClient.rpc('increment_tag_usage', {
          tag_name: tagName
        });
        if (error) throw error;
      }
      // Refresh tags after incrementing
      await fetchTags();
    } catch (error) {
      console.error('Error incrementing tag usage:', error);
    }
  };

  // Get popular tags (most used)
  const getPopularTags = async (limit: number = 20): Promise<Tag[]> => {
    try {
      const { data, error } = await apiClient
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return {
    tags,
    loading,
    fetchTags,
    searchTags,
    incrementTagUsage,
    getPopularTags,
  };
};
