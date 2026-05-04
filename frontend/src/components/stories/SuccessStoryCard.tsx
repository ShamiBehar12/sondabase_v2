import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, DollarSign, MapPin, Package, Eye, Edit, Trash2 } from 'lucide-react';
import { SuccessStory, useSuccessStories } from '@/hooks/useSuccessStories';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface SuccessStoryCardProps {
  story: SuccessStory;
  viewMode?: 'grid' | 'list';
  showActions?: boolean;
  onView?: (story: SuccessStory) => void;
  onEdit?: (story: SuccessStory) => void;
}

export const SuccessStoryCard = ({ 
  story, 
  viewMode = 'grid', 
  showActions = false, 
  onView, 
  onEdit 
}: SuccessStoryCardProps) => {
  const { deleteSuccessStory } = useSuccessStories();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const currentLang = i18n.language as 'pt' | 'en' | 'es';
  
  // Get localized content
  const getLocalizedContent = (field: string) => {
    const ptValue = story[`${field}_pt` as keyof SuccessStory] as string;
    const enValue = story[`${field}_en` as keyof SuccessStory] as string;
    const esValue = story[`${field}_es` as keyof SuccessStory] as string;
    
    switch (currentLang) {
      case 'en':
        return enValue || ptValue || '';
      case 'es':
        return esValue || ptValue || '';
      default:
        return ptValue || '';
    }
  };

  const title = getLocalizedContent('title');
  const client = getLocalizedContent('client');
  const country = story.country_pt || ''; // Usar country_pt del banco
  const product = getLocalizedContent('product');

  const handleDelete = async () => {
    if (window.confirm(t('successStories.confirmDelete'))) {
      setIsDeleting(true);
      await deleteSuccessStory(story.id);
      setIsDeleting(false);
    }
  };

  // No mostrar badges de status conforme solicitado pelo usuario

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Título */}
              <h3 className="text-lg font-semibold text-foreground line-clamp-1 mb-2">
                {title}
              </h3>
              
              {/* Informações em linha horizontal SEM quebra */}
              <div className="flex items-center gap-4 text-sm text-foreground-muted overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Building2 className="h-4 w-4" />
                  <span className="whitespace-nowrap">{client}</span>
                </div>
                {country && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <MapPin className="h-4 w-4" />
                    <span className="whitespace-nowrap">{country}</span>
                  </div>
                )}
                {product && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Package className="h-4 w-4" />
                    <span className="whitespace-nowrap">{product}</span>
                  </div>
                )}
                {story.closure_year && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span className="whitespace-nowrap">{story.closure_year}</span>
                  </div>
                )}
                {story.contract_value && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <DollarSign className="h-4 w-4" />
                    <span className="whitespace-nowrap">{story.contract_value}</span>
                  </div>
                )}
                
                {/* Tags inline com as informações */}
                {story.tags && story.tags.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {story.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5 whitespace-nowrap">
                        {tag}
                      </Badge>
                    ))}
                    {story.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 whitespace-nowrap">
                        +{story.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botões de acción à direita */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView?.(story)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {t('common.view')}
              </Button>
              
              {showActions && user?.id === story.user_id && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(story)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {isDeleting ? t('successStories.deleting') : t('common.delete')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-1 mb-1">
              {title}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-sm">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{client}</span>
            </CardDescription>
          </div>
          
          {/* Ícones de acción compactos */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView?.(story)}
              className="h-8 px-2"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {showActions && user?.id === story.user_id && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(story)}
                  className="h-8 px-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Informações organizadas horizontalmente */}
        <div className="flex items-center gap-3 text-sm text-foreground-muted flex-wrap">
          {country && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{country}</span>
            </div>
          )}
          {product && (
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{product}</span>
            </div>
          )}
          {story.closure_year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{story.closure_year}</span>
            </div>
          )}
          {story.contract_value && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span>{story.contract_value}</span>
            </div>
          )}
        </div>

        {/* Tags compactas */}
        {story.tags && story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {story.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {story.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{story.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};