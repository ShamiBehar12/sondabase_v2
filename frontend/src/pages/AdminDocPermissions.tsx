import { useEffect, useState } from "react";
import { Shield, User, Save, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { apiFetch, apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
}

interface DocAccessFilters {
  countries?: string[];
  docTypes?: string[];
  clients?: string[];
  apostilledOnly?: boolean;
}

interface DocAccess {
  userId: string;
  allowAll: boolean;
  filters: DocAccessFilters | null;
}

interface RacerDoc {
  id: string;
  source_file: string;
  doc_type?: string;
  client?: string;
  country?: string;
  year?: number;
  is_apostilled?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:     { label: "Admin",      color: "text-red-400 bg-red-400/10 border-red-400/20" },
  moderator: { label: "Moderador",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  user:      { label: "Usuario",    color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
};

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)].filter(Boolean).sort() as T[];
}

function MultiCheckbox({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5 hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
        {selected.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-1 pl-4 max-h-40 overflow-y-auto">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer py-0.5 group">
              <input
                type="checkbox"
                className="accent-primary w-3 h-3"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  onChange(e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt));
                }}
              />
              <span className="text-foreground-muted group-hover:text-foreground transition-colors truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDocPermissions() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [docs, setDocs] = useState<RacerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [access, setAccess] = useState<DocAccess | null>(null);
  const [saving, setSaving] = useState(false);

  // Derived metadata options from RACER docs
  const allCountries = unique(docs.map((d) => d.country ?? "").filter(Boolean));
  const allDocTypes  = unique(docs.map((d) => d.doc_type ?? "").filter(Boolean));
  const allClients   = unique(docs.map((d) => d.client ?? "").filter(Boolean));

  useEffect(() => {
    Promise.all([
      apiClient.functions.invoke("get-users-with-emails"),
      apiFetch<RacerDoc[]>("/api/racer/documents"),
    ]).then(([usersRes, docsRes]) => {
      const rawUsers: any[] = usersRes.data || [];
      setUsers(rawUsers.map((u: any) => ({
        id: u.user_id,
        email: u.email,
        fullName: u.full_name || null,
        role: u.role || "user",
      })));
      if (docsRes.data) setDocs(docsRes.data as any);
    }).finally(() => setLoading(false));
  }, []);

  const selectUser = async (u: UserProfile) => {
    setSelected(u);
    const { data } = await apiFetch<DocAccess>(`/api/admin/doc-access/${u.id}`);
    setAccess(data ?? { userId: u.id, allowAll: true, filters: null });
  };

  const setFilter = (key: keyof DocAccessFilters, val: any) => {
    setAccess((prev) =>
      prev ? { ...prev, filters: { ...(prev.filters ?? {}), [key]: val } } : prev,
    );
  };

  const handleSave = async () => {
    if (!access || !selected) return;
    setSaving(true);
    const { error } = await apiFetch(`/api/admin/doc-access/${selected.id}`, {
      method: "PUT",
      body: { allowAll: access.allowAll, filters: access.allowAll ? null : access.filters },
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Permisos guardados", description: `Configuración actualizada para ${selected.email}` });
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.fullName ?? "").toLowerCase().includes(q);
  });

  const filters = access?.filters ?? {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Permisos Documentales
        </h1>
        <p className="text-foreground-muted text-sm mt-1">
          Configura qué documentos del RAG puede acceder cada usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-[calc(100vh-220px)]">
        {/* User list */}
        <div className="premium-card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <Input
                placeholder="Buscar usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm bg-background/50 pl-8"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-24 text-foreground-muted text-sm">Cargando...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-foreground-muted text-sm">Sin resultados</div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-white/[0.04] border-b border-border/20 last:border-0 ${
                    selected?.id === u.id ? "bg-primary/10 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {u.fullName || u.email}
                    </p>
                    {u.fullName && (
                      <p className="text-[10px] text-foreground-muted truncate">{u.email}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${(ROLE_LABELS[u.role] ?? ROLE_LABELS.user).color}`}>
                    {(ROLE_LABELS[u.role] ?? ROLE_LABELS.user).label}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Permissions panel */}
        <div className="premium-card flex flex-col overflow-hidden">
          {!selected || !access ? (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground-muted gap-2">
              <Shield className="w-12 h-12 opacity-20" />
              <p className="text-sm">Selecciona un usuario para configurar sus permisos</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selected.fullName || selected.email}</p>
                  <p className="text-xs text-foreground-muted">{selected.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded border font-semibold ${(ROLE_LABELS[selected.role] ?? ROLE_LABELS.user).color}`}>
                  {(ROLE_LABELS[selected.role] ?? ROLE_LABELS.user).label}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Allow all toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/30">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Acceso completo</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {access.allowAll
                        ? "El usuario puede ver todos los documentos del RAG."
                        : "Solo puede ver documentos que cumplan los filtros configurados."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccess((prev) => prev ? { ...prev, allowAll: !prev.allowAll } : prev)}
                    className="flex-shrink-0 ml-4"
                  >
                    {access.allowAll ? (
                      <ToggleRight className="w-8 h-8 text-primary" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-foreground-muted" />
                    )}
                  </button>
                </div>

                {/* Filters — only when not allowAll */}
                {!access.allowAll && (
                  <div className="space-y-4 p-3 rounded-xl border border-border/40 bg-background/20">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Filtros activos
                    </p>

                    {/* Apostillado */}
                    <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-primary w-3.5 h-3.5"
                        checked={!!filters.apostilledOnly}
                        onChange={(e) => setFilter("apostilledOnly", e.target.checked || undefined)}
                      />
                      <span className="text-foreground-muted text-xs">Solo documentos apostillados</span>
                    </label>

                    {/* Countries */}
                    {allCountries.length > 0 && (
                      <MultiCheckbox
                        label="Países"
                        options={allCountries}
                        selected={filters.countries ?? []}
                        onChange={(v) => setFilter("countries", v.length ? v : undefined)}
                      />
                    )}

                    {/* Doc types */}
                    {allDocTypes.length > 0 && (
                      <MultiCheckbox
                        label="Tipo de documento"
                        options={allDocTypes}
                        selected={filters.docTypes ?? []}
                        onChange={(v) => setFilter("docTypes", v.length ? v : undefined)}
                      />
                    )}

                    {/* Clients */}
                    {allClients.length > 0 && (
                      <MultiCheckbox
                        label="Cliente / Organización"
                        options={allClients}
                        selected={filters.clients ?? []}
                        onChange={(v) => setFilter("clients", v.length ? v : undefined)}
                      />
                    )}

                    {/* Summary of active filters */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {(filters.countries ?? []).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                      {(filters.docTypes ?? []).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                      {(filters.clients ?? []).map((cl) => (
                        <Badge key={cl} className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-400/20">{cl}</Badge>
                      ))}
                      {filters.apostilledOnly && (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-400/20">Apostillados</Badge>
                      )}
                      {!filters.countries?.length && !filters.docTypes?.length && !filters.clients?.length && !filters.apostilledOnly && (
                        <p className="text-xs text-foreground-muted italic">Sin filtros — el usuario no podrá ver ningún documento.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="p-4 border-t border-border/40">
                <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar permisos"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
