/**
 * idb-store.ts — Central IndexedDB Engine for MitraDesa
 *
 * Database : seruni_mumbul_db  (v2 — upgrade dari v1 yg hanya punya 'penduduk')
 * Stores   : 19 object stores, masing-masing punya keyPath sendiri.
 *
 * Prinsip  : SSR-safe (semua akses dibungkus typeof window check)
 *            Write-through (langsung ke IndexedDB, bukan cache dulu)
 *            Migration (auto-migrate localStorage → IndexedDB sekali pakai)
 */

// ── Konfigurasi DB ────────────────────────────────────────────────────────────
export const IDB_NAME = "seruni_mumbul_db";
export const IDB_VER = 6;

/** Semua object store beserta keyPath-nya */
export const IDB_STORES = {
  penduduk: "nik", // ← sudah ada di v1
  settings: "id", // single record, id = "main"
  users: "id",
  perangkat: "id",
  perangkat_struktur: "id", // tree struktur jabatan perangkat
  berita: "id",
  agenda: "id",
  galeri: "id",
  pengumuman: "id",
  apbdes: "id",
  komoditas: "id",
  esurat_records: "no",
  esurat_archive: "no",
  templates: "id",
  audit_log: "id",
  nomor_surat: "id", // id = "YYYY" (tahun)
  offline_queue: "id", // id = "offline_<timestamp>_<random>"
  lembaga: "id",
  pengaduan: "ticket",
  wilayah: "kode", // Kode Kemendagri (13 digit untuk village)
  subdiv: "id", // village_subdivisions, id = auto
  marketplace: "id", // marketplace products (UMKM)
  koperasi: "id", // Koprasi items
  marketplace_config: "id", // marketplace Shopee-style config
  orders: "id", // marketplace order records
} as const;

export type IDBStoreName = keyof typeof IDB_STORES;

// ── Open DB ───────────────────────────────────────────────────────────────────
let _dbPromise: Promise<IDBDatabase> | null = null;

export function openIDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB tidak tersedia di SSR"));
  }
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // Buat semua stores yang belum ada
      for (const [name, keyPath] of Object.entries(IDB_STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      _dbPromise = null; // reset agar bisa retry
      reject(req.error);
    };
    req.onblocked = () => {
      console.warn("[idb] DB upgrade diblokir tab lain. Coba refresh halaman.");
    };
  });

  return _dbPromise;
}

// ── Generic CRUD ──────────────────────────────────────────────────────────────

