import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";

type InviteInfo = {
  valid: boolean;
  email: string;
  phone: string;
  name: string;
  expires_at: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "ok"; invite: InviteInfo }
  | { status: "invalid"; message: string };

export default function MagicClaimPage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { signInWithEmail } = useAuth();

  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Missing token in URL." });
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/auth/magic/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 410 || res.status === 404) {
          setState({
            status: "invalid",
            message: "This link has expired or has already been used.",
          });
          return;
        }
        if (!res.ok) {
          setState({
            status: "invalid",
            message: "Could not load this invite. Try again in a moment.",
          });
          return;
        }
        const data: InviteInfo = await res.json();
        setState({ status: "ok", invite: data });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "invalid",
          message: "Network error loading invite.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (state.status !== "ok") return;
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setSubmitError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/auth/magic/${encodeURIComponent(token!)}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      if (res.status === 410 || res.status === 404) {
        setState({
          status: "invalid",
          message: "This link expired while you were filling it out.",
        });
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        setSubmitError(`Couldn't set up your account: ${detail || res.status}`);
        return;
      }
      // Sign in via the Supabase client so the session lands in localStorage
      // and AuthProvider reflects the new authenticated state.
      const { error } = await signInWithEmail(state.invite.email, password);
      if (error) {
        setSubmitError(
          `Account created, but sign-in failed: ${error}. Try the login page.`,
        );
        return;
      }
      setLocation("/kai");
    } catch (err: any) {
      setSubmitError(err?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center px-6">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E8193C] via-[#00AEEF] to-[#4DC820]" />
      <div className="w-full max-w-md">
        {state.status === "loading" && (
          <div className="text-center text-white/60 text-sm">
            Checking your invite…
          </div>
        )}

        {state.status === "invalid" && (
          <div className="text-center">
            <h1 className="font-bold text-2xl mb-3">Link no longer valid</h1>
            <p className="text-white/60 text-sm mb-6">{state.message}</p>
            <p className="text-white/50 text-xs">
              Reply <span className="font-mono text-white/80">RESEND</span> to
              your Kai SMS to get a fresh link.
            </p>
          </div>
        )}

        {state.status === "ok" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="font-bold text-3xl mb-2 leading-tight">
                Welcome, {firstName(state.invite.name)}.
              </h1>
              <p className="text-white/60 text-sm">
                Your Kai web dashboard is ready. Create a password to sign in
                with your email going forward.
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm">
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Email
              </div>
              <div className="text-white/90">{state.invite.email}</div>
            </div>

            <label className="block">
              <span className="text-white/70 text-xs uppercase tracking-wide">
                Create password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="mt-1.5 w-full rounded-lg bg-white/[0.05] border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00AEEF]"
                placeholder="At least 8 characters"
              />
            </label>

            <label className="block">
              <span className="text-white/70 text-xs uppercase tracking-wide">
                Confirm password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                className="mt-1.5 w-full rounded-lg bg-white/[0.05] border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00AEEF]"
                placeholder="Re-enter password"
              />
            </label>

            {submitError && (
              <div className="rounded-lg bg-[#E8193C]/10 border border-[#E8193C]/40 px-4 py-3 text-sm text-[#E8193C]">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg px-4 py-3 font-bold text-sm bg-gradient-to-r from-[#E8193C] to-[#7B2FBE] text-white disabled:opacity-50"
            >
              {submitting ? "Setting up…" : "Claim my dashboard"}
            </button>

            <p className="text-white/40 text-xs text-center">
              By claiming, you agree to the same terms as your SMS membership.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function firstName(full: string): string {
  if (!full) return "trader";
  return full.split(" ")[0] || full;
}
