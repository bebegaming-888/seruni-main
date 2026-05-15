/**
 * wilayah-store.ts — Wilayah (Provinsi/Kabupaten/Kecamatan/Desa) + Village Subdivisions (Dusun/RW/RT)
 *
 * Single source of truth untuk data wilayah Indonesia.
 * Load order: Supabase → IndexedDB → hardcoded fallback.
 *
 * Persistence: IndexedDB via idb-store ("wilayah", "subdiv" stores).
 * Data referensi: Kode Kemendagri untuk hirarki wilayah Indonesia.
 * Subdivisi lokal: dusun/RW/RT yang spesifik per village.
 */

import { idbGet, idbPut, idbReplaceAll } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isStoreLocked } from "@/lib/settings-lock";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WilayahLevel = "province" | "regency" | "district" | "village";

export interface WilayahItem {
  id: number;
  kode: string; // Kode Kemendagri (13 digit untuk village)
  level: WilayahLevel;
  nama: string;
  parent_kode: string | null;
}

export type SubdivisionLevel = "dusun" | "rw" | "rt";

export interface Subdivision {
  id: number;
  village_kode: string;
  level: SubdivisionLevel;
  nama: string;
}

// ── IDB store name ─────────────────────────────────────────────────────────────
// Gunakan store "wilayah" — perlu didaftarkan di IDB_STORES (idb-store.ts)
// Fallback: jika belum ada, data disimpan sementara di memory until idb-store upgraded

export const WILAYAH_IDB_KEY = "wilayah_data";
export const SUBDIV_IDB_KEY = "subdiv_data";

// ── In-Memory Cache ───────────────────────────────────────────────────────────

interface Cache {
  provinces: WilayahItem[];
  byParent: Record<string, WilayahItem[]>; // keyed by parent_kode
  subdivisions: Record<string, Subdivision[]>; // keyed by village_kode
  selectedVillage: WilayahItem | null;
  selectedVillageKode: string; // for settings persistence
  initialized: boolean;
}

const _cache: Cache = {
  provinces: [],
  byParent: {},
  subdivisions: {},
  selectedVillage: null,
  selectedVillageKode: "5203012001",
  initialized: false,
};

// ── Fallback Static Data (LAST RESORT — only when Supabase+IDB fail) ───────────
// Ini akan dihapus bertahap begitu data sudah ter-seed di database.

const FALLBACK_WILAYAH: WilayahItem[] = [
  { id: 1, kode: "52", level: "province", nama: "Nusa Tenggara Barat", parent_kode: null },
  { id: 2, kode: "5203", level: "regency", nama: "Lombok Timur", parent_kode: "52" },
  { id: 3, kode: "5203012", level: "district", nama: "Pringgabaya", parent_kode: "5203" },
  { id: 4, kode: "5203012001", level: "village", nama: "Desa", parent_kode: "5203012" },
];

const FALLBACK_SUBDIVISIONS: Subdivision[] = [
  { id: 1, village_kode: "5203012001", level: "dusun", nama: "Mandar" },
  { id: 2, village_kode: "5203012001", level: "dusun", nama: "Sasak" },
  { id: 3, village_kode: "5203012001", level: "dusun", nama: "Dames" },
  { id: 4, village_kode: "5203012001", level: "dusun", nama: "Brantapen Asri" },
  { id: 5, village_kode: "5203012001", level: "rw", nama: "001" },
  { id: 6, village_kode: "5203012001", level: "rt", nama: "001" },
];

// ── Persistence helpers (IndexedDB) ───────────────────────

/** Simpan cache ke IndexedDB.
 *  IndexedDB: primary persistence — survive hard refresh, private browsing, storage quota.
 */
async function _saveToIDB(): Promise<void> {
  try {
    // Simpan wilayah data per parent key — gunakan "all" sebagai key utama
    // untuk menyimpan seluruh byParent map dalam 1 record
    const allKey = "__all__";
    const WilayahRecord = {
      kode: allKey,
      level: "province" as WilayahLevel,
      nama: "ALL_WILAYAH",
      parent_kode: null,
      // Data tambahan di luar keyPath
      _byParent: _cache.byParent,
      _provinces: _cache.provinces,
      _selectedVillageKode: _cache.selectedVillageKode,
      _updatedAt: Date.now(),
    };
    await idbPut("wilayah", WilayahRecord);

    // Simpan subdivisions per village_kode
    for (const [vk, subdivs] of Object.entries(_cache.subdivisions)) {
      const subdivRecord = {
        id: vk, // village_kode sebagai id
        village_kode: vk,
        level: "dusun" as SubdivisionLevel,
        nama: "__SUBDIV_WRAPPER__",
        _subdivisions: subdivs,
        _updatedAt: Date.now(),
      };
      await idbPut("subdiv", subdivRecord);
    }
  } catch (e) {
    console.error("[wilayah-store] IDB save failed:", e);
  }
}

