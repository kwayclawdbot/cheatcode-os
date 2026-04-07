// CheatCode OS — Auth Page
// Sign In / Sign Up with Supabase (email+password + Google OAuth)
// Left panel: Kai welcome + testimonials
// Right panel: tabbed sign in / sign up form

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Eye, EyeOff, TrendingUp, Zap, Users, BookOpen, BarChart2, ArrowRight, Star, Chrome } from "lucide-react";

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

const TESTIMONIALS = [
  { name: "Alex T.", handle: "@swing_alex", text: "Kai called the NVDA breakout 2 days before it happened. This platform is different.", stars: 5 },
  { name: "Maya R.", handle: "@daytrader_m", text: "The community here actually trades. No noise, just real setups and real P&L.", stars: 5 },
  { name: "Jordan K.", handle: "@jk_options", text: "Finally a place where traders share real analysis instead of just hype.", stars: 5 },
];

// ─── Main Auth Page ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (tab === "signin") {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/");
      }
    } else {
      if (!name.trim()) {
        setError("Please enter your name.");
        setSubmitting(false);
        return;
      }
      const { error } = await signUpWithEmail(email, password, name);
      if (error) {
        setError(error);
      } else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setTab("signin");
        setPassword("");
      }
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
    // Google OAuth redirects automatically
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
          <KaiBubble text="Hey, I'm Kai — your personal trading intelligence. I watch the markets so you don't miss a beat." delay={0.1} />
          <KaiBubble text="I'll analyze your watchlist, flag high-conviction setups, and walk you through the platform when you're ready." delay={0.4} />
          <KaiBubble text="Join thousands of traders who are already using CheatCode to trade smarter. Let's get you set up." delay={0.7} />

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

      {/* ── Right Panel: Sign In / Sign Up Form ── */}
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
          {/* Mobile logo */}
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

          {/* Heading */}
          <h2 className="text-2xl font-black text-[#101828] mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-[#667085] mb-6">
            {tab === "signin" ? "Sign in to access your trading edge." : "Join 10,000+ traders already on CheatCode OS."}
          </p>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-5 bg-[#F2F4F7]">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? "linear-gradient(135deg, #4DC820, #C8D400)" : "transparent",
                  color: tab === t ? "#101828" : "#667085",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl mb-4 text-sm font-semibold transition-colors border hover:bg-[#F9FAFB]"
            style={{ borderColor: "#D0D5DD", color: "#344054", background: "#fff" }}
          >
            <Chrome size={16} className="text-[#4285F4]" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#EAECF0]" />
            <span className="text-xs text-[#98A2B3]">or</span>
            <div className="flex-1 h-px bg-[#EAECF0]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-[#D0D5DD] outline-none text-[#101828] placeholder-[#98A2B3] focus:border-[#4DC820] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-[#D0D5DD] outline-none text-[#101828] placeholder-[#98A2B3] focus:border-[#4DC820] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "Min. 8 characters" : "Your password"}
                  required
                  minLength={tab === "signup" ? 8 : undefined}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm border border-[#D0D5DD] outline-none text-[#101828] placeholder-[#98A2B3] focus:border-[#4DC820] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {tab === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs font-semibold text-[#4DC820] hover:underline"
                  onClick={async () => {
                    if (!email) {
                      setError("Enter your email above, then click Forgot password.");
                      return;
                    }
                    const { error } = await resetPassword(email);
                    if (error) {
                      setError(error);
                    } else {
                      setResetSent(true);
                      setSuccess(`Password reset email sent to ${email}. Check your inbox.`);
                    }
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error / success messages */}
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="px-3.5 py-2.5 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
              style={{ background: "linear-gradient(135deg, #4DC820 0%, #C8D400 100%)", color: "#101828" }}
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-[#101828]/30 border-t-[#101828] rounded-full animate-spin" />
              ) : (
                <>
                  {tab === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Switch tab */}
          <p className="text-center text-sm mt-5 text-[#667085]">
            {tab === "signin" ? (
              <>Don't have an account?{" "}
                <button onClick={() => { setTab("signup"); setError(null); }} className="font-semibold text-[#4DC820] hover:underline">Sign up free</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setTab("signin"); setError(null); }} className="font-semibold text-[#4DC820] hover:underline">Sign in</button>
              </>
            )}
          </p>

          {/* Kai teaser */}
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
