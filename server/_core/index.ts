import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerUploadRoute } from "../upload";
import { startScheduler } from "../scheduler";
import { createRateLimiter } from "./rateLimiter";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Media upload endpoint
  registerUploadRoute(app);
  // Health check for Railway / load balancers
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "cheatcode-os-trpc" }));

  // Rate limit ingest endpoints: max 10 requests per IP per minute
  // This covers all /api/trpc/ingest.* procedures (analyseVideo, submitVideo, etc.)
  app.use("/api/trpc/ingest", createRateLimiter({ maxRequests: 10, windowMs: 60_000 }));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // K.AI batch quote endpoint — Polygon snapshot, batched.
  app.get("/api/kai/quotes", async (req, res) => {
    const raw = (req.query.symbols as string | undefined) ?? "";
    const symbols = raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s))
      .slice(0, 60);
    if (symbols.length === 0) return res.json({ quotes: [] });
    const polyKey = process.env.POLYGON_API_KEY ?? "";
    if (!polyKey) return res.status(503).json({ error: "POLYGON_API_KEY not configured" });
    try {
      const url =
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbols.join(",")}&apiKey=${polyKey}`;
      const resp = await fetch(url);
      if (!resp.ok) return res.status(502).json({ error: `Polygon ${resp.status}` });
      const json: any = await resp.json();
      const tickers = Array.isArray(json.tickers) ? json.tickers : [];
      const quotes = tickers.map((t: any) => {
        const lastPrice = t?.lastTrade?.p ?? t?.day?.c ?? t?.prevDay?.c ?? 0;
        const prev = Number(t?.prevDay?.c ?? 0);
        return {
          symbol: t?.ticker ?? "",
          price: Number(lastPrice),
          change_pct: Number(t?.todaysChangePerc ?? 0),
          prev_close: prev,
          volume: Number(t?.day?.v ?? 0),
          ts: Math.floor(Date.now() / 1000),
        };
      }).filter((q: any) => q.symbol);
      res.json({ quotes });
    } catch (e) {
      console.error("[/api/kai/quotes] error:", e);
      res.status(500).json({ error: "fetch failed" });
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the daily auto-ingest scheduler
    startScheduler();
  });
}

startServer().catch(console.error);
