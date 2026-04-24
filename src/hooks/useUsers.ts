import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  const fetchUsers = async () => {
    if (userRole !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      // Use the edge function to get users with emails
      const { data, error } = await apiClient.functions.invoke('get-users-with-emails');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'moderator' | 'user') => {
    try {
      // First, delete existing role
      await apiClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await apiClient
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const createUser = async (email: string, password: string, fullName: string, role: 'admin' | 'moderator' | 'user' = 'user') => {
    try {
      const { error } = await apiClient.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          fullName,
          role,
        },
      });

      if (error) throw error;

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete root user so profile, roles and owned records are removed together.
      const { error } = await apiClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscriptions for profiles and user_roles changes
    const profilesChannel = apiClient
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Refresh users when profiles change
          fetchUsers();
        }
      )
      .subscribe();

    const rolesChannel = apiClient
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          // Refresh users when roles change
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      apiClient.removeChannel(profilesChannel);
      apiClient.removeChannel(rolesChannel);
    };
  }, [userRole]);

  return {
    users,
    loading,
    updateUserRole,
    deleteUser,
    createUser,
    refetch: fetchUsers,
  };
}
