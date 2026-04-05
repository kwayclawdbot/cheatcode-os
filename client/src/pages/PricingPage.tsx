// CheatCode OS — Pricing Page
// Design: Three tiers. Clean, Robinhood-simple. Green CTA for Pro.
// Free / Pro ($29) / Elite ($99)

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
    ctaStyle: "border border-[#EAECF0] text-[#475467] hover:bg-[#F9FAFB]",
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
    ctaStyle: "bg-[#12B76A] text-white hover:bg-[#0EA05E]",
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
    ctaStyle: "bg-[#101828] text-white hover:bg-[#1D2939]",
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
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Header */}
        <div className="bg-white border-b border-[#EAECF0]">
          <div className="container mx-auto py-12 text-center">
            <p className="section-label mb-2">Pricing</p>
            <h1 className="text-3xl font-bold text-[#101828] mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Intelligence compounds. So does your edge.
            </h1>
            <p className="text-[#667085] text-sm max-w-md mx-auto">
              Start free. Upgrade when you want the full picture. Cancel anytime.
            </p>
          </div>
        </div>

        <div className="container mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TIERS.map(tier => (
              <div key={tier.id} className={`relative bg-white rounded-2xl border overflow-hidden ${
                tier.popular ? "border-[#12B76A] shadow-lg shadow-green-100" : "border-[#EAECF0]"
              }`}>
                {tier.popular && (
                  <div className="bg-[#12B76A] text-white text-xs font-bold text-center py-1.5 tracking-wide">
                    MOST POPULAR
                  </div>
                )}
                <div className="p-6">
                  <h2 className="font-bold text-lg text-[#101828] mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-[#101828]">{tier.price}</span>
                    <span className="text-sm text-[#98A2B3]">/{tier.period}</span>
                  </div>
                  <p className="text-xs text-[#667085] mb-5">{tier.description}</p>

                  <button className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors mb-5 flex items-center justify-center gap-2 ${tier.ctaStyle}`}>
                    {tier.popular && <Zap size={13} fill="white" />}
                    {tier.cta}
                  </button>

                  <div className="space-y-2.5">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-[#12B76A] flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-[#475467] leading-relaxed">{f}</span>
                      </div>
                    ))}
                    {tier.locked.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-40">
                        <Lock size={14} className="text-[#98A2B3] flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-[#98A2B3] leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ / trust signals */}
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <p className="text-sm text-[#667085]">
              All plans include a 7-day free trial. No credit card required for Free.{" "}
              <Link href="/"><span className="text-[#12B76A] font-semibold underline">Start exploring →</span></Link>
            </p>
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
