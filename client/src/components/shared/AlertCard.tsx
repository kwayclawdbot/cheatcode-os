// AlertCard — The atomic unit of CheatCode OS
// Mobile-first. Live P&L bar. Kai score badge. Belt ring around avatar.
// Design: X meets Robinhood — clean, social, fast.

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, MessageCircle, Heart, Repeat2, Eye, Flame, Zap, Lightbulb, Snowflake, Star } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AlertCardData {
  id: string;
  user: {
    name: string;
    handle: string;
    avatar_url?: string;
    belt?: string;
    win_rate?: number;
    alert_count?: number;
    is_agent?: boolean;
  };
  post_type: string;
  ticker?: string;
  direction?: "long" | "short";
  timeframe?: string;
  entry_price?: string;
  target_price?: string;
  stop_price?: string;
  thesis?: string;
  body?: string;
  kai_score?: number;
  kai_rationale?: string;
  outcome?: "win" | "loss" | "expired" | null;
  current_price?: number;
  current_pnl_pct?: number;
  tracking_active?: boolean;
  r_multiple?: number;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
  created_at: string;
  user_liked?: boolean;
  image_url?: string;
}

// ── Belt Config ────────────────────────────────────────────────────────────

const BELT_COLORS: Record<string, string> = {
  white:  "#FFFFFF",
  yellow: "#FCD34D",
  orange: "#FB923C",
  green:  "#4ADE80",
  blue:   "#60A5FA",
  purple: "#A78BFA",
  brown:  "#92400E",
  black:  "#111827",
};

const BELT_LABELS: Record<string, string> = {
  white: "White Belt", yellow: "Yellow Belt", orange: "Orange Belt",
  green: "Green Belt", blue: "Blue Belt",    purple: "Purple Belt",
  brown: "Brown Belt", black: "Black Belt",
};

// ── Kai Score Badge ────────────────────────────────────────────────────────

const KAI_SCORE_CONFIG = {
  fire:     { min: 90, emoji: "🔥", color: "#EF4444", bg: "rgba(239,68,68,0.12)",  label: "Exceptional" },
  lightning:{ min: 75, emoji: "⚡", color: "#4ADE80", bg: "rgba(74,222,128,0.12)", label: "High Conviction" },
  bulb:     { min: 60, emoji: "💡", color: "#FCD34D", bg: "rgba(252,211,77,0.12)", label: "Solid Setup" },
  meh:      { min: 45, emoji: "😐", color: "#9CA3AF", bg: "rgba(156,163,175,0.1)", label: "Weak" },
  ice:      { min: 0,  emoji: "🧊", color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  label: "Against Grain" },
};

function getKaiConfig(score: number) {
  if (score >= 90) return KAI_SCORE_CONFIG.fire;
  if (score >= 75) return KAI_SCORE_CONFIG.lightning;
  if (score >= 60) return KAI_SCORE_CONFIG.bulb;
  if (score >= 45) return KAI_SCORE_CONFIG.meh;
  return KAI_SCORE_CONFIG.ice;
}

// ── Helper ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "now";
}

function parsePrice(val?: string | null): number | null {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[$,]/g, ""));
  return isFinite(n) ? n : null;
}

// ── Avatar with Belt Ring ──────────────────────────────────────────────────

function BeltAvatar({ user, size = 40 }: { user: AlertCardData["user"]; size?: number }) {
  const belt = user.belt || "white";
  const beltColor = BELT_COLORS[belt] || "#FFFFFF";
  const initials = (user.name || "?").slice(0, 2).toUpperCase();

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size + 4, height: size + 4 }}
      title={BELT_LABELS[belt]}
    >
      {/* Belt ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${beltColor} 0%, ${beltColor} 100%)`,
          padding: 2,
        }}
      />
      {/* Avatar */}
      <div
        className="absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
        style={{
          background: user.avatar_url ? "transparent" : `#${Math.abs(user.handle?.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0) || 0).toString(16).slice(0, 6).padStart(6, "3")}`,
          fontSize: size * 0.35,
        }}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}

