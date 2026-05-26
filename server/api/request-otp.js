/**
 * POST /api/auth/request-otp
 *
 * Generate OTP for warga (citizen) login, send via WhatsApp (Fonnte),
 * and store PBKDF2 hash in the database.
 *
 * Rate limit: max 3 OTP requests per NIK per 15 minutes (enforced by otpRateLimiter middleware).
 *
 * Auth: None (public endpoint, rate-limited)
 * Body: { nik: string } — 16-digit NIK
 * Response: { ok: true, message?: string } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import {
  badRequest,
  notFound,
  serverError,
  unavailable,
  rateLimit,
  ok,
} from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FONNTE_API_KEY = process.env.FONNTE_API_KEY ?? "";
const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER ?? "6281234567890";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit OTP. */
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Hash OTP using PBKDF2-SHA512 with random salt.
 * Format: pbkdf2_sha512$<iterations>$<salt_b64>$<hash_b64>
 */
function hashOtpStandard(otp) {
  const salt = crypto.randomBytes(16);
  const iterations = 100_000;
  const hash = crypto.pbkdf2Sync(otp, salt, iterations, 64, "sha512");
  return `pbkdf2_sha512$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Perform a fetch request to Supabase REST API with service role auth. */
async function supabaseFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=minimal",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { nik } = req.body ?? {};

  // Input validation — strict NIK format (16 digits)
  if (!nik || typeof nik !== "string" || !/^\d{16}$/.test(nik)) {
    return badRequest(res, "NIK wajib 16 digit angka.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[request-otp] SUPABASE_URL or SERVICE_KEY not set.");
    return unavailable(res, "Database belum dikonfigurasi. Hubungi administrator.");
  }

  try {
    // Step 1: Check rate limit via RPC function
    const rateLimitRes = await supabaseFetch("rpc/check_otp_rate_limit", {
      method: "POST",
      body: JSON.stringify({ p_nik: nik }),
    });

    if (!rateLimitRes.ok) {
      console.error("[request-otp] Rate limit RPC failed:", rateLimitRes.status);
      return serverError(res);
    }

    const rateLimitData = await rateLimitRes.json();
    if (!rateLimitData?.allowed) {
      const waitMin = Math.ceil((rateLimitData?.wait_seconds ?? 0) / 60);
      return rateLimit(res, `Terlalu banyak percobaan. Tunggu ${waitMin} menit.`);
    }

    // Step 2: Lookup warga by NIK
    const wargaRes = await supabaseFetch(`warga?nik=eq.${nik}&select=id,nik,nama,no_hp`);
    if (!wargaRes.ok) {
      console.error("[request-otp] Warga lookup failed:", wargaRes.status);
      return serverError(res);
    }

    const wargaData = await wargaRes.json();
    if (!wargaData || wargaData.length === 0) {
      return notFound(res, "NIK");
    }

    const warga = wargaData[0];
    if (!warga.no_hp) {
      return res.status(422).json({
        ok: false,
        error: "Nomor WhatsApp tidak terdaftar. Hubungi kantor desa.",
        code: 422,
      });
    }

    // Step 3: Generate OTP + hash
    const otp = generateOtp();
    const otpHash = hashOtpStandard(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Step 4: Store OTP hash in otp_requests table
    const insertRes = await supabaseFetch("otp_requests", {
      method: "POST",
      body: JSON.stringify({
        nik,
        otp_hash: otpHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      console.error("[request-otp] OTP insert failed:", insertRes.status);
      return serverError(res);
    }

    // Step 5: Send OTP via WhatsApp (Fonnte)
    const waMessage = `[Seruni Mumbul] Kode OTP Anda: ${otp}\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;

    if (!FONNTE_API_KEY) {
      // Fonnte not configured — return OTP in response (DEV ONLY — never in production)
      console.warn("[request-otp] FONNTE_API_KEY not set — OTP not sent.");
      return ok(res, { message: "[DEV] OTP generated (WhatsApp not configured)." });
    }

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: warga.no_hp,
        message: waMessage,
        countryCode: "62",
      }),
    });

    if (!fonnteRes.ok) {
      console.error("[request-otp] Fonnte send failed:", fonnteRes.status);
      // Still return success — OTP is generated, Fonnte may be delayed
      return ok(res, { message: "OTP dikirim (WhatsApp mungkin tertunda)." });
    }

    // Mask phone number in response for privacy
    const maskedPhone = warga.no_hp.slice(0, 4) + "****" + warga.no_hp.slice(-4);
    return ok(res, { message: `OTP dikirim ke ${maskedPhone}.` });
  } catch (err) {
    console.error("[request-otp] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
