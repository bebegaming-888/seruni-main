// Penduduk Store — IndexedDB storage (kapasitas >10.000 record)
// In-memory cache untuk read sinkron; IndexedDB untuk persistensi async.

import { type Penduduk } from "@/data/penduduk";
import { processSmartImport, type SmartImportResult } from "@/lib/smart-import";
export type { SmartImportResult } from "@/lib/smart-import";
import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { logAudit } from "./settings-store";
import { getVillage } from "./village-dynamic";
import { isStoreLocked } from "@/lib/settings-lock";

// Flag kecil di localStorage: "active" = sudah ada data nyata, "mock" / null = belum
const STATE_KEY = "penduduk_db_state";

// ── In-Memory Cache ───────────────────────────────────────────────────────────
// _mem: null = store belum pernah di-init (await initPendudukStore first)
// _mem: [] = store berhasil di-init, data kosong (first-time setup)
// _mem: [p1, p2, ...] = store berhasil di-init, ada data
let _mem: Penduduk[] | null = null;
let _isActive = false;

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
  // Hanya return data nyata. Jika belum ada, kembalikan array kosong.
  // Jangan auto-inject PENDUDUK_MOCK — itu berbahaya karena membuat admin
  // mengira ada data padahal itu data tes.
  return _mem ?? [];
}

// ── Initialization — panggil SEKALI saat app mount ────────────────────────────
// Priority: Supabase (cloud) → IndexedDB (local) → empty (first-time setup)
// NOTE: _mem stays null only until FIRST successful fetch from Supabase or IDB.
// On subsequent page loads, _mem is already populated so init is instant.
export async function initPendudukStore(): Promise<void> {
  if (typeof window === "undefined") return;

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked("penduduk")) {
    console.info("[penduduk-store] Initializing from IDB (Store Locked)");
    const idbData = await dbGetAll();
    if (idbData && idbData.length > 0) {
      setActive(idbData);
      return;
    }
  }

  try {
    let data: Penduduk[] = [];

    // ── 1. Pull dari Supabase dulu (prioritas utama) ──
    if (isSupabaseConfigured) {
      try {
        const sb = getSupabase();
        if (sb) {
          const { data: remoteData, error } = await sb
            .from("warga")
            .select("*")
            .order("nik", { ascending: true });

          if (!error && remoteData && remoteData.length > 0) {
            data = remoteData as Penduduk[];
            // Simpan hasil pull ke IndexedDB sebagai backup lokal
            await dbReplaceAll(data);
            setActive(data);
            console.info(`[penduduk-store] Loaded ${data.length} records from Supabase`);
            return;
          }
          if (error) {
            console.warn("[penduduk-store] Supabase select error:", error.message);
          }
        }
      } catch (err) {
        console.warn("[penduduk-store] Supabase fetch failed, fallback ke IDB:", err);
      }
    }

    // ── 2. Fallback: baca dari IndexedDB ──
    data = await dbGetAll();
    if (data.length > 0) {
      setActive(data);
      console.info(`[penduduk-store] Loaded ${data.length} records from IndexedDB`);
      return;
    }

    // ── 3. First-time setup: kosongkan state (bukan mock) ──
    _mem = [];
    _isActive = true; // Mark as "initialized" so checkNik works with empty array
    console.info("[penduduk-store] No data found — initialized with empty array");
  } catch (e) {
    console.error("[penduduk-store] Init gagal:", e);
    _mem = [];
    _isActive = true;
  }
}

/**
 * Sync SELURUH data penduduk (IndexedDB) ke Supabase.
 * Dipanggil manual atau setelah import massal.
 * Returns jumlah record yang berhasil di-sync.
 */
export async function syncAllToSupabase(): Promise<{
  ok: boolean;
  synced: number;
  message: string;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, synced: 0, message: "Supabase belum dikonfigurasi" };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, synced: 0, message: "Supabase client null" };

  const allData = listPenduduk();
  if (allData.length === 0) return { ok: false, synced: 0, message: "Tidak ada data untuk sync" };

  try {
    // Batch upsert — onConflict NIK → update semua kolom
    const { count, error } = await sb.from("warga").upsert(allData, { onConflict: "nik" });

    if (error) {
      console.error("[penduduk-store] Upsert error:", error);
      return { ok: false, synced: 0, message: `Upsert gagal: ${error.message}` };
    }

    console.info(`[penduduk-store] Synced ${allData.length} records to Supabase`);
    return {
      ok: true,
      synced: allData.length,
      message: `${allData.length} data berhasil disinkronkan`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[penduduk-store] Sync error:", msg);
    return { ok: false, synced: 0, message: `Sync gagal: ${msg}` };
  }
}

/**
 * Tarik data penduduk dari Supabase ke IndexedDB.
 * Merge strategy: NIK yang ada di cloud tapi tidak ada di lokal → tambahkan.
 * NIK yang ada di lokal tapi tidak ada di cloud → pertahankan.
 */
