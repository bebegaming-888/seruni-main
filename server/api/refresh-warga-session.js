/**
 * POST /api/auth/refresh
 *
 * Extend warga (citizen) session lifetime without re-authentication.
 *
 * Auth: Bearer token (warga session token)
 * Body: { token: string } OR token in Authorization header
 * Response: { ok: true, data: { token, expires_at } } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { badRequest, unauthorized, serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (req.body?.token ?? "");

  // Input validation
  if (!token || typeof token !== "string" || token.length < 10) {
    return badRequest(res, "Token wajib diisi dengan format yang valid.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[refresh-warga-session] SUPABASE_URL or SERVICE_KEY not set.");
    return serverError(res);
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find existing session
    const { data: session, error: sessionError } = await sb
      .from("warga_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return unauthorized(res, "Token tidak valid atau sudah kadaluarsa.");
    }

    // Check expiry
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      // Clean up expired session
      await sb.from("warga_sessions").delete().eq("token", token);
      return unauthorized(res, "Sesi telah kadaluarsa. Silakan login ulang.");
    }

    // Extend session by 7 days
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: updateError } = await sb
      .from("warga_sessions")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("token", token);

    if (updateError) {
      console.error("[refresh-warga-session] Update error:", updateError);
      return serverError(res);
    }

    return ok(res, { token, expires_at: newExpiresAt.toISOString() });
  } catch (err) {
    console.error("[refresh-warga-session] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
