/**
 * Edge Function: /api/sign-surat-qr
 *
 * Server-side QR payload signing — QR_SECRET tidak pernah masuk browser bundle.
 *
 * Alur:
 *   1. Verify admin session (cookie)
 *   2. Ambil QR_SECRET dari env (Cloudflare Secrets only)
 *   3. Generate signed qr_payload
 *
 * Env vars (Cloudflare Secrets):
 *   QR_SECRET          — untuk HMAC-SHA256 signature (WAJIB di production)
 *   ADMIN_SESSION_SECRET — untuk verifikasi cookie
 *
 * Request body:
 *   { no: string; nik: string; kode: string }
 *
 * Response:
 *   { ok: true, raw: string, signature: string, timestamp: string }
 *   { ok: false, error: string }
 */

import { json, corsOptions, hmacSha256Hex } from "../_lib/utils";
import { verifyAdminSession } from "../_lib/admin-session";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface Env {
  QR_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
}

interface RequestBody {
  no: string;
  nik: string;
  kode: string;
}

// ─── CORS preflight ───────────────────────────────────────────────���───────────
export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  // Auth: require valid admin session cookie
  const session = await verifyAdminSession(
    context.request,
    context.env.ADMIN_SESSION_SECRET ?? "",
  );
  if (!session) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { no, nik, kode } = body;
  if (!no || !nik || !kode) {
    return json({ ok: false, error: "Parameter no, nik, dan kode wajib diisi" }, 400);
  }

  const secret = context.env.QR_SECRET;
  if (!secret) {
    // Fallback: return unsigned payload (signing deferred — log as warning)
    // Only happens if QR_SECRET is not set in Cloudflare Secrets
    console.warn("[sign-surat-qr] QR_SECRET not configured — returning unsigned payload");
    const timestamp = new Date().toISOString();
    const raw = ["SERUNI-MUMBUL", no, nik, kode, timestamp, "unsigned"].join("|");
    return json({ ok: true, raw, signature: "unsigned", timestamp }, 200);
  }

  // Server-side HMAC-SHA256 signing — secret never leaves the edge
  const timestamp = new Date().toISOString();
  const data = ["SERUNI-MUMBUL", no, nik, kode, timestamp].join("|");
  const signature = await hmacSha256Hex(data, secret);
  const raw = [data, signature].join("|");

  return json({ ok: true, raw, signature, timestamp }, 200);
}