export async function pullFromSupabase(): Promise<{
  ok: boolean;
  added: number;
  updated: number;
  message: string;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, added: 0, updated: 0, message: "Supabase belum dikonfigurasi" };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, added: 0, updated: 0, message: "Supabase client null" };

  try {
    const { data, error } = await sb.from("warga").select("*").order("nama", { ascending: true });

    if (error) {
      console.error("[penduduk-store] Pull error:", error);
      return { ok: false, added: 0, updated: 0, message: `Pull gagal: ${error.message}` };
    }

    const cloud = (data ?? []) as Penduduk[];
    if (cloud.length === 0) {
      return { ok: false, added: 0, updated: 0, message: "Tidak ada data di server" };
    }

    const local = listPenduduk();
    const localNik = new Set(local.map((p) => p.nik));

    let added = 0;
    const merged: Penduduk[] = [...local];

    for (const c of cloud) {
      if (!localNik.has(c.nik)) {
        merged.push(c);
        added++;
      }
    }

    setActive(merged);
    await dbReplaceAll(merged);

    console.info(`[penduduk-store] Pulled ${cloud.length} records from Supabase: ${added} added`);
    return {
      ok: true,
      added,
      updated: 0,
      message: `${added} ditambahkan dari server`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[penduduk-store] Pull error:", msg);
    return { ok: false, added: 0, updated: 0, message: `Pull gagal: ${msg}` };
  }
}

/**
 * Batch save Penduduk[] from Admin CSV import.
 * Handles deduplication (update if NIK exists, add if new) and syncs to Supabase.
 */
export async function savePendudukBatch(
  items: Penduduk[],
  actor: string,
): Promise<{ added: number; updated: number; syncOk: boolean; syncMessage: string }> {
  const existing = listPenduduk();
  let added = 0;
  let updated = 0;
  const next: Penduduk[] = [...existing];

  for (const item of items) {
    const existingIdx = next.findIndex((p) => p.nik === item.nik);
    if (existingIdx >= 0) {
      next[existingIdx] = { ...next[existingIdx], ...item };
      updated++;
    } else {
      next.unshift(item);
      added++;
    }
  }

  setActive(next);
  await dbReplaceAll(next);

  // ── Supabase sync — return status so UI can show feedback ──
  let syncOk = false;
  let syncMessage = "Data tersimpan secara lokal";
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("warga").upsert(items, { onConflict: "nik" });
      if (error) {
        syncMessage = `Cloud sync gagal: ${error.message}`;
        console.warn("[penduduk-store] Batch upsert failed:", error.message);
      } else {
        syncOk = true;
        syncMessage = `${items.length} data berhasil disinkronkan ke cloud`;
      }
    }
  }

  logAudit(actor, "penduduk.import", `Batch import: +${added} added, ~${updated} updated`);
  return { added, updated, syncOk, syncMessage };
}

// ── Read ──────────────────────────────────────────────────────────────────────
export function listPenduduk(): Penduduk[] {
  // Jika _isActive=false DAN _mem=null → store belum di-init atau tidak ada data
  // → Kembalikan array kosong (bukan mock). Data mock HANYA untuk development local.
  return _mem ?? [];
}

export function isUsingMock(): boolean {
  // _mem is never null after init (we removed PENDUDUK_MOCK fallback).
  // This function kept for API compatibility — always returns false.
  return false;
}

