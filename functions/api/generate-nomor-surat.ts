/**
 * Edge Function: /api/generate-nomor-surat
 *
 * Generate nomor surat resmi menggunakan fungsi DB `generate_surat_number()`.
 * Prioritas: pakai klasifikasi langsung dari frontend (sumber kebenaran) — tidak
 * bergantung pada mapping SQL yang bisa tidak lengkap.
 *
 * Env vars (Cloudflare Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { kode: string, klasifikasi: string }
 *   - kode: surat type code (e.g. "SKD", "SKU")
 *   - klasifikasi: kode klasifikasi Kemendagri (e.g. "474", "140") — dari SURAT_MASTER
 *
 * Response:
 *   { ok: true, nomor: string }  — format: "474/0001/KDS.SRMB/V/2026"
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions } from "../_lib/utils";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestBody {
  kode: string;
  /** Kode klasifikasi Kemendagri — dari SURAT_MASTER (surat-master.ts) */
  klasifikasi?: string;
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
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { kode, klasifikasi } = body;
  if (!kode) {
    return json({ ok: false, error: "kode wajib diisi" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  // Kirim klasifikasi langsung — frontend sudah punya mapping lengkap dari SURAT_MASTER.
  // SQL RPC fallback hanya untuk backward compat.
  const { data, error } = await sb.rpc("generate_surat_number", {
    p_kode: kode,
    p_prefix: klasifikasi ?? "470",
  });

  if (error || !data) {
    return json({ ok: false, error: error?.message ?? "Gagal generate nomor surat" }, 500);
  }

  return json({ ok: true, nomor: data }, 200);
}
