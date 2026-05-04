import {
  Award,
  Users,
  Home,
  CheckCircle,
  ClipboardList,
  Bot,
  ChevronDown,
  MessageSquarePlus,
  Trash2,
  FolderSearch,
  MessagesSquare,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAIChatContext } from '@/contexts/AIChatContext';
import { useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const { userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession } = useAIChatContext();

  const isAIChat = currentPath.startsWith("/ai-chat");
  const [aiOpen, setAiOpen] = useState(isAIChat);

  const isAdminOrReviewer = userRole === 'admin' || userRole === 'reviewer';

  const navigationItems = [
    ...(isAdminOrReviewer ? [{ title: t('navigation.dashboard'), url: "/dashboard", icon: Home }] : []),
    { title: t('navigation.certificates'), url: "/certificates", icon: Award },
    { title: t('myCertificates.title'), url: "/my-certificates", icon: ClipboardList },
    { title: t('navigation.documentExplorer'), url: "/documents", icon: FolderSearch },
  ];

  const adminItems = [
    { title: t('navigation.certificateApproval'), url: "/certificate-approval", icon: CheckCircle, roles: ['admin', 'reviewer'] },
    { title: t('navigation.users'), url: "/users", icon: Users, roles: ['admin'] },
    { title: t('navigation.adminConversations'), url: "/admin/conversations", icon: MessagesSquare, roles: ['admin'] },
  ].filter(item => item.roles.includes(userRole || ''));

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const base = "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm w-full";
    if (isActive(path)) return `${base} bg-primary/[0.12] text-primary font-semibold`;
    return `${base} text-foreground-secondary font-medium hover:text-foreground hover:bg-white/[0.05]`;
  };

  const handleNewSession = async () => {
    await createSession(t('navigation.newConversation'));
    navigate("/ai-chat");
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    navigate("/ai-chat");
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteSession(sessionId);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo Area */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-white/15 backdrop-blur-sm px-3 py-2.5">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Award className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-blue-400">StoryCert</h2>
                <p className="text-xs text-foreground-muted">Enterprise Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="px-3 pt-3">
          {!collapsed && (
            <SidebarGroupLabel className="nav-section-label">
              {t('navigation.main')}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
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

              {/* AI Assistant with collapsible sessions */}
              <SidebarMenuItem>
                <Collapsible open={!collapsed && aiOpen} onOpenChange={setAiOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={getNavClass("/ai-chat")}
                      title={collapsed ? t('navigation.aiAssistant') : undefined}
                      onClick={() => { if (!collapsed) { setAiOpen(o => !o); } else { navigate("/ai-chat"); } }}
                    >
                      <Bot className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{t('navigation.aiAssistant')}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${aiOpen ? "rotate-180" : ""}`} />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-4 mt-1 border-l border-sidebar-border/60 pl-3 space-y-0.5">
                      {/* New conversation */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          className="flex items-center gap-2 text-xs text-foreground-muted hover:text-primary cursor-pointer py-1.5"
                          onClick={handleNewSession}
                        >
                          <MessageSquarePlus className="w-3 h-3 flex-shrink-0" />
                          <span>{t('navigation.newConversation')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {/* Recent sessions */}
                      {sessions.slice(0, 8).map((session) => (
                        <SidebarMenuSubItem key={session.id}>
                          <div className={`group flex items-center gap-1 rounded-md transition-colors ${
                            activeSessionId === session.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground-muted hover:text-foreground hover:bg-white/[0.04]"
                          }`}>
                            <SidebarMenuSubButton
                              className="flex-1 min-w-0 text-xs py-1.5 cursor-pointer"
                              onClick={() => handleSelectSession(session.id)}
                            >
                              <span className="truncate block">{session.title || t('navigation.newConversation')}</span>
                            </SidebarMenuSubButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-error transition-opacity flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-surface border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">
                                    {t('navigation.newConversation')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-foreground-muted">
                                    {session.title || "Sin título"}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                  >
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdminOrReviewer && adminItems.length > 0 && (
          <SidebarGroup className="px-3 pt-2">
            {!collapsed && <div className="border-t border-sidebar-border/60 mb-3 mt-1" />}
            {!collapsed && (
              <SidebarGroupLabel className="nav-section-label">
                {t('navigation.administration')}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
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
