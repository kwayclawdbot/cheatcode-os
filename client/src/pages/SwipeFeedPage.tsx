// CheatCode OS — Swipe Feed Page
// Design: TikTok/Tinder-style horizontal card swipe. Video-first.
// Card types: video (dark overlay), trade_idea (graphic card)
// Swipe right = 🔥 like + XP, swipe left = pass
// Toggle: All / Videos / Ideas
// Fully theme-aware via semantic Tailwind tokens + useTheme for inline styles

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Play, Zap, X, Heart,
  ChevronLeft, ChevronRight, Plus, BarChart2,
  MessageCircle, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { fetchContent, fetchRadar } from "@/lib/api";
import { getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";
import { Nav } from "@/components/layout/Nav";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = "video" | "trade_idea";
type SwipeFilter = "all" | "videos" | "trade_ideas";

interface SwipeCard {
  id: string;
  type: CardType;
  title?: string;
  thumbnail?: string;
  duration?: string;
  creator?: string;
  creatorAvatar?: string;
  creatorColor?: string;
  youtubeId?: string;
  ticker?: string;
  direction?: "bullish" | "bearish" | "neutral";
  score?: number;
  thesis?: string;
  entry?: string;
  target?: string;
  stop?: string;
  timeframe?: string;
  poster?: string;
  posterHandle?: string;
  posterStyle?: string;
  posterLevel?: string;
  likes: number;
  comments: number;
  xpValue: number;
}

// ─── Data converters ──────────────────────────────────────────────────────────

function radarToCard(t: any, index: number): SwipeCard {
  const dir = (t.direction || "neutral").toLowerCase() as "bullish" | "bearish" | "neutral";
  const handles = ["@jdtrader", "@swingking", "@optionsflow", "@alphatrader", "@chartmaster"];
  const styles = ["Swing Trader", "Day Trader", "Options", "Swing Trader", "Technical"];
  const levels = ["Expert", "Veteran", "Trader", "Elite", "Expert"];
  const theses = [
    "Breaking out of consolidation with strong volume. Target is the prior high.",
    "Momentum setup with institutional accumulation. Risk/reward looks favorable here.",
    "Catalyst-driven move. Options flow has been unusually bullish this week.",
    "Technical breakout confirmed. Multiple timeframe alignment.",
    "High conviction setup. Macro tailwinds + strong relative strength.",
  ];
  return {
    id: `radar-${t.symbol}-${index}`,
    type: "trade_idea",
    ticker: t.symbol,
    direction: dir,
    score: t.score,
    thesis: theses[index % theses.length],
    timeframe: t.timeframe || "Swing",
    poster: ["Jordan Davis", "Alex Kim", "Sam Rivera", "Chris Lee", "Taylor Morgan"][index % 5],
    posterHandle: handles[index % handles.length],
    posterStyle: styles[index % styles.length],
    posterLevel: levels[index % levels.length],
    likes: Math.floor(Math.random() * 200) + 20,
    comments: Math.floor(Math.random() * 40) + 5,
    xpValue: Math.floor(t.score / 10) * 5 + 10,
  };
}

function videoToCard(v: any): SwipeCard {
  const slug = (v.creator_slug || v.creator || "").toLowerCase().replace(/\s+/g, "_");
  return {
    id: `video-${v.id}`,
    type: "video",
    title: v.title,
    thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`,
    duration: v.duration,
    creator: v.creator,
    creatorAvatar: getCreatorAvatar(slug) || "",
    creatorColor: getCreatorColor(slug),
    youtubeId: v.youtube_id,
    poster: v.creator,
    posterHandle: `@${slug}`,
    posterStyle: "Educator",
    posterLevel: "Verified",
    likes: v.likes || Math.floor(Math.random() * 500) + 50,
    comments: v.comments || Math.floor(Math.random() * 80) + 10,
    xpValue: 15,
  };
}

// ─── Direction config ─────────────────────────────────────────────────────────

const DIR_CONFIG = {
  bullish: { color: "#4DC820", icon: TrendingUp, label: "Bullish", arrow: "↑" },
  bearish: { color: "#E8193C", icon: TrendingDown, label: "Bearish", arrow: "↓" },
  neutral: { color: "#F79009", icon: Minus, label: "Neutral", arrow: "→" },
};

// ─── Single Swipe Card ────────────────────────────────────────────────────────

interface SwipeCardProps {
  card: SwipeCard;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  stackIndex: number;
  isDark: boolean;
}

function SwipeCardView({ card, onSwipeRight, onSwipeLeft, isTop, stackIndex, isDark }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);
  const [playing, setPlaying] = useState(false);

  const dir = card.direction ? DIR_CONFIG[card.direction] : null;
  const isVideo = card.type === "video";

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onSwipeRight();
    else if (info.offset.x < -100) onSwipeLeft();
  };

  const stackOffset = stackIndex * 6;
  const stackRotate = stackIndex * 2;

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `translateY(${stackOffset}px) scale(${1 - stackIndex * 0.04}) rotate(${stackRotate}deg)`,
          zIndex: 10 - stackIndex,
          background: isVideo ? "#1a2035" : (isDark ? "#212840" : "#FFFFFF"),
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ x, rotate, zIndex: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Overlays */}
      <motion.div
        className="absolute top-8 left-6 z-30 px-4 py-2 rounded-xl border-2 border-[#4DC820] rotate-[-12deg]"
        style={{ opacity: likeOpacity, background: "#F0FDE8" }}
      >
        <span className="text-[#4DC820] font-black text-lg tracking-wider">🔥 LIKE</span>
      </motion.div>
      <motion.div
        className="absolute top-8 right-6 z-30 px-4 py-2 rounded-xl border-2 border-[#E8193C] rotate-[12deg]"
        style={{ opacity: passOpacity, background: "#FFF0F3" }}
      >
        <span className="text-[#E8193C] font-black text-lg tracking-wider">PASS 👎</span>
      </motion.div>

      {/* ── Video Card ── */}
      {isVideo && (
        <div className="w-full h-full relative" style={{ background: "#101828" }}>
          {card.thumbnail && !playing && (
            <img src={card.thumbnail} alt={card.title}
                 className="absolute inset-0 w-full h-full object-cover opacity-70" />
          )}
          {playing && card.youtubeId && (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${card.youtubeId}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          )}
          {!playing && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          )}
          {!playing && (
            <button
              onClick={e => { e.stopPropagation(); setPlaying(true); }}
              className="absolute inset-0 flex items-center justify-center z-10 group"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={28} className="text-white ml-1" />
              </div>
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
                {card.creatorAvatar ? (
                  <img src={card.creatorAvatar} alt={card.creator} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                       style={{ background: card.creatorColor || "#4DC820" }}>
                    {(card.creator || "?")[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">{card.creator}</p>
                <p className="text-white/60 text-xs">Educator · Verified</p>
              </div>
            </div>
            <h3 className="text-white font-bold text-base leading-snug mb-3 line-clamp-2"
                style={{ fontFamily: "var(--font-display)" }}>
              {card.title}
            </h3>
            <div className="flex items-center gap-3 text-white/70 text-xs">
              <span className="flex items-center gap-1"><Heart size={12} /> {card.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {card.comments}</span>
              {card.duration && <span className="flex items-center gap-1"><Play size={11} /> {card.duration}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Trade Idea Card ── */}
      {!isVideo && dir && (
        <div className="w-full h-full flex flex-col"
             style={{ background: isDark ? "#212840" : "#FFFFFF" }}>
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${dir.color}, ${dir.color}66)` }} />
          <div className="flex-1 p-5 flex flex-col">
            {/* Poster */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                   style={{ background: dir.color }}>
                {(card.poster || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight"
                   style={{ color: isDark ? "#F2F4F7" : "#101828" }}>{card.poster}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: dir.color }}>
                    {card.posterStyle}
                  </span>
                  <span className="text-[10px]" style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                    {card.posterLevel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#F79009]">
                <Zap size={12} />
                <span className="text-xs font-bold">+{card.xpValue} XP</span>
              </div>
            </div>

            {/* Ticker hero */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
                   style={{ background: `${dir.color}15`, border: `2px solid ${dir.color}40` }}>
                <span className="ticker-mono text-2xl font-black" style={{ color: dir.color }}>
                  {card.ticker}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-black" style={{ color: dir.color, fontFamily: "var(--font-display)" }}>
                  {dir.arrow} {dir.label}
                </span>
              </div>
              {card.score != null && (
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="h-2 w-24 rounded-full overflow-hidden"
                       style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#F2F4F7" }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${card.score}%`, background: dir.color }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                    {card.score}/100
                  </span>
                </div>
              )}
              {card.thesis && (
                <p className="text-sm text-center leading-relaxed max-w-xs px-2"
                   style={{ color: isDark ? "#D0D5DD" : "#344054" }}>
                  {card.thesis}
                </p>
              )}
            </div>

            {/* Key levels */}
            {(card.entry || card.target || card.stop) && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Entry", value: card.entry, color: isDark ? "#98A2B3" : "#667085" },
                  { label: "Target", value: card.target, color: "#4DC820" },
                  { label: "Stop", value: card.stop, color: "#E8193C" },
                ].filter(k => k.value).map(k => (
                  <div key={k.label}
                       className="rounded-xl p-2.5 text-center border"
                       style={{
                         background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB",
                         borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0",
                       }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: k.color }}>{k.label}</p>
                    <p className="ticker-mono text-sm font-bold" style={{ color: isDark ? "#F2F4F7" : "#101828" }}>{k.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center justify-between pt-3 border-t"
                 style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}>
              <div className="flex items-center gap-3 text-xs"
                   style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                <span className="flex items-center gap-1"><Heart size={12} /> {card.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {card.comments}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                <span className="text-[10px]">{card.timeframe}</span>
                <BarChart2 size={12} />
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── XP Toast ─────────────────────────────────────────────────────────────────

function showXPToast(xp: number, label?: string) {
  toast.custom(() => (
    <div className="flex items-center gap-3 bg-[#101828] text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10">
      <div className="w-8 h-8 rounded-full cc-gradient-bg flex items-center justify-center flex-shrink-0">
        <Zap size={14} className="text-[#101828]" />
      </div>
      <div>
        <p className="font-bold text-sm">+{xp} XP earned!</p>
        {label && <p className="text-xs text-white/60">You liked {label}</p>}
      </div>
    </div>
  ), { duration: 2000 });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SwipeFeedPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filter, setFilter] = useState<SwipeFilter>("all");
  const [allCards, setAllCards] = useState<SwipeCard[]>([]);
  const [queue, setQueue] = useState<SwipeCard[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRadar().catch(() => ({ critical: [], high_conviction: [], watch: [] })),
      fetchContent({ page: 1 }).catch(() => [] as any[]),
    ]).then(([radar, content]) => {
      const radarCards: SwipeCard[] = [
        ...(radar.critical || []),
        ...(radar.high_conviction || []),
        ...(radar.watch || []),
      ].slice(0, 10).map((t: any, i: number) => radarToCard(t, i));

      const videoCards: SwipeCard[] = (Array.isArray(content) ? content : [])
        .filter((v: any) => v.youtube_id || v.thumbnail_url)
        .slice(0, 15)
        .map((v: any) => videoToCard(v));

      const interleaved: SwipeCard[] = [];
      const maxLen = Math.max(radarCards.length, videoCards.length);
      for (let i = 0; i < maxLen; i++) {
        if (videoCards[i]) interleaved.push(videoCards[i]);
        if (radarCards[i]) interleaved.push(radarCards[i]);
      }
      setAllCards(interleaved);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const filtered = allCards.filter(c => {
      if (filter === "videos") return c.type === "video";
      if (filter === "trade_ideas") return c.type === "trade_idea";
      return true;
    });
    setQueue([...filtered].reverse());
  }, [allCards, filter]);

  const currentCard = queue[queue.length - 1];
  const nextCard = queue[queue.length - 2];
  const thirdCard = queue[queue.length - 3];

  const handleSwipeRight = () => {
    if (!currentCard) return;
    setTotalXP(prev => prev + currentCard.xpValue);
    setSwipeCount(prev => prev + 1);
    showXPToast(currentCard.xpValue, currentCard.ticker || currentCard.creator);
    setQueue(prev => prev.slice(0, -1));
  };

  const handleSwipeLeft = () => {
    if (!currentCard) return;
    setSwipeCount(prev => prev + 1);
    setQueue(prev => prev.slice(0, -1));
  };

  const handleReload = () => {
    const filtered = allCards.filter(c => {
      if (filter === "videos") return c.type === "video";
      if (filter === "trade_ideas") return c.type === "trade_idea";
      return true;
    });
    setQueue([...filtered].reverse());
    setSwipeCount(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />

      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-black text-foreground text-base" style={{ fontFamily: "var(--font-display)" }}>
              Swipe Feed
            </h1>
            <p className="text-xs text-muted-foreground">
              {queue.length} cards left · <span className="text-[#F79009] font-bold">{totalXP} XP earned</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <div className="flex rounded-xl p-1 gap-0.5 bg-muted">
              {([
                { id: "all",         label: "All" },
                { id: "videos",      label: "Videos" },
                { id: "trade_ideas", label: "Ideas" },
              ] as { id: SwipeFilter; label: string }[]).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: filter === f.id ? (isDark ? "#2B3245" : "#FFFFFF") : "transparent",
                    color: filter === f.id ? (isDark ? "#F2F4F7" : "#101828") : "var(--muted-foreground)",
                    boxShadow: filter === f.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="w-8 h-8 rounded-xl cc-gradient-bg flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Plus size={15} className="text-[#101828]" />
            </button>
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading your feed…</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="font-black text-foreground text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                You're all caught up!
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                You earned <span className="font-bold text-[#F79009]">{totalXP} XP</span> from {swipeCount} swipes.
              </p>
              <button
                onClick={handleReload}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity"
              >
                <Zap size={13} /> See cards again
              </button>
            </div>
          ) : (
            <>
              <div className="relative" style={{ height: 520 }}>
                <AnimatePresence>
                  {thirdCard && (
                    <SwipeCardView key={thirdCard.id + "-3"} card={thirdCard} onSwipeRight={() => {}} onSwipeLeft={() => {}} isTop={false} stackIndex={2} isDark={isDark} />
                  )}
                  {nextCard && (
                    <SwipeCardView key={nextCard.id + "-2"} card={nextCard} onSwipeRight={() => {}} onSwipeLeft={() => {}} isTop={false} stackIndex={1} isDark={isDark} />
                  )}
                  {currentCard && (
                    <SwipeCardView key={currentCard.id} card={currentCard} onSwipeRight={handleSwipeRight} onSwipeLeft={handleSwipeLeft} isTop={true} stackIndex={0} isDark={isDark} />
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-8 mt-6">
                <button
                  onClick={handleSwipeLeft}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-95 border-2 border-[#E8193C] bg-card"
                >
                  <X size={22} className="text-[#E8193C]" />
                </button>
                <button
                  onClick={() => currentCard && toast.info("Bookmarked!", { duration: 1500 })}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-card border border-border hover:scale-110 transition-transform"
                >
                  <Bookmark size={16} className="text-muted-foreground" />
                </button>
                <button
                  onClick={handleSwipeRight}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-95 border-2 border-[#4DC820] bg-card"
                >
                  <Heart size={22} className="text-[#4DC820]" />
                </button>
              </div>

              {/* Hint */}
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ChevronLeft size={13} /> <span>Pass</span>
                </div>
                <p className="text-xs text-muted-foreground">Drag or tap buttons</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Like +XP</span> <ChevronRight size={13} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
            <motion.div
              className="relative w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl border border-border"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-black text-foreground text-base" style={{ fontFamily: "var(--font-display)" }}>
                  Post a Trade Idea
                </h3>
                <button onClick={() => setShowCompose(false)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 block">Ticker</label>
                  <input
                    type="text"
                    placeholder="PLTR, NVDA, TSLA…"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm font-bold ticker-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#4DC820] transition-colors bg-muted"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 block">Direction</label>
                  <div className="flex gap-2">
                    {[
                      { label: "↑ Bullish", color: "#4DC820", bg: "#F0FDE8" },
                      { label: "↓ Bearish", color: "#E8193C", bg: "#FFF0F3" },
                      { label: "→ Neutral", color: "#F79009", bg: "#FFFBEB" },
                    ].map(d => (
                      <button key={d.label}
                              className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
                              style={{ background: d.bg, color: d.color, borderColor: `${d.color}40` }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 block">Thesis</label>
                  <textarea
                    placeholder="Why are you taking this trade? Keep it short and clear…"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#4DC820] transition-colors bg-muted resize-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowCompose(false);
                    toast.success("Trade idea posted! +25 XP", { duration: 2500 });
                  }}
                  className="w-full py-3 rounded-xl cc-gradient-bg text-[#101828] font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Zap size={14} /> Post to Swipe Feed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
