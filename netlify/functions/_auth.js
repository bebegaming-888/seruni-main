/**
 * netlify/functions/_auth.js
 *
 * Shared HMAC authentication helpers for Netlify Functions.
 * Mirrors the auth pattern used in the Express server.
 *
 * Env vars:
 *   ADMIN_SESSION_SECRET — HMAC signing secret (set via Netlify dashboard)
 */

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";

// ── Low-level HMAC helpers ─────────────────────────────────────────────────────

export async function hmacSha256Hex(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacVerify(data, signature, secret) {
  if (!signature || !secret) return false;
  const expected = await hmacSha256Hex(data, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// Build the payload string that was signed on the client
export function buildSignPayload(userId, role, expiresAt) {
  return [userId, role, expiresAt].join("|");
}

// ── Auth guard for Netlify Functions ───────────────────────────────────────────

/**
 * Verify the Authorization: Bearer <session> header.
 * Returns { ok: true, session: {...} } or { ok: false, error, code }.
 */
export async function requireAuth(event) {
  const header = event.headers?.["authorization"] ?? event.headers?.["Authorization"] ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return { ok: false, error: "Missing Authorization header", code: 401 };
  }

  let session;
  try {
    session = JSON.parse(token);
  } catch {
    return { ok: false, error: "Invalid session token", code: 401 };
  }

  const { userId, role, expiresAt, sig } = session;

  // Session must not be expired
  if (!expiresAt || Date.now() > Number(expiresAt)) {
    return { ok: false, error: "Session expired", code: 401 };
  }

  if (!ADMIN_SESSION_SECRET) {
    // Dev / not configured: skip HMAC verification
    return { ok: true, session };
  }

  // Verify HMAC signature
  const payload = buildSignPayload(userId, role, expiresAt);
  const valid = await hmacVerify(payload, sig, ADMIN_SESSION_SECRET);
  if (!valid) {
    return { ok: false, error: "Invalid session signature", code: 401 };
  }

  return { ok: true, session };
}

// ── Response helpers ───────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "";
const CORS_ORIGIN =
  ALLOWED_ORIGIN === "*"
    ? "*"
    : ALLOWED_ORIGIN
      ? ALLOWED_ORIGIN.split(",").map((o) => o.trim())
      : [];

function isOriginAllowed(origin) {
  if (CORS_ORIGIN.length === 0) return false;
  if (CORS_ORIGIN.includes("*")) return true;
  return CORS_ORIGIN.includes(origin);
}

// ── Response helpers ───────────────────────────────────────────────────────────

export function buildCorsHeaders(event) {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? "";
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export const headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export function json(data, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify(data) };
}
