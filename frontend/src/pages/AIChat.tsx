import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Bot, Send, ExternalLink, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiChatMatch } from "@/hooks/useAI";

function getDocumentUrl(src: AiChatMatch): string {
  if (src.recordType !== "professional_certificate") {
    const preferredName =
      src.fileName?.trim() ||
      src.title?.trim() ||
      src.filePath.split(/[\\/]/).pop()?.trim() ||
      "";
    return `/api/storage/certificates/smart-cities-file?name=${encodeURIComponent(preferredName)}`;
  }

  return `/api/storage/professional-certificates/file?path=${encodeURIComponent(src.filePath)}`;
}

const SUGGESTED = [
  "¿Qué certificados ISO tenemos?",
  "Documentos de CCTV",
  "Proyectos en Chile",
];

export default function AIChat() {
  const { t } = useTranslation();
  const { messages, loading, sendMessage } = useAIChatContext();
  const { toast } = useToast();
  const { trackAIQuery } = useAnalytics();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const queryStartRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  const handleSubmit = async () => {
    const prompt = question.trim();
    if (!prompt || sending) return;
    setQuestion("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    queryStartRef.current = Date.now();
    try {
      const { error } = await sendMessage(prompt);
      if (error) throw new Error(error.message);
      trackAIQuery(Date.now() - queryStartRef.current);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("aiChat.chatError"), description: err.message });
    } finally {
      setSending(false);
    }
  };

  const isEmpty = !loading && messages.length === 0 && !sending;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Welcome */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center pt-12 pb-8 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(135deg,rgba(30,41,80,0.9) 0%,rgba(20,27,60,0.9) 100%)",
                  border: "1px solid rgba(99,130,246,0.35)",
                  boxShadow: "0 0 40px rgba(59,130,246,0.2)",
                }}
              >
                <Sparkles className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                {t("aiChat.title")}
              </h2>
              <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.38)" }}>
                {t("aiChat.subtitle")}
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuestion(s); textareaRef.current?.focus(); }}
                    className="px-4 py-2 rounded-xl text-sm transition-all hover:scale-[1.02]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {t("aiChat.loading")}
            </p>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const msgSources =
              Array.isArray(message.sourcesJson) &&
              (message.sourcesJson as any[]).length > 0 &&
              (message.sourcesJson[0] as any)?.fileName
                ? (message.sourcesJson as unknown as AiChatMatch[])
                : [];

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  style={
                    isUser
                      ? { background: "linear-gradient(135deg,#3b82f6,#6366f1)" }
                      : { background: "rgba(30,41,80,0.85)", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {isUser
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-blue-400" />
                  }
                </div>

                {/* Content */}
                <div
                  className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
                  style={{ maxWidth: "80%" }}
                >
                  <div
                    className={`relative z-20 rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={
                      isUser
                        ? {
                            background: "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)",
                            color: "white",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#FFFFFF",
                            textShadow: "0 1px 8px rgba(0,0,0,0.24)",
                          }
                    }
                  >
                    {isUser ? (
                      <p style={{ color: "white" }}>{message.content}</p>
                    ) : (
                      <div
                        className="prose prose-invert prose-sm max-w-none
                          [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                          [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-white
                          [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1 [&_td]:text-white
                          [&_tr:nth-child(even)]:bg-white/[0.03]
                          [&_p]:mb-2 [&_p]:text-white [&_ul]:pl-4 [&_li]:mb-1
                          [&_strong]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white"
                        style={{ color: "#FFFFFF", textShadow: "0 1px 8px rgba(0,0,0,0.24)" }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Sources */}
                  {msgSources.length > 0 && (
                    <div
                      className="relative z-30 flex flex-wrap gap-x-3 gap-y-1 px-1"
                      style={{ color: "#60A5FA", WebkitTextFillColor: "#60A5FA", opacity: 1, mixBlendMode: "normal" }}
                    >
                      {msgSources.map((src, i) => (
                        <a
                          key={i}
                          href={getDocumentUrl(src)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:underline"
                          style={{
                            color: "#60A5FA",
                            WebkitTextFillColor: "#60A5FA",
                            opacity: 1,
                            fontWeight: 500,
                            mixBlendMode: "normal",
                            textShadow: "0 1px 8px rgba(0,0,0,0.22)",
                          }}
                        >
                          <ExternalLink
                            className="w-2.5 h-2.5 flex-shrink-0"
                            style={{ color: "#60A5FA", filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.18))" }}
                          />
                          <span
                            style={{
                              color: "#60A5FA",
                              WebkitTextFillColor: "#60A5FA",
                              opacity: 1,
                              mixBlendMode: "normal",
                              textShadow: "0 1px 8px rgba(0,0,0,0.22)",
                            }}
                          >
                            {src.title || src.fileName}
                            {src.referenceLabel ? ` — ${src.referenceLabel}` : ""}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: "rgba(30,41,80,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 pb-5 pt-2 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div
            className="flex gap-2 items-end rounded-2xl p-2"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(24px)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={question}
              rows={1}
              onChange={(e) => { setQuestion(e.target.value); autoResize(); }}
              placeholder={t("aiChat.inputPlaceholder")}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              className="flex-1 resize-none bg-transparent text-sm outline-none border-0 min-h-[40px] max-h-[160px] py-2 px-2 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.88)", caretColor: "#60a5fa" }}
            />
            <Button
              onClick={handleSubmit}
              disabled={sending || !question.trim()}
              size="sm"
              className="rounded-xl h-9 w-9 p-0 flex-shrink-0 self-end mb-0.5 transition-all"
              style={{
                background: question.trim() && !sending
                  ? "linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)"
                  : "rgba(255,255,255,0.08)",
                border: "none",
              }}
            >
              <Send className="w-4 h-4" style={{ color: question.trim() && !sending ? "white" : "rgba(255,255,255,0.35)" }} />
            </Button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
            SmartMatch AI · Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}

