import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  MapPin, 
  Package, 
  Calendar, 
  DollarSign, 
  Target, 
  Lightbulb, 
  TrendingUp,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Languages
} from 'lucide-react';
import { SuccessStory, useSuccessStories } from '@/hooks/useSuccessStories';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface SuccessStoryDetailDialogProps {
  story: SuccessStory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SuccessStoryDetailDialog = ({
  story,
  open,
  onOpenChange,
}: SuccessStoryDetailDialogProps) => {
  const { getImageUrl } = useSuccessStories();
  const { t, i18n } = useTranslation();
  const { preferences } = useUserPreferences();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<'pt' | 'en' | 'es'>('pt');

  // Initialize with user's preferred language
  useEffect(() => {
    if (preferences.language_preference) {
      setSelectedLanguage(preferences.language_preference as 'pt' | 'en' | 'es');
    }
  }, [preferences.language_preference]);

  const currentLang = selectedLanguage;

  // Get localized content
  const getLocalizedContent = (field: string) => {
    if (!story) return '';
    
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

  // Load image URLs
  useEffect(() => {
    if (!story || !open) return;

    const loadImages = async () => {
      const urls: Record<string, string> = {};
      const imageFields = ['client_logo', 'image_01', 'image_02', 'image_03', 'image_04'];
      
      for (const field of imageFields) {
        const path = story[field as keyof SuccessStory] as string;
        if (path) {
          const url = await getImageUrl(path);
          if (url) {
            urls[field] = url;
          }
        }
      }
      
      setImageUrls(urls);
    };

    loadImages();
  }, [story, open, getImageUrl]);

  if (!story) return null;

  const title = getLocalizedContent('title');
  const client = getLocalizedContent('client');
  const country = getLocalizedContent('country');
  const product = getLocalizedContent('product');
  const challenge = getLocalizedContent('challenge');
  const solution = getLocalizedContent('solution');
  const benefits = getLocalizedContent('benefits');

  const getStatusBadge = () => {
    switch (story.status) {
      case 'aprovado':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aprovada</Badge>;
      case 'em_revisao':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold mb-2">
                {title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 text-base">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {client}
                </div>
                {country && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {country}
                  </div>
                )}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-1">
              {getStatusBadge()}
              {!story.is_verified && (
                <Badge variant="outline" className="text-xs">No Verificada</Badge>
              )}
            </div>
          </div>

          {/* Language Selection */}
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-sm font-medium text-white">Idioma:</span>
            <div className="flex gap-1">
              <Button
                variant={selectedLanguage === 'pt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage('pt')}
                className="h-7 px-3 text-xs"
              >
                PT
              </Button>
              <Button
                variant={selectedLanguage === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage('en')}
                className="h-7 px-3 text-xs"
              >
                EN
              </Button>
              <Button
                variant={selectedLanguage === 'es' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage('es')}
                className="h-7 px-3 text-xs"
              >
                ES
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {product && (
                <div className="flex items-center gap-2 p-3 bg-[#202938] rounded-lg">
                  <Package className="h-5 w-5 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs text-white">Produto</p>
                    <p className="text-sm font-medium">{product}</p>
                  </div>
                </div>
              )}
              
              {story.closure_year && (
                <div className="flex items-center gap-2 p-3 bg-[#202938] rounded-lg">
                  <Calendar className="h-5 w-5 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs text-white">Ano</p>
                    <p className="text-sm font-medium">{story.closure_year}</p>
                  </div>
                </div>
              )}
              
              {story.contract_value && (
                <div className="flex items-center gap-2 p-3 bg-[#202938] rounded-lg">
                  <DollarSign className="h-5 w-5 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs text-white">Valor</p>
                    <p className="text-sm font-medium">{story.contract_value}</p>
                  </div>
                </div>
              )}
              
              {story.contract_period && (
                <div className="flex items-center gap-2 p-3 bg-[#202938] rounded-lg">
                  <Calendar className="h-5 w-5 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs text-white">Período</p>
                    <p className="text-sm font-medium">{story.contract_period}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Main Content */}
            <div className="bg-[#202938] rounded-lg p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title and Client */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white uppercase tracking-wide font-medium">Título</label>
                    <p className="mt-1 text-lg font-semibold text-[#3B82F6]">{title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white uppercase tracking-wide font-medium">Cliente/Organização</label>
                    <p className="mt-1 text-base">{client}</p>
                  </div>
                </div>

                {/* Product and Country */}
                <div className="space-y-4">
                  {product && (
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide font-medium">Produto/Serviço</label>
                      <p className="mt-1 text-base">{product}</p>
                    </div>
                  )}
                  {country && (
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide font-medium">País</label>
                      <p className="mt-1 text-base">{country}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Information */}
              {(story.contract_period || story.contract_value || story.closure_year) && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#3B82F6]" />
                    Informações del Contrato
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {story.contract_period && (
                      <div>
                        <label className="text-xs text-white uppercase tracking-wide font-medium">Período</label>
                        <p className="mt-1 text-sm">{story.contract_period}</p>
                      </div>
                    )}
                    {story.contract_value && (
                      <div>
                        <label className="text-xs text-white uppercase tracking-wide font-medium">Valor</label>
                        <p className="mt-1 text-sm">{story.contract_value}</p>
                      </div>
                    )}
                    {story.closure_year && (
                      <div>
                        <label className="text-xs text-white uppercase tracking-wide font-medium">Ano de Encerramento</label>
                        <p className="mt-1 text-sm">{story.closure_year}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Challenge Section */}
            {challenge && (
              <div className="bg-[#202938] rounded-lg p-6">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#3B82F6]" />
                  Desafio
                </h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[#F3F7FC] leading-relaxed whitespace-pre-wrap">{challenge}</p>
                </div>
              </div>
            )}

            {/* Solution Section */}
            {solution && (
              <div className="bg-[#202938] rounded-lg p-6">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#3B82F6]" />
                  Solução
                </h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[#F3F7FC] leading-relaxed whitespace-pre-wrap">{solution}</p>
                </div>
              </div>
            )}

            {/* Benefits Section */}
            {benefits && (
              <div className="bg-[#202938] rounded-lg p-6">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#3B82F6]" />
                  Benefícios
                </h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-[#F3F7FC] leading-relaxed whitespace-pre-wrap">{benefits}</p>
                </div>
              </div>
            )}

            {/* Additional Content Tabs */}
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="images">Imagens</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="metadata">Metadados</TabsTrigger>
              </TabsList>

              <TabsContent value="images" className="space-y-6 mt-6">
                {/* Images */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#3B82F6]" />
                    Imagens
                  </h4>
                  
                  {/* Client Logo */}
                  {imageUrls.client_logo && (
                    <div className="space-y-2">
                      <label className="text-xs text-white uppercase tracking-wide font-medium">Logo del Cliente</label>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-[#202938] border border-[#3E4A5F]">
                        <img
                          src={imageUrls.client_logo}
                          alt="Logo del cliente"
                          className="w-full h-full object-contain bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Story Images Grid */}
                  {['image_01', 'image_02', 'image_03', 'image_04'].some(key => imageUrls[key]) && (
                    <div className="space-y-2">
                      <label className="text-xs text-white uppercase tracking-wide font-medium">Imagens de la Historia</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['image_01', 'image_02', 'image_03', 'image_04'].map((imageKey, index) => (
                          imageUrls[imageKey] && (
                            <div key={imageKey} className="space-y-2">
                              <label className="text-xs text-white">
                                Imagem {index + 1}
                              </label>
                              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-[#202938] border border-[#3E4A5F]">
                                <img
                                  src={imageUrls[imageKey]}
                                  alt={`Imagem de la historia ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                  onClick={() => window.open(imageUrls[imageKey], '_blank')}
                                />
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No images message */}
                  {!imageUrls.client_logo && !['image_01', 'image_02', 'image_03', 'image_04'].some(key => imageUrls[key]) && (
                    <div className="text-center py-8 text-white">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Ninguna imagem associada a esta historia</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tags" className="space-y-6 mt-6">
                {/* Tags */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Tags</h4>
                  {story.tags && story.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {story.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white">Ninguna tag associada</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-6 mt-6">
                {/* Metadata */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Metadados</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide">Status</label>
                      <div className="mt-1">{getStatusBadge()}</div>
                    </div>
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide">Verificada</label>
                      <p className="mt-1 text-sm">{story.is_verified ? 'Sim' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide">Data de Criação</label>
                      <p className="mt-1 text-sm">
                        {story.created_at ? new Date(story.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-white uppercase tracking-wide">Última Atualização</label>
                      <p className="mt-1 text-sm">
                        {story.updated_at ? new Date(story.updated_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

