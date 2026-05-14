import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload } from 'lucide-react';
import { useCertificates, type Certificate, type CertificateUpdate } from '@/hooks/useCertificates';
import { useTags } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description_pt: z.string().optional(),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  issued_date: z.string().optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  issuing_organization: z.string().optional(),
  certificate_number: z.string().optional(),
  country: z.string().optional(),
});

interface CertificateEditDialogProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CertificateEditDialog = ({ certificate, open, onOpenChange }: CertificateEditDialogProps) => {
  const { t } = useTranslation();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { updateCertificate, recreateRejectedCertificate, uploading } = useCertificates();
  const { searchTags, incrementTagUsage, getPopularTags } = useTags();

  // Lista de países para o select
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
      title: '',
      description_pt: '',
      description_en: '',
      description_es: '',
      issued_date: '',
      contract_start_date: '',
      contract_end_date: '',
      issuing_organization: '',
      certificate_number: '',
      country: '',
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

  // Reset form when certificate changes
  useEffect(() => {
    if (certificate && open) {
      form.reset({
        title: certificate.title,
        description_pt: certificate.description_pt || '',
        description_en: certificate.description_en || '',
        description_es: certificate.description_es || '',
        issued_date: certificate.issued_date || '',
        contract_start_date: certificate.contract_start_date || '',
        contract_end_date: certificate.contract_end_date || '',
        issuing_organization: certificate.issuing_organization || '',
        certificate_number: certificate.certificate_number || '',
        country: certificate.country || '',
      });
      setTags(certificate.tags || []);
      setSelectedFile(null); // Reset file selection
    }
  }, [certificate, open, form]);

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
    if (!certificate) return;

    const certificateData: CertificateUpdate = {
      title: values.title,
      description_pt: values.description_pt || undefined,
      description_en: values.description_en || undefined,
      description_es: values.description_es || undefined,
      issued_date: values.issued_date || undefined,
      contract_start_date: values.contract_start_date || undefined,
      contract_end_date: values.contract_end_date || undefined,
      issuing_organization: values.issuing_organization || undefined,
      certificate_number: values.certificate_number || undefined,
      country: values.country || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    let result;

    // Check if this is a rejected certificate (has _isFromRejection flag)
    if ((certificate as any)._isFromRejection) {
      const hasExistingPdf = Boolean(certificate.file_path && certificate.file_name);

      if (!selectedFile && !hasExistingPdf) {
        toast.error('Por favor, selecione un archivo PDF para o certificado rechazado.');
        return;
      }

      const uploadData = {
        ...certificateData,
        file: selectedFile || undefined,
        file_name: certificate.file_name,
        file_path: certificate.file_path,
        file_size: certificate.file_size,
        mime_type: certificate.mime_type,
      };

      result = await recreateRejectedCertificate(uploadData);
    } else {
      // For regular certificates, update normally
      result = await updateCertificate(certificate.id, certificateData);
    }

    if (result) {
      // Increment usage count for used tags
      if (tags.length > 0) {
        await incrementTagUsage(tags);
      }
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {(certificate as any)?._isFromRejection 
              ? 'Recriar Certificado Rejeitado' 
              : `${t('common.edit')} ${t('navigation.certificates')}`}
          </DialogTitle>
          <DialogDescription>
            {(certificate as any)?._isFromRejection 
              ? 'Revise os dados carregados del envio original, ajuste o que for necessário y reenvie o certificado. Pode manter o PDF atual o selecionar un nuevo archivo se quiser substituí-lo.' 
              : t('certificates.updateSuccess')}
          </DialogDescription>
        </DialogHeader>

        {(certificate as any)?._isFromRejection && (certificate as any)?._rejectionReason ? (
          <div className="rounded-md border border-[rgba(229,72,77,0.3)] bg-[rgba(229,72,77,0.1)] p-3 text-sm text-[#F3F7FC]">
            <strong>Motivo de la rechazo:</strong> {(certificate as any)._rejectionReason}
          </div>
        ) : null}

        {(certificate as any)?._isFromRejection && (certificate as any)?._hasIncompleteSnapshot ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[#F3F7FC]">
            Este certificado foi rechazado antes de la correção que preserva todos os dados del envio original. Os próximos certificados rejeitados abrirão esta tela já preenchidos; neste caso antigo, pode ser necessário completar os campos que no estavam salvos no histórico.
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Trilingual Descriptions */}
            <div className="space-y-4">
              <FormLabel>{t('common.description')}</FormLabel>
              
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

            {/* File Upload for Rejected Certificates */}
            {(certificate as any)?._isFromRejection && (
              <div className="space-y-2">
                <Label>Arquivo PDF</Label>
                {certificate.file_name ? (
                  <div className="rounded-md border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.05)] p-3 text-sm text-[#F3F7FC]">
                    <strong>PDF atual:</strong> {certificate.file_name}
                    <div className="text-white">
                      O archivo original já está carregado. Se quiser, pode selecionar un nuevo PDF para substituí-lo.
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#3E4A5F] rounded-lg cursor-pointer bg-[rgba(35,44,58,0.5)] hover:bg-[rgba(35,44,58,0.8)] transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-white" />
                      <p className="mb-2 text-sm text-white">
                        {selectedFile
                          ? selectedFile.name
                          : certificate.file_name
                            ? 'Clique para substituir o PDF atual'
                            : 'Clique para enviar o PDF del certificado'}
                      </p>
                      <p className="text-xs text-white">PDF (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={(y) => {
                        const file = y.target.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          setSelectedFile(file);
                        } else {
                          toast.error('Por favor, selecione apenas archivos PDF.');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Contract Period Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contract_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('certificates.contractStart')}</FormLabel>
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
                    <FormLabel>{t('certificates.contractEnd')}</FormLabel>
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
                  <FormLabel>{t('certificates.issuedDate')}</FormLabel>
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
                    <FormLabel>{t('certificates.issuingOrganization')}</FormLabel>
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
                    <FormLabel>{t('common.country')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.country')} />
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

            <FormField
              control={form.control}
              name="certificate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('certificates.certificateNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t('common.tags')}</Label>
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
                      onChange={(y) => handleTagInputChange(y.target.value)}
                      onKeyPress={handleTagKeyPress}
                      onFocus={() => tagInput.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {showSuggestions && tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-[#171C25] border border-[#3E4A5F] rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto z-50">
                        {tagSuggestions
                          .filter(suggestion => !tags.includes(suggestion))
                          .map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-[#232C3A] cursor-pointer text-sm"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110 transition-all" 
                disabled={uploading}
              >
                {uploading 
                  ? t('certificates.uploading') 
                  : (certificate as any)?._isFromRejection 
                    ? 'Recriar Certificado' 
                    : t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


