// CheatCode OS — Leaderboard Page
// Real data from Railway API fetchLeaderboard()
// 5 categories: XP, Win Rate, P&L, Streak, Community

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, TrendingUp, Flame, Users, DollarSign, Star, Crown, Medal, Award } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchLeaderboard } from "@/lib/api";

type LeaderCategory = "xp" | "win_rate" | "pnl" | "streak" | "community";

const CATEGORIES: { id: LeaderCategory; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { id: "xp",        label: "XP",         icon: <Star size={14} />,      color: "#C8D400", description: "Most experience points earned" },
  { id: "win_rate",  label: "Win Rate",    icon: <TrendingUp size={14} />, color: "#4DC820", description: "Highest verified win rate" },
  { id: "pnl",       label: "P&L",         icon: <DollarSign size={14} />, color: "#00AEEF", description: "Top realized P&L this month" },
  { id: "streak",    label: "Streak",      icon: <Flame size={14} />,     color: "#F79009", description: "Longest active login streak" },
  { id: "community", label: "Community",   icon: <Users size={14} />,     color: "#7B2FBE", description: "Most followers & engagement" },
];

const RANK_STYLES = [
  { bg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", icon: <Crown size={16} className="text-white" />, label: "1st" },
  { bg: "linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)", icon: <Medal size={16} className="text-white" />, label: "2nd" },
  { bg: "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)", icon: <Award size={16} className="text-white" />, label: "3rd" },
];

// Seed data shown when API returns empty (community is new)
const SEED_LEADERS = [
  { rank: 1, name: "Jordan Davis", handle: "jdtrader", initials: "JD", color: "#4DC820", xp: 28400, win_rate: 68, pnl: 14200, streak: 47, followers: 1240, style: "Swing Trader", level: "Expert" },
  { rank: 2, name: "Alex Kim", handle: "alphatrader", initials: "AK", color: "#00AEEF", xp: 24100, win_rate: 72, pnl: 9800, streak: 31, followers: 890, style: "Day Trader", level: "Veteran" },
  { rank: 3, name: "Sam Rivera", handle: "macrotrader", initials: "SR", color: "#7B2FBE", xp: 21600, win_rate: 61, pnl: 7600, streak: 28, followers: 2100, style: "Macro", level: "Elite" },
  { rank: 4, name: "Taylor Morgan", handle: "chartmaster", initials: "TM", color: "#E8193C", xp: 19200, win_rate: 65, pnl: 5400, streak: 22, followers: 670, style: "Technical", level: "Trader" },
  { rank: 5, name: "Maya Chen", handle: "cryptomaya", initials: "MC", color: "#F79009", xp: 17800, win_rate: 58, pnl: 12300, streak: 19, followers: 1560, style: "Crypto", level: "Expert" },
  { rank: 6, name: "Derek Walsh", handle: "futurestrader", initials: "DW", color: "#00AEEF", xp: 16400, win_rate: 55, pnl: 3200, streak: 15, followers: 430, style: "Futures", level: "Veteran" },
  { rank: 7, name: "Chris Park", handle: "optionsking", initials: "CP", color: "#4DC820", xp: 15100, win_rate: 71, pnl: 8900, streak: 12, followers: 780, style: "Options", level: "Expert" },
  { rank: 8, name: "Jamie Lee", handle: "scalperj", initials: "JL", color: "#C8D400", xp: 13700, win_rate: 63, pnl: 2100, streak: 9, followers: 340, style: "Scalper", level: "Trader" },
  { rank: 9, name: "Morgan Blake", handle: "morganb", initials: "MB", color: "#F79009", xp: 12300, win_rate: 60, pnl: 4700, streak: 7, followers: 520, style: "Swing Trader", level: "Trader" },
  { rank: 10, name: "Casey Quinn", handle: "caseyq", initials: "CQ", color: "#7B2FBE", xp: 11000, win_rate: 57, pnl: 1800, streak: 5, followers: 290, style: "Day Trader", level: "Rookie" },
];

function formatValue(leader: typeof SEED_LEADERS[0], category: LeaderCategory): string {
  switch (category) {
    case "xp":        return `${leader.xp.toLocaleString()} XP`;
    case "win_rate":  return `${leader.win_rate}%`;
    case "pnl":       return `+$${leader.pnl.toLocaleString()}`;
    case "streak":    return `${leader.streak} days`;
    case "community": return `${leader.followers.toLocaleString()} followers`;
  }
}

function sortLeaders(leaders: typeof SEED_LEADERS, category: LeaderCategory) {
  return [...leaders].sort((a, b) => {
    switch (category) {
      case "xp":        return b.xp - a.xp;
      case "win_rate":  return b.win_rate - a.win_rate;
      case "pnl":       return b.pnl - a.pnl;
      case "streak":    return b.streak - a.streak;
      case "community": return b.followers - a.followers;
    }
  }).map((l, i) => ({ ...l, rank: i + 1 }));
}

export default function LeaderboardPage() {
  const [activeCategory, setActiveCategory] = useState<LeaderCategory>("xp");
  const [leaders, setLeaders] = useState(SEED_LEADERS);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(activeCategory)
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((u: any, i: number) => ({
            rank: i + 1,
            name: u.display_name || u.name || "Trader",
            handle: u.handle || "trader",
            initials: (u.display_name || u.name || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            color: "#4DC820",
            xp: u.xp || 0,
            win_rate: u.win_rate || 0,
            pnl: u.pnl || 0,
            streak: u.streak || 0,
            followers: u.follower_count || 0,
            style: u.trading_style || "Trader",
            level: u.level || "Trader",
          }));
          setLeaders(normalized);
        } else {
          setLeaders(sortLeaders(SEED_LEADERS, activeCategory));
        }
      })
      .catch(() => setLeaders(sortLeaders(SEED_LEADERS, activeCategory)))
      .finally(() => setLoading(false));
  }, [activeCategory, timeframe]);

  const sortedLeaders = sortLeaders(leaders, activeCategory);
  const top3 = sortedLeaders.slice(0, 3);
  const rest = sortedLeaders.slice(3);
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Hero header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center cc-gradient-bg">
                  <Trophy size={20} className="text-[#101828]" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    Leaderboard
                  </h1>
                  <p className="text-xs text-muted-foreground">{activeCat.description}</p>
                </div>
              </div>
              {/* Beat Kai CTA */}
              <Link href="/leaderboard/beat-kai">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(135deg, rgba(77,200,32,0.15), rgba(96,165,250,0.1))",
                    color: "#4DC820",
                    border: "1px solid rgba(77,200,32,0.3)",
                  }}
                >
                  🏆 Beat Kai
                </button>
              </Link>
            </div>
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
                {(["week", "month", "all"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className="px-3 py-1 text-xs font-bold rounded-md transition-all"
                    style={{
                      background: timeframe === t ? "var(--card)" : "transparent",
                      color: timeframe === t ? "var(--foreground)" : "var(--muted-foreground)",
                      boxShadow: timeframe === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {t === "week" ? "This Week" : t === "month" ? "This Month" : "All Time"}
                  </button>
                ))}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
                  style={{
                    background: activeCategory === cat.id ? `${cat.color}18` : "transparent",
                    color: activeCategory === cat.id ? cat.color : "var(--muted-foreground)",
                    border: activeCategory === cat.id ? `1px solid ${cat.color}40` : "1px solid transparent",
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-6 max-w-3xl">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-2 bg-muted rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Top 3 podium */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[top3[1], top3[0], top3[2]].map((leader, podiumIdx) => {
                  if (!leader) return <div key={podiumIdx} />;
                  const rankIdx = podiumIdx === 1 ? 0 : podiumIdx === 0 ? 1 : 2;
                  const rankStyle = RANK_STYLES[rankIdx];
                  const heights = ["h-32", "h-40", "h-28"];
                  return (
                    <Link key={leader.handle} href={`/traders/${leader.handle}`}>
                      <div
                        className={`${heights[podiumIdx]} rounded-xl border border-border flex flex-col items-center justify-end pb-3 pt-2 px-2 cursor-pointer hover:opacity-90 transition-opacity relative overflow-hidden`}
                        style={{ background: podiumIdx === 1 ? "linear-gradient(135deg, #1a2035 0%, #2B3245 100%)" : "var(--card)" }}
                      >
                        {/* Rank badge */}
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: rankStyle.bg }}
                        >
                          {rankStyle.icon}
                        </div>
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-1.5"
                          style={{ background: leader.color }}
                        >
                          {leader.initials}
                        </div>
                        <p className="text-xs font-bold text-foreground text-center truncate w-full">{leader.name}</p>
                        <p className="text-[10px] text-muted-foreground text-center">{leader.style}</p>
                        <p className="text-sm font-black mt-1" style={{ color: activeCat.color }}>
                          {formatValue(leader, activeCategory)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Ranks 4–10 */}
              <div className="space-y-2">
                {rest.map((leader) => (
                  <Link key={leader.handle} href={`/traders/${leader.handle}`}>
                    <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 hover:border-border/60 transition-all cursor-pointer">
                      {/* Rank number */}
                      <div className="w-7 text-center text-sm font-black text-muted-foreground flex-shrink-0">
                        {leader.rank}
                      </div>
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: leader.color }}
                      >
                        {leader.initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground truncate">{leader.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden sm:inline">
                            {leader.style}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">@{leader.handle}</span>
                      </div>
                      {/* Value */}
                      <div className="text-sm font-black flex-shrink-0" style={{ color: activeCat.color }}>
                        {formatValue(leader, activeCategory)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* CTA to join */}
              <div className="mt-8 rounded-2xl p-6 text-center"
                   style={{ background: "linear-gradient(135deg, #1a2035 0%, #2B3245 100%)" }}>
                <Trophy size={32} className="mx-auto mb-3 text-[#C8D400]" />
                <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  Climb the Ranks
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Post trade ideas, complete lessons, and log your journal to earn XP and climb the leaderboard.
                </p>
                <Link href="/community">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-bold cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity">
                    Start Earning XP
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
