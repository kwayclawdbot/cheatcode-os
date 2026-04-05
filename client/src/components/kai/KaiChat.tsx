// CheatCode OS — Kai Chat Widget
// Design: Persistent bottom-right bubble. Opens to a chat panel.
// Kai is the AI analyst — calm, clinical, data-first voice.
// Blue (#2E90FA) brand color for Kai/AI elements.

import { useState, useRef, useEffect } from "react";
import { X, Send, Minimize2, Zap, Lock } from "lucide-react";

interface Message {
  role: "user" | "kai";
  content: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "kai",
    content: "Hey — I'm Kai. I've analyzed every video, podcast, and data signal on this platform. Ask me about any ticker, theme, or market concept.",
    timestamp: "now",
  },
];

const SAMPLE_RESPONSES: Record<string, string> = {
  default: "I'm processing that against the convergence brain. Based on current signals, here's what I'm seeing across the 6 data agents...",
  nvda: "NVDA is at a convergence score of 95 — Critical conviction. Here's the full picture: Flow agent flagged $2.1M dark pool print at $870 this morning. tastytrade covered the unusual call buying (5,000 $900 calls). Macro tailwind from AI Infrastructure Supercycle at Level 5. Last earnings beat by 8% with guidance raised 15%. The only risk: a close below $840 on volume would invalidate the setup.",
  kkr: "KKR is showing a bearish convergence score of 88. Real Vision covered this today — Minervini noted a supply zone at $92. More importantly, a senator on the Banking Committee sold $250K in KKR two days ago. The Private Credit Stress theme has been escalating for 3 weeks. Put/call ratio is elevated. I'd watch the $105 level as key support.",
  ccj: "CCJ is one of the highest-conviction setups on the radar right now — score of 93. The Nuclear Renaissance theme just hit Level 4 escalation. Macro Voices did a 52-minute deep dive yesterday. Congressional trades are flowing into uranium names. The AI data center buildout is driving nuclear demand in ways the market is still pricing in.",
};

function getKaiResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("nvda") || lower.includes("nvidia")) return SAMPLE_RESPONSES.nvda;
  if (lower.includes("kkr")) return SAMPLE_RESPONSES.kkr;
  if (lower.includes("ccj") || lower.includes("uranium") || lower.includes("nuclear")) return SAMPLE_RESPONSES.ccj;
  return SAMPLE_RESPONSES.default;
}

export function KaiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const FREE_LIMIT = 5;

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = () => {
    if (!input.trim() || messageCount >= FREE_LIMIT) return;
    const userMsg: Message = { role: "user", content: input, timestamp: "now" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setMessageCount(c => c + 1);
    setIsTyping(true);

    setTimeout(() => {
      const kaiResponse: Message = {
        role: "kai",
        content: getKaiResponse(userMsg.content),
        timestamp: "now",
      };
      setMessages(prev => [...prev, kaiResponse]);
      setIsTyping(false);
    }, 1200);
  };

  const remaining = FREE_LIMIT - messageCount;

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#EAECF0] flex flex-col overflow-hidden"
             style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EAECF0] bg-gradient-to-r from-[#EFF8FF] to-[#F0FDF9]">
            <div className="w-9 h-9 rounded-full bg-[#2E90FA] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>K</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#101828] text-sm" style={{ fontFamily: "var(--font-display)" }}>Kai</div>
              <div className="text-xs text-[#12B76A] font-medium">AI Analyst · Online</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#98A2B3] hover:text-[#475467] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "kai" && (
                  <div className="w-6 h-6 rounded-full bg-[#2E90FA] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <span className="text-white text-[9px] font-bold">K</span>
                  </div>
                )}
                <div className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "kai" ? "kai-message text-[#101828]" : "user-message text-[#101828]"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#2E90FA] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <span className="text-white text-[9px] font-bold">K</span>
                </div>
                <div className="kai-message px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-[#2E90FA] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2E90FA] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2E90FA] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message limit banner */}
          {remaining <= 2 && remaining > 0 && (
            <div className="px-4 py-2 bg-[#FFFAEB] border-t border-[#FEDF89] text-xs text-[#B54708] font-medium">
              {remaining} free message{remaining !== 1 ? "s" : ""} left today.{" "}
              <a href="/pricing" className="underline font-semibold">Upgrade to Pro</a> for unlimited.
            </div>
          )}

          {/* Input */}
          {messageCount >= FREE_LIMIT ? (
            <div className="p-4 border-t border-[#EAECF0] bg-[#F9FAFB]">
              <div className="flex items-center gap-2 text-sm text-[#667085] mb-2">
                <Lock size={14} />
                <span>You've used your 5 free messages today.</span>
              </div>
              <a href="/pricing">
                <button className="w-full bg-[#12B76A] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#0EA05E] transition-colors flex items-center justify-center gap-2">
                  <Zap size={14} fill="white" />
                  Upgrade to Pro — Unlimited Kai
                </button>
              </a>
            </div>
          ) : (
            <div className="p-3 border-t border-[#EAECF0]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about any ticker or theme..."
                  className="flex-1 text-sm bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-3 py-2 outline-none focus:border-[#2E90FA] focus:ring-1 focus:ring-[#2E90FA] transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-9 h-9 bg-[#2E90FA] text-white rounded-lg flex items-center justify-center hover:bg-[#1570EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[10px] text-[#98A2B3] mt-1.5 text-center">
                {remaining} free message{remaining !== 1 ? "s" : ""} remaining today
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bubble trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="kai-pulse fixed bottom-4 right-4 z-50 w-14 h-14 bg-[#2E90FA] rounded-full shadow-lg flex items-center justify-center hover:bg-[#1570EF] transition-colors"
        aria-label="Open Kai Chat"
      >
        {open ? (
          <Minimize2 size={20} className="text-white" />
        ) : (
          <span className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display)" }}>K</span>
        )}
      </button>
    </>
  );
}
