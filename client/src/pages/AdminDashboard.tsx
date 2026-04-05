// CheatCode OS — Admin Dashboard
// Design: Dark sidebar layout, data-dense tables, CC brand accent colors
// Sections: Overview metrics, Members, Activity Feed, Content Management, Coach Applications, Site Controls

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Users, TrendingUp, DollarSign, Eye, Activity, Settings,
  ChevronRight, Search, Filter, MoreHorizontal, CheckCircle,
  XCircle, Clock, AlertTriangle, BarChart2, BookOpen, Zap,
  Shield, Bell, Database, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserCheck, Star, Package, Calendar, LogOut, Home, Layers,
  MessageSquare, FileText, Award
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: React.ReactNode;
  color: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  tier: "free" | "pro" | "elite" | "coach";
  joined: string;
  lastActive: string;
  status: "active" | "inactive" | "suspended";
  revenue: number;
  xp: number;
}

interface ActivityEvent {
  id: string;
  user: string;
  action: string;
  detail: string;
  time: string;
  type: "watch" | "join" | "upgrade" | "post" | "coach" | "purchase";
}

interface CoachApplication {
  id: string;
  name: string;
  email: string;
  specialty: string;
  experience: string;
  applied: string;
  status: "pending" | "approved" | "rejected";
  followers: string;
}

// ─── Sample Data (replace with API calls when backend supports admin endpoints) ──

const STATS: StatCard[] = [
  { label: "Total Members", value: "4,821", change: "+127 this week", up: true, icon: <Users size={18} />, color: "#4DC820" },
  { label: "Pro Subscribers", value: "1,204", change: "+43 this week", up: true, icon: <Zap size={18} />, color: "#00AEEF" },
  { label: "Monthly Revenue", value: "$34,916", change: "+12.4% vs last month", up: true, icon: <DollarSign size={18} />, color: "#7B2FBE" },
  { label: "Active Today", value: "892", change: "-3.2% vs yesterday", up: false, icon: <Activity size={18} />, color: "#F79009" },
  { label: "Videos Watched", value: "18,430", change: "+8.7% this week", up: true, icon: <Eye size={18} />, color: "#E8193C" },
  { label: "Coach Revenue", value: "$8,240", change: "+22% this month", up: true, icon: <Award size={18} />, color: "#12B76A" },
];

const MEMBERS: Member[] = [
  { id: "1", name: "Marcus Williams", email: "marcus@example.com", tier: "pro", joined: "Jan 12, 2026", lastActive: "2 hours ago", status: "active", revenue: 348, xp: 12400 },
  { id: "2", name: "Sarah Chen", email: "sarah@example.com", tier: "elite", joined: "Feb 3, 2026", lastActive: "5 min ago", status: "active", revenue: 1044, xp: 28700 },
  { id: "3", name: "James Okafor", email: "james@example.com", tier: "coach", joined: "Dec 5, 2025", lastActive: "1 hour ago", status: "active", revenue: 2100, xp: 45200 },
  { id: "4", name: "Priya Patel", email: "priya@example.com", tier: "free", joined: "Mar 28, 2026", lastActive: "3 days ago", status: "inactive", revenue: 0, xp: 340 },
  { id: "5", name: "Tyler Ross", email: "tyler@example.com", tier: "pro", joined: "Nov 14, 2025", lastActive: "Yesterday", status: "active", revenue: 696, xp: 9800 },
  { id: "6", name: "Amanda Flores", email: "amanda@example.com", tier: "pro", joined: "Mar 1, 2026", lastActive: "4 hours ago", status: "active", revenue: 87, xp: 5600 },
  { id: "7", name: "Kevin Zhang", email: "kevin@example.com", tier: "free", joined: "Apr 1, 2026", lastActive: "Just now", status: "active", revenue: 0, xp: 120 },
  { id: "8", name: "Danielle Moore", email: "danielle@example.com", tier: "elite", joined: "Oct 22, 2025", lastActive: "6 hours ago", status: "active", revenue: 2088, xp: 61000 },
];

