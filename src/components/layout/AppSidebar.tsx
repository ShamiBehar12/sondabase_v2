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
  Upload
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
  const { state } = useSidebar();
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
    { title: "Assistente IA", url: "/ai-chat", icon: Bot },
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
    const baseClass = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium";
    if (isActive(path)) {
      return `${baseClass} bg-gradient-primary text-white shadow-primary`;
    }
    return `${baseClass} text-foreground-secondary hover:text-foreground hover:bg-surface-hover`;
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo Area */}
        <div className="p-6 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gradient">StoryCert</h2>
                <p className="text-xs text-foreground-muted">Enterprise Platform</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto">
              <Award className="w-5 h-5 text-white" />
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
              {navigationItems.map((item) => (
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

        {/* Admin Section - Only show for admins */}
        {(userRole === 'admin' || userRole === 'reviewer') && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administração
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
