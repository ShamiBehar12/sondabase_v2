import {
  Award,
  Home,
  GraduationCap,
  CheckCircle,
  ClipboardList,
  Bot,
  MapPin,
  Upload,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAIChatContext } from '@/contexts/AIChatContext';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state, toggleSidebar } = useSidebar();
  const { userRole } = useAuth();
  const { createSession } = useAIChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const navigationItems = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: Home },
    { title: t('navigation.certificates'), url: "/certificates", icon: Award },
    { title: t('myCertificates.title'), url: "/my-certificates", icon: ClipboardList },
    { title: t('navigation.aiAssistant'), url: "/ai-chat", icon: Bot },
  ];

  const adminItems = [
    { title: "Aprobación de Certificados", url: "/certificate-approval", icon: CheckCircle },
    { title: t('navigation.users'), url: "/users", icon: Users },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const baseClass = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium";
    if (isActive(path)) {
      return `${baseClass} bg-gradient-primary text-white shadow-primary`;
    }
    return `${baseClass} text-foreground-secondary hover:text-foreground hover:bg-surface-hover`;
  };

  const handleNewAIChat = async () => {
    await createSession();
    navigate("/ai-chat");
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo Area */}
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-2.5 relative">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-blue-400">SmartMatch</h2>
                <p className="text-xs text-foreground-muted">Enterprise Platform</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Award className="w-5 h-5 text-white" />
              </div>
              <button
                onClick={toggleSidebar}
                className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {t('navigation.dashboard')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isAIChat = item.url === "/ai-chat";
                return (
                  <SidebarMenuItem key={item.title}>
                    <div className={isAIChat && !collapsed ? "flex items-center" : undefined}>
                      <SidebarMenuButton asChild className={isAIChat && !collapsed ? "flex-1" : undefined}>
                        <NavLink
                          to={item.url}
                          className={getNavClass(item.url)}
                          title={collapsed ? item.title : undefined}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                      {isAIChat && !collapsed && (
                        <button
                          onClick={handleNewAIChat}
                          title={t('navigation.newConversation')}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0 mx-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {(userRole === 'admin' || userRole === 'reviewer') && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClass(item.url)}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
