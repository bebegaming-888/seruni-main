// Lightweight client-side auth for admin dashboard.
// Akun tetap (built-in superadmin) — TIDAK BISA DIHAPUS.
// Credentials dibaca dari env var (VITE_ADMIN_USER / VITE_ADMIN_PASS).
// User tambahan disimpan di localStorage agar bisa dikelola dari halaman
// Pengaturan → Manajemen Pengguna.

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

const USERS_KEY = "admin_users";
const SESSION_KEY = "admin_session";
const SESSION_EXPIRY_KEY = "admin_session_expires_at";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = getStorage()?.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") getStorage()?.setItem(key, JSON.stringify(value));
}

function clearStorage(key: string) {
  if (typeof window !== "undefined") {
    getStorage()?.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function listUsers(): AdminUser[] {
  const extra = read<AdminUser[]>(USERS_KEY, []);
  // Selalu pastikan fixed admin ada di urutan pertama dan tidak dapat dihapus.
  return [FIXED_ADMIN, ...extra.filter((u) => u.username !== FIXED_ADMIN.username)];
}

export function saveUser(user: AdminUser) {
  if (user.username === FIXED_ADMIN.username) return; // tidak diizinkan menimpa admin tetap
  const extra = read<AdminUser[]>(USERS_KEY, []);
  const idx = extra.findIndex((u) => u.id === user.id);
  if (idx >= 0) extra[idx] = user;
  else extra.unshift({ ...user, created_at: new Date().toISOString() });
  write(USERS_KEY, extra);
}

export function deleteUser(id: string) {
  const extra = read<AdminUser[]>(USERS_KEY, []);
  write(
    USERS_KEY,
    extra.filter((u) => u.id !== id && u.username !== FIXED_ADMIN.username),
  );
}

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

  // Simpan session + expiry timestamp
  write(SESSION_KEY, session);
  write(SESSION_EXPIRY_KEY, expiresAt);

  // Jika remember=false → simpan di sessionStorage juga (hanya untuk tab ini)
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_EXPIRY_KEY, expiresAt);
    if (!remember) {
      // Non-persistent: hapus dari localStorage, biarkan sessionStorage
      getStorage()?.removeItem(SESSION_KEY);
      getStorage()?.removeItem(SESSION_EXPIRY_KEY);
    }
  }

  return session;
}

export function logout() {
  if (typeof window !== "undefined") {
    getStorage()?.removeItem(SESSION_KEY);
    getStorage()?.removeItem(SESSION_EXPIRY_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  }
}

export function getSession(): Session | null {
  // Prioritas: localStorage (persistent) → sessionStorage (tab-only)
  const sessionStr = getStorage()?.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session: Session = JSON.parse(sessionStr);
    // Cek expiry
    const expiry = new Date(session.expiresAt).getTime();
    if (isNaN(expiry) || Date.now() > expiry) {
      logout(); // session expired
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getSession();
}

/** Update password for current logged-in user (kecuali fixed admin tidak boleh diubah). */
export function changePassword(oldPwd: string, newPwd: string): { ok: boolean; message: string } {
  const s = getSession();
  if (!s) return { ok: false, message: "Belum login" };
  if (s.username === FIXED_ADMIN.username) {
    return { ok: false, message: "Akun admindesa adalah akun tetap, password tidak dapat diubah." };
  }
  const extra = read<AdminUser[]>(USERS_KEY, []);
  const idx = extra.findIndex((u) => u.id === s.userId);
  if (idx < 0) return { ok: false, message: "User tidak ditemukan" };
  if (extra[idx].password !== oldPwd) return { ok: false, message: "Password lama salah" };
  if (newPwd.length < 6) return { ok: false, message: "Password baru minimal 6 karakter" };
  extra[idx].password = newPwd;
  write(USERS_KEY, extra);
  return { ok: true, message: "Password berhasil diperbarui" };
}
