import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { preferences, loading } = useUserPreferences();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Sync i18n with user preferences on load
  useEffect(() => {
    if (!loading && preferences.language_preference && preferences.language_preference !== i18n.language) {
      i18n.changeLanguage(preferences.language_preference);
    }
  }, [preferences.language_preference, loading, i18n]);

  const changeLanguage = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    
    // Update user preference in database if user is logged in
    if (user) {
      try {
        await apiClient
          .from('profiles')
          .update({ language_preference: langCode })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating language preference:', error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-flex">
            {currentLanguage.flag} {currentLanguage.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`cursor-pointer ${
              i18n.language === language.code ? 'bg-accent' : ''
            }`}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
