// CheatCode OS — Pricing Page v2
// Brand: CC Green→Yellow gradient on Pro CTA, CC Dark for Elite, spectrum top bar

import { Link } from "wouter";
import { Check, Zap, Lock } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Start exploring. No credit card required.",
    cta: "Get Started Free",
    ctaType: "outline" as const,
    popular: false,
    features: [
      "Browse all curated videos and podcasts",
      "AI context layer on every video",
      "Intelligence tool: score + direction only",
      "5 Kai messages per day",
      "Daily newsletter summary",
      "Topic and creator browsing",
      "Free learning paths (Beginner + Intermediate)",
    ],
    locked: [
      "Full evidence chain breakdown",
      "Unlimited Kai chat",
      "Real-time convergence alerts",
      "Advanced courses",
      "Ad-free experience",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious traders who want the full picture.",
    cta: "Start Pro Free Trial",
    ctaType: "gradient" as const,
    popular: true,
    features: [
      "Everything in Free",
      "Full intelligence breakdowns (evidence chains)",
      "Unlimited Kai chat",
      "Real-time convergence alerts (90+ scores)",
      "Daily Morning Prep playlist",
      "Ad-free experience",
      "All curated learning paths",
      "Advanced courses (FTA, TTA)",
      "Priority feature access",
    ],
    locked: [],
  },
  {
    id: "elite",
    name: "Elite",
    price: "$99",
    period: "per month",
    description: "For professionals, funds, and power users.",
    cta: "Get Elite Access",
    ctaType: "dark" as const,
    popular: false,
    features: [
      "Everything in Pro",
      "API access to prediction cards",
      "Bulk ticker analysis (up to 50/day)",
      "White-label intelligence reports",
      "Priority support",
      "Early access to new features",
      "Custom alert thresholds",
    ],
    locked: [],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Header — dark gradient */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="container mx-auto py-12 text-center">
            <p className="section-label mb-2" style={{ color: "#98A2B3" }}>Pricing</p>
            <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Intelligence compounds.{" "}
              <span className="cc-gradient-text">So does your edge.</span>
            </h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: "#98A2B3" }}>
              Start free. Upgrade when you want the full picture. Cancel anytime.
            </p>
          </div>
        </div>

        <div className="container mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TIERS.map(tier => (
              <div key={tier.id} className={`relative bg-card rounded-2xl overflow-hidden ${
                tier.popular
                  ? "border-2 shadow-xl shadow-green-100/50"
                  : "border border-border"
              }`}
                style={tier.popular ? { borderColor: "#4DC820" } : {}}>
                {/* Top accent bar */}
                {tier.popular && (
                  <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 100%)" }} />
                )}
                {tier.popular && (
                  <div className="text-center py-1.5 text-xs font-bold tracking-wide"
                       style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 100%)", color: "#101828" }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="p-6">
                  <h2 className="font-bold text-lg text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/{tier.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">{tier.description}</p>

                  {tier.ctaType === "gradient" && (
                    <button className="w-full text-[#101828] text-sm font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity mb-5 flex items-center justify-center gap-2">
                      <Zap size={13} />
                      {tier.cta}
                    </button>
                  )}
                  {tier.ctaType === "dark" && (
                    <button className="w-full text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity mb-5 flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
                      {tier.cta}
                    </button>
                  )}
                  {tier.ctaType === "outline" && (
                    <button className="w-full text-muted-foreground text-sm font-semibold py-2.5 rounded-xl border border-border hover:bg-muted transition-colors mb-5">
                      {tier.cta}
                    </button>
                  )}

                  <div className="space-y-2.5">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#4DC820" }} />
                        <span className="text-xs text-muted-foreground leading-relaxed">{f}</span>
                      </div>
                    ))}
                    {tier.locked.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-40">
                        <Lock size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 7-day free trial. No credit card required for Free.{" "}
              <Link href="/"><span className="font-semibold cc-gradient-text underline">Start exploring →</span></Link>
            </p>
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
