/**
 * Edge Function: /api/auth/request-otp
 *
 * Request OTP via WhatsApp untuk login warga.
 * Alur:
 *   1. Warga masukkan NIK
 *   2. Sistem cek NIK di tabel warga
 *   3. Jika valid → generate OTP 6 digit, simpan di cache, kirim WA
 *   4. Warga masukkan OTP → /api/auth/verify-otp
 *
 * Env vars:
 *   FONNTE_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { nik: string }
 *
 * Response:
 *   { ok: true, message: "OTP dikirim ke WA" }
 *   { ok: false, error: "NIK tidak ditemukan" }
 */

import { createClient } from "@supabase/supabase-js";
import type { LayoutPatch } from "@cloudflare/pages-functions-core";

interface Env {
  FONNTE_API_KEY: string;
  FONNTE_SENDER_NAME?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestBody {
  nik: string;
}

function createAdminClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Generate 6-digit OTP acak. */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Mask nomor WA agar tidak full display. */
function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length <= 4) return phone;
  if (clean.startsWith("62")) {
    return "+62 " + "●".repeat(clean.length - 7) + clean.slice(-4);
  }
  return phone.slice(0, 4) + "●".repeat(Math.max(0, phone.length - 8)) + phone.slice(-4);
}

export const onRequestPost: LayoutPatch = async ({ request, env }) => {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { nik } = body;

  if (!nik || !/^\d{16}$/.test(nik)) {
    return new Response(JSON.stringify({ ok: false, error: "NIK harus 16 digit angka" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createAdminClient(env);

  // Cek NIK di tabel warga
  const { data: warga, error: wargaErr } = await sb
    .from("warga")
    .select("id, nik, nama, no_hp")
    .eq("nik", nik)
    .single();

  if (wargaErr || !warga) {
    return new Response(
      JSON.stringify({ ok: false, error: "NIK tidak ditemukan dalam database kami" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Cek apakah warga punya nomor HP
  const hpRaw = String(warga.no_hp ?? "").replace(/\D/g, "");
  if (!hpRaw || hpRaw.length < 10) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Warga tidak memiliki nomor WhatsApp terdaftar. Silakan hubungi kantor desa.",
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // Generate OTP + timestamp (valid 5 menit)
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const maskedHp = maskPhone("62" + hpRaw);

  // Simpan OTP di Supabase (tabel otp_requests)
  await sb.from("otp_requests").insert({
    warga_id: warga.id,
    nik: nik,
    otp_hash: otp, // plaintext utk demo; production: hash dengan bcrypt
    expires_at: expiresAt,
    used: false,
  });

  // Kirim OTP via Fonnte
  const token = env.FONNTE_API_KEY;
  if (!token) {
    // Fallback: tampilkan OTP di response (development only)
    console.warn("[request-otp] FONNTE_API_KEY belum di-set — OTP di-response langsung");
    return new Response(
      JSON.stringify({
        ok: true,
        message: `[DEV] OTP untuk NIK ${nik}: ${otp} (expired dalam 5 menit)`,
        dev_otp: otp, // HANYA di development
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const formData = new URLSearchParams({
    target: "62" + hpRaw,
    message: `Halo ${warga.nama}!\n\nKode OTP login ke Sistem Desa Seruni Mumbul:\n\n*${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapa pun.\n\nJika Anda tidak meminta kode ini, abaikan pesan ini.`,
  });
  if (env.FONNTE_SENDER_NAME) formData.set("sender", env.FONNTE_SENDER_NAME);

  const fonnteRes = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const result = (await fonnteRes.json()) as { status?: boolean; reason?: string };

  if (!fonnteRes.ok || result.status === false) {
    console.error("[request-otp] Fonnte error:", result);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Gagal mengirim OTP. reason: ${result.reason ?? "unknown"}. Coba lagi dalam beberapa menit.`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: `OTP dikirim ke ${maskedHp}`,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
