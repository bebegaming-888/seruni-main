/**
 * POST /api/sign-surat-qr
 *
 * Server-side QR payload signing — QR_SECRET never exposed to browser.
 * Requires admin session (HMAC-signed) to prevent unauthorized QR signing.
 *
 * Auth: Admin session (full verification + role check)
 * Body: { no: string, nik: string, kode: string, signer?: string }
 * Response: { ok: true, data: { raw, signature, timestamp } } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { badRequest, unavailable, ok } from "../lib/api-response.js";

const router = express.Router();

const QR_SECRET = process.env.QR_SECRET ?? "";

// ── Input Validation ───────────────────────────────────────────────────────────

const SignQrSchema = z.object({
  no: z.string().min(1).max(50),
  nik: z
    .string()
    .length(16)
    .regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  kode: z.string().min(1).max(20),
  signer: z.string().min(1).max(100).default("Kepala Desa"),
});

// ── Middleware: verify + role check ─────────────────────────────────────────

async function signQrAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;

  const ALLOWED_ROLES = ["Super Admin", "Kepala Desa", "Operator", "Verifikator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;

  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", signQrAuth, (req, res) => {
  if (!QR_SECRET || QR_SECRET.length < 32) {
    console.error("[sign-surat-qr] QR_SECRET not configured or too short.");
    return unavailable(res, "QR signing belum dikonfigurasi. Hubungi administrator.");
  }

  const parsed = SignQrSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => e.message).join("; ");
    return badRequest(res, `Input tidak valid: ${errors}`);
  }

  const { no, nik, kode, signer } = parsed.data;

  const timestamp = new Date().toISOString();
  const data = ["SERUNI-MUMBUL", no, nik, kode, signer, timestamp].join("|");
  const signature = crypto.createHmac("sha256", QR_SECRET).update(data).digest("hex");
  const raw = [data, signature].join("|");

  console.info(`[sign-surat-qr] Signed: ${no} by ${req.adminSession.username}`);
  return ok(res, { raw, signature, timestamp });
});

export default router;
