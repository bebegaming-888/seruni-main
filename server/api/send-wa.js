/**
 * POST /api/send-wa
 *
 * Server-side Fonnte WhatsApp API dispatcher.
 * Fonnte API token NEVER exposed to browser.
 *
 * Auth: None (public, rate-limited) OR admin/warga session
 * Body: { target: string, message: string, token?: string, adminCC?: string }
 * Response: { ok: true, data: { message } } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { isSessionRevoked, verifyAdmin } from "../middleware/auth.js";
import {
  badRequest,
  unauthorized,
  forbidden,
  unavailable,
  serverError,
  error,
  ok,
} from "../lib/api-response.js";

const router = express.Router();

const ENV_FONNTE_KEY = process.env.FONNTE_API_KEY ?? "";
const ENV_ADMIN_WA = process.env.ADMIN_WA_NUMBER ?? "";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
const IS_PROD = process.env.NODE_ENV === "production";

// ── Auth Middleware ─────────────────────────────────────────────────────────────

async function sendWaAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // No session: allow if Fonnte token is configured (rate-limited public endpoint)
  if (!sessionToken) {
    if (ENV_FONNTE_KEY) {
      req.sendWaAuth = { type: "public" };
      return next();
    }
    return unauthorized(res, "Token Fonnte belum dikonfigurasi.");
  }

  let session;
  try {
    session = JSON.parse(sessionToken);
  } catch {
    return unauthorized(res, "Format sesi tidak valid.");
  }

  if (!session?.role && !session?.token) {
    return unauthorized(res, "Sesi tidak valid.");
  }

  // Admin session
  if (session.role && session.expiresAt) {
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return unauthorized(res, "Sesi telah kadaluarsa. Silakan login ulang.");
    }

    const ALLOWED_ROLES = [
      "Super Admin",
      "Kepala Desa",
      "Operator",
      "Verifikator",
      "Sekretaris Desa",
    ];
    if (!ALLOWED_ROLES.includes(session.role)) {
      return forbidden(res);
    }

    const userId = String(session.userId ?? "");
    if (userId && (await isSessionRevoked(userId))) {
      return unauthorized(res, "Sesi telah dicabut. Silakan login ulang.");
    }

    if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
      const sig = session.sig ?? "";
      if (sig.length === 0) {
        if (IS_PROD) return unauthorized(res, "Session signature required.");
      } else {
        const payload = `${userId}|${session.role}|${session.expiresAt}`;
        const expected = crypto
          .createHmac("sha256", ADMIN_SESSION_SECRET)
          .update(payload)
          .digest("hex");
        let diff = 0;
        for (let i = 0; i < expected.length; i++) {
          diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
        }
        if (diff !== 0) {
          return unauthorized(res, "Session signature invalid.");
        }
      }
    } else if (IS_PROD) {
      return unavailable(res, "Server misconfigured — HMAC secret diperlukan.");
    }

    req.sendWaAuth = { type: "admin", role: session.role };
    return next();
  }

  // Warga session
  if (session.token && session.warga?.nik) {
    if (session.expires_at && Date.now() > session.expires_at) {
      return unauthorized(res, "Sesi warga telah kadaluarsa.");
    }
    req.sendWaAuth = { type: "warga", nik: session.warga.nik };
    return next();
  }

  return unauthorized(res);
}

// ── Fonnte API ─────────────────────────────────────────────────────────────────

async function sendFonnte(target, text, fonnteToken, _adminCC) {
  if (!fonnteToken) {
    return { ok: false, error: "Token Fonnte belum dikonfigurasi." };
  }

  // Normalize: ensure 628... format
  const raw = String(target).replace(/\D/g, "");
  const normalized = raw.startsWith("0") ? "62" + raw.slice(1) : raw.startsWith("62") ? raw : raw;

  const params = new URLSearchParams({
    target: normalized,
    message: text,
    delay: "2",
    countryCode: "62",
  });

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnteToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const json = await res.json();
    if (json.detail && String(json.detail).toLowerCase().includes("success")) {
      return {
        ok: true,
        data: { message: `WA terkirim ke ${normalized}`, fonnte_id: json.id?.[0] ?? null },
      };
    }

    console.error("[send-wa] Fonnte error:", json);
    return { ok: false, error: json.reason ?? json.message ?? json.detail ?? "Gagal mengirim WA." };
  } catch (err) {
    console.error("[send-wa] Network error:", err);
    return { ok: false, error: "Gagal mengirim notifikasi WA." };
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

const BodySchema = z.object({
  target: z.string().min(8, "Nomor tujuan terlalu pendek."),
  message: z
    .string()
    .min(1, "Pesan tidak boleh kosong.")
    .max(2000, "Pesan maksimal 2000 karakter."),
  token: z.string().optional(),
  adminCC: z.string().optional(),
});

router.post("/", sendWaAuth, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => e.message).join("; ");
    return badRequest(res, `Parameter tidak valid: ${errors}`);
  }

  const { target, message, token: reqToken, adminCC: reqAdminCC } = parsed.data;

  // Token priority: request body > env var
  const fonnteToken = reqToken || ENV_FONNTE_KEY;
  if (!fonnteToken) {
    return unavailable(res, "Token Fonnte belum dikonfigurasi.");
  }

  // AdminCC: request body > env var
  const adminCC = reqAdminCC || ENV_ADMIN_WA;

  const result = await sendFonnte(target, message, fonnteToken, adminCC);

  if (result.ok) {
    return ok(res, result.data);
  }
  return serverError(res, result.error);
});

export default router;