/** Load dari IndexedDB → cache.
 */
async function _loadFromIDB(): Promise<{
  wilayah: Record<string, WilayahItem[]>;
  subdiv: Record<string, Subdivision[]>;
  selectedKode: string;
} | null> {
  try {
    // Ambil record utama dengan key "__all__"
    const allRecord = await idbGet<{
      kode: string;
      _byParent: Record<string, WilayahItem[]>;
      _provinces: WilayahItem[];
      _selectedVillageKode: string;
      _updatedAt: number;
    }>("wilayah", "__all__");

    if (!allRecord || !allRecord._byParent) {
      return null;
    }

    // Reconstruct cache
    _cache.byParent = allRecord._byParent;
    _cache.provinces = allRecord._provinces ?? [];
    _cache.selectedVillageKode = allRecord._selectedVillageKode ?? "5203012001";

    // Load subdivisions dari store "subdiv"
    const subdivRecords = await _idbGetAllSubdiv();
    _cache.subdivisions = {};
    for (const rec of subdivRecords) {
      if (rec._subdivisions) {
        _cache.subdivisions[rec.village_kode] = rec._subdivisions;
      }
    }

    _resolveSelectedVillage();
    return {
      wilayah: allRecord._byParent,
      subdiv: _cache.subdivisions,
      selectedKode: _cache.selectedVillageKode,
    };
  } catch (e) {
    console.warn("[wilayah-store] IDB load failed:", e);
    return null;
  }
}

/** Helper: get all subdiv records */
async function _idbGetAllSubdiv(): Promise<
  Array<{
    id: string;
    village_kode: string;
    level: SubdivisionLevel;
    nama: string;
    _subdivisions: Subdivision[];
  }>
> {
  const { idbGetAll } = await import("@/lib/idb-store");
  return idbGetAll<{
    id: string;
    village_kode: string;
    level: SubdivisionLevel;
    nama: string;
    _subdivisions: Subdivision[];
  }>("subdiv");
}

/** Sync subdiv cache ke IndexedDB (called after mutations) */
async function _saveSubdivToIDB(villageKode: string): Promise<void> {
  try {
    const subdivs = _cache.subdivisions[villageKode] ?? [];
    const record = {
      id: villageKode,
      village_kode: villageKode,
      level: "dusun" as SubdivisionLevel,
      nama: "__SUBDIV_WRAPPER__",
      _subdivisions: subdivs,
      _updatedAt: Date.now(),
    };
    await idbPut("subdiv", record);
  } catch (e) {
    console.warn("[wilayah-store] subdiv IDB save failed:", e);
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────

/**
 * Initialize wilayah store.
 * Priority: Supabase → IndexedDB → hardcoded fallback.
 * Panggil SEKALI saat app mount, via initAllStores() di store-init.ts.
 */
export async function initWilayahStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_cache.initialized) return;

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked("wilayah")) {
    console.info("[wilayah-store] Initializing from IDB (Store Locked)");
    const idbData = await _loadFromIDB();
    if (idbData) {
      _cache.initialized = true;
      return;
    }
  }

  try {
    // ── 1. Supabase ──
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from("wilayah")
          .select("*")
          .order("kode", { ascending: true });

        if (!error && data && data.length > 0) {
          _loadFromSupabase(data as WilayahItem[]);

          // Load subdivisions
          const { data: subdivData, error: subdivError } = await sb
            .from("village_subdivisions")
            .select("*")
            .order("village_kode", { ascending: true });

          if (!subdivError && subdivData && subdivData.length > 0) {
            _loadSubdivisions(subdivData as Subdivision[]);
          }

          _cache.initialized = true;
          await _saveToIDB();
          console.info(`[wilayah-store] Loaded ${data.length} wilayah records from Supabase`);
          return;
        }
        if (error) {
          console.warn("[wilayah-store] Supabase select error:", error.message);
        }
      }
    }

    // ── 2. IndexedDB ──
    const idbData = await _loadFromIDB();
    if (idbData) {
      _cache.initialized = true;
      console.info("[wilayah-store] Loaded from IndexedDB");
      return;
    }

    // ── 3. Fallback: hardcoded static data (Memory Only) ──
    _loadFromSupabase(FALLBACK_WILAYAH);
    _loadSubdivisions(FALLBACK_SUBDIVISIONS);
    _cache.initialized = true;
    console.info(
      "[wilayah-store] Using hardcoded fallback in memory (tidak disimpan ke IDB agar tidak menimpa data asli)",
    );
  } catch (e) {
    console.error("[wilayah-store] Init failed:", e);
    // Fallback to hardcoded data
    _loadFromSupabase(FALLBACK_WILAYAH);
    _loadSubdivisions(FALLBACK_SUBDIVISIONS);
    _cache.initialized = true;
  }
}

