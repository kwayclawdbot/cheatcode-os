/**
 * KaiWalkthrough — Interactive app tour with Kai as the guide.
 * Triggered once after onboarding completes. Uses a floating overlay
 * with Kai's chat bubble pointing at highlighted elements.
 *
 * Steps highlight: Feed tabs → Ticker rail → Kai Radar → Compose bar → Nav items
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalkthroughStep {
  id: string;
  title: string;
  message: string;
  /** CSS selector for the element to highlight. If null, centers on screen. */
  target: string | null;
  /** Where to place the bubble relative to the target */
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Optional emoji accent */
  emoji?: string;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Hey, welcome to CheatCode! 👋",
    message:
      "I'm Kai — your personal trading intelligence. I'm going to give you a quick tour of the platform so you know exactly where everything is. Takes about 60 seconds.",
    target: null,
    placement: "center",
    emoji: "🤖",
  },
  {
    id: "feed-tabs",
    title: "Your Feed",
    message:
      "This is your Home feed. Trending shows what the community is buzzing about right now. For You is personalized to your watchlist — the tickers you care about.",
    target: "[data-tour='feed-tabs']",
    placement: "bottom",
    emoji: "📰",
  },
  {
    id: "ticker-rail",
    title: "Live Ticker Rail",
    message:
      "These are your top movers. Each card shows the price, % change, and a sparkline so you can see the trend at a glance. Click any ticker to dive into the full analysis.",
    target: "[data-tour='ticker-rail']",
    placement: "bottom",
    emoji: "📈",
  },
  {
    id: "compose",
    title: "Share Your Trades",
    message:
      "Post your setups, share P&L screenshots, or drop a quick market take. The community here actually trades — no noise, just real analysis.",
    target: "[data-tour='compose-bar']",
    placement: "bottom",
    emoji: "✍️",
  },
  {
    id: "wall-of-fame",
    title: "Wall of Fame 🏆",
    message:
      "This is where traders post their best wins. Share a profit screenshot and get the recognition you deserve. The community loves seeing real P&L.",
    target: "[data-tour='wall-of-fame-tab']",
    placement: "bottom",
    emoji: "🏆",
  },
  {
    id: "kai-radar",
    title: "Kai's Radar",
    message:
      "This is my live watchlist — tickers I'm tracking with high conviction right now. I score each one on direction, timeframe, and confidence. These are my best ideas.",
    target: "[data-tour='kai-radar']",
    placement: "left",
    emoji: "🎯",
  },
  {
    id: "nav-community",
    title: "Community",
    message:
      "The Community tab is where you connect with other traders — leaderboards, discussions, and the Wall of Fame. Real traders, real results.",
    target: "[data-tour='nav-community']",
    placement: "bottom",
    emoji: "👥",
  },
  {
    id: "nav-watch",
    title: "Watch",
    message:
      "The Watch tab is your video library — educational content, trade breakdowns, and market analysis from top creators. Organized by what's trending and what's relevant to you.",
    target: "[data-tour='nav-watch']",
    placement: "bottom",
    emoji: "▶️",
  },
  {
    id: "done",
    title: "You're all set! 🚀",
    message:
      "That's the tour. Your feed is live, your watchlist is set, and I'm already scanning the markets for you. If you ever need me, tap the Kai button in the nav. Let's get to work.",
    target: null,
    placement: "center",
    emoji: "🚀",
  },
];

// ─── Highlight Box ────────────────────────────────────────────────────────────

