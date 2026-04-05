// CheatCode OS — Coach Dashboard
// Design: Dark sidebar layout matching Admin, CC green accents, data-dense
// Sections: Overview, Products, 1-on-1 Sessions, Students, Revenue, Settings

import { useState } from "react";
import { Link } from "wouter";
import {
  BarChart2, DollarSign, Users, Calendar, Package, Settings,
  ChevronRight, Plus, Star, Clock, CheckCircle, ArrowUpRight,
  Home, Award, MessageSquare, BookOpen, Zap, MoreHorizontal,
  TrendingUp, Edit, Trash2, Eye, Video, Play, ArrowRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  type: "course" | "1on1" | "community" | "alerts";
  title: string;
  price: number;
  students: number;
  revenue: number;
  rating: number;
  status: "live" | "draft" | "paused";
}

interface Session {
  id: string;
  student: string;
  date: string;
  time: string;
  duration: number;
  type: "30min" | "60min";
  status: "upcoming" | "completed" | "cancelled";
  price: number;
}

interface Student {
  id: string;
  name: string;
  joined: string;
  product: string;
  progress: number;
  lastActive: string;
  totalSpent: number;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: "1", type: "course", title: "Momentum Day Trading Masterclass", price: 197, students: 84, revenue: 16548, rating: 4.9, status: "live" },
  { id: "2", type: "1on1", title: "1-on-1 Coaching Session (60 min)", price: 149, students: 31, revenue: 4619, rating: 5.0, status: "live" },
  { id: "3", type: "community", title: "Elite Traders Inner Circle", price: 49, students: 127, revenue: 6223, rating: 4.8, status: "live" },
  { id: "4", type: "alerts", title: "Daily Trade Alerts & Watchlist", price: 29, students: 203, revenue: 5887, rating: 4.7, status: "live" },
  { id: "5", type: "course", title: "Options Flow for Day Traders", price: 147, students: 0, revenue: 0, rating: 0, status: "draft" },
];

const SESSIONS: Session[] = [
  { id: "1", student: "Marcus Williams", date: "Apr 7, 2026", time: "10:00 AM EST", duration: 60, type: "60min", status: "upcoming", price: 149 },
  { id: "2", student: "Sarah Chen", date: "Apr 7, 2026", time: "2:00 PM EST", duration: 30, type: "30min", status: "upcoming", price: 75 },
  { id: "3", student: "Tyler Ross", date: "Apr 5, 2026", time: "11:00 AM EST", duration: 60, type: "60min", status: "completed", price: 149 },
  { id: "4", student: "Priya Patel", date: "Apr 4, 2026", time: "3:00 PM EST", duration: 30, type: "30min", status: "completed", price: 75 },
  { id: "5", student: "Kevin Zhang", date: "Apr 3, 2026", time: "9:00 AM EST", duration: 60, type: "60min", status: "cancelled", price: 149 },
];

const STUDENTS: Student[] = [
  { id: "1", name: "Marcus Williams", joined: "Mar 15, 2026", product: "Momentum Day Trading Masterclass", progress: 68, lastActive: "2 hours ago", totalSpent: 297 },
  { id: "2", name: "Sarah Chen", joined: "Feb 28, 2026", product: "Elite Traders Inner Circle", progress: 100, lastActive: "5 min ago", totalSpent: 444 },
  { id: "3", name: "Tyler Ross", joined: "Jan 10, 2026", product: "Momentum Day Trading Masterclass", progress: 92, lastActive: "Yesterday", totalSpent: 197 },
  { id: "4", name: "Amanda Flores", joined: "Mar 22, 2026", product: "Daily Trade Alerts & Watchlist", progress: 45, lastActive: "4 hours ago", totalSpent: 87 },
  { id: "5", name: "Kevin Zhang", joined: "Apr 1, 2026", product: "Momentum Day Trading Masterclass", progress: 12, lastActive: "Just now", totalSpent: 197 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    course:    { label: "Course", color: "#005F8A", bg: "#E8F8FF", border: "#7FDBF8" },
    "1on1":    { label: "1-on-1", color: "#5B1FA0", bg: "#F5EEFF", border: "#C4A0F0" },
    community: { label: "Community", color: "#7A6800", bg: "#FAFDE8", border: "#E8F08A" },
    alerts:    { label: "Alerts", color: "#A8001F", bg: "#FFF0F3", border: "#F8A3B1" },
  };
  const m = map[type] || map.course;
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ background: m.bg, color: m.color, borderColor: m.border }}>
      {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    live:      { color: "#2E7A10", bg: "#F0FDE8" },
    draft:     { color: "#475467", bg: "#F2F4F7" },
    paused:    { color: "#7A6800", bg: "#FAFDE8" },
    upcoming:  { color: "#005F8A", bg: "#E8F8FF" },
    completed: { color: "#2E7A10", bg: "#F0FDE8" },
    cancelled: { color: "#A8001F", bg: "#FFF0F3" },
  };
  const m = map[status] || map.draft;
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
          style={{ background: m.bg, color: m.color }}>
      {status}
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: <BarChart2 size={16} /> },
  { id: "products", label: "My Products", icon: <Package size={16} /> },
  { id: "sessions", label: "1-on-1 Sessions", icon: <Calendar size={16} /> },
  { id: "students", label: "Students", icon: <Users size={16} /> },
  { id: "revenue", label: "Revenue", icon: <DollarSign size={16} /> },
  { id: "settings", label: "Profile & Settings", icon: <Settings size={16} /> },
];

