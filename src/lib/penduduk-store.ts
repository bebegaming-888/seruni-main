// Penduduk Store — IndexedDB storage (kapasitas >10.000 record)
// In-memory cache untuk read sinkron; IndexedDB untuk persistensi async.

import { type Penduduk, PENDUDUK_MOCK } from "@/data/penduduk";
import * as XLSX from "xlsx";
import { processSmartImport, type SmartImportResult } from "@/lib/smart-import";
export type { SmartImportResult } from "@/lib/smart-import";
import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";

// Flag kecil di localStorage: "active" = sudah ada data nyata, "mock" / null = belum
const STATE_KEY = "penduduk_db_state";

// ── In-Memory Cache ───────────────────────────────────────────────────────────
let _mem: Penduduk[] | null = null; // null = pakai mock
let _isActive = false; // true = data nyata (bisa [] setelah purge)

// ── IndexedDB via central engine ─────────────────────────────────────────────
const dbGetAll = () => idbGetAll<Penduduk>("penduduk");
const dbPutOne = (p: Penduduk) => idbPut("penduduk", p);
const dbDeleteOne = (nik: string) => idbDelete("penduduk", nik);
const dbReplaceAll = (data: Penduduk[]) => idbReplaceAll("penduduk", data);

// ── Helper internal ───────────────────────────────────────────────────────────
function setActive(data: Penduduk[]) {
  _mem = data;
  _isActive = true;
  try {
    localStorage.setItem(STATE_KEY, "active");
  } catch {
    /* ignore */
  }
}

function baseData(): Penduduk[] {
  // Jika belum ada data nyata, seed dari mock (agar tidak kehilangan data awal)
  return _isActive ? (_mem ?? []) : [...PENDUDUK_MOCK];
}

