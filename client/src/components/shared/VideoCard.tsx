// CheatCode OS — VideoCard v2
// Brand: CC Green for bullish scores, CC Red for critical badges, CC Yellow for watch

import { Link } from "wouter";
import { Play, Headphones, Clock, TrendingUp } from "lucide-react";
import { ScoreRing } from "./ScoreRing";

interface VideoCardProps {
  id: string;
  type: "video" | "podcast";
  title: string;
  creator: { name: string; avatar: string; color: string };
  thumbnail: string;
  duration: string;
  quickTake: string;
  tags: string[];
  relevanceBadge: string;
  tickers: string[];
  convergenceScore: number;
  publishedAt: string;
  compact?: boolean;
}

const badgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  "Critical":      { bg: "#FFF0F3", text: "#A8001F", border: "#F8A3B1" },
  "High Relevance":{ bg: "#F0FDE8", text: "#2E7A10", border: "#B6F08A" },
  "Watch":         { bg: "#FAFDE8", text: "#7A6800", border: "#E8F08A" },
};

export function VideoCard({
  id, type, title, creator, thumbnail, duration,
  quickTake, tags, relevanceBadge, tickers, convergenceScore, publishedAt, compact = false
}: VideoCardProps) {
  const href = type === "video" ? `/video/${id}` : `/podcast/${id}`;
  const badge = badgeStyles[relevanceBadge] || badgeStyles["Watch"];
  const scoreColor = convergenceScore >= 80 ? "#4DC820" : convergenceScore >= 60 ? "#C8D400" : "#E8193C";

  return (
    <Link href={href}>
      <div className={`content-card bg-white rounded-xl border border-[#EAECF0] overflow-hidden cursor-pointer group ${compact ? "w-56" : "w-72"} flex-shrink-0`}>
        {/* Thumbnail */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
            {type === "video" ? <Play size={10} fill="white" /> : <Headphones size={10} />}
            {duration}
          </div>
          <div className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
               style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}>
            {relevanceBadge}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Creator row */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                 style={{ backgroundColor: creator.color }}>
              {creator.avatar}
            </div>
            <span className="text-xs text-[#667085] font-medium truncate">{creator.name}</span>
            <span className="text-xs text-[#98A2B3] ml-auto flex-shrink-0 flex items-center gap-1">
              <Clock size={10} />
              {publishedAt}
            </span>
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-[#101828] leading-snug mb-2 line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}
              style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h3>

          {/* Quick take */}
          {!compact && (
            <p className="text-xs text-[#667085] leading-relaxed line-clamp-2 mb-3">
              {quickTake}
            </p>
          )}

          {/* Footer: tickers + score */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {tickers.slice(0, 3).map(t => (
                <span key={t} className="ticker-mono text-[10px] bg-[#F9FAFB] border border-[#EAECF0] px-1.5 py-0.5 rounded text-[#475467]">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp size={10} style={{ color: scoreColor }} />
              <span className="score-number text-xs" style={{ color: scoreColor }}>
                {convergenceScore}
              </span>
            </div>
          </div>

          {/* Tags */}
          {!compact && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="text-[10px] text-[#667085] bg-[#F9FAFB] px-2 py-0.5 rounded-full border border-[#EAECF0]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
