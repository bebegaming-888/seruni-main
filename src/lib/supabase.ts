// Supabase client — singleton pattern
// Inisialisasi hanya di browser (client-side). Untuk SSR gunakan createServerClient.
//
// CATATAN: App ini menggunakan custom HMAC-SHA256 session (bukan Supabase Auth).
// auth session TIDAK digunakan (persistSession=false) karena tidak ada
// Supabase Auth user yang login. Admin auth dikelola secara manual.
// Ini menghilangkan "Multiple GoTrueClient instances" warning.

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

  if (_client) return _client;

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    // NONaktifkan Supabase Auth session — app ini pakai custom HMAC-SHA256 session.
    // Ini menghilangkan GoTrueClient singleton warning.
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // NOTE: VITE_ADMIN_DB_TOKEN is NOT sent here. It was previously used as a fake
    // security header ("x-admin-token") but Supabase RLS does NOT check this header —
    // RLS uses auth.uid() and auth.role() which come from the JWT anon key.
    // Sending this header provided FALSE security (attacker could add it trivially).
    // The token remains in .env for optional audit-log purposes server-side only.
  });

  return _client;
}

// DIHAPUS: export const supabase = getSupabase()
// Gunakan HANYA getSupabase() — singleton re-export menyebabkan dual API
// (supabase vs getSupabase()) dan bisa return null di server-side rendering.
// Hapus dari semua import jika ada yang masih referensi.

/** Supabase URL untuk edge function (read-only). */
export { supabaseUrl };
/** Supabase Anon Key (aman di browser, dilindungi RLS). */
export { supabaseAnonKey };
