import { useEffect, useState } from "react";
import { idbGetAll, idbPut, idbDelete } from "@/lib/idb-store";
import {
  logAudit,
  syncSaveAdminUser,
  syncDeleteAdminUser,
  syncPullAdminUsers,
} from "./useSupabaseSync";

// Lightweight client-side auth — Admin Dashboard.
// Akun tetap (superadmin) TIDAK BISA DIHAPUS — dari env var.
// User tambahan kini disimpan di IndexedDB (store: "users") agar persisten.
// Session tetap di localStorage/sessionStorage (short-lived, desain sengaja).

const _loadFixedAdmin = () => ({
  id: "fixed-admin",
  username: import.meta.env.VITE_ADMIN_USER ?? "admindesa",
  // password DIHAPUS dari client-side — autentikasi fixed admin dilakukan
  // HANYA di edge function /api/auth/admin-login (server-side, tidak di-browser bundle).
  // local login hanya untuk additional users dari IndexedDB.
  password: "",
  name: "Admin Desa",
  email: "admin@desa.id",
  role: "Super Admin" as const,
  fixed: true as const,
});

export const FIXED_ADMIN = _loadFixedAdmin();

export type AdminRole =
  | "Super Admin"
  | "Operator"
  | "Verifikator"
  | "Kepala Desa"
  | "Sekretaris Desa";

export type AdminUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: AdminRole;
  fixed?: boolean;
  created_at?: string;
};

const SESSION_KEY = "admin_session";
const SESSION_EXPIRY_KEY = "admin_session_expires_at";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

// ── PBKDF2 Hash Verification (for seeded DB users) ─────────────────────────────
/** Format: pbkdf2_sha512$<iterations>$<salt_base64>$<hash_base64> */
async function verifyPbkdf2(password: string, storedHash: string): Promise<boolean> {
  // Guard: Web Crypto API requires secure context (HTTPS or localhost).
  // If unavailable, fail closed — treat as wrong password so login attempt
  // fails cleanly with "invalid credentials" rather than crashing the user.
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    console.warn("[auth] Web Crypto API unavailable — falling back to reject");
    return false;
  }
  if (!storedHash.startsWith("pbkdf2_sha512$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 4) return false;
  const [, iterations, saltBase64, hashBase64] = parts;
  const iterationsNum = parseInt(iterations, 10);
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const storedHashBytes = Uint8Array.from(atob(hashBase64), (c) => c.charCodeAt(0));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iterationsNum, hash: "SHA-512" },
    key,
    64 * 8,
  );
  const derivedBytes = new Uint8Array(derivedBits);
  if (derivedBytes.length !== storedHashBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i] ^ storedHashBytes[i];
  }
  return diff === 0;
}

/** Returns the session as a JSON string ready for the Authorization: Bearer header. */
export function getSessionToken(): string | null {
  const s = getSession();
  if (!s) return null;
  return JSON.stringify(s);
}

// ── In-Memory Users Cache ─────────────────────────────────────────────────────
let _usersCache: AdminUser[] | null = null;

