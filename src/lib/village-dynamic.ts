/**
 * village-dynamic.ts — Unified Dynamic Data Bridge
 *
 * PURPOSE: Replace ALL hardcoded village-specific values with a single API-driven source.
 *
 * BEFORE: "Seruni Mumbul", "Pringgabaya", "Lombok Timur", "Nusa Tenggara Barat"
 * AFTER:  getVillage("name"), getVillage("district"), etc.
 *
 * PRIORITY HIERARCHY:
 * 1. Supabase Cloud (source of truth for admin-configured data)
 * 2. IndexedDB (persistent cache, survives refresh/HMR)
 * 3. localStorage (lock state, fast sync)
 * 4. DEFAULT_SETTINGS (last resort, always has valid data)
 *
 * USAGE:
 *   import { getVillage } from "@/lib/village-dynamic";
 *
 *   // Static string replacement
 *   getVillage("village")       → "Desa Seruni Mumbul"
 *   getVillage("district")     → "Pringgabaya"
 *   getVillage("regency")      → "Lombok Timur"
 *   getVillage("province")     → "Nusa Tenggara Barat"
 *   getVillage("address")      → "Jl. Raya Pringgabaya No. 88"
 *   getVillage("phone")        → "+62 812-3456-7890"
 *   getVillage("whatsapp")     → "6281234567890"
 *   getVillage("email")        → "info@serunimumbul.desa.id"
 *   getVillage("village_code") → "5203012001"
 *   getVillage("postal_code")  → "83654"
 *
 *   // Formatted helpers
 *   getVillage("full_address")    → "Jl. Raya Pringgabaya No. 88, Pringgabaya, Lombok Timur, NTB 83654"
 *   getVillage("kop_kabupaten")   → "PEMERINTAH KABUPATEN LOMBOK TIMUR"
 *   getVillage("kop_kecamatan")   → "KECAMATAN PRINGGABAYA"
 *   getVillage("kop_desa")        → "DESA SERUNI MUMBUL"
 *   getVillage("kop_alamat")      → "Jl. Raya Pringgabaya No. 88, Seruni Mumbul, Lombok Timur, NTB 83654"
 *   getVillage("kop_alamat_clean")→ "Jl. Raya Pringgabaya No. 88, Seruni Mumbul, Lombok Timur, 83654"
 *   getVillage("sender_name")     → "Pemdes Seruni Mumbul"
 *   getVillage("inisial_desa")     → "SRMB"
 *   getVillage("inisial_jabatan") → "KDS"
 *   getVillage("qr_prefix")       → "SERUNI-MUMBUL-2026"
 *   getVillage("dusun_list")      → ["Mandar", "Sasak", "Dames", "Brantapen Asri"]
 *   getVillage("penduduk_stat")   → "4.5k+"
 *   getVillage("luas_wilayah")    → "12km²"
 *
 *   // All fields (for bulk access)
 *   getVillage()                 → VillageInfo object
 */

import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VillageField =
  // Village identity
  | "name"
  | "village"
  | "district"
  | "regency"
  | "province"
  | "village_code"
  // Contact
  | "address"
  | "phone"
  | "whatsapp"
  | "email"
  | "postal_code"
  // Village officials
  | "head"
  | "head_title"
  | "secretary"
  // Kop surat derived
  | "kop_kabupaten"
  | "kop_kecamatan"
  | "kop_desa"
  | "kop_alamat"
  | "kop_alamat_clean"
  | "kop_telp"
  // Notification
  | "sender_name"
  // Number/signature
  | "inisial_desa"
  | "inisial_jabatan"
  | "qr_prefix"
  // Location divisions
  | "dusun_list"
  // Stats
  | "penduduk_stat"
  | "luas_wilayah"
  | "potensi_wisata_stat"
  | "prestasi_stat"
  // Full address
  | "full_address";

export interface VillageInfo {
  name: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  village_code: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  postal_code: string;
  head: string;
  head_title: string;
  secretary: string;
  kop_kabupaten: string;
  kop_kecamatan: string;
  kop_desa: string;
  kop_alamat: string;
  kop_alamat_clean: string;
  kop_telp: string;
  sender_name: string;
  inisial_desa: string;
  inisial_jabatan: string;
  qr_prefix: string;
  dusun_list: string[];
  penduduk_stat: string;
  luas_wilayah: string;
  potensi_wisata_stat: string;
  prestasi_stat: string;
  full_address: string;
}

// ── Cached getters (avoid repeated getSettings() calls) ───────────────────────

let _cache: VillageInfo | null = null;
let _cacheVersion = 0;

/** Invalidate cache — dipanggil saat settings berubah. */
export function invalidateVillageCache(): void {
  _cache = null;
  _cacheVersion++;
}

