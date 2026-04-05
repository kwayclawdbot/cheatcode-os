// CheatCode OS — Coach Application Page
// Design: Multi-step form, dark hero, CC brand accents
// Flow: Eligibility → Profile → Specialty → Products → Review → Submit

import { useState } from "react";
import { Link } from "wouter";
import {
  Award, CheckCircle, ArrowRight, ArrowLeft, Zap, Users, DollarSign,
  Star, BookOpen, Video, Calendar, Upload, Info, ChevronDown
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Eligibility" },
  { id: 2, label: "Your Profile" },
  { id: 3, label: "Specialty" },
  { id: 4, label: "Products" },
  { id: 5, label: "Review" },
];

const SPECIALTIES = [
  "Day Trading", "Swing Trading", "Options", "Futures", "Forex",
  "Crypto", "Value Investing", "Growth Investing", "Technical Analysis",
  "Fundamental Analysis", "Macro / Rates", "Risk Management",
  "Trading Psychology", "Beginner Education", "Prop Trading",
];

const PRODUCT_TYPES = [
  { id: "course", icon: <BookOpen size={20} />, label: "Online Course", desc: "Pre-recorded video curriculum with structured lessons" },
  { id: "1on1", icon: <Calendar size={20} />, label: "1-on-1 Sessions", desc: "Live coaching calls booked directly through your profile" },
  { id: "community", icon: <Users size={20} />, label: "Private Community", desc: "Exclusive Discord or group for your students" },
  { id: "alerts", icon: <Zap size={20} />, label: "Trade Alerts", desc: "Real-time trade alerts and watchlists for subscribers" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                background: step.id < current ? "#4DC820" : step.id === current ? "linear-gradient(135deg, #4DC820, #C8D400)" : "#F2F4F7",
                color: step.id <= current ? "white" : "#98A2B3",
              }}
            >
              {step.id < current ? <CheckCircle size={14} /> : step.id}
            </div>
            <span className="text-[10px] mt-1 font-medium hidden sm:block"
                  style={{ color: step.id === current ? "#4DC820" : "#98A2B3" }}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-8 sm:w-16 h-0.5 mx-1 mb-4"
                 style={{ background: step.id < current ? "#4DC820" : "#EAECF0" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Eligibility ──────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const criteria = [
    "I have at least 2 years of active trading or investing experience",
    "I have a track record I'm willing to share (screenshots, brokerage statements, or verified results)",
    "I can produce educational content that helps others improve their trading",
    "I agree to CheatCode OS's Coach Code of Conduct and no-misleading-claims policy",
    "I understand CheatCode OS takes a 20% platform fee on all coach revenue",
  ];
  const allChecked = checked.length === criteria.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Eligibility Requirements
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CheatCode OS coaches are held to a high standard. Please confirm you meet all of the following criteria before applying.
        </p>
      </div>

      <div className="space-y-3">
        {criteria.map((c, i) => (
          <label key={i}
                 className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                 style={{
                   borderColor: checked.includes(c) ? "#4DC820" : "#EAECF0",
                   background: checked.includes(c) ? "#F0FDE8" : "transparent",
                 }}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              style={{ background: checked.includes(c) ? "#4DC820" : "#F2F4F7", border: `1.5px solid ${checked.includes(c) ? "#4DC820" : "#D0D5DD"}` }}
            >
              {checked.includes(c) && <CheckCircle size={12} className="text-white" />}
            </div>
            <input type="checkbox" className="sr-only"
                   checked={checked.includes(c)}
                   onChange={() => setChecked(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} />
            <span className="text-sm text-foreground leading-relaxed">{c}</span>
          </label>
        ))}
      </div>

      {/* Revenue split highlight */}
      <div className="rounded-xl p-5 border" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3 mb-3">
          <DollarSign size={18} style={{ color: "#4DC820" }} />
          <h3 className="font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Revenue Split</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold cc-gradient-text" style={{ fontFamily: "var(--font-display)" }}>80%</p>
            <p className="text-xs text-white/60 mt-1">You keep</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white/40" style={{ fontFamily: "var(--font-display)" }}>20%</p>
            <p className="text-xs text-white/60 mt-1">Platform fee</p>
          </div>
        </div>
        <p className="text-xs text-white/50 mt-3 text-center">Applies to courses, 1-on-1s, communities, and alerts</p>
      </div>

      <button
        onClick={onNext}
        disabled={!allChecked}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all"
        style={{
          background: allChecked ? "linear-gradient(135deg, #4DC820, #C8D400)" : "#F2F4F7",
          color: allChecked ? "#101828" : "#98A2B3",
          cursor: allChecked ? "pointer" : "not-allowed",
        }}
      >
        Continue to Profile <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────

function Step2({ data, setData, onNext, onBack }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Your Coach Profile</h2>
        <p className="text-sm text-muted-foreground">This is what students will see on your public profile.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name *</label>
          <input value={data.name || ""} onChange={e => setData({ ...data, name: e.target.value })}
                 placeholder="Your real name"
                 className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Display Handle *</label>
          <input value={data.handle || ""} onChange={e => setData({ ...data, handle: e.target.value })}
                 placeholder="@yourhandle"
                 className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Bio *</label>
        <textarea value={data.bio || ""} onChange={e => setData({ ...data, bio: e.target.value })}
                  placeholder="Tell students who you are, your background, and what makes your approach unique..."
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors resize-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Years of Experience *</label>
          <select value={data.experience || ""} onChange={e => setData({ ...data, experience: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors">
            <option value="">Select...</option>
            <option>2–3 years</option>
            <option>4–5 years</option>
            <option>6–10 years</option>
            <option>10+ years</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Social Following (total)</label>
          <input value={data.followers || ""} onChange={e => setData({ ...data, followers: e.target.value })}
                 placeholder="e.g. 12,000"
                 className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">YouTube / Social Links</label>
        <input value={data.youtube || ""} onChange={e => setData({ ...data, youtube: e.target.value })}
               placeholder="https://youtube.com/@yourhandle"
               className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Track Record / Proof of Results</label>
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-[#4DC820] transition-colors cursor-pointer">
          <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Upload screenshots, statements, or links to verified results</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 10MB</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onNext}
                className="flex-1 flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Specialty ────────────────────────────────────────────────────────

function Step3({ data, setData, onNext, onBack }: any) {
  const selected: string[] = data.specialties || [];
  const toggle = (s: string) => {
    setData({ ...data, specialties: selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Your Specialties</h2>
        <p className="text-sm text-muted-foreground">Select all areas you teach. This helps students find you.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map(s => (
          <button key={s} onClick={() => toggle(s)}
                  className="text-sm px-4 py-2 rounded-full border transition-all"
                  style={{
                    borderColor: selected.includes(s) ? "#4DC820" : "#EAECF0",
                    background: selected.includes(s) ? "#F0FDE8" : "transparent",
                    color: selected.includes(s) ? "#2E7A10" : "#475467",
                    fontWeight: selected.includes(s) ? 600 : 400,
                  }}>
            {s}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Primary Market Focus</label>
        <select value={data.market || ""} onChange={e => setData({ ...data, market: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors">
          <option value="">Select primary market...</option>
          <option>US Equities</option>
          <option>Options & Derivatives</option>
          <option>Futures</option>
          <option>Forex</option>
          <option>Crypto</option>
          <option>Multi-Market</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Trading Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Day Trading", "Swing Trading", "Position Trading", "Investing"].map(style => (
            <button key={style}
                    onClick={() => setData({ ...data, style })}
                    className="py-3 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor: data.style === style ? "#4DC820" : "#EAECF0",
                      background: data.style === style ? "#F0FDE8" : "transparent",
                      color: data.style === style ? "#2E7A10" : "#475467",
                    }}>
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onNext}
                className="flex-1 flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Products ─────────────────────────────────────────────────────────

function Step4({ data, setData, onNext, onBack }: any) {
  const selected: string[] = data.products || [];
  const toggle = (id: string) => {
    setData({ ...data, products: selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Products You'll Offer</h2>
        <p className="text-sm text-muted-foreground">Select what you plan to sell. You can add more after approval.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCT_TYPES.map(p => (
          <button key={p.id} onClick={() => toggle(p.id)}
                  className="flex items-start gap-4 p-5 rounded-xl border text-left transition-all"
                  style={{
                    borderColor: selected.includes(p.id) ? "#4DC820" : "#EAECF0",
                    background: selected.includes(p.id) ? "#F0FDE8" : "transparent",
                  }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: selected.includes(p.id) ? "#4DC820" : "#F2F4F7", color: selected.includes(p.id) ? "white" : "#98A2B3" }}>
              {p.icon}
            </div>
            <div>
              <p className="font-bold text-foreground text-sm mb-1">{p.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
            {selected.includes(p.id) && (
              <CheckCircle size={16} className="ml-auto flex-shrink-0 mt-0.5" style={{ color: "#4DC820" }} />
            )}
          </button>
        ))}
      </div>

      {selected.includes("1on1") && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">1-on-1 Session Pricing</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">30-min rate</label>
              <input placeholder="$75" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">60-min rate</label>
              <input placeholder="$149" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820]" />
            </div>
          </div>
        </div>
      )}

      {selected.includes("course") && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">First Course Details</p>
          <input placeholder="Course title..." className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820]" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Price (e.g. $197)" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820]" />
            <input placeholder="Est. lessons (e.g. 12)" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-[#4DC820]" />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onNext}
                className="flex-1 flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          Review Application <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function Step5({ data, onBack, onSubmit }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Review Your Application</h2>
        <p className="text-sm text-muted-foreground">Double-check everything before submitting. Our team reviews applications within 48 hours.</p>
      </div>

      <div className="space-y-4">
        {[
          { label: "Name", value: data.name || "—" },
          { label: "Handle", value: data.handle || "—" },
          { label: "Experience", value: data.experience || "—" },
          { label: "Specialties", value: data.specialties?.join(", ") || "—" },
          { label: "Trading Style", value: data.style || "—" },
          { label: "Products", value: data.products?.map((p: string) => PRODUCT_TYPES.find(pt => pt.id === p)?.label).join(", ") || "—" },
        ].map((row, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-border last:border-0">
            <span className="text-xs font-semibold text-muted-foreground w-28 flex-shrink-0 pt-0.5">{row.label}</span>
            <span className="text-sm text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 border" style={{ background: "#F0FDE8", borderColor: "#B6F08A" }}>
        <div className="flex gap-3">
          <Info size={16} style={{ color: "#2E7A10" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#2E7A10" }}>What happens next?</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#2E7A10" }}>
              Our team reviews your application within 48 hours. If approved, you'll receive an email with instructions to set up your coach profile, upload your first product, and connect your payout account.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onSubmit}
                className="flex-1 flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
          <Award size={14} /> Submit Application
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <div className="text-center py-8 space-y-5">
      <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
           style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
        <CheckCircle size={36} className="text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Application Submitted!
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Our team will review your application within 48 hours. You'll receive an email at the address on your account with next steps.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {[
          { icon: <Award size={18} />, label: "Coach Badge", desc: "Added to your profile" },
          { icon: <DollarSign size={18} />, label: "80% Revenue", desc: "On all products" },
          { icon: <Users size={18} />, label: "Coach Dashboard", desc: "Track everything" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-border p-3 text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                 style={{ background: "#F0FDE8", color: "#4DC820" }}>
              {item.icon}
            </div>
            <p className="text-xs font-bold text-foreground">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center">
        <Link href="/coaches-corner">
          <button className="text-sm font-medium px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
            View Coaches Corner
          </button>
        </Link>
        <Link href="/">
          <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
            Back to Home <ArrowRight size={13} />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoachApplyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = () => {
    toast.success("Application submitted! We'll review it within 48 hours.");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 50%, #4DC820 100%)" }} />
          <div className="container mx-auto py-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  <Award size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ background: "rgba(77,200,32,0.15)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}>
                  Coach Tier
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Become a{" "}
                <span className="cc-gradient-text">CheatCode Coach</span>
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#98A2B3" }}>
                Share your edge. Build your brand. Keep 80% of every dollar. Host courses, 1-on-1s, and communities directly on CheatCode OS.
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto">
            {!submitted ? (
              <>
                {/* Step indicator */}
                <div className="flex justify-center mb-8">
                  <StepIndicator current={step} />
                </div>

                {/* Step content */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  {step === 1 && <Step1 onNext={() => setStep(2)} />}
                  {step === 2 && <Step2 data={formData} setData={setFormData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
                  {step === 3 && <Step3 data={formData} setData={setFormData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
                  {step === 4 && <Step4 data={formData} setData={setFormData} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
                  {step === 5 && <Step5 data={formData} onBack={() => setStep(4)} onSubmit={handleSubmit} />}
                </div>
              </>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-8">
                <SuccessScreen />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