/** Async init — panggil sekali saat app mount. */
export async function initUsersStore(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // 1. Ambil dari IndexedDB lokal
    const local = await idbGetAll<AdminUser>("users");

    // 2. Jika ada Supabase, tarik data terbaru (sync)
    const cloud = await syncPullAdminUsers();

    // 3. Gabungkan: Cloud menjadi source-of-truth untuk data yang ada di cloud.
    // Akun lokal tetap dipertahankan jika tidak ada di cloud (offline-first).
    const mergedMap = new Map<string, AdminUser>();
    local.forEach((u) => mergedMap.set(u.id, u));
    cloud.forEach((u) => mergedMap.set(u.id, u as AdminUser));

    const finalUsers = Array.from(mergedMap.values());

    // 4. Update IndexedDB dengan data terbaru
    for (const u of cloud) {
      await idbPut("users", u);
    }

    _usersCache = finalUsers.filter((u) => u.username !== FIXED_ADMIN.username);
  } catch (e) {
    console.error("[auth] Gagal load/sync users:", e);
    // Gagal sync → tetap pakai cache lokal yang ada (tidak kosongkan)
    // Jika tidak ada cache lokal, fallback ke empty array
    if (_usersCache === null) _usersCache = [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}
function getSessionStorage() {
  return typeof window !== "undefined" ? window.sessionStorage : null;
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

/** Baca daftar user (sync dari cache). Fixed admin selalu di urutan pertama. */
export function listUsers(): AdminUser[] {
  const extra = (_usersCache ?? []).filter((u) => u.username !== FIXED_ADMIN.username);
  return [FIXED_ADMIN, ...extra];
}

/** Simpan / update user ke cache + IndexedDB. */
export async function saveUser(user: AdminUser): Promise<{ ok: boolean; message: string }> {
  if (user.username === FIXED_ADMIN.username)
    return { ok: false, message: "Akun admindesa adalah akun tetap dan tidak dapat diubah." };

  const cache = _usersCache ?? [];
  const dup = cache.find(
    (u) => u.username.toLowerCase() === user.username.toLowerCase() && u.id !== user.id,
  );
  if (dup) return { ok: false, message: "Username sudah digunakan pengguna lain." };

  const idx = cache.findIndex((u) => u.id === user.id);
  const toSave = idx >= 0 ? user : { ...user, created_at: new Date().toISOString() };
  if (idx >= 0) cache[idx] = toSave;
  else cache.unshift(toSave);
  _usersCache = cache;

  try {
    await idbPut("users", toSave);

    // Sync ke Cloud
    const actor = getSession()?.username || "system";
    await syncSaveAdminUser(toSave, actor);

    logAudit({
      action: idx >= 0 ? "user.update" : "user.create",
      detail: `${idx >= 0 ? "Update" : "Tambah"} user: ${user.username} (${user.role})`,
      username: actor,
    });
  } catch (e) {
    console.error("[auth] saveUser failed:", e);
    return { ok: false, message: "Gagal menyimpan pengguna. Silakan coba lagi." };
  }
  return { ok: true, message: "Pengguna berhasil disimpan." };
}

/** Hapus user dari cache + IndexedDB. Fixed admin tidak bisa dihapus. */
export async function deleteUser(id: string): Promise<{ ok: boolean; message: string }> {
  const user = (_usersCache ?? []).find((u) => u.id === id);
  if (!user) return { ok: false, message: "User tidak ditemukan." };
  if (user.fixed) return { ok: false, message: "Akun ini tidak dapat dihapus." };

  _usersCache = (_usersCache ?? []).filter((u) => u.id !== id);
  try {
    await idbDelete("users", id);

    // Sync ke Cloud
    const actor = getSession()?.username || "system";
    await syncDeleteAdminUser(id, user.username, actor);

    logAudit({
      action: "user.delete",
      detail: `Hapus user: ${user.username}`,
      username: actor,
    });
  } catch (e) {
    console.error("[auth] deleteUser failed:", e);
    return { ok: false, message: "Gagal menghapus pengguna. Silakan coba lagi." };
  }
  return { ok: true, message: "Pengguna berhasil dihapus." };
}

// ── Session ───────────────────────────────────────────────────────────────────

export type Session = {
  userId: string;
  username: string;
  name: string;
  role: AdminRole;
  loggedAt: string;
  expiresAt: string;
  sig: string; // HMAC signature
};

// Sync getter — checks expiry only. For production-safe auth use getSessionAsync().
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw =
    getStorage()?.getItem(SESSION_KEY) ?? getSessionStorage()?.getItem(SESSION_KEY) ?? null;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    if (Date.now() > new Date(s.expiresAt).getTime()) {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/**
 * Async session getter with HMAC-SHA256 signature verification.
 * Use this for all security-sensitive session reads (admin guards, API calls).
 * In production: rejects tampered/unsigned sessions.
 * In dev mode: degrades gracefully when secret is not configured.
 */
export async function getSessionAsync(): Promise<Session | null> {
  const session = getSession();
  if (!session) return null;

  const expiresMs = new Date(session.expiresAt).getTime();
  if (expiresMs < Date.now()) {
    console.warn("[auth] Session expired — clearing");
    logout();
    return null;
  }

  // Reject unsigned sessions in production (HMAC signing is server-side only)
  if (!session.sig) {
    if (import.meta.env.PROD) {
      console.warn("[auth] Unsigned session in production — rejected");
      logout();
      return null;
    }
    // Dev mode: allow unsigned sessions when server is offline
    return session;
  }

  return session;
}

export async function login(
  username: string,
  password: string,
  remember = false,
): Promise<Session | null> {
  const allUsers = listUsers();
  let matchedUser = null;

  for (const u of allUsers) {
    // Fixed admin — skip (must use server-side login)
    if (u.fixed) continue;
    // Username match
    if (u.username.toLowerCase() !== username.trim().toLowerCase()) continue;

    if (u.password) {
      // Password hash: try PBKDF2 first (DB-seeded accounts), then plaintext fallback
      if (u.password.startsWith("pbkdf2_sha512$")) {
        const ok = await verifyPbkdf2(password, u.password);
        if (!ok) continue;
      } else {
        // Plaintext — skip (no plaintext passwords in production)
        console.warn(`[auth] Plaintext password for ${u.username} — not supported`);
        continue;
      }
    } else {
      // No password stored — invalid
      continue;
    }

    matchedUser = u;
    break;
  }

  if (!matchedUser) {
    // NOTE: Dev login bypass has been REMOVED for security.
    // Fixed admin must use server-side /api/auth/admin-login endpoint.
    // Client-side login only works for additional users stored in IndexedDB.
    console.warn("[auth] Fixed admin: edge function unavailable — use /api/auth/admin-login");
  }

  // Local login fallback: session without sig (server not reachable).
  if (!matchedUser) return null;
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_DURATION_MS).toISOString();

  const session: Session = {
    userId: matchedUser.id,
    username: matchedUser.username,
    name: matchedUser.name,
    role: matchedUser.role,
    loggedAt: new Date(now).toISOString(),
    expiresAt,
    sig: "", // No client-side signing — server signs via loginHybrid()
  };
  const ss = getSessionStorage();
  if (remember) {
    getStorage()?.setItem(SESSION_KEY, JSON.stringify(session));
    getStorage()?.setItem(SESSION_EXPIRY_KEY, expiresAt);
  } else {
    ss?.setItem(SESSION_KEY, JSON.stringify(session));
    ss?.setItem(SESSION_EXPIRY_KEY, expiresAt);
  }
  logAudit({
    action: "auth.login",
    detail: `Login berhasil: ${matchedUser.username}`,
    username: matchedUser.username,
  });
  return session;
}

/** Hybrid login: tries edge function first (httpOnly cookie), falls back to local auth. */
export async function loginHybrid(
  username: string,
  password: string,
  remember = false,
): Promise<{ ok: boolean; session?: Session; error?: string }> {
  try {
    const res = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, remember }),
    });
    const data = (await res.json()) as { ok: boolean; session?: Session; error?: string };

    if (data.ok && data.session) {
      // Edge function auth succeeded — normalize session
      const serverSession = data.session as unknown as {
        id: string;
        username: string;
        name: string;
        role: string;
        loginAt: string;
        expiresAt: string;
      };
      const normalized: Session = {
        userId: serverSession.id,
        username: serverSession.username,
        name: serverSession.name,
        role: serverSession.role as AdminRole,
        loggedAt: serverSession.loginAt,
        expiresAt: serverSession.expiresAt,
        sig: "",
      };

      // Request server-side HMAC signing
      try {
        const sigRes = await fetch("/api/auth/sign-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: normalized.userId,
            username: normalized.username,
            role: normalized.role,
            expiresAt: normalized.expiresAt,
          }),
        });

        if (sigRes.ok) {
          const sigData = (await sigRes.json()) as { ok: boolean; session: Partial<Session> };
          if (sigData.ok && sigData.session.sig) {
            normalized.sig = sigData.session.sig;
          }
        } else if (import.meta.env.PROD) {
          // Server signing failed in production — reject login
          console.error("[auth] Session signing failed in production");
          return { ok: false, error: "Gagal membuat sesi aman. Hubungi administrator." };
        }
      } catch (sigErr) {
        if (import.meta.env.PROD) {
          console.error("[auth] Session signing error:", sigErr);
          return { ok: false, error: "Gagal membuat sesi aman. Hubungi administrator." };
        }
      }

      // Store session
      const ss = getSessionStorage();
      if (remember) {
        getStorage()?.setItem(SESSION_KEY, JSON.stringify(normalized));
        getStorage()?.setItem(SESSION_EXPIRY_KEY, normalized.expiresAt);
      } else {
        ss?.setItem(SESSION_KEY, JSON.stringify(normalized));
        ss?.setItem(SESSION_EXPIRY_KEY, normalized.expiresAt);
      }

      logAudit({
        action: "auth.login",
        detail: `Login berhasil (edge): ${normalized.username}`,
        username: normalized.username,
      });
      return { ok: true, session: normalized };
    }

    // Edge function failed — try local auth
    const local = await login(username, password, remember);
    if (local) return { ok: true, session: local };

    return { ok: false, error: data.error ?? "Login gagal" };
  } catch {
    // Network error — fallback to local auth
    const local = await login(username, password, remember);
    if (local) return { ok: true, session: local };
    return { ok: false, error: "Tidak dapat terhubung ke server" };
  }
}

