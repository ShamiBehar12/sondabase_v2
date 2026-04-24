import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

interface UserPreferences {
  certificates_view_mode: 'grid' | 'list';
  language_preference: string;
  full_name: string;
  avatar_url: string;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    certificates_view_mode: 'grid',
    language_preference: 'pt',
    full_name: '',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      // Reset preferences when user logs out
      setPreferences({
        certificates_view_mode: 'grid',
        language_preference: 'pt',
        full_name: '',
        avatar_url: ''
      });
      setLoading(false);
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await apiClient
        .from('profiles')
        .select('certificates_view_mode, language_preference, full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // Silently fail - preferences will use defaults
        return;
      }

      if (data) {
        setPreferences({
          certificates_view_mode: (data.certificates_view_mode === 'grid' || data.certificates_view_mode === 'list') 
            ? data.certificates_view_mode 
            : 'grid',
          language_preference: data.language_preference || 'pt',
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      // Silently fail - preferences will use defaults
    } finally {
      setLoading(false);
    }
  };

  return {
    preferences,
    loading,
    refetch: fetchPreferences
  };
};
