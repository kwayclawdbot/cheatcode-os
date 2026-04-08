import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        // Always read the freshest token from Supabase session first.
        // Falls back to localStorage for the brief window before the
        // Supabase client has initialized (e.g., SSR hydration).
        try {
          const { data: { session } } = await import("./lib/supabase").then(m => m.supabase.auth.getSession());
          const token = session?.access_token ?? localStorage.getItem("sb-access-token");
          if (token) return { Authorization: `Bearer ${token}` };
        } catch {
          const token = localStorage.getItem("sb-access-token");
          if (token) return { Authorization: `Bearer ${token}` };
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Defense-in-depth: catch any synchronous error during React mount and
// render it to the DOM so we never get a pure-white screen. Also catches
// uncaught promise rejections and window errors for the first 5 seconds
// so we can see what's failing on cold start.
function renderFatal(msg: string, stack?: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="font-family:ui-monospace,monospace;padding:2rem;max-width:900px;margin:2rem auto;background:#fee;border:2px solid #c00;border-radius:8px;color:#000">
      <h2 style="margin:0 0 1rem;color:#c00">cheatcode-os: client crashed during mount</h2>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#fff;padding:1rem;border-radius:4px;margin:0;font-size:12px">${msg.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>
      ${stack ? `<details style="margin-top:1rem"><summary style="cursor:pointer;font-weight:bold">stack</summary><pre style="white-space:pre-wrap;background:#fff;padding:1rem;font-size:11px">${stack.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre></details>` : ""}
      <p style="margin-top:1rem;font-size:13px">Send this to Claude. Build: ${new Date().toISOString()}</p>
    </div>
  `;
}

window.addEventListener("error", (e) => {
  console.error("[window.error]", e);
  if (!document.getElementById("root")?.firstElementChild?.hasAttribute("data-reactroot") && !document.querySelector("#root *")) {
    renderFatal(String(e.error?.message || e.message), e.error?.stack);
  }
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandledrejection]", e);
  if (!document.querySelector("#root *")) {
    renderFatal("Unhandled promise rejection: " + String(e.reason?.message || e.reason), e.reason?.stack);
  }
});

try {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
} catch (err: any) {
  console.error("[mount crash]", err);
  renderFatal(String(err?.message || err), err?.stack);
}