function _loadFromSupabase(data: WilayahItem[]) {
  _cache.provinces = data.filter((w) => w.level === "province");

  // Group by parent_kode
  _cache.byParent = {};
  for (const w of data) {
    const parent = w.parent_kode ?? "__root__";
    if (!_cache.byParent[parent]) _cache.byParent[parent] = [];
    _cache.byParent[parent].push(w);
  }

  // Also store flat by kode
  for (const w of data) {
    // ensure byParent["kode"] = [w] for direct lookup
  }
}

function _loadSubdivisions(data: Subdivision[]) {
  _cache.subdivisions = {};
  for (const s of data) {
    if (!_cache.subdivisions[s.village_kode]) _cache.subdivisions[s.village_kode] = [];
    _cache.subdivisions[s.village_kode].push(s);
  }
}

function _resolveSelectedVillage() {
  const kode = _cache.selectedVillageKode;
  // Find in cache
  for (const parent of Object.keys(_cache.byParent)) {
    const found = _cache.byParent[parent].find((w) => w.kode === kode);
    if (found) {
      _cache.selectedVillage = found;
      return;
    }
  }
  // Fallback to first village in cache
  const villages = _cache.byParent["5203012"] ?? [];
  _cache.selectedVillage = villages[0] ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isWilayahInitialized(): boolean {
  return _cache.initialized;
}

/** Semua provinsi */
export function getProvinces(): WilayahItem[] {
  return _cache.provinces;
}

/** Semua regensi dalam satu provinsi */
export function getRegencies(provinceKode: string): WilayahItem[] {
  return _cache.byParent[provinceKode] ?? [];
}

/** Semua district dalam satu regensi */
export function getDistricts(regencyKode: string): WilayahItem[] {
  return _cache.byParent[regencyKode] ?? [];
}

/** Semua village dalam satu district */
export function getVillages(districtKode: string): WilayahItem[] {
  return _cache.byParent[districtKode] ?? [];
}

/** Ambil item berdasarkan kode */
export function getWilayahByKode(kode: string): WilayahItem | null {
  for (const parent of Object.keys(_cache.byParent)) {
    const found = _cache.byParent[parent].find((w) => w.kode === kode);
    if (found) return found;
  }
  return null;
}

/** Ambil village saat ini (yang dipilih di settings) */
export function getCurrentVillage(): WilayahItem | null {
  if (!_cache.initialized) {
    // Fallback: return hardcoded village
    return FALLBACK_WILAYAH.find((w) => w.level === "village") ?? null;
  }
  return _cache.selectedVillage;
}

/** Kode village yang sedang aktif */
export function getCurrentVillageKode(): string {
  return _cache.selectedVillageKode;
}

/** Set village aktif — update settings + cache */
export async function setCurrentVillage(kode: string): Promise<void> {
  _cache.selectedVillageKode = kode;
  _resolveSelectedVillage();
  await _saveToIDB();
}

// ── Subdivisions (Dusun/RW/RT) ─────────────────────────────────────────────────

/** Semua subdivisi untuk satu village */
export function getSubdivisions(villageKode: string): Subdivision[] {
  return (
    _cache.subdivisions[villageKode] ??
    FALLBACK_SUBDIVISIONS.filter((s) => s.village_kode === villageKode)
  );
}

/** Subdivisi per level */
export function getDusunList(villageKode?: string): Subdivision[] {
  const kode = villageKode ?? _cache.selectedVillageKode;
  return getSubdivisions(kode).filter((s) => s.level === "dusun");
}

export function getRWList(villageKode?: string): Subdivision[] {
  const kode = villageKode ?? _cache.selectedVillageKode;
  return getSubdivisions(kode).filter((s) => s.level === "rw");
}

export function getRTList(villageKode?: string): Subdivision[] {
  const kode = villageKode ?? _cache.selectedVillageKode;
  return getSubdivisions(kode).filter((s) => s.level === "rt");
}

// ── Mutations: CRUD for subdivisions ──────────────────────────────────────────

/** Add a subdivision (dusun/rw/rt) */
export async function addSubdivision(
  subdivision: Omit<Subdivision, "id">,
): Promise<{ ok: boolean; message: string }> {
  const existing = getSubdivisions(subdivision.village_kode);
  if (existing.some((s) => s.level === subdivision.level && s.nama === subdivision.nama)) {
    return { ok: false, message: `${subdivision.level} "${subdivision.nama}" sudah ada` };
  }

  const newItem: Subdivision = {
    ...subdivision,
    id: Date.now(), // temporary ID; Supabase will assign real ID
  };

  // Update cache
  if (!_cache.subdivisions[subdivision.village_kode]) {
    _cache.subdivisions[subdivision.village_kode] = [];
  }
  _cache.subdivisions[subdivision.village_kode].push(newItem);
  await _saveSubdivToIDB(subdivision.village_kode);

  // Sync to Supabase
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("village_subdivisions").insert({ ...subdivision }); // id omitted (auto)
      if (error) {
        console.warn("[wilayah-store] addSubdivision Supabase error:", error.message);
        return { ok: true, message: "Tersimpan secara lokal (sync cloud gagal)" };
      }
    }
  }

  return { ok: true, message: `${subdivision.level} "${subdivision.nama}" ditambahkan` };
}

