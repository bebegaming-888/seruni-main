/**
 * Edge Function: /api/verify-surat
 *
 * Endpoint publik untuk verifikasi surat berdasarkan nomor surat.
 * Bisa diakses tanpa login — nomor surat sudah identifier unik.
 *
 * Env vars (Cloudflare Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   QR_SECRET  — fallback jika qr_secret tidak ada di request body
 *
 * Request body:
 *   { no: string }
 *   { no: string, qr_secret?: string }  ← qr_secret dari settings (signature.qr_secret)
 *
 * Response:
 *   { ok: true, record: {...} }
 *   { ok: false, error: "not_found" | "invalid" }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions, hmacSha256Hex } from "../_lib/utils";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  QR_SECRET?: string;
}

interface RequestBody {
  no: string;
  qr_secret?: string;
}

function maskNik(nik: string): string {
  if (!nik || nik.length <= 6) return nik ?? "";
  return nik.slice(0, 6).replace(/\d/g, "●") + nik.slice(-6);
}

function maskPhone(phone: string): string {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (cleaned.length <= 4) return phone ?? "";
  if (cleaned.startsWith("62")) {
    return "+62 " + "●".repeat(cleaned.length - 6) + cleaned.slice(-6);
  }
  return phone.slice(0, 4) + "●".repeat(Math.max(0, cleaned.length - 8)) + cleaned.slice(-4);
}

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const { no, qr_secret } = body;
  if (!no || typeof no !== "string" || no.trim().length < 3) {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  // Fetch by `no` (migration 024 renamed no_surat → no)
  const { data, error } = await sb
    .from("surat_requests")
    .select(
      "no, kode, nama_surat, nik, pemohon, kontak, status, catatan, signed_at, signed_by, qr_payload, created_at, updated_at",
    )
    .eq("no", no.trim())
    .single();

  if (error || !data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  // QR secret: request body overrides env var (settings-driven)
  const effectiveSecret = qr_secret ?? context.env.QR_SECRET ?? "";

  // Verify QR payload HMAC-SHA256 signature (tamper detection)
  let qrVerified: boolean | null = null;
  const rawPayload = data.qr_payload ?? null;
  if (rawPayload && effectiveSecret) {
    const parts = rawPayload.split("|");
    if (parts.length >= 6) {
      const payloadData = parts.slice(0, 5).join("|"); // SERUNI-MUMBUL|no|nik|kode|timestamp
      const receivedSig = parts.slice(5).join("|");
      if (receivedSig !== "unsigned") {
        const expectedSig = await hmacSha256Hex(payloadData, effectiveSecret);
        qrVerified = expectedSig === receivedSig;
      } else {
        qrVerified = null; // unsigned — no secret configured at signing time
      }
    }
  }

  // Mask sensitive fields before returning publicly
  const record = {
    no: data.no,
    kode: data.kode,
    nama_surat: data.nama_surat,
    nik: maskNik(data.nik ?? ""),
    pemohon: data.pemohon,
    kontak: maskPhone(data.kontak ?? ""),
    status: data.status,
    catatan: data.catatan ?? null,
    signed_at: data.signed_at ?? null,
    signed_by: data.signed_by ?? null,
    qr_payload: rawPayload,
    qr_verified: qrVerified,
    created_at: data.created_at,
    updated_at: data.updated_at ?? null,
  };

  return json({ ok: true, record }, 200);
}
