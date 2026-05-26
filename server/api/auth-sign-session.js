/**
 * POST /api/auth/sign-session
 *
 * Server-side session signing endpoint.
 * Signs an unsigned session with ADMIN_SESSION_SECRET.
 *
 * This is the KEY SECURITY FIX (H-01):
 * HMAC signing is moved from browser to server.
 * VITE_ADMIN_SESSION_SECRET is NO LONGER needed in browser bundle.
 *
 * Auth: None (server-side only — this is the signing endpoint)
 * Body: { userId: string, username?: string, role: string, expiresAt: string }
 * Response: { ok: true, data: { session } } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import { buildSignPayload, hmacSign } from "../middleware/auth.js";
import { badRequest, unavailable, ok } from "../lib/api-response.js";

const router = express.Router();

// ── Config ─────────────────────────────────────────────────────────────────────

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
const IS_PROD = process.env.NODE_ENV === "production";

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", (req, res) => {
  const { userId, username, role, expiresAt } = req.body ?? {};

  // Validate required fields
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return badRequest(res, "userId wajib diisi.");
  }

  if (!role || typeof role !== "string" || role.trim().length === 0) {
    return badRequest(res, "role wajib diisi.");
  }

  if (!expiresAt || typeof expiresAt !== "string") {
    return badRequest(res, "expiresAt wajib diisi.");
  }

  // Verify session secret is configured
  if (!ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) {
    console.error(
      "[sign-session] CRITICAL: ADMIN_SESSION_SECRET not set or too short. " +
        "Session signing DISABLED. Set ADMIN_SESSION_SECRET (min 32 chars) to enable.",
    );
    if (IS_PROD) {
      return unavailable(res, "Server misconfigured — HMAC secret tidak tersedia.");
    }
    // Dev: return unsigned session so developers can test
    return ok(res, {
      session: { userId, username: username || "", role, expiresAt, sig: "" },
    });
  }

  // Validate expiresAt is a valid date in the future
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) {
    return badRequest(res, "expiresAt bukan format tanggal yang valid.");
  }
  if (expiresMs <= Date.now()) {
    return badRequest(res, "expiresAt harus masa depan.");
  }

  // Sign the session
  const payload = buildSignPayload(userId, role, expiresAt);
  const sig = hmacSign(payload, ADMIN_SESSION_SECRET);

  console.info(`[sign-session] Session signed for userId: ${userId}`);
  return ok(res, {
    session: {
      userId,
      username: username || "",
      role,
      expiresAt,
      sig,
    },
  });
});

export default router;
