import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type Role = 'admin' | 'moderator' | 'user' | 'reviewer';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: Role | Role[];
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const effectiveRole = (userRole || 'user') as Role;

  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasAccess = effectiveRole === 'admin' || allowed.includes(effectiveRole);
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
            <p className="text-foreground-muted">No tienes permiso para acceder a esta página.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}