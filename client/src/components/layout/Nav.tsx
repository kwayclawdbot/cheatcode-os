// CheatCode OS — Top Navigation v6
// Menu structure:
//   Home | Community ▾ | Analyze | Watch | Learn ▾ | Trade | Assist
//   Community dropdown: Community Feed, Ideas
//   Learn dropdown: Courses, Coaches
// Mobile: hamburger slide-out drawer with same hierarchy
// Dark mode: full support via useTheme

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, Sun, Moon, Menu, X, ChevronRight, ChevronDown, BookOpen, Trophy, Users, Lightbulb, Sparkles, LogIn } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem =
  | { type: "link"; href: string; label: string; emoji: string }
  | { type: "dropdown"; label: string; emoji: string; children: { href: string; label: string; description: string; icon: React.ReactNode }[] };

const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/home",        label: "Home",      emoji: "🏠" },
  {
    type: "dropdown",
    label: "Community",
    emoji: "💬",
    children: [
      {
        href: "/community",
        label: "Community Feed",
        description: "Discuss markets, share setups & connect with traders",
        icon: <Users size={16} />,
      },
      {
        href: "/feed",
        label: "Ideas",
        description: "Swipe through trade ideas & market calls",
        icon: <Lightbulb size={16} />,
      },
    ],
  },
  { type: "link", href: "/intelligence",label: "Analyze",   emoji: "🧠" },
  { type: "link", href: "/topics",      label: "Watch",     emoji: "🎬" },
  {
    type: "dropdown",
    label: "Learn",
    emoji: "📚",
    children: [
      {
        href: "/learn",
        label: "Courses",
        description: "Structured learning paths & skill tracks",
        icon: <BookOpen size={16} />,
      },
      {
        href: "/coaches-corner",
        label: "Coaches",
        description: "1-on-1 sessions, courses & coaching programs",
        icon: <Trophy size={16} />,
      },
    ],
  },
  { type: "link", href: "/terminal",    label: "Trade",     emoji: "📊" },
  { type: "link", href: "/assist",      label: "Assist",    emoji: "✨" },
];

