// BeatKaiPage — Weekly & All-Time leaderboard: Beat Kai the AI
// Dark-themed, volt green + electric blue accents.

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, Zap, TrendingUp, Star, Users, ChevronDown, ArrowLeft } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchBeatKaiLeaderboard, fetchAllTimeLeaderboard } from "@/lib/api";

// ── Belt Config ──────────────────────────────────────────────────────────────

const BELT_COLORS: Record<string, string> = {
  white:  "#F9FAFB",
  yellow: "#FCD34D",
  orange: "#FB923C",
  green:  "#4ADE80",
  blue:   "#60A5FA",
  purple: "#A78BFA",
  brown:  "#92400E",
  black:  "#111827",
};

function BeltRing({ belt, size = 40 }: { belt?: string; size?: number }) {
  const color = belt ? (BELT_COLORS[belt.toLowerCase()] || "#667085") : "#667085";
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, #1A1D2E, #0D0F1A)`,
        border: `2.5px solid ${color}`,
        boxShadow: `0 0 8px ${color}40`,
      }}
    />
  );
}

function Avatar({ name, avatar_url, belt, size = 40 }: {
  name: string;
  avatar_url?: string;
  belt?: string;
  size?: number;
}) {
  const color = belt ? (BELT_COLORS[belt.toLowerCase()] || "#4DC820") : "#4DC820";
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden font-bold text-white"
      style={{
        width: size,
        height: size,
        border: `2.5px solid ${color}`,
        boxShadow: `0 0 10px ${color}40`,
        background: avatar_url ? undefined : `linear-gradient(135deg, #1e293b, #0f172a)`,
        fontSize: size * 0.32,
      }}
    >
      {avatar_url ? (
        <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// ── Kai Stats Banner ─────────────────────────────────────────────────────────

function KaiBanner({ kaiStats }: { kaiStats: { win_rate: number; calls: number } | null }) {
  return (
    <div
      className="rounded-2xl p-4 mb-5 flex items-center gap-4"
      style={{
        background: "linear-gradient(135deg, rgba(77,200,32,0.12) 0%, rgba(96,165,250,0.08) 100%)",
        border: "1px solid rgba(77,200,32,0.3)",
      }}
    >
      {/* Kai Avatar */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
        style={{
          background: "linear-gradient(135deg, #4DC820, #00E5A0)",
          boxShadow: "0 0 20px rgba(77,200,32,0.4)",
        }}
      >
        🤖
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-black text-white" style={{ fontFamily: "Sora, sans-serif" }}>K.AI</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}
          >
            ⚡ AI Analyst
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-2">Can you beat Kai's win rate this week?</p>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Win Rate</p>
            <p className="text-xl font-black" style={{ color: "#4DC820", fontFamily: "var(--font-mono)" }}>
              {kaiStats ? `${kaiStats.win_rate}%` : "—"}
            </p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Calls</p>
            <p className="text-xl font-black" style={{ color: "#60A5FA", fontFamily: "var(--font-mono)" }}>
              {kaiStats ? kaiStats.calls : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── This Week Tab ─────────────────────────────────────────────────────────────

interface WeekTrader {
  rank: number;
  name: string;
  handle: string;
  avatar_url?: string;
  belt?: string;
  win_rate: number;
  calls: number;
  r_multiple?: number;
  beating_kai: boolean;
}

function ThisWeekTab({ kaiStats }: { kaiStats: { win_rate: number; calls: number } | null }) {
  const [traders, setTraders] = useState<WeekTrader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBeatKaiLeaderboard()
      .then((data: any) => {
        if (data && Array.isArray(data.traders) && data.traders.length > 0) {
          setTraders(data.traders.map((t: any, i: number) => ({
            rank: i + 1,
            name: t.display_name || t.name || "Trader",
            handle: t.handle || "trader",
            avatar_url: t.avatar_url,
            belt: t.belt,
            win_rate: t.win_rate || 0,
            calls: t.alert_count || t.calls || 0,
            r_multiple: t.r_multiple,
            beating_kai: t.beating_kai || (kaiStats ? t.win_rate > kaiStats.win_rate : false),
          })));
        } else {
          setTraders([]);
        }
      })
      .catch(() => setTraders([]))
      .finally(() => setLoading(false));
  }, [kaiStats]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/10 w-1/3" />
                <div className="h-2 rounded bg-white/10 w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (traders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🏆</div>
        <p className="font-bold text-lg mb-1 text-white">No challengers yet</p>
        <p className="text-sm mb-5 text-gray-400">Be the first to post a trade alert and challenge Kai!</p>
        <Link href="/feed">
          <button
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
          >
            ⚡ Post Your First Alert
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {traders.map((trader) => (
        <Link key={trader.handle} href={`/traders/${trader.handle}`}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
            style={{
              background: trader.beating_kai
                ? "linear-gradient(135deg, rgba(77,200,32,0.08), rgba(0,229,160,0.05))"
                : "rgba(255,255,255,0.03)",
              border: trader.beating_kai
                ? "1px solid rgba(77,200,32,0.25)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Rank */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: trader.rank <= 3
                  ? ["linear-gradient(135deg,#FFD700,#FFA500)", "linear-gradient(135deg,#C0C0C0,#A0A0A0)", "linear-gradient(135deg,#CD7F32,#A0522D)"][trader.rank - 1]
                  : "rgba(255,255,255,0.08)",
                color: trader.rank <= 3 ? "#101828" : "#9CA3AF",
              }}
            >
              {trader.rank}
            </div>

            {/* Avatar */}
            <Avatar name={trader.name} avatar_url={trader.avatar_url} belt={trader.belt} size={38} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-bold text-sm text-white truncate">{trader.name}</span>
                {trader.beating_kai && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}>
                    ⚡ Beating Kai
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">@{trader.handle}</p>
            </div>

            {/* Stats */}
            <div className="text-right flex-shrink-0">
              <p
                className="text-sm font-black"
                style={{
                  color: trader.beating_kai ? "#4DC820" : "#60A5FA",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {trader.win_rate}%
              </p>
              <p className="text-[10px] text-gray-500">{trader.calls} calls</p>
              {trader.r_multiple !== undefined && (
                <p className="text-[10px]" style={{ color: "#A78BFA" }}>{trader.r_multiple.toFixed(1)}R</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── All Time Tab ──────────────────────────────────────────────────────────────

type SortKey = "win_rate" | "xp" | "calls";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "win_rate", label: "Win Rate" },
  { id: "xp",      label: "XP" },
  { id: "calls",   label: "Calls" },
];

const BELT_OPTIONS = ["All Belts", "white", "yellow", "orange", "green", "blue", "purple", "brown", "black"];

interface AllTimeTrader {
  rank: number;
  name: string;
  handle: string;
  avatar_url?: string;
  belt?: string;
  win_rate: number;
  xp: number;
  calls: number;
  r_multiple?: number;
}

function AllTimeTab() {
  const [traders, setTraders] = useState<AllTimeTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("win_rate");
  const [beltFilter, setBeltFilter] = useState("All Belts");
  const [showBeltDropdown, setShowBeltDropdown] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAllTimeLeaderboard(sort, beltFilter !== "All Belts" ? beltFilter : undefined)
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTraders(data.map((t: any, i: number) => ({
            rank: i + 1,
            name: t.display_name || t.name || "Trader",
            handle: t.handle || "trader",
            avatar_url: t.avatar_url,
            belt: t.belt,
            win_rate: t.win_rate || 0,
            xp: t.xp || 0,
            calls: t.alert_count || t.calls || 0,
            r_multiple: t.r_multiple,
          })));
        } else {
          setTraders([]);
        }
      })
      .catch(() => setTraders([]))
      .finally(() => setLoading(false));
  }, [sort, beltFilter]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/10 w-1/3" />
                <div className="h-2 rounded bg-white/10 w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Sort + Filter controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Sort pills */}
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
              style={{
                background: sort === opt.id ? "rgba(77,200,32,0.15)" : "rgba(255,255,255,0.05)",
                color: sort === opt.id ? "#4DC820" : "#9CA3AF",
                border: sort === opt.id ? "1px solid rgba(77,200,32,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Belt filter dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowBeltDropdown(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{
              background: beltFilter !== "All Belts" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)",
              color: beltFilter !== "All Belts" ? "#60A5FA" : "#9CA3AF",
              border: beltFilter !== "All Belts" ? "1px solid rgba(96,165,250,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {beltFilter !== "All Belts" ? (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: BELT_COLORS[beltFilter] || "#667085" }}
              />
            ) : null}
            {beltFilter === "All Belts" ? "Belt" : beltFilter.charAt(0).toUpperCase() + beltFilter.slice(1)}
            <ChevronDown size={11} />
          </button>
          {showBeltDropdown && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 w-32"
              style={{ background: "#1A1D2E", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {BELT_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => { setBeltFilter(b); setShowBeltDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-white/5"
                  style={{ color: beltFilter === b ? "#60A5FA" : "#9CA3AF" }}
                >
                  {b !== "All Belts" && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BELT_COLORS[b] || "#667085" }} />
                  )}
                  {b === "All Belts" ? "All Belts" : b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {traders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-bold text-lg mb-1 text-white">No data yet</p>
          <p className="text-sm mb-5 text-gray-400">Post trade alerts to appear on the all-time leaderboard.</p>
          <Link href="/feed">
            <button
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
            >
              ⚡ Post Your First Alert
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {traders.map(trader => (
            <Link key={trader.handle} href={`/traders/${trader.handle}`}>
              <div
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Rank */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{
                    background: trader.rank <= 3
                      ? ["linear-gradient(135deg,#FFD700,#FFA500)", "linear-gradient(135deg,#C0C0C0,#A0A0A0)", "linear-gradient(135deg,#CD7F32,#A0522D)"][trader.rank - 1]
                      : "rgba(255,255,255,0.08)",
                    color: trader.rank <= 3 ? "#101828" : "#9CA3AF",
                  }}
                >
                  {trader.rank}
                </div>

                {/* Avatar */}
                <Avatar name={trader.name} avatar_url={trader.avatar_url} belt={trader.belt} size={38} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm text-white truncate">{trader.name}</span>
                    {trader.belt && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize"
                        style={{
                          background: `${BELT_COLORS[trader.belt.toLowerCase()] || "#667085"}20`,
                          color: BELT_COLORS[trader.belt.toLowerCase()] || "#667085",
                          border: `1px solid ${BELT_COLORS[trader.belt.toLowerCase()] || "#667085"}40`,
                        }}
                      >
                        {trader.belt} belt
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">@{trader.handle}</p>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-sm font-black" style={{ color: "#4DC820", fontFamily: "var(--font-mono)" }}>
                    {sort === "xp" ? `${trader.xp.toLocaleString()} XP` : sort === "calls" ? `${trader.calls} calls` : `${trader.win_rate}%`}
                  </p>
                  {sort !== "win_rate" && (
                    <p className="text-[10px] text-gray-500">{trader.win_rate}% WR</p>
                  )}
                  {trader.r_multiple !== undefined && (
                    <p className="text-[10px]" style={{ color: "#A78BFA" }}>{trader.r_multiple.toFixed(1)}R</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main BeatKaiPage ──────────────────────────────────────────────────────────

export default function BeatKaiPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"week" | "alltime">("week");
  const [kaiStats, setKaiStats] = useState<{ win_rate: number; calls: number } | null>(null);

  useEffect(() => {
    fetchBeatKaiLeaderboard()
      .then((data: any) => {
        if (data?.kai) {
          setKaiStats({ win_rate: data.kai.win_rate || 0, calls: data.kai.calls || 0 });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0A0C14" }}>
      <Nav />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Back link */}
        <div className="flex items-center gap-2 mb-5">
          <Link href="/leaderboard">
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={15} /> Leaderboard
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(77,200,32,0.2), rgba(96,165,250,0.1))",
              border: "1px solid rgba(77,200,32,0.3)",
            }}
          >
            🏆
          </div>
          <div>
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Beat K.AI
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Can you outperform our AI analyst? Post alerts, track your win rate.
            </p>
          </div>
        </div>

        {/* Kai banner — shown on week tab */}
        {tab === "week" && <KaiBanner kaiStats={kaiStats} />}

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {([
            { id: "week" as const, label: "⚡ This Week" },
            { id: "alltime" as const, label: "🏆 All Time" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: tab === t.id
                  ? "linear-gradient(135deg, rgba(77,200,32,0.2), rgba(96,165,250,0.1))"
                  : "transparent",
                color: tab === t.id ? "#fff" : "#9CA3AF",
                border: tab === t.id ? "1px solid rgba(77,200,32,0.25)" : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "week" ? (
          <ThisWeekTab kaiStats={kaiStats} />
        ) : (
          <AllTimeTab />
        )}
      </div>

      <KaiChat />
    </div>
  );
}
