import { Bell, User, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '' });

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
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  return (
    <header className="bg-background-secondary/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <h3 className="font-semibold">{t('notifications')}</h3>
              </div>
              <DropdownMenuItem className="p-3">
                <div>
                  <p className="font-medium">Nova exportação concluída</p>
                  <p className="text-sm text-foreground-muted">Success Story - Cliente ABC</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3">
                <div>
                  <p className="font-medium">Certificado expirando</p>
                  <p className="text-sm text-foreground-muted">ISO 9001 - vence em 30 dias</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3">
                <div>
                  <p className="font-medium">Story aprovada</p>
                  <p className="text-sm text-foreground-muted">Case XYZ foi publicado</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-2 gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">{profile.full_name || user?.email}</p>
                  <p className="text-xs text-foreground-muted">{t('auth.loggedInUser')}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="w-4 h-4 mr-2" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-error" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