const ACTIVITY: ActivityEvent[] = [
  { id: "1", user: "Sarah Chen", action: "Watched", detail: "Mark Minervini — VCP Breakout Setup", time: "5 min ago", type: "watch" },
  { id: "2", user: "New User", action: "Joined", detail: "Signed up via pricing page", time: "12 min ago", type: "join" },
  { id: "3", user: "Tyler Ross", action: "Upgraded", detail: "Free → Pro ($29/mo)", time: "28 min ago", type: "upgrade" },
  { id: "4", user: "James Okafor", action: "Published", detail: "New course: 'Momentum Day Trading Masterclass'", time: "1 hour ago", type: "coach" },
  { id: "5", user: "Priya Patel", action: "Posted", detail: "Trade journal entry — NVDA long", time: "1 hour ago", type: "post" },
  { id: "6", user: "Marcus Williams", action: "Purchased", detail: "1-on-1 session with Coach James ($149)", time: "2 hours ago", type: "purchase" },
  { id: "7", user: "New User", action: "Joined", detail: "Signed up via referral link", time: "2 hours ago", type: "join" },
  { id: "8", user: "Amanda Flores", action: "Watched", detail: "tastytrade — Options Flow Analysis", time: "3 hours ago", type: "watch" },
  { id: "9", user: "Kevin Zhang", action: "Joined", detail: "Signed up via organic search", time: "4 hours ago", type: "join" },
  { id: "10", user: "Danielle Moore", action: "Upgraded", detail: "Pro → Elite ($79/mo)", time: "5 hours ago", type: "upgrade" },
];

const COACH_APPLICATIONS: CoachApplication[] = [
  { id: "1", name: "Jordan Mills", email: "jordan@example.com", specialty: "Options Flow, Day Trading", experience: "7 years prop trading, 12K YouTube subs", applied: "Apr 4, 2026", status: "pending", followers: "12,400" },
  { id: "2", name: "Nia Thompson", email: "nia@example.com", specialty: "Swing Trading, VCP", experience: "5 years, former hedge fund analyst", applied: "Apr 3, 2026", status: "pending", followers: "8,200" },
  { id: "3", name: "Carlos Rivera", email: "carlos@example.com", specialty: "Crypto, Macro", experience: "3 years, 45K Twitter followers", applied: "Apr 2, 2026", status: "approved", followers: "45,000" },
  { id: "4", name: "Lisa Park", email: "lisa@example.com", specialty: "Forex, Technical Analysis", experience: "10 years, certified CMT", applied: "Mar 30, 2026", status: "rejected", followers: "3,100" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    free:  { bg: "#F2F4F7", text: "#475467", border: "#EAECF0" },
    pro:   { bg: "#E8F8FF", text: "#005F8A", border: "#7FDBF8" },
    elite: { bg: "#F5EEFF", text: "#5B1FA0", border: "#C4A0F0" },
    coach: { bg: "#F0FDE8", text: "#2E7A10", border: "#B6F08A" },
  };
  const s = styles[tier] || styles.free;
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize"
          style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      {tier}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "#4DC820",
    inactive: "#98A2B3",
    suspended: "#E8193C",
  };
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: colors[status] || "#98A2B3" }} />;
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    watch:    { icon: <Eye size={12} />, color: "#005F8A", bg: "#E8F8FF" },
    join:     { icon: <Users size={12} />, color: "#2E7A10", bg: "#F0FDE8" },
    upgrade:  { icon: <Zap size={12} />, color: "#5B1FA0", bg: "#F5EEFF" },
    post:     { icon: <MessageSquare size={12} />, color: "#7A6800", bg: "#FAFDE8" },
    coach:    { icon: <Award size={12} />, color: "#2E7A10", bg: "#F0FDE8" },
    purchase: { icon: <DollarSign size={12} />, color: "#A8001F", bg: "#FFF0F3" },
  };
  const m = map[type] || map.watch;
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
         style={{ background: m.bg, color: m.color }}>
      {m.icon}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: <BarChart2 size={16} /> },
  { id: "members", label: "Members", icon: <Users size={16} /> },
  { id: "activity", label: "Activity Feed", icon: <Activity size={16} /> },
  { id: "coaches", label: "Coach Applications", icon: <Award size={16} /> },
  { id: "content", label: "Content", icon: <Layers size={16} /> },
  { id: "revenue", label: "Revenue", icon: <DollarSign size={16} /> },
  { id: "controls", label: "Site Controls", icon: <Settings size={16} /> },
];

