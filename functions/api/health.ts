/**
 * Edge Function: GET /api/health
 *
 * Health check endpoint untuk monitoring (UptimeRobot, Checkly, dll).
 * Tidak memerlukan autentikasi — baca saja dari Supabase dengan
 * service role (bukan anon key) agar RLS tidak memblokir.
 *
 * Env vars (Cloudflare Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Response:
 *   { ok: true, supabase: boolean, timestamp: string, version: string }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions } from "../_lib/utils";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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
export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const sb = createAdminClient(context.env);
  let supabaseOk = false;

  if (sb) {
    try {
      const { error } = await sb.from("warga").select("id").limit(1);
      supabaseOk = !error;
    } catch {
      supabaseOk = false;
    }
  }

  const health = {
    ok: supabaseOk,
    supabase: supabaseOk,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    region: (context.env as Record<string, unknown>).CF_REGION ?? "unknown",
  };

  // Jika Supabase down, tetap return 200 agar monitoring tidak false-alarm
  // (app bisa berfungsi offline via IndexedDB meskipun Supabase tidak reachable)
  return json(health, 200);
}
