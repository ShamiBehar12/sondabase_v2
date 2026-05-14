import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'admin' | 'moderator' | 'user' | 'reviewer';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#171C25_0%,#1D2430_100%)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Permitir acesso se no há role obrigatório o se o userRole é válido
  // Fallback para 'user' se userRole for null
  const effectiveRole = userRole || 'user';
  
  if (requireRole && effectiveRole !== requireRole && effectiveRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#171C25_0%,#1D2430_100%)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#F3F7FC] mb-2">Acesso Negado</h1>
          <p className="text-white">No tienes permiso para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

