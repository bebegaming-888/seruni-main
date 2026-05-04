// Supabase client — singleton pattern
// Inisialisasi hanya di browser (client-side). Untuk SSR gunakan createServerClient.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Singleton client — reuse same instance across all imports
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getSupabase() tidak boleh dipanggil di server-side");
  }
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set. " +
          "Menggunakan mode fallback (localStorage-only).",
      );
      return null;
    }
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

// Graceful degradation — jika Supabase belum aktif, return null
export const supabase = getSupabase();
export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
