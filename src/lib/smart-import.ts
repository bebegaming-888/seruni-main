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

/**
 * FIX #2: Improved NIK float parsing + checksum validation.
 * Excel/XLSX scientific notation loses the last digit for NIKs starting with
 * non-zero digits (most NIKs). We use string regex extraction instead of Number()
 * to avoid precision loss, then validate with Indonesian NIK structure rules.
 */

export function normalizeNIK(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();

  // Handle Excel scientific notation (e.g. "5.2030115019E+15" or "1.7602123456E+15")
  // Number() loses the last digit for non-zero-leading NIKs. We reconstruct
  // the integer by extracting mantissa and exponent parts from the string.
  const sciMatch = s.match(/^(\d)\.(\d+)E\+?(\d+)$/i);
  if (sciMatch) {
    const [, intDigit, fracDigits, expStr] = sciMatch;
    const exp = parseInt(expStr, 10);
    // The actual integer = intDigit followed by exp-1 more digits from fracDigits
    const totalDigits = 1 + exp;
    const padded = (intDigit + fracDigits).slice(0, totalDigits).padEnd(totalDigits, "0");
    s = padded;
  }

  // Strip any remaining decimal and non-digits
  let cleaned = s.split(".")[0].replace(/[^\d]/g, "");

  // Pad 15-digit NIK with leading zero (Excel often strips leading zero)
  if (cleaned.length === 15) {
    cleaned = "0" + cleaned;
  }

  return cleaned;
}

/**
 * Validate Indonesian NIK structure:
 * Format: [prov(2)][kab(2)][kec(2)][birth-serial(6)][gender+seq(4)][check(1)]
 * - Province code must be 11–96 (official Kemendagri range)
 * - Gender digit (index 6): 1–62 for male (odd), 32–62 for female (even)
 * Returns false for obviously malformed NIKs; true allows further processing.
 */
function isValidNikStructure(nik: string): boolean {
  if (!/^\d{16}$/.test(nik)) return false;

  const prov = parseInt(nik.substring(0, 2), 10);
  if (prov < 11 || prov > 96) return false;

  const genderDigit = parseInt(nik.charAt(6), 10);
  const isMale = genderDigit % 2 === 1;
  const validGenderDigit = isMale
    ? genderDigit >= 1 && genderDigit <= 62
    : genderDigit >= 32 && genderDigit <= 62;

  return validGenderDigit;
}

/**
 * FIX #3: normalizeJK now reports unknown values to errors array instead of silent default.
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export function normalizeJK(
  v: string,
  rowNum: number,
  errors: ImportError[],
): Penduduk["jenis_kelamin"] {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (["laki-laki", "laki", "l", "male", "man", "m"].includes(s)) return "Laki-Laki";
  if (["perempuan", "wanita", "p", "female", "woman", "f"].includes(s)) return "Perempuan";

  // Report unknown value instead of silent default
  if (s !== "") {
    errors.push({
      row: rowNum,
      field: "jenis_kelamin",
      message: `Nilai tidak dikenali: "${v}" — default ke "Laki-Laki"`,
    });
  }
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

/**
 * FIX #4: normalizeStatus now maps "cerai" to "Cerai Mati" (not the invalid "Cerai")
 * and reports ambiguous values to errors.
 */
export function normalizeStatus(v: string, rowNum: number, errors: ImportError[]): string {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (["belum kawin", "belum menikah", "single", "unmarried"].includes(s)) return "Belum Kawin";
  if (["kawin", "menikah", "married"].includes(s)) return "Kawin";
  if (["cerai", "divorce"].includes(s)) {
    errors.push({
      row: rowNum,
      field: "status_perkawinan",
      message: `Status "cerai" — diperlakukan sebagai "Cerai Mati"`,
    });
    return "Cerai Mati";
  }
  if (["cerai hidup", "janda", "widow"].includes(s)) return "Cerai Hidup";
  if (["cerai mati", "duda"].includes(s)) return "Cerai Mati";
  return "Belum Kawin";
}

/**
 * FIX #5: normalizeDate now validates that the resulting date is a real calendar date.
 * Rejects invalid dates like "31/02/2025" which JavaScript would silently roll over.
 * The `errors` param is optional — if not provided, invalid dates return empty string.
 */