// All links flattened for mobile drawer
const ALL_MOBILE_LINKS = [
  { href: "/home",          label: "Home",            emoji: "🏠" },
  { href: "/community",     label: "Community Feed",  emoji: "💬" },
  { href: "/feed",          label: "Ideas",           emoji: "🃏", indent: true },
  { href: "/intelligence",  label: "Analyze",         emoji: "🧠" },
  { href: "/topics",        label: "Watch",           emoji: "🎬" },
  { href: "/learn",         label: "Courses",         emoji: "📖", indent: true },
  { href: "/coaches-corner",label: "Coaches",         emoji: "🏆", indent: true },
  { href: "/terminal",      label: "Trade",           emoji: "📊" },
  { href: "/assist",        label: "Assist",          emoji: "✨" },
  { href: "/journal",       label: "Journal",         emoji: "📓" },
  { href: "/newsletter",    label: "Newsletter",      emoji: "✉️" },
  { href: "/pricing",       label: "Pricing",         emoji: "⚡" },
  { href: "/admin",         label: "Admin",           emoji: "⚙️" },
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

// ─── Learn Dropdown ───────────────────────────────────────────────────────────

function LearnDropdown({
  item, isDark, location
}: {
  item: Extract<NavItem, { type: "dropdown" }>;
  isDark: boolean;
  location: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = item.children.some(c => location === c.href);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap"
        style={
          isActive || open
            ? { color: "#4DC820", backgroundColor: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8" }
            : { color: isDark ? "#98A2B3" : "#475467" }
        }
      >
        {item.label}
        <ChevronDown
          size={13}
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 w-64 rounded-2xl shadow-xl border overflow-hidden z-50"
            style={{
              background: isDark ? "#1a2035" : "white",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#EAECF0",
            }}
          >
            <div className="p-2">
              {item.children.map(child => (
                <Link key={child.href} href={child.href} onClick={() => setOpen(false)}>
                  <div
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                    style={{
                      background: location === child.href
                        ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                        : "transparent",
                    }}
                    onMouseEnter={e => {
                      if (location !== child.href)
                        (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB";
                    }}
                    onMouseLeave={e => {
                      if (location !== child.href)
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: location === child.href
                          ? isDark ? "rgba(77,200,32,0.2)" : "#D1FAE5"
                          : isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
                        color: location === child.href ? "#4DC820" : isDark ? "#98A2B3" : "#667085",
                      }}
                    >
                      {child.icon}
                    </div>
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: location === child.href ? "#4DC820" : isDark ? "#F9FAFB" : "#101828" }}
                      >
                        {child.label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: isDark ? "#667085" : "#98A2B3" }}>
                        {child.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Nav ─────────────────────────────────────────────────────────────────

export function Nav() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const userHandle = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "My Profile";

  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b transition-colors duration-200"
        style={{
          backgroundColor: isDark ? "#1a2035" : "white",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="container mx-auto">
          <div className="flex items-center h-14 gap-4">

            {/* Logo → landing page */}
            <Link href="/">
              <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer">
                <LogoIcon size={28} />
                <div className="flex items-baseline gap-0">
                  <span className="font-bold text-[16px] tracking-tight transition-colors duration-200"
                        style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}>
                    cheat
                  </span>
                  <span className="font-bold text-[16px] tracking-tight cc-gradient-text"
                        style={{ fontFamily: "var(--font-display)" }}>
                    code
                  </span>
                </div>
                <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide transition-colors duration-200"
                      style={{
                        color: isDark ? "#98A2B3" : "#2B3245",
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#EAECF0",
                      }}>
                  OS
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1">
              {NAV_ITEMS.map((item) => {
                if (item.type === "link") {
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer"
                        style={
                          (location === item.href || (item.href === "/home" && location === "/"))
                            ? { color: "#4DC820", backgroundColor: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8" }
                            : { color: isDark ? "#98A2B3" : "#475467" }
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                }
                return (
                  <LearnDropdown key={item.label} item={item} isDark={isDark} location={location} />
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
              >
                <Search size={17} />
              </button>

              <button
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg transition-colors duration-150 relative"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
              >
                <Bell size={17} />
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                  style={{ backgroundColor: "#4DC820", borderColor: isDark ? "#1a2035" : "white" }}
                />
              </button>

              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  color: isDark ? "#C8D400" : "#667085",
                  backgroundColor: isDark ? "rgba(200,212,0,0.1)" : "transparent",
                }}
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <Link href="/pricing">
                <button className="hidden md:flex items-center gap-1.5 text-[#101828] text-sm font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                  Go Pro
                </button>
              </Link>

              {isAuthenticated ? (
                <Link href="/traders/me">
                  <div
                    className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
                  >
                    {userInitial}
                  </div>
                </Link>
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
                  <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}>
                    cheat<span className="cc-gradient-text">code</span>
                  </span>
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
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: isDark ? "#F9FAFB" : "#101828" }}>My Profile</p>
                  <p className="text-xs truncate" style={{ color: isDark ? "#98A2B3" : "#667085" }}>Rookie · 0 XP</p>
                </div>
                <Link href="/traders/me">
                  <ChevronRight size={16} style={{ color: isDark ? "#98A2B3" : "#667085" }} />
                </Link>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-3 py-3">
                {/* Learn section header */}
                {ALL_MOBILE_LINKS.map(({ href, label, emoji, indent }) => {
                  const isActive = location === href;
                  const isLearnHeader = label === "Courses";
                  return (
                    <div key={href}>
                      {isLearnHeader && (
                        <p className="text-[10px] font-bold uppercase tracking-widest px-3 pt-3 pb-1"
                           style={{ color: isDark ? "#475467" : "#98A2B3" }}>
                          Learn
                        </p>
                      )}
                      <Link href={href}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-colors cursor-pointer"
                          style={{
                            background: isActive
                              ? isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8"
                              : "transparent",
                            paddingLeft: indent ? "2rem" : undefined,
                          }}
                        >
                          <span className="text-base">{emoji}</span>
                          <span className="font-semibold text-sm flex-1"
                                style={{ color: isActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054" }}>
                            {label}
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4DC820]" />}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </nav>

              {/* Bottom CTA */}
              <div className="px-4 py-4 border-t"
                   style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}>
                <Link href="/pricing">
                  <button className="w-full py-2.5 rounded-xl cc-gradient-bg text-[#101828] font-bold text-sm hover:opacity-90 transition-opacity">
                    Go Pro ⚡
                  </button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
