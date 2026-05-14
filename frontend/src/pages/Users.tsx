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
import { Search, UserPlus, Edit, Trash2, Shield, Users as UsersIcon, KeyRound, SlidersHorizontal, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { apiClient, apiFetch } from '@/lib/api-client';
import { UserEditDialog } from '@/components/users/UserEditDialog';

interface AccessFilters {
  countries: string[];
  tags: string[];
  years: number[];
}

function DocumentPolicyDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<AccessFilters>({ countries: [], tags: [], years: [] });
  const [inputValues, setInputValues] = useState({ country: '', tag: '', year: '' });
  const { toast } = useToast();

  const loadPolicy = async () => {
    setLoading(true);
    const { data } = await apiFetch<{ accessFilters: AccessFilters | null }>(`/api/users/${userId}/document-policy`);
    if (data?.accessFilters) setPolicy(data.accessFilters);
    else setPolicy({ countries: [], tags: [], years: [] });
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadPolicy();
  };

  const addItem = (field: 'countries' | 'tags', inputField: 'country' | 'tag') => {
    const val = inputValues[inputField].trim();
    if (!val) return;
    setPolicy(p => ({ ...p, [field]: [...new Set([...p[field], val])] }));
    setInputValues(v => ({ ...v, [inputField]: '' }));
  };

  const addYear = () => {
    const y = parseInt(inputValues.year, 10);
    if (!y || y < 1900 || y > 2100) return;
    setPolicy(p => ({ ...p, years: [...new Set([...p.years, y])].sort((a, b) => b - a) }));
    setInputValues(v => ({ ...v, year: '' }));
  };

  const removeItem = (field: keyof AccessFilters, value: string | number) => {
    setPolicy(p => ({ ...p, [field]: (p[field] as any[]).filter((v: any) => v !== value) }));
  };

  const save = async () => {
    setSaving(true);
    const hasPolicy = policy.countries.length || policy.tags.length || policy.years.length;
    await apiFetch(`/api/users/${userId}/document-policy`, {
      method: 'PUT',
      body: { accessFilters: hasPolicy ? policy : null },
    });
    setSaving(false);
    setOpen(false);
    toast({ title: 'Policy saved', description: `Access policy updated for ${userName}` });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Document access policy">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#202938] border-[#3E4A5F] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F3F7FC]">Document Access Policy</DialogTitle>
          <DialogDescription className="text-white">
            Restrict which documents <strong>{userName}</strong> can see. Leave empty for full access.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-6 text-center text-white text-sm">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Countries */}
            <div>
              <Label className="text-xs font-semibold text-white uppercase tracking-wide mb-2 block">Countries</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. Chile"
                  value={inputValues.country}
                  onChange={e => setInputValues(v => ({ ...v, country: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem('countries', 'country')}
                  className="h-8 text-sm bg-[rgba(23,28,37,0.5)]"
                />
                <Button size="sm" variant="outline" onClick={() => addItem('countries', 'country')} className="h-8 px-2">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {policy.countries.map(c => (
                  <Badge key={c} variant="secondary" className="flex items-center gap-1 text-xs">
                    {c}
                    <button onClick={() => removeItem('countries', c)} className="hover:text-error"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs font-semibold text-white uppercase tracking-wide mb-2 block">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. apostillado"
                  value={inputValues.tag}
                  onChange={e => setInputValues(v => ({ ...v, tag: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem('tags', 'tag')}
                  className="h-8 text-sm bg-[rgba(23,28,37,0.5)]"
                />
                <Button size="sm" variant="outline" onClick={() => addItem('tags', 'tag')} className="h-8 px-2">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {policy.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeItem('tags', tag)} className="hover:text-error"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Years */}
            <div>
              <Label className="text-xs font-semibold text-white uppercase tracking-wide mb-2 block">Years</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="number"
                  placeholder="e.g. 2023"
                  value={inputValues.year}
                  onChange={e => setInputValues(v => ({ ...v, year: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addYear()}
                  className="h-8 text-sm bg-[rgba(23,28,37,0.5)]"
                />
                <Button size="sm" variant="outline" onClick={addYear} className="h-8 px-2">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {policy.years.map(y => (
                  <Badge key={y} variant="secondary" className="flex items-center gap-1 text-xs">
                    {y}
                    <button onClick={() => removeItem('years', y)} className="hover:text-error"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[rgba(62,74,95,0.4)]">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving} className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110">
                {saving ? 'Saving...' : 'Save Policy'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
          <h1 className="text-2xl font-bold text-[#F3F7FC] mb-2">{t('approval.accessDenied')}</h1>
          <p className="text-white">{t('approval.accessDeniedMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="relative z-20 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "#FFFFFF", textShadow: "0 1px 10px rgba(0,0,0,0.28)" }}
          >
            {t('navigation.users')}
          </h1>
          <p
            className="mt-2"
            style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
          >
            {t('users.subtitle')}
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110"
          style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
        >
          <UserPlus
            className="h-4 w-4 mr-2"
            style={{ color: "#FFFFFF", filter: "drop-shadow(0 1px 8px rgba(0,0,0,0.18))" }}
          />
          {t('users.newUser')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white h-4 w-4" />
            <Input
              placeholder={t('users.searchUsers')}
              value={searchTerm}
              onChange={(y) => setSearchTerm(y.target.value)}
              className="pl-10 bg-[#202938] border-[#3E4A5F]"
            />
          </div>
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger
            className="w-[180px] bg-[#202938] border-[#3E4A5F]"
            style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
          >
            <SelectValue
              placeholder={t('users.filterByRole')}
              className="text-white"
              style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allRoles')}</SelectItem>
            <SelectItem value="admin">{t('users.administrator')}</SelectItem>
            <SelectItem value="moderator">{t('users.moderator')}</SelectItem>
            <SelectItem value="user">{t('users.user')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="text-center text-white">{t('users.loading')}</div>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="text-center text-white">{t('users.noUsersFound')}</div>
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
                      <AvatarFallback className="bg-[#3B82F6] text-[#F8FBFF]">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-[#F3F7FC]">{user.full_name || t('users.nameNotProvided')}</h3>
                      <p className="text-sm text-white">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role === 'admin' ? t('users.administrator') :
                           user.role === 'moderator' ? t('users.moderator') : t('users.user')}
                        </Badge>
                        <span className="text-xs text-white">
                          {t('users.memberSince')} {new Date(user.created_at).toLocaleDateString()}
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
                    <DocumentPolicyDialog
                      userId={user.user_id}
                      userName={user.full_name || user.email}
                    />
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
        <DialogContent className="bg-[#202938] border-[#3E4A5F]">
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
                className="bg-[#171C25] border-[#3E4A5F]"
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
                className="bg-[#171C25] border-[#3E4A5F]"
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
                className="bg-[#171C25] border-[#3E4A5F]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Função</Label>
              <Select value={newUser.role} onValueChange={(value: 'admin' | 'moderator' | 'user') => setNewUser(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-[#171C25] border-[#3E4A5F]">
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
              <Button onClick={handleCreateUser} className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white text-white">
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



