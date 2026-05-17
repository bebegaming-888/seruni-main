/**
 * smart-import.ts — Smart penduduk data importer
 * Parses Excel/CSV files and normalizes column headers to DB field names.
 * Used by PendudukManager for batch import.
 */

import type { Penduduk } from "@/data/penduduk";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings-store";

// Lazy access ke wilayah data — null jika belum di-init
let _w: ReturnType<typeof getSettings>["wilayah"] | null = null;
function _getWilayah() {
  if (!_w) {
    try {
      _w = getSettings().wilayah;
    } catch {
      _w = null;
    }
  }
  return _w;
}

// Fallback terakhir — only if both Supabase and IDB are unavailable.
// Import dari DEFAULT_SETTINGS agar selalu sinkron dengan konfigurasi admin.
const FALLBACK_DESA = DEFAULT_SETTINGS.wilayah.village;
const FALLBACK_KECAMATAN = DEFAULT_SETTINGS.wilayah.district;
const FALLBACK_KABUPATEN = DEFAULT_SETTINGS.wilayah.regency;
const FALLBACK_PROVINSI = DEFAULT_SETTINGS.wilayah.province;

// ── Column alias map ──────────────────────────────────────────────────────────

export const ALIASES: Record<string, string> = {
  nik: "nik",
  "nik номер": "nik",
  "nomor nik": "nik",
  "no. nik": "nik",
  "no nik": "nik",
  "nomor induk": "nik",
  "no. ktp": "nik",
  "no ktp": "nik",
  ktp: "nik",
  "no. kk": "no_kk",
  "no kk": "no_kk",
  "nomor kk": "no_kk",
  kk: "no_kk",
  "kartu keluarga": "no_kk",
  "nomor kartu keluarga": "no_kk",
  "kartu keluarga (kk)": "no_kk",
  "no. kk (nomor kartu keluarga)": "no_kk",
  nama: "nama",
  name: "nama",
  "nama lengkap": "nama",
  "nama wajib pajak": "nama",
  "nama penduduk": "nama",
  "tempat lahir": "tempat_lahir",
  ttl: "tempat_lahir",
  "tempat/tgl lahir": "tempat_lahir",
  "tempat / tgl lahir": "tempat_lahir",
  "tanggal lahir": "tanggal_lahir",
  "tgl lahir": "tanggal_lahir",
  lahir: "tanggal_lahir",
  tanggal: "tanggal_lahir",
  "jenis kelamin": "jenis_kelamin",
  jk: "jenis_kelamin",
  gender: "jenis_kelamin",
  seks: "jenis_kelamin",
  "l/p": "jenis_kelamin",
  "status dalam kk": "status_dalam_kk",
  "hubungan keluarga": "status_dalam_kk",
  hubungan: "status_dalam_kk",
  "status kk": "status_dalam_kk",
  agama: "agama",
  religion: "agama",
  "status nikah": "status_perkawinan",
  "status pernikahan": "status_perkawinan",
  kawin: "status_perkawinan",
  marital: "status_perkawinan",
  pendidikan: "pendidikan",
  education: "pendidikan",
  "pendidikan terakhir": "pendidikan",
  pekerjaan: "pekerjaan",
  job: "pekerjaan",
  occupation: "pekerjaan",
  pendapatan: "pendapatan_bulan",
  penghasilan: "pendapatan_bulan",
  gaji: "pendapatan_bulan",
  income: "pendapatan_bulan",
  kewarganegaraan: "kewarganegaraan",
  wna: "kewarganegaraan",
  wni: "kewarganegaraan",
  suku: "suku",
  bangsa: "suku",
  etnis: "suku",
  "alamat lengkap": "alamat",
  alamat: "alamat",
  address: "alamat",
  street: "alamat",
  rt: "rt",
  rw: "rw",
  dusun: "dusun",
  kampong: "dusun",
  village: "dusun",
  lingkungan: "dusun",
  wilayah: "dusun",
  "desa/kel": "desa",
  kelurahan: "desa",
  village_name: "desa",
  kecamatan: "kecamatan",
  district: "kecamatan",
  "kota/kabupaten": "kabupaten",
  kabupaten: "kabupaten",
  city: "kabupaten",
  "kabupaten/kota": "kabupaten",
  provinsi: "provinsi",
  province: "provinsi",
  "kode pos": "kode_pos",
  postcode: "kode_pos",
  telepon: "telepon",
  phone: "telepon",
  hp: "hp",
  "no hp": "hp",
  "nomor hp": "hp",
  mobile: "hp",
  "golongan darah": "golongan_darah",
  "gol. darah": "golongan_darah",
  "blood type": "golongan_darah",
  "milik rumah": "kepemilikan_rumah",
  "status rumah": "kepemilikan_rumah",
  "kepemilikan rumah": "kepemilikan_rumah",
  "luas rumah": "luas_rumah",
  "jumlah lantai": "jumlah_lantai",
  "jenis lantai": "jenis_lantai",
  "jenis dinding": "jenis_dinding",
  "jenis atap": "jenis_atap",
  "milik tanah": "kepemilikan_tanah",
  "status tanah": "kepemilikan_tanah",
  "kepemilikan tanah": "kepemilikan_tanah",
  "luas tanah": "luas_tanah",
  penerangan: "penerangan",
  listrik: "penerangan",
  "energi masak": "sumber_energi_masak",
  "bahan bakar masak": "sumber_energi_masak",
  masak: "sumber_energi_masak",
  mck: "mck",
  toilet: "mck",
  sanitasi: "mck",
  "sumber air": "sumber_air",
  "air bersih": "sumber_air",
  air: "sumber_air",
  bansos: "bantuan_sosial",
  "bantuan sosial": "bantuan_sosial",
  pkh: "bantuan_sosial",
  bpnt: "bantuan_sosial",
  "bantuan extra": "bantuan_extra",
  blt: "bantuan_extra",
  "bpjs kesehatan": "bpjs_kesehatan",
  kis: "bpjs_kesehatan",
  "bpjs ketenagakerjaan": "bpjs_ketenagakerjaan",
  jamsostek: "bpjs_ketenagakerjaan",
  aset: "kepemilikan_aset",
  "milik aset": "kepemilikan_aset",
  kendaraan: "kepemilikan_aset",
  "kondisi fisik": "kondisi_fisik",
  cacat: "kondisi_fisik",
  disabilitas: "kondisi_fisik",
  "nama ibu": "nama_ibu",
  ibu: "nama_ibu",
  "nama bapak": "nama_bapak",
  ayah: "nama_bapak",
  bapak: "nama_bapak",
  "nama kepala keluarga": "nama",
  "status kawin": "status_perkawinan",
  "pendapatan per bulan": "pendapatan_bulan",
  domisili: "alamat",
  goldar: "golongan_darah",
  shdk: "status_dalam_kk",
};