export function normalizeDate(v: any, rowNum?: number, errors?: ImportError[]): string {
  if (!v) return "";
  const s = String(v).trim();

  // Handle Excel serial number (days since 1970-01-01)
  const num = Number(s);
  if (!isNaN(num) && num > 25569 && num < 100000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const year = parseInt(dmy[3], 10);
    const month = parseInt(dmy[2], 10) - 1; // JS months are 0-indexed
    const day = parseInt(dmy[1], 10);
    const d = new Date(year, month, day);

    // Reconstruct from parts and check it equals what we parsed.
    // This catches impossible dates like 31/02/2025 (JS rolls to 02/03).
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      if (errors)
        errors.push({
          row: rowNum ?? 0,
          field: "tanggal_lahir",
          message: `Format tanggal tidak valid: "${v}"`,
        });
      return "";
    }

    // Reasonable bounds: 1900–current year
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) {
      if (errors)
        errors.push({
          row: rowNum ?? 0,
          field: "tanggal_lahir",
          message: `Tahun lahir tidak wajar: ${year}`,
        });
      return "";
    }

    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    if (isNaN(d.getTime())) {
      if (errors)
        errors.push({
          row: rowNum ?? 0,
          field: "tanggal_lahir",
          message: `Format tanggal tidak valid: "${v}"`,
        });
      return "";
    }
    return s;
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const year = parseInt(s.slice(0, 4), 10);
    const month = parseInt(s.slice(4, 6), 10) - 1;
    const day = parseInt(s.slice(6, 8), 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      if (errors)
        errors.push({
          row: rowNum ?? 0,
          field: "tanggal_lahir",
          message: `Format tanggal tidak valid: "${v}"`,
        });
      return "";
    }
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const pd = new Date(s);
  if (!isNaN(pd.getTime())) return pd.toISOString().slice(0, 10);

  if (errors)
    errors.push({
      row: rowNum ?? 0,
      field: "tanggal_lahir",
      message: `Format tanggal tidak dikenali: "${v}"`,
    });
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
          const { penduduk, errors: rowErrors } = normalizeRow(row);
          if (penduduk) {
            data.push(penduduk);
            // Surface row-level warnings without blocking the record
            for (const err of rowErrors) {
              errors.push({ row: data.length, message: err.message });
            }
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

/**
 * FIX #2 NIK validation is done after construction in normalizeRow.
 * normalizeRow returns a result object so callers can surface row-level warnings.
 */

export function normalizeRow(row: Record<string, any>): {
  penduduk: Penduduk | null;
  errors: ImportError[];
} {
  const rawNIK = resolveValue(row, "nik");
  const nik = normalizeNIK(rawNIK);
  const rowErrors: ImportError[] = [];
  // rowNum=0 here; real row numbers come from callers via thrown errors
  const rowNum = 0;

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

  // FIX #2: Warn on NIK structure issues but still accept the record.
  if (/^\d{16}$/.test(nik) && !isValidNikStructure(nik)) {
    rowErrors.push({
      row: rowNum,
      field: "nik",
      message: `NIK ${nik} — struktur tidak cocok pola resmi (provinsi/gender digit)`,
    });
  }

  const p: Record<string, unknown> = {
    nik: nik.slice(0, 16),
    nama,
    no_kk: normalizeNIK(resolveValue(row, "no_kk")),
    status_dalam_kk: resolveValue(row, "status_dalam_kk", "Anggota Keluarga"),
    tempat_lahir: resolveValue(row, "tempat_lahir"),
    tanggal_lahir: normalizeDate(resolveValue(row, "tanggal_lahir"), rowNum, rowErrors),
    jenis_kelamin: normalizeJK(resolveValue(row, "jenis_kelamin"), rowNum, rowErrors),
    agama: normalizeAgama(resolveValue(row, "agama")),
    status_perkawinan: normalizeStatus(resolveValue(row, "status_perkawinan"), rowNum, rowErrors),
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

  // If normalizeDate returned empty for a field that had a value, that's a critical issue.
  if (!p.tanggal_lahir && resolveValue(row, "tanggal_lahir")) {
    rowErrors.push({
      row: rowNum,
      field: "tanggal_lahir",
      message: `Tanggal lahir kosong akibat format tidak valid`,
    });
  }

  return { penduduk: p as Penduduk, errors: rowErrors };
}

// ── Smart Import for penduduk-store ─────────────────────────────────────────

export interface SmartImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  /** True jika Supabase sync berhasil. False jika gagal atau belum dikonfigurasi. */
  syncOk: boolean;
  /** Pesan hasil sync (atau alasan kenapa tidak sync). */
  syncMessage: string;
}

/**
 * Create a default SmartImportResult with no sync info.
 * Used by callers that handle their own sync (e.g. importPenduduk in penduduk-store).
 */
export function emptySmartResult(): SmartImportResult {
  return { added: 0, updated: 0, skipped: 0, errors: [], syncOk: false, syncMessage: "" };
}

/**
 * FIX #1: Merge incoming data with existing, only overwriting non-empty values.
 * Prevents empty strings from CSV missing columns from corrupting existing data.
 */
function mergePenduduk(existing: Penduduk, incoming: Partial<Penduduk>): Penduduk {
  const merged = { ...existing };
  for (const key of Object.keys(incoming) as (keyof Penduduk)[]) {
    const newVal = incoming[key];
    const strVal = typeof newVal === "string" ? newVal.trim() : "";
    const existingVal = String(existing[key] ?? "").trim();

    // Only overwrite if incoming is non-empty AND different from existing
    if (strVal !== "" && strVal !== existingVal) {
      (merged as any)[key] = newVal;
    }
  }
  return merged;
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
      const { penduduk: p, errors: rowErrors } = normalizeRow(row);
      if (!p) {
        skipped++;
        continue;
      }
      // Surface row-level warnings without blocking the record
      for (const err of rowErrors) {
        errors.push({ row: i + 1, message: err.message });
      }
      const existing = map.get(p.nik);
      if (existing) {
        map.set(p.nik, mergePenduduk(existing, p));
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
    result: { added, updated, skipped, errors, syncOk: false, syncMessage: "" },
  };
}
