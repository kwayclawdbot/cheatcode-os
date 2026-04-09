// CheatCode OS — Navigation
// Menu structure:
//   Home | Community ▾ | Watch | Terminal | Learn ▾ | Intelligence ▾ | Journal
//   Community dropdown: Community Feed, Leaderboard
//   Learn dropdown: Courses, YouTube University, Coaches
//   Intelligence dropdown: Kai Analysis
// Mobile: hamburger slide-out drawer with collapsible sections (tap to expand)
// Dark mode: full support via useTheme

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, Sun, Moon, Menu, X, ChevronRight, ChevronDown, BookOpen, Trophy, Users, Lightbulb, Sparkles, LogIn, LogOut, PenLine, User } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useAssetClass, ASSET_CLASSES } from "@/contexts/AssetClassContext";

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem =
  | { type: "link"; href: string; label: string; emoji: string }
  | { type: "dropdown"; label: string; emoji: string; children: { href: string; label: string; description: string; icon: React.ReactNode }[] };

const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/home",        label: "Home",          emoji: "🏠" },
  {
    type: "dropdown",
    label: "Community",
    emoji: "💬",
    children: [
      {
        href: "/community",
        label: "Community Feed",
        description: "Posts, trade ideas & market takes from traders",
        icon: <Users size={16} />,
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        description: "Top traders ranked by XP, win rate & P&L",
        icon: <Trophy size={16} />,
      },
    ],
  },
  { type: "link", href: "/topics",      label: "Watch",         emoji: "▶️" },
  { type: "link", href: "/terminal",    label: "War Room",      emoji: "📊" },
  {
    type: "dropdown",
    label: "Learn",
    emoji: "📚",
    children: [
      // Courses hidden until we ship our first one — keep YT University +
      // Coaches Corner only.
      {
        href: "/learn/university",
        label: "YouTube University",
        description: "Top trading education videos organized by topic & skill level",
        icon: <Trophy size={16} />,
      },
      {
        href: "/coaches-corner",
        label: "Coaches",
        description: "1-on-1 sessions, courses & coaching programs",
        icon: <Users size={16} />,
      },
    ],
  },
  // Promoted from Intelligence sub-menu — Kai is the headline product.
  { type: "link", href: "/intelligence", label: "Analyze",       emoji: "🧠" },
  { type: "link", href: "/journal",      label: "Connect",       emoji: "🤝" },
];

// Mobile drawer sections — with collapsible groups
interface MobileSection {
  type: "link";
  href: string;
  label: string;
  emoji: string;
  group?: string;
}

interface MobileGroup {
  type: "group";
  label: string;
  emoji: string;
  children: { href: string; label: string; emoji: string }[];
}

type MobileEntry = MobileSection | MobileGroup;

