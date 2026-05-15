/**
 * Edge Function: /api/auth/refresh
 *
 * Perpanjang session warga yang masih aktif.
 * Session token lama tetap valid (tidak di-revoke secara otomatis —
 * ini adalah stateless JWT, bukan session store).
 * Yang berubah hanya expiry di client-side.
 *
 * Jika token sudah expired, return error dan redirect ke login.
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { token: string }
 *
 * Response:
 *   { ok: true, expires_in: number }  — refresh berhasil
 *   { ok: false, error: string }      — token invalid/expired
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions, base64UrlDecode, verifyJwtSignature } from "../../_lib/utils";
import { createRateLimiter, getClientIp } from "../../_lib/rate-limit";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET?: string;
}

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Decode JWT payload (unverified — we check expiry only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

/** Re-sign a JWT with new expiry. */
async function resignJwt(token: string, secret: string, extraDays = 7): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const payload = JSON.parse(base64UrlDecode(parts[1]));
  // Update expiry
  payload.iat = Math.floor(Date.now() / 1000);
  payload.exp = Math.floor(Date.now() / 1000) + extraDays * 24 * 60 * 60;

  const headerB64 = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const bodyB64 = btoa(JSON.stringify(payload)).replace(/=/g, "");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${headerB64}.${bodyB64}`),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/=/g, "");
  return `${headerB64}.${bodyB64}.${sigB64}`;
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const rl = createRateLimiter("auth");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: { token: string };
  try {
    body = (await context.request.json()) as { token: string };
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { token } = body;
  if (!token) {
    return json({ ok: false, error: "Token wajib diisi" }, 400);
  }

  // Verify HMAC signature FIRST — before decoding or trusting any payload field
  const secret = context.env.JWT_SECRET;
  if (!secret) {
    return json({ ok: false, error: "Server misconfigured — JWT_SECRET belum di-set" }, 500);
  }
  const sigValid = await verifyJwtSignature(token, secret);
  if (!sigValid) {
    return json({ ok: false, error: "Token tidak valid — signature mismatch" }, 401);
  }

  // Decode payload ONLY AFTER signature is verified
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return json({ ok: false, error: "Token tidak valid" }, 401);
  }

  // Now safe to trust payload fields
  // Check expiry
  const exp = (payload.exp as number) ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    return json({ ok: false, error: "Session sudah habis. Silakan login ulang." }, 401);
  }

  // Check role
  if (payload.role !== "warga") {
    return json({ ok: false, error: "Token tidak valid untuk warga" }, 403);
  }

  // Re-sign with same payload but new expiry
  let newToken: string;
  try {
    newToken = await resignJwt(token, secret, 7);
  } catch {
    return json({ ok: false, error: "Gagal memperbarui session" }, 500);
  }

  // Log refresh (awaited)
  const sb = createAdminClient(context.env);
  if (sb) {
    try {
      await sb.from("audit_log").insert({
        username: `warga:${payload.nik}`,
        action: "warga.refresh",
        detail: `Session diperpanjang untuk warga ${payload.nama}`,
      });
    } catch (auditErr) {
      console.error("[refresh-warga-session] Audit log failed:", auditErr);
    }
  }

  return json({ ok: true, token: newToken, expires_in: 7 * 24 * 60 * 60 }, 200);
}
