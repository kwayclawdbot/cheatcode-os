// CheatCode OS — Browse / Topics Page
// Design: Four browsing dimensions: Topic, Creator, Theme, Skill Level
// NO MOCK DATA — all content from live Railway API + creator registry

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight, Star, Users, BookOpen, Flame } from "lucide-react";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchCreators, fetchContent, normalizeContentCard, fetchThemes } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { syncCreatorRegistry, getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";

// ─── Static topic grid (browse categories) ────────────────────────────────────
const TOPIC_GRID = [
  { id: "technical-analysis", label: "Technical Analysis", icon: "📈", color: "#ECFDF3" },
  { id: "options", label: "Options", icon: "⚡", color: "#EFF8FF" },
  { id: "swing-trading", label: "Swing Trading", icon: "🎯", color: "#FFFAEB" },
  { id: "day-trading", label: "Day Trading", icon: "⏱️", color: "#FEF3F2" },
  { id: "macro", label: "Macro", icon: "🌍", color: "#F5F3FF" },
  { id: "sectors", label: "Sectors", icon: "🏭", color: "#FFF7ED" },
  { id: "crypto", label: "Crypto", icon: "₿", color: "#ECFDF3" },
  { id: "fundamentals", label: "Fundamentals", icon: "📊", color: "#EFF8FF" },
  { id: "psychology", label: "Psychology", icon: "🧠", color: "#FFFAEB" },
];

const TABS = [
  { id: "topics", label: "By Topic", icon: <BookOpen size={14} /> },
  { id: "creators", label: "By Creator", icon: <Users size={14} /> },
  { id: "themes", label: "By Theme", icon: <Flame size={14} /> },
  { id: "skill", label: "By Skill Level", icon: <Star size={14} /> },
];

const SKILL_LEVELS = [
  {
    level: "Beginner", color: "#4DC820", bg: "#F0FDE8", border: "#B6F08A",
    description: "New to markets. Start here.",
    paths: ["Market Foundations", "Reading Charts Basics", "Risk Management 101"],
  },
  {
    level: "Intermediate", color: "#00AEEF", bg: "#E8F8FF", border: "#7FDBF8",
    description: "You know the basics. Go deeper.",
    paths: ["Technical Analysis Core", "Options Fundamentals", "Swing Trading Setups"],
  },
  {
    level: "Advanced", color: "#7B2FBE", bg: "#F5EEFF", border: "#C4A0F0",
    description: "Institutional-level thinking.",
    paths: ["Advanced Macro Trading", "Options Flow Analysis", "Position Sizing & Risk"],
  },
];

// ─── Topics Tab ────────────────────────────────────────────────────────────────
function TopicsTab() {
  const { data: rawContent } = useApi(() => fetchContent({ sort: "relevance", page: 1 }), []);

  const content = (rawContent || []).map((c) => {
    const n = normalizeContentCard(c);
    const slug = n.creator_slug || "";
    return {
      id: n.id,
      type: n.content_type as "video" | "podcast",
      youtubeId: n.youtubeId || "",
      title: n.title,
      creatorId: slug,
      creator: {
        name: n.creator_name || "Unknown",
        avatar: (n.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        avatarUrl: getCreatorAvatar(slug),
        color: getCreatorColor(slug),
      },
      thumbnail: n.thumbnailUrl || "",
      duration: n.durationLabel || "",
      quickTake: n.quick_take || "",
      tags: n.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
      relevanceBadge: n.relevanceLabel || "Watch",
      tickers: [] as string[],
      convergenceScore: Math.round(n.relevance_score * 100),
      publishedAt: n.publishedLabel || "",
    };
  });

  const technicalContent = content.filter(c => c.tags.some(t => t.toLowerCase().includes("technical")));
  const optionsContent = content.filter(c => c.tags.some(t => t.toLowerCase().includes("option")));
  const displayTechnical = technicalContent.length > 0 ? technicalContent : content.slice(0, 4);
  const displayOptions = optionsContent.length > 0 ? optionsContent : content.slice(4, 8);

  return (
    <div className="space-y-8">
      {/* Visual topic tiles */}
      <div className="scroll-row pb-2">
        {TOPIC_GRID.map(topic => (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            <div className="flex-shrink-0 w-32 cursor-pointer group/tile">
              <div className="rounded-xl overflow-hidden mb-1.5 flex flex-col items-center justify-center transition-transform duration-200 group-hover/tile:scale-105"
                   style={{ height: 88, backgroundColor: topic.color }}>
                <span className="text-4xl">{topic.icon}</span>
              </div>
              <p className="text-[11px] font-semibold text-foreground text-center leading-tight"
                 style={{ fontFamily: "var(--font-display)" }}>
                {topic.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Technical Analysis shelf */}
      {displayTechnical.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ background: "#4DC820" }} />
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Technical Analysis</h2>
            </div>
            <Link href="/topics/technical-analysis">
              <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">See all <ChevronRight size={12} /></span>
            </Link>
          </div>
          <div className="scroll-row">
            {displayTechnical.slice(0, 5).map(v => <VideoCard key={v.id} {...v} />)}
          </div>
        </div>
      )}

      {/* Options shelf */}
      {displayOptions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full" style={{ background: "#00AEEF" }} />
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Options & Flow</h2>
            </div>
            <Link href="/topics/options">
              <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">See all <ChevronRight size={12} /></span>
            </Link>
          </div>
          <div className="scroll-row">
            {displayOptions.slice(0, 5).map(v => <VideoCard key={v.id} {...v} />)}
          </div>
        </div>
      )}

      {content.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading content...</div>
      )}
    </div>
  );
}

