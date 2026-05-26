/**
 * src/types/wilayah.ts
 * Type definitions for WILAYAH (administrative area) data
 */

export type WilayahLevel = "provinsi" | "kabupaten" | "kecamatan" | "desa";

export interface WilayahData {
  // Common fields (all levels)
  ibukota?: string; // provinsi, kabupaten
  kode_pos_prefix?: string; // provinsi
  luas_km2?: number; // kecamatan, kabupaten

  // Desa-specific
  alamat?: string;
  telepon?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  kode_pos?: string;
  rt_rw?: string;
  dusun?: string;
  koordinat_lat?: string;
  koordinat_lng?: string;
  [key: string]: unknown;
}

export interface WilayahRecord {
  id: string;
  level: WilayahLevel;
  kode: string;
  nama: string;
  parent_kode: string | null;
  data: WilayahData | string;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string | null;
}

export interface CreateWilayahInput {
  level: WilayahLevel;
  kode: string;
  nama: string;
  parent_kode: string | null;
  data?: WilayahData;
  position?: number;
}

export interface UpdateWilayahInput {
  nama?: string;
  parent_kode?: string | null;
  data?: WilayahData;
  is_active?: boolean;
  position?: number;
}

// Flat view used in UI dropdowns
export interface WilayahFlat {
  id: string;
  level: WilayahLevel;
  kode: string;
  nama: string;
  parent_kode: string | null;
  parent_nama: string | null;
  data: WilayahData;
  is_active: boolean;
  position: number;
}
