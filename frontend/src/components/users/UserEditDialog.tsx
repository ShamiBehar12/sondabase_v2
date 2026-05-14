import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { AvatarSelector } from './AvatarSelector';

interface User {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface UserEditDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => Promise<void>;
}

export function UserEditDialog({ user, isOpen, onClose, onUserUpdated }: UserEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    avatarUrl: '',
    role: 'user'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        avatarUrl: user.avatar_url || '',
        role: user.role || 'user'
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile information
      const { error: profileError } = await apiClient
        .from('profiles')
        .update({
          full_name: formData.fullName,
          avatar_url: formData.avatarUrl || null
        })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update user role if changed
      if (formData.role !== user.role) {
        // Delete existing role
        await apiClient
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        // Insert new role
        const { error: roleError } = await apiClient
          .from('user_roles')
          .insert({ user_id: user.user_id, role: formData.role as 'admin' | 'moderator' | 'user' | 'reviewer' });

        if (roleError) throw roleError;
      }

      toast({
        title: "Usuario atualizado",
        description: "As informações del usuario foram atualizadas com éxito.",
      });

      // Call the parent callback to refresh and wait for it
      await onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No fue posible atualizar o usuario.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#202938] border-[#3E4A5F]">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Edite as informações del usuario {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              placeholder="Digite o nome completo"
              value={formData.fullName}
              onChange={(y) => setFormData(prev => ({ ...prev, fullName: y.target.value }))}
              className="bg-[#171C25] border-[#3E4A5F]"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              className="bg-[#171C25] border-[#3E4A5F]"
              disabled
              title="O email no pode ser alterado"
            />
            <p className="text-xs text-white">O email no pode ser alterado</p>
          </div>

          <Tabs defaultValue="avatar-selector" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="avatar-selector">Selecionar Avatar</TabsTrigger>
              <TabsTrigger value="custom-url">URL Personalizada</TabsTrigger>
            </TabsList>
            
            <TabsContent value="avatar-selector" className="space-y-2">
              <Label>Escolha un Avatar</Label>
              <AvatarSelector
                selectedAvatarUrl={formData.avatarUrl}
                onAvatarSelect={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
              />
            </TabsContent>
            
            <TabsContent value="custom-url" className="space-y-2">
              <Label htmlFor="avatarUrl">URL del Avatar Personalizada</Label>
              <Input
                id="avatarUrl"
                placeholder="https://exemplo.com/avatar.jpg"
                value={formData.avatarUrl}
                onChange={(y) => setFormData(prev => ({ ...prev, avatarUrl: y.target.value }))}
                className="bg-[#171C25] border-[#3E4A5F]"
                disabled={loading}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger className="bg-[#171C25] border-[#3E4A5F]" disabled={loading}>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="moderator">Moderador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white text-white" 
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


