/**
 * Rate Limiter for Cloudflare Pages Edge Functions.
 *
 * Uses an in-memory rolling window per IP address.
 * For multi-instance deployments (Cloudflare Workers autoscaling), this
 * acts as per-instance rate limiting. For true distributed rate limiting,
 * swap the in-memory Map for Cloudflare KV or Redis.
 *
 * Usage:
 *   const rl = createRateLimiter({ type: "public" });
 *   const check = rl.check(ip);
 *   if (!check.ok) return check.response; // HTTP 429
 *   // ... continue handler
 */

export type RateLimitType = "public" | "auth" | "admin";

const LIMITS: Record<RateLimitType, { max: number; windowMs: number }> = {
  public: { max: 30, windowMs: 60_000 }, // 30 req / 60 detik
  auth: { max: 10, windowMs: 60_000 }, // 10 req / 60 detik (lebih ketat untuk auth)
  admin: { max: 60, windowMs: 60_000 }, // 60 req / 60 detik
};

/** In-memory store — wiped on each Cloudflare Workers instance cold start. */
const store = new Map<string, { count: number; windowStart: number }>();

/** Cleanup expired entries every 60 seconds to prevent memory leak. */
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  for (const [key, val] of store.entries()) {
    if (now - val.windowStart > 120_000) store.delete(key);
  }
  lastCleanup = now;
}

export interface RateLimitResult {
  ok: boolean;
  /** Current request count in this window */
  count: number;
  /** Max allowed in this window */
  limit: number;
  /** Seconds until the rate limit window resets (for Retry-After header) */
  retryAfter: number;
  /** Ready-to-send 429 Response, only present when !ok */
  response?: Response;
}

function json(data: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}

export function createRateLimiter(type: RateLimitType) {
  const { max, windowMs } = LIMITS[type];

  function check(ip: string): RateLimitResult {
    cleanup();

    const now = Date.now();
    const entry = store.get(ip);
    const windowStart = entry?.windowStart ?? now;

    // Window expired — reset
    if (!entry || now - windowStart > windowMs) {
      store.set(ip, { count: 1, windowStart: now });
      return { ok: true, count: 1, limit: max, retryAfter: Math.ceil(windowMs / 1000) };
    }

    const newCount = entry.count + 1;

    if (newCount > max) {
      const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);
      return {
        ok: false,
        count: entry.count,
        limit: max,
        retryAfter,
        response: json(
          {
            ok: false,
            error: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
            retry_after: retryAfter,
          },
          429,
          { "Retry-After": String(retryAfter) },
        ),
      };
    }

    store.set(ip, { count: newCount, windowStart });
    return {
      ok: true,
      count: newCount,
      limit: max,
      retryAfter: Math.ceil((windowStart + windowMs - now) / 1000),
    };
  }

  return { check, type };
}

/** Extract client IP from Cloudflare Headers or standard headers. */
export function getClientIp(request: Request): string {
  // Cloudflare Workers injects these headers
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Standard proxy headers (X-Forwarded-For can have multiple IPs)
  const xForwarded = request.headers.get("x-forwarded-for");
  if (xForwarded) {
    return xForwarded.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  // Fallback — Cloudflare always provides cf-connecting-ip
  return "unknown";
}
