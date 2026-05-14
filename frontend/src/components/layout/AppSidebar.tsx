import {
  Award,
  Home,
  Bot,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  Trash2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { useToast } from "@/hooks/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state, toggleSidebar } = useSidebar();
  const { userRole } = useAuth();
  const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession } =
    useAIChatContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isOnAIChat = currentPath.startsWith("/ai-chat");

  const navigationItems = [
    ...(userRole === "admin" || userRole === "moderator"
      ? [{ title: t("navigation.dashboard"), url: "/dashboard", icon: Home }]
      : []),
    { title: t("navigation.certificates"), url: "/certificates", icon: Award },
    { title: t("navigation.aiAssistant"), url: "/ai-chat", icon: Bot },
  ];

  const adminItems = [
    { title: t("navigation.users"),             url: "/users",                 icon: Users },
    { title: t("navigation.adminConversations"), url: "/admin/conversations",   icon: MessageSquareText },
    { title: t("navigation.docPermissions"),     url: "/admin/doc-permissions", icon: ShieldCheck },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const base =
      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm w-full";
    if (isActive(path)) {
      return `${base} bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white text-white shadow-primary`;
    }
    return `${base} text-white hover:text-[#F3F7FC] hover:bg-white/[0.07]`;
  };

  const handleNewAIChat = async () => {
    const { error } = await createSession(t("navigation.newConversation"));
    if (error) {
      toast({ variant: "destructive", title: t("aiChat.errorCreate"), description: error.message });
      return;
    }
    navigate("/ai-chat");
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    navigate("/ai-chat");
  };

  const handleDeleteSession = async (sessionId: string) => {
    const { error } = await deleteSession(sessionId);
    if (error) {
      toast({ variant: "destructive", title: t("aiChat.errorDelete"), description: error.message });
      return;
    }
    toast({ title: t("aiChat.deletedSuccess") });
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent
        className="border-r flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.98) 100%)",
          borderColor: "rgba(96,165,250,0.14)",
        }}
      >

        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(96,165,250,0.12)' }}>
          {!collapsed ? (
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
            >
              <div className="w-8 h-8 bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[15px] text-white leading-tight">SmartMatch</h2>
                <p className="text-[11px]" style={{ color: 'rgba(147,197,253,0.6)' }}>Enterprise Platform</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-[linear-gradient(135deg,#3B82F6_0%,#6A8DFF_100%)] text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Award className="w-5 h-5 text-white" />
              </div>
              <button
                onClick={toggleSidebar}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main nav */}
        <SidebarGroup className="pt-3 flex-shrink-0">
          {!collapsed && (
            <p className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              {t("navigation.dashboard")}
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-0.5">
              {navigationItems.map((item) => {
                const isAIChat = item.url === "/ai-chat";
                return (
                  <SidebarMenuItem key={item.title}>
                    <div className={isAIChat && !collapsed ? "flex items-center gap-0.5" : undefined}>
                      <SidebarMenuButton asChild className={isAIChat && !collapsed ? "flex-1 min-w-0" : undefined}>
                        <NavLink
                          to={item.url}
                          className={getNavClass(item.url)}
                          title={collapsed ? item.title : undefined}
                        >
                          <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                      {isAIChat && !collapsed && (
                        <button
                          onClick={handleNewAIChat}
                          title={t("navigation.newConversation")}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(255,255,255,0.08)';
                            el.style.color = 'rgba(255,255,255,0.85)';
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'transparent';
                            el.style.color = 'rgba(255,255,255,0.3)';
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sessions */}
                    {isAIChat && !collapsed && isOnAIChat && sessions.length > 0 && (
                      <div className="ml-4 mt-1 border-l pl-2" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                        <p className="text-[10px] uppercase tracking-wider px-1 py-1"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {t("aiChat.conversations")}
                        </p>
                        <ScrollArea className="max-h-52">
                          <div className="space-y-0.5 pr-1">
                            {sessions.map((session) => (
                              <div
                                key={session.id}
                                className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all cursor-pointer ${
                                  activeSessionId === session.id
                                    ? "bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)]"
                                    : "hover:bg-white/[0.05] border border-transparent"
                                }`}
                                style={activeSessionId === session.id
                                  ? { color: 'rgba(147,197,253,0.9)' }
                                  : { color: 'rgba(255,255,255,0.45)' }}
                              >
                                <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />
                                <button
                                  className="flex-1 min-w-0 text-left truncate"
                                  onClick={() => handleSelectSession(session.id)}
                                  title={session.title || t("aiChat.noTitle")}
                                >
                                  {session.title || t("aiChat.noTitle")}
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                      style={{ color: 'rgba(248,113,113,0.7)' }}
                                      onClick={(e) => e.stopPropagation()}
                                      title={t("aiChat.deleteConversation")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-[#202938] border-[#3E4A5F]">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t("aiChat.deleteConversation")}</AlertDialogTitle>
                                      <AlertDialogDescription className="text-white">
                                        {t("aiChat.confirmDeleteDesc", {
                                          title: session.title || t("aiChat.noTitle"),
                                        })}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-[#E5484D] text-[#F3F7FC] hover:bg-[#E5484D]/90"
                                        onClick={() => handleDeleteSession(session.id)}
                                      >
                                        {t("common.delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section */}
        {(userRole === "admin" || userRole === "reviewer") && (
          <SidebarGroup className="flex-shrink-0">
            {!collapsed ? (
              <div className="px-4 pt-4 pb-1.5">
                <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Administración
                </p>
              </div>
            ) : (
              <div className="mx-3 h-px my-2" style={{ background: 'rgba(255,255,255,0.07)' }} />
            )}
            <SidebarGroupContent>
              <SidebarMenu className="px-2 gap-0.5">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClass(item.url)}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bottom version */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
              SmartMatch · v2.0
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}


