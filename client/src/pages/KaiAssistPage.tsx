// KaiAssistPage — Full-screen AI chat with Kai, CheatCode's trading intelligence assistant
// Design: Clean two-column layout (conversation history sidebar + main chat area)
// Style: Dark terminal aesthetic matching CheatCode OS, inspired by Claude/ChatGPT UX
// Kai persona: Sharp, data-driven trading AI — not a financial advisor, but a market analyst

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Nav } from "@/components/layout/Nav";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, TrendingUp, BarChart2, BookOpen, Zap,
  ChevronRight, Plus, Trash2, MessageSquare, Bot, User,
  Copy, ThumbsUp, ThumbsDown, RefreshCw, ChevronDown,
  Flame, Target, Shield, Activity, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  liked?: boolean;
  disliked?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Kai's suggested prompts ──────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: <TrendingUp size={15} />, label: "Analyze NVDA setup", prompt: "Analyze the current technical setup for NVDA. What are the key levels to watch?" },
  { icon: <BarChart2 size={15} />, label: "Market overview", prompt: "Give me a quick market overview for today. What are the major themes and sectors moving?" },
  { icon: <Target size={15} />, label: "Entry & exit strategy", prompt: "How do I build a solid entry and exit strategy for swing trading? Walk me through the framework." },
  { icon: <Shield size={15} />, label: "Risk management", prompt: "Explain position sizing and risk management for a $25k account. What's the right approach?" },
  { icon: <Flame size={15} />, label: "Hot sectors today", prompt: "What sectors and themes are showing the most momentum right now?" },
  { icon: <BookOpen size={15} />, label: "Explain options flow", prompt: "Explain how to read unusual options flow and what it signals about smart money positioning." },
  { icon: <Zap size={15} />, label: "Catalyst scanner", prompt: "What are the biggest upcoming catalysts this week — earnings, Fed events, macro data?" },
  { icon: <Activity size={15} />, label: "Read the tape", prompt: "How do I read order flow and tape reading to understand intraday price action?" },
];

// ─── Mock Kai responses (realistic trading AI responses) ─────────────────────

const KAI_RESPONSES: Record<string, string> = {
  default: `Great question. Let me break this down for you.

**Key Takeaways:**
- Markets are driven by liquidity, sentiment, and fundamentals — in that order of short-term importance
- The best setups combine technical structure with a clear fundamental catalyst
- Risk management isn't optional — it's the only edge that compounds over time

What specific aspect would you like me to dig deeper on?`,

  nvda: `**NVDA Technical Analysis**

Current price action shows NVDA consolidating after a strong run. Here's what I'm watching:

**Key Levels:**
- **Support:** $172 (recent consolidation base), $165 (major demand zone)
- **Resistance:** $185 (prior high), $195 (all-time high area)

**Setup:** The stock is forming a tight flag pattern on the daily. Volume has been declining during the consolidation — that's constructive. A break above $185 on strong volume (>40M shares) would be a high-conviction entry.

**Risk:** If $172 breaks with conviction, the next support is $165. Size accordingly.

**Catalyst to watch:** Next earnings report + any AI infrastructure spending data from hyperscalers.

*Not financial advice. Always do your own due diligence.*`,

  market: `**Market Overview — Current Conditions**

Here's the macro tape right now:

**Macro Backdrop:**
- Fed in "higher for longer" mode — rate cuts getting pushed out
- Earnings season approaching — guidance will be the key driver
- Dollar strength creating headwinds for multinationals

**Sector Rotation:**
- 🟢 **Leading:** Energy, Financials, Defense
- 🟡 **Neutral:** Tech (bifurcated — AI names strong, legacy weak)
- 🔴 **Lagging:** REITs, Utilities, Consumer Discretionary

**Key Themes:**
1. AI infrastructure buildout (NVDA, AVGO, AMD)
2. Nuclear energy renaissance (CEG, VST, NRG)
3. Tariff impact plays (domestic vs. international exposure)

**My read:** Market is in a selective bull phase. Not everything works — you need to be in the right sectors with tight risk management.`,
};

function getKaiResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("nvda") || lower.includes("nvidia")) return KAI_RESPONSES.nvda;
  if (lower.includes("market") || lower.includes("overview") || lower.includes("sector")) return KAI_RESPONSES.market;
  return KAI_RESPONSES.default;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

function renderMarkdown(text: string, isDark: boolean) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      // Standalone bold heading
      elements.push(
        <p key={key++} className="font-bold text-sm mt-3 mb-1" style={{ color: isDark ? "#F9FAFB" : "#101828" }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      // Bullet
      const content = line.slice(2);
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4DC820" }} />
          <span className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(content, isDark) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span className="text-xs font-bold mt-0.5 w-4 flex-shrink-0" style={{ color: "#4DC820" }}>{num}.</span>
          <span className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(content, isDark) }} />
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else if (line.startsWith("*Not financial")) {
      elements.push(
        <p key={key++} className="text-xs italic mt-3" style={{ color: isDark ? "#475467" : "#98A2B3" }}>
          {line.slice(1, -1)}
        </p>
      );
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed"
           dangerouslySetInnerHTML={{ __html: boldify(line, isDark) }} />
      );
    }
  }
  return elements;
}

function boldify(text: string, isDark: boolean): string {
  return text.replace(/\*\*(.*?)\*\*/g, (_, m) =>
    `<strong style="color:${isDark ? "#F9FAFB" : "#101828"};font-weight:700">${m}</strong>`
  ).replace(/🟢|🟡|🔴/g, (emoji) => `<span>${emoji}</span>`);
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: isDark ? "#4DC820" : "#4DC820" }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message, isDark, onLike, onDislike, onCopy
}: {
  message: Message;
  isDark: boolean;
  onLike: () => void;
  onDislike: () => void;
  onCopy: () => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? isDark ? "#2B3245" : "#F2F4F7"
            : "linear-gradient(135deg, #4DC820 0%, #C8D400 100%)",
        }}
      >
        {isUser
          ? <User size={14} style={{ color: isDark ? "#98A2B3" : "#667085" }} />
          : <Bot size={14} style={{ color: "#101828" }} />
        }
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className="px-4 py-3 rounded-2xl"
          style={{
            background: isUser
              ? isDark ? "#2B3245" : "#F2F4F7"
              : isDark ? "#1a2035" : "white",
            border: isUser ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
            color: isDark ? "#D0D5DD" : "#344054",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          }}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div style={{ color: isDark ? "#D0D5DD" : "#344054" }}>
              {renderMarkdown(message.content, isDark)}
            </div>
          )}
        </div>

        {/* Actions (Kai messages only) */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors"
              style={{ color: isDark ? "#667085" : "#98A2B3" }}
              title="Copy"
            >
              <Copy size={11} />
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onLike}
              className="p-1 rounded-lg transition-colors"
              style={{ color: message.liked ? "#4DC820" : isDark ? "#667085" : "#98A2B3" }}
              title="Good response"
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={onDislike}
              className="p-1 rounded-lg transition-colors"
              style={{ color: message.disliked ? "#E8193C" : isDark ? "#667085" : "#98A2B3" }}
              title="Bad response"
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}

        <span className="text-[10px] px-1" style={{ color: isDark ? "#475467" : "#98A2B3" }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_CONVS_KEY = "kai-assist-conversations";
const LS_ACTIVE_KEY = "kai-assist-active-conv";

/** Revive Date strings back to Date objects after JSON.parse */
function reviveConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Conversation[]).map(c => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    messages: c.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
  }));
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LS_CONVS_KEY);
    if (!raw) return [];
    return reviveConversations(JSON.parse(raw));
  } catch {
    return [];
  }
}

