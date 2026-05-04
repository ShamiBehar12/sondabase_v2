import { useState, useEffect } from 'react';
import { SuccessStoryCard } from './SuccessStoryCard';
import { SuccessStoryDetailDialog } from './SuccessStoryDetailDialog';
import { useSuccessStories, type SuccessStory } from '@/hooks/useSuccessStories';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SuccessStoryListProps {
  searchTerm: string;
  selectedTags: string[];
  viewMode: 'grid' | 'list';
  showUserStories?: boolean;
  openStoryId?: string | null;
  onStoryOpened?: () => void;
}

export const SuccessStoryList = ({ 
  searchTerm, 
  selectedTags, 
  viewMode, 
  showUserStories = false,
  openStoryId,
  onStoryOpened 
}: SuccessStoryListProps) => {
  const { t } = useTranslation();
  const { stories, loading } = useSuccessStories();
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Auto-open story if openStoryId is provided
  useEffect(() => {
    if (openStoryId && stories.length > 0) {
      const story = stories.find(s => s.id === openStoryId);
      if (story) {
        setSelectedStory(story);
        setIsDetailDialogOpen(true);
        onStoryOpened?.();
      }
    }
  }, [openStoryId, stories, onStoryOpened]);

  const handleViewStory = (story: SuccessStory) => {
    setSelectedStory(story);
    setIsDetailDialogOpen(true);
  };

  const handleEditStory = (story: SuccessStory) => {
    // TODO: Implement edit functionality
    console.log('Edit story:', story);
  };

  // Filter stories
  const filteredStories = stories.filter(story => {
    // Filter by user if showUserStories is true
    if (showUserStories && story.user_id !== user?.id) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const title = (story.title_pt || story.title_en || story.title_es || '').toLowerCase();
      const client = (story.client_pt || story.client_en || story.client_es || '').toLowerCase();
      const country = (story.country_pt || '').toLowerCase(); // Apenas country_pt
      const product = (story.product_pt || story.product_en || story.product_es || '').toLowerCase();
      
      if (!title.includes(searchLower) && 
          !client.includes(searchLower) && 
          !country.includes(searchLower) && 
          !product.includes(searchLower)) {
        return false;
      }
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const storyTags = story.tags || [];
      if (!selectedTags.some(tag => storyTags.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredStories.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {searchTerm || selectedTags.length > 0
            ? t('successStories.noResultsWithFilters')
            : showUserStories
            ? t('successStories.noUserStories')
            : t('successStories.noStoriesAvailable')
          }
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {filteredStories.map((story) => (
          <SuccessStoryCard
            key={story.id}
            story={story}
            viewMode={viewMode}
            showActions={true}
            onView={handleViewStory}
            onEdit={handleEditStory}
          />
        ))}
      </div>

      <SuccessStoryDetailDialog
        story={selectedStory}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </>
  );
};