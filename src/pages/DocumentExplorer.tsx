import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FolderSearch, Filter, X, FileText, Award, Building2, MapPin, Tag, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExplorerDocument {
  id: string;
  type: "certificate" | "story";
  title: string;
  organization?: string;
  country?: string;
  tags?: string[];
  year?: number;
  isVerified: boolean;
  createdAt: string;
}

interface ExplorerFilters {
  search: string;
  type: string;
  country: string;
  organization: string;
  year: string;
  tags: string[];
}

const INITIAL_FILTERS: ExplorerFilters = {
  search: "",
  type: "all",
  country: "",
  organization: "",
  year: "",
  tags: [],
};

export default function DocumentExplorer() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<ExplorerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExplorerFilters>(INITIAL_FILTERS);
  const [filterOptions, setFilterOptions] = useState<{
    countries: string[];
    organizations: string[];
    years: number[];
    tags: string[];
  }>({ countries: [], organizations: [], years: [], tags: [] });
  const [showFilters, setShowFilters] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.country) params.set("country", filters.country);
    if (filters.organization) params.set("organization", filters.organization);
    if (filters.year) params.set("year", filters.year);
    if (filters.tags.length) params.set("tags", filters.tags.join(","));
    if (filters.search) params.set("search", filters.search);

    const { data } = await apiFetch<ExplorerDocument[]>(`/api/documents?${params.toString()}`);
    if (data) setDocuments(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    apiFetch<{ countries: string[]; organizations: string[]; years: number[]; tags: string[] }>(
      "/api/documents/filters"
    ).then(({ data }) => {
      if (data) setFilterOptions(data);
    });
  }, []);

  const hasActiveFilters =
    filters.type !== "all" ||
    !!filters.country ||
    !!filters.organization ||
    !!filters.year ||
    filters.tags.length > 0 ||
    !!filters.search;

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const toggleTag = (tag: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderSearch className="w-6 h-6 text-primary" />
            {t("navigation.documentExplorer")}
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            {loading ? t("common.loading") : `${documents.length} documents found`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" />
          {t("common.filter")}
          {hasActiveFilters && (
            <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary text-white">
              {[
                filters.type !== "all",
                !!filters.country,
                !!filters.organization,
                !!filters.year,
                ...filters.tags.map(() => true),
              ].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Filter sidebar */}
        {showFilters && (
          <div className="premium-card p-4 w-64 flex-shrink-0 space-y-5 h-fit sticky top-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {t("common.filter")}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-foreground-muted hover:text-error flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  {t("common.clear")}
                </button>
              )}
            </div>

            {/* Search */}
            <div>
              <Label className="text-xs text-foreground-muted mb-1.5 block">{t("common.search")}</Label>
              <Input
                placeholder="Title, organization..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-8 text-sm bg-background/50"
              />
            </div>

            {/* Type */}
            <div>
              <Label className="text-xs text-foreground-muted mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Type
              </Label>
              <Select
                value={filters.type}
                onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger className="h-8 text-sm bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="certificate">Certificates</SelectItem>
                  <SelectItem value="story">Success Stories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            {filterOptions.countries.length > 0 && (
              <div>
                <Label className="text-xs text-foreground-muted mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {t("common.country")}
                </Label>
                <Select
                  value={filters.country || "__all__"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, country: v === "__all__" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-sm bg-background/50">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All countries</SelectItem>
                    {filterOptions.countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Organization */}
            {filterOptions.organizations.length > 0 && (
              <div>
                <Label className="text-xs text-foreground-muted mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {t("common.organization")}
                </Label>
                <Select
                  value={filters.organization || "__all__"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, organization: v === "__all__" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-sm bg-background/50">
                    <SelectValue placeholder="All organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All organizations</SelectItem>
                    {filterOptions.organizations.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Year */}
            {filterOptions.years.length > 0 && (
              <div>
                <Label className="text-xs text-foreground-muted mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Year
                </Label>
                <Select
                  value={filters.year || "__all__"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, year: v === "__all__" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-sm bg-background/50">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All years</SelectItem>
                    {filterOptions.years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            {filterOptions.tags.length > 0 && (
              <div>
                <Label className="text-xs text-foreground-muted mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {t("common.tags")}
                </Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {filterOptions.tags.map((tag) => (
                    <div key={tag} className="flex items-center gap-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                        className="h-3.5 w-3.5"
                      />
                      <Label htmlFor={`tag-${tag}`} className="text-xs text-foreground-secondary cursor-pointer">
                        {tag}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="premium-card flex items-center justify-center h-48 text-foreground-muted">
              {t("common.loading")}
            </div>
          ) : documents.length === 0 ? (
            <div className="premium-card flex flex-col items-center justify-center h-48 text-foreground-muted gap-2">
              <FolderSearch className="w-10 h-10 opacity-30" />
              <p className="text-sm">No documents found</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div
                  key={`${doc.type}-${doc.id}`}
                  className="premium-card p-4 flex flex-col gap-2 hover:border-white/[0.13] transition-colors cursor-default"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {doc.type === "story" ? (
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Award className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 capitalize border-border/60 text-foreground-muted"
                    >
                      {doc.type === "story" ? "Story" : "Certificate"}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                      {doc.title}
                    </p>
                  </div>

                  <div className="space-y-1 mt-auto">
                    {doc.organization && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{doc.organization}</span>
                      </div>
                    )}
                    {doc.country && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{doc.country}</span>
                      </div>
                    )}
                    {doc.year && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{doc.year}</span>
                      </div>
                    )}
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
                      {doc.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-foreground-muted border border-border/30"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 4 && (
                        <span className="text-[10px] text-foreground-muted">+{doc.tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
