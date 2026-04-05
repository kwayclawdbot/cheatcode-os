/**
 * CheatCode OS — Trading Journal Page
 * Design: Clean dashboard with entry form, P&L calendar heatmap,
 * pattern analysis by Kai, and emotional state tracking.
 * Gated behind broker connection.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, TrendingUp, TrendingDown, Target, AlertTriangle,
  Brain, Calendar, BarChart2, ChevronDown, X, CheckCircle,
  Link as LinkIcon, Zap, BookOpen, Clock, Filter
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";

// ─── Types ────────────────────────────────────────────────────────────────────

type TradeOutcome = "win" | "loss" | "breakeven";
type EmotionTag = "confident" | "anxious" | "fomo" | "revenge" | "disciplined" | "distracted" | "patient" | "impulsive";

interface JournalEntry {
  id: string;
  date: string;
  ticker: string;
  direction: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  stopLoss: number;
  target: number;
  outcome: TradeOutcome;
  pnl: number;
  rr: number;
  setup: string;
  preNotes: string;
  postNotes: string;
  emotions: EmotionTag[];
  rulesFollowed: boolean;
  ruleViolation?: string;
  screenshot?: string;
  kaiAnalysis?: string;
}

// ─── Mock Journal Data ────────────────────────────────────────────────────────

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    date: "2026-04-04",
    ticker: "NVDA",
    direction: "long",
    entry: 875.50,
    exit: 912.30,
    size: 100,
    stopLoss: 855.00,
    target: 920.00,
    outcome: "win",
    pnl: 3680,
    rr: 1.8,
    setup: "VCP Breakout",
    preNotes: "Clean VCP on daily. Volume dried up perfectly. Watching for breakout above $878 on 2x volume.",
    postNotes: "Executed well. Held through the first pullback. Took partial at $900, let rest run. Could have held longer.",
    emotions: ["confident", "patient", "disciplined"],
    rulesFollowed: true,
    kaiAnalysis: "Strong execution on a high-probability setup. Your patience through the first pullback was key. Win rate on VCP setups: 74% (last 50 trades). Avg hold time: 3.2 days.",
  },
  {
    id: "2",
    date: "2026-04-03",
    ticker: "TSLA",
    direction: "long",
    entry: 248.00,
    exit: 231.50,
    size: 200,
    stopLoss: 240.00,
    target: 270.00,
    outcome: "loss",
    pnl: -3300,
    rr: -2.06,
    setup: "Momentum Breakout",
    preNotes: "TSLA breaking out of a 3-week base. Volume picking up. Expecting continuation.",
    postNotes: "Didn't respect my stop. Should have cut at $240 but held hoping for a bounce. Revenge trade mentality crept in.",
    emotions: ["anxious", "revenge", "impulsive"],
    rulesFollowed: false,
    ruleViolation: "Did not honor stop loss — held 8 points past defined stop",
    kaiAnalysis: "This loss was preventable. You held 8 points past your defined stop ($240). Pattern detected: 3 of your last 5 losses involved stop violations. Recommendation: Use hard stops, not mental stops.",
  },
  {
    id: "3",
    date: "2026-04-02",
    ticker: "AMD",
    direction: "long",
    entry: 162.40,
    exit: 171.80,
    size: 150,
    stopLoss: 157.00,
    target: 175.00,
    outcome: "win",
    pnl: 1410,
    rr: 1.74,
    setup: "Flag Breakout",
    preNotes: "AMD consolidating in a tight bull flag after the gap. Watching for breakout on volume.",
    postNotes: "Clean trade. Respected my plan. Took full position at target.",
    emotions: ["confident", "disciplined", "patient"],
    rulesFollowed: true,
    kaiAnalysis: "Textbook flag breakout execution. Your flag setups have a 68% win rate. Keep following the plan.",
  },
  {
    id: "4",
    date: "2026-04-01",
    ticker: "SPY",
    direction: "short",
    entry: 521.00,
    exit: 521.00,
    size: 50,
    stopLoss: 524.00,
    target: 514.00,
    outcome: "breakeven",
    pnl: 0,
    rr: 0,
    setup: "Distribution Top",
    preNotes: "SPY showing distribution at resistance. Looking for breakdown.",
    postNotes: "Stopped out at breakeven. Market held the level. Good discipline not to add.",
    emotions: ["patient", "disciplined"],
    rulesFollowed: true,
  },
];

const EMOTION_CONFIG: Record<EmotionTag, { label: string; color: string; bg: string; emoji: string }> = {
  confident: { label: "Confident", color: "#4DC820", bg: "#EDFBE6", emoji: "💪" },
  anxious: { label: "Anxious", color: "#F79009", bg: "#FEF3E2", emoji: "😰" },
  fomo: { label: "FOMO", color: "#E8193C", bg: "#FEE8EC", emoji: "😱" },
  revenge: { label: "Revenge", color: "#E8193C", bg: "#FEE8EC", emoji: "😤" },
  disciplined: { label: "Disciplined", color: "#00AEEF", bg: "#E6F7FD", emoji: "🧘" },
  distracted: { label: "Distracted", color: "#667085", bg: "#F2F4F7", emoji: "😵" },
  patient: { label: "Patient", color: "#7B2FBE", bg: "#F3E8FF", emoji: "⏳" },
  impulsive: { label: "Impulsive", color: "#E8193C", bg: "#FEE8EC", emoji: "⚡" },
};

// ─── Broker Gate ──────────────────────────────────────────────────────────────

function BrokerGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "#E6F7FD" }}>
        <LinkIcon size={36} color="#00AEEF" />
      </div>
      <h2 className="text-2xl font-black mb-2" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
        Connect Your Brokerage
      </h2>
      <p className="text-sm mb-2 max-w-sm" style={{ color: "var(--muted-foreground)" }}>
        The Trading Journal requires a connected brokerage account to auto-import trades, verify P&L, and unlock Kai's pattern analysis.
      </p>
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl mb-6 text-sm font-bold"
        style={{ background: "#EDFBE6", color: "#1A5C0A" }}
      >
        <Zap size={14} /> Connect now → earn +500 XP instantly
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
        {["Alpaca 🦙", "Tradier 📊", "TD Ameritrade 🏦", "Interactive Brokers 🌐"].map(b => (
          <button
            key={b}
            onClick={() => toast.info(`${b.split(" ")[0]} connection coming soon`)}
            className="py-3 px-4 rounded-xl border text-xs font-semibold transition-all hover:border-[#4DC820]"
            style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}
          >
            {b}
          </button>
        ))}
      </div>
      <button
        onClick={onUnlock}
        className="text-sm font-semibold underline"
        style={{ color: "var(--muted-foreground)" }}
      >
        Use manual entry instead (no XP bonus)
      </button>
    </div>
  );
}

// ─── New Entry Modal ──────────────────────────────────────────────────────────

function NewEntryModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (entry: Partial<JournalEntry>) => void;
}) {
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [size, setSize] = useState("");
  const [setup, setSetup] = useState("");
  const [preNotes, setPreNotes] = useState("");
  const [emotions, setEmotions] = useState<EmotionTag[]>([]);

  const toggleEmotion = (e: EmotionTag) =>
    setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleSave = () => {
    if (!ticker || !entry) {
      toast.error("Ticker and entry price are required");
      return;
    }
    onSave({ ticker, direction, entry: parseFloat(entry), stopLoss: parseFloat(stop), target: parseFloat(target), size: parseFloat(size), setup, preNotes, emotions });
    toast.success("+15 XP — Trade logged! 📓");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="font-bold text-base" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
            Log New Trade
          </h3>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Ticker + Direction */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Ticker</label>
              <input
                type="text"
                placeholder="NVDA"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none"
                style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)", fontFamily: "JetBrains Mono, monospace" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Direction</label>
              <div className="flex gap-1">
                {(["long", "short"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className="px-4 py-3 rounded-xl text-sm font-bold border-2 capitalize transition-all"
                    style={{
                      borderColor: direction === d ? (d === "long" ? "#4DC820" : "#E8193C") : "var(--border)",
                      background: direction === d ? (d === "long" ? "#EDFBE6" : "#FEE8EC") : "var(--muted)",
                      color: direction === d ? (d === "long" ? "#1A5C0A" : "#9B0C1E") : "var(--muted-foreground)",
                    }}
                  >
                    {d === "long" ? "↑ Long" : "↓ Short"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Entry", value: entry, set: setEntry, placeholder: "875.50" },
              { label: "Stop Loss", value: stop, set: setStop, placeholder: "855.00" },
              { label: "Target", value: target, set: setTarget, placeholder: "920.00" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                <input
                  type="number"
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
            ))}
          </div>

          {/* Size */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Position Size (shares/contracts)</label>
            <input
              type="number"
              placeholder="100"
              value={size}
              onChange={e => setSize(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>

          {/* Setup type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>Setup Type</label>
            <div className="flex flex-wrap gap-2">
              {["VCP Breakout", "Flag Breakout", "ORB", "Momentum", "Reversal", "Earnings Play", "Options Spread", "Custom"].map(s => (
                <button
                  key={s}
                  onClick={() => setSetup(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    borderColor: setup === s ? "#00AEEF" : "var(--border)",
                    background: setup === s ? "#E6F7FD" : "var(--muted)",
                    color: setup === s ? "#00AEEF" : "var(--muted-foreground)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pre-trade notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Pre-Trade Thesis
            </label>
            <textarea
              placeholder="Why are you taking this trade? What's your setup?"
              value={preNotes}
              onChange={e => setPreNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>

          {/* Emotional state */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              How are you feeling? (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(EMOTION_CONFIG) as [EmotionTag, typeof EMOTION_CONFIG[EmotionTag]][]).map(([id, cfg]) => (
                <button
                  key={id}
                  onClick={() => toggleEmotion(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                  style={{
                    borderColor: emotions.includes(id) ? cfg.color : "var(--border)",
                    background: emotions.includes(id) ? cfg.bg : "var(--muted)",
                    color: emotions.includes(id) ? cfg.color : "var(--muted-foreground)",
                  }}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-4 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
          >
            Log Trade · +15 XP
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({ entry, onExpand }: { entry: JournalEntry; onExpand: () => void }) {
  const isWin = entry.outcome === "win";
  const isLoss = entry.outcome === "loss";

  return (
    <button
      onClick={onExpand}
      className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:border-[#4DC820]"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderLeft: `3px solid ${isWin ? "#4DC820" : isLoss ? "#E8193C" : "#F79009"}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-black text-sm" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
            {entry.ticker}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: entry.direction === "long" ? "#EDFBE6" : "#FEE8EC",
              color: entry.direction === "long" ? "#1A5C0A" : "#9B0C1E",
            }}
          >
            {entry.direction === "long" ? "↑ Long" : "↓ Short"}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.setup}</span>
          {!entry.rulesFollowed && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FEF3E2", color: "#92400E" }}>
              <AlertTriangle size={9} /> Rule Violation
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.date}</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>R:R {entry.rr.toFixed(2)}</span>
          <div className="flex gap-1">
            {entry.emotions.slice(0, 2).map(e => (
              <span key={e} className="text-sm">{EMOTION_CONFIG[e].emoji}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className="font-black text-base"
          style={{ color: isWin ? "#4DC820" : isLoss ? "#E8193C" : "#F79009", fontFamily: "JetBrains Mono, monospace" }}
        >
          {isWin ? "+" : ""}{entry.pnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{entry.outcome}</p>
      </div>
    </button>
  );
}

// ─── Entry Detail Drawer ──────────────────────────────────────────────────────

function EntryDetail({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>{entry.ticker}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: entry.outcome === "win" ? "#EDFBE6" : entry.outcome === "loss" ? "#FEE8EC" : "#FEF3E2",
                color: entry.outcome === "win" ? "#1A5C0A" : entry.outcome === "loss" ? "#9B0C1E" : "#92400E",
              }}
            >
              {entry.outcome === "win" ? "✅ Win" : entry.outcome === "loss" ? "❌ Loss" : "➡️ Breakeven"}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* P&L hero */}
          <div
            className="p-5 rounded-2xl text-center"
            style={{
              background: entry.outcome === "win" ? "linear-gradient(135deg, #EDFBE6, #D1FAE5)" : entry.outcome === "loss" ? "linear-gradient(135deg, #FEE8EC, #FEE2E2)" : "linear-gradient(135deg, #FEF3E2, #FEF9C3)",
            }}
          >
            <p
              className="text-4xl font-black mb-1"
              style={{ color: entry.outcome === "win" ? "#1A5C0A" : entry.outcome === "loss" ? "#9B0C1E" : "#92400E", fontFamily: "Sora, sans-serif" }}
            >
              {entry.outcome === "win" ? "+" : ""}{entry.pnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm font-semibold" style={{ color: entry.outcome === "win" ? "#2D8A14" : entry.outcome === "loss" ? "#C01028" : "#B45309" }}>
              R:R {entry.rr.toFixed(2)} · {entry.setup} · {entry.date}
            </p>
          </div>

          {/* Trade levels */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Entry", value: `$${entry.entry}` },
              { label: "Exit", value: `$${entry.exit}` },
              { label: "Stop", value: `$${entry.stopLoss}` },
              { label: "Target", value: `$${entry.target}` },
            ].map(f => (
              <div key={f.label} className="p-3 rounded-xl text-center" style={{ background: "var(--muted)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{f.label}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: "var(--foreground)", fontFamily: "JetBrains Mono, monospace" }}>{f.value}</p>
              </div>
            ))}
          </div>

          {/* Rule violation warning */}
          {!entry.rulesFollowed && entry.ruleViolation && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#FEF3E2" }}>
              <AlertTriangle size={18} color="#F79009" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: "#92400E" }}>Rule Violation Logged</p>
                <p className="text-xs" style={{ color: "#B45309" }}>{entry.ruleViolation}</p>
              </div>
            </div>
          )}

          {/* Pre/Post notes */}
          {entry.preNotes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Pre-Trade Thesis</p>
              <p className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: "var(--muted)", color: "var(--foreground)" }}>{entry.preNotes}</p>
            </div>
          )}
          {entry.postNotes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>Post-Trade Review</p>
              <p className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: "var(--muted)", color: "var(--foreground)" }}>{entry.postNotes}</p>
            </div>
          )}

          {/* Emotions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>Emotional State</p>
            <div className="flex flex-wrap gap-2">
              {entry.emotions.map(e => {
                const cfg = EMOTION_CONFIG[e];
                return (
                  <span key={e} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Kai's analysis */}
          {entry.kaiAnalysis && (
            <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, #E6F7FD, #F3E8FF)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "#00AEEF", color: "#fff" }}>K</div>
                <span className="text-xs font-bold" style={{ color: "#00AEEF" }}>Kai's Pattern Analysis</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#1D2939" }}>{entry.kaiAnalysis}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Journal Page ────────────────────────────────────────────────────────

export default function JournalPage() {
  const [brokerUnlocked, setBrokerUnlocked] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_ENTRIES);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "stats" | "patterns">("log");

  // Load real entries from API
  useEffect(() => {
    import("@/lib/api").then(({ fetchJournalEntries }) => {
      fetchJournalEntries().then((data: any[]) => {
        if (data?.length) {
          setEntries(data.map((e: any) => ({
            id: e.id, date: e.date, ticker: e.ticker, direction: e.direction,
            entry: e.entry_price, exit: e.exit_price || 0, size: e.size || 0,
            stopLoss: e.stop_loss || 0, target: e.target || 0,
            outcome: e.outcome || "open", pnl: e.pnl || 0, rr: e.risk_reward || 0,
            setup: e.setup || "", preNotes: e.pre_notes || "", postNotes: e.post_notes || "",
            emotions: e.emotions || [], rulesFollowed: e.rules_followed ?? true,
            ruleViolation: e.rule_violation, screenshot: e.screenshot_url, kaiAnalysis: e.kai_analysis,
          })));
          setBrokerUnlocked(true);
        }
      }).catch(() => {});
    });
  }, []);

  // Stats
  const wins = entries.filter(e => e.outcome === "win").length;
  const losses = entries.filter(e => e.outcome === "loss").length;
  const totalPnL = entries.reduce((sum, e) => sum + e.pnl, 0);
  const winRate = entries.length > 0 ? Math.round((wins / entries.length) * 100) : 0;
  const avgRR = entries.length > 0 ? (entries.reduce((sum, e) => sum + e.rr, 0) / entries.length).toFixed(2) : "0";
  const ruleViolations = entries.filter(e => !e.rulesFollowed).length;

  const handleNewEntry = (data: Partial<JournalEntry>) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      ticker: data.ticker || "",
      direction: data.direction || "long",
      entry: data.entry || 0,
      exit: 0,
      size: data.size || 0,
      stopLoss: data.stopLoss || 0,
      target: data.target || 0,
      outcome: "open" as any,
      pnl: 0,
      rr: 0,
      setup: data.setup || "",
      preNotes: data.preNotes || "",
      postNotes: "",
      emotions: data.emotions || [],
      rulesFollowed: true,
    };
    setEntries(prev => [newEntry, ...prev]);
    // Save to API
    import("@/lib/api").then(({ createJournalEntry }) => {
      createJournalEntry({
        ticker: newEntry.ticker, direction: newEntry.direction,
        entry_price: newEntry.entry, size: newEntry.size,
        stop_loss: newEntry.stopLoss, target: newEntry.target,
        setup: newEntry.setup, pre_notes: newEntry.preNotes,
        emotions: newEntry.emotions,
      }).catch(() => {});
    });
  };

  if (!brokerUnlocked) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Nav />
        <BrokerGate onUnlock={() => setBrokerUnlocked(true)} />
        <KaiChat />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
              Trading Journal
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Track every trade. Learn every lesson.
            </p>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
          >
            <Plus size={16} /> Log Trade
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted-foreground)" }}>Total P&L</p>
            <p className="text-xl font-black" style={{ color: totalPnL >= 0 ? "#4DC820" : "#E8193C", fontFamily: "Sora, sans-serif" }}>
              {totalPnL >= 0 ? "+" : ""}{totalPnL.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted-foreground)" }}>Win Rate</p>
            <p className="text-xl font-black" style={{ color: "#00AEEF", fontFamily: "Sora, sans-serif" }}>{winRate}%</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{wins}W / {losses}L</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted-foreground)" }}>Avg R:R</p>
            <p className="text-xl font-black" style={{ color: "var(--foreground)", fontFamily: "Sora, sans-serif" }}>{avgRR}:1</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: ruleViolations > 0 ? "#FEF3E2" : "var(--card)", border: `1px solid ${ruleViolations > 0 ? "#F79009" : "var(--border)"}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: ruleViolations > 0 ? "#92400E" : "var(--muted-foreground)" }}>Rule Violations</p>
            <p className="text-xl font-black" style={{ color: ruleViolations > 0 ? "#F79009" : "var(--foreground)", fontFamily: "Sora, sans-serif" }}>{ruleViolations}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>this month</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {[
            { id: "log" as const, label: "Trade Log", icon: BookOpen },
            { id: "stats" as const, label: "Stats", icon: BarChart2 },
            { id: "patterns" as const, label: "Kai Patterns", icon: Brain },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: isActive ? "var(--card)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : undefined,
                }}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Trade Log */}
        {activeTab === "log" && (
          <div className="flex flex-col gap-3">
            {entries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onExpand={() => setSelectedEntry(entry)} />
            ))}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-4">
            {/* Emotion frequency */}
            <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="font-bold text-sm mb-3" style={{ color: "var(--foreground)" }}>Emotional Patterns</p>
              <div className="flex flex-col gap-2">
                {(["disciplined", "confident", "patient", "anxious", "impulsive", "revenge"] as EmotionTag[]).map(e => {
                  const count = entries.filter(en => en.emotions.includes(e)).length;
                  const pct = entries.length > 0 ? (count / entries.length) * 100 : 0;
                  const cfg = EMOTION_CONFIG[e];
                  return (
                    <div key={e} className="flex items-center gap-3">
                      <span className="text-sm w-4">{cfg.emoji}</span>
                      <span className="text-xs font-semibold w-20 flex-shrink-0" style={{ color: "var(--foreground)" }}>{cfg.label}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                      <span className="text-xs w-6 text-right" style={{ color: "var(--muted-foreground)" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Setup performance */}
            <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="font-bold text-sm mb-3" style={{ color: "var(--foreground)" }}>Performance by Setup</p>
              <div className="flex flex-col gap-2">
                {["VCP Breakout", "Flag Breakout", "ORB", "Momentum Breakout"].map(setup => {
                  const setupEntries = entries.filter(e => e.setup === setup);
                  if (setupEntries.length === 0) return null;
                  const setupWins = setupEntries.filter(e => e.outcome === "win").length;
                  const setupWR = Math.round((setupWins / setupEntries.length) * 100);
                  const setupPnL = setupEntries.reduce((sum, e) => sum + e.pnl, 0);
                  return (
                    <div key={setup} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{setup}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{setupEntries.length} trades</span>
                        <span className="text-xs font-bold" style={{ color: setupWR >= 60 ? "#4DC820" : "#E8193C" }}>{setupWR}% WR</span>
                        <span className="text-xs font-bold" style={{ color: setupPnL >= 0 ? "#4DC820" : "#E8193C", fontFamily: "JetBrains Mono, monospace" }}>
                          {setupPnL >= 0 ? "+" : ""}{setupPnL.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Kai Patterns tab */}
        {activeTab === "patterns" && (
          <div className="flex flex-col gap-4">
            {/* Weekly Kai review */}
            <div className="p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, #E6F7FD, #F3E8FF)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ background: "#00AEEF", color: "#fff" }}>K</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#00AEEF" }}>Kai's Weekly Review</p>
                  <p className="text-xs" style={{ color: "#667085" }}>Week of Apr 1–5, 2026</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "#1D2939" }}>
                You had a <strong>mixed week</strong> — 2 wins, 1 loss, 1 breakeven. Your biggest issue this week was the TSLA trade where you held 8 points past your stop.
                This is the 3rd time in the last 2 weeks you've violated your stop on a losing trade. The pattern is clear: when you enter feeling "anxious" or "FOMO," you're 3x more likely to break your rules.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "⚠️ Stop Loss Discipline", desc: "3 violations in 2 weeks. Use hard stops, not mental stops.", color: "#F79009" },
                  { label: "✅ Best Setup", desc: "VCP Breakouts — 74% win rate. Keep focusing here.", color: "#4DC820" },
                  { label: "🧘 Emotional Edge", desc: "Your 'disciplined + patient' trades have a 78% win rate vs 42% when 'anxious + impulsive'.", color: "#00AEEF" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2 p-3 rounded-xl bg-white/60">
                    <p className="text-xs font-bold" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-xs" style={{ color: "#344054" }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern cards */}
            {[
              { title: "Stop Loss Violations", count: 3, trend: "up", color: "#E8193C", desc: "You've violated your stop 3 times in the last 14 days. Each violation averaged -$2,800." },
              { title: "Best Trading Hours", count: null, trend: null, color: "#4DC820", desc: "Your win rate is 78% for trades entered between 9:45–11:00 AM ET. After 2 PM, it drops to 41%." },
              { title: "Overtrading Days", count: 2, trend: "down", color: "#F79009", desc: "On days with 4+ trades, your P&L is negative 70% of the time. Your best days average 1–2 trades." },
            ].map(pattern => (
              <div key={pattern.title} className="p-4 rounded-2xl" style={{ background: "var(--card)", border: `1px solid ${pattern.color}33` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{pattern.title}</p>
                  {pattern.count !== null && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: pattern.color + "22", color: pattern.color }}>
                      {pattern.count} detected
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{pattern.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New entry modal */}
      <AnimatePresence>
        {composerOpen && <NewEntryModal onClose={() => setComposerOpen(false)} onSave={handleNewEntry} />}
      </AnimatePresence>

      {/* Entry detail modal */}
      <AnimatePresence>
        {selectedEntry && <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
      </AnimatePresence>

      <KaiChat />
    </div>
  );
}
