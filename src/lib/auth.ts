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
};

// Sync getter for existing callers
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw =
    getStorage()?.getItem(SESSION_KEY) ?? getSessionStorage()?.getItem(SESSION_KEY) ?? null;
  if (!raw) return null;
  try {
    const s: Session = JSON.parse(raw);
    if (Date.now() > new Date(s.expiresAt).getTime()) {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function login(username: string, password: string, remember = false): Session | null {
  const u = listUsers().find(
    (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
  );
  // Fixed admin TIDAK BISA login via client-side auth.
  // Ini memaksa penggunaan loginHybrid() → Netlify Function → env vars server-side.
  // Jika edge function gagal/offline, fixed admin juga gagal → "Tidak dapat terhubung ke server"
  if (u?.fixed) return null;
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
  logAudit({
    action: "auth.login",
    detail: `Login berhasil: ${u.username}`,
    username: u.username,
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
      // Edge function auth succeeded — session is in httpOnly cookie
      return { ok: true, session: data.session };
    }

    // Edge function failed — try local auth
    const local = login(username, password, remember);
    if (local) return { ok: true, session: local };

    return { ok: false, error: data.error ?? "Login gagal" };
  } catch {
    // Network error — fallback to local auth
    const local = login(username, password, remember);
    if (local) return { ok: true, session: local };
    return { ok: false, error: "Tidak dapat terhubung ke server" };
  }
}

export function logout() {
  const s = getSession();
  if (s) {
    logAudit({
      action: "auth.logout",
      detail: `Logout: ${s.username}`,
      username: s.username,
    });
  }
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
