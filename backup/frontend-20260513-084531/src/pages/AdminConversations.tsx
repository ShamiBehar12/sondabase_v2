import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Bot, MessageSquare, User, ChevronRight, ArrowLeft, Search, MessagesSquare } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminConversations() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Session[]>("/api/admin/chat/sessions")
      .then(({ data }) => { if (data) setSessions(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
          </div>
          {t("navigation.adminConversations")}
        </h1>
        <p className="text-foreground-muted text-sm mt-1.5">
          {loading ? "Cargando…" : (
            <>
              <span className="text-foreground font-medium">{sessions.length}</span>
              {" conversaciones · "}
              <span className="text-foreground font-medium">{Object.keys(grouped).length}</span>
              {" usuarios"}
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4" style={{ height: 'calc(100vh - 200px)' }}>

        {/* Sessions list */}
        <div className="premium-card flex flex-col overflow-hidden">
          <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <Input
                placeholder="Buscar por usuario o título…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm bg-background/50 pl-8"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-foreground-muted">{t("common.loading")}</p>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 p-4 text-center">
                <MessagesSquare className="w-8 h-8 text-foreground-muted opacity-40" />
                <p className="text-sm text-foreground-muted">Sin conversaciones</p>
              </div>
            ) : (
              Object.entries(grouped).map(([userId, userSessions]) => {
                const firstSession = userSessions[0];
                const userName = firstSession.user?.fullName || firstSession.user?.email || userId;
                const userEmail = firstSession.user?.email || "";
                const userInit = initials(userName);

                return (
                  <div key={userId} className="border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {/* User header */}
                    <div className="px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-primary">{userInit}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                          {userEmail && userName !== userEmail && (
                            <p className="text-[10px] text-foreground-muted truncate">{userEmail}</p>
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{ background: 'rgba(59,130,246,0.12)', color: 'rgba(147,197,253,0.85)', border: '1px solid rgba(59,130,246,0.2)' }}>
                          {userSessions.length}
                        </span>
                      </div>
                    </div>

                    {/* Session items */}
                    {userSessions.map((session) => {
                      const active = selectedSession?.id === session.id;
                      return (
                        <button
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-all border-l-2 ${
                            active
                              ? "border-l-primary bg-primary/10"
                              : "border-l-transparent hover:bg-white/[0.04]"
                          }`}
                        >
                          <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-primary" : "text-foreground-muted"}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate font-medium ${active ? "text-foreground" : "text-foreground-secondary"}`}>
                              {session.title || "Conversación sin título"}
                            </p>
                            <p className="text-[10px] text-foreground-muted mt-0.5">
                              {timeAgo(session.updatedAt)}
                              {session.messageCount ? ` · ${session.messageCount} mensajes` : ""}
                            </p>
                          </div>
                          <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${active ? "text-primary rotate-90" : "text-foreground-muted"}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages view */}
        <div className="premium-card flex flex-col overflow-hidden">
          {!selectedSession ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <MessagesSquare className="w-7 h-7 text-primary opacity-60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Selecciona una conversación</p>
                <p className="text-xs text-foreground-muted mt-1">Los mensajes aparecerán aquí</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-foreground-muted"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedSession.title || "Conversación sin título"}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {selectedSession.user?.fullName || selectedSession.user?.email}
                    {" · "}{new Date(selectedSession.updatedAt).toLocaleDateString("es-CL")}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex flex-col items-center justify-center h-24 gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs text-foreground-muted">{t("common.loading")}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                    <p className="text-sm text-foreground-muted">Sin mensajes en esta conversación</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={isUser
                            ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }
                            : { background: 'rgba(30,41,80,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {isUser
                            ? <User className="w-3.5 h-3.5 text-white" />
                            : <Bot className="w-3.5 h-3.5 text-blue-400" />
                          }
                        </div>
                        <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted px-1">
                            {isUser ? (selectedSession.user?.fullName || "Usuario") : "SmartMatch AI"}
                          </p>
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                            style={isUser ? {
                              background: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)',
                              color: 'white',
                            } : {
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.09)',
                              color: 'rgba(255,255,255,0.85)',
                            }}
                          >
                            {isUser ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-1.5 [&_ul]:pl-4 [&_li]:mb-0.5">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-foreground-muted px-1">{timeAgo(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
