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
    <header className="bg-background-secondary/75 backdrop-blur-md border-b border-border/40 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="lg:hidden" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <LanguageSelector />

          <div className="w-px h-5 bg-border/60 mx-1" />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative w-9 h-9 p-0 hover:bg-white/[0.06]">
                <Bell className="w-4 h-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] p-0 font-bold"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2.5 border-b border-border/50">
                <h3 className="font-semibold text-sm">{t('notifications')}</h3>
              </div>
              <DropdownMenuItem className="p-3 gap-3 focus:bg-white/[0.04]">
                <div className="w-1.5 h-1.5 rounded-full bg-info flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-sm">Nova exportação concluída</p>
                  <p className="text-xs text-foreground-muted mt-0.5">Success Story - Cliente ABC</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 gap-3 focus:bg-white/[0.04]">
                <div className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-sm">Certificado expirando</p>
                  <p className="text-xs text-foreground-muted mt-0.5">ISO 9001 - vence em 30 dias</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 gap-3 focus:bg-white/[0.04]">
                <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-sm">Story aprovada</p>
                  <p className="text-xs text-foreground-muted mt-0.5">Case XYZ foi publicado</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border/60 mx-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2.5 hover:bg-white/[0.06]">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-primary text-white text-xs font-semibold">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-tight">{profile.full_name || user?.email}</p>
                  <p className="text-[11px] text-foreground-muted leading-tight">{t('auth.loggedInUser')}</p>
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