/** Update subdivision nama */
export async function updateSubdivision(
  id: number,
  newNama: string,
): Promise<{ ok: boolean; message: string }> {
  for (const vk of Object.keys(_cache.subdivisions)) {
    const idx = _cache.subdivisions[vk].findIndex((s) => s.id === id);
    if (idx >= 0) {
      const old = _cache.subdivisions[vk][idx];
      if (
        _cache.subdivisions[vk].some(
          (s) => s.id !== id && s.level === old.level && s.nama === newNama,
        )
      ) {
        return { ok: false, message: "Nama sudah digunakan" };
      }
      _cache.subdivisions[vk][idx] = { ...old, nama: newNama };
      await _saveSubdivToIDB(vk);

      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          const { error } = await sb
            .from("village_subdivisions")
            .update({ nama: newNama })
            .eq("id", id);
          if (error) console.error("[wilayah-store] Update subdivision error:", error.message);
        }
      }
      return { ok: true, message: "Berhasil diperbarui" };
    }
  }
  return { ok: false, message: "Subdivisi tidak ditemukan" };
}

/** Delete a subdivision */
export async function deleteSubdivision(id: number): Promise<{ ok: boolean; message: string }> {
  for (const vk of Object.keys(_cache.subdivisions)) {
    const idx = _cache.subdivisions[vk].findIndex((s) => s.id === id);
    if (idx >= 0) {
      const removed = _cache.subdivisions[vk].splice(idx, 1)[0];
      await _saveSubdivToIDB(vk);

      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          const { error } = await sb.from("village_subdivisions").delete().eq("id", id);
          if (error) console.error("[wilayah-store] Delete subdivision error:", error.message);
        }
      }
      return { ok: true, message: `${removed.level} "${removed.nama}" dihapus` };
    }
  }
  return { ok: false, message: "Subdivisi tidak ditemukan" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get full address path: dusun, rt, rw, desa, kecamatan, kabupaten, provinsi */
export function getFullAddressPath(villageKode?: string): {
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  dusun_list: string[];
  default_rt: string;
  default_rw: string;
} {
  const village = getCurrentVillage() ?? FALLBACK_WILAYAH.find((w) => w.level === "village")!;
  const kode = villageKode ?? village.kode;

  // Walk up the hierarchy
  let current = village;
  const path: WilayahItem[] = [current];
  while (current.parent_kode) {
    const parent = getWilayahByKode(current.parent_kode);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }

  const province = path.find((w) => w.level === "province");
  const regency = path.find((w) => w.level === "regency");
  const district = path.find((w) => w.level === "district");
  const villageItem = path.find((w) => w.level === "village");

  const dusunList = getDusunList(kode);
  const rwList = getRWList(kode);
  const rtList = getRTList(kode);

  return {
    provinsi: province?.nama ?? "Nusa Tenggara Barat",
    kabupaten: regency?.nama ?? "Lombok Timur",
    kecamatan: district?.nama ?? "Pringgabaya",
    desa: villageItem?.nama ?? "Desa",
    dusun_list: dusunList.map((s) => s.nama),
    default_rt: rtList[0]?.nama ?? "001",
    default_rw: rwList[0]?.nama ?? "001",
  };
}
