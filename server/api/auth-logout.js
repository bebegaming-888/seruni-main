/**
 * POST /api/auth/logout
 *
 * Logs out the current user by revoking their own session.
 * Client should also clear localStorage/sessionStorage.
 *
 * H-02: Session revocation endpoint.
 *
 * Auth: Requires valid admin HMAC session (full verification).
 * Body: { } (empty — sessionId extracted from Authorization header)
 * Response: { ok: true, message?: string } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../middleware/auth.js";
import { serverError, okMessage } from "../lib/api-response.js";

const router = express.Router();

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

// ── Middleware: verify admin session ────────────────────────────────────────

async function logoutAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", logoutAuth, async (req, res) => {
  const sessionId = req.adminSession.userId;

  const { url, serviceKey } = getSupabaseConfig();

  if (!url || !serviceKey) {
    // No DB configured — still return success (client should clear local storage)
    console.info(`[logout] No DB configured, local logout for: ${sessionId}`);
    return okMessage(res, "Logout berhasil (database tidak dikonfigurasi).");
  }

  try {
    const sb = createClient(url, serviceKey);

    // Upsert revocation record (idempotent)
    const { error } = await sb.from("revoked_sessions").upsert(
      {
        session_id: sessionId,
        revoked_at: new Date().toISOString(),
        revoked_by: req.adminSession.username || "self",
        reason: "User logout",
        ip_address: req.ip || null,
      },
      { onConflict: "session_id" },
    );

    if (error) {
      console.error("[logout] Revocation insert error:", error);
      // Still return 200 — client already cleared local storage
      return okMessage(res, "Logout berhasil (server revocation may have failed).", 200);
    }

    console.info(`[logout] Session revoked: ${sessionId} by ${req.adminSession.username}`);
    return okMessage(res, "Logout berhasil.");
  } catch (err) {
    console.error("[logout] Unexpected error:", err);
    // Always return 200 for logout — client already cleared local storage
    return okMessage(res, "Logout berhasil (local clear).", 200);
  }
});

export default router;