export function resolveHeader(raw: string): string | null {
  if (!raw) return null;
  // Clean header: lowercase, remove special chars, remove parentheses contents
  const key = raw
    .toLowerCase()
    .replace(/\(.*\)/g, "") // remove (anything)
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  return ALIASES[key] ?? null;
}

export function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const c = resolveHeader(h);
    if (c) map[h] = c;
  }
  return map;
}

// ── Value Normalizers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNIK(v: any): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();

  // Handle Excel scientific notation (e.g., 5.2030115019E15)
  // We use regex to try and reconstruct the digits if it looks like a standard NIK
  if (/^\d\.\d+E\+\d+$/i.test(s) || /^\d\.\d+E\d+$/i.test(s)) {
    try {
      // BigInt(Number(s)) is safer for large integers than just Number(s)
      // but if precision was ALREADY lost by Excel/XLSX parser, it stays lost.
      s = BigInt(Math.floor(Number(s))).toString();
    } catch {
      s = s.split(".")[0];
    }
  }

  // Strip decimals (.0 from Excel) and non-digits
  let cleaned = s.split(".")[0].replace(/[^\d]/g, "");

  // Pad 15-digit NIK with leading zero (Excel often strips leading zero)
  if (cleaned.length === 15) {
    cleaned = "0" + cleaned;
  }

  // NIK must be at least 16 digits for validation in normalizeRow,
  // but we return whatever we have here.
  return cleaned;
}

export function normalizeJK(v: string): Penduduk["jenis_kelamin"] {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (["laki-laki", "laki", "l", "male", "man", "m"].includes(s)) return "Laki-Laki";
  if (["perempuan", "wanita", "p", "female", "woman", "f"].includes(s)) return "Perempuan";
  return "Laki-Laki";
}