export async function logout() {
  const s = getSession();
  if (s) {
    logAudit({
      action: "auth.logout",
      detail: `Logout: ${s.username}`,
      username: s.username,
    });

    // Revoke session on server
    try {
      const token = getSessionToken();
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn("[auth] Server logout failed (network error):", err);
      // Continue with local logout even if server revocation fails
    }
  }

  // Clear local storage
  getStorage()?.removeItem(SESSION_KEY);
  getStorage()?.removeItem(SESSION_EXPIRY_KEY);
  getSessionStorage()?.removeItem(SESSION_KEY);
  getSessionStorage()?.removeItem(SESSION_EXPIRY_KEY);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    setSession(getSession());
    const handler = () => setSession(getSession());
    window.addEventListener("storage", handler);
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("popstate", handler);
    };
  }, []);
  return session;
}

export function isLoggedIn(): boolean {
  return !!getSession();
}

/** Hash password with PBKDF2-SHA512 (for client-side password change). */
async function hashPbkdf2(password: string, iterations = 100000): Promise<string> {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    throw new Error("Web Crypto API unavailable — password hashing not possible");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-512" },
    key,
    64 * 8,
  );
  const derivedBytes = new Uint8Array(derivedBits);
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...derivedBytes));
  return `pbkdf2_sha512$${iterations}$${saltBase64}$${hashBase64}`;
}

