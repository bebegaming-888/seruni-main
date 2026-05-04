// Supabase Admin client — untuk Edge Functions (Cloudflare Workers)
//
// SERVICE_ROLE_KEY harus di-set via Cloudflare Secrets (BUKAN di .env publik).
// Ini aman karena dieksekusi di server-side, bukan di browser.
//
// Cloudflare Pages Functions: pass context.env dari onRequestPost context.
// Node.js (local dev): gunakan process.env.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(env?: {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}) {
  const url = env?.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceKey = env?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di environment",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
