/**
 * useSupabaseSync — Sync Layer IndexedDB ↔ Supabase
 *
 * Prinsip: "write-behind" (IndexedDB-first) — setiap operasi tulis menulis ke
 * in-memory cache + IndexedDB duluan (untuk respons cepat dan offline),
 * baru kemudian mencoba sync ke Supabase sebagai source-of-truth.
 *
 * Jika Supabase tidak configured → tetap berhasil via IndexedDB.
 */

import { getSupabase, isSupabaseConfigured, supabaseUrl } from "./supabase";
import type { SuratRecord, SuratStatus } from "./esurat-store";
import { idbGetAll, idbPut, idbReplaceAll } from "@/lib/idb-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncResult =
  | { ok: true; source: "supabase" | "localStorage"; record?: SuratRecord }
  | { ok: false; source: "supabase" | "localStorage"; error: string };

export type AuditEntry = {
  action: string;
  detail?: string;
  username: string;
  userId?: string;
};

// ── In-Memory Cache ───────────────────────────────────────────────────────────
let _records: SuratRecord[] | null = null;
let _archive: SuratRecord[] | null = null;

/** Async init — dipanggil sekali saat app mount. */
export async function initEsuratStore(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const [recs, arch] = await Promise.all([
      idbGetAll<SuratRecord>("esurat_records"),
      idbGetAll<SuratRecord>("esurat_archive"),
    ]);
    _records = recs;
    _archive = arch;

    // Migrate dari localStorage jika cache kosong
    if (_records.length === 0) {
      const raw = localStorage.getItem("e_surat_records");
      if (raw) {
        _records = JSON.parse(raw) as SuratRecord[];
        await idbReplaceAll("esurat_records", _records).catch(console.warn);
      }
    }
    if (_archive.length === 0) {
      const raw = localStorage.getItem("e_surat_archive");
      if (raw) {
        _archive = JSON.parse(raw) as SuratRecord[];
        await idbReplaceAll("esurat_archive", _archive).catch(console.warn);
      }
    }
  } catch (e) {
    console.warn("[esurat] initEsuratStore gagal:", e);
    _records = _records ?? [];
    _archive = _archive ?? [];
  }
}

// ── Local Cache Helpers ───────────────────────────────────────────────────────
function getLocalRecords(): SuratRecord[] {
  return _records ?? [];
}
function getLocalArchive(): SuratRecord[] {
  return _archive ?? [];
}

function setLocalRecords(r: SuratRecord[]) {
  _records = r;
  idbReplaceAll("esurat_records", r).catch(console.warn);
}
function setLocalArchive(a: SuratRecord[]) {
  _archive = a;
  idbReplaceAll("esurat_archive", a).catch(console.warn);
}

// ── DB Record Converters ──────────────────────────────────────────────────────
function toDbRecord(r: SuratRecord): Record<string, unknown> {
  return {
    no_surat: r.no,
    kode: r.kode,
    nama_surat: r.nama_surat,
    nik: r.nik,
    pemohon: r.pemohon,
    kontak: r.kontak,
    data_json: r.data,
    status: r.status,
    catatan: r.catatan ?? null,
    attachments: r.attachments,
    signed_at: r.signed_at ?? null,
    signed_by: r.signed_by ?? null,
    qr_payload: r.qr_payload ?? null,
    created_at: r.created_at ? new Date(r.created_at) : new Date(),
    updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}

function fromDbRecord(row: Record<string, unknown>): SuratRecord {
  const data = (row.data_json as Record<string, unknown>) ?? {};
  const stringData: Record<string, string> = {};
  Object.entries(data).forEach(([k, v]) => {
    stringData[k] = String(v ?? "");
  });
  return {
    no: String(row.no_surat ?? ""),
    kode: String(row.kode ?? ""),
    nama_surat: String(row.nama_surat ?? ""),
    pemohon: String(row.pemohon ?? ""),
    nik: String(row.nik ?? ""),
    kontak: String(row.kontak ?? ""),
    data: stringData,
    attachments: (row.attachments as SuratRecord["attachments"]) ?? [],
    status: String(row.status ?? "") as SuratStatus,
    catatan: row.catatan ? String(row.catatan) : undefined,
    signed_at: row.signed_at ? String(row.signed_at) : undefined,
    signed_by: row.signed_by ? String(row.signed_by) : undefined,
    qr_payload: row.qr_payload ? String(row.qr_payload) : undefined,
    created_at: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined,
  };
}

// ── Sync Operations ───────────────────────────────────────────────────────────

/** Simpan (insert atau update) record surat ke IndexedDB + Supabase. */
export async function syncSaveRecord(
  record: SuratRecord,
  username = "system",
): Promise<SyncResult> {
  const localRecords = [...getLocalRecords()];
  const idx = localRecords.findIndex((r) => r.no === record.no);
  if (idx >= 0) localRecords[idx] = { ...record, updated_at: new Date().toISOString() };
  else localRecords.unshift(record);
  setLocalRecords(localRecords);

  if (!isSupabaseConfigured) return { ok: true, source: "localStorage", record };

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record };
    const { error } = await sb
      .from("surat_requests")
      .upsert(toDbRecord(record), { onConflict: "no_surat" });
    if (error) {
      console.warn("[sync] Supabase upsert failed, IndexedDB still saved:", error.message);
      return { ok: true, source: "localStorage", record };
    }
    await logAudit({ action: "surat.save", detail: `Surat ${record.no} disimpan`, username });
    return { ok: true, source: "supabase", record };
  } catch (err) {
    console.warn("[sync] Supabase error:", err);
    return { ok: true, source: "localStorage", record };
  }
}