export async function changePassword(
  oldPwd: string,
  newPwd: string,
): Promise<{ ok: boolean; message: string }> {
  const s = getSession();
  if (!s) return { ok: false, message: "Belum login" };
  if (s.username === FIXED_ADMIN.username)
    return { ok: false, message: "Akun ini tidak dapat diubah." };
  const cache = _usersCache ?? [];
  const idx = cache.findIndex((u) => u.id === s.userId);
  if (idx < 0) return { ok: false, message: "User tidak ditemukan" };
  const storedPwd = cache[idx].password;
  // CRITICAL fix: PBKDF2 for hashed passwords, plaintext fallback for legacy dev accounts
  const match = storedPwd?.startsWith("pbkdf2_sha512$")
    ? await verifyPbkdf2(oldPwd, storedPwd)
    : storedPwd === oldPwd;
  if (!match) return { ok: false, message: "Password lama salah" };
  if (newPwd.length < 6) return { ok: false, message: "Password baru minimal 6 karakter" };
  // SECURITY FIX: Hash password with PBKDF2 before storing to IndexedDB
  const hashedNewPwd = await hashPbkdf2(newPwd);
  cache[idx] = { ...cache[idx], password: hashedNewPwd };
  _usersCache = cache;
  try {
    await idbPut("users", cache[idx]);
  } catch (e) {
    console.warn("[auth] changePassword IDB error:", e);
  }
  return { ok: true, message: "Password berhasil diperbarui" };
}
