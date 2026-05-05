/**
 * Edge Function: /api/auth/verify-otp
 *
 * Verifikasi OTP dan return JWT session token untuk warga.
 *
 * Alur:
 *   1. Terima NIK + OTP
 *   2. Cek di tabel otp_requests — OTP harus match, belum used, belum expired
 *   3. Jika valid → buat JWT-like session, mark OTP as used, return token
 *   4. Jika invalid/expired → return error
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   JWT_SECRET (untuk sign token, atau gunakan Supabase JWT)
 *
 * Request body:
 *   { nik: string; otp: string }
 *
 * Response:
 *   { ok: true, token: string; warga: { id, nama, nik, no_hp } }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";

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
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Buat session token sederhana (base64 JSON).
 * Production: ganti dengan Supabase Auth JWT atau signed JWT.
 */
function createSessionToken(payload: Record<string, unknown>): string {
  // Simple base64 session token (bukan cryptographic signature)
  // Production: gunakan @supabase/ssr dengan signed JWT
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(
    JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
  );
  return `${header}.${body}.sig`;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { nik, otp } = body;

  if (!nik || !otp) {
    return new Response(JSON.stringify({ ok: false, error: "NIK dan OTP wajib diisi" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createAdminClient(context.env);

  // Cek OTP yang paling baru, belum used, belum expired
  const { data: otpRecord, error: otpErr } = await sb
    .from("otp_requests")
    .select("*")
    .eq("nik", nik)
    .eq("otp_hash", otp)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpErr || !otpRecord) {
    // Jangan reveal apakah NIK ada atau OTP yang salah
    return new Response(
      JSON.stringify({ ok: false, error: "Kode OTP tidak valid atau sudah kadaluarsa" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // Mark OTP as used
  await sb.from("otp_requests").update({ used: true }).eq("id", otpRecord.id);

  // Ambil data warga
  const { data: warga } = await sb
    .from("warga")
    .select("id, nik, nama, no_hp")
    .eq("nik", nik)
    .single();

  if (!warga) {
    return new Response(JSON.stringify({ ok: false, error: "Data warga tidak ditemukan" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Buat session token
  const sessionToken = createSessionToken({
    sub: warga.id,
    nik: warga.nik,
    nama: warga.nama,
    role: "warga",
  });

  // Log login
  await sb.from("audit_log").insert({
    username: `warga:${warga.nik}`,
    action: "warga.login",
    detail: `Login warga: ${warga.nama}`,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      token: sessionToken,
      warga: {
        id: warga.id,
        nama: warga.nama,
        nik: warga.nik,
        no_hp: warga.no_hp,
      },
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
