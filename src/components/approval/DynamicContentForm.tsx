import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentType, ContentItem } from '@/hooks/useContentApproval';
import { Save, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DynamicContentFormProps {
  contentType: ContentType;
  item?: ContentItem;
  onSave: (data: any) => Promise<void>;
  onSubmitForReview?: (data: any) => Promise<void>;
  isEditing?: boolean;
  className?: string;
}

export function DynamicContentForm({
  contentType,
  item,
  onSave,
  onSubmitForReview,
  isEditing = false,
  className
}: DynamicContentFormProps) {
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: item?.dados || {}
  });

  const fields = contentType.schema_campos?.fields || [];
  const currentLang = i18n.language as 'pt' | 'es' | 'en';

  // Reset form when item changes
  useEffect(() => {
    if (item?.dados) {
      form.reset(item.dados);
    }
  }, [item, form]);

  const handleSave = async (data: any) => {
    setIsLoading(true);
    try {
      await onSave(data);
      form.reset(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForReview = async (data: any) => {
    if (!onSubmitForReview) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitForReview(data);
      form.reset(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const fieldName = field.name;
    const label = field[`label_${currentLang}`] || field.label_pt || field.name;
    const required = field.required;

    return (
      <FormField
        key={fieldName}
        control={form.control}
        name={fieldName}
        rules={{ required: required ? `${label} é obrigatório` : false }}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {renderFieldInput(field, formField)}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const renderFieldInput = (fieldConfig: any, formField: any) => {
    switch (fieldConfig.type) {
      case 'string':
        return (
          <Input
            {...formField}
            placeholder={`Digite ${fieldConfig[`label_${currentLang}`] || fieldConfig.label_pt}`}
          />
        );
      
      case 'richtext':
      case 'text':
        return (
          <Textarea
            {...formField}
            placeholder={`Digite ${fieldConfig[`label_${currentLang}`] || fieldConfig.label_pt}`}
            rows={4}
          />
        );
      
      case 'date':
        return (
          <Input
            {...formField}
            type="date"
          />
        );
      
      case 'select':
        return (
          <Select value={formField.value} onValueChange={formField.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${fieldConfig[`label_${currentLang}`] || fieldConfig.label_pt}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option[`label_${currentLang}`] || option.label_pt || option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            {...formField}
            type="number"
            placeholder={`Digite ${fieldConfig[`label_${currentLang}`] || fieldConfig.label_pt}`}
            onChange={(e) => formField.onChange(parseInt(e.target.value) || 0)}
          />
        );
      
      default:
        return (
          <Input
            {...formField}
            placeholder={`Digite ${fieldConfig[`label_${currentLang}`] || fieldConfig.label_pt}`}
          />
        );
    }
  };

  const canSubmitForReview = () => {
    if (!onSubmitForReview) return false;
    if (!item) return false; // Can only submit existing items
    
    // Check if required fields are filled
    const requiredFields = fields.filter((field: any) => field.required);
    const currentValues = form.getValues();
    
    return requiredFields.every((field: any) => {
      const value = currentValues[field.name];
      return value && value.toString().trim() !== '';
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Editar' : 'Criar'} {contentType[`name_${currentLang}`] || contentType.name_pt}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            {fields.map((field: any) => renderField(field))}
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                onClick={form.handleSubmit(handleSave)}
                disabled={isLoading || isSubmitting}
                variant="outline"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              {onSubmitForReview && (
                <Button
                  type="button"
                  onClick={form.handleSubmit(handleSubmitForReview)}
                  disabled={!canSubmitForReview() || isLoading || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para Revisão
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}