/**
 * Edge Function: /api/generate-nomor-surat
 *
 * Generate nomor surat resmi menggunakan fungsi DB `generate_surat_number()`.
 *
 * Env vars (Cloudflare Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { kode: string }
 *
 * Response:
 *   { ok: true, nomor: string }  — format: "0001/S-SKD/470/2026"
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions } from "../_lib/utils";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestBody {
  kode: string;
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
  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { kode } = body;
  if (!kode) {
    return json({ ok: false, error: "kode wajib diisi" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  const { data, error } = await sb.rpc("generate_surat_number", {
    p_kode: kode,
    p_prefix: "470",
  });

  if (error || !data) {
    return json({ ok: false, error: error?.message ?? "Gagal generate nomor surat" }, 500);
  }

  return json({ ok: true, nomor: data }, 200);
}
