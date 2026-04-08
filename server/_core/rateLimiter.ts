/**
 * In-memory rate limiter for Express routes.
 *
 * Uses a sliding-window counter keyed by IP address.
 * Suitable for production use on a single-process Node.js server.
 * For multi-process deployments, replace the in-memory store with Redis.
 *
 * Usage:
 *   app.use("/api/trpc/ingest", createRateLimiter({ maxRequests: 10, windowMs: 60_000 }));
 */

import type { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window. Default: 10 */
  maxRequests?: number;
  /** Time window in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Human-readable message returned when rate limit is exceeded */
  message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates an Express middleware that limits requests per IP.
 * Returns 429 Too Many Requests when the limit is exceeded.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    maxRequests = 10,
    windowMs = 60_000,
    message = "Too many requests. Please wait a moment before trying again.",
  } = options;

  // IP → { count, resetAt }
  const store = new Map<string, WindowEntry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    Array.from(store.entries()).forEach(([ip, entry]) => {
      if (entry.resetAt <= now) {
        store.delete(ip);
      }
    });
  }, windowMs * 2);

  // Allow the process to exit even if the interval is still running
  cleanupInterval.unref();

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      // First request in this window (or window has expired)
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count < maxRequests) {
      entry.count++;
      return next();
    }

    // Rate limit exceeded
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSecs));
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    return res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message,
      retryAfterSeconds: retryAfterSecs,
    });
  };
}
