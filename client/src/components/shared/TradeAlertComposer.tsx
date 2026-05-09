// TradeAlertComposer — 30-second trade alert posting flow
// Mobile-first bottom sheet. Clean step-by-step UX.
// Step 1: Ticker + Direction
// Step 2: Entry / Target / Stop
// Step 3: Thesis (optional) + Kai Score Preview → Post

import { useState, useRef, useEffect } from "react";
import { TrendingUp, TrendingDown, X, ChevronRight, Zap, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  onPost: (data: PostData) => Promise<void>;
}

interface PostData {
  post_type: "trade_alert";
  ticker: string;
  direction: "long" | "short";
  timeframe: string;
  entry_price: string;
  target_price: string;
  stop_price: string;
  thesis: string;
  tags: string[];
}

interface KaiPreview {
  score: number;
  emoji: string;
  label: string;
}

const TIMEFRAMES = [
  { id: "scalp", label: "Scalp", sub: "<1h" },
  { id: "intraday", label: "Intraday", sub: "Same day" },
  { id: "swing", label: "Swing", sub: "2-10 days" },
  { id: "position", label: "Position", sub: "Weeks+" },
];

const KAI_COLORS: Record<string, { color: string; bg: string }> = {
  "🔥": { color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  "⚡": { color: "#4ADE80", bg: "rgba(74,222,128,0.1)" },
  "💡": { color: "#FCD34D", bg: "rgba(252,211,77,0.1)" },
  "😐": { color: "#9CA3AF", bg: "rgba(156,163,175,0.08)" },
  "🧊": { color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
};

function calcRRatio(entry: string, target: string, stop: string): number | null {
  try {
    const e = parseFloat(entry.replace(/[$,]/g, ""));
    const t = parseFloat(target.replace(/[$,]/g, ""));
    const s = parseFloat(stop.replace(/[$,]/g, ""));
    if (!isFinite(e) || !isFinite(t) || !isFinite(s) || e === s) return null;
    return Math.abs(t - e) / Math.abs(e - s);
  } catch {
    return null;
  }
}

// ── Main Composer ──────────────────────────────────────────────────────────

export function TradeAlertComposer({ open, onClose, onPost }: ComposerProps) {
  const [step, setStep] = useState(1);
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [timeframe, setTimeframe] = useState("swing");
  const [entry, setEntry] = useState("");
  const [target, setTarget] = useState("");
  const [stop, setStop] = useState("");
  const [thesis, setThesis] = useState("");
  const [kaiPreview, setKaiPreview] = useState<KaiPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [posting, setPosting] = useState(false);

  const tickerRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setTicker(""); setDirection("long"); setTimeframe("swing");
        setEntry(""); setTarget(""); setStop(""); setThesis("");
        setKaiPreview(null); setPosting(false);
      }, 300);
    } else {
      setTimeout(() => tickerRef.current?.focus(), 100);
    }
  }, [open]);

  // Fetch Kai preview when moving to step 3
  async function fetchKaiPreview() {
    if (!ticker || !entry || !target || !stop) return;
    setLoadingPreview(true);
    try {
      const r = await fetch("/api/v1/social/preview-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, direction, entry_price: entry, target_price: target, stop_price: stop, thesis }),
      });
      if (r.ok) {
        const data = await r.json();
        setKaiPreview({ score: data.score, emoji: data.emoji, label: data.label });
      }
    } catch {
      // Preview failed silently — don't block posting
    } finally {
      setLoadingPreview(false);
    }
  }

  function goToStep2() {
    if (!ticker.trim()) return;
    setStep(2);
  }

  function goToStep3() {
    if (!entry || !target || !stop) return;
    setStep(3);
    fetchKaiPreview();
  }

  async function handlePost() {
    if (posting) return;
    setPosting(true);
    try {
      await onPost({
        post_type: "trade_alert",
        ticker: ticker.toUpperCase(),
        direction,
        timeframe,
        entry_price: entry,
        target_price: target,
        stop_price: stop,
        thesis,
        tags: ["trade_alert", timeframe],
      });
      onClose();
    } catch (err) {
      console.error("Post failed:", err);
    } finally {
      setPosting(false);
    }
  }

  const rRatio = calcRRatio(entry, target, stop);
  const kaiStyle = kaiPreview ? (KAI_COLORS[kaiPreview.emoji] || KAI_COLORS["😐"]) : null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F] border-t border-white/10 rounded-t-3xl pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
          <span className="text-[13px] text-white/40">
            {step === 1 ? "What's your play?" :
             step === 2 ? "Set your levels" :
             "Your thesis"}
          </span>
          <div className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all ${s === step ? "w-4 bg-white" : s < step ? "w-2 bg-white/60" : "w-2 bg-white/20"}`}
                />
              ))}
            </div>
            <button onClick={onClose}>
              <X size={16} className="text-white/40 hover:text-white/70" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── STEP 1: Ticker + Direction + Timeframe ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Ticker input */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Ticker</label>
                <input
                  ref={tickerRef}
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                  placeholder="NVDA"
                  maxLength={6}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3.5 text-[22px] font-black text-white placeholder-white/20 focus:outline-none focus:border-white/30 tracking-widest"
                  onKeyDown={e => e.key === "Enter" && ticker && goToStep2()}
                />
              </div>

              {/* Direction */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "long" as const, label: "▲ LONG", color: "#4ADE80" },
                    { id: "short" as const, label: "▼ SHORT", color: "#EF4444" },
                  ].map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => setDirection(id)}
                      className={`py-3 rounded-xl font-black text-[13px] tracking-wider transition-all border ${
                        direction === id
                          ? "border-current"
                          : "border-white/10 text-white/30 hover:border-white/20"
                      }`}
                      style={direction === id ? { color, background: color + "15", borderColor: color + "40" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Timeframe</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.id}
                      onClick={() => setTimeframe(tf.id)}
                      className={`py-2 rounded-lg flex flex-col items-center transition-all border ${
                        timeframe === tf.id
                          ? "border-white/40 bg-white/10"
                          : "border-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${timeframe === tf.id ? "text-white" : "text-white/50"}`}>
                        {tf.label}
                      </span>
                      <span className="text-[9px] text-white/30">{tf.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={goToStep2}
                disabled={!ticker.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-[#E8193C] to-[#7B2FBE] text-white disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Set Levels <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Entry / Target / Stop ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Ticker reminder */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[18px] font-black">${ticker}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  direction === "long" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {direction === "long" ? "▲ LONG" : "▼ SHORT"}
                </span>
              </div>

              {/* Price inputs */}
              {[
                { key: "entry", label: "Entry", value: entry, setter: setEntry, color: "#9CA3AF" },
                { key: "target", label: "Target TP", value: target, setter: setTarget, color: "#4ADE80" },
                { key: "stop", label: "Stop Loss", value: stop, setter: setStop, color: "#EF4444" },
              ].map(({ key, label, value, setter, color }) => (
                <div key={key}>
                  <label className="text-[11px] uppercase tracking-wider mb-1 block font-bold" style={{ color }}>
                    {label}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3.5 text-[18px] font-bold text-white placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                    style={{ borderColor: value ? color + "40" : undefined }}
                  />
                </div>
              ))}

              {/* R ratio preview */}
              {rRatio !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium ${
                  rRatio >= 2 ? "bg-green-500/10 text-green-400" :
                  rRatio >= 1 ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  <Zap size={12} />
                  <span>R-Ratio: {rRatio.toFixed(1)} — {rRatio >= 3 ? "Excellent risk/reward" : rRatio >= 2 ? "Good risk/reward" : rRatio >= 1 ? "Acceptable" : "Poor risk/reward"}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border border-white/10 text-white/60 text-[13px]">
                  Back
                </button>
                <button
                  onClick={goToStep3}
                  disabled={!entry || !target || !stop}
                  className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-gradient-to-r from-[#E8193C] to-[#7B2FBE] text-white disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Add Thesis <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Thesis + Kai Preview + Post ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Kai score preview */}
              <div className="rounded-xl border border-white/[0.08] p-3 bg-white/[0.02]">
                {loadingPreview ? (
                  <div className="flex items-center gap-2 text-white/40 text-[12px]">
                    <Loader2 size={14} className="animate-spin" />
                    Kai is scoring your setup…
                  </div>
                ) : kaiPreview ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ background: kaiStyle?.bg, border: `1px solid ${kaiStyle?.color}44` }}
                    >
                      <span className="text-[16px]">{kaiPreview.emoji}</span>
                      <span className="text-[14px] font-black" style={{ color: kaiStyle?.color }}>
                        {kaiPreview.score}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">{kaiPreview.label}</div>
                      <div className="text-[10px] text-white/40">Kai's conviction score on this setup</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px] text-white/30">Kai will score this alert after posting</div>
                )}
              </div>

              {/* Thesis */}
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">
                  Your Thesis <span className="text-white/20 normal-case">(optional)</span>
                </label>
                <textarea
                  value={thesis}
                  onChange={e => setThesis(e.target.value)}
                  placeholder="Why this setup? What are you seeing?"
                  rows={3}
                  maxLength={280}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
                />
                <div className="text-right text-[10px] text-white/20 mt-0.5">{thesis.length}/280</div>
              </div>

              {/* Alert summary */}
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] text-[12px] text-white/60 space-y-1">
                <div className="font-bold text-white text-[13px]">
                  ${ticker} {direction === "long" ? "▲ LONG" : "▼ SHORT"} · {timeframe}
                </div>
                <div>Entry ${entry} · TP ${target} · SL ${stop}</div>
                {rRatio !== null && <div>R-Ratio: {rRatio.toFixed(1)}x</div>}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border border-white/10 text-white/60 text-[13px]">
                  Back
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-[#E8193C] to-[#7B2FBE] text-white disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {posting ? (
                    <><Loader2 size={16} className="animate-spin" /> Posting…</>
                  ) : (
                    <>Post Alert 🚀</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom safe area spacer */}
        <div className="h-6" />
      </div>
    </>
  );
}
