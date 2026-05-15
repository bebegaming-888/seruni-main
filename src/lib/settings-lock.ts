/**
 * settings-lock.ts — Mekanisme Penguncian Pengaturan Landing Page
 *
 * Masalah yang diselesaikan:
 * - Setiap kali development mode (HMR) trigger, store di-reset
 * - Zustand store kembali ke DEFAULT_SETTINGS → overwrite data user
 * - initFromMocks() mengisi mock data saat store kosong
 *
 * Solusi: Lock flag di tiga lapisan (triple-layer safety):
 * 1. Module-level cache → survive HMR re-evaluation (sync, fastest)
 * 2. localStorage → survive page refresh (sync, fast)
 * 3. IndexedDB → persist across sessions (async, source of truth)
 *
 * Flow:
 * 1. App mount → initSettingsLock() → load dari IndexedDB → cache ke localStorage + module cache
 * 2. Jika locked: skip initFromMocks() di store-init.ts
 * 3. Jika locked: initSettingsStore() JANGAN overwrite Zustand state user
 * 4. User update settings → auto re-lock untuk protect perubahan berikutnya
 */

const LOCK_KEY_IDB = "settings_lock";
const LOCK_KEY_LS = "seruni_settings_locked"; // localStorage backup

export type SettingsLockState = {
  locked: boolean;
  locked_at?: string;
  locked_by?: string;
  locked_stores: string[]; // ["settings", "berita", "pengumuman", "hero", ...]
};

const DEFAULT_LOCK_STATE: SettingsLockState = {
  locked: false,
  locked_stores: [],
};

// ── Module-level cache (survives HMR re-evaluation) ──
// Module state DI RESET saat HMR re-evaluates file ini.
// Tapi localStorage tetap ada, jadi kita cek localStorage sebagai fallback first.
let _lockCache: SettingsLockState | null = null;

// ── Sync read dari localStorage (panggil saat init module) ──
function _loadFromLocalStorage(): SettingsLockState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_LOCK_STATE };
  try {
    const raw = localStorage.getItem(LOCK_KEY_LS);
    if (raw) {
      const parsed = JSON.parse(raw) as SettingsLockState;
      _lockCache = parsed;
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return { ...DEFAULT_LOCK_STATE };
}

// Load seketika saat module di-load (sebelum ada async call apapun)
const _initialState = _loadFromLocalStorage();

// ── Public API ──

/**
 * Sync read — cek apakah settings sudah di-lock.
 * Prioritas: module cache → localStorage → default (unlocked)
 *
 * Dipanggil oleh store-init.ts SEBELUM initFromMocks() jalan.
 * Karena dipanggil SEBELUM IndexedDB ready, cek ini HARUS sync.
 */
export function isSettingsLocked(): boolean {
  // 1. Module cache (sudah di-load saat module init)
  if (_lockCache !== null) return _lockCache.locked;

  // 2. localStorage (fallback, juga sync)
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCK_KEY_LS);
      if (raw) {
        const parsed = JSON.parse(raw) as SettingsLockState;
        _lockCache = parsed;
        return parsed.locked;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Cek apakah store tertentu di-lock.
 * @param storeName - nama store: "settings", "berita", "pengumuman", "hero", dll.
 */
export function isStoreLocked(storeName: string): boolean {
  if (!isSettingsLocked()) return false;

  // Cek dari module cache (paling cepat, sync)
  if (_lockCache !== null) {
    return _lockCache.locked_stores.includes(storeName);
  }

  // Fallback: cek dari initial state yang sudah di-load saat module init
  return _initialState.locked_stores.includes(storeName);
}

/**
 * Load lock state dari IndexedDB (async init).
 * Dipanggil di initAllStores() SEBELUM store lain di-init.
 *
 * Priority:
 * 1. IndexedDB → module cache + localStorage
 * 2. localStorage → module cache + IndexedDB
 * 3. Tidak ada → module cache = unlocked
 */
export async function initSettingsLock(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { idbGet } = await import("@/lib/idb-store");
    const saved = await idbGet<SettingsLockState>("settings", LOCK_KEY_IDB);

    if (saved) {
      _lockCache = saved;
      // Sync ke localStorage backup
      localStorage.setItem(LOCK_KEY_LS, JSON.stringify(saved));
      console.info(
        "[settings-lock] Loaded from IndexedDB:",
        saved.locked ? "LOCKED" : "unlocked",
        "stores:",
        saved.locked_stores,
      );
      return;
    }
  } catch (e) {
    console.warn("[settings-lock] IDB read failed, trying localStorage:", e);
  }

  // Fallback: localStorage (sync)
  const raw = localStorage.getItem(LOCK_KEY_LS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SettingsLockState;
      _lockCache = parsed;
      // Sync ke IndexedDB
      try {
        const { idbPut } = await import("@/lib/idb-store");
        await idbPut("settings", { id: LOCK_KEY_IDB, ...parsed } as SettingsLockState & {
          id: string;
        });
      } catch {
        // non-blocking
      }
      console.info(
        "[settings-lock] Loaded from localStorage:",
        parsed.locked ? "LOCKED" : "unlocked",
      );
      return;
    } catch {
      // ignore parse error
    }
  }

  _lockCache = { ...DEFAULT_LOCK_STATE };
}

