// CheatCode OS — Top Navigation v2
// Logo: 4 colored circles (red, cyan, purple, green) + "cheat" white + "code" gradient
// Primary CTA: cc-gradient-bg (green→yellow)
// Active nav: CC Green (#4DC820)

import { Link, useLocation } from "wouter";
import { Search, Bell } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/topics", label: "Browse" },
  { href: "/learn", label: "Learn" },
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#EAECF0]" style={{ backdropFilter: "blur(8px)" }}>
      <div className="container mx-auto">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <LogoIcon size={30} />
              <div className="flex items-baseline gap-0">
                <span
                  className="font-bold text-[#101828] text-[17px] tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
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
              <span className="text-[10px] font-bold text-[#2B3245] bg-[#F2F4F7] px-1.5 py-0.5 rounded-md border border-[#EAECF0] tracking-wide">
                OS
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location === href
                    ? "text-[#4DC820] bg-[#F0FDE8]"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F9FAFB]"
                }`}>
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors">
              <Search size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#4DC820] rounded-full border-2 border-white" />
            </button>

            {/* Go Pro CTA — gradient */}
            <Link href="/pricing">
              <button className="hidden sm:flex items-center gap-1.5 text-[#101828] text-sm font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                Go Pro
              </button>
            </Link>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#2B3245] flex items-center justify-center text-xs font-bold text-white">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