/** Update status surat — sync ke IndexedDB + Supabase. */
export async function syncSetStatus(
  no: string,
  status: SuratStatus,
  catatan?: string,
  username = "system",
  approved_by?: string,
  signed_by?: string,
  qr_payload?: string,
): Promise<SyncResult> {
  const localRecords = [...getLocalRecords()];
  const idx = localRecords.findIndex((r) => r.no === no);
  if (idx < 0) return { ok: false, source: "localStorage", error: `Record ${no} tidak ditemukan` };

  const updated: SuratRecord = {
    ...localRecords[idx],
    status,
    catatan: catatan ?? localRecords[idx].catatan,
    updated_at: new Date().toISOString(),
    verified_at:
      status === "Diverifikasi" ? new Date().toISOString() : localRecords[idx].verified_at,
    approved_by: approved_by ?? localRecords[idx].approved_by,
    signed_at: status === "Disetujui" ? new Date().toISOString() : localRecords[idx].signed_at,
    signed_by: signed_by ?? localRecords[idx].signed_by,
    qr_payload: qr_payload ?? localRecords[idx].qr_payload,
  };
  localRecords[idx] = updated;
  setLocalRecords(localRecords);
  // Also update individual record in IndexedDB
  idbPut("esurat_records", updated).catch(console.warn);

  if (!isSupabaseConfigured) return { ok: true, source: "localStorage", record: updated };

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record: updated };
    const updates: Record<string, unknown> = {
      status,
      catatan: catatan ?? null,
      updated_at: new Date(),
    };
    if (status === "Diverifikasi") {
      updates.verified_by = username;
      updates.verified_at = new Date();
    }
    if (status === "Disetujui" || status === "Ditolak") {
      updates.approved_by = username;
      updates.approved_at = new Date();
      if (status === "Disetujui") {
        updates.signed_at = new Date();
        updates.signed_by = signed_by ?? null;
        updates.qr_payload = qr_payload ?? null;
      }
    }
    const { error } = await sb.from("surat_requests").update(updates).eq("no_surat", no);
    if (error) {
      console.warn("[sync] Status update failed:", error.message);
      return { ok: true, source: "localStorage", record: updated };
    }
    await logAudit({
      action: `surat.status.${status.toLowerCase().replace(/\s/g, "_")}`,
      detail: `Surat ${no} → ${status}`,
      username,
    });
    return { ok: true, source: "supabase", record: updated };
  } catch (err) {
    console.warn("[sync] Supabase error:", err);
    return { ok: true, source: "localStorage", record: updated };
  }
}

/** Pindahkan record ke arsip. */
export async function syncArchive(no: string, username = "system"): Promise<SyncResult> {
  const localRecords = [...getLocalRecords()];
  const r = localRecords.find((r) => r.no === no);
  if (!r) return { ok: false, source: "localStorage", error: `Record ${no} tidak ditemukan` };
  setLocalRecords(localRecords.filter((r) => r.no !== no));
  const arch = [...getLocalArchive()];
  arch.unshift(r);
  setLocalArchive(arch);

  if (isSupabaseConfigured) {
    try {
      const sb = getSupabase();
      if (sb)
        await logAudit({ action: "surat.archive", detail: `Surat ${no} diarsipkan`, username });
    } catch {
      /* non-blocking */
    }
  }
  return { ok: true, source: "localStorage", record: r };
}

/** Fetch record dari Supabase. */
export async function fetchSuratFromDb(no: string): Promise<SuratRecord | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from("surat_requests").select("*").eq("no_surat", no).single();
    if (error || !data) return null;
    return fromDbRecord(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Fetch warga dari Supabase by NIK. */
export async function fetchWargaByNik(nik: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from("warga").select("*").eq("nik", nik).single();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Log audit ke Supabase. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return;
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb
      .from("audit_log")
      .insert({ username: entry.username, action: entry.action, detail: entry.detail ?? null });
  } catch {
    /* non-blocking */
  }
}

export async function healthCheck(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("admin_users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

export function getSupabaseUrl(): string {
  return supabaseUrl;
}

// ── Expose cache for esurat-store.ts ─────────────────────────────────────────
export { getLocalRecords, getLocalArchive, setLocalRecords, setLocalArchive };
