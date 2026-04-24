import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAvatarTemplates } from '@/hooks/useAvatarTemplates';
import { User } from 'lucide-react';

interface AvatarSelectorProps {
  selectedAvatarUrl?: string;
  onAvatarSelect: (avatarUrl: string) => void;
}

export function AvatarSelector({ selectedAvatarUrl, onAvatarSelect }: AvatarSelectorProps) {
  const { templates, loading, getAvatarUrl } = useAvatarTemplates();
  const [isOpen, setIsOpen] = useState(false);

  const handleAvatarSelect = (filePath: string) => {
    const avatarUrl = getAvatarUrl(filePath);
    onAvatarSelect(avatarUrl);
    setIsOpen(false);
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <div className="w-6 h-6 mr-2 relative overflow-hidden rounded-full bg-muted flex items-center justify-center">
            {selectedAvatarUrl ? (
              <img 
                src={selectedAvatarUrl} 
                alt="Avatar selecionado"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`absolute inset-0 ${selectedAvatarUrl ? 'hidden' : 'flex'} items-center justify-center bg-primary text-primary-foreground`}>
              <User className="w-4 h-4" />
            </div>
          </div>
          {selectedAvatarUrl ? 'Alterar Avatar' : 'Selecionar Avatar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Avatar</DialogTitle>
          <DialogDescription>
            Escolha um avatar da galeria disponível
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-foreground-muted">Carregando avatares...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-foreground-muted">Nenhum avatar disponível.</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {category}
                    </Badge>
                    <span className="text-sm text-foreground-muted">
                      {categoryTemplates.length} avatares
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {categoryTemplates.map((template) => {
                      const avatarUrl = getAvatarUrl(template.file_path);
                      const isSelected = selectedAvatarUrl === avatarUrl;

                      return (
                        <button
                          key={template.id}
                          onClick={() => handleAvatarSelect(template.file_path)}
                          className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          title={template.name}
                        >
                          <div className="w-12 h-12 mx-auto relative rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={avatarUrl}
                              alt={template.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
