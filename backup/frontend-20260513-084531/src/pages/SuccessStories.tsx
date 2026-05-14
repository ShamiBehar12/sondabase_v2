import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Grid3x3, LayoutList } from 'lucide-react';
import { SuccessStoryUploadForm } from '@/components/stories/SuccessStoryUploadForm';
import { SuccessStoryList } from '@/components/stories/SuccessStoryList';
import { useSuccessStories } from '@/hooks/useSuccessStories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SuccessStories() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const { stories } = useSuccessStories();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!preferencesLoading && preferences.certificates_view_mode) {
      setViewMode(preferences.certificates_view_mode);
    }
  }, [preferences.certificates_view_mode, preferencesLoading]);

  useEffect(() => {
    if (location.state?.openStoryId) {
      setOpenStoryId(location.state.openStoryId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Extract all unique tags from stories (both new and existing)
  const allTags = Array.from(
    new Set([
      ...stories.flatMap(story => story.tags || []),
      // Existing stories don't have tags, so we'll add some based on content
    ])
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
          <h2 className="text-3xl font-bold text-gradient">{t('navigation.successStories')}</h2>
          <p className="text-foreground-muted mt-2">
            {t('successStories.subtitle')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="new" className="space-y-6" value={showUploadForm ? "upload" : "new"} onValueChange={(value) => setShowUploadForm(value === "upload")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('successStories.listTab')} ({stories.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('successStories.addTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <SuccessStoryUploadForm onSuccess={() => setShowUploadForm(false)} />
        </TabsContent>


        <TabsContent value="new" className="space-y-6">
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
                  {t('successStories.gridView')}
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-none"
                >
                  <LayoutList className="h-4 w-4 mr-1" />
                  {t('successStories.listView')}
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters for New Stories */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('successStories.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(y) => setSearchTerm(y.target.value)}
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

          {/* New Success Stories List */}
          <SuccessStoryList 
            searchTerm={searchTerm} 
            selectedTags={selectedTags} 
            viewMode={viewMode} 
            openStoryId={openStoryId}
            onStoryOpened={() => setOpenStoryId(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
