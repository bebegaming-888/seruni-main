/**
 * POST /api/auth/verify-otp
 *
 * Verify OTP and create warga (citizen) session.
 * Uses atomic RPC function to handle OTP verification + session creation
 * in a single transaction — if any step fails, the entire operation rolls back.
 *
 * Auth: None
 * Body: { nik: string, otp: string }
 * Response: { ok: true, data: { token, warga, expires_in } } or { ok: false, error: string, code: number }
 */

import express from "express";
import { badRequest, unauthorized, serverError } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { nik, otp } = req.body ?? {};

  // Input validation
  if (!nik || typeof nik !== "string" || !/^\d{16}$/.test(nik)) {
    return badRequest(res, "NIK wajib 16 digit angka.");
  }
  if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return badRequest(res, "OTP wajib 6 digit angka.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[verify-otp] SUPABASE_URL or SERVICE_KEY not set.");
    return serverError(res);
  }

  try {
    // ── Atomic RPC: OTP verification + session creation in one transaction ──
    // If any step fails → full rollback → OTP stays unused → user can retry
    const rpcRes = await supabaseFetch("rpc/warga_verify_otp_and_create_session", {
      method: "POST",
      body: JSON.stringify({ p_nik: nik, p_otp: otp }),
    });

    if (!rpcRes.ok) {
      let errMsg = "Verifikasi OTP gagal.";
      let statusCode = 500;

      try {
        const errBody = await rpcRes.json();
        const msg = errBody?.message ?? "";
        if (/\bNIK harus 16 digit\b|\bOTP harus 6 digit\b/.test(msg)) {
          statusCode = 400;
          errMsg = msg;
        } else if (/kadaluarsa|invalid|expired|incorrect/i.test(msg)) {
          statusCode = 401;
          errMsg = msg;
        } else if (msg) {
          errMsg = msg;
        }
      } catch {
        /* ignore parse error — keep default errMsg */
      }

      console.error("[verify-otp] RPC failed:", rpcRes.status, errMsg);
      return res.status(statusCode).json({ ok: false, error: errMsg, code: statusCode });
    }

    const result = await rpcRes.json();
    // PostgreSQL JSONB over REST returns an array with one element
    const data = Array.isArray(result) ? result[0] : result;

    if (!data?.ok) {
      return unauthorized(res, data?.message ?? "Verifikasi gagal.");
    }

    return res.status(200).json({
      ok: true,
      data: {
        token: data.token,
        warga: data.warga,
        expires_in: data.expires_in ?? 7 * 24 * 60 * 60,
      },
    });
  } catch (err) {
    console.error("[verify-otp] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
