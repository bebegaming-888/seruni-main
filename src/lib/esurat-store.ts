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

/** Riwayat perubahan status surat */
export type StatusHistoryEntry = {
  status: SuratStatus;
  timestamp: string;
  actor: string;
  catatan?: string;
};

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
  /** Jabatan pejabat yang menandatangani (Kepala Desa / Sekretaris Desa) */
  signer_title?: string;
  /** Payload untuk QR code verifikasi */
  qr_payload?: string;
  /** Foto selfie dengan KTP (base64 data URL atau storage path) */
  foto_selfie?: Lampiran;
  /** Array reason key dari alasan penolakan (REJECTION_REASONS indices) */
  rejection_reasons?: string[];
  /** Alasan penolakan custom dari field "Lainnya" */
  rejection_detail?: string;
  /** Riwayat koreksi warga — array of { timestamp, edited_by, correction_note } */
  edit_history?: EditHistoryEntry[];
  /** Riwayat perubahan status surat */
  status_history?: StatusHistoryEntry[];
  /** User yang terakhir mengubah record */
  updated_by?: string;
  created_at: string;
  updated_at?: string;
  /** Sync status dari operasi save terakhir. undefined = belum diketahui. */
  cloudSynced?: boolean;
  /** Turnstile CAPTCHA token — wajib divalidasi SEBELUM submission (termasuk offline queue) */
  captcha_token?: string;
};

/** Entry dalam edit_history tracking */
export type EditHistoryEntry = {
  timestamp: string;
  edited_by: string;
  correction_note: string;
  /** Snapshot fields yang diubah (optional) */
  changed_fields?: string[];
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
  invalidateStatsCache();
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
  invalidateStatsCache();
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
  invalidateStatsCache();
}

export function listArchive(): SuratRecord[] {
  return getLocalArchive();
}

export function getArchive(no: string): SuratRecord | null {
  return getLocalArchive().find((r) => r.no === no) ?? null;
}

/** Lookup penduduk — single source of truth from penduduk-store.
 * penduduk-store handles: Supabase → IndexedDB → PENDUDUK_MOCK fallback.
 * Always call initPendudukStore() first to ensure data is ready.
 */
export async function lookupPenduduk(nik: string): Promise<Penduduk | null> {
  const { initPendudukStore } = await import("@/lib/penduduk-store");
  await initPendudukStore();
  return getPendudukByNik(nik);
}

/** Smart search: cari warga berdasarkan NIK parsial atau nama.
 * Mengembalikan max 8 hasil. Selalu init penduduk store duluan.
 */
export async function searchWarga(query: string): Promise<Penduduk[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const { initPendudukStore, listPenduduk } = await import("@/lib/penduduk-store");
  await initPendudukStore();
  const all = listPenduduk();
  const q = query.toLowerCase().trim();
  const results = all
    .filter(
      (p) => p.nik.includes(q) || p.nama.toLowerCase().includes(q) || (p.no_kk ?? "").includes(q),
    )
    .slice(0, 8);
  return results;
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

// ── Memoized stats (invalidated on record mutations) ────────────────────────
// Tracks: records (active) + archive (finalized)
// _statsComputing guard prevents concurrent recompute from silently overwriting
// an in-flight invalidation (race between check and assignment).
let _statsCache: Record<SuratStatus, number> | null = null;
let _oldestCache: SuratRecord[] | null = null;
let _statsDirty = true;
let _statsComputing = false;

/** Invalidate stats cache — call this whenever records or archive change */
export function invalidateStatsCache() {
  _statsDirty = true;
  _statsCache = null;
  _oldestCache = null;
}

/**
 * Statistik ringkas per status (memoized).
 * Combines both active records AND archive to match admin dashboard totals.
 * - Active records: all 5 statuses tracked
 * - Archive: only "Disetujui" counted (finalized); "Ditolak" ignored for stats
 */
export function statsByStatus(): Record<SuratStatus, number> {
  if (!_statsDirty && _statsCache) return _statsCache;
  // Guard: if a recompute is already in-flight, return stale cache rather than
  // racing to overwrite it with an incomplete result.
  if (_statsComputing)
    return (
      _statsCache ?? {
        "Menunggu Verifikasi": 0,
        Diverifikasi: 0,
        "Menunggu Approval": 0,
        Disetujui: 0,
        Ditolak: 0,
      }
    );

  _statsComputing = true;
  try {
    const counts: Record<SuratStatus, number> = {
      "Menunggu Verifikasi": 0,
      Diverifikasi: 0,
      "Menunggu Approval": 0,
      Disetujui: 0,
      Ditolak: 0,
    };
    // Active records — count all statuses EXCEPT Disetujui (counted from archive)
    listRecords().forEach((r) => {
      if (r.status !== "Disetujui") {
        counts[r.status]++;
      }
    });
    // Archive — count only Disetujui (all Disetujui go to archive after signing)
    listArchive().forEach((r) => {
      if (r.status === "Disetujui") counts["Disetujui"]++;
    });
    _statsCache = counts;
    _statsDirty = false;
    return counts;
  } finally {
    _statsComputing = false;
  }
}

/**
 * Record yang paling lama belum diproses (memoized).
 * Includes both active records AND pending items from archive
 * (archive items that somehow weren't cleared — belt-and-suspenders).
 */
export function oldestPending(): SuratRecord[] {
  if (!_statsDirty && _oldestCache) return _oldestCache;
  if (_statsComputing) return _oldestCache ?? [];

  _statsComputing = true;
  try {
    const active = listRecords().filter((r) => r.status !== "Disetujui" && r.status !== "Ditolak");
    // Belt-and-suspenders: also check archive for any non-final records
    // (shouldn't happen in normal flow, but prevents stale pending items being hidden)
    const staleArchive = listArchive().filter(
      (r) => r.status !== "Disetujui" && r.status !== "Ditolak",
    );

    const combined = [...active, ...staleArchive].sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
    _oldestCache = combined;
    return combined;
  } finally {
    _statsComputing = false;
  }
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
