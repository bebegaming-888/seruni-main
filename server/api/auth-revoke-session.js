/**
 * POST /api/auth/revoke-session
 *
 * H-02: Immediately revoke a session.
 * All future API calls using the revoked session's userId will be rejected.
 *
 * Auth: Requires valid admin HMAC session (full verification).
 * Body: { sessionId: string, reason?: string }
 * Response: { ok: true, message?: string } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { badRequest, serverError, okMessage } from "../lib/api-response.js";

const router = express.Router();

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

// ── Middleware: verify + role check ─────────────────────────────────────────

async function revokeSessionAuth(req, res, next) {
  // Run shared verifyAdmin middleware
  const err = await verifyAdmin(req, res);
  if (err) return; // verifyAdmin already sent response

  // Only Super Admin and Operator can revoke sessions
  if (!checkRole(res, req.adminSession, ["Super Admin", "Operator"])) return;

  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", revokeSessionAuth, async (req, res) => {
  const { sessionId, reason } = req.body ?? {};

  // Input validation
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
    return badRequest(res, "sessionId wajib diisi.");
  }

  // Prevent admin from revoking themselves
  if (sessionId === req.adminSession.userId) {
    return badRequest(
      res,
      "Tidak bisa mencabut sesi sendiri. Gunakan /api/auth/logout untuk logout.",
    );
  }

  const { url, serviceKey } = getSupabaseConfig();

  if (!url || !serviceKey) {
    console.warn("[revoke-session] Supabase not configured — skipping DB revocation.");
    return okMessage(res, "Logout berhasil (database tidak dikonfigurasi).");
  }

  try {
    const sb = createClient(url, serviceKey);

    // Upsert revocation record (idempotent — safe to call twice)
    const { error } = await sb.from("revoked_sessions").upsert(
      {
        session_id: sessionId,
        revoked_at: new Date().toISOString(),
        revoked_by: req.adminSession.username || "system",
        reason: reason || "User logout",
        ip_address: req.ip || null,
      },
      { onConflict: "session_id" },
    );

    if (error) {
      console.error("[revoke-session] Upsert error:", error);
      return serverError(res);
    }

    console.info(
      `[revoke-session] Revoked: ${sessionId} by ${req.adminSession.username} — reason: ${reason || "User logout"}`,
    );
    return okMessage(res, "Sesi berhasil dicabut.");
  } catch (err) {
    console.error("[revoke-session] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