export function normalizeAgama(v: string): string {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  const map: Record<string, string> = {
    islam: "Islam",
    kristen: "Kristen",
    protestan: "Kristen",
    khatolik: "Katholik",
    katholik: "Katholik",
    katolik: "Katholik",
    hindu: "Hindu",
    buddha: "Buddha",
    budha: "Buddha",
    konghucu: "Konghucu",
  };
  return map[s] ?? s;
}

export function normalizeStatus(v: string): string {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (["belum kawin", "belum menikah", "single", "unmarried"].includes(s)) return "Belum Kawin";
  if (["kawin", "menikah", "married"].includes(s)) return "Kawin";
  if (["cerai", "divorce"].includes(s)) return "Cerai";
  if (["cerai hidup", "janda", "widow"].includes(s)) return "Cerai Hidup";
  if (["cerai mati", "duda"].includes(s)) return "Cerai Mati";
  return "Belum Kawin";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeDate(v: any): string {
  if (!v) return "";
  const s = String(v).trim();

  // Handle Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 25569 && num < 100000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

  const pd = new Date(s);
  if (!isNaN(pd.getTime())) return pd.toISOString().slice(0, 10);

  return "";
}

export function normalizeNoHP(v: string): string {
  let s = String(v ?? "").replace(/[^\d+]/g, "");
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s.startsWith("+62")) s = "0" + s.slice(3);
  return s;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export interface ImportResult {
  data: Penduduk[];
  errors: { row: number; message: string }[];
  skipped: number;
}

export async function parseFile(
  file: File,
  options?: { onProgress?: (pct: number) => void },
): Promise<ImportResult> {
  // Lazy-load papaparse only when file parsing is triggered
  const Papa = await import("papaparse");
  return new Promise((resolve, reject) => {
    const data: Penduduk[] = [];
    const errors: ImportResult["errors"] = [];

    Papa.default.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      step: (results, parser) => {
        const row = results.data;
        if (!row || Object.keys(row).length === 0) return;

        try {
          const penduduk = normalizeRow(row);
          if (penduduk) {
            data.push(penduduk);
          } else {
            errors.push({
              row: data.length + errors.length + 1,
              message: "NIK kosong atau tidak valid",
            });
          }
        } catch (e) {
          errors.push({ row: data.length + errors.length + 1, message: String(e) });
        }

        // Report progress based on cursor
        if (options?.onProgress && results.meta.cursor !== undefined) {
          // Approximate progress
          options.onProgress(Math.min(95, (results.meta.cursor / file.size) * 100));
        }
      },
      complete: () => {
        options?.onProgress?.(100);
        resolve({ data, errors, skipped: 0 });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Resolves a field value from a row using the ALIASES mapping system.
 * This ensures that various header names (e.g., "Nama", "Name", "NAMA LENGKAP")
 * all map correctly to the standard internal fields.
 */
function resolveValue(
  row: Record<string, unknown>,
  targetField: string,
  defaultValue: string = "",
): string {
  // 1. Try exact match in row keys first (case sensitive)
  if (row[targetField] !== undefined && row[targetField] !== "")
    return String(row[targetField]).trim();

  // 2. Try case-insensitive exact matches from ALIASES
  const normalizedRow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[k.toLowerCase().trim()] = v;
  }

  // Find all aliases that map to this targetField
  const validAliases = Object.entries(ALIASES)
    .filter(([_, field]) => field === targetField)
    .map(([alias]) => alias.toLowerCase().trim());

  for (const alias of validAliases) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== "") {
      return String(normalizedRow[alias]).trim();
    }
  }

  // 3. Fuzzy search in row keys
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const resolved = resolveHeader(key);
    if (resolved === targetField && row[key] !== "") {
      return String(row[key]).trim();
    }
  }

  return defaultValue;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRow(row: Record<string, any>): Penduduk | null {
  const rawNIK = resolveValue(row, "nik");
  const nik = normalizeNIK(rawNIK);

  if (!nik) {
    throw new Error("NIK tidak ditemukan atau kosong");
  }

  if (nik.length < 16) {
    throw new Error(`NIK terlalu pendek (${nik.length} digit). Harus 16 digit.`);
  }

  const nama = resolveValue(row, "nama");
  if (!nama) {
    throw new Error(`Nama tidak ditemukan untuk NIK ${nik}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = {
    nik: nik.slice(0, 16),
    nama,
    no_kk: normalizeNIK(resolveValue(row, "no_kk")),
    status_dalam_kk: resolveValue(row, "status_dalam_kk", "Anggota Keluarga"),
    tempat_lahir: resolveValue(row, "tempat_lahir"),
    tanggal_lahir: normalizeDate(resolveValue(row, "tanggal_lahir")),
    jenis_kelamin: normalizeJK(resolveValue(row, "jenis_kelamin")),
    agama: normalizeAgama(resolveValue(row, "agama")),
    status_perkawinan: normalizeStatus(resolveValue(row, "status_perkawinan")),
    pendidikan: resolveValue(row, "pendidikan"),
    pekerjaan: resolveValue(row, "pekerjaan"),
    pendapatan_bulan: resolveValue(row, "pendapatan_bulan", "0"),
    kewarganegaraan: resolveValue(row, "kewarganegaraan", "Indonesia"),
    suku: resolveValue(row, "suku", "Sasak"),
    alamat: resolveValue(row, "alamat"),
    rt: resolveValue(row, "rt"),
    rw: resolveValue(row, "rw"),
    dusun: resolveValue(row, "dusun"),
    desa: resolveValue(row, "desa", _getWilayah()?.village ?? FALLBACK_DESA),
    kecamatan: resolveValue(row, "kecamatan", _getWilayah()?.district ?? FALLBACK_KECAMATAN),
    kabupaten: resolveValue(row, "kabupaten", _getWilayah()?.regency ?? FALLBACK_KABUPATEN),
    provinsi: resolveValue(row, "provinsi", _getWilayah()?.province ?? FALLBACK_PROVINSI),
    no_hp: normalizeNoHP(resolveValue(row, "hp") || resolveValue(row, "telepon")),
    golongan_darah: resolveValue(row, "golongan_darah", "Tidak Diketahui").toUpperCase(),
    kepemilikan_rumah: resolveValue(row, "kepemilikan_rumah", "-"),
    luas_rumah: resolveValue(row, "luas_rumah", "-"),
    jumlah_lantai: resolveValue(row, "jumlah_lantai", "-"),
    jenis_lantai: resolveValue(row, "jenis_lantai", "-"),
    jenis_dinding: resolveValue(row, "jenis_dinding", "-"),
    jenis_atap: resolveValue(row, "jenis_atap", "-"),
    kepemilikan_tanah: resolveValue(row, "kepemilikan_tanah", "-"),
    luas_tanah: resolveValue(row, "luas_tanah", "-"),
    penerangan: resolveValue(row, "penerangan", "-"),
    sumber_energi_masak: resolveValue(row, "sumber_energi_masak", "-"),
    mck: resolveValue(row, "mck", "-"),
    sumber_air: resolveValue(row, "sumber_air", "-"),
    bantuan_sosial: resolveValue(row, "bantuan_sosial", "Tidak"),
    bantuan_extra: resolveValue(row, "bantuan_extra", "Tidak"),
    bpjs_kesehatan: resolveValue(row, "bpjs_kesehatan", "Tidak"),
    bpjs_ketenagakerjaan: resolveValue(row, "bpjs_ketenagakerjaan", "Tidak"),
    kepemilikan_aset: resolveValue(row, "kepemilikan_aset", "Tidak"),
    kondisi_fisik: resolveValue(row, "kondisi_fisik", "Normal"),
    nama_ibu: resolveValue(row, "nama_ibu"),
    nama_bapak: resolveValue(row, "nama_bapak"),
  };

  return p as Penduduk;
}

// ── Smart Import for penduduk-store ─────────────────────────────────────────

export interface SmartImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function processSmartImport(
  rawRows: Record<string, string>[],
  existingMap: Map<string, Penduduk>,
): { map: Map<string, Penduduk>; result: SmartImportResult } {
  const map = new Map(existingMap);
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    try {
      const p = normalizeRow(row);
      if (!p) {
        skipped++;
        continue;
      }
      const existing = map.get(p.nik);
      if (existing) {
        map.set(p.nik, { ...existing, ...p });
        updated++;
      } else {
        map.set(p.nik, p);
        added++;
      }
    } catch (e) {
      errors.push({ row: i + 1, message: String(e) });
    }
  }

  return {
    map,
    result: { added, updated, skipped, errors },
  };
}
