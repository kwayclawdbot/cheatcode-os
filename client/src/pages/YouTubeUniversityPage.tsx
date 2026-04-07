// CheatCode OS — YouTube University Page
// Under /learn/university
// Pulls public YouTube videos ingested via Railway pipeline
// Organized by topic/skill level with search and filtering

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Play, Search, Filter, ChevronRight, Clock, BookOpen, Zap, TrendingUp, X } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchContent, normalizeContentCard, type ContentCard } from "@/lib/api";
import { getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";
import { useAssetClass } from "@/contexts/AssetClassContext";

// ── Topic filters ─────────────────────────────────────────────────────────────
const TOPICS = [
  { id: "", label: "All", icon: "🎯" },
  { id: "technical_analysis", label: "Technical Analysis", icon: "📈" },
  { id: "options", label: "Options", icon: "⚡" },
  { id: "swing_trading", label: "Swing Trading", icon: "🎯" },
  { id: "day_trading", label: "Day Trading", icon: "⏱️" },
  { id: "macro", label: "Macro", icon: "🌍" },
  { id: "risk_management", label: "Risk Mgmt", icon: "🛡️" },
  { id: "psychology", label: "Psychology", icon: "🧠" },
  { id: "fundamentals", label: "Fundamentals", icon: "📊" },
  { id: "crypto", label: "Crypto", icon: "₿" },
];

const LEVELS = [
  { id: "", label: "All Levels" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#4DC820",
  intermediate: "#00AEEF",
  advanced: "#7B2FBE",
};

// ── Video Card ─────────────────────────────────────────────────────────────────
function VideoCard({ card }: { card: ContentCard }) {
  const n = normalizeContentCard(card);
  const [imgFailed, setImgFailed] = useState(false);
  const creatorSlug = n.creator_slug || "";
  const avatarUrl = getCreatorAvatar(creatorSlug);
  const avatarColor = getCreatorColor(creatorSlug) || "#4DC820";
  const initials = (n.creator_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const levelColor = LEVEL_COLORS[n.skill_level?.toLowerCase()] || "#667085";
  const topicLabel = n.topics[0]?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <Link href={`/video/${n.id}`}>
      <div className="group/card cursor-pointer flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:border-border/60 transition-all hover:shadow-md" style={{ width: 240, flexShrink: 0 }}>
        {/* Thumbnail */}
        <div className="relative overflow-hidden" style={{ height: 135 }}>
          <img
            src={imgFailed ? "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=480&q=80" : (n.thumbnailUrl || `https://img.youtube.com/vi/${n.youtubeId}/maxresdefault.jpg`)}
            alt={n.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            onError={() => setImgFailed(true)}
          />
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-all flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
              <Play size={16} fill="#101828" className="text-[#101828] ml-0.5" />
            </div>
          </div>
          {/* Duration */}
          {n.durationLabel && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white">
              {n.durationLabel}
            </div>
          )}
          {/* Level badge */}
          {n.skill_level && (
            <div
              className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold"
              style={{ background: `${levelColor}cc`, color: "white" }}
            >
              {n.skill_level.charAt(0).toUpperCase() + n.skill_level.slice(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          <p className="text-xs font-bold text-foreground leading-snug line-clamp-2 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            {n.title}
          </p>
          {topicLabel && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start mb-2"
                  style={{ background: "#4DC82018", color: "#4DC820" }}>
              {topicLabel}
            </span>
          )}
          {/* Creator row */}
          <div className="flex items-center gap-1.5 mt-auto">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold overflow-hidden flex-shrink-0"
              style={{ background: avatarColor }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={n.creator_name || ""} className="w-full h-full object-cover" onError={() => {}} />
              ) : initials}
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{n.creator_name || "Unknown"}</span>
            {n.publishedLabel && (
              <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">{n.publishedLabel}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Shelf row ─────────────────────────────────────────────────────────────────
function Shelf({ title, accent, cards }: { title: string; accent: string; cards: ContentCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (ref.current) ref.current.scrollBy({ left: dir === "right" ? 500 : -500, behavior: "smooth" });
  };
  if (!cards.length) return null;
  return (
    <section className="relative group/shelf">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: accent }} />
        <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
        <span className="text-xs text-muted-foreground">({cards.length})</span>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-border"
        >
          <ChevronRight size={14} className="text-muted-foreground rotate-180" />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {cards.map(card => <VideoCard key={card.id} card={card} />)}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-border"
        >
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function YouTubeUniversityPage() {
  const [allCards, setAllCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState("");
  const [activeLevel, setActiveLevel] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { selected: assetSelected, isAll: assetIsAll } = useAssetClass();
  // Map asset class selection to topic filter for video content
  const assetTopicFilter: string | undefined = !assetIsAll && assetSelected.length === 1
    ? (assetSelected[0] === "crypto" ? "crypto" : assetSelected[0] === "forex" ? "forex" : undefined)
    : undefined;

  useEffect(() => {
    setLoading(true);
    fetchContent({
      topic: activeTopic || assetTopicFilter || undefined,
      skill_level: activeLevel || undefined,
      sort: "relevance",
      page: 1,
    })
      .then(data => setAllCards(data))
      .catch(() => setAllCards([]))
      .finally(() => setLoading(false));
  }, [activeTopic, activeLevel, assetTopicFilter]);

  // Client-side search filter
  const filtered = search
    ? allCards.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.creator_name || "").toLowerCase().includes(search.toLowerCase()) ||
        c.topics.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : allCards;

  // Group by topic for shelf view (only when no topic filter active)
  const shelfGroups: { topic: string; label: string; accent: string; cards: ContentCard[] }[] = [];
  if (!activeTopic && !search) {
    const topicMap: Record<string, ContentCard[]> = {};
    filtered.forEach(card => {
      const t = card.topics[0] || "general";
      if (!topicMap[t]) topicMap[t] = [];
      topicMap[t].push(card);
    });
    const ACCENTS = ["#4DC820", "#00AEEF", "#E8193C", "#7B2FBE", "#F79009", "#C8D400", "#00AEEF", "#4DC820", "#E8193C"];
    Object.entries(topicMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
      .forEach(([topic, cards], i) => {
        shelfGroups.push({
          topic,
          label: topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          accent: ACCENTS[i % ACCENTS.length],
          cards,
        });
      });
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const totalCount = allCards.length;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto py-5">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/learn">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Learn</span>
              </Link>
              <ChevronRight size={14} className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">YouTube University</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  YouTube University
                </h1>
                <p className="text-sm text-muted-foreground">
                  {totalCount > 0 ? `${totalCount} curated videos` : "Curated videos"} from top trading educators — organized, searchable, and enhanced with XP.
                </p>
              </div>
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search videos..."
                    className="pl-8 pr-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-border/60 w-52"
                  />
                  {searchInput && (
                    <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" className="px-3 py-2 text-sm font-bold cc-gradient-bg text-[#101828] rounded-lg hover:opacity-90 transition-opacity">
                  Search
                </button>
              </form>
            </div>

            {/* Topic pills */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {TOPICS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTopic(t.id); setSearch(""); setSearchInput(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
                  style={{
                    background: activeTopic === t.id ? "#4DC82018" : "transparent",
                    color: activeTopic === t.id ? "#4DC820" : "var(--muted-foreground)",
                    border: activeTopic === t.id ? "1px solid #4DC82040" : "1px solid transparent",
                  }}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Level filter */}
            <div className="flex items-center gap-2 mt-2">
              <Filter size={12} className="text-muted-foreground" />
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setActiveLevel(l.id)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                  style={{
                    background: activeLevel === l.id ? "var(--muted)" : "transparent",
                    color: activeLevel === l.id ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-6 space-y-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                  <div className="bg-muted" style={{ height: 135 }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-lg font-bold text-foreground mb-2">No videos found</h3>
              <p className="text-sm text-muted-foreground">
                {search ? `No results for "${search}"` : "No videos available for this filter"}
              </p>
              <button
                onClick={() => { setActiveTopic(""); setActiveLevel(""); setSearch(""); setSearchInput(""); }}
                className="mt-4 px-4 py-2 text-sm font-bold cc-gradient-bg text-[#101828] rounded-lg hover:opacity-90 transition-opacity"
              >
                Clear Filters
              </button>
            </div>
          ) : search || activeTopic ? (
            /* Grid view when filtered */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-[#4DC820]" />
                <span className="text-sm font-bold text-foreground">{filtered.length} videos</span>
                {(search || activeTopic || activeLevel) && (
                  <button
                    onClick={() => { setActiveTopic(""); setActiveLevel(""); setSearch(""); setSearchInput(""); }}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X size={11} /> Clear filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(card => (
                  <Link key={card.id} href={`/video/${card.id}`}>
                    <VideoCard card={card} />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Shelf view when browsing all */
            <div className="space-y-8">
              {shelfGroups.map(group => (
                <Shelf key={group.topic} title={group.label} accent={group.accent} cards={group.cards} />
              ))}
              {shelfGroups.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filtered.map(card => <VideoCard key={card.id} card={card} />)}
                </div>
              )}
            </div>
          )}

          {/* XP callout */}
          {!loading && filtered.length > 0 && (
            <div className="rounded-2xl p-5 flex items-center gap-4"
                 style={{ background: "linear-gradient(135deg, #1a2035 0%, #2B3245 100%)" }}>
              <div className="w-10 h-10 rounded-xl cc-gradient-bg flex items-center justify-center flex-shrink-0">
                <TrendingUp size={20} className="text-[#101828]" />
              </div>
              <div>
                <p className="font-bold text-white text-sm" style={{ fontFamily: "var(--font-display)" }}>
                  Earn XP for every video you complete
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Watch videos, answer quizzes, and climb the leaderboard. Sign in to track your progress.
                </p>
              </div>
              <Link href="/auth" className="ml-auto flex-shrink-0">
                <button className="px-4 py-2 text-xs font-bold cc-gradient-bg text-[#101828] rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                  Sign In
                </button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
