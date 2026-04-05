/**
 * CheatCode OS — Onboarding Flow
 * Design: Robinhood x Spotify x BuzzFeed — clean white/dark, bold Sora display,
 * animated step transitions, colored pill tiles for trader identity.
 * 7 screens: Welcome → Assets → Style → Experience → Watchlist → Follow → Broker
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Search, X, ArrowRight, Zap, TrendingUp, BarChart2, DollarSign, Bitcoin, Package, Building2 } from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingState {
  assets: string[];
  style: string;
  experience: string;
  watchlist: string[];
  following: string[];
  brokerConnected: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const ASSET_TILES = [
  { id: "stocks", label: "Stocks", icon: TrendingUp, color: "#00AEEF", bg: "#E6F7FD", desc: "Equities & ETFs" },
  { id: "options", label: "Options", icon: Zap, color: "#7B2FBE", bg: "#F3E8FF", desc: "Calls, puts & spreads" },
  { id: "futures", label: "Futures", icon: BarChart2, color: "#E8193C", bg: "#FEE8EC", desc: "ES, NQ, CL & more" },
  { id: "forex", label: "Forex", icon: DollarSign, color: "#F79009", bg: "#FEF3E2", desc: "Currency pairs" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, color: "#4DC820", bg: "#EDFBE6", desc: "BTC, ETH & alts" },
  { id: "etfs", label: "ETFs", icon: Package, color: "#667085", bg: "#F2F4F7", desc: "Index & thematic funds" },
  { id: "bonds", label: "Bonds", icon: Building2, color: "#344054", bg: "#F9FAFB", desc: "Fixed income" },
];

const STYLE_TILES = [
  { id: "day_trader", label: "Day Trader", emoji: "⚡", desc: "In and out same day, no overnight holds" },
  { id: "scalper", label: "Scalper", emoji: "🔪", desc: "Seconds to minutes, high-frequency entries" },
  { id: "swing_trader", label: "Swing Trader", emoji: "📅", desc: "2 days to 2 weeks, riding momentum" },
  { id: "investor", label: "Investor", emoji: "🌱", desc: "Long-term growth, buy and hold" },
  { id: "income_trader", label: "Income Trader", emoji: "💰", desc: "Yield via options, dividends & covered calls" },
  { id: "options_strategist", label: "Options Strategist", emoji: "🎯", desc: "Structures, spreads & complex plays" },
  { id: "algo_quant", label: "Algo / Quant", emoji: "🤖", desc: "Systematic, rules-based trading" },
];

const EXPERIENCE_LEVELS = [
  { id: "just_starting", label: "Just Starting", sub: "< 6 months", xp: 0 },
  { id: "under_1yr", label: "< 1 Year", sub: "Learning the ropes", xp: 100 },
  { id: "1_3yr", label: "1–3 Years", sub: "Building consistency", xp: 500 },
  { id: "3_7yr", label: "3–7 Years", sub: "Experienced trader", xp: 2000 },
  { id: "7plus", label: "7+ Years", sub: "Seasoned veteran", xp: 5000 },
];

const SUGGESTED_TICKERS: Record<string, string[]> = {
  stocks: ["NVDA", "TSLA", "AAPL", "AMD", "META", "MSFT", "SPY", "QQQ", "AMZN", "GOOGL"],
  options: ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "VIX", "IWM", "GLD"],
  futures: ["ES1!", "NQ1!", "CL1!", "GC1!", "SI1!", "ZB1!", "6E1!"],
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD"],
  crypto: ["BTC", "ETH", "SOL", "XRP", "DOGE", "AVAX", "LINK", "MATIC"],
  etfs: ["SPY", "QQQ", "IWM", "GLD", "TLT", "XLF", "ARKK", "SQQQ"],
  bonds: ["TLT", "IEF", "SHY", "BND", "AGG", "HYG"],
};

const SUGGESTED_TRADERS = [
  {
    id: "minervini",
    name: "Mark Minervini",
    handle: "@minervini",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/minervini.jpg",
    style: "Swing Trader",
    winRate: 71,
    level: "Legend",
    levelColor: "#4DC820",
    assets: ["Stocks"],
    bio: "3x US Investing Champion. SEPA methodology.",
  },
  {
    id: "humbled_trader",
    name: "Humbled Trader",
    handle: "@humbledtrader",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/humbled_trader.jpg",
    style: "Day Trader",
    winRate: 64,
    level: "Elite",
    levelColor: "#F79009",
    assets: ["Stocks", "Options"],
    bio: "Real trades, real losses. No BS education.",
  },
  {
    id: "smb_capital",
    name: "SMB Capital",
    handle: "@smbcapital",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/smb_capital.jpg",
    style: "Day Trader",
    winRate: 68,
    level: "Elite",
    levelColor: "#F79009",
    assets: ["Stocks", "Options", "Futures"],
    bio: "NYC prop trading firm. Institutional-grade education.",
  },
  {
    id: "tastytrade",
    name: "tastytrade",
    handle: "@tastytrade",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/tastytrade.jpg",
    style: "Income Trader",
    winRate: 72,
    level: "Legend",
    levelColor: "#4DC820",
    assets: ["Options"],
    bio: "The home of options trading. Probability-based.",
  },
  {
    id: "real_vision",
    name: "Real Vision",
    handle: "@realvision",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/real_vision.jpg",
    style: "Investor",
    winRate: 65,
    level: "Elite",
    levelColor: "#F79009",
    assets: ["Stocks", "Crypto", "Forex"],
    bio: "Macro intelligence from the world's best investors.",
  },
  {
    id: "macro_voices",
    name: "Macro Voices",
    handle: "@macrovoices",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/macro_voices.jpg",
    style: "Investor",
    winRate: 60,
    level: "Veteran",
    levelColor: "#7B2FBE",
    assets: ["Futures", "Forex", "Bonds"],
    bio: "Weekly macro analysis from top hedge fund managers.",
  },
];

const BROKERS = [
  { id: "alpaca", name: "Alpaca", logo: "🦙", desc: "Commission-free stocks & crypto API" },
  { id: "tradier", name: "Tradier", logo: "📊", desc: "Options & equities brokerage" },
  { id: "td_ameritrade", name: "TD Ameritrade", logo: "🏦", desc: "Full-service brokerage" },
  { id: "ibkr", name: "Interactive Brokers", logo: "🌐", desc: "Professional-grade platform" },
  { id: "coinbase", name: "Coinbase", logo: "₿", desc: "Crypto exchange & custody" },
  { id: "robinhood", name: "Robinhood", logo: "🪶", desc: "CSV import available" },
  { id: "webull", name: "Webull", logo: "📱", desc: "CSV import available" },
  { id: "kraken", name: "Kraken", logo: "🐙", desc: "Crypto exchange" },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i === current ? "#4DC820" : i < current ? "#4DC820" : "#D0D5DD",
            opacity: i < current ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ─── Screen 1: Welcome ────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: "#0d1117" }}>
      {/* Logo animation */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-8"
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="24" cy="20" r="14" fill="#E8193C" />
          <rect x="18" y="14" width="12" height="12" rx="2" transform="rotate(45 24 20)" fill="#0d1117" />
          <circle cx="48" cy="20" r="14" fill="#4DC820" />
          <rect x="42" y="14" width="12" height="12" rx="2" transform="rotate(45 48 20)" fill="#0d1117" />
          <circle cx="24" cy="52" r="14" fill="#00AEEF" />
          <rect x="18" y="46" width="12" height="12" rx="2" transform="rotate(45 24 52)" fill="#0d1117" />
          <circle cx="48" cy="52" r="14" fill="#7B2FBE" />
          <rect x="42" y="46" width="12" height="12" rx="2" transform="rotate(45 48 52)" fill="#0d1117" />
        </svg>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "Sora, sans-serif", color: "#fff" }}>
          cheat<span style={{ background: "linear-gradient(90deg, #4DC820, #C8D400)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>code</span>
        </h1>
        <p className="text-lg mb-2" style={{ color: "#98A2B3" }}>The trading platform built for serious traders.</p>
        <p className="text-sm mb-10" style={{ color: "#667085" }}>Trade smarter. Learn faster. Grow together.</p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base mx-auto"
          style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
        >
          Get Started <ArrowRight size={18} />
        </motion.button>
        <p className="text-sm mt-4" style={{ color: "#667085" }}>
          Already have an account?{" "}
          <span className="underline cursor-pointer" style={{ color: "#00AEEF" }}>Sign in</span>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Screen 2: Asset Classes ──────────────────────────────────────────────────

function AssetsScreen({ selected, onToggle, onNext }: {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardingShell
      step={1}
      title="What markets do you trade?"
      subtitle="Select all that apply — we'll personalize your feed and tools."
      onNext={onNext}
      nextDisabled={selected.length === 0}
      nextLabel="Continue"
    >
      <div className="grid grid-cols-2 gap-3">
        {ASSET_TILES.map((tile) => {
          const Icon = tile.icon;
          const isSelected = selected.includes(tile.id);
          return (
            <motion.button
              key={tile.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(tile.id)}
              className="relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: isSelected ? tile.color : "var(--border)",
                background: isSelected ? tile.bg : "var(--card)",
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: tile.color }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: isSelected ? tile.color : "var(--muted)" }}
              >
                <Icon size={18} color={isSelected ? "#fff" : "var(--muted-foreground)"} />
              </div>
              <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{tile.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{tile.desc}</p>
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ─── Screen 3: Trading Style ──────────────────────────────────────────────────

function StyleScreen({ selected, onSelect, onNext }: {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardingShell
      step={2}
      title="What's your trading style?"
      subtitle="Pick your primary approach — this defines your community and content."
      onNext={onNext}
      nextDisabled={!selected}
    >
      <div className="flex flex-col gap-3">
        {STYLE_TILES.map((tile) => {
          const isSelected = selected === tile.id;
          return (
            <motion.button
              key={tile.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(tile.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: isSelected ? "#4DC820" : "var(--border)",
                background: isSelected ? "#EDFBE6" : "var(--card)",
              }}
            >
              <span className="text-2xl">{tile.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: isSelected ? "#1A5C0A" : "var(--foreground)" }}>
                  {tile.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isSelected ? "#2D8A14" : "var(--muted-foreground)" }}>
                  {tile.desc}
                </p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#4DC820" }}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ─── Screen 4: Experience Level ───────────────────────────────────────────────

function ExperienceScreen({ selected, onSelect, onNext }: {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardingShell
      step={3}
      title="How long have you been trading?"
      subtitle="Be honest — we'll match you with the right content and community."
      onNext={onNext}
      nextDisabled={!selected}
    >
      <div className="flex flex-col gap-3">
        {EXPERIENCE_LEVELS.map((level, idx) => {
          const isSelected = selected === level.id;
          const colors = ["#667085", "#4DC820", "#00AEEF", "#7B2FBE", "#F79009"];
          const color = colors[idx];
          return (
            <motion.button
              key={level.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(level.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: isSelected ? color : "var(--border)",
                background: isSelected ? `${color}18` : "var(--card)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: isSelected ? color : "var(--muted)", color: isSelected ? "#fff" : "var(--muted-foreground)" }}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{level.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{level.sub}</p>
              </div>
              {isSelected && level.xp > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: color, color: "#fff" }}>
                  +{level.xp} XP
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ─── Screen 5: Watchlist ──────────────────────────────────────────────────────

function WatchlistScreen({ assets, watchlist, onToggle, onNext }: {
  assets: string[];
  watchlist: string[];
  onToggle: (ticker: string) => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState("");

  // Build suggestions based on selected assets
  const suggestions = Array.from(new Set(
    assets.flatMap(a => SUGGESTED_TICKERS[a] || [])
  )).filter(t => !search || t.toLowerCase().includes(search.toLowerCase()));

  const handleAddCustom = () => {
    const ticker = search.trim().toUpperCase();
    if (ticker && !watchlist.includes(ticker)) {
      onToggle(ticker);
      setSearch("");
    }
  };

  return (
    <OnboardingShell
      step={4}
      title="Build your watchlist"
      subtitle="Add the tickers you follow. We'll surface content and trade ideas for them."
      onNext={onNext}
      nextDisabled={watchlist.length === 0}
      nextLabel={`Continue with ${watchlist.length} ticker${watchlist.length !== 1 ? "s" : ""}`}
    >
      {/* Search input */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          placeholder="Search or add any ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddCustom()}
          className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Selected tickers */}
      {watchlist.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {watchlist.map(ticker => (
            <span
              key={ticker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "#4DC820", color: "#fff" }}
            >
              {ticker}
              <button onClick={() => onToggle(ticker)}>
                <X size={11} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.filter(t => !watchlist.includes(t)).slice(0, 20).map(ticker => (
          <button
            key={ticker}
            onClick={() => onToggle(ticker)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
            style={{
              borderColor: "var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            + {ticker}
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}

// ─── Screen 6: Follow Traders ─────────────────────────────────────────────────

function FollowScreen({ following, onToggle, onNext }: {
  following: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardingShell
      step={5}
      title="Follow your first traders"
      subtitle="We matched these traders to your style. Follow at least 1 to continue."
      onNext={onNext}
      nextDisabled={following.length === 0}
      nextLabel={`Follow ${following.length} trader${following.length !== 1 ? "s" : ""} & Continue`}
    >
      <div className="flex flex-col gap-3">
        {SUGGESTED_TRADERS.map(trader => {
          const isFollowing = following.includes(trader.id);
          return (
            <div
              key={trader.id}
              className="flex items-center gap-3 p-3 rounded-2xl border"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <img
                src={trader.avatar}
                alt={trader.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{trader.name}</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: trader.levelColor, color: "#fff" }}
                  >
                    {trader.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{trader.style}</span>
                  <span className="text-xs font-bold" style={{ color: "#4DC820" }}>{trader.winRate}% win rate</span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {trader.assets.map(a => (
                    <span key={a} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onToggle(trader.id)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: isFollowing ? "#4DC820" : "var(--muted)",
                  color: isFollowing ? "#fff" : "var(--foreground)",
                }}
              >
                {isFollowing ? "Following ✓" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ─── Screen 7: Broker Connection ─────────────────────────────────────────────

function BrokerScreen({ connected, onConnect, onSkip }: {
  connected: boolean;
  onConnect: () => void;
  onSkip: () => void;
}) {
  return (
    <OnboardingShell
      step={6}
      title="Unlock your full trading identity"
      subtitle="Connect your brokerage to verify P&L, auto-import trades, and unlock the Trading Journal."
      onNext={onConnect}
      nextLabel={connected ? "Connected! Continue →" : "Connect & Earn +500 XP"}
      showSkip
      onSkip={onSkip}
    >
      {/* XP incentive banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-2xl mb-5"
        style={{ background: "linear-gradient(135deg, #EDFBE6, #FFF9E6)" }}
      >
        <div className="text-2xl">🏆</div>
        <div>
          <p className="font-bold text-sm" style={{ color: "#1A5C0A" }}>Connect a broker → +500 XP instantly</p>
          <p className="text-xs mt-0.5" style={{ color: "#2D8A14" }}>
            Plus unlock the Trading Journal, Verified P&L badge, and Kai's trade analysis.
          </p>
        </div>
      </div>

      {/* Broker grid */}
      <div className="grid grid-cols-2 gap-3">
        {BROKERS.map(broker => (
          <button
            key={broker.id}
            onClick={() => {
              toast.info(`${broker.name} connection coming soon — we'll notify you when it's live.`);
            }}
            className="flex flex-col items-start p-3 rounded-xl border text-left transition-all hover:border-[#4DC820]"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <span className="text-xl mb-1">{broker.logo}</span>
            <p className="font-bold text-xs" style={{ color: "var(--foreground)" }}>{broker.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{broker.desc}</p>
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}

// ─── Shared Shell ─────────────────────────────────────────────────────────────

function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  showSkip,
  onSkip,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 72 72" fill="none">
            <circle cx="24" cy="20" r="14" fill="#E8193C" />
            <rect x="18" y="14" width="12" height="12" rx="2" transform="rotate(45 24 20)" fill="var(--background)" />
            <circle cx="48" cy="20" r="14" fill="#4DC820" />
            <rect x="42" y="14" width="12" height="12" rx="2" transform="rotate(45 48 20)" fill="var(--background)" />
            <circle cx="24" cy="52" r="14" fill="#00AEEF" />
            <rect x="18" y="46" width="12" height="12" rx="2" transform="rotate(45 24 52)" fill="var(--background)" />
            <circle cx="48" cy="52" r="14" fill="#7B2FBE" />
            <rect x="42" y="46" width="12" height="12" rx="2" transform="rotate(45 48 52)" fill="var(--background)" />
          </svg>
          <span className="font-bold text-sm" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>cheatcode</span>
        </div>
        <StepDots current={step} total={7} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
            {title}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
          {children}
        </motion.div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="max-w-lg mx-auto w-full flex flex-col gap-2">
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: nextDisabled ? "var(--muted)" : "linear-gradient(135deg, #4DC820, #C8D400)",
              color: nextDisabled ? "var(--muted-foreground)" : "#101828",
              cursor: nextDisabled ? "not-allowed" : "pointer",
            }}
          >
            {nextLabel} {!nextDisabled && <ChevronRight size={16} />}
          </button>
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2 text-sm font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    assets: [],
    style: "",
    experience: "",
    watchlist: [],
    following: [],
    brokerConnected: false,
  });

  const next = () => setScreen(s => s + 1);

  const toggleAsset = (id: string) =>
    setState(s => ({
      ...s,
      assets: s.assets.includes(id) ? s.assets.filter(a => a !== id) : [...s.assets, id],
    }));

  const toggleTicker = (ticker: string) =>
    setState(s => ({
      ...s,
      watchlist: s.watchlist.includes(ticker)
        ? s.watchlist.filter(t => t !== ticker)
        : [...s.watchlist, ticker],
    }));

  const toggleFollow = (id: string) =>
    setState(s => ({
      ...s,
      following: s.following.includes(id)
        ? s.following.filter(f => f !== id)
        : [...s.following, id],
    }));

  const finish = () => {
    // Save to localStorage as fallback
    localStorage.setItem("cc-onboarding-complete", "true");
    localStorage.setItem("cc-trader-profile", JSON.stringify(state));
    // Save to API
    import("@/lib/api").then(({ completeOnboarding }) => {
      completeOnboarding({
        assets: state.assets,
        style: state.style,
        experience: state.experience,
        watchlist: state.watchlist,
        following_creators: state.following,
      }).catch(() => {});
    });
    toast.success("Welcome to CheatCode! Your feed is ready. 🎉");
    navigate("/feed");
  };

  const screens = [
    <WelcomeScreen key="welcome" onNext={next} />,
    <AssetsScreen key="assets" selected={state.assets} onToggle={toggleAsset} onNext={next} />,
    <StyleScreen key="style" selected={state.style} onSelect={s => setState(p => ({ ...p, style: s }))} onNext={next} />,
    <ExperienceScreen key="exp" selected={state.experience} onSelect={e => setState(p => ({ ...p, experience: e }))} onNext={next} />,
    <WatchlistScreen key="watchlist" assets={state.assets} watchlist={state.watchlist} onToggle={toggleTicker} onNext={next} />,
    <FollowScreen key="follow" following={state.following} onToggle={toggleFollow} onNext={next} />,
    <BrokerScreen
      key="broker"
      connected={state.brokerConnected}
      onConnect={() => { setState(p => ({ ...p, brokerConnected: true })); finish(); }}
      onSkip={finish}
    />,
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25 }}
      >
        {screens[screen]}
      </motion.div>
    </AnimatePresence>
  );
}
