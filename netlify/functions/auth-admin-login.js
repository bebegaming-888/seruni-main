// Netlify Function: Admin Login
// POST /api/auth/admin-login
// Body: { username, password, remember }
// Returns: { ok: true, session } or { ok: false, error }

import crypto from "crypto";

// Rate limit store: { ip -> { count, resetAt } }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // max 5 attempts per window

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Lazy cleanup: clean expired entries on each invocation
// (setInterval is avoided — it keeps the Node event loop alive in serverless)
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(ip);
  }
}

export const handler = async (event) => {
  // Clean expired rate-limit entries on every warm invocation
  cleanupExpiredEntries();

  // Get client IP (Netlify provides via headers)
  const clientIp =
    event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers?.["x-real-ip"] ||
    "unknown";

  // CORS — restrict to same origin in production
  const requestOrigin = event.headers?.origin || event.headers?.referer || "";
  const allowedOrigin = requestOrigin.startsWith("https://seruni-mumbul")
    ? requestOrigin
    : requestOrigin.startsWith("http://localhost") || requestOrigin.startsWith("http://127.0.0.1")
      ? requestOrigin
      : "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Only POST allowed
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  // Rate limit check
  if (!checkRateLimit(clientIp)) {
    console.warn(`[admin-login] Rate limited IP: ${clientIp}`);
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
      }),
    };
  }

  // --- REQUIRED ENV VARS (NO FALLBACK) ---
  const ADMIN_USER = process.env.VITE_ADMIN_USER;
  const ADMIN_PASS = process.env.VITE_ADMIN_PASS;

  // If env vars not set, reject immediately (never hardcoded default)
  if (!ADMIN_USER || !ADMIN_PASS) {
    console.error("[admin-login] FATAL: VITE_ADMIN_USER or VITE_ADMIN_PASS not set");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Server misconfigured" }),
    };
  }

  try {
    const { username, password, remember } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Username dan password wajib diisi" }),
      };
    }

    // Verify credentials
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      console.warn(`[admin-login] Failed attempt for user: ${username} from IP: ${clientIp}`);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Username atau password salah" }),
      };
    }

    // Success — log it
    console.log(`[admin-login] Successful login for user: ${username} from IP: ${clientIp}`);

    // Generate session (compatible with getSessionAsync client-side)
    const session = {
      id: crypto.randomUUID(),
      username: ADMIN_USER,
      name: "Super Admin",
      role: "Super Admin",
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (remember ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString(),
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, session }),
    };
  } catch (error) {
    console.error("[admin-login] Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Internal server error" }),
    };
  }
};
