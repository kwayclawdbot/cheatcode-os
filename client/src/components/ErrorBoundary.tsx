import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log the real error to the browser console too so it's always discoverable
    // even if the overlay is dismissed, and persist the React componentStack
    // (which names the actual crashing component, not minified React internals).
    console.error("[ErrorBoundary] caught:", error);
    console.error("[ErrorBoundary] componentStack:", info.componentStack);
    this.setState({ componentStack: info.componentStack || null });
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-background">
          <div className="flex flex-col items-center w-full max-w-3xl p-6">
            <AlertTriangle size={40} className="text-destructive mb-4 flex-shrink-0" />

            <h2 className="text-xl font-bold mb-2">Something broke on this page.</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Screenshot the text below and send it to Kway.
            </p>

            {/* Real error message — NOT the minified React reconciler stack. */}
            <div className="w-full rounded-lg bg-destructive/10 border border-destructive/30 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-destructive mb-1">
                {err?.name || "Error"}
              </p>
              <p className="text-sm text-foreground font-mono break-words">
                {err?.message || String(err) || "(no message)"}
              </p>
            </div>

            {/* React component stack — tells us exactly which component blew up. */}
            {this.state.componentStack && (
              <div className="w-full p-4 rounded bg-muted overflow-auto mb-4 max-h-48">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Component stack
                </p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {this.state.componentStack}
                </pre>
              </div>
            )}

            {/* Raw JS stack — useful if sourcemaps are enabled. */}
            {err?.stack && (
              <details className="w-full mb-4">
                <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                  JS stack trace
                </summary>
                <div className="p-4 rounded bg-muted overflow-auto max-h-48">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {err.stack}
                  </pre>
                </div>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
