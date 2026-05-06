/**
 * Edge Function: /api/auth/verify-otp
 *
 * Verifikasi OTP dan return JWT session token untuk warga.
 *
 * Alur:
 *   1. Terima NIK + OTP
 *   2. Cek di tabel otp_requests — OTP harus match, belum used, belum expired
 *   3. Jika valid → buat HMAC-SHA256 session, mark OTP as used, return token
 *   4. Jika invalid/expired → return error
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   JWT_SECRET (wajib di production — digunakan untuk sign session token)
 *
 * Request body:
 *   { nik: string; otp: string }
 *
 * Response:
 *   { ok: true, token: string; warga: { id, nama, nik, no_hp } }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { hashOtp, json, corsOptions } from "../../_lib/utils";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET?: string;
}

interface RequestBody {
  nik: string;
  otp: string;
}

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** HMAC-SHA256 signed session token.
 * JWT_SECRET wajib di-set di production (via wrangler secrets).
 * Tanpa secret, session token tidak di-sign dan tidak boleh digunakan.
 */
async function createSessionToken(
  payload: Record<string, unknown>,
  secret?: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "");
  const bodyB64 = btoa(JSON.stringify(body)).replace(/=/g, "");

  if (!secret) {
    // No secret configured — reject in all environments.
    // import.meta.env.DEV does NOT work in Cloudflare Workers.
    throw new Error("JWT_SECRET tidak dikonfigurasi — set dengan `wrangler secret put JWT_SECRET`");
  }

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
  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { nik, otp } = body;

  if (!nik || !otp) {
    return json({ ok: false, error: "NIK dan OTP wajib diisi" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  // Cek OTP yang paling baru, belum used, belum expired
  const { data: otpRecord, error: otpErr } = await sb
    .from("otp_requests")
    .select("*")
    .eq("nik", nik)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpErr || !otpRecord) {
    // Jangan reveal apakah NIK ada atau OTP yang salah
    return json({ ok: false, error: "Kode OTP tidak valid atau sudah kadaluarsa" }, 401);
  }

  // Verifikasi OTP hash SHA-256
  const { data: warga } = await sb
    .from("warga")
    .select("id, nik, nama, no_hp")
    .eq("nik", nik)
    .single();

  // Verifikasi hash secara manual (bandingkan hasil hash OTP input dengan stored hash)
  const valid = (await hashOtp(otp)) === (otpRecord.otp_hash as string);
  if (!valid) {
    return json({ ok: false, error: "Kode OTP tidak valid atau sudah kadaluarsa" }, 401);
  }

  // Mark OTP as used — wrap in try/catch so failure doesn't break the login flow
  // OTP will expire anyway within 5 minutes
  try {
    await sb.from("otp_requests").update({ used: true }).eq("id", otpRecord.id);
  } catch (markErr) {
    console.error("[verify-otp] Failed to mark OTP used:", markErr);
    // Non-fatal — OTP expires in 5 min anyway
  }

  if (!warga) {
    return json({ ok: false, error: "Data warga tidak ditemukan" }, 404);
  }

  // Buat session token — throws if JWT_SECRET not configured
  let sessionToken: string;
  try {
    sessionToken = await createSessionToken(
      {
        sub: warga.id,
        nik: warga.nik,
        nama: warga.nama,
        role: "warga",
      },
      context.env.JWT_SECRET,
    );
  } catch (tokenErr) {
    console.error("[verify-otp] Session token creation failed:", tokenErr);
    return json({ ok: false, error: "Server misconfigured — JWT_SECRET belum di-set" }, 500);
  }

  // Log login (non-blocking)
  sb.from("audit_log")
    .insert({
      username: `warga:${warga.nik}`,
      action: "warga.login",
      detail: `Login warga: ${warga.nama}`,
    })
    .then(() => {})
    .catch(() => {});

  return json(
    {
      ok: true,
      token: sessionToken,
      warga: {
        id: warga.id,
        nama: warga.nama,
        nik: warga.nik,
        no_hp: warga.no_hp,
      },
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    },
    200,
  );
}
