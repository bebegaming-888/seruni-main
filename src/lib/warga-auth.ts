// Warga auth store — NIK + OTP WA login
// Session token disimpan di sessionStorage (hanya hidup selama tab browser)
// Password: tidak ada — verifikasi via OTP WA (zero-knowledge)

import { isSupabaseConfigured } from "./supabase";
import { logAudit } from "./settings-store";

const SESSION_KEY = "warga_session_v1";

// OTP rate limiting — max 3 requests per NIK per 15 minutes
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_LIMIT_MAX = 3;

function getOtpAttemptKey(nik: string): string {
  return `otp_attempts_${nik}`;
}

function checkOtpRateLimit(nik: string): boolean {
  const key = getOtpAttemptKey(nik);
  const raw = sessionStorage.getItem(key);
  const now = Date.now();
  let attempts: number[] = [];
  if (raw) {
    try {
      const data = JSON.parse(raw) as { attempts: number[]; ts: number };
      // Expire stale data
      if (now - data.ts < OTP_RATE_LIMIT_WINDOW_MS) {
        attempts = data.attempts;
      }
    } catch {
      // Invalid data — clear it
      sessionStorage.removeItem(key);
    }
  }
  if (attempts.length >= OTP_RATE_LIMIT_MAX) {
    return false;
  }
  attempts.push(now);
  sessionStorage.setItem(key, JSON.stringify({ attempts, ts: now }));
  return true;
}

function clearOtpAttempts(nik: string): void {
  sessionStorage.removeItem(getOtpAttemptKey(nik));
}

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

// Shared session parser — extracts and validates session from storage.
// Returns null if missing, invalid, or expired. Eliminates duplicate
// parse+expiry-check logic across isWargaLoggedIn / getWargaSession.
function parseSession(): WargaSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
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

/** Cek apakah warga sudah login (token valid dan belum expire). */
export function isWargaLoggedIn(): boolean {
  return parseSession() !== null;
}

/** Ambil session warga yang sedang login. */
export function getWargaSession(): WargaSession | null {
  return parseSession();
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

  // Audit trail: log warga login (UU PDP compliance)
  logAudit(
    session.warga.nama,
    "auth.warga_login",
    `Warga login: ${session.warga.nama} (NIK: ${session.warga.nik})`,
  );
}

/** Logout warga — hapus session. */
export function logoutWarga() {
  if (typeof window === "undefined") return;
  const session = getWargaSession();
  sessionStorage.removeItem(SESSION_KEY);

  // Audit trail: log warga logout (UU PDP compliance)
  if (session) {
    logAudit(
      session.warga.nama,
      "auth.warga_logout",
      `Warga logout: ${session.warga.nama} (NIK: ${session.warga.nik})`,
    );
  }
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
  // Rate limit — max 3 OTP requests per NIK per 15 minutes
  if (!checkOtpRateLimit(nik)) {
    return {
      ok: false,
      message: "Terlalu banyak request OTP. Coba lagi dalam 15 menit.",
    };
  }

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
  // NOTE: Dev OTP bypass has been REMOVED for security.
  // OTP verification now requires server-side verification only.
  // Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for warga login.

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