// ─── Creators Tab ──────────────────────────────────────────────────────────────
function CreatorsTab() {
  const { data: apiCreators, loading } = useApi(fetchCreators, []);

  useEffect(() => {
    syncCreatorRegistry();
  }, []);

  const COLORS = ["#12B76A", "#2E90FA", "#F79009", "#F04438", "#7C3AED", "#0EA5E9", "#E8193C", "#00AEEF", "#4DC820", "#667085", "#D946EF", "#EC4899", "#14B8A6"];

  const creators = (apiCreators || []).map((c, i) => ({
    id: c.slug,
    name: c.name,
    avatar: c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    avatarUrl: getCreatorAvatar(c.slug),
    color: getCreatorColor(c.slug) || COLORS[i % COLORS.length],
    videoCount: c.content_count,
    verified: c.quality_score >= 0.7,
  }));

  if (loading && !creators.length) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-2" />
            <div className="h-3 bg-muted rounded w-16 mx-auto mb-1" />
            <div className="h-2.5 bg-muted rounded w-12 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {creators.map(c => (
        <Link key={c.id} href={`/creators/${c.id}`}>
          <div className="cursor-pointer text-center group/creator">
            <div className="relative mx-auto mb-2.5" style={{ width: 80, height: 80 }}>
              <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-200 group-hover/creator:scale-110"
                   style={{ backgroundColor: c.color }}>
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = "none";
                      const parent = el.parentElement;
                      if (parent) {
                        const fallback = document.createElement("div");
                        fallback.className = "w-full h-full flex items-center justify-center text-white text-2xl font-bold";
                        fallback.textContent = c.avatar;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {c.avatar}
                  </div>
                )}
              </div>
              {c.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                     style={{ background: "#4DC820", color: "#101828" }}>✓</div>
              )}
            </div>
            <p className="text-xs font-bold text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>{c.name}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.videoCount} videos</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Themes Tab ────────────────────────────────────────────────────────────────
function ThemesTab() {
  const { data: apiThemes, loading } = useApi(fetchThemes, []);

  const themes = (apiThemes || []).map((t: any) => ({
    id: t.slug,
    label: t.name,
    status: t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : "Active",
    level: Math.round((t.score || 50) / 20),
    tickers: t.tickers || [],
    score: Math.round(t.score || 50),
    color: t.status === "escalating" ? "#F04438" : t.status === "active" ? "#12B76A" : "#F79009",
  }));

  if (loading && !themes.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden animate-pulse">
            <div className="h-28 bg-muted" />
            <div className="p-3 bg-card h-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!themes.length) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No themes available right now.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {themes.map((theme: any) => (
        <Link key={theme.id} href={`/themes/${theme.id}`}>
          <div className="cursor-pointer rounded-2xl overflow-hidden group/theme" style={{ border: `1px solid ${theme.color}33` }}>
            <div className="relative p-5 pb-4"
                 style={{ background: `linear-gradient(135deg, ${theme.color}18 0%, ${theme.color}30 100%)` }}>
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${theme.color}25`, color: theme.color }}>
                  {theme.status}
                </span>
              </div>
              <div className="text-5xl font-black mb-1 leading-none" style={{ color: theme.color, fontFamily: "var(--font-mono)", opacity: 0.25 }}>
                {theme.score}
              </div>
              <h3 className="font-bold text-foreground text-sm leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                {theme.label}
              </h3>
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full"
                       style={{ backgroundColor: i < theme.level ? theme.color : `${theme.color}22` }} />
                ))}
              </div>
            </div>
            <div className="px-4 py-2.5 bg-card flex items-center justify-between">
              <div className="flex gap-1">
                {(theme.tickers || []).slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${theme.color}15`, color: theme.color, fontFamily: "var(--font-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">Level {theme.level}/5</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Skill Tab ─────────────────────────────────────────────────────────────────
function SkillTab() {
  return (
    <div className="space-y-6">
      {SKILL_LEVELS.map(s => (
        <div key={s.level} className="rounded-2xl border overflow-hidden"
             style={{ borderColor: s.border, backgroundColor: s.bg }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)", color: s.color }}>
                  {s.level}
                </h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {s.paths.map(p => (
                <Link key={p} href="/learn">
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-card border cursor-pointer hover:shadow-sm transition-shadow"
                        style={{ borderColor: s.border, color: s.color }}>
                    {p}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t px-5 py-3 bg-card/50 flex items-center justify-between"
               style={{ borderColor: s.border }}>
            <span className="text-xs text-muted-foreground">Start with the learning path</span>
            <Link href="/learn">
              <span className="text-xs font-semibold flex items-center gap-1" style={{ color: s.color }}>
                Start here <ChevronRight size={12} />
              </span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const [activeTab, setActiveTab] = useState("creators");

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Header */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="container mx-auto py-8">
            <p className="section-label mb-1" style={{ color: "#98A2B3" }}>Browse</p>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Find content your way
            </h1>
            <p className="text-sm" style={{ color: "#98A2B3" }}>
              Explore curated finance content by topic, creator, theme, or skill level.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card border-b border-border sticky top-14 z-40">
          <div className="container mx-auto">
            <div className="flex gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-[#4DC820] text-[#4DC820]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          {activeTab === "topics" && <TopicsTab />}
          {activeTab === "creators" && <CreatorsTab />}
          {activeTab === "themes" && <ThemesTab />}
          {activeTab === "skill" && <SkillTab />}
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
