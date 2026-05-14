import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'hsl(218,16%,11%)' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-9 h-9 text-red-400" />
        </div>
        <h1 className="text-6xl font-bold mb-3" style={{
          background: 'linear-gradient(135deg,#60a5fa,#818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          404
        </h1>
        <p className="text-lg font-semibold text-foreground mb-2">Página no encontrada</p>
        <p className="text-sm text-foreground-muted mb-8">
          La ruta <code className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> no existe.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}
        >
          <Home className="w-4 h-4" />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
