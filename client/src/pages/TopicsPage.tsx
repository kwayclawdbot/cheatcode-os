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
      {/* Visual topic tiles — 2 rows, scrollable */}
      <div className="scroll-row pb-2">
        {topicGrid.map(topic => (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            <div className="flex-shrink-0 w-32 cursor-pointer group/tile">
              <div className="rounded-xl overflow-hidden mb-1.5 flex flex-col items-center justify-center transition-transform duration-200 group-hover/tile:scale-105"
                   style={{ height: 88, backgroundColor: topic.color }}>
                <span className="text-4xl">{topic.icon}</span>
              </div>
              <p className="text-[11px] font-semibold text-[#101828] text-center leading-tight"
                 style={{ fontFamily: "var(--font-display)" }}>
                {topic.label}
              </p>
              <p className="text-[10px] text-[#98A2B3] text-center">{topic.count} videos</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Netflix shelf: Technical Analysis */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full" style={{ background: "#4DC820" }} />
            <h2 className="text-base font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>Technical Analysis</h2>
          </div>
          <Link href="/topics/technical-analysis">
            <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">See all <ChevronRight size={12} /></span>
          </Link>
        </div>
        <div className="scroll-row">
          {todaysPicks.slice(0, 4).map(v => <VideoCard key={v.id} {...v} />)}
        </div>
      </div>

      {/* Netflix shelf: Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full" style={{ background: "#00AEEF" }} />
            <h2 className="text-base font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>Options & Flow</h2>
          </div>
          <Link href="/topics/options">
            <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">See all <ChevronRight size={12} /></span>
          </Link>
        </div>
        <div className="scroll-row">
          {[...todaysPicks].reverse().slice(0, 4).map(v => <VideoCard key={v.id} {...v} />)}
        </div>
      </div>
    </div>
  );
}

function CreatorsTab() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {creators.map(c => (
        <Link key={c.id} href={`/creators/${c.id}`}>
          <div className="cursor-pointer text-center group/creator">
            {/* Avatar — big, visual */}
            <div className="relative mx-auto mb-2.5" style={{ width: 80, height: 80 }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold transition-transform duration-200 group-hover/creator:scale-110"
                   style={{ backgroundColor: c.color }}>
                {c.avatar}
              </div>
              {c.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                     style={{ background: "#4DC820", color: "#101828" }}>✓</div>
              )}
            </div>
            <p className="text-xs font-bold text-[#101828] truncate" style={{ fontFamily: "var(--font-display)" }}>{c.name}</p>
            <p className="text-[10px] text-[#98A2B3] truncate mt-0.5">{c.videoCount} videos</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ThemesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {hotThemes.map(theme => (
        <Link key={theme.id} href={`/themes/${theme.id}`}>
          <div className="cursor-pointer rounded-2xl overflow-hidden group/theme" style={{ border: `1px solid ${theme.color}33` }}>
            {/* Visual header */}
            <div className="relative p-5 pb-4"
                 style={{ background: `linear-gradient(135deg, ${theme.color}18 0%, ${theme.color}30 100%)` }}>
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${theme.color}25`, color: theme.color }}>
                  {theme.status}
                </span>
              </div>
              {/* Big score */}
              <div className="text-5xl font-black mb-1 leading-none" style={{ color: theme.color, fontFamily: "var(--font-mono)", opacity: 0.25 }}>
                {theme.score}
              </div>
              <h3 className="font-bold text-[#101828] text-sm leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                {theme.label}
              </h3>
              {/* Level bar */}
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full"
                       style={{ backgroundColor: i < theme.level ? theme.color : `${theme.color}22` }} />
                ))}
              </div>
            </div>
            {/* Ticker row */}
            <div className="px-4 py-2.5 bg-white flex items-center justify-between">
              <div className="flex gap-1">
                {theme.tickers.map(t => (
                  <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${theme.color}15`, color: theme.color, fontFamily: "var(--font-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[#98A2B3]">Level {theme.level}/5</span>
            </div>
          </div>
        </Link>
      ))}
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