/** Ambil satu record by key */
export async function idbGet<T>(store: IDBStoreName, key: IDBValidKey): Promise<T | undefined> {
  if (typeof window === "undefined") return undefined;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Ambil semua record */
export async function idbGetAll<T>(store: IDBStoreName): Promise<T[]> {
  if (typeof window === "undefined") return [];
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/** Simpan / update satu record (upsert) */
export async function idbPut<T>(store: IDBStoreName, record: T): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Simpan banyak record sekaligus (batch upsert) */
export async function idbPutMany<T>(store: IDBStoreName, records: T[]): Promise<void> {
  if (typeof window === "undefined" || records.length === 0) return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const oStore = tx.objectStore(store);
    for (const r of records) oStore.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Hapus satu record by key */
export async function idbDelete(store: IDBStoreName, key: IDBValidKey): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Hapus semua record di satu store */
export async function idbClear(store: IDBStoreName): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Hapus semua + insert baru dalam 1 transaksi (bulk replace) */
export async function idbReplaceAll<T>(store: IDBStoreName, records: T[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const oStore = tx.objectStore(store);
    oStore.clear();
    for (const r of records) oStore.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Hitung jumlah record */
export async function idbCount(store: IDBStoreName): Promise<number> {
  if (typeof window === "undefined") return 0;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Export / Import seluruh DB ────────────────────────────────────────────────

/**
 * Export semua store ke satu object JSON.
 * Format: { version, exported_at, stores: { [storeName]: records[] } }
 */
export async function idbExportAll(): Promise<Record<string, unknown>> {
  if (typeof window === "undefined") return {};
  const storeNames = Object.keys(IDB_STORES) as IDBStoreName[];
  // Read all stores in parallel — ~22 stores × sequential awaits can be slow
  const results = await Promise.all(storeNames.map((name) => idbGetAll(name)));
  const out: Record<string, unknown[]> = {};
  for (let i = 0; i < storeNames.length; i++) {
    out[storeNames[i]] = results[i];
  }
  return {
    version: IDB_VER,
    exported_at: new Date().toISOString(),
    stores: out,
  };
}

/**
 * Import dari backup JSON. Setiap store di-replace dengan data dari backup.
 * Store yang tidak ada di backup dibiarkan utuh.
 */
export async function idbImportAll(
  backup: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") return { ok: false, message: "SSR tidak didukung" };
  try {
    const data = (backup.stores ?? backup.data) as Record<string, unknown[]> | undefined;
    if (!data) return { ok: false, message: "Format backup tidak dikenali" };

    const validStores = Object.keys(IDB_STORES) as IDBStoreName[];
    for (const name of validStores) {
      if (data[name] && Array.isArray(data[name])) {
        await idbReplaceAll(name, data[name]);
      }
    }
    return { ok: true, message: "Backup berhasil dipulihkan ke IndexedDB" };
  } catch (e) {
    return { ok: false, message: `Gagal: ${(e as Error).message}` };
  }
}

// ── One-Time Migration: localStorage → IndexedDB ──────────────────────────────

const MIGRATION_FLAG = "idb_migrated_v2";

/**
 * Jalankan saat startup (sekali saja).
 * Membaca data lama dari localStorage lalu memasukkan ke IndexedDB.
 */
export async function runLocalStorageMigration(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return; // sudah pernah dijalankan

  try {
    // 1. Settings
    const rawSettings = localStorage.getItem("admin_settings_v1");
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      await idbPut("settings", { id: "main", ...parsed });
    }

    // 2. Admin users
    const rawUsers = localStorage.getItem("admin_users");
    if (rawUsers) {
      const users = JSON.parse(rawUsers) as unknown[];
      await idbPutMany("users", users);
    }

    // 3. E-Surat records
    const rawRecords = localStorage.getItem("e_surat_records");
    if (rawRecords) {
      const records = JSON.parse(rawRecords) as unknown[];
      await idbPutMany("esurat_records", records);
    }

    // 4. E-Surat archive
    const rawArchive = localStorage.getItem("e_surat_archive");
    if (rawArchive) {
      const archive = JSON.parse(rawArchive) as unknown[];
      await idbPutMany("esurat_archive", archive);
    }

    // 5. Templates
    const rawTemplates = localStorage.getItem("e_surat_templates");
    if (rawTemplates) {
      const templates = JSON.parse(rawTemplates) as unknown[];
      await idbPutMany("templates", templates);
    }

    // 6. Audit log
    const rawAudit = localStorage.getItem("admin_audit_log");
    if (rawAudit) {
      const entries = (
        JSON.parse(rawAudit) as Array<{ ts: string; user: string; action: string; detail?: string }>
      ).map((e, i) => ({ ...e, id: `${e.ts}-${i}` }));
      await idbPutMany("audit_log", entries);
    }

    // 7. Nomor surat counters (semua key nomor_surat_no_urut_YYYY)
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      const val = localStorage.getItem(`nomor_surat_no_urut_${y}`);
      if (val) {
        await idbPut("nomor_surat", { id: String(y), counter: parseInt(val, 10) });
      }
    }

    // Tandai sudah selesai
    localStorage.setItem(MIGRATION_FLAG, "1");
    console.info("[idb] Migration localStorage → IndexedDB selesai.");
  } catch (e) {
    console.warn("[idb] Migration gagal (tidak fatal):", e);
  }
}