function loadActiveConvId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE_KEY);
  } catch {
    return null;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KaiAssistPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Initialize from localStorage on first render
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(() => loadActiveConvId());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // Default closed on mobile (< md), open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_CONVS_KEY, JSON.stringify(conversations));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }, [conversations]);

  // Persist active conversation ID
  useEffect(() => {
    try {
      if (activeConvId) {
        localStorage.setItem(LS_ACTIVE_KEY, activeConvId);
      } else {
        localStorage.removeItem(LS_ACTIVE_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeConvId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, isTyping]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const createNewConversation = useCallback((): Conversation => {
    const id = `conv-${Date.now()}`;
    const conv: Conversation = {
      id,
      title: "New conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(id);
    return conv;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    let conv = activeConv;
    if (!conv) {
      conv = createNewConversation();
      // Wait for state to settle
      await new Promise(r => setTimeout(r, 0));
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    // Update title from first message
    const isFirst = (conv.messages.length === 0);
    const newTitle = isFirst
      ? text.trim().slice(0, 50) + (text.length > 50 ? "…" : "")
      : conv.title;

    setConversations(prev => prev.map(c =>
      c.id === (conv!.id)
        ? { ...c, title: newTitle, messages: [...c.messages, userMsg], updatedAt: new Date() }
        : c
    ));
    setActiveConvId(conv.id);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Simulate Kai typing
    setIsTyping(true);
    const delay = 800 + Math.random() * 1200;
    await new Promise(r => setTimeout(r, delay));

    const kaiMsg: Message = {
      id: `msg-${Date.now()}-kai`,
      role: "assistant",
      content: getKaiResponse(text),
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(c =>
      c.id === conv!.id
        ? { ...c, messages: [...c.messages, kaiMsg], updatedAt: new Date() }
        : c
    ));
    setIsTyping(false);
  }, [activeConv, createNewConversation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  };

  const updateMessage = (convId: string, msgId: string, update: Partial<Message>) => {
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, ...update } : m) }
        : c
    ));
  };

  const bg = isDark ? "#0d1117" : "#F8F9FA";
  const sidebarBg = isDark ? "#111827" : "white";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#EAECF0";

  return (
    <>
    <Nav />
    <div className="flex h-[calc(100vh-56px)] overflow-hidden relative" style={{ background: bg }}>

      {/* ── Mobile backdrop — tap to close sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 md:hidden"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 flex flex-col border-r overflow-hidden fixed md:relative z-30 h-full top-0 md:top-auto left-0 md:left-auto"
            style={{
              background: sidebarBg,
              borderColor,
              // iOS safe area: clear the notch when fixed-positioned
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  <Sparkles size={14} style={{ color: "#101828" }} />
                </div>
                <span className="font-bold text-sm" style={{ color: isDark ? "#F9FAFB" : "#101828" }}>
                  Kai Assist
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { createNewConversation(); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    background: isDark ? "rgba(77,200,32,0.15)" : "#F0FDE8",
                    color: "#4DC820",
                  }}
                  title="New chat"
                >
                  <Plus size={14} />
                </button>
                {/* Close button — only visible on mobile */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
                    color: isDark ? "#667085" : "#98A2B3",
                  }}
                  title="Close"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <MessageSquare size={24} className="mx-auto mb-2" style={{ color: isDark ? "#475467" : "#D0D5DD" }} />
                  <p className="text-xs" style={{ color: isDark ? "#475467" : "#98A2B3" }}>
                    No conversations yet
                  </p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="group flex items-center gap-2 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors mb-0.5"
                    style={{
                      background: activeConvId === conv.id
                        ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                        : "transparent",
                    }}
                    onClick={() => { setActiveConvId(conv.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                    onMouseEnter={e => {
                      if (activeConvId !== conv.id)
                        (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB";
                    }}
                    onMouseLeave={e => {
                      if (activeConvId !== conv.id)
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <MessageSquare size={13} className="flex-shrink-0"
                      style={{ color: activeConvId === conv.id ? "#4DC820" : isDark ? "#667085" : "#98A2B3" }} />
                    <span className="flex-1 text-xs truncate font-medium"
                          style={{ color: activeConvId === conv.id ? "#4DC820" : isDark ? "#D0D5DD" : "#344054" }}>
                      {conv.title}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                      style={{ color: isDark ? "#667085" : "#98A2B3" }}
                      onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor }}>
              <p className="text-[10px]" style={{ color: isDark ? "#475467" : "#98A2B3" }}>
                Kai is a market analysis AI. Not financial advice.
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
             style={{ background: sidebarBg, borderColor }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0"
            style={{
              background: sidebarOpen
                ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                : isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
              color: sidebarOpen ? "#4DC820" : isDark ? "#667085" : "#667085",
            }}
            title={sidebarOpen ? "Hide history" : "Show history"}
          >
            <MessageSquare size={13} />
            <span className="text-[11px] font-semibold hidden sm:inline">
              {sidebarOpen ? "Hide" : "History"}
            </span>
            <ChevronDown size={11} style={{ transform: sidebarOpen ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
              <Bot size={16} style={{ color: "#101828" }} />
            </div>
            <div>
              <p className="font-bold text-sm leading-none" style={{ color: isDark ? "#F9FAFB" : "#101828" }}>
                Kai
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#4DC820" }}>
                ● Online · CheatCode Intelligence
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {activeConv && (
              <button
                onClick={() => { createNewConversation(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8",
                  color: "#4DC820",
                }}
              >
                <Plus size={12} />
                New chat
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!activeConv ? (
            /* Welcome / empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 max-w-2xl mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}
              >
                <Bot size={28} style={{ color: "#101828" }} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: isDark ? "#F9FAFB" : "#101828", fontFamily: "var(--font-display)" }}
              >
                Hey, I'm Kai ✨
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-sm text-center mb-8 max-w-sm"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
              >
                Your CheatCode trading intelligence assistant. Ask me anything about markets, setups, strategy, or risk management.
              </motion.p>

              {/* Suggested prompts grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl"
              >
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p.prompt)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: isDark ? "#1a2035" : "white",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
                      color: isDark ? "#D0D5DD" : "#344054",
                    }}
                  >
                    <span style={{ color: "#4DC820" }}>{p.icon}</span>
                    <span className="text-xs font-medium">{p.label}</span>
                    <ChevronRight size={11} className="ml-auto flex-shrink-0" style={{ color: isDark ? "#475467" : "#D0D5DD" }} />
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            /* Conversation messages */
            <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
              {activeConv.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isDark={isDark}
                  onLike={() => updateMessage(activeConv.id, msg.id, { liked: !msg.liked, disliked: false })}
                  onDislike={() => updateMessage(activeConv.id, msg.id, { disliked: !msg.disliked, liked: false })}
                  onCopy={() => {}}
                />
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                    <Bot size={14} style={{ color: "#101828" }} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl" style={{
                    background: isDark ? "#1a2035" : "white",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
                    borderRadius: "18px 18px 18px 4px",
                  }}>
                    <TypingIndicator isDark={isDark} />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor, background: sidebarBg }}>
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-shadow"
              style={{
                background: isDark ? "#1a2035" : "#F9FAFB",
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "#EAECF0"}`,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kai anything about markets, setups, strategy…"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed"
                style={{
                  color: isDark ? "#D0D5DD" : "#344054",
                  maxHeight: "160px",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && !isTyping
                    ? "linear-gradient(135deg, #4DC820, #C8D400)"
                    : isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
                  color: input.trim() && !isTyping ? "#101828" : isDark ? "#475467" : "#D0D5DD",
                  transform: input.trim() && !isTyping ? "scale(1)" : "scale(0.95)",
                }}
              >
                {isTyping ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-center mt-2" style={{ color: isDark ? "#475467" : "#98A2B3" }}>
              Kai provides market analysis for educational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
