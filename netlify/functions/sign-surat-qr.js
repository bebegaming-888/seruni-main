/**
 * netlify/functions/sign-surat-qr.js
 *
 * Patched: H-02 — needs HMAC auth to match Express server (/api/sign-surat-qr).
 * Uses _auth.js shared module for session verification.
 *
 * Env vars (set via Netlify dashboard → Site → Environment Variables):
 *   ADMIN_SESSION_SECRET — HMAC signing secret (matches server-side secret)
 *   QR_SECRET            — HMAC signing key for QR payload (WAJIB di production)
 *   SUPABASE_URL        — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */

import { requireAuth, headers as defaultHeaders, json } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QR_SECRET = process.env.QR_SECRET;

async function hmacSha256Hex(data, secret) {
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

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSha256Hex(data, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export const handler = async function (event) {
  // ── HMAC auth guard ───────────────────────────────────────────────────────
  const auth = requireAuth(event);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.code);
  // ── HMAC auth guard ───────────────────────────────────────────────────────

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: defaultHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { no, nik, kode, signer = "Kepala Desa" } = body;
  if (!no || !nik || !kode) {
    return json({ ok: false, error: "Parameter no, nik, dan kode wajib diisi" }, 400);
  }

  const timestamp = new Date().toISOString();

  if (!QR_SECRET) {
    // Fallback: unsigned payload (degraded mode)
    const raw = ["SERUNI-MUMBUL", no, nik, kode, timestamp, "unsigned"].join("|");
    return json({ ok: true, raw, signature: "unsigned", timestamp });
  }

  // Server-side HMAC-SHA256 signing
  const data = ["SERUNI-MUMBUL", no, nik, kode, signer, timestamp].join("|");
  const signature = await hmacSha256Hex(data, QR_SECRET);
  const raw = [data, signature].join("|");

  return json({ ok: true, raw, signature, timestamp });
};
