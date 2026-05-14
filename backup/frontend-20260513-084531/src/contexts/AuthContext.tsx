import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, type AppSession, type AppUser } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface AuthContextType {
  user: AppUser | null;
  session: AppSession | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  useTranslation();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await apiClient
        .from('user_roles')
        .select('role')
        .eq('userId', userId)
        .maybeSingle();
      
      if (error) {
        // Silently fail and return default user role
        return 'user';
      }

      return data?.role || 'user';
    } catch (error) {
      // Silently fail and return default user role
      return 'user';
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = apiClient.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch role if user exists and event is SIGNED_IN or TOKEN_REFRESHED
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          fetchUserRole(session.user.id).then(role => {
            setUserRole(role);
          });
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    apiClient.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const { data: userResponse, error } = await apiClient.auth.getUser();

      if (error || !userResponse.user) {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const validatedSession = {
        ...session,
        user: userResponse.user,
      };

      setSession(validatedSession);
      setUser(userResponse.user);

      fetchUserRole(userResponse.user.id).then(role => {
        setUserRole(role);
      });

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await apiClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error no login",
          description: error.message === "Invalid login credentials" ? "Credenciais inválidas" : error.message,
        });
      } else {
        toast({
          title: "Login realizado com éxito!",
          description: "Bem-vindo de volta.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ocorreu un error durante o login.",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await apiClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error no cadastro",
          description: error.message,
        });
      } else {
        toast({
          title: "Cadastro realizado com éxito!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ocorreu un error durante o cadastro.",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error no logout",
        description: "Ocorreu un error ao fazer logout.",
      });
    }
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
