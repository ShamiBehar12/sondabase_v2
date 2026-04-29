import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { Search, UserPlus, Edit, Trash2, Shield, Users as UsersIcon, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { UserEditDialog } from '@/components/users/UserEditDialog';

export default function Users() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const { users, loading, updateUserRole, deleteUser, createUser, refetch } = useUsers();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'moderator' | 'user'
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  }) || [];

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleUserUpdated = async () => {
    await refetch();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro que deseas eliminar este usuario?')) return;

    try {
      await deleteUser(userId);
      toast({
        title: "Usuario eliminado",
        description: "Usuario eliminado com éxito.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No fue posible excluir o usuario.",
      });
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!confirm(`Enviar email de restablecimiento de senha para ${email}?`)) return;

    try {
      const { error } = await apiClient.functions.invoke('send-password-reset', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Link de restablecimiento de senha enviado para ${email}.`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No fue posible enviar o email de restablecimiento.",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Todos os campos são obrigatórios.",
      });
      return;
    }

    try {
      await createUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      toast({
        title: "Usuario criado",
        description: `Usuario ${newUser.fullName} criado com éxito.`,
      });
      setShowCreateDialog(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'user' });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No fue posible crear o usuario.",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'moderator': return <UsersIcon className="h-3 w-3" />;
      default: return null;
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('approval.accessDenied')}</h1>
          <p className="text-foreground-muted">{t('approval.accessDeniedMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">{t('navigation.users')}</h1>
          <p className="text-foreground-muted mt-2">{t('users.subtitle')}</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('users.newUser')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted h-4 w-4" />
            <Input
              placeholder={t('users.searchUsers')}
              value={searchTerm}
              onChange={(y) => setSearchTerm(y.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[180px] bg-surface border-border">
            <SelectValue placeholder="Filtrar por função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="moderator">Moderador</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="text-center text-foreground-muted">Carregando usuarios...</div>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="text-center text-foreground-muted">Ningún usuario encontrado</div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.user_id} className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.full_name || 'Nombre no informado'}</h3>
                      <p className="text-sm text-foreground-muted">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role === 'admin' ? 'Administrador' : 
                           user.role === 'moderator' ? 'Moderador' : 'Usuario'}
                        </Badge>
                        <span className="text-xs text-foreground-muted">
                          Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePasswordReset(user.email)}
                      title={t('users.resetPasswordTitle')}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteUser(user.user_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Añade un nuevo usuario al sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                placeholder="Digite o nome completo"
                value={newUser.fullName}
                onChange={(y) => setNewUser(prev => ({ ...prev, fullName: y.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite o email"
                value={newUser.email}
                onChange={(y) => setNewUser(prev => ({ ...prev, email: y.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha"
                value={newUser.password}
                onChange={(y) => setNewUser(prev => ({ ...prev, password: y.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Função</Label>
              <Select value={newUser.role} onValueChange={(value: 'admin' | 'moderator' | 'user') => setNewUser(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-background border-border">
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
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} className="bg-gradient-primary">
                Crear Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <UserEditDialog
        user={editingUser}
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingUser(null);
        }}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