// ── PnL Progress Bar ───────────────────────────────────────────────────────

function PnlBar({ entry, target, stop, current, direction }: {
  entry: number; target: number; stop: number; current: number; direction: "long" | "short";
}) {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return null;

  let progress = 0;
  let isGreen = false;

  if (direction === "short") {
    progress = (entry - current) / reward;
    isGreen = current < entry;
  } else {
    progress = (current - entry) / reward;
    isGreen = current > entry;
  }

  const pct = Math.max(-1, Math.min(1, progress));
  const barWidth = Math.abs(pct) * 100;
  const pnlPct = direction === "short"
    ? ((entry - current) / entry * 100)
    : ((current - entry) / entry * 100);

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/40 font-mono">Entry ${entry.toFixed(2)}</span>
        <span className={`text-[11px] font-bold font-mono ${isGreen ? "text-green-400" : "text-red-400"}`}>
          {isGreen ? "+" : ""}{pnlPct.toFixed(1)}%
          {current ? ` · $${current.toFixed(2)} now` : ""}
        </span>
        <span className="text-[10px] text-white/40 font-mono">TP ${target.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isGreen ? "bg-green-400" : "bg-red-400"}`}
          style={{ width: `${Math.max(2, barWidth)}%` }}
        />
      </div>
      {/* Stop line indicator */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-red-400/60 font-mono">SL ${stop.toFixed(2)}</span>
        <span className="text-[9px] text-white/30 font-mono tracking-tight">📍 Tracking live</span>
      </div>
    </div>
  );
}

// ── Main AlertCard ─────────────────────────────────────────────────────────

export default function AlertCard({
  post,
  onLike,
  onAskKai,
  compact = false,
}: {
  post: AlertCardData;
  onLike?: (postId: string) => void;
  onAskKai?: (postId: string) => void;
  compact?: boolean;
}) {
  const [liked, setLiked] = useState(post.user_liked || false);
  const [likes, setLikes] = useState(post.likes_count || 0);

  const isTradeAlert = ["trade_alert", "trade_idea"].includes(post.post_type);
  const entry = parsePrice(post.entry_price);
  const target = parsePrice(post.target_price);
  const stop = parsePrice(post.stop_price);
  const direction = (post.direction || "long") as "long" | "short";
  const isLong = direction === "long";

  const hasPrice = isTradeAlert && entry && target && stop;
  const hasOutcome = post.outcome && post.outcome !== null;
  const isTracking = post.tracking_active && !hasOutcome;

  const kaiConfig = post.kai_score != null ? getKaiConfig(post.kai_score) : null;

  function handleLike() {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    onLike?.(post.id);
  }

  return (
    <div className={`
      bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4
      hover:bg-white/[0.035] transition-colors
      ${hasOutcome === true && post.outcome === "win" ? "border-green-500/20" : ""}
      ${hasOutcome === true && post.outcome === "loss" ? "border-red-500/20" : ""}
    `}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Link href={`/traders/${post.user.handle}`}>
          <BeltAvatar user={post.user} size={38} />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Name + meta */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link href={`/traders/${post.user.handle}`}>
                <span className="text-[13px] font-bold text-white truncate hover:underline">
                  {post.user.is_agent ? "⚡ " : ""}{post.user.name}
                </span>
              </Link>
              {post.user.belt && post.user.belt !== "white" && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: BELT_COLORS[post.user.belt] + "22",
                    color: BELT_COLORS[post.user.belt],
                    border: `1px solid ${BELT_COLORS[post.user.belt]}44`,
                  }}
                >
                  {BELT_LABELS[post.user.belt]}
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/30 flex-shrink-0">{timeAgo(post.created_at)}</span>
          </div>

          {/* Stats row */}
          {(post.user.win_rate != null && (post.user.alert_count || 0) > 0) && (
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span className={post.user.win_rate >= 60 ? "text-green-400/70" : "text-white/40"}>
                {post.user.win_rate?.toFixed(1)}% WR
              </span>
              <span>·</span>
              <span>{post.user.alert_count} calls tracked</span>
            </div>
          )}
        </div>
      </div>

      {/* Trade Alert Body */}
      {isTradeAlert && post.ticker && (
        <div className="mt-3">
          {/* Ticker + direction */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[22px] font-black tracking-tight text-white">
              ${post.ticker}
            </span>
            <span
              className={`
                text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider
                ${isLong
                  ? "bg-green-500/15 text-green-400 border border-green-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                }
              `}
            >
              {isLong ? "▲ LONG" : "▼ SHORT"}
            </span>
            {post.timeframe && (
              <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {post.timeframe}
              </span>
            )}
            {/* Outcome badge */}
            {hasOutcome && (
              <span className={`
                text-[10px] font-black px-2 py-0.5 rounded-full ml-auto
                ${post.outcome === "win"
                  ? "bg-green-500/20 text-green-400"
                  : post.outcome === "loss"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-white/5 text-white/30"
                }
              `}>
                {post.outcome === "win" ? `✓ WIN${post.r_multiple ? ` +${post.r_multiple}R` : ""}` :
                 post.outcome === "loss" ? `✗ LOSS${post.r_multiple ? ` ${post.r_multiple}R` : ""}` :
                 "EXPIRED"}
              </span>
            )}
          </div>

          {/* Price levels */}
          {hasPrice && !compact && (
            <div className="flex items-center gap-3 mb-2">
              {[
                { label: "Entry", value: `$${entry!.toFixed(2)}`, color: "text-white/60" },
                { label: "Target", value: `$${target!.toFixed(2)}`, color: "text-green-400" },
                { label: "Stop", value: `$${stop!.toFixed(2)}`, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[9px] text-white/30 uppercase tracking-wide">{label}</span>
                  <span className={`text-[13px] font-bold font-mono ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Live P&L bar */}
          {hasPrice && isTracking && post.current_price && (
            <PnlBar
              entry={entry!}
              target={target!}
              stop={stop!}
              current={post.current_price}
              direction={direction}
            />
          )}
        </div>
      )}

      {/* Thesis / body text */}
      {(post.thesis || post.body) && !compact && (
        <p className="mt-2 text-[13px] text-white/75 leading-relaxed line-clamp-3">
          {post.thesis || post.body}
        </p>
      )}

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt="Chart"
          className="mt-2 w-full rounded-xl object-cover max-h-48"
        />
      )}

      {/* Footer: reactions + Kai score */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
        {/* Reactions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-[12px] transition-colors ${liked ? "text-red-400" : "text-white/40 hover:text-white/70"}`}
          >
            <Heart size={14} fill={liked ? "currentColor" : "none"} />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <Link href={`/community/post/${post.id}`}>
            <button className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
              <MessageCircle size={14} />
              {(post.comments_count || 0) > 0 && <span>{post.comments_count}</span>}
            </button>
          </Link>
          <button className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
            <Eye size={14} />
          </button>
        </div>

        {/* Kai Score + Ask Kai */}
        <div className="flex items-center gap-2">
          {kaiConfig && post.kai_score != null && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer transition-all hover:scale-105"
              style={{ background: kaiConfig.bg, border: `1px solid ${kaiConfig.color}33` }}
              onClick={() => onAskKai?.(post.id)}
              title={post.kai_rationale || kaiConfig.label}
            >
              <span className="text-[12px]">{kaiConfig.emoji}</span>
              <span className="text-[11px] font-black" style={{ color: kaiConfig.color }}>
                {post.kai_score}
              </span>
            </div>
          )}
          {isTradeAlert && (
            <button
              onClick={() => onAskKai?.(post.id)}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              Ask Kai →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
