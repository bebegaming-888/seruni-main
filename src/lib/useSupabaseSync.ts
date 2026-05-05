/**
 * useSupabaseSync — Sync Layer localStorage ↔ Supabase
 *
 * Prinsip: "write-through" — setiap operasi tulis (save, setStatus, archive)
 * akan mencoba menulis ke Supabase DULU, lalu fallback ke localStorage.
 * Reads tetap dari localStorage untuk responsiveness.
 *
 * Ini adalah fondasi Fase 2 yang menjembatani Fase 1 (localStorage-only)
 * menuju arsitektur Supabase penuh. localStorage tetap digunakan sebagai
 * fast-path dan offline buffer, Supabase adalah source-of-truth.
 *
 * Penggunaan:
 *   import { useSupabaseSync } from "@/lib/useSupabaseSync";
 *   const { saveRecord, setStatus } = useSupabaseSync();
 */

import { getSupabase, isSupabaseConfigured, supabaseUrl } from "./supabase";
import type { SuratRecord, SuratStatus } from "./esurat-store";

// ---- Types ----

export type SyncResult =
  | { ok: true; source: "supabase" | "localStorage"; record?: SuratRecord }
  | { ok: false; source: "supabase" | "localStorage"; error: string };

export type AuditEntry = {
  action: string;
  detail?: string;
  username: string;
  userId?: string;
};

// ---- Helpers ----

function isBrowser() {
  return typeof window !== "undefined";
}

function getLocalRecords(): SuratRecord[] {
  if (!isBrowser()) return [];
  try {
    const v = localStorage.getItem("e_surat_records");
    return v ? (JSON.parse(v) as SuratRecord[]) : [];
  } catch {
    return [];
  }
}

function setLocalRecords(records: SuratRecord[]) {
  if (!isBrowser()) return;
  localStorage.setItem("e_surat_records", JSON.stringify(records));
}

function getLocalArchive(): SuratRecord[] {
  if (!isBrowser()) return [];
  try {
    const v = localStorage.getItem("e_surat_archive");
    return v ? (JSON.parse(v) as SuratRecord[]) : [];
  } catch {
    return [];
  }
}

function setLocalArchive(archive: SuratRecord[]) {
  if (!isBrowser()) return;
  localStorage.setItem("e_surat_archive", JSON.stringify(archive));
}

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

// ---- Sync Operations ----

/** Simpan (insert atau update) record surat ke Supabase + localStorage. */
export async function syncSaveRecord(
  record: SuratRecord,
  username = "system",
): Promise<SyncResult> {
  // Always write to localStorage first (fast path)
  const localRecords = getLocalRecords();
  const idx = localRecords.findIndex((r) => r.no === record.no);
  if (idx >= 0) {
    localRecords[idx] = { ...record, updated_at: new Date().toISOString() };
  } else {
    localRecords.unshift(record);
  }
  setLocalRecords(localRecords);

  // Try Supabase if configured
  if (!isSupabaseConfigured) {
    return { ok: true, source: "localStorage", record };
  }

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record };

    const dbRecord = toDbRecord(record);

    // Upsert to Supabase
    const { error } = await sb.from("surat_requests").upsert(dbRecord, { onConflict: "no_surat" });

    if (error) {
      console.warn("[sync] Supabase upsert failed, localStorage still saved:", error.message);
      return { ok: true, source: "localStorage", record };
    }

    // Log audit
    await logAudit({ action: "surat.save", detail: `Surat ${record.no} disimpan`, username });

    return { ok: true, source: "supabase", record };
  } catch (err) {
    console.warn("[sync] Supabase error, localStorage still saved:", err);
    return { ok: true, source: "localStorage", record };
  }
}

/** Update status surat — sync ke Supabase + localStorage. */
export async function syncSetStatus(
  no: string,
  status: SuratStatus,
  catatan?: string,
  username = "system",
  approved_by?: string,
  signed_by?: string,
  qr_payload?: string,
): Promise<SyncResult> {
  const localRecords = getLocalRecords();
  const idx = localRecords.findIndex((r) => r.no === no);
  if (idx < 0) {
    return { ok: false, source: "localStorage", error: `Record ${no} tidak ditemukan` };
  }

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

  if (!isSupabaseConfigured) {
    return { ok: true, source: "localStorage", record: updated };
  }

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
      console.warn("[sync] Supabase status update failed:", error.message);
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

/** Pindahkan record ke arsip — sync ke Supabase + localStorage. */
export async function syncArchive(no: string, username = "system"): Promise<SyncResult> {
  const localRecords = getLocalRecords();
  const r = localRecords.find((r) => r.no === no);
  if (!r) {
    return { ok: false, source: "localStorage", error: `Record ${no} tidak ditemukan` };
  }

  // Remove from active records, add to archive
  const newRecords = localRecords.filter((r) => r.no !== no);
  setLocalRecords(newRecords);

  const localArchive = getLocalArchive();
  localArchive.unshift(r);
  setLocalArchive(localArchive);

  if (!isSupabaseConfigured) {
    return { ok: true, source: "localStorage", record: r };
  }

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record: r };

    // In Supabase, archive = mark as final status (already done in syncSetStatus)
    await logAudit({
      action: "surat.archive",
      detail: `Surat ${no} diarsipkan`,
      username,
    });

    return { ok: true, source: "supabase", record: r };
  } catch (err) {
    console.warn("[sync] Supabase archive error:", err);
    return { ok: true, source: "localStorage", record: r };
  }
}

/** Fetch record dari Supabase (untuk edge functions / SSR). */
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

/** Log audit entry ke Supabase. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!isBrowser()) return; // only log from browser
  if (!isSupabaseConfigured) return;

  try {
    const sb = getSupabase();
    if (!sb) return;

    await sb.from("audit_log").insert({
      username: entry.username,
      action: entry.action,
      detail: entry.detail ?? null,
    });
  } catch {
    // Audit log failure should never break the flow
  }
}

/** Cek apakah Supabase sedang aktif dan reachable. */
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

/** Export Supabase URL untuk edge functions (read-only, aman di-server). */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}
