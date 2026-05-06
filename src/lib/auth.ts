import { useEffect, useState } from "react";
import { idbGetAll, idbPut, idbDelete } from "@/lib/idb-store";

// Lightweight client-side auth — Admin Dashboard.
// Akun tetap (superadmin) TIDAK BISA DIHAPUS — dari env var.
// User tambahan kini disimpan di IndexedDB (store: "users") agar persisten.
// Session tetap di localStorage/sessionStorage (short-lived, desain sengaja).

const _loadFixedAdmin = () => ({
  id: "fixed-admin",
  username: import.meta.env.VITE_ADMIN_USER ?? "admindesa",
  password: import.meta.env.VITE_ADMIN_PASS ?? "admin123",
  name: "Admin Desa",
  email: "admin@desa.id",
  role: "Super Admin" as const,
  fixed: true as const,
});

export const FIXED_ADMIN = _loadFixedAdmin();

export type AdminRole = "Super Admin" | "Operator" | "Verifikator" | "Kepala Desa";

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

// ── In-Memory Users Cache ─────────────────────────────────────────────────────
let _usersCache: AdminUser[] | null = null;

/** Async init — panggil sekali saat app mount. */
export async function initUsersStore(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const saved = await idbGetAll<AdminUser>("users");
    _usersCache = saved.filter((u) => u.username !== FIXED_ADMIN.username);
  } catch (e) {
    console.warn("[auth] Gagal load users dari IndexedDB:", e);
    _usersCache = [];
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
  } catch (e) {
    console.warn("[auth] saveUser IDB error:", e);
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
  } catch (e) {
    console.warn("[auth] deleteUser IDB error:", e);
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
};

export function login(username: string, password: string, remember = false): Session | null {
  const u = listUsers().find(
    (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
  );
  if (!u) return null;
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_DURATION_MS).toISOString();
  const session: Session = {
    userId: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    loggedAt: new Date(now).toISOString(),
    expiresAt,
  };
  const ss = getSessionStorage();
  if (remember) {
    getStorage()?.setItem(SESSION_KEY, JSON.stringify(session));
    getStorage()?.setItem(SESSION_EXPIRY_KEY, expiresAt);
  } else {
    ss?.setItem(SESSION_KEY, JSON.stringify(session));
    ss?.setItem(SESSION_EXPIRY_KEY, expiresAt);
  }
  return session;
}

export function logout() {
  getStorage()?.removeItem(SESSION_KEY);
  getStorage()?.removeItem(SESSION_EXPIRY_KEY);
  getSessionStorage()?.removeItem(SESSION_KEY);
  getSessionStorage()?.removeItem(SESSION_EXPIRY_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw =
    getStorage()?.getItem(SESSION_KEY) ?? getSessionStorage()?.getItem(SESSION_KEY) ?? null;
  if (!raw) return null;
  try {
    const s: Session = JSON.parse(raw);
    if (Date.now() > new Date(s.expiresAt).getTime()) {
      logout();
      return null;
    }
    return s;
  } catch {
    return null;
  }
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
  if (cache[idx].password !== oldPwd) return { ok: false, message: "Password lama salah" };
  if (newPwd.length < 6) return { ok: false, message: "Password baru minimal 6 karakter" };
  cache[idx] = { ...cache[idx], password: newPwd };
  _usersCache = cache;
  try {
    await idbPut("users", cache[idx]);
  } catch (e) {
    console.warn("[auth] changePassword IDB error:", e);
  }
  return { ok: true, message: "Password berhasil diperbarui" };
}
