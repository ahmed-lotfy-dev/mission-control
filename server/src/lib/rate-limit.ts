import { Elysia } from "elysia";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of stores) {
    if (now >= entry.resetAt) stores.delete(key);
  }
}, 60_000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests. Please wait before retrying." } = options;

  return (app: Elysia) =>
    app.onBeforeHandle(({ request, set }) => {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const now = Date.now();
      let entry = stores.get(ip);

      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        stores.set(ip, entry);
      }

      entry.count++;

      // Set rate-limit headers
      set.headers ??= {};
      set.headers["X-RateLimit-Limit"] = String(max);
      set.headers["X-RateLimit-Remaining"] = String(Math.max(0, max - entry.count));
      set.headers["X-RateLimit-Reset"] = String(Math.ceil(entry.resetAt / 1000));

      if (entry.count > max) {
        set.status = 429;
        set.headers["Retry-After"] = String(Math.ceil((entry.resetAt - now) / 1000));
        return { error: message, status: 429 };
      }
    });
}

// Pre-configured limiters
export const strictLimiter = rateLimit({ windowMs: 60_000, max: 60 });     // 60 req/min — SEO tab needs multiple endpoints on load
export const standardLimiter = rateLimit({ windowMs: 60_000, max: 120 });   // 120 req/min
export const relaxedLimiter = rateLimit({ windowMs: 60_000, max: 300 });    // 300 req/min
