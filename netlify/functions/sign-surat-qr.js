/**
 * Netlify Function: sign-surat-qr
 *
 * Server-side QR payload signing — QR_SECRET tidak pernah masuk browser bundle.
 *
 * Env vars (set via Netlify dashboard → Site → Environment Variables):
 *   QR_SECRET          — HMAC signing key (WAJIB di production)
 *   SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */

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
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

exports.handler = async function (event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  const { no, nik, kode, signer = "Kepala Desa" } = body;
  if (!no || !nik || !kode) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Parameter no, nik, dan kode wajib diisi" }) };
  }

  const timestamp = new Date().toISOString();

  if (!QR_SECRET) {
    // Fallback: unsigned payload (degraded mode)
    const raw = ["SERUNI-MUMBUL", no, nik, kode, timestamp, "unsigned"].join("|");
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, raw, signature: "unsigned", timestamp }) };
  }

  // Server-side HMAC-SHA256 signing
  const data = ["SERUNI-MUMBUL", no, nik, kode, signer, timestamp].join("|");
  const signature = await hmacSha256Hex(data, QR_SECRET);
  const raw = [data, signature].join("|");

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, raw, signature, timestamp }),
  };
};