// ── Initialization — panggil SEKALI saat app mount ────────────────────────────
export async function initPendudukStore(): Promise<void> {
  if (typeof window === "undefined") return;
  const state = localStorage.getItem(STATE_KEY);
  if (!state || state === "mock") {
    _mem = null;
    _isActive = false;
    return;
  }
  try {
    const data = await dbGetAll();
    setActive(data); // bisa [] jika sudah di-purge
  } catch (e) {
    console.error("[penduduk-store] IndexedDB gagal, fallback ke mock:", e);
    _mem = null;
    _isActive = false;
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────
export function listPenduduk(): Penduduk[] {
  if (!_isActive || _mem === null) return PENDUDUK_MOCK;
  return _mem;
}

export function isUsingMock(): boolean {
  return !_isActive;
}

export function getPendudukByNik(nik: string): Penduduk | null {
  return listPenduduk().find((p) => p.nik === nik.trim()) ?? null;
}

// ── Create ────────────────────────────────────────────────────────────────────
export function addPenduduk(p: Penduduk): { ok: boolean; message: string } {
  if (!/^\d{16}$/.test(p.nik)) return { ok: false, message: "NIK harus 16 digit angka" };
  const base = baseData();
  if (base.some((x) => x.nik === p.nik)) return { ok: false, message: "NIK sudah terdaftar" };
  setActive([p, ...base]);
  dbPutOne(p).catch(console.error);
  return { ok: true, message: "Data berhasil ditambahkan" };
}

// ── Update ────────────────────────────────────────────────────────────────────
export function updatePenduduk(p: Penduduk): { ok: boolean; message: string } {
  const base = baseData();
  const idx = base.findIndex((x) => x.nik === p.nik);
  if (idx < 0) return { ok: false, message: "NIK tidak ditemukan" };
  const next = [...base];
  next[idx] = p;
  setActive(next);
  dbPutOne(p).catch(console.error);
  return { ok: true, message: "Data berhasil diperbarui" };
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function deletePenduduk(nik: string): { ok: boolean; message: string } {
  const base = baseData();
  const filtered = base.filter((p) => p.nik !== nik);
  if (filtered.length === base.length) return { ok: false, message: "NIK tidak ditemukan" };
  setActive(filtered);
  dbDeleteOne(nik).catch(console.error);
  return { ok: true, message: "Data berhasil dihapus" };
}

// ── Purge All (Super Admin) ───────────────────────────────────────────────────
export function purgeAllPenduduk(): void {
  setActive([]);
  dbReplaceAll([]).catch(console.error);
}

// ── Smart Import ──────────────────────────────────────────────────────────────
export function importPenduduk(rawRows: Record<string, string>[]): SmartImportResult {
  const existing = listPenduduk();
  const existingMap = new Map(existing.map((p) => [p.nik, p]));
  const { map, result } = processSmartImport(rawRows, existingMap);
  const allData = Array.from(map.values());
  setActive(allData); // update UI langsung (sync)
  dbReplaceAll(allData).catch(console.error); // simpan ke IndexedDB (async)
  return result;
}

// ── Export CSV ────────────────────────────────────────────────────────────────
// Urutan kolom mengikuti Tabel_Penduduk.xlsx
const CSV_HEADERS = [
  "provinsi",
  "kabupaten",
  "kecamatan",
  "desa",
  "dusun",
  "rt",
  "nama",
  "jenis_kelamin",
  "status_dalam_kk",
  "no_kk",
  "nik",
  "status_perkawinan",
  "tempat_lahir",
  "tanggal_lahir",
  "pendidikan",
  "pekerjaan",
  "pendapatan_bulan",
  "kewarganegaraan",
  "agama",
  "suku",
  "kepemilikan_rumah",
  "luas_rumah",
  "jumlah_lantai",
  "jenis_lantai",
  "jenis_dinding",
  "jenis_atap",
  "kepemilikan_tanah",
  "luas_tanah",
  "penerangan",
  "sumber_energi_masak",
  "mck",
  "sumber_air",
  "bantuan_sosial",
  "bantuan_extra",
  "bpjs_kesehatan",
  "bpjs_ketenagakerjaan",
  "kepemilikan_aset",
  "kondisi_fisik",
  "nama_ibu",
  "nama_bapak",
  "golongan_darah",
  // opsional
  "rw",
  "no_hp",
  "alamat",
];

function toCSVRow(row: Record<string, string>): string {
  return CSV_HEADERS.map((h) => {
    const v = row[h] ?? "";
    return v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  }).join(",");
}

export function exportPendudukCSV(items?: Penduduk[]): void {
  const data = items ?? listPenduduk();
  const lines = [
    CSV_HEADERS.join(","),
    ...data.map((p) => toCSVRow(p as unknown as Record<string, string>)),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `penduduk-seruni-mumbul-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPendudukTemplate(): void {
  const blob = new Blob([CSV_HEADERS.join(",") + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-import-penduduk.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPendudukXLSX(items?: Penduduk[]): void {
  const data = items ?? listPenduduk();
  const rows = data.map((p) =>
    CSV_HEADERS.reduce(
      (acc, h) => ({ ...acc, [h]: (p as unknown as Record<string, string>)[h] ?? "" }),
      {} as Record<string, string>,
    ),
  );
  const ws = XLSX.utils.json_to_sheet(rows, { header: CSV_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Penduduk");
  XLSX.writeFile(wb, `penduduk-seruni-mumbul-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Statistik ─────────────────────────────────────────────────────────────────
export type StatistikPenduduk = {
  total: number;
  total_kk: number;
  laki: number;
  perempuan: number;
  dependency_ratio: number;
  per_dusun: Record<string, number>;
  per_agama: Record<string, number>;
  per_pekerjaan: Record<string, number>;
  per_pendidikan: Record<string, number>;
  per_status_kawin: Record<string, number>;
  kelompok_umur: { label: string; laki: number; perempuan: number }[];
  is_mock: boolean;
};

export function hitungUmur(tanggalLahir: string): number {
  if (!tanggalLahir) return 0;
  const lahir = new Date(tanggalLahir);
  if (isNaN(lahir.getTime())) return 0;
  const today = new Date();
  let umur = today.getFullYear() - lahir.getFullYear();
  const m = today.getMonth() - lahir.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < lahir.getDate())) umur--;
  return Math.max(0, umur);
}

export function hitungUmurLabel(tanggalLahir: string): string {
  const u = hitungUmur(tanggalLahir);
  return u === 0 && !tanggalLahir ? "-" : `${u} th`;
}

export function kelompokUmurLabel(tanggalLahir: string): string {
  const u = hitungUmur(tanggalLahir);
  if (u <= 14) return "Anak (0-14)";
  if (u <= 64) return "Produktif (15-64)";
  return "Lansia (65+)";
}

export function maskNama(nama: string): string {
  const parts = nama.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2) + "***";
  return (
    parts[0] +
    " " +
    parts
      .slice(1)
      .map((p) => p[0] + ".")
      .join(" ")
  );
}

const KELOMPOK = [
  { label: "0–4", min: 0, max: 4 },
  { label: "5–9", min: 5, max: 9 },
  { label: "10–14", min: 10, max: 14 },
  { label: "15–19", min: 15, max: 19 },
  { label: "20–24", min: 20, max: 24 },
  { label: "25–29", min: 25, max: 29 },
  { label: "30–34", min: 30, max: 34 },
  { label: "35–39", min: 35, max: 39 },
  { label: "40–44", min: 40, max: 44 },
  { label: "45–49", min: 45, max: 49 },
  { label: "50–54", min: 50, max: 54 },
  { label: "55–59", min: 55, max: 59 },
  { label: "60–64", min: 60, max: 64 },
  { label: "65+", min: 65, max: 999 },
];

export function getStatistik(): StatistikPenduduk {
  const data = listPenduduk();
  const isMock = isUsingMock();
  const stat: StatistikPenduduk = {
    total: data.length,
    total_kk: new Set(data.map((p) => p.no_kk).filter(Boolean)).size,
    laki: 0,
    perempuan: 0,
    dependency_ratio: 0,
    per_dusun: {},
    per_agama: {},
    per_pekerjaan: {},
    per_pendidikan: {},
    per_status_kawin: {},
    kelompok_umur: KELOMPOK.map((k) => ({ label: k.label, laki: 0, perempuan: 0 })),
    is_mock: isMock,
  };
  let produktif = 0,
    nonproduktif = 0;
  for (const p of data) {
    if (p.jenis_kelamin === "Laki-Laki") stat.laki++;
    else stat.perempuan++;
    const d = p.dusun || "Tidak Diketahui";
    stat.per_dusun[d] = (stat.per_dusun[d] ?? 0) + 1;
    const ag = p.agama || "Lainnya";
    stat.per_agama[ag] = (stat.per_agama[ag] ?? 0) + 1;
    const pek = p.pekerjaan || "Tidak Diketahui";
    stat.per_pekerjaan[pek] = (stat.per_pekerjaan[pek] ?? 0) + 1;
    const pend = p.pendidikan || "Tidak Diketahui";
    stat.per_pendidikan[pend] = (stat.per_pendidikan[pend] ?? 0) + 1;
    const sk = p.status_perkawinan || "Tidak Diketahui";
    stat.per_status_kawin[sk] = (stat.per_status_kawin[sk] ?? 0) + 1;
    const umur = hitungUmur(p.tanggal_lahir);
    const grp = KELOMPOK.findIndex((k) => umur >= k.min && umur <= k.max);
    if (grp >= 0) {
      if (p.jenis_kelamin === "Laki-Laki") stat.kelompok_umur[grp].laki++;
      else stat.kelompok_umur[grp].perempuan++;
    }
    if (umur >= 15 && umur <= 64) produktif++;
    else nonproduktif++;
  }
  stat.dependency_ratio = produktif > 0 ? Math.round((nonproduktif / produktif) * 100) : 0;
  return stat;
}
