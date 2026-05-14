import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { User, Globe, Save, Grid3x3, Lock } from 'lucide-react';
import { AvatarSelector } from '@/components/users/AvatarSelector';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '', language_preference: 'pt', certificates_view_mode: 'grid' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await apiClient.from('profiles').select('full_name, avatar_url, language_preference, certificates_view_mode').eq('user_id', user.id).single();
      if (error) throw error;
      if (data) {
        setProfile({ full_name: data.full_name || '', avatar_url: data.avatar_url || '', language_preference: data.language_preference || 'pt', certificates_view_mode: data.certificates_view_mode || 'grid' });
        if (data.language_preference && data.language_preference !== i18n.language) i18n.changeLanguage(data.language_preference);
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await apiClient.from('profiles').update({ full_name: profile.full_name, avatar_url: profile.avatar_url, language_preference: profile.language_preference, certificates_view_mode: profile.certificates_view_mode }).eq('user_id', user.id);
      if (error) throw error;
      i18n.changeLanguage(profile.language_preference);
      toast({ title: t('settings.saved'), description: t('settings.savedDescription') });
    } catch { toast({ variant: 'destructive', title: t('common.error'), description: t('settings.saveError') }); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Completa todos los campos' }); return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas nuevas no coinciden' }); return;
    }
    if (passwords.newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Error', description: 'Mínimo 8 caracteres' }); return;
    }
    setPwLoading(true);
    try {
      const { error } = await apiFetch('/api/users/me/password', { method: 'PUT', body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword } });
      if (error) throw new Error((error as any).message);
      toast({ title: 'Contraseña actualizada' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'No se pudo cambiar la contraseña' });
    } finally { setPwLoading(false); }
  };

  const selectedLanguage = languages.find(l => l.code === profile.language_preference) || languages[0];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white rounded-lg flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white bg-clip-text text-transparent">{t('profile')}</h1>
            <p className="text-white">{t('settings.description')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><User className="h-5 w-5 text-[#3B82F6]" />{t('settings.profile')}</CardTitle>
            <CardDescription>{t('settings.profileDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-[rgba(32,41,56,0.5)] rounded-lg border border-[rgba(62,74,95,0.5)]">
              <Avatar className="h-20 w-20 shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-[#3B82F6] text-[#F8FBFF] text-xl font-semibold">{profile.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">{t('settings.avatarUrl')}</Label>
                <AvatarSelector selectedAvatarUrl={profile.avatar_url} onAvatarSelect={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">{t('settings.fullName')}</Label>
                <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))} placeholder={t('settings.fullNamePlaceholder')} className="bg-[#202938] border-[#3E4A5F] h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('settings.email')}</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-[#202938] border-[#3E4A5F] opacity-60 h-10" />
                <p className="text-xs text-white">{t('settings.emailNote')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="premium-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-[#3B82F6]" />{t('settings.language')}</CardTitle>
              <CardDescription>{t('settings.languageDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('settings.preferredLanguage')}</Label>
                <Select value={profile.language_preference} onValueChange={(value) => setProfile(prev => ({ ...prev, language_preference: value }))}>
                  <SelectTrigger className="bg-[#202938] border-[#3E4A5F] h-10">
                    <SelectValue><div className="flex items-center gap-2"><span>{selectedLanguage.flag}</span><span>{selectedLanguage.name}</span></div></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2"><span>{lang.flag}</span><span>{lang.name}</span></div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2"><Grid3x3 className="h-5 w-5 text-[#3B82F6]" />{t('settings.certificates')}</CardTitle>
              <CardDescription>{t('settings.certificatesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('settings.certificatesViewMode')}</Label>
                <Select value={profile.certificates_view_mode} onValueChange={(value) => setProfile(prev => ({ ...prev, certificates_view_mode: value }))}>
                  <SelectTrigger className="bg-[#202938] border-[#3E4A5F] h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid"><div className="flex items-center gap-2"><Grid3x3 className="h-4 w-4" /><span>{t('certificates.gridView')}</span></div></SelectItem>
                    <SelectItem value="list"><div className="flex items-center gap-2"><Grid3x3 className="h-4 w-4 rotate-90" /><span>{t('certificates.listView')}</span></div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><Lock className="h-5 w-5 text-[#3B82F6]" />Cambiar contraseña</CardTitle>
            <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Contraseña actual</Label>
                <Input type="password" placeholder="••••••••" value={passwords.currentPassword} onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))} className="bg-[#202938] border-[#3E4A5F] h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nueva contraseña</Label>
                <Input type="password" placeholder="••••••••" value={passwords.newPassword} onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))} className="bg-[#202938] border-[#3E4A5F] h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Confirmar contraseña</Label>
                <Input type="password" placeholder="••••••••" value={passwords.confirmPassword} onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))} className="bg-[#202938] border-[#3E4A5F] h-10" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handlePasswordChange} disabled={pwLoading} variant="outline" className="border-[rgba(59,130,246,0.4)] text-[#3B82F6] hover:bg-[rgba(59,130,246,0.1)] min-w-[180px] h-10">
                <Lock className="h-4 w-4 mr-2" />
                {pwLoading ? 'Guardando…' : 'Cambiar contraseña'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 border-t border-[rgba(62,74,95,0.5)]">
          <Button onClick={handleSave} disabled={loading} className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white hover:brightness-110 min-w-[160px] h-10 text-sm font-medium">
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}



