/**
 * smart-import.ts — Smart penduduk data importer
 * Parses Excel/CSV files and normalizes column headers to DB field names.
 * Used by PendudukManager for batch import.
 */

import Papa from "papaparse";
import { normalizeNIK, normalizeJK, normalizeDate, normalizeNoHP } from "./utils";
import type { Penduduk } from "@/data/penduduk";

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
  nama: "nama",
  name: "nama",
  "nama lengkap": "nama",
  "tempat lahir": "tempat_lahir",
  ttl: "tempat_lahir",
  "tempat/tgl lahir": "tempat_lahir",
  "tanggal lahir": "tanggal_lahir",
  "tgl lahir": "tanggal_lahir",
  lahir: "tanggal_lahir",
  tanggal: "tanggal_lahir",
  "jenis kelamin": "jenis_kelamin",
  jk: "jenis_kelamin",
  gender: "jenis_kelamin",
  seks: "jenis_kelamin",
  agama: "agama",
  religion: "agama",
  "status nikah": "status_nikah",
  "status pernikahan": "status_nikah",
  kawin: "status_nikah",
  marital: "status_nikah",
  pendidikan: "pendidikan",
  education: "pendidikan",
  "pendidikan terakhir": "pendidikan",
  pekerjaan: "pekerjaan",
  job: "pekerjaan",
  occupation: "pekerjaan",
  kewarganegaraan: "kewarganegaraan",
  wna: "kewarganegaraan",
  wni: "kewarganegaraan",
  "alamat lengkap": "alamat",
  alamat: "alamat",
  address: "alamat",
  street: "alamat",
  rt: "rt",
  rw: "rw",
  dusun: "dusun",
  kampong: "dusun",
  village: "dusun",
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
};

export function resolveHeader(raw: string): string | null {
  const key = raw.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
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

export function normalizeNIK(v: string): string {
  return String(v ?? "")
    .replace(/[^\d]/g, "")
    .slice(0, 16);
}

export function normalizeJK(v: string): Penduduk["jenis_kelamin"] {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (["laki-laki", "laki", "l", "male", "man", "m"].includes(s)) return "Laki-laki";
  if (["perempuan", "wanita", "p", "female", "woman", "f"].includes(s)) return "Perempuan";
  return "Laki-laki";
}

export function normalizeAgama(v: string): string {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  const map: Record<string, string> = {
    islam: "Islam",
    kristen: "Kristen",
    protestan: "Kristen",
    khatolik: "Katolik",
    katolik: "Katolik",
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

export function normalizeDate(v: string): string {
  if (!v) return "";
  const s = String(v).trim();
  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    const d = new Date((num - 25569) * 86400 * 1000);
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
  return isNaN(pd.getTime()) ? "" : pd.toISOString().slice(0, 10);
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
  return new Promise((resolve, reject) => {
    const data: Penduduk[] = [];
    const errors: ImportResult["errors"] = [];

    Papa.parse<Record<string, string>>(file, {
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

export function normalizeRow(row: Record<string, string>): Penduduk | null {
  const raw = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));

  const nik = normalizeNIK(raw.nik ?? raw["nik"] ?? row["NIK"] ?? "");
  if (!nik || nik.length !== 16) return null;

  return {
    nik,
    nama: (row["Nama Lengkap"] ?? row["Nama"] ?? row["nama"] ?? "").trim(),
    tempat_lahir: (row["Tempat Lahir"] ?? row["ttl"] ?? "").trim(),
    tanggal_lahir: normalizeDate(row["Tanggal Lahir"] ?? row["tgl lahir"] ?? ""),
    jenis_kelamin: normalizeJK(row["Jenis Kelamin"] ?? row["jk"] ?? "Laki-laki"),
    agama: normalizeAgama(row["Agama"] ?? ""),
    status_nikah: normalizeStatus(row["Status Nikah"] ?? row["kawin"] ?? ""),
    pendidikan: (row["Pendidikan"] ?? row["pendidikan"] ?? "").trim(),
    pekerjaan: (row["Pekerjaan"] ?? row["pekerjaan"] ?? "").trim(),
    kewarganegaraan: (row["Kewarganegaraan"] ?? row["wna"] ?? "WNI").trim(),
    alamat: (row["Alamat"] ?? row["alamat"] ?? "").trim(),
    rt: (row["RT"] ?? row["rt"] ?? "").trim(),
    rw: (row["RW"] ?? row["rw"] ?? "").trim(),
    dusun: (row["Dusun"] ?? row["dusun"] ?? "").trim(),
    desa: (row["Desa"] ?? row["Kelurahan"] ?? "Seruni Mumbul").trim(),
    kecamatan: (row["Kecamatan"] ?? row["kecamatan"] ?? "Pringgabaya").trim(),
    kabupaten: (row["Kabupaten"] ?? row["Kabupaten/Kota"] ?? "Lombok Timur").trim(),
    provinsi: (row["Provinsi"] ?? row["provinsi"] ?? "Nusa Tenggara Barat").trim(),
    kode_pos: (row["Kode Pos"] ?? row["kode pos"] ?? "83653").trim(),
    telepon: normalizeNoHP(row["Telepon"] ?? row["hp"] ?? row["no hp"] ?? ""),
    hp: normalizeNoHP(row["HP"] ?? row["No HP"] ?? row["Nomor HP"] ?? ""),
    golongan_darah: (row["Golongan Darah"] ?? row["golda"] ?? "-").trim().toUpperCase(),
  };
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
