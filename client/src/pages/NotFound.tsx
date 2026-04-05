import { useLocation } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      {/* Spectrum top bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5"
           style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />

      <div className="text-center px-6 max-w-md">
        {/* Big score-style number */}
        <div className="text-[120px] font-black leading-none mb-2 cc-gradient-text"
             style={{ fontFamily: "var(--font-mono)" }}>
          404
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}>
          Page Not Found
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or may have been moved.
          Head back to Today's Picks to keep your edge.
        </p>

        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity"
          style={{ color: "#101828" }}
        >
          <Home size={15} />
          Back to Home
        </button>
      </div>
    </div>
  );
}