function CoachSidebar({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r"
           style={{ background: "#0F1623", borderColor: "rgba(255,255,255,0.08)", minHeight: "100vh" }}>
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
            <Award size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Coach Hub</p>
            <p className="text-[10px]" style={{ color: "#475467" }}>James Okafor</p>
          </div>
        </div>
      </div>

      {/* Coach badge */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
           style={{ background: "rgba(77,200,32,0.12)", border: "1px solid rgba(77,200,32,0.2)" }}>
        <Award size={12} style={{ color: "#4DC820" }} />
        <span className="text-xs font-semibold" style={{ color: "#4DC820" }}>Verified Coach</span>
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
  const totalRevenue = PRODUCTS.reduce((s, p) => s + p.revenue, 0);
  const myPayout = Math.round(totalRevenue * 0.8);
  const totalStudents = PRODUCTS.reduce((s, p) => s + p.students, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Welcome back, James 👋
        </h2>
        <p className="text-sm text-muted-foreground">Here's how your coaching business is performing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, sub: "All time", icon: <DollarSign size={16} />, color: "#4DC820" },
          { label: "Your Payout (80%)", value: `$${myPayout.toLocaleString()}`, sub: "All time", icon: <TrendingUp size={16} />, color: "#7B2FBE" },
          { label: "Total Students", value: totalStudents.toString(), sub: "Across all products", icon: <Users size={16} />, color: "#00AEEF" },
          { label: "Avg Rating", value: "4.85", sub: "From 445 reviews", icon: <Star size={16} />, color: "#F79009" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: `${s.color}18`, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Revenue — Last 30 Days</h3>
          <span className="text-xs font-semibold" style={{ color: "#4DC820" }}>
            <ArrowUpRight size={12} className="inline" /> +22% vs last month
          </span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {[30, 45, 38, 62, 55, 70, 48, 65, 72, 58, 80, 68, 75, 85, 71, 90, 78, 88, 95, 82, 91, 87, 96, 84, 93, 89, 97, 92, 99, 100].map((h, i) => (
            <div key={i} className="flex-1 rounded-t"
                 style={{ height: `${h}%`, background: i >= 27 ? "#4DC820" : "#EAECF0" }} />
          ))}
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Upcoming Sessions</h3>
          <span className="text-xs text-muted-foreground">{SESSIONS.filter(s => s.status === "upcoming").length} scheduled</span>
        </div>
        <div className="space-y-3">
          {SESSIONS.filter(s => s.status === "upcoming").map(session => (
            <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl border border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: "#E8F8FF", color: "#005F8A" }}>
                <Calendar size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{session.student}</p>
                <p className="text-xs text-muted-foreground">{session.date} · {session.time} · {session.duration} min</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">${session.price}</p>
                <StatusBadge status={session.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>My Products</h2>
          <p className="text-sm text-muted-foreground">{PRODUCTS.filter(p => p.status === "live").length} live · {PRODUCTS.filter(p => p.status === "draft").length} draft</p>
        </div>
        <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          <Plus size={14} /> New Product
        </button>
      </div>

      <div className="space-y-4">
        {PRODUCTS.map(product => (
          <div key={product.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: product.status === "live" ? "#F0FDE8" : "#F2F4F7", color: product.status === "live" ? "#4DC820" : "#98A2B3" }}>
                  {product.type === "course" ? <BookOpen size={18} /> : product.type === "1on1" ? <Calendar size={18} /> : product.type === "community" ? <Users size={18} /> : <Zap size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-foreground">{product.title}</p>
                    <ProductTypeBadge type={product.type} />
                    <StatusBadge status={product.status} />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">${product.price}/unit</span>
                    <span>{product.students} students</span>
                    {product.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={10} style={{ color: "#F79009" }} fill="#F79009" />
                        {product.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {product.revenue > 0 ? `$${product.revenue.toLocaleString()}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">gross revenue</p>
                {product.revenue > 0 && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "#4DC820" }}>
                    ${Math.round(product.revenue * 0.8).toLocaleString()} yours
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <Edit size={12} /> Edit
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <Eye size={12} /> Preview
              </button>
              {product.status === "live" && (
                <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                  <MessageSquare size={12} /> Reviews
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsSection() {
  const [tab, setTab] = useState<"upcoming" | "completed" | "all">("upcoming");
  const filtered = tab === "all" ? SESSIONS : SESSIONS.filter(s => s.status === tab);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>1-on-1 Sessions</h2>
          <p className="text-sm text-muted-foreground">{SESSIONS.filter(s => s.status === "upcoming").length} upcoming sessions</p>
        </div>
        <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          <Calendar size={14} /> Manage Availability
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["upcoming", "completed", "all"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className="text-sm px-4 py-2 rounded-xl border capitalize transition-colors"
                  style={{
                    borderColor: tab === t ? "#4DC820" : "#EAECF0",
                    color: tab === t ? "#4DC820" : "#475467",
                    background: tab === t ? "#F0FDE8" : "transparent",
                    fontWeight: tab === t ? 600 : 400,
                  }}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {filtered.map(session => (
          <div key={session.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: session.status === "upcoming" ? "#E8F8FF" : session.status === "completed" ? "#F0FDE8" : "#FFF0F3",
                          color: session.status === "upcoming" ? "#005F8A" : session.status === "completed" ? "#2E7A10" : "#A8001F" }}>
              <Calendar size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{session.student}</p>
              <p className="text-xs text-muted-foreground">{session.date} · {session.time} · {session.duration} min</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={session.status} />
              <span className="text-sm font-bold text-foreground">${session.price}</span>
              {session.status === "upcoming" && (
                <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cc-gradient-bg text-[#101828]">
                  <Video size={12} /> Join
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Students</h2>
        <p className="text-sm text-muted-foreground">{STUDENTS.length} shown · 445 total</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Student</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Last Active</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Spent</th>
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s, i) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                         style={{ background: `hsl(${(i * 47 + 120) % 360}, 60%, 45%)` }}>
                      {s.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Joined {s.joined}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                  <p className="truncate">{s.product}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: s.progress === 100 ? "#4DC820" : "#00AEEF" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{s.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{s.lastActive}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">${s.totalSpent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueSection() {
  const totalGross = PRODUCTS.reduce((s, p) => s + p.revenue, 0);
  const myPayout = Math.round(totalGross * 0.8);
  const platformFee = totalGross - myPayout;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Revenue</h2>
        <p className="text-sm text-muted-foreground">Your earnings breakdown and payout history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Gross Revenue", value: `$${totalGross.toLocaleString()}`, color: "#4DC820", sub: "All time" },
          { label: "Your Payout (80%)", value: `$${myPayout.toLocaleString()}`, color: "#7B2FBE", sub: "All time" },
          { label: "Platform Fee (20%)", value: `$${platformFee.toLocaleString()}`, color: "#98A2B3", sub: "All time" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue by product */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Revenue by Product</h3>
        <div className="space-y-4">
          {PRODUCTS.filter(p => p.revenue > 0).map(product => (
            <div key={product.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <ProductTypeBadge type={product.type} />
                  <span className="text-sm text-foreground truncate max-w-[200px]">{product.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">${product.revenue.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-2">gross</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(product.revenue / totalGross) * 100}%`, background: "linear-gradient(90deg, #4DC820, #C8D400)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout schedule */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Payout Schedule</h3>
        <div className="space-y-3">
          {[
            { date: "Apr 1, 2026", amount: "$2,840", status: "paid" },
            { date: "Mar 1, 2026", amount: "$2,410", status: "paid" },
            { date: "Feb 1, 2026", amount: "$1,980", status: "paid" },
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{p.date}</p>
                <p className="text-xs text-muted-foreground">Monthly payout via Stripe</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground">{p.amount}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#F0FDE8", color: "#2E7A10" }}>
                  <CheckCircle size={10} className="inline mr-1" />Paid
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Next payout</p>
            <p className="text-xs text-muted-foreground">May 1, 2026 · estimated</p>
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "#4DC820" }}>~$3,200</p>
        </div>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Profile & Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your public coach profile and account settings</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Public Profile</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
               style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
            JO
          </div>
          <button className="text-sm font-medium px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors">
            Change Photo
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Display Name</label>
            <input defaultValue="James Okafor" className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Handle</label>
            <input defaultValue="@jamesokafor" className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Bio</label>
          <textarea defaultValue="Prop trader with 8+ years experience. Specializing in momentum day trading and options flow. Former SMB Capital trader." rows={3}
                    className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors resize-none" />
        </div>
        <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Payout Settings</h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <DollarSign size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Stripe Connect</p>
              <p className="text-xs text-muted-foreground">Payouts every 1st of the month</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    products: <ProductsSection />,
    sessions: <SessionsSection />,
    students: <StudentsSection />,
    revenue: <RevenueSection />,
    settings: <SettingsSection />,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar active={activeSection} setActive={setActiveSection} />

      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Coach Hub</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                 style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
              <Award size={11} />
              Verified Coach
            </div>
            <Link href="/coaches-corner">
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
                <Eye size={12} /> View Public Profile
              </button>
            </Link>
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