export function getPendudukByNik(nik: string): Penduduk | null {
  const trimmed = nik.trim();
  const list = listPenduduk();
  // Fallback: jika listPenduduk() kosong tapi store aktif,
  // langsung query Supabase (kasus race condition di mana _mem=null tapi data ada di DB)
  if (list.length === 0 && _isActive && isSupabaseConfigured) {
    // Sync query — hanya untuk cek NIK, tidak mengupdate cache
    // Ini menangani kasus di mana init belum selesai tapi user sudah coba lookup
    const sb = getSupabase();
    if (sb) {
      // Fire-and-forget — jangan block UI
      sb.from("warga")
        .select("*")
        .eq("nik", trimmed)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            // Data ditemukan di cloud — update cache
            const warga = data as Penduduk;
            const existing = listPenduduk();
            if (!existing.some((p) => p.nik === trimmed)) {
              setActive([warga, ...existing]);
              dbPutOne(warga).catch(() => {});
            }
          }
        });
    }
    return null; // belum ada di cache — tunggu async fetch
  }
  return list.find((p) => p.nik === trimmed) ?? null;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function addPenduduk(
  p: Penduduk,
  actor: string,
): Promise<{ ok: boolean; message: string; synced?: boolean; idbSynced?: boolean }> {
  if (!/^\d{16}$/.test(p.nik)) return { ok: false, message: "NIK harus 16 digit angka" };
  const base = baseData();
  if (base.some((x) => x.nik === p.nik)) return { ok: false, message: "NIK sudah terdaftar" };
  setActive([p, ...base]);
  let idbOk = true;
  await dbPutOne(p).catch((e) => {
    console.error("[penduduk-store] IndexedDB write error:", e);
    idbOk = false;
  });

  // ── Supabase Sync (await agar error tertangkap) ──
  let synced = false;
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("warga").insert(p);
      if (error) {
        console.error("[penduduk-store] Supabase insert error:", error.message);
        return {
          ok: true,
          message: "Data disimpan (sync cloud gagal)",
          synced: false,
          idbSynced: idbOk,
        };
      }
      synced = true;
    }
  }
  logAudit(actor, "penduduk.add", `Tambah penduduk: ${p.nama} (${p.nik})`);
  return { ok: true, message: "Data berhasil ditambahkan", synced, idbSynced: idbOk };
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updatePenduduk(
  p: Penduduk,
  actor: string,
): Promise<{ ok: boolean; message: string; synced?: boolean; idbSynced?: boolean }> {
  const base = baseData();
  const idx = base.findIndex((x) => x.nik === p.nik);
  if (idx < 0) return { ok: false, message: "NIK tidak ditemukan" };
  const next = [...base];
  next[idx] = p;
  setActive(next);
  let idbOk = true;
  await dbPutOne(p).catch((e) => {
    console.error("[penduduk-store] IndexedDB write error:", e);
    idbOk = false;
  });

  let synced = false;
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("warga").update(p).eq("nik", p.nik);
      if (error) {
        console.error("[penduduk-store] Supabase update error:", error.message);
        return {
          ok: true,
          message: "Data diperbarui (sync cloud gagal)",
          synced: false,
          idbSynced: idbOk,
        };
      }
      synced = true;
    }
  }
  logAudit(actor, "penduduk.update", `Update penduduk: ${p.nama} (${p.nik})`);
  return { ok: true, message: "Data berhasil diperbarui", synced, idbSynced: idbOk };
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deletePenduduk(
  nik: string,
  actor: string,
): Promise<{ ok: boolean; message: string; idbSynced?: boolean }> {
  const base = baseData();
  const target = base.find((p) => p.nik === nik);
  const filtered = base.filter((p) => p.nik !== nik);
  if (filtered.length === base.length) return { ok: false, message: "NIK tidak ditemukan" };
  setActive(filtered);
  let idbOk = true;
  await dbDeleteOne(nik).catch((e) => {
    console.error("[penduduk-store] IndexedDB delete error:", e);
    idbOk = false;
  });

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      // Soft-delete — RLS tidak mengizinkan hard delete pada warga (migration 014)
      const { error } = await sb.from("warga").update({ archived: true }).eq("nik", nik);
      if (error) console.error("[penduduk-store] Supabase archive error:", error.message);
    }
  }
  logAudit(actor, "penduduk.delete", `Hapus penduduk: ${target?.nama || "Unknown"} (${nik})`);
  return { ok: true, message: "Data berhasil dihapus", idbSynced: idbOk };
}

// ── Purge All (Super Admin) ───────────────────────────────────────────────────
export async function purgeAllPenduduk(actor: string): Promise<void> {
  setActive([]);
  await dbReplaceAll([]).catch(console.error);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      // Langsung delete semua di Supabase (tanpa filter NIK)
      await sb.from("warga").delete().neq("nik", "placeholder_never_match_0000");
    }
  }
  logAudit(actor, "penduduk.purge", "Hapus massal seluruh data penduduk");
}

// ── Smart Import ──────────────────────────────────────────────────────────────
export async function importPenduduk(
  rawRows: Record<string, string>[],
  actor: string,
): Promise<SmartImportResult> {
  const existing = listPenduduk();
  const existingMap = new Map(existing.map((p) => [p.nik, p]));
  const { map, result } = processSmartImport(rawRows, existingMap);
  const allData = Array.from(map.values());
  setActive(allData); // update UI langsung (sync)
  await dbReplaceAll(allData); // simpan ke IndexedDB

  // ── Supabase Upsert (blocking — harus selesai sebelum return) ──
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error, status } = await sb
          .from("warga")
          .upsert(allData, { onConflict: "nik" });

        if (error) {
          console.error(`[penduduk-store] Supabase upsert error [${status}]:`, error.message);
          // Supabase error — data tetap aman di IndexedDB
          // Catat detail untuk debugging
          const detail = {
            count: allData.length,
            firstNik: allData[0]?.nik,
            columns: Object.keys(allData[0] ?? {}),
            errorMsg: error.message,
          };
          console.error("[penduduk-store] Upsert detail:", JSON.stringify(detail, null, 2));
        } else {
          console.info(`[penduduk-store] Upsert OK: ${allData.length} records synced to Supabase`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[penduduk-store] Supabase upsert exception:", msg);
      }
    }
  }
  logAudit(actor, "penduduk.import", `Import massal ${allData.length} data penduduk`);
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
  a.download = `penduduk-${getVillage().village.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
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

export async function exportPendudukXLSX(items?: Penduduk[]): Promise<void> {
  const XLSX = await import("xlsx");
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
  XLSX.writeFile(
    wb,
    `penduduk-${getVillage().village.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
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
