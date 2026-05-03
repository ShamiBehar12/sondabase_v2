import {
  BarChart3,
  FileText,
  Award,
  Search,
  Settings,
  Users,
  Download,
  Home,
  GraduationCap,
  CheckCircle,
  ClipboardList,
  Bot,
  MapPin,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

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
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const navigationItems = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: Home },
    // { title: t('navigation.successStories'), url: "/success-stories", icon: FileText },
    { title: t('navigation.certificates'), url: "/certificates", icon: Award },
    // { title: t('navigation.professionalCertificates'), url: "/professional-certificates", icon: GraduationCap },
    { title: t('myCertificates.title'), url: "/my-certificates", icon: ClipboardList },
    // { title: "Minhas Historias", url: "/my-success-stories", icon: FileText },
    { title: "Asistente IA", url: "/ai-chat", icon: Bot },
    // { title: "Smart Cities RAG", url: "/smart-cities", icon: MapPin },
    // { title: "Carga Masiva RAG", url: "/smart-cities/ingest", icon: Upload },
  ];

  const adminItems = [
    { title: "Aprobación de Certificados", url: "/certificate-approval", icon: CheckCircle },
    // { title: "Aprobación de Historias", url: "/success-story-approval", icon: FileText },
    { title: t('navigation.users'), url: "/users", icon: Users },
    // { title: "Administração IA", url: "/ai-admin", icon: Bot },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const baseClass = "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm";
    if (isActive(path)) {
      return `${baseClass} bg-primary/[0.12] text-primary font-semibold`;
    }
    return `${baseClass} text-foreground-secondary font-medium hover:text-foreground hover:bg-white/[0.05]`;
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo Area */}
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-white/15 backdrop-blur-sm px-3 py-2.5 relative">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-blue-400">StoryCert</h2>
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
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
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
        <SidebarGroup className="px-3 pt-3">
          {!collapsed && (
            <SidebarGroupLabel className="nav-section-label">
              {t('navigation.dashboard')}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClass(item.url)}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only show for admins */}
        {(userRole === 'admin' || userRole === 'reviewer') && (
          <SidebarGroup className="px-3 pt-2">
            {!collapsed && (
              <div className="border-t border-sidebar-border/60 mb-3 mt-1" />
            )}
            {!collapsed && (
              <SidebarGroupLabel className="nav-section-label">
                Administración
              </SidebarGroupLabel>
            )}
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
                        <item.icon className="w-4 h-4 flex-shrink-0" />
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
