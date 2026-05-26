/**
 * Rate Limiting Middleware
 *
 * Implements IP-based rate limiting using express-rate-limit.
 * All limiters return a consistent response format:
 *   { ok: false, error: "message", code: 429 }
 *
 * IMPORTANT: These are in-memory and reset on server restart.
 * For production multi-instance deployments, migrate to Redis-backed
 * rate limiting or use Supabase RPC-based counting.
 */

import rateLimit from "express-rate-limit";

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create a standardized rate limiter with consistent response format.
 * All limiters return: { ok: false, error: "...", code: 429 }
 *
 * @param {object} options
 * @param {string} options.windowMs
 * @param {number} options.max
 * @param {string} options.message — human-readable Indonesian error message
 * @param {boolean} [options.skip] — optional skip predicate
 */
function createLimiter({ windowMs, max, message, skip } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    skip,
    message: {
      ok: false,
      error: message,
      code: 429,
    },
  });
}

// ── Specific Limiters ─────────────────────────────────────────────────────────

/**
 * OTP Request — 3 per 15 min per IP.
 * For warga (citizen) OTP login requests.
 */
export const otpRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Terlalu banyak permintaan OTP. Silakan coba lagi dalam 15 menit.",
  skip: () => !process.env.SUPABASE_URL, // Skip if DB not configured (dev mode)
});

/**
 * Admin Login — 5 per 15 min per IP.
 * Complements the in-app account lockout mechanism.
 */
export const adminLoginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
});

/**
 * Session Refresh — 10 per hour per IP.
 * Prevents token enumeration attacks.
 */
export const refreshTokenRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak permintaan refresh. Silakan coba lagi nanti.",
});

/**
 * General API — 30 per minute per IP.
 * Default limiter for endpoints without specific limits.
 */
export const generalApiRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
});

/**
 * Sign QR — 10 per minute per IP.
 * Prevents abuse of QR signing endpoint.
 */
export const signQrRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Terlalu banyak permintaan tanda tangan QR. Silakan coba lagi nanti.",
});

/**
 * Download PDF — 15 per minute per IP.
 */
export const downloadPdfRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Terlalu banyak permintaan unduh PDF. Silakan coba lagi nanti.",
});

/**
 * Public Endpoints — 60 per minute per IP.
 * For verify-surat, surat-estimasi, and other public-facing endpoints.
 */
export const publicEndpointRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
});
