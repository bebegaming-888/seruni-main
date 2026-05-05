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

/** Lampiran: file yang diupload saat pengajuan surat */
export type Lampiran = {
  name: string;
  type: string;
  size: number;
  data_url: string; // base64 data URL
};

export type SuratRecord = {
  no: string;
  /** Nomor tracking awal sebelum disetujui (untuk referensi) */
  tracking_no?: string;
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

/* ---- Penduduk (CSV imported → Supabase) ---- */
export function listPenduduk(): Penduduk[] {
  const stored = read<Penduduk[] | null>(PEND_KEY, null);
  return stored && stored.length ? stored : PENDUDUK_MOCK;
}

export function savePenduduk(items: Penduduk[]) {
  write(PEND_KEY, items);
}

/** Lookup penduduk — coba Supabase dulu, fallback ke localStorage/mock. */
export async function lookupPenduduk(nik: string): Promise<Penduduk | null> {
  if (isSupabaseConfigured) {
    try {
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb
          .from("warga")
          .select(
            "nik,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,agama,status_kawin,pekerjaan,kewarganegaraan,alamat,rt,rw,dusun,desa,kecamatan,kabupaten,provinsi,no_kk,no_hp",
          )
          .eq("nik", nik)
          .single();
        if (data) {
          return {
            nik: data.nik,
            nama: data.nama,
            tempat_lahir: data.tempat_lahir ?? "",
            tanggal_lahir: data.tanggal_lahir ? String(data.tanggal_lahir) : "",
            jenis_kelamin: (data.jenis_kelamin ?? "Laki-laki") as "Laki-laki" | "Perempuan",
            agama: data.agama ?? "",
            status_perkawinan: (data.status_kawin ??
              "Belum Kawin") as Penduduk["status_perkawinan"],
            pekerjaan: data.pekerjaan ?? "",
            kewarganegaraan: data.kewarganegaraan ?? "WNI",
            alamat: data.alamat ?? "",
            rt: data.rt ?? "",
            rw: data.rw ?? "",
            dusun: data.dusun ?? "",
            desa: data.desa ?? "Seruni Mumbul",
            kecamatan: data.kecamatan ?? "Pringgabaya",
            kabupaten: data.kabupaten ?? "Lombok Timur",
            provinsi: data.provinsi ?? "Nusa Tenggara Barat",
            no_kk: data.no_kk ?? "",
            no_hp: data.no_hp,
          };
        }
      }
    } catch {
      // fallback to localStorage/mock
    }
  }
  return lookupPendudukLocal(nik);
}

/** Sync localStorage penduduk data to Supabase (admin-only, called from settings). */
export async function syncPendudukToSupabase(items: Penduduk[]): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { getSupabase } = await import("./supabase");
    const sb = getSupabase();
    if (!sb) return;
    const rows = items.map((p) => ({
      nik: p.nik,
      nama: p.nama,
      tempat_lahir: p.tempat_lahir,
      tanggal_lahir: p.tanggal_lahir,
      jenis_kelamin: p.jenis_kelamin,
      agama: p.agama,
      status_kawin: p.status_perkawinan,
      pekerjaan: p.pekerjaan,
      kewarganegaraan: p.kewarganegaraan,
      alamat: p.alamat,
      rt: p.rt,
      rw: p.rw,
      dusun: p.dusun,
      desa: p.desa,
      kecamatan: p.kecamatan,
      kabupaten: p.kabupaten,
      provinsi: p.provinsi,
      no_kk: p.no_kk,
      no_hp: p.no_hp,
    }));
    await sb.from("warga").upsert(rows, { onConflict: "nik" });
  } catch {
    // non-blocking
  }
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
