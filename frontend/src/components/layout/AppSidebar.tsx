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
  ChevronDown,
  MessageSquare,
  Plus,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAIChatContext } from '@/contexts/AIChatContext';
import { useState } from 'react';

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
  const { sessions, activeSessionId, setActiveSessionId, createSession } = useAIChatContext();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [sessionsOpen, setSessionsOpen] = useState(true);

  const navigationItems = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: Home },
    // { title: t('navigation.successStories'), url: "/success-stories", icon: FileText },
    { title: t('navigation.certificates'), url: "/certificates", icon: Award },
    // { title: t('navigation.professionalCertificates'), url: "/professional-certificates", icon: GraduationCap },
    // { title: t('myCertificates.title'), url: "/my-certificates", icon: ClipboardList },
    // { title: "Minhas Historias", url: "/my-success-stories", icon: FileText },
    // { title: "Smart Cities RAG", url: "/smart-cities", icon: MapPin },
    // { title: "Carga Masiva RAG", url: "/smart-cities/ingest", icon: Upload },
  ];

  const adminItems = [
    { title: t('navigation.certificateApproval'), url: "/certificate-approval", icon: CheckCircle },
    // { title: "Aprobación de Historias", url: "/success-story-approval", icon: FileText },
    { title: t('navigation.users'), url: "/users", icon: Users },
    // { title: "Administración IA", url: "/ai-admin", icon: Bot },
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

  const handleSessionClick = (sessionId: string) => {
    setActiveSessionId(sessionId);
    navigate('/ai-chat');
  };

  const handleNewChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await createSession();
    setActiveSessionId(null);
    navigate('/ai-chat');
  };

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-16" : "w-64"}>
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

              {/* AI Assistant with sessions sub-items */}
              <SidebarMenuItem>
                <div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium cursor-pointer ${
                      isActive('/ai-chat') ? 'bg-gradient-primary text-white shadow-primary' : 'text-foreground-secondary hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <NavLink
                      to="/ai-chat"
                      className="flex items-center gap-3 flex-1 min-w-0"
                      title={collapsed ? t('navigation.aiAssistant') : undefined}
                    >
                      <Bot className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{t('navigation.aiAssistant')}</span>}
                    </NavLink>
                    {!collapsed && (
                      <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={handleNewChat}
                          title={t('aiChat.newChat')}
                          className="w-5 h-5 flex items-center justify-center rounded text-current/70 hover:text-current transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        {sessions.length > 0 && (
                          <button
                            onClick={(e) => { e.preventDefault(); setSessionsOpen(s => !s); }}
                            className="w-5 h-5 flex items-center justify-center rounded text-current/70 hover:text-current transition-transform"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${sessionsOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!collapsed && sessionsOpen && sessions.length > 0 && (
                    <div className="mt-1 ml-4 border-l border-border/50 pl-3 space-y-0.5 pb-1">
                      {sessions.slice(0, 8).map(session => (
                        <button
                          key={session.id}
                          onClick={() => handleSessionClick(session.id)}
                          className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors truncate block ${
                            activeSessionId === session.id
                              ? 'text-primary bg-primary/10'
                              : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                          }`}
                          title={session.title || t('aiChat.noTitle')}
                        >
                          {session.title || t('aiChat.noTitle')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only show for admins */}
        {(userRole === 'admin' || userRole === 'reviewer') && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              {t('navigation.administration')}
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