// ── Overload declarations (must come BEFORE implementation) ──────────────────
export function getVillage(field: string): string;
export function getVillage(): VillageInfo;

/** Get all village info as a single object. Cached per render cycle. */
export function getVillage(field?: string | undefined): VillageInfo | string {
  if (_cache) return _cache;

  const s = getSettings();
  const w = s.wilayah;
  const v = s.village;
  const sig = s.signature;
  const notif = s.notifications;
  const nomor = s.nomor;
  const content = s.content;

  // Safety: default values if settings are missing (last resort, always has data)
  const village = v.name ?? "Desa Seruni Mumbul";
  const district = w.district ?? "Pringgabaya";
  const regency = w.regency ?? "Lombok Timur";
  const province = w.province ?? "Nusa Tenggara Barat";
  const village_code = w.village_code ?? "5203012001";
  const address = v.address ?? "Jl. Raya Pringgabaya No. 88";
  const postal_code = v.postal_code ?? "83654";
  const phone = v.phone ?? "";
  const dusun_list = w.dusun_list ?? [];

  _cache = {
    // Village identity
    name: village,
    village: w.village ?? village,
    district,
    regency,
    province,
    village_code,

    // Contact
    address,
    phone,
    whatsapp: v.whatsapp ?? "",
    email: v.email ?? "",
    postal_code,

    // Village officials
    head: v.head ?? "",
    head_title: `Kepala Desa ${w.village ?? village}`,
    secretary: v.secretary ?? "",

    // Kop surat derived
    kop_kabupaten: `PEMERINTAH KABUPATEN ${regency.toUpperCase()}`,
    kop_kecamatan: `KECAMATAN ${district.toUpperCase()}`,
    kop_desa: `DESA ${(w.village ?? village).toUpperCase()}`,
    kop_alamat: `${address}, ${w.village ?? village}, ${regency}, ${province} ${postal_code}`,
    kop_alamat_clean: `${address}, ${w.village ?? village}, ${regency}, ${postal_code}`,
    kop_telp:
      notif.sender_name !== DEFAULT_SETTINGS.notifications.sender_name
        ? notif.sender_name
        : phone
          ? `Telp. ${phone}`
          : "",

    // Notification
    sender_name: notif.sender_name || `Pemdes ${w.village ?? village}`,

    // Number/signature
    inisial_desa: nomor.inisialDesa,
    inisial_jabatan: nomor.inisialJabatan,
    qr_prefix:
      sig.qr_secret ||
      `${(w.village ?? village).toUpperCase().replace(/\s+/g, "-")}-${new Date().getFullYear()}`,

    // Location divisions
    dusun_list,

    // Stats
    penduduk_stat: content.stats[0]?.value ?? "0",
    luas_wilayah: content.stats[1]?.value ?? "0",
    potensi_wisata_stat: content.stats[2]?.value ?? "0",
    prestasi_stat: content.stats[3]?.value ?? "0",

    // Full address
    full_address: `${address}, ${w.village ?? village}, ${district}, ${regency} ${postal_code}`,
  };

  // If a field was requested, return just that field
  if (field) {
    const value = _cache[field as keyof VillageInfo];
    if (Array.isArray(value)) return value.join(", ");
    return value ?? "";
  }

  return _cache;
}

/**
 * Format village name for specific contexts.
 * Handles plural/singular and prefix variations.
 */
export function formatVillage(context: "name" | "pemdes" | "kantor" | "alamat"): string {
  const v = getVillage();
  switch (context) {
    case "name":
      return v.name;
    case "pemdes":
      return `Pemdes ${v.village}`;
    case "kantor":
      return `Kantor Desa ${v.village}`;
    case "alamat":
      return v.full_address;
    default:
      return v.name;
  }
}

/**
 * Get the full government hierarchy string.
 * Format: "DESA X, KECAMATAN Y, KABUPATEN Z"
 */
export function getGovernmentHierarchy(): string {
  const v = getVillage();
  return `${v.kop_desa}, ${v.kop_kecamatan}, ${v.kop_kabupaten}`;
}

/**
 * Check if current village is the default (Seruni Mumbul).
 * Useful for determining if wizard setup is needed.
 */
export function isDefaultVillage(): boolean {
  const v = getVillage();
  return (
    v.name === DEFAULT_SETTINGS.village.name &&
    v.district === DEFAULT_SETTINGS.wilayah.district &&
    v.regency === DEFAULT_SETTINGS.wilayah.regency
  );
}

/**
 * Get village initial (first letter) for logo.
 */
export function getVillageInitial(): string {
  return getVillage("village")[0] ?? getVillage("name")[0] ?? "D";
}
