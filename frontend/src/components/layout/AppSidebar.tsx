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
  const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession } =
    useAIChatContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isOnAIChat = currentPath.startsWith("/ai-chat");

  const navigationItems = [
    { title: t("navigation.dashboard"), url: "/dashboard", icon: Home },
    { title: t("navigation.certificates"), url: "/certificates", icon: Award },
    { title: t("navigation.aiAssistant"), url: "/ai-chat", icon: Bot },
  ];

  const adminItems = [
    { title: t("navigation.users"),             url: "/users",                  icon: Users },
    { title: t("navigation.adminConversations"), url: "/admin/conversations",    icon: MessageSquareText },
    { title: t("navigation.docPermissions"),     url: "/admin/doc-permissions",  icon: ShieldCheck },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const baseClass =
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium";
    if (isActive(path)) {
      return `${baseClass} bg-gradient-primary text-white shadow-primary`;
    }
    return `${baseClass} text-foreground-secondary hover:text-foreground hover:bg-surface-hover`;
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
      toast({
        variant: "destructive",
        title: t("aiChat.errorDelete"),
        description: error.message,
      });
      return;
    }
    toast({ title: t("aiChat.deletedSuccess") });
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
            {t("navigation.dashboard")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isAIChat = item.url === "/ai-chat";
                return (
                  <SidebarMenuItem key={item.title}>
                    <div className={isAIChat && !collapsed ? "flex items-center" : undefined}>
                      <SidebarMenuButton
                        asChild
                        className={isAIChat && !collapsed ? "flex-1" : undefined}
                      >
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
                          title={t("navigation.newConversation")}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0 mx-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sessions sub-list under AI Chat */}
                    {isAIChat && !collapsed && isOnAIChat && sessions.length > 0 && (
                      <div className="ml-4 mt-1 border-l border-sidebar-border pl-2">
                        <p className="text-[10px] uppercase tracking-wider text-foreground-muted px-1 py-1">
                          {t("aiChat.conversations")}
                        </p>
                        <ScrollArea className="max-h-52">
                          <div className="space-y-0.5 pr-1">
                            {sessions.map((session) => (
                              <div
                                key={session.id}
                                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                                  activeSessionId === session.id
                                    ? "bg-primary/20 text-primary"
                                    : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                                }`}
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
                                      className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:text-destructive flex-shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                      title={t("aiChat.deleteConversation")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-surface border-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {t("aiChat.deleteConversation")}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-foreground-muted">
                                        {t("aiChat.confirmDeleteDesc", {
                                          title: session.title || t("aiChat.noTitle"),
                                        })}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

        {/* Admin Section */}
        {(userRole === "admin" || userRole === "reviewer") && (
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
