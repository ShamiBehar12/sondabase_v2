import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { 
  Upload, 
  X, 
  CalendarIcon, 
  Plus,
  GraduationCap,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProfessionalCertificateUploadFormProps {
  onUploadComplete: () => void;
  onCancel: () => void;
}

const certificationTypes = [
  { value: 'graduation', label: 'Graduação' },
  { value: 'specialization', label: 'Especialização' },
  { value: 'master', label: 'Mestrado' },
  { value: 'doctorate', label: 'Doutorado' },
  { value: 'course', label: 'Curso' },
  { value: 'license', label: 'Licença/Registro' }
];

const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'expired', label: 'Expirado' },
  { value: 'revoked', label: 'Revogado' }
];

export function ProfessionalCertificateUploadForm({ 
  onUploadComplete, 
  onCancel 
}: ProfessionalCertificateUploadFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    professional_registration_number: '',
    professional_council: '',
    institution: '',
    certification_type: '',
    specialization_area: '',
    course_hours: '',
    status: 'active',
    issued_date: undefined as Date | undefined,
    valid_from: undefined as Date | undefined,
    valid_until: undefined as Date | undefined,
    country: '',
    state_province: '',
    city: ''
  });

  const handleFileChange = (y: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = y.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O archivo deve ter menos de 10MB.",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (y: React.FormEvent) => {
    y.preventDefault();
    
    if (!file) {
      toast({
        variant: "destructive",
        title: "Arquivo obrigatório",
        description: "Por favor, selecione un archivo para fazer upload.",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Título obrigatório",
        description: "Por favor, informe o título del certificado.",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await apiClient.storage
        .from('certificates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create certificate record
      const { error: insertError } = await apiClient
        .from('professional_certificates')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          professional_registration_number: formData.professional_registration_number.trim() || null,
          professional_council: formData.professional_council.trim() || null,
          institution: formData.institution.trim() || null,
          certification_type: formData.certification_type || null,
          specialization_area: formData.specialization_area.trim() || null,
          course_hours: formData.course_hours ? parseInt(formData.course_hours) : null,
          status: formData.status,
          issued_date: formData.issued_date ? formData.issued_date.toISOString().split('T')[0] : null,
          valid_from: formData.valid_from ? formData.valid_from.toISOString().split('T')[0] : null,
          valid_until: formData.valid_until ? formData.valid_until.toISOString().split('T')[0] : null,
          country: formData.country.trim() || null,
          state_province: formData.state_province.trim() || null,
          city: formData.city.trim() || null,
          tags: tags.length > 0 ? tags : null,
        } as any);

      if (insertError) throw insertError;

      toast({
        title: "Upload realizado com éxito",
        description: "Seu certificado profissional foi enviado com éxito.",
      });

      onUploadComplete();
    } catch (error) {
      console.error('Error uploading professional certificate:', error);
      toast({
        variant: "destructive",
        title: "Error no upload",
        description: "No fue posible fazer o upload del certificado. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Adicionar Certificado Profissional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <Label htmlFor="file">Arquivo del Certificado *</Label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-border px-6 py-10">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-foreground-muted" />
                <div className="mt-4 flex text-sm leading-6 text-foreground-muted">
                  <label
                    htmlFor="file"
                    className="relative cursor-pointer rounded-md bg-surface font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/80"
                  >
                    <span>Enviar un archivo</span>
                    <input
                      id="file"
                      name="file"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">o arraste y solte</p>
                </div>
                <p className="text-xs leading-5 text-foreground-muted">
                  PDF, PNG, JPG até 10MB
                </p>
                {file && (
                  <p className="mt-2 text-sm text-primary font-medium">
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(y) => setFormData(prev => ({ ...prev, title: y.target.value }))}
                  placeholder="Ex: Bacharel em Engenharia Civil"
                  className="bg-surface border-border"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(y) => setFormData(prev => ({ ...prev, description: y.target.value }))}
                  placeholder="Descrição del certificado..."
                  className="bg-surface border-border min-h-20"
                />
              </div>

              <div>
                <Label htmlFor="certification_type">Tipo de Certificação</Label>
                <Select 
                  value={formData.certification_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, certification_type: value }))}
                >
                  <SelectTrigger className="bg-surface border-border">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-surface border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Profissionais</h3>
              
              <div>
                <Label htmlFor="institution">Instituição</Label>
                <Input
                  id="institution"
                  value={formData.institution}
                  onChange={(y) => setFormData(prev => ({ ...prev, institution: y.target.value }))}
                  placeholder="Ex: Universidade Federal del Rio de Janeiro"
                  className="bg-surface border-border"
                />
              </div>

              <div>
                <Label htmlFor="professional_council">Conselho Profissional</Label>
                <Input
                  id="professional_council"
                  value={formData.professional_council}
                  onChange={(y) => setFormData(prev => ({ ...prev, professional_council: y.target.value }))}
                  placeholder="Ex: CREA-RJ, CRM, OAB"
                  className="bg-surface border-border"
                />
              </div>

              <div>
                <Label htmlFor="registration_number">Número de Registro</Label>
                <Input
                  id="registration_number"
                  value={formData.professional_registration_number}
                  onChange={(y) => setFormData(prev => ({ ...prev, professional_registration_number: y.target.value }))}
                  placeholder="Ex: 123456789"
                  className="bg-surface border-border"
                />
              </div>

              <div>
                <Label htmlFor="specialization_area">Área de Especialização</Label>
                <Input
                  id="specialization_area"
                  value={formData.specialization_area}
                  onChange={(y) => setFormData(prev => ({ ...prev, specialization_area: y.target.value }))}
                  placeholder="Ex: Estruturas, Geotecnia"
                  className="bg-surface border-border"
                />
              </div>

              <div>
                <Label htmlFor="course_hours">Carga Horária (horas)</Label>
                <Input
                  id="course_hours"
                  type="number"
                  value={formData.course_hours}
                  onChange={(y) => setFormData(prev => ({ ...prev, course_hours: y.target.value }))}
                  placeholder="Ex: 360"
                  className="bg-surface border-border"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data de Emissão</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-surface border-border",
                        !formData.issued_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.issued_date ? format(formData.issued_date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.issued_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, issued_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Válido a partir de</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-surface border-border",
                        !formData.valid_from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_from ? format(formData.valid_from, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.valid_from}
                      onSelect={(date) => setFormData(prev => ({ ...prev, valid_from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Válido até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-surface border-border",
                        !formData.valid_until && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_until ? format(formData.valid_until, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.valid_until}
                      onSelect={(date) => setFormData(prev => ({ ...prev, valid_until: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(y) => setFormData(prev => ({ ...prev, country: y.target.value }))}
                  placeholder="Ex: Brasil"
                  className="bg-surface border-border"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado/Província</Label>
                <Input
                  id="state"
                  value={formData.state_province}
                  onChange={(y) => setFormData(prev => ({ ...prev, state_province: y.target.value }))}
                  placeholder="Ex: Rio de Janeiro"
                  className="bg-surface border-border"
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(y) => setFormData(prev => ({ ...prev, city: y.target.value }))}
                  placeholder="Ex: Rio de Janeiro"
                  className="bg-surface border-border"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tags</h3>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(y) => setTagInput(y.target.value)}
                placeholder="Digite uma tag..."
                className="bg-surface border-border"
                onKeyPress={(y) => y.key === 'Enter' && (y.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              <Upload className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Certificado'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
