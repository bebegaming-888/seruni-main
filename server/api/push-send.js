/**
 * POST /api/push/send
 *
 * Server-side push notification dispatcher.
 * Uses web-push to forward a payload to a browser PushSubscription.
 *
 * Auth: Admin session (HMAC-signed + revocation check + role check)
 * Body: { title?: string, body?: string, icon?: string, badge?: string, url?: string, tag?: string, subscription }
 * Response: { ok: true, data: { statusCode } } or { ok: false, error: string, code: number }
 */

import webpush from "web-push";
import { Router } from "express";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { badRequest, unavailable, serverError, ok } from "../lib/api-response.js";

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@desa.id";

// Configure web-push (idempotent — safe to call multiple times)
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Middleware: verify + role check ─────────────────────────────────────────

async function pushSendAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;

  const ALLOWED_ROLES = [
    "Super Admin",
    "Kepala Desa",
    "Operator",
    "Verifikator",
    "Sekretaris Desa",
  ];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;

  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", pushSendAuth, async (req, res) => {
  const { title, body, icon, badge, url, tag, subscription } = req.body ?? {};

  if (!subscription || !subscription.endpoint) {
    return badRequest(res, "subscription.endpoint wajib diisi.");
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push/send] VAPID keys not configured — push disabled.");
    return unavailable(res, "Layanan push notification belum dikonfigurasi.");
  }

  const payload = JSON.stringify({
    title: title ?? "Sistem Informasi Desa",
    body: body ?? "",
    icon: icon ?? "/icons/icon-192.png",
    badge: badge ?? "/icons/badge-72.png",
    url: url ?? "/",
    tag: tag ?? "default",
  });

  try {
    const result = await webpush.sendNotification(subscription, payload);
    return ok(res, { statusCode: result.statusCode });
  } catch (err) {
    const status = err?.statusCode ?? 500;

    // 410 Gone = subscription expired — client should re-subscribe
    if (status === 410 || status === 404) {
      return res.status(410).json({
        ok: false,
        error: "Subscription sudah tidak berlaku. Silakan daftar ulang push notification.",
        code: 410,
      });
    }

    console.error("[push/send] Failed:", err?.message ?? err);
    return serverError(res, "Gagal mengirim push notification.");
  }
});

export default router;
