/**
 * ResetPasswordPage — /auth/reset-password
 *
 * Handles two flows:
 * 1. User arrives via a Supabase password-reset email link (has #access_token in URL hash)
 *    → Show "Set New Password" form that calls supabase.auth.updateUser({ password })
 * 2. User navigates directly without a token
 *    → Show "Request Password Reset" form that calls resetPassword(email)
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Lock, Mail } from "lucide-react";

// ─── Logo Icon (same as AuthPage) ────────────────────────────────────────────
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

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { resetPassword } = useAuth();

  // Detect if we arrived with a recovery token in the URL hash
  const [hasToken, setHasToken] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);

  // "Request reset" form state
  const [requestEmail, setRequestEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");

  // "Set new password" form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Check URL hash for Supabase recovery token on mount
  useEffect(() => {
    const hash = window.location.hash;
    // Supabase puts #access_token=...&type=recovery in the URL after clicking reset link
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setHasToken(true);
      // Let Supabase process the hash — it sets the session automatically
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setHasToken(true);
        }
        setTokenChecked(true);
      });
    } else {
      setTokenChecked(true);
    }
  }, []);

  // ─── Request reset form handler ───────────────────────────────────────────
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) return;
    setRequestLoading(true);
    setRequestError("");
    try {
      await resetPassword(requestEmail.trim());
      setRequestSent(true);
    } catch (err: any) {
      setRequestError(err?.message ?? "Failed to send reset email. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  // ─── Set new password handler ─────────────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setUpdateError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setUpdateError("Passwords do not match.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setUpdateSuccess(true);
      // Redirect to home after 2s
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setUpdateError(err?.message ?? "Failed to update password. Please request a new reset link.");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0E1A" }}>
        <div className="w-8 h-8 border-2 border-[#4DC820] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0E1A" }}>
      {/* ── Left panel (branding) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10"
        style={{ background: "linear-gradient(160deg, #0D1220 0%, #111827 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <LogoIcon size={36} />
          <span className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            CheatCode <span style={{ color: "#4DC820" }}>OS</span>
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mb-4"
              style={{ background: "linear-gradient(135deg, #00AEEF, #4DC820)" }}
            >
              K
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              {hasToken
                ? "You're almost there. Set a strong new password and you'll be back in the game in seconds."
                : "No worries — it happens to the best traders. Enter your email and I'll send you a secure reset link right away."}
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Your account and data are safe",
              "Reset link expires in 1 hour",
              "You can change your password again anytime",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#4DC820] flex-shrink-0" />
                <span className="text-white/60 text-xs">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">
          &copy; {new Date().getFullYear()} CheatCode OS. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoIcon size={28} />
            <span className="text-lg font-black text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              CheatCode <span style={{ color: "#4DC820" }}>OS</span>
            </span>
          </div>

          {hasToken ? (
            /* ── Set new password form ── */
            updateSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(77,200,32,0.15)" }}>
                  <CheckCircle2 size={32} className="text-[#4DC820]" />
                </div>
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>Password Updated!</h2>
                <p className="text-white/60 text-sm">Redirecting you to CheatCode OS...</p>
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(77,200,32,0.12)" }}>
                    <Lock size={22} className="text-[#4DC820]" />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    Set New Password
                  </h1>
                  <p className="text-white/50 text-sm">Choose a strong password for your CheatCode OS account.</p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#4DC820")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#4DC820")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>

                  {updateError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(232,25,60,0.1)", border: "1px solid rgba(232,25,60,0.2)" }}>
                      <AlertCircle size={14} className="text-[#E8193C] flex-shrink-0 mt-0.5" />
                      <p className="text-[#E8193C] text-xs">{updateError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm text-[#101828] transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(90deg, #4DC820, #00AEEF)" }}
                  >
                    {updateLoading ? (
                      <div className="w-4 h-4 border-2 border-[#101828] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </form>
              </div>
            )
          ) : (
            /* ── Request reset form ── */
            requestSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(77,200,32,0.15)" }}>
                  <Mail size={32} className="text-[#4DC820]" />
                </div>
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>Check Your Email</h2>
                <p className="text-white/60 text-sm max-w-xs mx-auto">
                  We sent a password reset link to <strong className="text-white">{requestEmail}</strong>. It expires in 1 hour.
                </p>
                <p className="text-white/40 text-xs">Didn't receive it? Check your spam folder or try again.</p>
                <button
                  onClick={() => setRequestSent(false)}
                  className="text-[#4DC820] text-sm font-semibold hover:underline"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(0,174,239,0.12)" }}>
                    <Mail size={22} className="text-[#00AEEF]" />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    Reset Your Password
                  </h1>
                  <p className="text-white/50 text-sm">Enter the email address linked to your account and we'll send you a reset link.</p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={requestEmail}
                      onChange={e => setRequestEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = "#00AEEF")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>

                  {requestError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(232,25,60,0.1)", border: "1px solid rgba(232,25,60,0.2)" }}>
                      <AlertCircle size={14} className="text-[#E8193C] flex-shrink-0 mt-0.5" />
                      <p className="text-[#E8193C] text-xs">{requestError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm text-[#101828] transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(90deg, #00AEEF, #4DC820)" }}
                  >
                    {requestLoading ? (
                      <div className="w-4 h-4 border-2 border-[#101828] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => navigate("/auth")}
                    className="flex items-center gap-1.5 text-white/40 text-sm hover:text-white/70 transition-colors mx-auto"
                  >
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </button>
                </div>
              </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
