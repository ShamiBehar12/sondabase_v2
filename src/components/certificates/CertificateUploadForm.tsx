import { useState, useEffect } from 'react';
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
import { Upload, X, FileText, Plus } from 'lucide-react';
import { useCertificates, type CertificateUpload } from '@/hooks/useCertificates';
import { useTags } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  description_pt: z.string().optional(),
  file: z.instanceof(File).refine(
    (file) => file.type === 'application/pdf',
    'Apenas arquivos PDF são permitidos'
  ).refine(
    (file) => file.size <= 10 * 1024 * 1024, // 10MB
    'O arquivo deve ter no máximo 10MB'
  ),
  ocr_file: z.instanceof(File).optional().refine(
    (file) => !file || file.type === 'application/pdf',
    'Apenas arquivos PDF são permitidos'
  ).refine(
    (file) => !file || file.size <= 10 * 1024 * 1024,
    'O arquivo OCR deve ter no máximo 10MB'
  ),
  issued_date: z.string().optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  issuing_organization: z.string().optional(),
  certificate_number: z.string().optional(),
  country: z.string().optional(),
});

interface CertificateUploadFormProps {
  onSuccess?: () => void;
}

export const CertificateUploadForm = ({ onSuccess }: CertificateUploadFormProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { uploadCertificate, uploading } = useCertificates();
  const { searchTags, incrementTagUsage, getPopularTags } = useTags();
  const { t } = useTranslation();

  // Lista de países para o select
  const countries = [
    'Brasil', 'Estados Unidos', 'Canadá', 'Reino Unido', 'Alemanha', 'França', 'Espanha', 'Itália',
    'Portugal', 'Holanda', 'Suécia', 'Noruega', 'Dinamarca', 'Finlândia', 'Suíça', 'Áustria',
    'Bélgica', 'Irlanda', 'Austrália', 'Nova Zelândia', 'Japão', 'Coreia do Sul', 'Singapura',
    'Hong Kong', 'Israel', 'Emirados Árabes Unidos', 'Argentina', 'Chile', 'Colômbia', 'México',
    'Peru', 'Uruguai', 'Costa Rica', 'Panamá', 'África do Sul', 'Índia', 'China', 'Rússia'
  ].sort();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      description_en: '',
      description_es: '',
      description_pt: '',
      issued_date: '',
      contract_start_date: '',
      contract_end_date: '',
      issuing_organization: '',
      certificate_number: '',
      country: '',
      ocr_file: undefined,
    },
  });

  // Load popular tags on mount
  useEffect(() => {
    const loadPopularTags = async () => {
      const popularTags = await getPopularTags(10);
      setTagSuggestions(popularTags.map(tag => tag.name));
    };
    loadPopularTags();
  }, [getPopularTags]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        if (file.size <= 10 * 1024 * 1024) { // 10MB limit
          form.setValue('file', file);
          form.clearErrors('file');
        } else {
          form.setError('file', { message: 'O arquivo deve ter no máximo 10MB' });
        }
      } else {
        form.setError('file', { message: 'Apenas arquivos PDF são permitidos' });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        if (file.size <= 10 * 1024 * 1024) { // 10MB limit
          form.setValue('file', file);
          form.clearErrors('file');
        } else {
          form.setError('file', { message: 'O arquivo deve ter no máximo 10MB' });
        }
      } else {
        form.setError('file', { message: 'Apenas arquivos PDF são permitidos' });
      }
    }
  };

  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        if (file.size <= 10 * 1024 * 1024) {
          form.setValue('ocr_file', file);
          form.clearErrors('ocr_file');
        } else {
          form.setError('ocr_file', { message: 'O arquivo OCR deve ter no máximo 10MB' });
        }
      } else {
        form.setError('ocr_file', { message: 'Apenas arquivos PDF são permitidos' });
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

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const certificateData: CertificateUpload = {
      title: values.title,
      description: values.description || undefined,
      description_en: values.description_en || undefined,
      description_es: values.description_es || undefined,
      description_pt: values.description_pt || undefined,
      file: values.file,
      ocr_file: values.ocr_file,
      issued_date: values.issued_date || undefined,
      contract_start_date: values.contract_start_date || undefined,
      contract_end_date: values.contract_end_date || undefined,
      issuing_organization: values.issuing_organization || undefined,
      certificate_number: values.certificate_number || undefined,
      country: values.country || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    const result = await uploadCertificate(certificateData);
    if (result) {
      // Increment usage count for used tags
      if (tags.length > 0) {
        await incrementTagUsage(tags);
      }
      
      form.reset();
      setTags([]);
      onSuccess?.();
    }
  };

  const selectedFile = form.watch('file');
  const selectedOcrFile = form.watch('ocr_file');

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-gradient">{t('certificates.uploadTitle')}</CardTitle>
        <CardDescription>
          {t('certificates.uploadSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Original File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-surface/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('file', undefined as any)}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground-muted">
                    <strong>Arraste o PDF original aqui</strong> ou clique para selecionar
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Arquivos PDF de até 10MB
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar PDF original
                  </Button>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}
              {form.formState.errors.file && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.file.message}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border p-5 space-y-4 bg-surface/40">
              <div>
                <Label>Arquivo OCR para IA (opcional)</Label>
                <p className="text-xs text-foreground-muted mt-1">
                  Envia aqui a versão OCR/textual do documento apenas para a indexação da IA. O download e a visualização do certificado continuarão a usar sempre o PDF original.
                </p>
              </div>

              {selectedOcrFile ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium text-foreground break-words">{selectedOcrFile.name}</p>
                      </div>
                      <p className="text-xs text-foreground-muted mt-1">
                        {(selectedOcrFile.size / 1024 / 1024).toFixed(2)} MB • PDF OCR
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue('ocr_file', undefined)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4">
                  <div className="space-y-3">
                    <p className="text-sm text-foreground-muted">
                      Se tiveres uma versão OCR do documento, adiciona-a aqui para melhorar o RAG.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('ocr-file-input')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar PDF OCR
                    </Button>
                    <Input
                      id="ocr-file-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleOcrFileChange}
                    />
                  </div>
                </div>
              )}

              {form.formState.errors.ocr_file && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.ocr_file.message as string}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.title')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Certificação em Gestão de Projetos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trilingual Description Fields */}
            <div className="space-y-4">
              <Label>{t('common.description')} ({t('common.language')})</Label>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="description_pt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('certificates.descriptionPt')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição em português..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('certificates.descriptionEn')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description in English..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description_es"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('certificates.descriptionEs')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción en español..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contract Period Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contract_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início do Contrato</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contract_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim do Contrato</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Issue Date */}
            <FormField
              control={form.control}
              name="issued_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Emissão do Certificado</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuing_organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização Emissora</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PMI, Microsoft, AWS" {...field} />
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
                      <SelectContent className="bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto z-50">
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

            <FormField
              control={form.control}
              name="certificate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Certificado</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Digite para buscar tags existentes..."
                      value={tagInput}
                      onChange={(e) => handleTagInputChange(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      onFocus={() => tagInput.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {showSuggestions && tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto z-50">
                        {tagSuggestions
                          .filter(suggestion => !tags.includes(suggestion))
                          .map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              onClick={() => addSuggestedTag(suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" 
              disabled={uploading}
              size="lg"
            >
              {uploading ? t('certificates.uploading') : t('common.save') + ' ' + t('certificates.title').slice(0, -1)}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
