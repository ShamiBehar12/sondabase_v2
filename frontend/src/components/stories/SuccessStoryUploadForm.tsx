import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Image, Plus, FileText, Camera, Settings, Tag } from 'lucide-react';
import { useSuccessStories, type SuccessStoryUpload } from '@/hooks/useSuccessStories';
import { useTags } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  title_pt: z.string().min(1, 'Título em português é obrigatório'),
  title_en: z.string().optional(),
  title_es: z.string().optional(),
  client_pt: z.string().min(1, 'Nombre del cliente em português é obrigatório'),
  client_en: z.string().optional(),
  client_es: z.string().optional(),
  country: z.string().optional(),
  product_pt: z.string().optional(),
  product_en: z.string().optional(),
  product_es: z.string().optional(),
  challenge_pt: z.string().optional(),
  challenge_en: z.string().optional(),
  challenge_es: z.string().optional(),
  solution_pt: z.string().optional(),
  solution_en: z.string().optional(),
  solution_es: z.string().optional(),
  benefits_pt: z.string().optional(),
  benefits_en: z.string().optional(),
  benefits_es: z.string().optional(),
  contract_period: z.string().optional(),
  contract_value: z.string().optional(),
  closure_year: z.string().optional(),
  client_logo: z.instanceof(File).optional(),
  image_01: z.instanceof(File).optional(),
  image_02: z.instanceof(File).optional(),
  image_03: z.instanceof(File).optional(),
  image_04: z.instanceof(File).optional(),
});

interface SuccessStoryUploadFormProps {
  onSuccess?: () => void;
}

