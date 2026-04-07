/**
 * CheatCode OS — Auth Page
 * Design: Split-screen. Left = Kai welcome + feature highlights. Right = sign in card.
 * Mobile: stacked, logo on top, sign in card below.
 * Auth: Manus OAuth only (no email/password — this is a Manus app).
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Users, BookOpen, BarChart2, ArrowRight, Star } from "lucide-react";

// ─── Logo Icon ────────────────────────────────────────────────────────────────

function LogoIcon({ size = 36 }: { size?: number }) {
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

// ─── Kai Message Bubble ───────────────────────────────────────────────────────

function KaiBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-start gap-3"
    >
      {/* Kai avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #00AEEF, #4DC820)" }}
      >
        K
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-xs"
        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
      >
        {text}
      </div>
    </motion.div>
  );
}

// ─── Feature Pill ─────────────────────────────────────────────────────────────

function FeaturePill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <Icon size={13} style={{ color }} />
      {label}
    </div>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: "Alex T.", handle: "@swing_alex", text: "Kai called the NVDA breakout 2 days before it happened. This platform is different.", stars: 5 },
  { name: "Maya R.", handle: "@daytrader_m", text: "The community here actually trades. No noise, just real setups and real P&L.", stars: 5 },
  { name: "Jordan K.", handle: "@jk_options", text: "Finally a place where traders share real analysis instead of just hype.", stars: 5 },
];

// ─── Main Auth Page ───────────────────────────────────────────────────────────

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const handleSignUp = () => {
    // Sign up uses the same OAuth flow — Manus handles new account creation
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
        <div className="w-8 h-8 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left Panel: Kai + Features ── */}
      <div
        className="relative flex flex-col justify-between px-8 py-10 lg:w-[55%] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1117 0%, #1a2035 50%, #0d1117 100%)" }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(77,200,32,0.08) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 70% 70%, rgba(0,174,239,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 relative z-10"
        >
          <LogoIcon size={32} />
          <div className="flex items-baseline gap-0">
            <span className="font-black text-[18px] tracking-tight text-white" style={{ fontFamily: "Sora, sans-serif" }}>cheat</span>
            <span
              className="font-black text-[18px] tracking-tight"
              style={{ fontFamily: "Sora, sans-serif", background: "linear-gradient(90deg, #4DC820, #C8D400)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >code</span>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.12)" }}>OS</span>
        </motion.div>

        {/* Kai conversation */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8 space-y-4 max-w-sm">
          <KaiBubble
            text="Hey, I'm Kai — your personal trading intelligence. I watch the markets so you don't miss a beat."
            delay={0.1}
          />
          <KaiBubble
            text="I'll analyze your watchlist, flag high-conviction setups, and walk you through the platform when you're ready."
            delay={0.4}
          />
          <KaiBubble
            text="Join thousands of traders who are already using CheatCode to trade smarter. Let's get you set up."
            delay={0.7}
          />

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex flex-wrap gap-2 pt-2"
          >
            <FeaturePill icon={TrendingUp} label="Live Market Feed" color="#4DC820" />
            <FeaturePill icon={Zap} label="Kai AI Analysis" color="#C8D400" />
            <FeaturePill icon={Users} label="Trader Community" color="#00AEEF" />
            <FeaturePill icon={BookOpen} label="Trading Journal" color="#7B2FBE" />
            <FeaturePill icon={BarChart2} label="Terminal" color="#E8193C" />
          </motion.div>
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="relative z-10 space-y-3"
        >
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: ["#E8193C", "#00AEEF", "#4DC820"][i] }}
              >
                {t.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} size={9} fill="#C8D400" stroke="none" />
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{t.text}</p>
                <p className="text-[10px] mt-1 font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{t.name} · {t.handle}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right Panel: Sign In Card ── */}
      <div
        className="flex flex-col items-center justify-center px-8 py-12 lg:w-[45%]"
        style={{ background: "#ffffff" }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoIcon size={28} />
            <div className="flex items-baseline gap-0">
              <span className="font-black text-[16px] tracking-tight text-[#101828]" style={{ fontFamily: "Sora, sans-serif" }}>cheat</span>
              <span
                className="font-black text-[16px] tracking-tight"
                style={{ fontFamily: "Sora, sans-serif", background: "linear-gradient(90deg, #4DC820, #C8D400)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >code</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-[#EAECF0] tracking-wide text-[#2B3245] bg-[#F2F4F7]">OS</span>
          </div>

          <h2 className="text-2xl font-black text-[#101828] mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-sm text-[#667085] mb-8">
            Sign in to your CheatCode account to continue.
          </p>

          {/* Primary CTA — Sign In */}
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm mb-3 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #4DC820 0%, #C8D400 100%)", color: "#101828" }}
          >
            Sign In with Manus <ArrowRight size={16} />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#EAECF0]" />
            <span className="text-xs text-[#98A2B3] font-medium">New here?</span>
            <div className="flex-1 h-px bg-[#EAECF0]" />
          </div>

          {/* Sign Up CTA */}
          <button
            onClick={handleSignUp}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm border-2 transition-all hover:border-[#4DC820] hover:bg-[#EDFBE6] active:scale-[0.98]"
            style={{ borderColor: "#D0D5DD", color: "#101828", background: "#fff" }}
          >
            Create Free Account
          </button>

          {/* Kai intro teaser */}
          <div
            className="mt-6 flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #EDFBE6, #E6F7FD)", border: "1px solid #A9EFC5" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #00AEEF, #4DC820)" }}
            >
              K
            </div>
            <div>
              <p className="text-xs font-bold text-[#101828] mb-0.5">Kai is ready to meet you</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                After sign in, I'll walk you through the platform and set up your personalized feed.
              </p>
            </div>
          </div>

          {/* Legal */}
          <p className="text-[11px] text-[#98A2B3] text-center mt-6 leading-relaxed">
            By continuing, you agree to CheatCode's{" "}
            <a href="/terms" className="underline hover:text-[#475467]">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-[#475467]">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
