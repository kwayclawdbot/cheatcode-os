// CheatCode OS — Top Navigation v4
// Mobile-first: hamburger menu + slide-out drawer on small screens
// Desktop: horizontal nav links
// Logo: 4 colored circles (red, cyan, purple, green) + "cheat" white + "code" gradient
// Primary CTA: cc-gradient-bg (green→yellow)
// Active nav: CC Green (#4DC820)
// Dark mode: sun/moon toggle via useTheme

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, Sun, Moon, Menu, X, ChevronRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/feed", label: "Feed", emoji: "📡" },
  { href: "/intelligence", label: "Intelligence", emoji: "🧠" },
  { href: "/topics", label: "Browse", emoji: "🎬" },
  { href: "/learn", label: "Learn", emoji: "📚" },
  { href: "/terminal", label: "Terminal", emoji: "📊" },
  { href: "/journal", label: "Journal", emoji: "📓" },
  { href: "/newsletter", label: "Newsletter", emoji: "✉️" },
  { href: "/pricing", label: "Pricing", emoji: "⚡" },
];

// The 4 logo circles — exact colors from the logo
function LogoIcon({ size = 28 }: { size?: number }) {
  const r = size * 0.18;
  const cx = size / 2;
  const cy = size / 2;
  const offset = size * 0.22;
  const strokeW = size * 0.055;
  const diamondSize = size * 0.09;

  const circles = [
    { cx: cx,          cy: cy - offset, color: "#E8193C" }, // top — red
    { cx: cx - offset, cy: cy,          color: "#00AEEF" }, // left — cyan
    { cx: cx + offset, cy: cy,          color: "#4DC820" }, // right — green
    { cx: cx,          cy: cy + offset, color: "#7B2FBE" }, // bottom — purple
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {circles.map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r={r} stroke={c.color} strokeWidth={strokeW} fill="none" />
          <rect
            x={c.cx - diamondSize / 2}
            y={c.cy - diamondSize / 2}
            width={diamondSize}
            height={diamondSize}
            fill={c.color}
            transform={`rotate(45 ${c.cx} ${c.cy})`}
          />
        </g>
      ))}
    </svg>
  );
}

export function Nav() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
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
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 flex-shrink-0">
                <LogoIcon size={28} />
                <div className="flex items-baseline gap-0">
                  <span
                    className="font-bold text-[16px] tracking-tight transition-colors duration-200"
                    style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}
                  >
                    cheat
                  </span>
                  <span
                    className="font-bold text-[16px] tracking-tight cc-gradient-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    code
                  </span>
                </div>
                <span
                  className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide transition-colors duration-200"
                  style={{
                    color: isDark ? "#98A2B3" : "#2B3245",
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#EAECF0",
                  }}
                >
                  OS
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1">
              {navLinks.slice(0, 7).map(({ href, label }) => (
                <Link key={href} href={href}>
                  <span
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap"
                    style={
                      location === href
                        ? { color: "#4DC820", backgroundColor: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8" }
                        : { color: isDark ? "#98A2B3" : "#475467" }
                    }
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Search */}
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ color: isDark ? "#98A2B3" : "#667085" }}
              >
                <Search size={17} />
              </button>

              {/* Notifications — hidden on mobile to save space */}
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

              {/* Dark / Light toggle */}
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

              {/* Go Pro CTA — desktop only */}
              <Link href="/pricing">
                <button className="hidden md:flex items-center gap-1.5 text-[#101828] text-sm font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                  Go Pro
                </button>
              </Link>

              {/* Avatar — desktop only */}
              <Link href="/traders/me">
                <div
                  className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "#2B3245" }}
                >
                  U
                </div>
              </Link>

              {/* Hamburger — mobile only */}
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

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
              style={{
                background: isDark ? "#1a2035" : "white",
                borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"}`,
              }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}
              >
                <div className="flex items-center gap-2">
                  <LogoIcon size={24} />
                  <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}>
                    cheat<span className="cc-gradient-text">code</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: isDark ? "#98A2B3" : "#667085" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* User row */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}
                >
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
                {navLinks.map(({ href, label, emoji }) => {
                  const isActive = location === href;
                  return (
                    <Link key={href} href={href}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all"
                        style={{
                          background: isActive
                            ? isDark ? "rgba(77,200,32,0.15)" : "#F0FDE8"
                            : "transparent",
                          color: isActive ? "#4DC820" : isDark ? "#D0D5DD" : "#344054",
                        }}
                      >
                        <span className="text-lg w-6 text-center">{emoji}</span>
                        <span className="font-semibold text-sm flex-1">{label}</span>
                        {isActive && <ChevronRight size={14} color="#4DC820" />}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom actions */}
              <div
                className="px-4 py-4 border-t flex flex-col gap-2"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0" }}
              >
                {/* Go Pro CTA */}
                <Link href="/pricing">
                  <button className="w-full py-3 rounded-xl font-bold text-sm cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity">
                    ⚡ Go Pro — Unlock Everything
                  </button>
                </Link>

                {/* Theme toggle row */}
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-semibold" style={{ color: isDark ? "#98A2B3" : "#667085" }}>
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: isDark ? "rgba(200,212,0,0.1)" : "#F2F4F7",
                      color: isDark ? "#C8D400" : "#667085",
                    }}
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    {isDark ? "Light" : "Dark"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Keep default export for backward compatibility
export default Nav;
