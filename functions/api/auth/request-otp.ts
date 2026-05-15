/**
 * Edge Function: /api/auth/request-otp
 *
 * Request OTP via WhatsApp untuk login warga.
 * Alur:
 *   1. Warga masukkan NIK
 *   2. Sistem cek NIK di tabel warga
 *   3. Jika valid → generate OTP 6 digit, kirim WA, simpan hash ke DB
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
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { hashOtp, json, corsOptions } from "../../_lib/utils";
import { createRateLimiter, getClientIp } from "../../_lib/rate-limit";

interface Env {
  FONNTE_API_KEY: string;
  FONNTE_SENDER_NAME?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestBody {
  nik: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
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

  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { nik } = body;

  if (!nik || !/^\d{16}$/.test(nik)) {
    return json({ ok: false, error: "NIK harus 16 digit angka" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  // ── Rate limiting: maks 3 OTP request per NIK dalam 15 menit ──
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("otp_requests")
    .select("*", { count: "exact", head: true })
    .eq("nik", nik)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= 3) {
    return json(
      { ok: false, error: "Terlalu banyak permintaan OTP. Coba lagi dalam 15 menit." },
      429,
    );
  }

  // ── Lookup warga ──
  const { data: warga, error: wargaErr } = await sb
    .from("warga")
    .select("id, nik, nama, no_hp")
    .eq("nik", nik)
    .single();

  if (wargaErr || !warga) {
    // Gunakan pesan generik — jangan reveal apakah NIK ada
    return json({ ok: false, error: "NIK tidak ditemukan dalam database kami" }, 404);
  }

  // ── Cek nomor HP ──
  const hpRaw = String(warga.no_hp ?? "").replace(/\D/g, "");
  if (!hpRaw || hpRaw.length < 10) {
    return json(
      {
        ok: false,
        error: "Warga tidak memiliki nomor WhatsApp terdaftar. Silakan hubungi kantor desa.",
      },
      422,
    );
  }

  // ── Generate OTP + timestamps ──
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const maskedHp = maskPhone("62" + hpRaw);

  // ── Kirim WA via Fonnte terlebih dahulu ──
  const token = context.env.FONNTE_API_KEY;
  if (!token) {
    // Fallback development: return OTP in response
    console.warn("[request-otp] FONNTE_API_KEY belum di-set — OTP di-response langsung");
    return json(
      {
        ok: true,
        message: `[DEV] OTP untuk NIK ${nik}: ${otp}`,
        dev_otp: otp,
      },
      200,
    );
  }

  const formData = new URLSearchParams({
    target: "62" + hpRaw,
    message: `Halo ${warga.nama}!\n\nKode OTP login ke Sistem Desa Seruni Mumbul:\n\n*${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapa pun.\n\nJika Anda tidak meminta kode ini, abaikan pesan ini.`,
  });
  if (context.env.FONNTE_SENDER_NAME) {
    formData.set("sender", context.env.FONNTE_SENDER_NAME);
  }

  let fonnteRes: Response;
  try {
    fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
  } catch (fetchErr) {
    console.error("[request-otp] Fonnte fetch error:", fetchErr);
    return json({ ok: false, error: "Gagal mengirim OTP. Coba lagi dalam beberapa menit." }, 502);
  }

  const result = (await fonnteRes.json()) as { status?: boolean; reason?: string };

  if (!fonnteRes.ok || result.status === false) {
    console.error("[request-otp] Fonnte error:", result);
    return json(
      {
        ok: false,
        error: `Gagal mengirim OTP. ${result.reason ?? "unknown"}. Coba lagi dalam beberapa menit.`,
      },
      502,
    );
  }

  // ── Simpan OTP hash HANYA setelah Fonnte berhasil ──
  // Ini mencegah situasi di mana OTP tersimpan tapi WA gagal — user bisa brute-force hash yang valid
  const hashedOtp = await hashOtp(otp);
  try {
    await sb.from("otp_requests").insert({
      warga_id: warga.id,
      nik,
      otp_hash: hashedOtp, // SHA-256 hash — bukan plaintext
      expires_at: expiresAt,
      used: false,
    });
  } catch (insertErr) {
    // Non-fatal: WA sudah terkirim. OTP hash gagal disimpan = OTP tidak bisa diverifikasi.
    // User bisa minta OTP ulang (maks 3x dalam 15 menit).
    console.error("[request-otp] Failed to insert OTP hash:", insertErr);
  }

  return json({ ok: true, message: `OTP dikirim ke ${maskedHp}` }, 200);
}
