/**
 * server/middleware/auth.js
 *
 * Shared admin session verification middleware.
 * Used by all protected API endpoints.
 *
 * Architecture:
 *   verifyAdmin    — full check: HMAC sig + expiry + revocation (use for writes/sensitive ops)
 *   verifyAdminLight — expiry check only (use for read-only, non-sensitive endpoints)
 *   hmacVerify     — constant-time HMAC-SHA256 comparison (exported for reuse)
 *   buildSignPayload — standard payload format (exported for reuse)
 *
 * HMAC Flow:
 *   Server issues unsigned session → client calls /api/auth/sign-session → server signs
 *   ADMIN_SESSION_SECRET signs userId|role|expiresAt with HMAC-SHA256
 *   Constant-time comparison prevents timing attacks
 *
 * Dev Bypass Policy:
 *   In non-production (NODE_ENV !== "production"), unsigned sessions are ALLOWED.
 *   This lets developers test without going through the full sign-session flow.
 *   In production, unsigned sessions are always rejected.
 *
 * Usage:
 *   import { verifyAdmin } from "../middleware/auth.js";
 *   router.post("/", verifyAdmin, async (req, res) => { ... });
 */

import crypto from "crypto";

// ── Env (lazy access — avoids crash if not set at import time) ─────────────────

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

const IS_PROD = process.env.NODE_ENV === "production";

// ── HMAC Utilities (exported for reuse across routes) ─────────────────────────

/**
 * Build the HMAC payload string used for both signing and verification.
 * @param {string} userId
 * @param {string} role
 * @param {string} expiresAt — ISO string
 */
export function buildSignPayload(userId, role, expiresAt) {
  return `${userId}|${role}|${expiresAt}`;
}

/**
 * Verify HMAC-SHA256 signature using Node.js crypto.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param {string} data — payload string
 * @param {string} sig  — 64-char hex signature
 * @param {string} secret
 * @returns {boolean}
 */
export function hmacVerify(data, sig, secret) {
  if (!sig || sig.length !== 64) return false;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Node.js crypto-based HMAC signing (exported for sign-session endpoint).
 * @param {string} data
 * @param {string} secret
 * @returns {string} 64-char hex signature
 */
export function hmacSign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// ── Session Revocation Check ───────────────────────────────────────────────────

/**
 * Returns true if the session has been revoked in the revoked_sessions table.
 * Safe to call when Supabase is not configured (returns false).
 */
export async function isSessionRevoked(sessionId) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return false;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, serviceKey);
    const { data } = await sb
      .from("revoked_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// ── Core Auth Middleware ───────────────────────────────────────────────────────

/**
 * verifyAdmin — Full admin session verification.
 *
 * Checks:
 *   1. Bearer token present in Authorization header
 *   2. Session JSON valid and has required fields
 *   3. Session not expired
 *   4. Session not revoked (via Supabase)
 *   5. HMAC signature valid (required in production, optional in dev)
 *
 * On success: attaches req.adminSession
 * On failure: returns { ok: false, error, code } JSON response
 */
export async function verifyAdmin(req, res) {
  const authHeader = req.headers["authorization"] ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "Authorization header required",
      code: 401,
    });
  }

  let session;
  try {
    session = JSON.parse(authHeader.slice(7));
  } catch {
    return res.status(401).json({
      ok: false,
      error: "Invalid session format",
      code: 401,
    });
  }

  if (!session?.userId || !session?.role || !session?.expiresAt) {
    return res.status(401).json({
      ok: false,
      error: "Incomplete session — missing required fields",
      code: 401,
    });
  }

  // Expiry check
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({
      ok: false,
      error: "Session expired",
      code: 401,
    });
  }

  // Revocation check (H-02)
  const revoked = await isSessionRevoked(session.userId);
  if (revoked) {
    return res.status(401).json({
      ok: false,
      error: "Sesi telah dicabut. Silakan login ulang.",
      code: 401,
    });
  }

  // HMAC signature check (H-01)
  const secret = getSecret();
  if (secret && secret.length >= 32) {
    const sig = session.sig ?? "";
    if (sig.length === 0) {
      // Unsigned session — reject in production, allow in dev
      if (IS_PROD) {
        return res.status(401).json({
          ok: false,
          error: "Session signature required",
          code: 401,
        });
      }
      // Dev mode: allow unsigned session through
    } else {
      const payload = buildSignPayload(session.userId, session.role, session.expiresAt);
      if (!hmacVerify(payload, sig, secret)) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session signature",
          code: 401,
        });
      }
    }
  } else if (IS_PROD) {
    // Production requires HMAC secret
    console.error(
      "[auth-mw] CRITICAL: ADMIN_SESSION_SECRET not configured. " +
        "Session auth DISABLED — rejecting request.",
    );
    return res.status(503).json({
      ok: false,
      error: "Server misconfigured — HMAC secret tidak tersedia",
      code: 503,
    });
  }

  // Attach verified session
  req.adminSession = session;
  return null; // Signal: proceed to next handler
}

/**
 * verifyAdminLight — Lightweight expiry-only verification.
 *
 * Use for read-only, non-sensitive endpoints where immediate revocation
 * is not critical. Does NOT check HMAC or revocation.
 *
 * On success: attaches req.adminSession
 * On failure: returns { ok: false, error, code } JSON response
 */
export async function verifyAdminLight(req, res) {
  const authHeader = req.headers["authorization"] ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "Authorization header required",
      code: 401,
    });
  }

  let session;
  try {
    session = JSON.parse(authHeader.slice(7));
  } catch {
    return res.status(401).json({
      ok: false,
      error: "Invalid session format",
      code: 401,
    });
  }

  if (!session?.userId || !session?.role || !session?.expiresAt) {
    return res.status(401).json({
      ok: false,
      error: "Incomplete session",
      code: 401,
    });
  }

  const expiryMs = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expiryMs)) {
    return res.status(401).json({
      ok: false,
      error: "Invalid expiry date",
      code: 401,
    });
  }

  if (expiryMs < Date.now()) {
    return res.status(401).json({
      ok: false,
      error: "Session expired",
      code: 401,
    });
  }

  req.adminSession = session;
  return null;
}

/**
 * Role-based access guard — use after verifyAdmin.
 *
 * @param {string[]} allowedRoles — roles permitted to access the endpoint
 * @returns {boolean} true if authorized, false (response already sent)
 */
export function checkRole(res, session, allowedRoles) {
  if (!allowedRoles.includes(session?.role)) {
    return res.status(403).json({
      ok: false,
      error: "Anda tidak memiliki izin untuk mengakses resource ini.",
      code: 403,
    });
  }
  return true;
}

/**
 * Parse admin session from request without full verification.
 * Returns null if no valid session token present.
 * Does NOT verify HMAC or revocation — use only for logging/audit.
 */
export function parseSessionUnverified(req) {
  const authHeader = req.headers["authorization"] ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  try {
    return JSON.parse(authHeader.slice(7));
  } catch {
    return null;
  }
}
