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
    <header className="sticky top-0 z-50" style={{
      background: 'rgba(16,26,43,0.86)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(96,165,250,0.12)',
    }}>
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Left */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-white hover:text-[#F3F7FC]" />
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <LanguageSelector />

          <div className="w-px h-5 mx-1" style={{ background: 'rgba(96,165,250,0.16)' }} />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative w-9 h-9 p-0 rounded-xl hover:bg-white/[0.06]">
                <Bell className="w-4 h-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2.5 border-b border-[rgba(62,74,95,0.4)]">
                <h3 className="font-semibold text-sm text-[#F3F7FC]">{t('notifications')}</h3>
              </div>
              {[
                { color: 'bg-info', title: 'Nova exportação concluída', sub: 'Success Story - Cliente ABC' },
                { color: 'bg-warning', title: 'Certificado expirando', sub: 'ISO 9001 - vence em 30 dias' },
                { color: 'bg-success', title: 'Story aprovada', sub: 'Case XYZ foi publicado' },
              ].map((n, i) => (
                <DropdownMenuItem key={i} className="p-3 gap-3 focus:bg-white/[0.04] cursor-pointer">
                  <div className={`w-2 h-2 rounded-full ${n.color} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="font-medium text-sm text-[#F3F7FC]">{n.title}</p>
                    <p className="text-xs text-white mt-0.5">{n.sub}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 mx-1" style={{ background: 'rgba(96,165,250,0.16)' }} />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2.5 rounded-xl hover:bg-white/[0.06]">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white text-white text-xs font-bold">
                    {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-[#F3F7FC] leading-tight">
                    {profile.full_name || user?.email}
                  </p>
                  <p className="text-[11px] text-white leading-tight">{t('auth.loggedInUser')}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400 gap-2 cursor-pointer focus:text-red-400" onClick={signOut}>
                <LogOut className="w-4 h-4" />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}


