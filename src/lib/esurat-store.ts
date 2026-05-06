// E-Surat records store — delegates to useSupabaseSync in-memory cache (IndexedDB).
// Supports full status workflow: Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak

import { type Penduduk, PENDUDUK_MOCK } from "@/data/penduduk";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  listPenduduk as _listPenduduk,
  importPenduduk as _importPenduduk,
} from "@/lib/penduduk-store";
import {
  getLocalRecords,
  setLocalRecords,
  getLocalArchive,
  setLocalArchive,
} from "@/lib/useSupabaseSync";

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

/* ---- Penduduk (delegates to penduduk-store) ---- */
export function listPenduduk(): Penduduk[] {
  return _listPenduduk();
}

export function savePenduduk(items: Penduduk[]) {
  _importPenduduk(items);
}

/** Fallback lookup dari localStorage/mock — dipanggil bila Supabase tidak tersedia. */
function lookupPendudukLocal(nik: string): Penduduk | null {
  return PENDUDUK_MOCK.find((p) => p.nik === nik) ?? null;
}

/** Lookup penduduk — coba Supabase dulu, fallback ke localStorage/mock. */
export async function lookupPenduduk(nik: string): Promise<Penduduk | null> {
  if (isSupabaseConfigured) {
    try {
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from("warga").select("*").eq("nik", nik).single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any;
        if (d) {
          return {
            // ── lokasi
            provinsi: d.provinsi ?? "Nusa Tenggara Barat",
            kabupaten: d.kabupaten ?? "Lombok Timur",
            kecamatan: d.kecamatan ?? "Pringgabaya",
            desa: d.desa ?? "Seruni Mumbul",
            dusun: d.dusun ?? "",
            rt: d.rt ?? "",
            rw: d.rw ?? "",
            // ── identitas
            nama: d.nama ?? "",
            jenis_kelamin: (d.jenis_kelamin ?? "Laki-Laki") as "Laki-Laki" | "Perempuan",
            status_dalam_kk: d.status_dalam_kk ?? "Anggota",
            no_kk: d.no_kk ?? "",
            nik: d.nik,
            status_perkawinan: (d.status_kawin ?? "Belum Kawin") as Penduduk["status_perkawinan"],
            tempat_lahir: d.tempat_lahir ?? "",
            tanggal_lahir: d.tanggal_lahir ? String(d.tanggal_lahir) : "",
            pendidikan: d.pendidikan ?? "",
            pekerjaan: d.pekerjaan ?? "",
            pendapatan_bulan: d.pendapatan_bulan ?? "0",
            kewarganegaraan: d.kewarganegaraan ?? "Indonesia",
            agama: d.agama ?? "Islam",
            suku: d.suku ?? "",
            // ── perumahan
            kepemilikan_rumah: d.kepemilikan_rumah ?? "-",
            luas_rumah: d.luas_rumah ?? "-",
            jumlah_lantai: d.jumlah_lantai ?? "-",
            jenis_lantai: d.jenis_lantai ?? "-",
            jenis_dinding: d.jenis_dinding ?? "-",
            jenis_atap: d.jenis_atap ?? "-",
            kepemilikan_tanah: d.kepemilikan_tanah ?? "-",
            luas_tanah: d.luas_tanah ?? "-",
            // ── fasilitas
            penerangan: d.penerangan ?? "-",
            sumber_energi_masak: d.sumber_energi_masak ?? "-",
            mck: d.mck ?? "-",
            sumber_air: d.sumber_air ?? "-",
            // ── sosial
            bantuan_sosial: d.bantuan_sosial ?? "Tidak",
            bantuan_extra: d.bantuan_extra ?? "Tidak",
            bpjs_kesehatan: d.bpjs_kesehatan ?? "Tidak",
            bpjs_ketenagakerjaan: d.bpjs_ketenagakerjaan ?? "Tidak",
            kepemilikan_aset: d.kepemilikan_aset ?? "Tidak",
            kondisi_fisik: d.kondisi_fisik ?? "Normal",
            // ── keluarga
            nama_ibu: d.nama_ibu ?? "",
            nama_bapak: d.nama_bapak ?? "",
            golongan_darah: d.golongan_darah ?? "-",
            // ── opsional
            no_hp: d.no_hp ?? "",
            alamat: d.alamat ?? "",
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

/** No-op: penduduk data sudah ada di IndexedDB via penduduk-store. */
export function clearPenduduk() {
  // Penduduk kini disimpan di IndexedDB — hapus via clearAll di settings-store
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
