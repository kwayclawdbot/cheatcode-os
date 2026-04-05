// CheatCode OS — Top Navigation
// Design: Clean white nav bar, left-anchored logo, center links, right CTA
// Robinhood-simple: no mega menus, no dropdowns on desktop

import { Link, useLocation } from "wouter";
import { Search, Bell, ChevronDown, Zap } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/topics", label: "Browse" },
  { href: "/learn", label: "Learn" },
];

export function Nav() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#EAECF0]">
      <div className="container mx-auto">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 bg-[#12B76A] rounded-lg flex items-center justify-center">
                <Zap size={16} fill="white" className="text-white" />
              </div>
              <span className="font-bold text-[#101828] text-base tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                CheatCode
              </span>
              <span className="text-xs font-semibold text-[#12B76A] bg-[#ECFDF3] px-1.5 py-0.5 rounded-md border border-[#A9EFC5]">
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
                    ? "text-[#12B76A] bg-[#ECFDF3]"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F9FAFB]"
                }`}>
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors">
              <Search size={16} />
            </button>

            {/* Notifications */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F9FAFB] transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#12B76A] rounded-full border-2 border-white" />
            </button>

            {/* Upgrade CTA */}
            <Link href="/pricing">
              <button className="hidden sm:flex items-center gap-1.5 bg-[#12B76A] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#0EA05E] transition-colors">
                <Zap size={13} fill="white" />
                Go Pro
              </button>
            </Link>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#F2F4F7] border border-[#EAECF0] flex items-center justify-center text-xs font-bold text-[#475467]">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
