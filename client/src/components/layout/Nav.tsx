// CheatCode OS — Top Navigation v3
// Logo: 4 colored circles (red, cyan, purple, green) + "cheat" white + "code" gradient
// Primary CTA: cc-gradient-bg (green→yellow)
// Active nav: CC Green (#4DC820)
// Dark mode: sun/moon toggle via useTheme

import { Link, useLocation } from "wouter";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Feed" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/topics", label: "Browse" },
  { href: "/learn", label: "Learn" },
  { href: "/terminal", label: "Terminal" },
  { href: "/journal", label: "Journal" },
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

  return (
    <header
      className="sticky top-0 z-50 border-b transition-colors duration-200"
      style={{
        backgroundColor: isDark ? "#1a2035" : "white",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EAECF0",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="container mx-auto">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <LogoIcon size={30} />
              <div className="flex items-baseline gap-0">
                <span
                  className="font-bold text-[17px] tracking-tight transition-colors duration-200"
                  style={{ fontFamily: "var(--font-display)", color: isDark ? "#F9FAFB" : "#101828" }}
                >
                  cheat
                </span>
                <span
                  className="font-bold text-[17px] tracking-tight cc-gradient-text"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  code
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide transition-colors duration-200"
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
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}>
                <span
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150"
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
          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
              style={{ color: isDark ? "#98A2B3" : "#667085" }}
            >
              <Search size={16} />
            </button>

            {/* Notifications */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 relative"
              style={{ color: isDark ? "#98A2B3" : "#667085" }}
            >
              <Bell size={16} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                style={{ backgroundColor: "#4DC820", borderColor: isDark ? "#1a2035" : "white" }}
              />
            </button>

            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
              style={{
                color: isDark ? "#C8D400" : "#667085",
                backgroundColor: isDark ? "rgba(200,212,0,0.1)" : "transparent",
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Go Pro CTA */}
            <Link href="/pricing">
              <button className="hidden sm:flex items-center gap-1.5 text-[#101828] text-sm font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                Go Pro
              </button>
            </Link>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "#2B3245" }}
            >
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
