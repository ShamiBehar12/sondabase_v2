import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bot, MessageSquare, User, ChevronRight, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
}

interface Session {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  userId: string;
  user?: SessionUser;
  messageCount?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminConversations() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<Session[]>("/api/admin/chat/sessions")
      .then(({ data }) => {
        if (data) setSessions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectSession = async (session: Session) => {
    setSelectedSession(session);
    setMessagesLoading(true);
    const { data } = await apiFetch<Message[]>(`/api/ai/chat/sessions/${session.id}/messages`);
    if (data) setMessages(data);
    setMessagesLoading(false);
  };

  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.user?.fullName?.toLowerCase().includes(q)
    );
  });

  const grouped = filteredSessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = s.userId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          {t("navigation.adminConversations")}
        </h1>
        <p className="text-foreground-muted text-sm mt-1">
          {sessions.length} {sessions.length === 1 ? "conversation" : "conversations"} across{" "}
          {Object.keys(grouped).length} users
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-200px)]">
        {/* Sessions list */}
        <div className="premium-card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/40">
            <Input
              placeholder="Search by user or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm bg-background/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-foreground-muted text-sm">
                {t("common.loading")}
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="flex items-center justify-center h-32 text-foreground-muted text-sm">
                No conversations found
              </div>
            ) : (
              Object.entries(grouped).map(([userId, userSessions]) => {
                const firstSession = userSessions[0];
                const userName = firstSession.user?.fullName || firstSession.user?.email || userId;
                const userEmail = firstSession.user?.email || "";

                return (
                  <div key={userId} className="border-b border-border/30 last:border-0">
                    <div className="px-3 py-2 bg-background/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                          {userEmail && userName !== userEmail && (
                            <p className="text-[10px] text-foreground-muted truncate">{userEmail}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                          {userSessions.length}
                        </Badge>
                      </div>
                    </div>

                    {userSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors hover:bg-white/[0.04] ${
                          selectedSession?.id === session.id
                            ? "bg-primary/10 border-l-2 border-primary"
                            : "border-l-2 border-transparent"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground truncate">
                            {session.title || "Untitled conversation"}
                          </p>
                          <p className="text-[10px] text-foreground-muted">
                            {timeAgo(session.updatedAt)}
                          </p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-foreground-muted flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages view */}
        <div className="premium-card flex flex-col overflow-hidden">
          {!selectedSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground-muted">
              <Bot className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border/40 flex items-center gap-3">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="lg:hidden p-1 hover:bg-white/[0.05] rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedSession.title || "Untitled conversation"}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {selectedSession.user?.fullName || selectedSession.user?.email} ·{" "}
                    {timeAgo(selectedSession.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-24 text-foreground-muted text-sm">
                    {t("common.loading")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-foreground-muted text-sm">
                    No messages in this conversation
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary/15 text-foreground"
                            : "bg-white/[0.04] text-foreground-secondary border border-border/40"
                        }`}
                      >
                        <p className="text-[10px] font-medium mb-1 text-foreground-muted uppercase tracking-wide">
                          {msg.role === "user" ? (selectedSession.user?.fullName || "User") : "AI"}
                        </p>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] text-foreground-muted mt-1">
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