const MOBILE_ENTRIES: MobileEntry[] = [
  { type: "link", href: "/home",        label: "Home",      emoji: "🏠" },
  {
    type: "group",
    label: "Community",
    emoji: "💬",
    children: [
      { href: "/community",   label: "Feed",        emoji: "💬" },
      { href: "/leaderboard", label: "Leaderboard", emoji: "🏅" },
    ],
  },
  { type: "link", href: "/topics",    label: "Watch",      emoji: "▶️" },
  { type: "link", href: "/terminal",  label: "War Room",   emoji: "📊" },
  {
    type: "group",
    label: "Learn",
    emoji: "📚",
    children: [
      { href: "/learn/university",  label: "YouTube University", emoji: "🎬" },
      { href: "/coaches-corner",    label: "Coaches",            emoji: "🏆" },
    ],
  },
  { type: "link", href: "/intelligence", label: "Analyze", emoji: "🧠" },
  { type: "link", href: "/journal",      label: "Connect", emoji: "🤝" },
  { type: "link", href: "/pricing",      label: "Pricing", emoji: "⚡" },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function LogoIcon({ size = 28 }: { size?: number }) {
  const r = size * 0.18;
  const cx = size / 2;
  const cy = size / 2;
  const offset = size * 0.22;
  const strokeW = size * 0.055;
  const diamondSize = size * 0.09;
  const circles = [
    { cx: cx,          cy: cy - offset, color: "#E8193C" },
    { cx: cx - offset, cy: cy,          color: "#00AEEF" },
    { cx: cx + offset, cy: cy,          color: "#4DC820" },
    { cx: cx,          cy: cy + offset, color: "#7B2FBE" },
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {circles.map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r={r} stroke={c.color} strokeWidth={strokeW} fill="none" />
          <rect
            x={c.cx - diamondSize / 2} y={c.cy - diamondSize / 2}
            width={diamondSize} height={diamondSize}
            fill={c.color} transform={`rotate(45 ${c.cx} ${c.cy})`}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── XP Level helper ──────────────────────────────────────────────────────────

function getNavLevel(xp: number) {
  if (xp >= 50000) return { name: "Legend",  color: "#E8193C", emoji: "🔴" };
  if (xp >= 20000) return { name: "Elite",   color: "#C8D400", emoji: "⭐" };
  if (xp >= 10000) return { name: "Expert",  color: "#00AEEF", emoji: "💎" };
  if (xp >= 5000)  return { name: "Veteran", color: "#7B2FBE", emoji: "🟣" };
  if (xp >= 2000)  return { name: "Pro",     color: "#4DC820", emoji: "🟢" };
  if (xp >= 500)   return { name: "Trader",  color: "#F79009", emoji: "🟡" };
  return                  { name: "Rookie",  color: "#667085", emoji: "⚪" };
}

// ─── Desktop Dropdown ─────────────────────────────────────────────────────────

function DesktopDropdown({
  item,
  isOpen,
  onToggle,
  isDark,
}: {
  item: Extract<NavItem, { type: "dropdown" }>;
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const isActive = item.children.some(c => location === c.href);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          color: isActive || isOpen
            ? "#4DC820"
            : isDark ? "#D0D5DD" : "#344054",
          background: isActive || isOpen
            ? isDark ? "rgba(77,200,32,0.08)" : "rgba(77,200,32,0.06)"
            : "transparent",
        }}
      >
        {item.label}
        <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-64 rounded-xl shadow-xl border overflow-hidden z-50"
            style={{
              background: isDark ? "#1a2035" : "white",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0",
            }}
          >
            {item.children.map(child => {
              const isChildActive = location === child.href;
              return (
                <Link key={child.href} href={child.href}>
                  <div
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={onToggle}
                    style={{
                      background: isChildActive
                        ? isDark ? "rgba(77,200,32,0.08)" : "rgba(77,200,32,0.06)"
                        : "transparent",
                    }}
                  >
                    <div className="mt-0.5 flex-shrink-0"
                         style={{ color: isChildActive ? "#4DC820" : isDark ? "#667085" : "#98A2B3" }}>
                      {child.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold"
                         style={{ color: isChildActive ? "#4DC820" : isDark ? "#F9FAFB" : "#101828" }}>
                        {child.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {child.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Group (collapsible) ───────────────────────────────────────────────

function MobileGroupItem({
  group,
  isDark,
  onNavigate,
}: {
  group: MobileGroup;
  isDark: boolean;
  onNavigate: () => void;
}) {
  const [location] = useLocation();
  const isAnyActive = group.children.some(c => location === c.href);
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-colors"
        style={{
          background: isAnyActive
            ? isDark ? "rgba(77,200,32,0.08)" : "#F0FDE8"
            : "transparent",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-base">{group.emoji}</span>
        <span className="font-semibold text-sm flex-1 text-left"
              style={{ color: isAnyActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054" }}>
          {group.label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          style={{ color: isDark ? "#667085" : "#98A2B3" }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {group.children.map(child => {
              const isActive = location === child.href;
              return (
                <Link key={child.href} href={child.href}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 ml-4 transition-colors cursor-pointer"
                    style={{
                      background: isActive
                        ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                        : "transparent",
                    }}
                    onClick={onNavigate}
                  >
                    <span className="text-sm">{child.emoji}</span>
                    <span className="font-medium text-sm"
                          style={{ color: isActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054" }}>
                      {child.label}
                    </span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4DC820] ml-auto" />}
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Nav ─────────────────────────────────────────────────────────────────

export function Nav() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { user, isAuthenticated, signOut } = useAuth();
  const [location] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const { selected, isAll, toggle, selectAll, isSelected } = useAssetClass();

  const userXP = (user as any)?.xp || 0;
  const navLevel = getNavLevel(userXP);
  const userName = (user as any)?.name || (user as any)?.displayName || (user as any)?.user_metadata?.full_name || null;
  const userInitial = userName
    ? (userName as string).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const userHandle = userName || "Guest";

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: isDark ? "rgba(16,24,40,0.97)" : "rgba(255,255,255,0.97)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "#EAECF0",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="container mx-auto">
          <div className="flex items-center gap-2 h-14">
            {/* Logo */}
            <Link href="/home">
              <div className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <LogoIcon size={26} />
                <div className="flex items-baseline gap-0">
                  <span
                    className="font-black text-[15px] tracking-tight"
                    style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}
                  >
                    cheat
                  </span>
                  <span
                    className="font-black text-[15px] tracking-tight cc-gradient-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    code
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#2B3245] bg-[#F2F4F7] px-1.5 py-0.5 rounded-md border border-[#EAECF0] tracking-wide">
                  OS
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-4 flex-1">
              {NAV_ITEMS.map(item => {
                if (item.type === "link") {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        data-tour={item.label === "Watch" ? "nav-watch" : item.label === "Community" ? "nav-community" : undefined}
                        className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                        style={{
                          color: isActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054",
                          background: isActive
                            ? isDark ? "rgba(77,200,32,0.08)" : "rgba(77,200,32,0.06)"
                            : "transparent",
                        }}
                      >
                        {item.label}
                      </button>
                    </Link>
                  );
                }
                return (
                  <DesktopDropdown
                    key={item.label}
                    item={item}
                    isOpen={openDropdown === item.label}
                    onToggle={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    isDark={isDark}
                  />
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-muted"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <Link href="/pricing">
                <button className="hidden md:flex items-center gap-1.5 text-[#101828] text-sm font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                  Go Pro
                </button>
              </Link>

              {isAuthenticated ? (
                <div className="relative hidden sm:block" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(v => !v)}
                    className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                    title={`${navLevel.name} · ${userXP.toLocaleString()} XP`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
                    >
                      {userInitial}
                    </div>
                    <span className="text-[8px] font-bold leading-none" style={{ color: navLevel.color }}>{navLevel.name}</span>
                  </button>
                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-lg z-50 overflow-hidden"
                      style={{
                        background: isDark ? "#1a2035" : "white",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#EAECF0",
                      }}
                    >
                      <Link href="/traders/me" onClick={() => setUserDropdownOpen(false)}>
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                          <User size={14} style={{ color: isDark ? "#98A2B3" : "#667085" }} />
                          <span className="text-sm font-medium" style={{ color: isDark ? "#D0D5DD" : "#344054" }}>My Profile</span>
                        </div>
                      </Link>
                      <div className="border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }} />
                      <button
                        onClick={() => { setUserDropdownOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={14} className="text-red-400" />
                        <span className="text-sm font-medium text-red-400">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth">
                  <button
                    className="hidden sm:flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                    style={{ color: isDark ? "#D0D5DD" : "#344054" }}
                  >
                    <LogIn size={14} />
                    Sign In
                  </button>
                </Link>
              )}

              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Asset Class Filter Bar */}
      <div
        className="sticky z-40 border-b"
        style={{
          top: 56,
          backgroundColor: isDark ? "rgba(26,32,53,0.95)" : "rgba(255,255,255,0.95)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "#EAECF0",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="container mx-auto">
          <div className="flex items-center gap-1.5 h-9 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => selectAll()}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150"
              style={{
                background: isAll ? "rgba(77,200,32,0.15)" : "transparent",
                color: isAll ? "#4DC820" : isDark ? "#667085" : "#98A2B3",
                border: isAll ? "1px solid rgba(77,200,32,0.3)" : "1px solid transparent",
              }}
            >
              All Markets
            </button>
            {ASSET_CLASSES.map(ac => (
              <button
                key={ac.id}
                onClick={() => toggle(ac.id)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150"
                style={{
                  background: isSelected(ac.id) ? `${ac.color}20` : "transparent",
                  color: isSelected(ac.id) ? ac.color : isDark ? "#667085" : "#98A2B3",
                  border: isSelected(ac.id) ? `1px solid ${ac.color}40` : "1px solid transparent",
                }}
              >
                <span>{ac.emoji}</span>
                {ac.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
              style={{
                background: isDark ? "#1a2035" : "white",
                borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b"
                   style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}>
                <div className="flex items-center gap-2">
                  <LogoIcon size={24} />
                  <div className="flex items-baseline gap-0">
                    <span className="font-black text-base tracking-tight" style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}>cheat</span>
                    <span className="font-black text-base tracking-tight cc-gradient-text" style={{ fontFamily: "var(--font-display)" }}>code</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2B3245] bg-[#F2F4F7] px-1.5 py-0.5 rounded-md border border-[#EAECF0] tracking-wide">OS</span>
                </div>
                <button onClick={() => setMobileOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                  <X size={20} />
                </button>
              </div>

              {/* User row */}
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                   style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: isDark ? "#F9FAFB" : "#101828" }}>{userHandle}</p>
                  <p className="text-xs truncate font-semibold" style={{ color: navLevel.color }}>
                    {navLevel.emoji} {navLevel.name} · {userXP.toLocaleString()} XP
                  </p>
                </div>
                <Link href="/traders/me">
                  <ChevronRight size={16} style={{ color: isDark ? "#98A2B3" : "#667085" }} />
                </Link>
              </div>

              {/* Nav links — collapsible groups */}
              <nav className="flex-1 overflow-y-auto px-3 py-3">
                {MOBILE_ENTRIES.map((entry, i) => {
                  if (entry.type === "link") {
                    const isActive = location === entry.href;
                    return (
                      <Link key={entry.href} href={entry.href}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-colors cursor-pointer"
                          style={{
                            background: isActive
                              ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                              : "transparent",
                          }}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="text-base">{entry.emoji}</span>
                          <span className="font-semibold text-sm flex-1"
                                style={{ color: isActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054" }}>
                            {entry.label}
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4DC820]" />}
                        </div>
                      </Link>
                    );
                  }
                  // Group
                  return (
                    <MobileGroupItem
                      key={entry.label}
                      group={entry}
                      isDark={isDark}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  );
                })}
              </nav>

              {/* Bottom CTA */}
              <div className="px-4 py-4 border-t space-y-2"
                   style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}>
                <Link href="/pricing">
                  <button className="w-full py-2.5 rounded-xl cc-gradient-bg text-[#101828] font-bold text-sm hover:opacity-90 transition-opacity">
                    Go Pro ⚡
                  </button>
                </Link>
                {isAuthenticated ? (
                  <button
                    onClick={() => { setMobileOpen(false); signOut(); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                ) : (
                  <Link href="/auth" onClick={() => setMobileOpen(false)}>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                      style={{ color: isDark ? "#D0D5DD" : "#344054" }}
                    >
                      <LogIn size={15} />
                      Sign In
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
