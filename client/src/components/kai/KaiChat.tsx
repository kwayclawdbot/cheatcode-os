// CheatCode OS — Kai Chat Widget v2
// Brand: CC Cyan (#00AEEF) for Kai identity
// Bubble: CC Cyan with pulse animation
// Header: dark gradient (CC Dark) with cyan accent

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
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = () => {
    if (!input.trim() || messageCount >= FREE_LIMIT) return;
    const userMsg: Message = { role: "user", content: input, timestamp: "now" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setMessageCount(c => c + 1);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "kai", content: getKaiResponse(userMsg.content), timestamp: "now" }]);
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
          {/* Header — dark gradient with spectrum top bar */}
          <div>
            <div className="h-0.5" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
            <div className="flex items-center gap-3 px-4 py-3"
                 style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: "#00AEEF" }}>
                <span className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>K</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm" style={{ fontFamily: "var(--font-display)" }}>Kai</div>
                <div className="text-xs font-medium" style={{ color: "#4DC820" }}>AI Analyst · Online</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "kai" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                       style={{ background: "#00AEEF" }}>
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
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                     style={{ background: "#00AEEF" }}>
                  <span className="text-white text-[9px] font-bold">K</span>
                </div>
                <div className="kai-message px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: "#00AEEF", animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message limit banner */}
          {remaining <= 2 && remaining > 0 && (
            <div className="px-4 py-2 border-t text-xs font-medium"
                 style={{ background: "#FAFDE8", borderColor: "#E8F08A", color: "#7A6800" }}>
              {remaining} free message{remaining !== 1 ? "s" : ""} left.{" "}
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
                <button className="w-full text-[#101828] text-sm font-bold py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Zap size={14} />
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
                  className="flex-1 text-sm bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-3 py-2 outline-none transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#00AEEF"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,174,239,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#EAECF0"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-9 h-9 text-white rounded-lg flex items-center justify-center transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ background: "#00AEEF" }}
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

      {/* Bubble trigger — CC Cyan */}
      <button
        onClick={() => setOpen(o => !o)}
        className="kai-pulse fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        style={{ background: "#00AEEF" }}
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
