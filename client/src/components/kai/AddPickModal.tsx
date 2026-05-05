// AddPickModal — validate ticker + add to watchlist via Supabase.
// Phase 4 (Write layer) gameplan: validate against ticker_universe with
// mcap≥$500M + vol≥500K + no OTC. For now: light client-side regex +
// trust the addToWatchlist server-side flow (RLS will block invalid).
import { useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => Promise<void>;
}

export function AddPickModal({ open, onClose, onAdd }: Props) {
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!open) return null;

  const submit = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)) {
      setResult({ ok: false, msg: "That doesn't look like a valid US ticker." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      await onAdd(t);
      setResult({ ok: true, msg: `${t} added to your watchlist.` });
      setTicker("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Add failed.";
      setResult({ ok: false, msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="border w-full sm:max-w-sm"
        style={{
          backgroundColor: "var(--kai-surface-2)",
          borderColor: "var(--kai-border)",
          borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--kai-border)" }}
        >
          <span
            className="text-[10px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-gold)" }}
          >
            Add To Watchlist
          </span>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 p-2"
            style={{ color: "var(--kai-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label
              className="text-[9px] font-mono tracking-[0.15em] uppercase block mb-2"
              style={{ color: "var(--kai-text-muted)" }}
            >
              Ticker Symbol
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "var(--kai-text-dim)" }}
              />
              <input
                autoFocus
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase());
                  setResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="AAPL"
                className="w-full border rounded-sm pl-9 pr-3 py-2.5 font-mono text-sm tracking-wider focus:outline-none"
                style={{
                  backgroundColor: "var(--kai-bg)",
                  borderColor: "var(--kai-border)",
                  color: "var(--kai-text)",
                }}
              />
            </div>
          </div>
          {result && (
            <div
              className="text-[11px] font-mono leading-relaxed px-3 py-2 rounded-sm border"
              style={{
                borderColor: result.ok
                  ? "color-mix(in oklab, var(--kai-green) 50%, transparent)"
                  : "color-mix(in oklab, var(--kai-red) 50%, transparent)",
                backgroundColor: result.ok
                  ? "color-mix(in oklab, var(--kai-green) 12%, transparent)"
                  : "color-mix(in oklab, var(--kai-red) 12%, transparent)",
                color: result.ok ? "var(--kai-green)" : "var(--kai-red)",
              }}
            >
              {result.ok ? "✓ " : "⚠ "}
              {result.msg}
            </div>
          )}
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--kai-text-muted)" }}>
            Kai runs V4 scoring nightly and watches for trigger patterns intraday. Alerts only on confirmed setups.
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!ticker || submitting}
            className="w-full py-3 font-mono text-[11px] tracking-[0.2em] uppercase rounded-sm transition-colors disabled:opacity-40"
            style={{ backgroundColor: "var(--kai-gold)", color: "var(--kai-bg)" }}
          >
            {submitting ? "Adding..." : result?.ok ? "Add Another" : "Add To Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
