import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Globe, Save, Grid3x3 } from 'lucide-react';
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
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: '',
    language_preference: 'pt',
    certificates_view_mode: 'grid'
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await apiClient
        .from('profiles')
        .select('full_name, avatar_url, language_preference, certificates_view_mode')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          language_preference: data.language_preference || 'pt',
          certificates_view_mode: data.certificates_view_mode || 'grid'
        });
        // Set the current language based on user preference
        if (data.language_preference && data.language_preference !== i18n.language) {
          i18n.changeLanguage(data.language_preference);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await apiClient
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          language_preference: profile.language_preference,
          certificates_view_mode: profile.certificates_view_mode
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update the app language
      i18n.changeLanguage(profile.language_preference);

      toast({
        title: t('settings.saved'),
        description: t('settings.savedDescription'),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('settings.saveError'),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedLanguage = languages.find(lang => lang.code === profile.language_preference) || languages[0];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">{t('profile')}</h1>
            <p className="text-foreground-muted">{t('settings.description')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Information Card */}
        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-primary" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>
              {t('settings.profileDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-surface/50 rounded-lg border border-border/50">
              <Avatar className="h-20 w-20 shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {profile.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">{t('settings.avatarUrl')}</Label>
                <AvatarSelector
                  selectedAvatarUrl={profile.avatar_url}
                  onAvatarSelect={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
                />
                <p className="text-xs text-foreground-muted">
                  Selecione um avatar da galeria disponível para personalizar o seu perfil.
                </p>
              </div>
            </div>

            {/* Personal Info Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">{t('settings.fullName')}</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder={t('settings.fullNamePlaceholder')}
                  className="bg-surface border-border h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('settings.email')}</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-surface border-border opacity-60 h-10"
                />
                <p className="text-xs text-foreground-muted">
                  {t('settings.emailNote')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Language Settings */}
          <Card className="premium-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>
                {t('settings.languageDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">{t('settings.preferredLanguage')}</Label>
                <Select 
                  value={profile.language_preference} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, language_preference: value }))}
                >
                  <SelectTrigger className="bg-surface border-border h-10">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{selectedLanguage.flag}</span>
                        <span>{selectedLanguage.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <div className="flex items-center gap-2">
                          <span>{language.flag}</span>
                          <span>{language.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-surface/50 rounded-lg border border-border/50">
                <h4 className="font-medium text-foreground text-sm mb-2">{t('settings.languagePreview')}:</h4>
                <div className="space-y-1 text-xs text-foreground-muted">
                  <p>• {t('settings.interfaceLanguage')}</p>
                  <p>• {t('settings.dateFormat')}</p>
                  <p>• {t('notifications')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificates View Settings */}
          <Card className="premium-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-primary" />
                {t('settings.certificates')}
              </CardTitle>
              <CardDescription>
                {t('settings.certificatesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certificates_view_mode" className="text-sm font-medium">{t('settings.certificatesViewMode')}</Label>
                <Select 
                  value={profile.certificates_view_mode} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, certificates_view_mode: value }))}
                >
                  <SelectTrigger className="bg-surface border-border h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4" />
                        <span>{t('certificates.gridView')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="list">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4 rotate-90" />
                        <span>{t('certificates.listView')}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-surface/50 rounded-lg border border-border/50">
                <h4 className="font-medium text-foreground text-sm mb-2">{t('settings.certificatesPreview')}:</h4>
                <div className="space-y-1 text-xs text-foreground-muted">
                  <p>• {t('settings.certificatesViewDescription')}</p>
                  <p>• {t('dashboard.views')}</p>
                  <p>• {t('navigation.certificates')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90 min-w-[160px] h-10 text-sm font-medium"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
