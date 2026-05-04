import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { BarChart3, Clock, Brain, Upload, MousePointerClick, Users } from "lucide-react";

interface UserStat {
  userId: string;
  name: string;
  email: string;
  sessions: number;
  pageVisits: number;
  avgTimeSec: number;
  totalTimeSec: number;
  aiQueries: number;
  avgAiMs: number;
  uploads: number;
  avgUploadMs: number;
  tabClicks: number;
}

interface PageStat {
  page: string;
  visits: number;
  avgTimeSec: number;
}

interface TabStat {
  tab: string;
  count: number;
}

interface Summary {
  users: UserStat[];
  topPages: PageStat[];
  topTabs: TabStat[];
  hourlyActivity: number[];
  totalEvents: number;
}

function fmt(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function fmtSec(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function pageName(path: string) {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/certificates': 'Certificados',
    '/my-certificates': 'Mis Certificados',
    '/ai-chat': 'Asistente IA',
    '/certificate-approval': 'Aprobación',
    '/users': 'Usuarios',
    '/settings': 'Configuración',
  };
  return map[path] ?? path;
}

export default function Analytics() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!userRole) return;
    apiFetch<{ data: Summary; error: null }>('/api/usage/summary')
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userRole, navigate]);

  if (!userRole || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-foreground-muted text-center">
        No se pudo cargar la analítica.
      </div>
    );
  }

  const totalSessions = summary.users.reduce((a, u) => a + u.sessions, 0);
  const totalAiQueries = summary.users.reduce((a, u) => a + u.aiQueries, 0);
  const totalUploads = summary.users.reduce((a, u) => a + u.uploads, 0);
  const avgAiMs = totalAiQueries > 0
    ? Math.round(summary.users.reduce((a, u) => a + u.totalAiMs, 0) / totalAiQueries)
    : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalAiMsAll = summary.users.reduce((a: number, u: any) => a + (u.totalAiMs ?? 0), 0);

  const maxHourly = Math.max(...summary.hourlyActivity, 1);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Analítica de uso
        </h1>
        <p className="text-foreground-muted text-sm mt-1">
          {summary.totalEvents.toLocaleString()} eventos registrados
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sesiones totales', value: totalSessions, icon: Users, color: 'text-blue-400' },
          { label: 'Consultas IA', value: totalAiQueries, icon: Brain, color: 'text-purple-400' },
          { label: 'Tiempo prom. IA', value: fmt(avgAiMs), icon: Clock, color: 'text-yellow-400' },
          { label: 'Subidas', value: totalUploads, icon: Upload, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4">
            <div className="p-2 bg-white/5 rounded-lg">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-foreground-muted">{label}</p>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-user table */}
      <div className="premium-card p-6">
        <h2 className="text-sm font-semibold text-foreground-secondary mb-4 uppercase tracking-wider">
          Actividad por usuario
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-foreground-muted text-xs uppercase tracking-wider">
                <th className="text-left pb-3 pr-4">Usuario</th>
                <th className="text-right pb-3 px-3">Sesiones</th>
                <th className="text-right pb-3 px-3">Páginas</th>
                <th className="text-right pb-3 px-3">Tiempo prom./pág.</th>
                <th className="text-right pb-3 px-3">Tiempo total</th>
                <th className="text-right pb-3 px-3">Consultas IA</th>
                <th className="text-right pb-3 px-3">Prom. IA</th>
                <th className="text-right pb-3 px-3">Subidas</th>
                <th className="text-right pb-3 pl-3">Clicks tabs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.users.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-foreground-muted">
                    Sin datos aún. Los eventos se registran al navegar por la app.
                  </td>
                </tr>
              )}
              {summary.users
                .sort((a, b) => b.sessions - a.sessions)
                .map((u) => (
                  <tr key={u.userId} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-xs text-foreground-muted">{u.email}</p>
                    </td>
                    <td className="text-right px-3 text-foreground-secondary">{u.sessions}</td>
                    <td className="text-right px-3 text-foreground-secondary">{u.pageVisits}</td>
                    <td className="text-right px-3 text-foreground-secondary">{fmtSec(u.avgTimeSec)}</td>
                    <td className="text-right px-3 text-foreground-secondary">{fmtSec(u.totalTimeSec)}</td>
                    <td className="text-right px-3 text-foreground-secondary">{u.aiQueries}</td>
                    <td className="text-right px-3">
                      <span className={u.avgAiMs > 10000 ? 'text-yellow-400' : 'text-green-400'}>
                        {u.aiQueries > 0 ? fmt(u.avgAiMs) : '—'}
                      </span>
                    </td>
                    <td className="text-right px-3 text-foreground-secondary">{u.uploads}</td>
                    <td className="text-right pl-3 text-foreground-secondary">{u.tabClicks}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top pages */}
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground-secondary mb-4 uppercase tracking-wider">
            Páginas más visitadas
          </h2>
          <div className="space-y-3">
            {summary.topPages.length === 0 && (
              <p className="text-foreground-muted text-sm">Sin datos aún.</p>
            )}
            {summary.topPages.map((p) => (
              <div key={p.page} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{pageName(p.page)}</p>
                  <p className="text-xs text-foreground-muted">{p.page}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-foreground-secondary">{p.visits} visitas</p>
                  <p className="text-xs text-foreground-muted">{fmtSec(p.avgTimeSec)} prom.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top tabs */}
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground-secondary mb-4 uppercase tracking-wider flex items-center gap-2">
            <MousePointerClick className="w-4 h-4" />
            Tabs más clickeadas
          </h2>
          <div className="space-y-3">
            {summary.topTabs.length === 0 && (
              <p className="text-foreground-muted text-sm">Sin datos aún.</p>
            )}
            {summary.topTabs.map((t) => (
              <div key={t.tab} className="flex items-center justify-between">
                <p className="text-sm text-white capitalize">{t.tab}</p>
                <span className="text-sm font-medium text-foreground-secondary">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly heatmap */}
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground-secondary mb-4 uppercase tracking-wider">
            Actividad por hora (últimos 7 días)
          </h2>
          <div className="flex items-end gap-1 h-24">
            {summary.hourlyActivity.map((count, hour) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary/80 transition-all"
                  style={{ height: `${Math.round((count / maxHourly) * 80)}px`, minHeight: count > 0 ? 2 : 0 }}
                  title={`${hour}:00 — ${count} eventos`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-foreground-muted mt-1">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      </div>

      {/* AI timing detail */}
      {totalAiQueries > 0 && (
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground-secondary mb-4 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Detalle de tiempos — Asistente IA
          </h2>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-foreground-muted">Total consultas</p>
              <p className="text-2xl font-bold text-white">{totalAiQueries}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Tiempo promedio</p>
              <p className="text-2xl font-bold text-white">{fmt(avgAiMs)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">Tiempo total acumulado</p>
              <p className="text-2xl font-bold text-white">{fmt(totalAiMsAll)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
