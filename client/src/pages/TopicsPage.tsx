// CheatCode OS — Browse / Topics Page
// Design: Four browsing dimensions: Topic, Creator, Theme, Skill Level
// Tabbed navigation. Each tab shows a grid of cards.

import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Star, Users, BookOpen, Flame } from "lucide-react";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { topicGrid, creators, hotThemes, todaysPicks, learningPaths } from "@/lib/mockData";

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
    videoCount: 48,
  },
  {
    level: "Intermediate", color: "#00AEEF", bg: "#E8F8FF", border: "#7FDBF8",
    description: "You know the basics. Go deeper.",
    paths: ["Technical Analysis Core", "Options Fundamentals", "Swing Trading Setups"],
    videoCount: 134,
  },
  {
    level: "Advanced", color: "#7B2FBE", bg: "#F5EEFF", border: "#C4A0F0",
    description: "Institutional-level thinking.",
    paths: ["Advanced Macro Trading", "Options Flow Analysis", "Position Sizing & Risk"],
    videoCount: 102,
  },
];

function TopicsTab() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {topicGrid.map(topic => (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            <div className="content-card rounded-2xl border border-[#EAECF0] p-5 text-center cursor-pointer"
                 style={{ backgroundColor: topic.color }}>
              <div className="text-3xl mb-2">{topic.icon}</div>
              <div className="font-bold text-sm text-[#101828] leading-tight mb-1"
                   style={{ fontFamily: "var(--font-display)" }}>
                {topic.label}
              </div>
              <div className="text-xs text-[#667085]">{topic.count} videos</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Featured topic: Technical Analysis */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
            📈 Technical Analysis — Latest
          </h2>
          <Link href="/topics/technical-analysis">
            <span className="text-sm font-semibold flex items-center gap-1 cc-gradient-text">
              See all <ChevronRight size={14} />
            </span>
          </Link>
        </div>
        <div className="scroll-row">
          {todaysPicks.slice(0, 4).map(v => (
            <VideoCard key={v.id} {...v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CreatorsTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {creators.map(c => (
        <Link key={c.id} href={`/creators/${c.id}`}>
          <div className="content-card bg-white rounded-2xl border border-[#EAECF0] p-5 cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                   style={{ backgroundColor: c.color }}>
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#101828] text-sm" style={{ fontFamily: "var(--font-display)" }}>
                    {c.name}
                  </h3>
                  {c.verified && (
                    <span className="text-[10px] font-semibold text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.5 rounded-full border border-[#A9EFC5]">
                      ✓ Curated
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-0.5">{c.handle}</p>
              </div>
            </div>
            <p className="text-xs text-[#475467] mb-3">{c.specialty}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#98A2B3]">{c.videoCount} curated videos</span>
              <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">
                View profile <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ThemesTab() {
  return (
    <div className="space-y-4">
      {hotThemes.map(theme => {
        const statusColors: Record<string, string> = {
          "Escalating": "text-[#A8001F] bg-[#FFF0F3] border-[#F8A3B1]",
          "Active": "text-[#2E7A10] bg-[#F0FDE8] border-[#B6F08A]",
          "Watch": "text-[#7A6800] bg-[#FAFDE8] border-[#E8F08A]",
          "New": "text-[#005F8A] bg-[#E8F8FF] border-[#7FDBF8]",
        };
        return (
          <Link key={theme.id} href={`/themes/${theme.id}`}>
            <div className="content-card bg-white rounded-2xl border border-[#EAECF0] p-5 cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[theme.status]}`}>
                      {theme.status}
                    </span>
                    <span className="text-xs text-[#98A2B3]">Level {theme.level}/5</span>
                  </div>
                  <h3 className="font-bold text-[#101828] text-base mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    {theme.label}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {theme.tickers.map(t => (
                      <span key={t} className="ticker-mono text-xs bg-[#F9FAFB] border border-[#EAECF0] px-2 py-0.5 rounded text-[#475467]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="score-number text-2xl font-bold" style={{ color: theme.color }}>
                    {theme.score}
                  </div>
                  <div className="text-xs text-[#98A2B3]">convergence</div>
                  <div className="flex gap-0.5 mt-2 justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`h-1.5 w-4 rounded-full`}
                           style={{ backgroundColor: i < theme.level ? theme.color : "#EAECF0" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SkillTab() {
  return (
    <div className="space-y-6">
      {SKILL_LEVELS.map(s => (
        <div key={s.level} className="rounded-2xl border overflow-hidden"
             style={{ borderColor: s.border, backgroundColor: s.bg }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-[#101828]" style={{ fontFamily: "var(--font-display)", color: s.color }}>
                  {s.level}
                </h3>
                <p className="text-sm text-[#667085]">{s.description}</p>
              </div>
              <span className="text-xs text-[#667085] bg-white px-2 py-1 rounded-full border border-[#EAECF0]">
                {s.videoCount} videos
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {s.paths.map(p => (
                <Link key={p} href="/learn">
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border cursor-pointer hover:shadow-sm transition-shadow"
                        style={{ borderColor: s.border, color: s.color }}>
                    {p}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t px-5 py-3 bg-white/50 flex items-center justify-between"
               style={{ borderColor: s.border }}>
            <span className="text-xs text-[#667085]">Start with the learning path</span>
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

export default function TopicsPage() {
  const [activeTab, setActiveTab] = useState("topics");

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Header — dark gradient with spectrum bar */}
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

        {/* Tabs — sticky below nav */}
        <div className="bg-white border-b border-[#EAECF0] sticky top-14 z-40">
          <div className="container mx-auto">
            <div className="flex gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-[#4DC820] text-[#4DC820]"
                      : "border-transparent text-[#667085] hover:text-[#101828]"
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
