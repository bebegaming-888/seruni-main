// E-Surat records store — delegates to useSupabaseSync in-memory cache (IndexedDB).
// Supports full status workflow: Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak

import { type Penduduk } from "@/data/penduduk";
import {
  getLocalRecords,
  setLocalRecords,
  getLocalArchive,
  setLocalArchive,
} from "@/lib/useSupabaseSync";
import { getPendudukByNik } from "@/lib/penduduk-store";

export type SuratStatus =
  | "Menunggu Verifikasi"
  | "Diverifikasi"
  | "Menunggu Approval"
  | "Disetujui"
  | "Ditolak";

/** Lampiran: file yang diupload saat pengajuan surat */
export type Lampiran = {
  name: string;
  type: string;
  size: number;
  data_url?: string; // base64 data URL (optional if storage_path exists)
  storage_path?: string; // Supabase Storage path (preferred for large files)
};

export type SuratRecord = {
  no: string;
  /** Nomor tracking awal sebelum disetujui (untuk referensi) */
  tracking_no?: string;
  /** FK ke warga.id di Supabase — digunakan untuk relasi resmi pemohon */
  warga_id?: string;
  kode: string;
  nama_surat: string;
  pemohon: string;
  nik: string;
  kontak: string;
  data: Record<string, string>;
  attachments: Lampiran[];
  status: SuratStatus;
  catatan?: string;
  verified_at?: string;
  verified_by?: string;
  approved_at?: string;
  approved_by?: string;
  /** Waktu surat ditandatangani */
  signed_at?: string;
  /** Nama pejabat yang menandatangani */
  signed_by?: string;
  /** Payload untuk QR code verifikasi */
  qr_payload?: string;
  created_at: string;
  updated_at?: string;
  /** Sync status dari operasi save terakhir. undefined = belum diketahui. */
  cloudSynced?: boolean;
};

/* ---- Records CRUD (delegates to IndexedDB cache) ---- */
export function listRecords(): SuratRecord[] {
  return getLocalRecords();
}

export function saveRecord(r: SuratRecord) {
  const all = [...getLocalRecords()];
  const idx = all.findIndex((x) => x.no === r.no);
  if (idx >= 0) {
    all[idx] = { ...r, updated_at: new Date().toISOString() };
  } else {
    all.unshift(r);
  }
  setLocalRecords(all);
}

export function getRecord(no: string): SuratRecord | null {
  return getLocalRecords().find((r) => r.no === no) ?? null;
}

/**
 * Update status surat + timestamp.
 * Called by admin panel workflow actions.
 */
export function setStatus(no: string, status: SuratStatus, catatan?: string) {
  const all = [...getLocalRecords()];
  const idx = all.findIndex((r) => r.no === no);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    status,
    catatan: catatan ?? all[idx].catatan,
    updated_at: new Date().toISOString(),
  };
  setLocalRecords(all);
}

/** Pindahkan record ke arsip (setelah disetujui). */
export function archiveRecord(no: string) {
  const r = getRecord(no);
  if (!r) return;
  const arch = [...getLocalArchive()];
  arch.unshift(r);
  setLocalArchive(arch);
  // Hapus dari daftar aktif agar tidak muncul dua kali di UI
  setLocalRecords(getLocalRecords().filter((rec) => rec.no !== no));
}

export function listArchive(): SuratRecord[] {
  return getLocalArchive();
}

export function getArchive(no: string): SuratRecord | null {
  return getLocalArchive().find((r) => r.no === no) ?? null;
}

/** Lookup penduduk — single source of truth dari penduduk-store.
 * penduduk-store sudah menangani: Supabase → IndexedDB → PENDUDUK_MOCK fallback. */
export async function lookupPenduduk(nik: string): Promise<Penduduk | null> {
  return getPendudukByNik(nik);
}

/* ---- Status transition helpers ---- */

/** Apakah record boleh di-verify? */
export function canVerify(r: SuratRecord): boolean {
  return r.status === "Menunggu Verifikasi";
}

/** Apakah record boleh di-approve atau ditolak? */
export function canApproveReject(r: SuratRecord): boolean {
  return r.status === "Menunggu Approval";
}

/** Apakah record sudah selesai (disetujui atau ditolak)? */
export function isFinal(r: SuratRecord): boolean {
  return r.status === "Disetujui" || r.status === "Ditolak";
}

/** Apakah record masih aktif (belum diarsipkan)? */
export function isActive(r: SuratRecord): boolean {
  return listRecords().some((rec) => rec.no === r.no);
}

/** Statistik ringkas per status */
export function statsByStatus(): Record<SuratStatus, number> {
  const counts: Record<SuratStatus, number> = {
    "Menunggu Verifikasi": 0,
    Diverifikasi: 0,
    "Menunggu Approval": 0,
    Disetujui: 0,
    Ditolak: 0,
  };
  listRecords().forEach((r) => {
    counts[r.status]++;
  });
  return counts;
}

/** Record yang paling lama belum diproses */
export function oldestPending(): SuratRecord[] {
  return listRecords()
    .filter((r) => r.status !== "Disetujui" && r.status !== "Ditolak")
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/* ---- Smart Estimasi Durasi Pemrosesan ---- */

/** Estimasi jam pemrosesan per kode surat, di-cache 5 menit */
let _estimasi: Record<string, number> | null = null;
let _estimasiFetched = 0;
const ESTIMASI_TTL_MS = 5 * 60 * 1000;

function estimasiIsStale() {
  return !_estimasi || Date.now() - _estimasiFetched > ESTIMASI_TTL_MS;
}

/** Fetch estimasi dari edge function (dari cache server-side) */
export async function fetchEstimasi(): Promise<Record<string, number>> {
  if (!estimasiIsStale() && _estimasi) return _estimasi;

  try {
    const res = await fetch("/api/surat/estimasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Estimasi fetch failed");
    const json = (await res.json()) as { ok: boolean; estimasi: Record<string, number> };
    if (json.ok && json.estimasi) {
      _estimasi = json.estimasi;
      _estimasiFetched = Date.now();
    }
  } catch {
    // Non-fatal — estimasi tidak tersedia tidak break aplikasi
  }

  return _estimasi ?? {};
}

/** Format estimasi jam ke string human-readable */
export function fmtEstimasi(jam: number): string {
  if (jam < 1) return "< 1 jam";
  if (jam < 24) return `~${Math.round(jam)} jam kerja`;
  const hari = Math.floor(jam / 24);
  const sisaJam = Math.round(jam % 24);
  if (sisaJam === 0) return `~${hari} hari kerja`;
  return `~${hari} hari ${sisaJam} jam kerja`;
}