/**
 * Lock settings — otomatis dipanggil saat user save settings.
 * Protect semua landing page config dari HMR overwrite.
 *
 * @param stores - array nama store yang di-lock
 * @param username - username admin (optional, untuk audit)
 */
export async function lockSettings(
  stores: string[] = [
    "settings",
    "berita",
    "pengumuman",
    "agenda",
    "galeri",
    "komoditas",
    "apbdes",
    "templates",
    "lembaga",
    "perangkat_desa",
    "pengaduan",
    "esurat",
    "wilayah",
    "penduduk",
  ],
  username?: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const newState: SettingsLockState = {
    locked: true,
    locked_at: new Date().toISOString(),
    locked_by: username,
    locked_stores: stores,
  };

  _lockCache = newState;

  try {
    const { idbPut } = await import("@/lib/idb-store");
    // Simpan ke IndexedDB + localStorage (double backup)
    await idbPut("settings", { id: LOCK_KEY_IDB, ...newState } as SettingsLockState & {
      id: string;
    });
    localStorage.setItem(LOCK_KEY_LS, JSON.stringify(newState));
    console.info("[settings-lock] LOCKED — stores:", stores.join(", "));
  } catch (e) {
    console.error("[settings-lock] Gagal simpan lock state:", e);
  }
}

/**
 * Unlock settings — HATI-HATI: ini akan reset semua konfigurasi ke mock data!
 * Jangan dipanggil kecuali admin memang mau reset ke default.
 */
export async function unlockSettings(): Promise<void> {
  if (typeof window === "undefined") return;

  const newState: SettingsLockState = {
    locked: false,
    locked_stores: [],
  };

  _lockCache = newState;

  try {
    const { idbPut } = await import("@/lib/idb-store");
    await idbPut("settings", { id: LOCK_KEY_IDB, ...newState });
    localStorage.setItem(LOCK_KEY_LS, JSON.stringify(newState));
    console.warn("[settings-lock] UNLOCKED — semua konfigurasi akan di-reset saat refresh next");
  } catch (e) {
    console.error("[settings-lock] Gagal simpan unlock state:", e);
  }
}

/**
 * Reset lock state (untuk development / testing).
 * Hapus semua trace lock dari IndexedDB + localStorage.
 */
export async function resetLock(): Promise<void> {
  _lockCache = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LOCK_KEY_LS);
  }
  try {
    const { idbDelete } = await import("@/lib/idb-store");
    await idbDelete("settings", LOCK_KEY_IDB);
  } catch {
    // ignore
  }
}

/**
 * Get full lock state (untuk UI display / debugging).
 */
export function getLockState(): SettingsLockState {
  return _lockCache ?? { ...DEFAULT_LOCK_STATE };
}
