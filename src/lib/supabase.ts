// Supabase client — singleton pattern
// Inisialisasi hanya di browser (client-side). Untuk SSR gunakan createServerClient.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** True jika semua env var Supabase sudah di-set dengan benar. */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Singleton client — reuse same instance across all imports
let _client: SupabaseClient | null = null;

/**
 * Ambil instance Supabase client.
 * Mengembalikan null jika env var belum di-set — tidak pernah throw.
 * Gunakan isSupabaseConfigured untuk cek terlebih dahulu jika perlu.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

// Re-export singleton — null jika belum dikonfigurasi
export const supabase = getSupabase();

/** Supabase URL untuk edge function (read-only). */
export { supabaseUrl };
/** Supabase Anon Key (aman di browser, dilindungi RLS). */
export { supabaseAnonKey };
