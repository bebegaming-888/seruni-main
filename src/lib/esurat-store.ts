// E-Surat records store (localStorage).
// Backend will replace this with Supabase later.
// Supports full status workflow: Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak

import { type Penduduk, PENDUDUK_MOCK } from "@/data/penduduk";

const REC_KEY = "e_surat_records";
const PEND_KEY = "e_surat_penduduk";
const ARCH_KEY = "e_surat_archive";

export type SuratStatus =
  | "Menunggu Verifikasi"
  | "Diverifikasi"
  | "Menunggu Approval"
  | "Disetujui"
  | "Ditolak";

export type SuratRecord = {
  no: string;
  kode: string;
  nama_surat: string;
  pemohon: string;
  nik: string;
  kontak: string;
  data: Record<string, string>;
  status: SuratStatus;
  catatan?: string;
  /** Waktu surat ditandatangani */
  signed_at?: string;
  /** Nama pejabat yang menandatangani */
  signed_by?: string;
  /** Payload untuk QR code verifikasi */
  qr_payload?: string;
  created_at: string;
  updated_at?: string;
};

/* ---- helpers ---- */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---- Records CRUD ---- */
export function listRecords(): SuratRecord[] {
  return read<SuratRecord[]>(REC_KEY, []);
}

export function saveRecord(r: SuratRecord) {
  const all = listRecords();
  const idx = all.findIndex((x) => x.no === r.no);
  if (idx >= 0) {
    all[idx] = { ...r, updated_at: new Date().toISOString() };
  } else {
    all.unshift(r);
  }
  write(REC_KEY, all);
}

export function getRecord(no: string): SuratRecord | null {
  return listRecords().find((r) => r.no === no) ?? null;
}

/**
 * Update status surat + timestamp.
 * Called by admin panel workflow actions.
 */
export function setStatus(no: string, status: SuratStatus, catatan?: string) {
  const all = listRecords();
  const idx = all.findIndex((r) => r.no === no);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    status,
    catatan: catatan ?? all[idx].catatan,
    updated_at: new Date().toISOString(),
  };
  write(REC_KEY, all);
}

/** Pindahkan record ke arsip (setelah disetujui). */
export function archiveRecord(no: string) {
  const r = getRecord(no);
  if (!r) return;
  const arch = read<SuratRecord[]>(ARCH_KEY, []);
  arch.unshift(r);
  write(ARCH_KEY, arch);
}

export function listArchive(): SuratRecord[] {
  return read<SuratRecord[]>(ARCH_KEY, []);
}

export function getArchive(no: string): SuratRecord | null {
  return listArchive().find((r) => r.no === no) ?? null;
}

/* ---- Penduduk (CSV imported) ---- */
export function listPenduduk(): Penduduk[] {
  const stored = read<Penduduk[] | null>(PEND_KEY, null);
  return stored && stored.length ? stored : PENDUDUK_MOCK;
}

export function savePenduduk(items: Penduduk[]) {
  write(PEND_KEY, items);
}

export function lookupPendudukLocal(nik: string): Penduduk | null {
  const clean = nik.trim();
  return listPenduduk().find((p) => p.nik === clean) ?? null;
}

export function clearPenduduk() {
  if (typeof window !== "undefined") localStorage.removeItem(PEND_KEY);
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
