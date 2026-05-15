// Warga auth store — NIK + OTP WA login
// Session token disimpan di sessionStorage (hanya hidup selama tab browser)
// Password: tidak ada — verifikasi via OTP WA (zero-knowledge)

import { isSupabaseConfigured } from "./supabase";

const SESSION_KEY = "warga_session_v1";

export type WargaSession = {
  token: string;
  warga: {
    id: string;
    nik: string;
    nama: string;
    no_hp?: string; // nullable di DB, tidak selalu terisi saat login
  };
  expires_at: number; // timestamp ms
};

/** Cek apakah warga sudah login (token valid dan belum expire). */
export function isWargaLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as WargaSession;
    if (Date.now() > session.expires_at) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Ambil session warga yang sedang login. */
export function getWargaSession(): WargaSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as WargaSession;
    if (Date.now() > session.expires_at) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Simpan session warga (setelah OTP berhasil diverifikasi). */
export function saveWargaSession(
  session: Omit<WargaSession, "expires_at"> & { expires_in: number },
) {
  if (typeof window === "undefined") return;
  const full: WargaSession = {
    token: session.token,
    warga: session.warga,
    expires_at: Date.now() + session.expires_in * 1000,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(full));
}

/** Logout warga — hapus session. */
export function logoutWarga() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Perpanjang session warga jika belum expired.
 * Dipanggil periodically (misal: setiap 4 jam) untuk menjaga session alive.
 *
 * Returns updated session or null jika refresh gagal / sudah expired.
 */
export async function refreshWargaSession(): Promise<WargaSession | null> {
  const existing = getWargaSession();
  if (!existing) return null;

  // Jangan refresh jika < 1 hari sebelum expiry
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (existing.expires_at - Date.now() > oneDayMs) {
    // Session masih sangat segar — tidak perlu refresh
    return existing;
  }

  // Supabase not configured → dev mode (no server to call)
  if (!isSupabaseConfigured) {
    // Dev mode: extend locally
    const newExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const updated: WargaSession = { ...existing, expires_at: newExpiry };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  }

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: existing.token }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.token) {
      // Refresh gagal — session mungkin expired
      logoutWarga();
      return null;
    }
    const updated: WargaSession = {
      token: data.token,
      warga: existing.warga,
      expires_at: Date.now() + (data.expires_in ?? 7 * 24 * 60 * 60) * 1000,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    // Network error — keep existing session but surface as degraded
    console.warn("[warga-auth] Session refresh failed, using cached session:", err);
    return existing;
  }
}

/** Request OTP via edge function /api/auth/request-otp. */
export async function requestOtp(
  nik: string,
): Promise<{ ok: boolean; message: string; dev_otp?: string }> {
  if (!isSupabaseConfigured) {
    // Dev mode tanpa Supabase — return mock response
    return {
      ok: true,
      message: "[DEV] NIK validation skipped — Supabase not configured",
      dev_otp: "123456",
    };
  }

  try {
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      message?: string;
      error?: string;
      dev_otp?: string;
      code?: number; // HTTP status code from edge function body
    };
    if (!res.ok || !data.ok) {
      // Surface specific error codes for better UX
      if (data.code === 422) {
        return { ok: false, message: "Nomor WhatsApp tidak ditemukan. Hubungi kantor desa." };
      }
      if (data.code === 429) {
        return { ok: false, message: "Terlalu banyak percobaan. Tunggu beberapa menit." };
      }
      return { ok: false, message: data.error ?? "Gagal mengirim OTP" };
    }
    return {
      ok: true,
      message: data.message ?? "OTP dikirim",
      dev_otp: data.dev_otp,
    };
  } catch (err) {
    return { ok: false, message: "Tidak dapat terhubung ke server" };
  }
}

/** Verifikasi OTP via edge function /api/auth/verify-otp. */
export async function verifyOtp(
  nik: string,
  otp: string,
): Promise<{
  ok: boolean;
  message: string;
  session?: Omit<WargaSession, "expires_at"> & { expires_in: number };
}> {
  if (!isSupabaseConfigured) {
    // Dev mode — accept "123456" as valid OTP
    if (otp === "123456") {
      return {
        ok: true,
        message: "Login berhasil (dev mode)",
        session: {
          token: "dev-token-" + Date.now(),
          warga: { id: "dev-id", nik, nama: "Warga Dev", no_hp: "081234567890" },
          expires_in: 7 * 24 * 60 * 60,
        },
      };
    }
    return { ok: false, message: "OTP tidak valid di mode development" };
  }

  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik, otp }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      token?: string;
      warga?: { id: string; nik: string; nama: string; no_hp: string };
      error?: string;
      expires_in?: number;
    };

    if (!res.ok || !data.ok || !data.token) {
      return { ok: false, message: data.error ?? "Verifikasi gagal" };
    }

    return {
      ok: true,
      message: "Login berhasil",
      session: {
        token: data.token,
        warga: data.warga!,
        expires_in: data.expires_in ?? 7 * 24 * 60 * 60,
      },
    };
  } catch {
    return { ok: false, message: "Tidak dapat terhubung ke server" };
  }
}
