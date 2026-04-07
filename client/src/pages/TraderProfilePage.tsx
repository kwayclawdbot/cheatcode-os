/**
 * CheatCode OS — Trader Profile Page
 * Design: Spotify-style hero banner with brand color, badge system,
 * XP progress bar, post history, stats grid, and Kai's take panel.
 * Route: /traders/:handle
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, BarChart2, Award, Zap, Star,
  Users, BookOpen, MessageCircle, Settings, Share2,
  CheckCircle, Lock, ChevronRight, Calendar, Target, Plus, X as XIcon, Eye
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── XP Level System ──────────────────────────────────────────────────────────

const XP_LEVELS = [
  { level: 1, name: "Rookie", minXP: 0, maxXP: 500, color: "#667085", emoji: "🌱" },
  { level: 2, name: "Apprentice", minXP: 500, maxXP: 1500, color: "#00AEEF", emoji: "📚" },
  { level: 3, name: "Trader", minXP: 1500, maxXP: 4000, color: "#7B2FBE", emoji: "📈" },
  { level: 4, name: "Veteran", minXP: 4000, maxXP: 10000, color: "#F79009", emoji: "⚔️" },
  { level: 5, name: "Elite", minXP: 10000, maxXP: 25000, color: "#E8193C", emoji: "🔥" },
  { level: 6, name: "Legend", minXP: 25000, maxXP: Infinity, color: "#4DC820", emoji: "👑" },
];

function getLevel(xp: number) {
  return XP_LEVELS.slice().reverse().find(l => xp >= l.minXP) || XP_LEVELS[0];
}

function getXPProgress(xp: number) {
  const level = getLevel(xp);
  if (level.maxXP === Infinity) return 100;
  const range = level.maxXP - level.minXP;
  const progress = xp - level.minXP;
  return Math.round((progress / range) * 100);
}

// ─── Badge Definitions ────────────────────────────────────────────────────────

const BADGE_DEFS = [
  { id: "verified_pl", label: "Verified P&L", desc: "Brokerage connected & P&L verified", icon: CheckCircle, color: "#4DC820", earned: true },
  { id: "consistent_trader", label: "Consistent", desc: "30-day winning streak", icon: TrendingUp, color: "#00AEEF", earned: true },
  { id: "top_caller", label: "Top Caller", desc: "Top 10% accuracy this month", icon: Target, color: "#F79009", earned: true },
  { id: "educator", label: "Educator", desc: "10+ educational posts", icon: BookOpen, color: "#7B2FBE", earned: true },
  { id: "community_pillar", label: "Community", desc: "500+ helpful replies", icon: MessageCircle, color: "#E8193C", earned: false },
  { id: "live_streamer", label: "Live Streamer", desc: "Hosted 5+ live sessions", icon: Star, color: "#F79009", earned: false },
];

// ─── Mock Profile Data ────────────────────────────────────────────────────────

interface TraderProfile {
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  xp: number;
  assets: string[];
  style: string;
  experience: string;
  followers: number;
  following: number;
  totalTrades: number;
  winRate: number;
  avgRR: number;
  bestTrade: string;
  bestTradeReturn: string;
  brokerConnected: boolean;
  joinDate: string;
  topTickers: { ticker: string; sentiment: "bullish" | "bearish" | "neutral"; count: number }[];
  posts?: any[];
  badges?: string[];
}

const MOCK_PROFILES: Record<string, TraderProfile> = {
  minervini: {
    name: "Mark Minervini",
    handle: "@minervini",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/minervini.jpg",
    banner: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    bio: "3x US Investing Champion. Creator of the SEPA methodology. Author of Trade Like a Stock Market Wizard. Helping traders find the next big winner.",
    xp: 28400,
    assets: ["Stocks"],
    style: "Swing Trader",
    experience: "30+ Years",
    followers: 84200,
    following: 12,
    totalTrades: 2847,
    winRate: 71,
    avgRR: 3.2,
    bestTrade: "NVDA",
    bestTradeReturn: "+340%",
    brokerConnected: true,
    joinDate: "Jan 2024",
    topTickers: [
      { ticker: "NVDA", sentiment: "bullish", count: 47 },
      { ticker: "TSLA", sentiment: "neutral", count: 31 },
      { ticker: "AMD", sentiment: "bullish", count: 28 },
      { ticker: "AAPL", sentiment: "bullish", count: 22 },
    ],
  },
  humbledtrader: {
    name: "Humbled Trader",
    handle: "@humbledtrader",
    avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/humbled_trader.jpg",
    banner: "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=1200&q=80",
    bio: "Real trades. Real losses. No BS education. Day trading stocks & options. Transparency is everything.",
    xp: 14600,
    assets: ["Stocks", "Options"],
    style: "Day Trader",
    experience: "7+ Years",
    followers: 52100,
    following: 34,
    totalTrades: 4210,
    winRate: 64,
    avgRR: 2.1,
    bestTrade: "TSLA",
    bestTradeReturn: "+$8,400",
    brokerConnected: true,
    joinDate: "Feb 2024",
    topTickers: [
      { ticker: "TSLA", sentiment: "neutral", count: 89 },
      { ticker: "SPY", sentiment: "bearish", count: 54 },
      { ticker: "NVDA", sentiment: "bullish", count: 41 },
      { ticker: "QQQ", sentiment: "neutral", count: 33 },
    ],
  },
};

// Default profile for unknown handles
const DEFAULT_PROFILE = MOCK_PROFILES.minervini;

// ─── Asset Badge ──────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, { color: string; bg: string }> = {
  Stocks: { color: "#00AEEF", bg: "#E6F7FD" },
  Options: { color: "#7B2FBE", bg: "#F3E8FF" },
  Futures: { color: "#E8193C", bg: "#FEE8EC" },
  Forex: { color: "#F79009", bg: "#FEF3E2" },
  Crypto: { color: "#4DC820", bg: "#EDFBE6" },
  ETFs: { color: "#667085", bg: "#F2F4F7" },
  Bonds: { color: "#344054", bg: "#F9FAFB" },
};

const STYLE_COLORS: Record<string, { color: string; bg: string }> = {
  "Day Trader": { color: "#E8193C", bg: "#FEE8EC" },
  "Scalper": { color: "#E8193C", bg: "#FEE8EC" },
  "Swing Trader": { color: "#00AEEF", bg: "#E6F7FD" },
  "Investor": { color: "#4DC820", bg: "#EDFBE6" },
  "Income Trader": { color: "#F79009", bg: "#FEF3E2" },
  "Options Strategist": { color: "#7B2FBE", bg: "#F3E8FF" },
  "Algo / Quant": { color: "#667085", bg: "#F2F4F7" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl font-black" style={{ color: color || "var(--foreground)", fontFamily: "Sora, sans-serif" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
    </div>
  );
}

// ─── XP Bar ───────────────────────────────────────────────────────────────────

function XPBar({ xp }: { xp: number }) {
  const level = getLevel(xp);
  const progress = getXPProgress(xp);
  const nextLevel = XP_LEVELS.find(l => l.level === level.level + 1);

  return (
    <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{level.emoji}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{level.name}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{xp.toLocaleString()} XP</p>
          </div>
        </div>
        {nextLevel && (
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Next: {nextLevel.name}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {(nextLevel.minXP - xp).toLocaleString()} XP to go
            </p>
          </div>
        )}
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${level.color}, ${level.color}cc)` }}
        />
      </div>
      <p className="text-xs mt-1 text-right" style={{ color: "var(--muted-foreground)" }}>{progress}%</p>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

export default function TraderProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle || "minervini";
  const [profile, setProfile] = useState<TraderProfile>(MOCK_PROFILES[handle.toLowerCase()] || DEFAULT_PROFILE);
  const level = getLevel(profile.xp);

  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "trades" | "stats" | "badges" | "watchlist">("posts");
  const { isAuthenticated } = useAuth();
  const { watchlist: localWatchlist, toggleWatch, isWatched } = useWatchlist();
  const [watchlistInput, setWatchlistInput] = useState("");

  // Sync watchlist to server
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => toast.success("Added to watchlist"),
    onError: () => toast.error("Failed to add ticker"),
  });
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => toast.success("Removed from watchlist"),
    onError: () => toast.error("Failed to remove ticker"),
  });

  const handleAddTicker = () => {
    const sym = watchlistInput.trim().toUpperCase();
    if (!sym) return;
    if (localWatchlist.includes(sym)) {
      toast.info(`${sym} is already in your watchlist`);
      return;
    }
    toggleWatch(sym);
    if (isAuthenticated) addMutation.mutate({ symbol: sym });
    setWatchlistInput("");
  };

  const handleRemoveTicker = (sym: string) => {
    toggleWatch(sym);
    if (isAuthenticated) removeMutation.mutate({ symbol: sym });
  };

  // Fetch real profile from API — use fetchMyProfile for "me" handle
  useEffect(() => {
    const isMeHandle = handle === "me";
    const applyData = (data: any, isMe: boolean) => {
      if (!data || data.detail) return;
      setProfile(prev => ({
        ...prev,
        name: data.display_name || data.name || prev.name,
        handle: `@${data.handle || (isMe ? "me" : handle)}`,
        avatar: data.avatar_url || prev.avatar,
        style: data.trading_style || prev.style,
        xp: data.xp || 0,
        followers: data.follower_count || 0,
        following: data.following_count || 0,
        totalTrades: data.total_trades || 0,
        winRate: data.win_rate || 0,
        bio: data.bio || prev.bio,
      }));
      if (!isMe) setIsFollowing(data.is_following || false);
    };
    if (isMeHandle) {
      import("@/lib/api").then(({ fetchMyProfile }) => {
        fetchMyProfile().then(data => applyData(data, true)).catch(() => {});
      });
    } else {
      import("@/lib/api").then(({ fetchTraderProfile }) => {
        fetchTraderProfile(handle).then(data => applyData(data, false)).catch(() => {});
      });
    }
  }, [handle]);

  const isMeProfile = handle === "me";

  const PROFILE_TABS = [
    { id: "posts" as const, label: "Posts" },
    { id: "trades" as const, label: "Trade Ideas" },
    { id: "stats" as const, label: "Stats" },
    { id: "badges" as const, label: "Badges" },
    ...(isMeProfile ? [{ id: "watchlist" as const, label: "Watchlist" }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />

      {/* Hero banner */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        <img
          src={profile.banner}
          alt="Profile banner"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))" }}
        />
      </div>

      {/* Profile header */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          {/* Avatar */}
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-28 h-28 rounded-full object-cover border-4"
              style={{ borderColor: "var(--background)" }}
            />
            {/* Level badge */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
              style={{ background: level.color, borderColor: "var(--background)" }}
            >
              {level.emoji}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => toast.success("Link copied!")}
              className="p-2 rounded-xl border"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setIsFollowing(f => !f)}
              className="px-5 py-2 rounded-xl font-bold text-sm transition-all"
              style={{
                background: isFollowing ? "var(--muted)" : "linear-gradient(135deg, #4DC820, #C8D400)",
                color: isFollowing ? "var(--foreground)" : "#101828",
                border: isFollowing ? "1px solid var(--border)" : "none",
              }}
            >
              {isFollowing ? "Following ✓" : "Follow"}
            </button>
          </div>
        </div>

        {/* Name + handle */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
              {profile.name}
            </h1>
            {profile.brokerConnected && (
              <span
                className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#EDFBE6", color: "#1A5C0A" }}
              >
                <CheckCircle size={11} /> Verified P&L
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{profile.handle}</p>
        </div>

        {/* Bio */}
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--foreground)" }}>{profile.bio}</p>

        {/* Identity badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Style badge */}
          {profile.style && STYLE_COLORS[profile.style] && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: STYLE_COLORS[profile.style].bg, color: STYLE_COLORS[profile.style].color }}
            >
              {profile.style}
            </span>
          )}
          {/* Asset badges */}
          {profile.assets.map(asset => (
            <span
              key={asset}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: ASSET_COLORS[asset]?.bg || "#F2F4F7", color: ASSET_COLORS[asset]?.color || "#667085" }}
            >
              {asset}
            </span>
          ))}
          {/* Experience badge */}
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {profile.experience}
          </span>
          {/* Level badge */}
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: level.color + "22", color: level.color }}
          >
            {level.emoji} {level.name}
          </span>
        </div>

        {/* Follower stats */}
        <div className="flex items-center gap-5 mb-5">
          <button className="text-sm" style={{ color: "var(--foreground)" }}>
            <span className="font-black">{profile.followers.toLocaleString()}</span>{" "}
            <span style={{ color: "var(--muted-foreground)" }}>followers</span>
          </button>
          <button className="text-sm" style={{ color: "var(--foreground)" }}>
            <span className="font-black">{profile.following}</span>{" "}
            <span style={{ color: "var(--muted-foreground)" }}>following</span>
          </button>
          <span className="flex items-center gap-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <Calendar size={13} /> Joined {profile.joinDate}
          </span>
        </div>

        {/* XP bar */}
        <div className="mb-5">
          <XPBar xp={profile.xp} />
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-5" style={{ borderColor: "var(--border)" }}>
          {PROFILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 text-sm font-semibold border-b-2 transition-all"
              style={{
                borderColor: activeTab === tab.id ? "#4DC820" : "transparent",
                color: activeTab === tab.id ? "#4DC820" : "var(--muted-foreground)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "posts" && (
          <div className="flex flex-col gap-4 pb-16">
            {/* Sample post cards */}
            {[
              {
                type: "Trade Idea",
                typeColor: "#00AEEF",
                typeBg: "#E6F7FD",
                ticker: "NVDA",
                sentiment: "bullish",
                sentimentColor: "#4DC820",
                sentimentBg: "#EDFBE6",
                text: "NVDA forming a textbook VCP on the weekly. Volume contraction is tight. Watching for a high-tight flag breakout above $890 on volume 2x average.",
                time: "2h ago",
                likes: 284,
                comments: 47,
              },
              {
                type: "Market Take",
                typeColor: "#7B2FBE",
                typeBg: "#F3E8FF",
                ticker: "SPY",
                sentiment: "bearish",
                sentimentColor: "#E8193C",
                sentimentBg: "#FEE8EC",
                text: "Tariff headlines are back. Market structure is broken on the daily. Until we reclaim 520 on SPY with conviction, I'm playing defense.",
                time: "1d ago",
                likes: 341,
                comments: 72,
              },
            ].map((post, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border"
                style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: `3px solid ${post.sentimentColor}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: post.typeBg, color: post.typeColor }}>
                    {post.type}
                  </span>
                  <TickerLogo symbol={post.ticker} size={20} />
                  <span className="font-black text-sm" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
                    {post.ticker}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: post.sentimentBg, color: post.sentimentColor }}>
                    {post.sentiment === "bullish" ? "↑ Bullish" : post.sentiment === "bearish" ? "↓ Bearish" : "→ Neutral"}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>{post.time}</span>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--foreground)" }}>{post.text}</p>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    ♥ {post.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    💬 {post.comments}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "trades" && (
          <div className="flex flex-col gap-3 pb-16">
            {profile.topTickers.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <TickerLogo symbol={t.ticker} size={28} />
                <span className="font-black text-base" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
                  {t.ticker}
                </span>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: t.sentiment === "bullish" ? "#EDFBE6" : t.sentiment === "bearish" ? "#FEE8EC" : "#FEF3E2",
                    color: t.sentiment === "bullish" ? "#1A5C0A" : t.sentiment === "bearish" ? "#9B0C1E" : "#92400E",
                  }}
                >
                  {t.sentiment === "bullish" ? "↑ Bullish" : t.sentiment === "bearish" ? "↓ Bearish" : "→ Neutral"}
                </span>
                <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>{t.count} posts</span>
                <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
              </div>
            ))}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="pb-16">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Win Rate" value={`${profile.winRate}%`} sub="All-time" color="#4DC820" />
              <StatCard label="Avg R:R" value={`${profile.avgRR}:1`} sub="Risk/reward ratio" color="#00AEEF" />
              <StatCard label="Total Trades" value={profile.totalTrades.toLocaleString()} sub="Verified via broker" />
              <StatCard label="Best Trade" value={profile.bestTrade} sub={profile.bestTradeReturn} color="#F79009" />
            </div>

            {/* Kai's take on this trader */}
            <div
              className="p-4 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #E6F7FD, #F3E8FF)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: "#00AEEF", color: "#fff" }}
                >
                  K
                </div>
                <span className="text-xs font-bold" style={{ color: "#00AEEF" }}>Kai's Analysis</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#1D2939" }}>
                {profile.name} shows strong consistency in momentum setups with a {profile.winRate}% win rate across {profile.totalTrades.toLocaleString()} verified trades.
                Their average R:R of {profile.avgRR}:1 suggests disciplined risk management. Most active in {profile.assets[0]} with a bias toward{" "}
                {profile.topTickers[0]?.sentiment === "bullish" ? "long setups" : "short setups"} on {profile.topTickers[0]?.ticker}.
              </p>
            </div>
          </div>
        )}

        {activeTab === "badges" && (
          <div className="pb-16">
            <div className="grid grid-cols-2 gap-3">
              {BADGE_DEFS.map(badge => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="p-4 rounded-2xl border flex flex-col items-center text-center gap-2 relative overflow-hidden"
                    style={{
                      background: badge.earned ? "var(--card)" : "var(--muted)",
                      borderColor: badge.earned ? badge.color + "44" : "var(--border)",
                      opacity: badge.earned ? 1 : 0.6,
                    }}
                  >
                    {!badge.earned && (
                      <Lock size={12} className="absolute top-2 right-2" style={{ color: "var(--muted-foreground)" }} />
                    )}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: badge.earned ? badge.color + "22" : "var(--border)" }}
                    >
                      <Icon size={22} color={badge.earned ? badge.color : "var(--muted-foreground)"} />
                    </div>
                    <p className="font-bold text-xs" style={{ color: "var(--foreground)" }}>{badge.label}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{badge.desc}</p>
                    {badge.earned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: badge.color, color: "#fff" }}>
                        Earned
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Watchlist Tab — only visible on own profile (/traders/me) */}
        {activeTab === "watchlist" && (
          <div className="pb-16">
            <div className="mb-4">
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--foreground)" }}>My Watchlist</h2>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Tickers you follow power your "For You" feed on the Home page.</p>
            </div>

            {/* Add ticker input */}
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={watchlistInput}
                onChange={e => setWatchlistInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleAddTicker()}
                placeholder="Add ticker (e.g. NVDA)"
                maxLength={10}
                className="flex-1 px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#4DC820]"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={handleAddTicker}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Watchlist grid */}
            {localWatchlist.length === 0 ? (
              <div className="text-center py-12">
                <Eye size={32} className="mx-auto mb-3 opacity-30" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>Your watchlist is empty</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Add tickers above to personalize your For You feed</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {localWatchlist.map(sym => (
                  <div
                    key={sym}
                    className="flex items-center gap-3 p-3 rounded-xl border group"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <TickerLogo symbol={sym} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
                        {sym}
                      </p>
                      <Link href={`/tickers/${sym}`}>
                        <span className="text-[10px] font-semibold" style={{ color: "#4DC820" }}>View →</span>
                      </Link>
                    </div>
                    <button
                      onClick={() => handleRemoveTicker(sym)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full"
                      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <KaiChat />
    </div>
  );
}

