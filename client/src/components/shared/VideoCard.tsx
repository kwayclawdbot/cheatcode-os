// CheatCode OS — VideoCard v4: Real avatars + creator links + YouTube playback
// Design: Thumbnail fills the card. Real creator avatar image below (YouTube style).
// Creator name links to /creators/:id. Card click goes to /video/:id with YouTube embed.

import { Link } from "wouter";
import { Play, Headphones } from "lucide-react";

interface VideoCardProps {
  id: string;
  type: "video" | "podcast";
  title: string;
  creator: { name: string; avatar: string; avatarUrl?: string; color: string };
  creatorId?: string;
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

function CreatorAvatar({ creator, size = 28 }: { creator: VideoCardProps["creator"]; size?: number }) {
  if (creator.avatarUrl) {
    return (
      <img
        src={creator.avatarUrl}
        alt={creator.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to initials on image error
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.style.backgroundColor = creator.color;
            parent.textContent = creator.avatar;
          }
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: creator.color, fontSize: size * 0.35 }}
    >
      {creator.avatar}
    </div>
  );
}

export function VideoCard({
  id, type, title, creator, creatorId, thumbnail, duration,
  quickTake, relevanceBadge, tickers, convergenceScore, publishedAt,
  compact = false, wide = false
}: VideoCardProps) {
  const videoHref = type === "video" ? `/video/${id}` : `/podcast/${id}`;
  const creatorHref = creatorId ? `/creators/${creatorId}` : null;
  const badge = badgeStyles[relevanceBadge] || badgeStyles["Watch"];
  const cardWidth = wide ? "w-80" : compact ? "w-44" : "w-64";

  return (
    <div className={`group cursor-pointer ${cardWidth} flex-shrink-0`}
         style={{ transition: "transform 0.2s ease" }}
         onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"}
         onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"}>

      {/* Thumbnail — links to video page */}
      <Link href={videoHref}>
        <div className="relative overflow-hidden rounded-xl bg-[#1a2035]"
             style={{ aspectRatio: wide ? "16/9" : "16/10" }}>
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80";
            }}
          />

          {/* Dark gradient overlay */}
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
      </Link>

      {/* Below-thumbnail info — YouTube style */}
      <div className="flex gap-2 mt-2.5 px-0.5">
        {/* Creator avatar — links to creator page */}
        {creatorHref ? (
          <Link href={creatorHref} onClick={e => e.stopPropagation()}>
            <div className="mt-0.5 flex-shrink-0">
              <CreatorAvatar creator={creator} size={28} />
            </div>
          </Link>
        ) : (
          <div className="mt-0.5 flex-shrink-0">
            <CreatorAvatar creator={creator} size={28} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title — links to video */}
          <Link href={videoHref}>
            <h3 className={`font-semibold text-foreground leading-snug line-clamp-2 hover:underline ${compact ? "text-[11px]" : "text-[13px]"}`}
                style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h3>
          </Link>
          {/* Creator name — links to creator page */}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {creatorHref ? (
              <Link href={creatorHref} onClick={e => e.stopPropagation()}
                    className="hover:underline hover:text-foreground transition-colors">
                {creator.name}
              </Link>
            ) : creator.name}
            {" · "}{publishedAt}
          </p>
        </div>
      </div>
    </div>
  );
}
