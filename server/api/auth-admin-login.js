/**
 * POST /api/auth/admin-login
 *
 * Admin login with credentials from environment variables.
 * Includes IP-based rate limiting and account lockout mechanism.
 *
 * Auth: None
 * Body: { username: string, password: string, remember?: boolean }
 * Response: { ok: true, data: { session } } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import { badRequest, unauthorized, serverError, rateLimit, ok } from "../lib/api-response.js";

const router = express.Router();

// ── Config ─────────────────────────────────────────────────────────────────────

const ADMIN_USER = process.env.ADMIN_USER ?? "";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const LOCKOUT_WINDOW_MS = 30 * 60 * 1000;
const LOCKOUT_THRESHOLD = 15;
const MAX_CREDS_LEN = 64;

// ── Rate Limiting State (in-memory, resets on restart) ───────────────────────

const loginAttempts = new Map(); // ip → [timestamp, ...]
const accountLockouts = new Map(); // username → lockout expiry timestamp

// ── Helpers ────────────────────────────────────────────────────────────────────

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
}

function checkIpRateLimit(ip) {
  const now = Date.now();
  const recent = (loginAttempts.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  loginAttempts.set(ip, recent);
  return true;
}

function isAccountLocked(username) {
  const lockExpiry = accountLockouts.get(username);
  if (lockExpiry && Date.now() < lockExpiry) return true;
  accountLockouts.delete(username);
  return false;
}

function recordFailedAttempt(username) {
  const fails = (loginAttempts.get(`fail:${username}`) ?? []).filter(
    (t) => Date.now() - t < RATE_LIMIT_WINDOW_MS,
  );
  fails.push(Date.now());
  loginAttempts.set(`fail:${username}`, fails);
  if (fails.length >= LOCKOUT_THRESHOLD) {
    accountLockouts.set(username, Date.now() + LOCKOUT_WINDOW_MS);
  }
}

function clearFailedAttempts(username) {
  loginAttempts.delete(`fail:${username}`);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Both strings are padded to MAX_CREDS_LEN before comparison.
 */
function timingSafeEquals(a, b) {
  const paddedA = String(a ?? "")
    .slice(0, MAX_CREDS_LEN)
    .padEnd(MAX_CREDS_LEN, "\0");
  const paddedB = String(b ?? "")
    .slice(0, MAX_CREDS_LEN)
    .padEnd(MAX_CREDS_LEN, "\0");
  return crypto.timingSafeEqual(Buffer.from(paddedA), Buffer.from(paddedB));
}

// ── Route Handler ────────────────────────────────��────────────────────────────

router.post("/", (req, res) => {
  // Fail closed if credentials not configured
  if (!ADMIN_USER || !ADMIN_PASS) {
    console.error("[admin-login] ADMIN_USER or ADMIN_PASS not set — login disabled.");
    return serverError(res);
  }

  const clientIp = getClientIp(req);
  const { username, password, remember } = req.body ?? {};

  // Input validation
  if (!username || !password) {
    return badRequest(res, "Username dan password wajib diisi.");
  }

  // IP-based rate limit check
  if (!checkIpRateLimit(clientIp)) {
    return rateLimit(res, "Terlalu banyak percobaan login dari IP ini. Coba lagi dalam 15 menit.");
  }

  // Account lockout check (after excessive failures)
  if (isAccountLocked(username)) {
    return rateLimit(
      res,
      "Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.",
    );
  }

  // Timing-safe credential comparison
  const usernameOk = timingSafeEquals(username, ADMIN_USER);
  const passwordOk = timingSafeEquals(password, ADMIN_PASS);

  if (!usernameOk || !passwordOk) {
    recordFailedAttempt(username);
    return unauthorized(res, "Username atau password salah.");
  }

  // Success — clear failed attempts
  clearFailedAttempts(username);

  // Generate session
  const session = {
    id: crypto.randomUUID(),
    username: ADMIN_USER,
    name: "Super Admin",
    role: "Super Admin",
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (remember ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString(),
  };

  console.info(`[admin-login] Login successful: ${ADMIN_USER} from ${clientIp}`);
  return ok(res, { session });
});

export default router;
