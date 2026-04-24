import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Grid3x3, LayoutList } from 'lucide-react';
import { CertificateUploadForm } from '@/components/certificates/CertificateUploadForm';
import { CertificateList } from '@/components/certificates/CertificateList';
import { useCertificates } from '@/hooks/useCertificates';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Certificates() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [openCertificateId, setOpenCertificateId] = useState<string | null>(null);
  const { certificates } = useCertificates();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Update viewMode when preferences are loaded
  useEffect(() => {
    if (!preferencesLoading && preferences.certificates_view_mode) {
      setViewMode(preferences.certificates_view_mode);
    }
  }, [preferences.certificates_view_mode, preferencesLoading]);

  // Verificar se foi passado um ID de certificado para abrir
  useEffect(() => {
    if (location.state?.openCertificateId) {
      setOpenCertificateId(location.state.openCertificateId);
      // Limpar o estado para evitar que fique persistente
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Extract all unique tags from certificates
  const allTags = Array.from(
    new Set(certificates.flatMap(cert => cert.tags || []))
  ).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">{t('certificates.title')}</h2>
          <p className="text-foreground-muted mt-2">{t('certificates.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6" value={showUploadForm ? "upload" : "list"} onValueChange={(value) => setShowUploadForm(value === "upload")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('certificates.listTab')}
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('certificates.addTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <CertificateUploadForm onSuccess={() => setShowUploadForm(false)} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* View Mode Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground-muted">{t('common.view')}:</span>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-none"
                >
                  <Grid3x3 className="h-4 w-4 mr-1" />
                  {t('certificates.gridView')}
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-none"
                >
                  <LayoutList className="h-4 w-4 mr-1" />
                  {t('certificates.listView')}
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('certificates.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {(searchTerm || selectedTags.length > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  {t('common.clear')}
                </Button>
              )}
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('common.filter')} {t('common.tags')}:</p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Active Filters */}
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('common.tags')}:</span>
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => toggleTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Certificate List */}
          <CertificateList 
            searchTerm={searchTerm} 
            selectedTags={selectedTags} 
            viewMode={viewMode} 
            openCertificateId={openCertificateId}
            onCertificateOpened={() => setOpenCertificateId(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}