export const SuccessStoryUploadForm = ({ onSuccess }: SuccessStoryUploadFormProps) => {
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState('pt');
  const [activeMainTab, setActiveMainTab] = useState('basic');
  const { uploadSuccessStory, uploading } = useSuccessStories();
  const { searchTags, incrementTagUsage, getPopularTags } = useTags();
  const { t } = useTranslation();

  // Lista de países para o select (mesmo padrão dos certificados)
  const countries = [
    'Brasil', 'Estados Unidos', 'Canadá', 'Reino Unido', 'Alemanha', 'França', 'Espanha', 'Itália',
    'Portugal', 'Holanda', 'Suécia', 'Noruega', 'Dinamarca', 'Finlândia', 'Suíça', 'Áustria',
    'Bélgica', 'Irlanda', 'Austrália', 'Nova Zelândia', 'Japão', 'Coreia del Sul', 'Singapura',
    'Hong Kong', 'Israel', 'Emirados Árabes Unidos', 'Argentina', 'Chile', 'Colômbia', 'México',
    'Peru', 'Uruguai', 'Costa Rica', 'Panamá', 'África del Sul', 'Índia', 'China', 'Rússia'
  ].sort();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_pt: '',
      title_en: '',
      title_es: '',
      client_pt: '',
      client_en: '',
      client_es: '',
      country: '',
      product_pt: '',
      product_en: '',
      product_es: '',
      challenge_pt: '',
      challenge_en: '',
      challenge_es: '',
      solution_pt: '',
      solution_en: '',
      solution_es: '',
      benefits_pt: '',
      benefits_en: '',
      benefits_es: '',
      contract_period: '',
      contract_value: '',
      closure_year: '',
    },
  });

  useEffect(() => {
    const loadPopularTags = async () => {
      const popularTags = await getPopularTags(10);
      setTagSuggestions(popularTags.map(tag => tag.name));
    };
    loadPopularTags();
  }, []);

  const handleImageDrag = (y: React.DragEvent, fieldName: string) => {
    y.preventDefault();
    y.stopPropagation();
    if (y.type === 'dragenter' || y.type === 'dragover') {
      setDragActive(fieldName);
    } else if (y.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleImageDrop = (y: React.DragEvent, fieldName: string) => {
    y.preventDefault();
    y.stopPropagation();
    setDragActive(null);

    if (y.dataTransfer.files && y.dataTransfer.files[0]) {
      const file = y.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        if (file.size <= 5 * 1024 * 1024) { // 5MB limit
          form.setValue(fieldName as any, file);
          form.clearErrors(fieldName as any);
        } else {
          form.setError(fieldName as any, { message: 'A imagem deve ter no máximo 5MB' });
        }
      } else {
        form.setError(fieldName as any, { message: 'Apenas imagens são permitidas' });
      }
    }
  };

  const handleImageChange = (y: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (y.target.files && y.target.files[0]) {
      const file = y.target.files[0];
      if (file.type.startsWith('image/')) {
        if (file.size <= 5 * 1024 * 1024) { // 5MB limit
          form.setValue(fieldName as any, file);
          form.clearErrors(fieldName as any);
        } else {
          form.setError(fieldName as any, { message: 'A imagem deve ter no máximo 5MB' });
        }
      } else {
        form.setError(fieldName as any, { message: 'Apenas imagens são permitidas' });
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      setShowSuggestions(false);
    }
  };

  const addSuggestedTag = (suggestedTag: string) => {
    if (!tags.includes(suggestedTag)) {
      setTags([...tags, suggestedTag]);
      setTagInput('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputChange = async (value: string) => {
    setTagInput(value);
    if (value.length > 0) {
      const suggestions = await searchTags(value);
      setTagSuggestions(suggestions.map(tag => tag.name));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleTagKeyPress = (y: React.KeyboardEvent) => {
    if (y.key === 'Enter') {
      y.preventDefault();
      addTag();
    } else if (y.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const storyData: SuccessStoryUpload = {
      title_pt: values.title_pt,
      title_en: values.title_en || undefined,
      title_es: values.title_es || undefined,
      client_pt: values.client_pt,
      client_en: values.client_en || undefined,
      client_es: values.client_es || undefined,
      country: values.country || undefined,
      product_pt: values.product_pt || undefined,
      product_en: values.product_en || undefined,
      product_es: values.product_es || undefined,
      challenge_pt: values.challenge_pt || undefined,
      challenge_en: values.challenge_en || undefined,
      challenge_es: values.challenge_es || undefined,
      solution_pt: values.solution_pt || undefined,
      solution_en: values.solution_en || undefined,
      solution_es: values.solution_es || undefined,
      benefits_pt: values.benefits_pt || undefined,
      benefits_en: values.benefits_en || undefined,
      benefits_es: values.benefits_es || undefined,
      contract_period: values.contract_period || undefined,
      contract_value: values.contract_value || undefined,
      closure_year: values.closure_year || undefined,
      client_logo: values.client_logo,
      image_01: values.image_01,
      image_02: values.image_02,
      image_03: values.image_03,
      image_04: values.image_04,
      tags: tags.length > 0 ? tags : undefined,
    };

    const result = await uploadSuccessStory(storyData);
    if (result) {
      if (tags.length > 0) {
        await incrementTagUsage(tags);
      }
      
      form.reset();
      setTags([]);
      onSuccess?.();
    }
  };

  const ImageUploadField = ({ fieldName, label }: { fieldName: string; label: string }) => {
    const selectedFile = form.watch(fieldName as any);
    
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
            dragActive === fieldName
              ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.1)] scale-[1.02]'
              : 'border-[#3E4A5F] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(32,41,56,0.5)]'
          }`}
          onDragEnter={(y) => handleImageDrag(y, fieldName)}
          onDragLeave={(y) => handleImageDrag(y, fieldName)}
          onDragOver={(y) => handleImageDrag(y, fieldName)}
          onDrop={(y) => handleImageDrop(y, fieldName)}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Image className="h-4 w-4 text-[#3B82F6]" />
                <p className="text-sm font-medium text-[#F3F7FC]">{selectedFile.name}</p>
              </div>
              <p className="text-xs text-white">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue(fieldName as any, undefined)}
                className="mt-2"
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-8 w-8 text-[#3B82F6]" />
              <p className="text-sm text-white">
                Arraste uma imagem o clique para selecionar
              </p>
              <p className="text-xs text-white">
                Imagens de até 5MB
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById(`${fieldName}-input`)?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar
              </Button>
              <Input
                id={`${fieldName}-input`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(y) => handleImageChange(y, fieldName)}
              />
            </div>
          )}
        </div>
        {form.formState.errors[fieldName as keyof typeof form.formState.errors] && (
          <p className="text-sm text-destructive">
            {form.formState.errors[fieldName as keyof typeof form.formState.errors]?.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white bg-clip-text text-transparent">Cadastrar Historia de Éxito</CardTitle>
        <CardDescription>
          Compartilhe un caso de éxito de la sua empresa. Organize as informações por categoria usando as abas abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Abas Principais */}
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dados Básicos
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Conteúdo
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Imagens
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              {/* Aba: Dados Básicos */}
              <TabsContent value="basic" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#3B82F6]" />
                    <Label className="text-base font-semibold">Informações Básicas</Label>
                  </div>
                  <p className="text-sm text-white">
                    Dados essenciais de la historia de éxito. Os campos marcados com * são obrigatórios apenas em português.
                  </p>
                  
                  {/* Campos básicos sem abas aninhadas */}
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'pt' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('pt')}
                      >
                        🇧🇷 Português *
                      </Button>
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'en' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('en')}
                      >
                        🇺🇸 English
                      </Button>
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'es' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('es')}
                      >
                        🇪🇸 Español
                      </Button>
                    </div>

                    {/* Sempre renderizar todos os campos, mas mostrar apenas os del idioma ativo */}
                    <div style={{ display: activeLanguageTab === 'pt' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Implementação de ERP que reduziu custos em 30%"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="client_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cliente *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Empresa ABC Ltda"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="product_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto/Serviço</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Sistema ERP Personalizado"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>País</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o país" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#171C25] border border-[#3E4A5F] shadow-lg max-h-[200px] overflow-y-auto z-50">
                                  {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div style={{ display: activeLanguageTab === 'en' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: ERP Implementation that reduced costs by 30%"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="client_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: ABC Company Ltd"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="product_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product/Service</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Custom ERP System"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div style={{ display: activeLanguageTab === 'es' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: Implementación de ERP que redujo costos en 30%"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="client_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cliente</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: Empresa ABC Ltda"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="product_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Producto/Servicio</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: Sistema ERP Personalizado"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Aba: Conteúdo */}
              <TabsContent value="content" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#3B82F6]" />
                    <Label className="text-base font-semibold">Conteúdo Detalhado</Label>
                  </div>
                  <p className="text-sm text-white">
                    Descreva o desafio, solução implementada y benefícios obtidos.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'pt' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('pt')}
                      >
                        🇧🇷 Português
                      </Button>
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'en' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('en')}
                      >
                        🇺🇸 English
                      </Button>
                      <Button
                        type="button"
                        variant={activeLanguageTab === 'es' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLanguageTab('es')}
                      >
                        🇪🇸 Español
                      </Button>
                    </div>

                    <div style={{ display: activeLanguageTab === 'pt' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="challenge_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Desafio</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva o desafio o problema que o cliente enfrentava..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="solution_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solução</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva a solução implementada..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="benefits_pt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Benefícios</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva os benefícios y resultados obtidos..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div style={{ display: activeLanguageTab === 'en' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="challenge_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Challenge</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the challenge or problem the client was facing..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="solution_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solution</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the implemented solution..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="benefits_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Benefits</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the benefits and results obtained..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div style={{ display: activeLanguageTab === 'es' ? 'block' : 'none' }}>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="challenge_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Desafío</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe el desafío o problema que enfrentaba el cliente..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="solution_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solución</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe la solución implementada..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="benefits_es"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Beneficios</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe los beneficios y resultados obtenidos..."
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Aba: Imagens */}
              <TabsContent value="media" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-[#3B82F6]" />
                    <Label className="text-base font-semibold">Imagens y Logo</Label>
                  </div>
                  <p className="text-sm text-white">
                    Añade o logo del cliente y imagens que ilustrem o caso de éxito.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUploadField fieldName="client_logo" label="Logo del Cliente" />
                    <ImageUploadField fieldName="image_01" label="Imagem 1" />
                    <ImageUploadField fieldName="image_02" label="Imagem 2" />
                    <ImageUploadField fieldName="image_03" label="Imagem 3" />
                    <ImageUploadField fieldName="image_04" label="Imagem 4" />
                  </div>
                </div>
              </TabsContent>

              {/* Aba: Configurações */}
              <TabsContent value="settings" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-[#3B82F6]" />
                    <Label className="text-base font-semibold">Configurações Adicionais</Label>
                  </div>
                  <p className="text-sm text-white">
                    Informações complementares sobre o projeto y tags para categorização.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="contract_period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Período del Contrato</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 6 meses" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contract_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor del Contrato</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: R$ 50.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="closure_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano de Conclusão</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 2024" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Tags */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags de Categorização
                    </Label>
                    <p className="text-sm text-white">
                      Añade palavras-chave para facilitar a busca y categorização.
                    </p>
                    
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite uma tag y pressione Enter"
                          value={tagInput}
                          onChange={(y) => handleTagInputChange(y.target.value)}
                          onKeyDown={handleTagKeyPress}
                          className="flex-1"
                        />
                        <Button type="button" onClick={addTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {showSuggestions && tagSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-[#171C25] border border-[#3E4A5F] rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {tagSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-[#202938] text-sm"
                              onClick={() => addSuggestedTag(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="px-2 py-1">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2 hover:bg-transparent"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Botão de Envio */}
            <div className="flex justify-end pt-6 border-t">
              <Button type="submit" disabled={uploading} className="px-8">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  'Cadastrar Historia de Éxito'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