function AdminSidebar({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r"
           style={{ background: "#0F1623", borderColor: "rgba(255,255,255,0.08)", minHeight: "100vh" }}>
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Admin</p>
            <p className="text-[10px]" style={{ color: "#475467" }}>CheatCode OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              background: active === item.id ? "rgba(77,200,32,0.12)" : "transparent",
              color: active === item.id ? "#4DC820" : "#98A2B3",
              fontWeight: active === item.id ? 600 : 400,
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/">
          <button className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors"
                  style={{ color: "#98A2B3" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F9FAFB")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#98A2B3")}>
            <Home size={14} />
            Back to Site
          </button>
        </Link>
      </div>
    </aside>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground">Real-time platform metrics — Sunday, April 5, 2026</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STATS.map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: `${s.color}18`, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
            <div className="flex items-center gap-1 text-xs">
              {s.up
                ? <ArrowUpRight size={12} style={{ color: "#4DC820" }} />
                : <ArrowDownRight size={12} style={{ color: "#E8193C" }} />}
              <span style={{ color: s.up ? "#4DC820" : "#E8193C" }}>{s.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart placeholder */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Revenue — Last 30 Days</h3>
          <div className="flex gap-2">
            {["7D", "30D", "90D"].map(r => (
              <button key={r} className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
                      style={{ borderColor: r === "30D" ? "#4DC820" : "#EAECF0", color: r === "30D" ? "#4DC820" : "#98A2B3", background: r === "30D" ? "#F0FDE8" : "transparent" }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        {/* Simulated bar chart */}
        <div className="flex items-end gap-1 h-32">
          {[42, 58, 51, 67, 73, 62, 80, 71, 88, 76, 92, 85, 78, 95, 89, 82, 97, 91, 86, 99, 93, 88, 96, 84, 91, 87, 94, 89, 97, 100].map((h, i) => (
            <div key={i} className="flex-1 rounded-t transition-all"
                 style={{ height: `${h}%`, background: i >= 27 ? "#4DC820" : "#EAECF0" }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>Mar 6</span><span>Mar 13</span><span>Mar 20</span><span>Mar 27</span><span>Apr 5</span>
        </div>
      </div>

      {/* Recent activity preview */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Recent Activity</h3>
          <span className="text-xs text-[#4DC820] font-medium cursor-pointer">View all →</span>
        </div>
        <div className="space-y-3">
          {ACTIVITY.slice(0, 5).map(ev => (
            <div key={ev.id} className="flex items-center gap-3">
              <ActivityIcon type={ev.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">
                  <span className="font-bold">{ev.user}</span> {ev.action}
                </p>
                <p className="text-xs text-muted-foreground truncate">{ev.detail}</p>
              </div>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">{ev.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembersSection() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const filtered = MEMBERS.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "all" || m.tier === tierFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Members</h2>
          <p className="text-sm text-muted-foreground">4,821 total members</p>
        </div>
        <button className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl cc-gradient-bg text-[#101828]">
          <RefreshCw size={13} /> Sync
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["all", "free", "pro", "elite", "coach"].map(t => (
            <button key={t}
                    onClick={() => setTierFilter(t)}
                    className="text-xs px-3 py-2 rounded-xl border capitalize transition-colors"
                    style={{
                      borderColor: tierFilter === t ? "#4DC820" : "#EAECF0",
                      color: tierFilter === t ? "#4DC820" : "#475467",
                      background: tierFilter === t ? "#F0FDE8" : "transparent",
                    }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Member</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tier</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Joined</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Last Active</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Revenue</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">XP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                           style={{ background: `hsl(${(i * 47) % 360}, 60%, 45%)` }}>
                        {m.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={m.tier} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={m.status} />
                      <span className="text-xs text-muted-foreground capitalize">{m.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.joined}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.lastActive}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    {m.revenue > 0 ? `$${m.revenue.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {m.xp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 rounded hover:bg-muted transition-colors">
                      <MoreHorizontal size={14} className="text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of 4,821 members</p>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Previous</button>
            <button className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitySection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Activity Feed</h2>
        <p className="text-sm text-muted-foreground">Real-time user actions across the platform</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Joins", "Upgrades", "Watches", "Purchases", "Posts", "Coach"].map(f => (
          <button key={f}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{ borderColor: f === "All" ? "#4DC820" : "#EAECF0", color: f === "All" ? "#4DC820" : "#475467", background: f === "All" ? "#F0FDE8" : "transparent" }}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {ACTIVITY.map(ev => (
          <div key={ev.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
            <ActivityIcon type={ev.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-bold">{ev.user}</span>
                <span className="text-muted-foreground"> {ev.action} </span>
                <span className="font-medium">{ev.detail}</span>
              </p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{ev.time}</span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button className="text-sm text-muted-foreground border border-border px-5 py-2 rounded-xl hover:bg-muted transition-colors">
          Load more events
        </button>
      </div>
    </div>
  );
}

function CoachApplicationsSection() {
  const [apps, setApps] = useState(COACH_APPLICATIONS);

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Coach Applications</h2>
          <p className="text-sm text-muted-foreground">{apps.filter(a => a.status === "pending").length} pending review</p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
             style={{ background: "#FFF0F3", color: "#A8001F", border: "1px solid #F8A3B1" }}>
          <AlertTriangle size={12} />
          {apps.filter(a => a.status === "pending").length} need action
        </div>
      </div>

      <div className="space-y-4">
        {apps.map(app => (
          <div key={app.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  {app.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground">{app.name}</p>
                    {app.status === "pending" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#FFF0F3", color: "#A8001F", border: "1px solid #F8A3B1" }}>
                        Pending
                      </span>
                    )}
                    {app.status === "approved" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
                        Approved
                      </span>
                    )}
                    {app.status === "rejected" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#F2F4F7", color: "#475467", border: "1px solid #EAECF0" }}>
                        Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{app.email}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">Specialty:</strong> {app.specialty}</span>
                    <span><strong className="text-foreground">Following:</strong> {app.followers}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong className="text-foreground">Experience:</strong> {app.experience}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Applied {app.applied}</p>
                </div>
              </div>

              {app.status === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateStatus(app.id, "approved")}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    style={{ background: "#FFF0F3", color: "#A8001F", border: "1px solid #F8A3B1" }}>
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Content Management</h2>
        <p className="text-sm text-muted-foreground">Manage curated content, creators, and platform videos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Videos", value: "2,847", icon: <Eye size={16} />, color: "#4DC820" },
          { label: "Active Creators", value: "13", icon: <Users size={16} />, color: "#00AEEF" },
          { label: "Avg Quality Score", value: "84.2", icon: <Star size={16} />, color: "#F79009" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: `${s.color}18`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Creator Performance</h3>
        <div className="space-y-3">
          {[
            { name: "Mark Minervini", videos: 4, views: "12.4K", score: 94 },
            { name: "tastytrade", videos: 5, views: "9.8K", score: 91 },
            { name: "SMB Capital", videos: 3, views: "8.2K", score: 88 },
            { name: "Earn Your Leisure", videos: 5, views: "7.6K", score: 86 },
            { name: "Real Vision", videos: 2, views: "6.9K", score: 85 },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                   style={{ background: `hsl(${(i * 60 + 120) % 360}, 60%, 40%)` }}>
                {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.videos} videos</span>
                    <span>{c.views} views</span>
                    <span className="font-bold" style={{ color: "#4DC820" }}>{c.score}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: "#4DC820" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Revenue</h2>
        <p className="text-sm text-muted-foreground">Platform revenue breakdown and coach payouts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Subscription Revenue", value: "$26,676", sub: "Pro + Elite", color: "#4DC820" },
          { label: "Coach Marketplace", value: "$8,240", sub: "20% platform cut", color: "#7B2FBE" },
          { label: "Total MRR", value: "$34,916", sub: "+12.4% MoM", color: "#00AEEF" },
          { label: "Coach Payouts", value: "$32,960", sub: "80% to coaches", color: "#F79009" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Coach Revenue Breakdown</h3>
        <div className="space-y-3">
          {[
            { name: "James Okafor", product: "Momentum Day Trading Masterclass", gross: "$2,625", payout: "$2,100", cut: "$525" },
            { name: "Carlos Rivera", product: "Crypto Macro Framework", gross: "$1,875", payout: "$1,500", cut: "$375" },
            { name: "Jordan Mills", product: "Options Flow Mastery", gross: "$1,250", payout: "$1,000", cut: "$250" },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                   style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                {c.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.product}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{c.gross} gross</p>
                <p className="text-xs" style={{ color: "#4DC820" }}>{c.payout} payout · <span style={{ color: "#98A2B3" }}>{c.cut} platform</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteControlsSection() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newUserSignups, setNewUserSignups] = useState(true);
  const [coachApplications, setCoachApplications] = useState(true);
  const [kaiEnabled, setKaiEnabled] = useState(true);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{ background: value ? "#4DC820" : "#D0D5DD" }}
    >
      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
            style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Site Controls</h2>
        <p className="text-sm text-muted-foreground">Platform-wide settings and feature flags</p>
      </div>

      {/* Feature flags */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feature Flags</p>
        </div>
        {[
          { label: "Maintenance Mode", desc: "Take the site offline for all non-admin users", value: maintenanceMode, onChange: () => setMaintenanceMode(v => !v), danger: true },
          { label: "New User Signups", desc: "Allow new users to create accounts", value: newUserSignups, onChange: () => setNewUserSignups(v => !v), danger: false },
          { label: "Coach Applications", desc: "Accept new coach tier applications", value: coachApplications, onChange: () => setCoachApplications(v => !v), danger: false },
          { label: "Kai AI Assistant", desc: "Enable the Kai chat widget for all users", value: kaiEnabled, onChange: () => setKaiEnabled(v => !v), danger: false },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Toggle value={item.value} onChange={item.onChange} />
          </div>
        ))}
      </div>

      {/* Pricing controls */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Pricing Tiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { tier: "Pro", price: "$29", billing: "/month", color: "#00AEEF" },
            { tier: "Elite", price: "$79", billing: "/month", color: "#7B2FBE" },
            { tier: "Annual Pro", price: "$249", billing: "/year", color: "#4DC820" },
          ].map((p, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">{p.tier}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${p.color}18`, color: p.color }}>Active</span>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: p.color }}>
                {p.price}<span className="text-sm text-muted-foreground font-normal">{p.billing}</span>
              </p>
              <button className="mt-3 w-full text-xs py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                Edit Price
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Send Platform Notification</h3>
        <div className="space-y-3">
          <input
            placeholder="Notification title..."
            className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors"
          />
          <textarea
            placeholder="Message body..."
            rows={3}
            className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors resize-none"
          />
          <div className="flex gap-3">
            <select className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none">
              <option>All Users</option>
              <option>Pro Members</option>
              <option>Elite Members</option>
              <option>Coaches</option>
            </select>
            <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
              <Bell size={13} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    members: <MembersSection />,
    activity: <ActivitySection />,
    coaches: <CoachApplicationsSection />,
    content: <ContentSection />,
    revenue: <RevenueSection />,
    controls: <SiteControlsSection />,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar active={activeSection} setActive={setActiveSection} />

      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                 style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4DC820] animate-pulse" />
              Live
            </div>
            <span className="text-xs text-muted-foreground">Last updated: just now</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {sections[activeSection]}
        </div>
      </main>
    </div>
  );
}
