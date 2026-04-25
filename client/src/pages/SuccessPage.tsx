import { useLocation } from "wouter";
import { CheckCircle2, MessageSquare } from "lucide-react";

export default function SuccessPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="fixed top-0 left-0 right-0 h-0.5"
           style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />

      <div className="text-center px-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
             style={{ background: "linear-gradient(135deg, #4DC820 0%, #00AEEF 100%)" }}>
          <CheckCircle2 size={44} color="#fff" strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-black text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
          You're in.
        </h1>

        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          Your 7-day free trial is live. Kai will text you in a few seconds
          with your welcome message.
        </p>

        <div className="rounded-xl border border-border bg-card p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-foreground" />
            <span className="text-sm font-bold text-foreground">What happens next</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li>• Watch your phone — first text from Kai lands now</li>
            <li>• First alerts drop tomorrow at 8 AM ET</li>
            <li>• Reply anytime to ask about a ticker or setup</li>
            <li>• $99/mo after trial. Cancel anytime, no questions</li>
          </ul>
        </div>

        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity"
          style={{ color: "#101828" }}
        >
          Explore CheatCode OS
        </button>
      </div>
    </div>
  );
}