function HighlightBox({ rect }: { rect: DOMRect }) {
  const PAD = 8;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed pointer-events-none z-[9998]"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        border: "2px solid rgba(77,200,32,0.8)",
      }}
    />
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function KaiBubble({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  anchorRect,
}: {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  anchorRect: DOMRect | null;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Compute bubble position
  let style: React.CSSProperties = {};
  if (!anchorRect || step.placement === "center") {
    style = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: 360,
      width: "calc(100% - 48px)",
    };
  } else {
    const PAD = 16;
    const BUBBLE_W = 320;
    const BUBBLE_H = 200; // approx

    if (step.placement === "bottom") {
      style = {
        position: "fixed",
        top: anchorRect.bottom + PAD,
        left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - BUBBLE_W - 16)),
        width: BUBBLE_W,
      };
    } else if (step.placement === "top") {
      style = {
        position: "fixed",
        top: Math.max(16, anchorRect.top - BUBBLE_H - PAD),
        left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - BUBBLE_W - 16)),
        width: BUBBLE_W,
      };
    } else if (step.placement === "left") {
      style = {
        position: "fixed",
        top: Math.max(16, anchorRect.top),
        left: Math.max(16, anchorRect.left - BUBBLE_W - PAD),
        width: BUBBLE_W,
      };
    } else if (step.placement === "right") {
      style = {
        position: "fixed",
        top: Math.max(16, anchorRect.top),
        left: Math.min(window.innerWidth - BUBBLE_W - 16, anchorRect.right + PAD),
        width: BUBBLE_W,
      };
    }
  }

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.25 }}
      className="z-[9999] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        ...style,
        background: "#fff",
        border: "1px solid #E4E7EC",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "linear-gradient(135deg, #0d1117, #1a2035)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #00AEEF, #4DC820)" }}
        >
          K
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Kai</p>
          <p className="text-[10px] text-white/50">
            Step {stepIndex + 1} of {totalSteps}
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-2 mb-2">
          {step.emoji && <span className="text-lg flex-shrink-0">{step.emoji}</span>}
          <h3 className="font-bold text-sm text-[#101828]" style={{ fontFamily: "Sora, sans-serif" }}>
            {step.title}
          </h3>
        </div>
        <p className="text-xs text-[#475467] leading-relaxed">{step.message}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 pb-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === stepIndex ? 16 : 5,
              height: 5,
              background: i === stepIndex ? "#4DC820" : i < stepIndex ? "#A9EFC5" : "#E4E7EC",
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#F2F4F7]">
        {!isFirst && (
          <button
            onClick={onPrev}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F9FAFB] transition-colors"
          >
            <ChevronLeft size={13} /> Back
          </button>
        )}
        <button
          onClick={onSkip}
          className="text-xs text-[#98A2B3] hover:text-[#667085] transition-colors ml-auto"
        >
          Skip tour
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{
            background: "linear-gradient(135deg, #4DC820, #C8D400)",
            color: "#101828",
          }}
        >
          {isLast ? "Let's go!" : "Next"} <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STORAGE_KEY = "cc-walkthrough-done";

export function KaiWalkthrough() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Trigger once after onboarding
  useEffect(() => {
    const onboardingDone = localStorage.getItem("cc-onboarding-complete");
    const walkthroughDone = localStorage.getItem(STORAGE_KEY);
    if (onboardingDone && !walkthroughDone) {
      // Small delay so the home page has time to render
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const measureTarget = useCallback((target: string | null) => {
    if (!target) {
      setAnchorRect(null);
      return;
    }
    const el = document.querySelector(target);
    if (el) {
      setAnchorRect(el.getBoundingClientRect());
    } else {
      setAnchorRect(null);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const step = STEPS[stepIndex];
    measureTarget(step.target);
  }, [active, stepIndex, measureTarget]);

  const dismiss = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= STEPS.length - 1) {
      dismiss();
    } else {
      setStepIndex(i => i + 1);
    }
  }, [stepIndex, dismiss]);

  const prev = useCallback(() => {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }, [stepIndex]);

  if (!active) return null;

  const step = STEPS[stepIndex];
  const hasHighlight = !!anchorRect && step.placement !== "center";

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {!hasHighlight && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997]"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={dismiss}
          />
        )}
      </AnimatePresence>

      {/* Highlight box */}
      <AnimatePresence>
        {hasHighlight && anchorRect && (
          <HighlightBox key={`highlight-${stepIndex}`} rect={anchorRect} />
        )}
      </AnimatePresence>

      {/* Bubble */}
      <AnimatePresence mode="wait">
        <KaiBubble
          key={step.id}
          step={step}
          stepIndex={stepIndex}
          totalSteps={STEPS.length}
          onNext={next}
          onPrev={prev}
          onSkip={dismiss}
          anchorRect={anchorRect}
        />
      </AnimatePresence>
    </>
  );
}

// ─── Manual trigger button ────────────────────────────────────────────────────

export function KaiWalkthroughTrigger() {
  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={handleRestart}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
      style={{ background: "linear-gradient(135deg, #EDFBE6, #E6F7FD)", color: "#1A5C0A", border: "1px solid #A9EFC5" }}
    >
      <Sparkles size={13} />
      Restart Kai Tour
    </button>
  );
}
