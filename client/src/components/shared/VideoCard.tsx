// CheatCode OS — VideoCard v3: YouTube x Netflix
// Design: Thumbnail fills the card. Text lives BELOW (YouTube) or overlays on hover (Netflix).
// - No border boxes around text
// - Creator avatar + name below thumbnail (YouTube style)
// - Title is 2 lines max, no description visible by default
// - Score ring overlays bottom-right of thumbnail
// - Relevance badge overlays top-left
// - Duration overlays bottom-left
// - On hover: card lifts, thumbnail scales slightly, a "quick take" preview fades in

import { Link } from "wouter";
import { Play, Headphones } from "lucide-react";

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
  wide?: boolean;
}

const badgeStyles: Record<string, { bg: string; text: string }> = {
  "Critical":       { bg: "rgba(232,25,60,0.85)",  text: "#fff" },
  "High Relevance": { bg: "rgba(77,200,32,0.85)",   text: "#101828" },
  "Watch":          { bg: "rgba(200,212,0,0.85)",   text: "#101828" },
};

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? "#4DC820" : score >= 60 ? "#C8D400" : "#E8193C";
  const r = 14, stroke = 2.5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg width={36} height={36} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={18} cy={18} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} fill="none" />
        <circle cx={18} cy={18} r={r} stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" fill="none" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
            style={{ fontFamily: "var(--font-mono)" }}>
        {score}
      </span>
    </div>
  );
}

export function VideoCard({
  id, type, title, creator, thumbnail, duration,
  quickTake, relevanceBadge, tickers, convergenceScore, publishedAt, compact = false, wide = false
}: VideoCardProps) {
  const href = type === "video" ? `/video/${id}` : `/podcast/${id}`;
  const badge = badgeStyles[relevanceBadge] || badgeStyles["Watch"];
  const cardWidth = wide ? "w-80" : compact ? "w-44" : "w-64";

  return (
    <Link href={href}>
      <div className={`group cursor-pointer ${cardWidth} flex-shrink-0`}
           style={{ transition: "transform 0.2s ease" }}
           onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"}
           onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"}>

        {/* Thumbnail — the hero */}
        <div className="relative overflow-hidden rounded-xl bg-[#1a2035]"
             style={{ aspectRatio: wide ? "16/9" : "16/10" }}>
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Dark gradient overlay — always present at bottom */}
          <div className="absolute inset-0"
               style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />

          {/* Relevance badge — top left */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: badge.bg, color: badge.text }}>
              {relevanceBadge}
            </span>
          </div>

          {/* Duration — bottom left */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              {type === "video" ? <Play size={8} fill="white" /> : <Headphones size={8} />}
              {duration}
            </span>
          </div>

          {/* Score ring — bottom right */}
          <div className="absolute bottom-1.5 right-2">
            <ScoreCircle score={convergenceScore} />
          </div>

          {/* Hover overlay: quick take preview */}
          {!compact && (
            <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                 style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
              <p className="text-[11px] text-white/80 leading-relaxed line-clamp-3 mb-2">
                {quickTake}
              </p>
              <div className="flex gap-1 flex-wrap">
                {tickers.slice(0, 3).map(t => (
                  <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(77,200,32,0.25)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.4)", fontFamily: "var(--font-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Below-thumbnail info — YouTube style */}
        <div className="flex gap-2 mt-2.5 px-0.5">
          {/* Creator avatar */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
               style={{ backgroundColor: creator.color }}>
            {creator.avatar}
          </div>
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`font-semibold text-[#101828] leading-snug line-clamp-2 ${compact ? "text-[11px]" : "text-[13px]"}`}
                style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h3>
            {/* Creator + time */}
            <p className="text-[11px] text-[#98A2B3] mt-0.5 truncate">
              {creator.name} · {publishedAt}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
