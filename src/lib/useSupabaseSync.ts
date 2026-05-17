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
import { idbDelete, idbGetAll, idbPut, idbReplaceAll } from "@/lib/idb-store";
import { isStoreLocked } from "@/lib/settings-lock";
import { notifySyncListeners } from "./idb-sync";
import type { SuratTemplate } from "./template-store";
import { z } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncResult =
  | { ok: true; source: "supabase" | "localStorage"; record?: SuratRecord; cloudSynced: boolean }
  | { ok: false; source: "supabase" | "localStorage"; error: string; cloudSynced?: boolean };

export type AuditEntry = {
  action: string;
  detail?: string;
  username: string;
  userId?: string;
  ipAddress?: string;
};

export type SyncAdminUser = {
  id: string;
  username: string;
  password?: string; // Optional during pull if masked
  name: string;
  email: string;
  role: string;
  fixed?: boolean;
  created_at?: string;
};

// ── In-Memory Cache ───────────────────────────────────────────────────────────
// _records/_archive null = belum pernah di-init (return []). [] = init berhasil, kosong.
let _records: SuratRecord[] | null = null;
let _archive: SuratRecord[] | null = null;

/** Async init — dipanggil sekali saat app mount. */
export async function initEsuratStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_records !== null) return; // Prevent double init

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked("esurat")) {
    console.info("[esurat-store] Initializing from IDB (Store Locked)");
    const [recs, arch] = await Promise.all([
      idbGetAll<SuratRecord>("esurat_records"),
      idbGetAll<SuratRecord>("esurat_archive"),
    ]);
    _records = recs;
    _archive = arch;
    return;
  }

  try {
    // ── 1. IndexedDB (prioritas utama — persist dari sesi sebelumnya) ──
    const [recs, arch] = await Promise.all([
      idbGetAll<SuratRecord>("esurat_records"),
      idbGetAll<SuratRecord>("esurat_archive"),
    ]);
    _records = recs;
    _archive = arch;

    // ── 2. Migrate dari localStorage jika IDB kosong ──
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

    // ── 3. Sync dari Supabase ──
    if (isSupabaseConfigured) {
      if (_records.length === 0) {
        // Jika kosong, tunggu sync selesai agar UI tidak berkedip kosong
        await syncPullAllRecords().catch((err) => {
          console.warn("[esurat] Supabase initial pull failed:", err);
        });
      } else {
        // Jika sudah ada data di IDB, sync di background untuk mendapatkan request baru
        syncPullAllRecords().catch((err) => {
          console.warn("[esurat] Supabase background sync failed:", err);
        });
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

// ── Validation Schema ────────────────────────────────────────────────────────
export const SuratSchema = z.object({
  no: z.string().min(1, "Nomor surat/tracking wajib diisi"),
  kode: z.string().min(1, "Kode surat wajib diisi"),
  nama_surat: z.string().min(1, "Nama surat wajib diisi"),
  pemohon: z.string().min(1, "Nama pemohon wajib diisi"),
  nik: z.string().length(16, "NIK harus 16 digit"),
  kontak: z.string().min(10, "Kontak minimal 10 digit"),
  status: z.enum([
    "Menunggu Verifikasi",
    "Diverifikasi",
    "Menunggu Approval",
    "Disetujui",
    "Ditolak",
  ]),
  created_at: z.string().datetime().or(z.string()), // Accept ISO or simple date
});

async function getClientIp(): Promise<string> {
  try {
    // Attempt to get IP, fallback to 127.0.0.1 if blocked or offline
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    return data.ip || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

// ── DB Record Converters ──────────────────────────────────────────────────────
function toDbRecord(r: SuratRecord): Record<string, unknown> {
  // Optimasi: hapus data_url (base64) jika sudah ada storage_path (sudah di-offload ke bucket)
  // Ini menghemat space JSONB di database secara signifikan.
  const cleanAttachments = r.attachments.map((att) => {
    if (att.storage_path) {
      const { data_url, ...rest } = att;
      return rest;
    }
    return att;
  });

  return {
    no: r.no,
    kode: r.kode,
    nama_surat: r.nama_surat,
    warga_id: (r as Record<string, unknown>).warga_id ?? null,
    tracking_no: r.tracking_no ?? null,
    nik: r.nik,
    pemohon: r.pemohon,
    kontak: r.kontak,
    data: r.data,
    status: r.status,
    catatan: r.catatan ?? null,
    attachments: cleanAttachments,
    foto_selfie: r.foto_selfie ?? null,
    rejection_reasons: r.rejection_reasons ?? null,
    rejection_detail: r.rejection_detail ?? null,
    edit_history: r.edit_history ?? null,
    updated_by: r.updated_by ?? null,
    verified_at: r.verified_at ?? null,
    verified_by: r.verified_by ?? null,
    approved_at: r.approved_at ?? null,
    approved_by: r.approved_by ?? null,
    signed_at: r.signed_at ?? null,
    signed_by: r.signed_by ?? null,
    qr_payload: r.qr_payload ?? null,
    created_at: r.created_at ? new Date(r.created_at) : new Date(),
    updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}

async function uploadAttachment(file: {
  name: string;
  data_url: string;
}): Promise<{ ok: false; error: string } | { ok: true; path: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase client null" };

  try {
    const base64Data = file.data_url.split(",")[1];
    if (!base64Data) return { ok: false, error: "Invalid data_url: no base64 content" };

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    const fileExt = file.name.split(".").pop() ?? "bin";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { data, error } = await sb.storage
      .from("surat-attachments")
      .upload(filePath, blob, { contentType: "auto" });

    if (error) {
      const msg = `[storage] Upload failed: ${error.message}`;
      console.warn(msg);
      return { ok: false, error: msg };
    }
    return { ok: true, path: data!.path };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[storage] Error uploading:", msg);
    return { ok: false, error: msg };
  }
}

function fromDbRecord(row: Record<string, unknown>): SuratRecord {
  const data = (row.data as Record<string, unknown>) ?? {};
  const stringData: Record<string, string> = {};
  Object.entries(data).forEach(([k, v]) => {
    stringData[k] = String(v ?? "");
  });
  return {
    no: String(row.no ?? ""),
    tracking_no: row.tracking_no ? String(row.tracking_no) : undefined,
    warga_id: row.warga_id ? String(row.warga_id) : undefined,
    kode: String(row.kode ?? ""),
    nama_surat: String(row.nama_surat ?? ""),
    pemohon: String(row.pemohon ?? ""),
    nik: String(row.nik ?? ""),
    kontak: String(row.kontak ?? ""),
    data: stringData,
    attachments: (row.attachments as SuratRecord["attachments"]) ?? [],
    status: String(row.status ?? "") as SuratStatus,
    catatan: row.catatan ? String(row.catatan) : undefined,
    verified_at: row.verified_at ? String(row.verified_at) : undefined,
    verified_by: row.verified_by ? String(row.verified_by) : undefined,
    approved_at: row.approved_at ? String(row.approved_at) : undefined,
    approved_by: row.approved_by ? String(row.approved_by) : undefined,
    signed_at: row.signed_at ? String(row.signed_at) : undefined,
    signed_by: row.signed_by ? String(row.signed_by) : undefined,
    qr_payload: row.qr_payload ? String(row.qr_payload) : undefined,
    foto_selfie: (row.foto_selfie as SuratRecord["foto_selfie"]) ?? undefined,
    rejection_reasons: (row.rejection_reasons as SuratRecord["rejection_reasons"]) ?? undefined,
    rejection_detail: row.rejection_detail ? String(row.rejection_detail) : undefined,
    edit_history: (row.edit_history as SuratRecord["edit_history"]) ?? undefined,
    updated_by: row.updated_by ? String(row.updated_by) : undefined,
    created_at: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined,
  };
}

// ── Sync Operations ───────────────────────────────────────────────────────────

/** Simpan record baru/update — sync ke IndexedDB + Supabase. */
export async function syncSaveRecord(
  record: SuratRecord,
  username = "system",
): Promise<SyncResult> {
  // 1. Validate data
  const validation = SuratSchema.safeParse(record);
  if (!validation.success) {
    const msg = validation.error.errors.map((e) => e.message).join(", ");
    return { ok: false, source: "localStorage", error: `Validasi gagal: ${msg}` };
  }

  // 2. Offload large attachments to Supabase Storage if configured
  // Clone attachments array to avoid mutating the original record on partial failure
  const recordToSave = { ...record, attachments: record.attachments.map((att) => ({ ...att })) };
  if (isSupabaseConfigured && recordToSave.attachments.length > 0) {
    let uploadFailed = false;
    for (const att of recordToSave.attachments) {
      if (att.data_url && !att.storage_path) {
        const result = await uploadAttachment({ name: att.name, data_url: att.data_url });
        if (result.ok) {
          att.storage_path = result.path;
        } else {
          console.warn(`[sync] Attachment upload failed for "${att.name}": ${result.error}`);
          uploadFailed = true;
          // fallback: keep data_url in IndexedDB — not lost, just not offloaded
        }
      }
    }
    // Only apply uploaded storage_path values if no attachment failed
    if (!uploadFailed) {
      record.attachments = recordToSave.attachments;
    }
  }

  const localRecords = [...getLocalRecords()];
  const idx = localRecords.findIndex((r) => r.no === record.no);
  const now = new Date().toISOString();
  const localRecord =
    idx >= 0
      ? { ...record, updated_at: now, cloudSynced: false as boolean }
      : { ...record, updated_at: now, cloudSynced: false as boolean };
  if (idx >= 0) localRecords[idx] = localRecord;
  else localRecords.unshift(localRecord);
  setLocalRecords(localRecords);

  if (!isSupabaseConfigured) {
    return { ok: true, source: "localStorage", record: localRecord, cloudSynced: false };
  }

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record: localRecord, cloudSynced: false };
    const { error } = await sb
      .from("surat_requests")
      .upsert(toDbRecord(record), { onConflict: "no" });
    if (error) {
      console.warn("[sync] Supabase upsert failed, IndexedDB still saved:", error.message);
      return { ok: true, source: "localStorage", record: localRecord, cloudSynced: false };
    }
    await logAudit({ action: "surat.save", detail: `Surat ${record.no} disimpan`, username });
    const synced = getLocalRecords().map((r) =>
      r.no === record.no ? { ...r, cloudSynced: true as boolean } : r,
    );
    setLocalRecords(synced);
    return { ok: true, source: "supabase", record: localRecord, cloudSynced: true };
  } catch (err) {
    console.warn("[sync] Supabase error:", err);
    return { ok: true, source: "localStorage", record: localRecord, cloudSynced: false };
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

  // Capture original status BEFORE mutating localRecords for optimistic lock check
  const originalStatus = localRecords[idx].status;

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

  if (!isSupabaseConfigured)
    return { ok: true, source: "localStorage", record: updated, cloudSynced: false };

  try {
    const sb = getSupabase();
    if (!sb) return { ok: true, source: "localStorage", record: updated, cloudSynced: false };
    const updates: Record<string, unknown> = {
      status,
      catatan: catatan ?? null,
      updated_at: new Date(),
      updated_by: username,
    };
    if (status === "Ditolak" && catatan) {
      // Parse alasan: format "reason1; reason2; custom reason"
      // rejection_reasons: semicolon-separated list of reason keys
      const parts = catatan
        .split(";")
        .map((p: string) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        // First N-1 parts are structured reasons, last part may be custom
        updates.rejection_detail = parts[parts.length - 1];
        if (parts.length > 1) {
          updates.rejection_reasons = parts.slice(0, -1);
        }
      }
    }
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
    const { error } = await sb
      .from("surat_requests")
      .update(updates)
      .eq("no", no)
      // Optimistic locking — only update if record still has previous status.
      // Prevents concurrent admin sessions from overwriting each other's changes.
      .eq("status", originalStatus);
    if (error) {
      // Conflict: another session changed the status — refresh needed
      console.warn("[sync] Status update conflict for", no, ":", error.message);
      return {
        ok: false,
        source: "supabase",
        error: "Status sudah berubah — silakan refresh dan coba lagi",
        cloudSynced: false,
      };
    }
    await logAudit({
      action: `surat.status.${status.toLowerCase().replace(/\s/g, "_")}`,
      detail: `Surat ${no} → ${status}`,
      username,
    });
    return { ok: true, source: "supabase", record: updated, cloudSynced: true };
  } catch (err) {
    console.warn("[sync] Supabase error:", err);
    return { ok: true, source: "localStorage", record: updated, cloudSynced: false };
  }
}

/**
 * Tarik semua record dari Supabase DAN IndexedDB (termasuk offline submissions).
 * Offline-only records (yang tidak pernah berhasil sync ke Supabase) tetap
 * ditampilkan di dashboard admin setelah cloud sync.
 *
 * Merge strategy: Supabase record menang untuk no yang sama.
 * Offline-only records (cloudSynced !== true) ditambahkan.
 */
export async function syncPullAllRecords(): Promise<SyncResult> {
  if (!isSupabaseConfigured)
    return { ok: false, source: "supabase", error: "Supabase not configured" };

  try {
    const sb = getSupabase();
    if (!sb) return { ok: false, source: "supabase", error: "Supabase instance missing" };

    // 1. Pull dari Supabase — hanya record aktif (belum diarsipkan)
    const { data, error } = await sb
      .from("surat_requests")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // 2. Ambil offline-only records dari IndexedDB
    // (records yang disubmit saat offline dan belum pernah sync ke Supabase)
    const offlineOnly = getLocalRecords().filter((r) => r.cloudSynced !== true);

    if (data) {
      const cloudRecords = data.map(fromDbRecord);

      // 3. Merge — tambahkan offline-only records yang tidak ada di Supabase
      const cloudNos = new Set(cloudRecords.map((r) => r.no));
      const merged = [...cloudRecords];
      for (const off of offlineOnly) {
        if (!cloudNos.has(off.no)) {
          merged.push(off);
        }
      }

      const active = merged.filter((r) => r.status !== "Disetujui" && r.status !== "Ditolak");
      const arch = merged.filter((r) => r.status === "Disetujui" || r.status === "Ditolak");

      setLocalRecords(active);
      setLocalArchive(arch);

      // Log offline items merged
      if (offlineOnly.length > 0) {
        console.info(`[sync] Merged ${offlineOnly.length} offline-only record(s) into active list`);
      }

      return { ok: true, source: "supabase", record: active[0], cloudSynced: true };
    }
    return { ok: true, source: "supabase", cloudSynced: true };
  } catch (err) {
    console.warn("[sync] Pull failed:", err);
    return { ok: false, source: "supabase", error: (err as Error).message };
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

  let cloudSynced = false;
  if (isSupabaseConfigured) {
    try {
      const sb = getSupabase();
      if (sb) {
        await sb
          .from("surat_requests")
          .update({ archived: true, updated_at: new Date() })
          .eq("no", no);
        await logAudit({ action: "surat.archive", detail: `Surat ${no} diarsipkan`, username });
        cloudSynced = true;
      }
    } catch {
      /* non-blocking — data safe in IndexedDB */
    }
  }
  return { ok: true, source: "localStorage", record: r, cloudSynced };
}

/** Hapus record surat (terutama digunakan saat pergantian ID tracking ke no resmi).
 * Instead of hard-deleting from Supabase, mark as archived so it appears in archive tab. */
export async function syncDeleteRecord(no: string, username = "system"): Promise<SyncResult> {
  const localRecords = [...getLocalRecords()];
  const r = localRecords.find((rec) => rec.no === no);
  if (r) {
    setLocalRecords(localRecords.filter((rec) => rec.no !== no));
  }

  let cloudSynced = false;
  if (isSupabaseConfigured) {
    try {
      const sb = getSupabase();
      if (sb) {
        // Archive (not hard-delete) so record appears in archive tab
        await sb
          .from("surat_requests")
          .update({ archived: true, updated_at: new Date() })
          .eq("no", no);
        await logAudit({
          action: "surat.delete",
          detail: `Surat ${no} diarsipkan (tracking lama)`,
          username,
        });
        cloudSynced = true;
      }
    } catch {
      /* non-blocking */
    }
  }
  return { ok: true, source: "localStorage", record: r, cloudSynced };
}

/** Fetch record dari Supabase. */
export async function fetchSuratFromDb(no: string): Promise<SuratRecord | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from("surat_requests").select("*").eq("no", no).single();
    if (error || !data) return null;
    return fromDbRecord(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Search records in Supabase (Public). */
export async function searchSuratRequests(query: string): Promise<SuratRecord[]> {
  if (!isSupabaseConfigured || !query.trim()) return [];
  try {
    const sb = getSupabase();
    if (!sb) return [];

    // Search by tracking number (exact) or NIK (exact)
    const { data, error } = await sb
      .from("surat_requests")
      .select("*")
      .or(`no.eq.${query},nik.eq.${query}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(fromDbRecord);
  } catch (err) {
    console.warn("[sync] Search failed:", err);
    return [];
  }
}

/** Log audit ke Supabase. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (typeof window === "undefined" || !isSupabaseConfigured) return;
  try {
    const sb = getSupabase();
    if (!sb) return;

    const ip = await getClientIp();
    const { error } = await sb.from("audit_log").insert({
      action: entry.action,
      detail: entry.detail,
      username: entry.username,
      ip_address: ip,
      created_at: new Date(),
    });
    if (error) console.warn("[audit] Log failed:", error.message);
  } catch (err) {
    console.warn("[audit] Error:", err);
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

// ── Admin User Sync ──────────────────────────────────────────────────────────

/** Simpan/Update user admin ke Supabase. */
export async function syncSaveAdminUser(user: SyncAdminUser, actor: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabase();
    if (!sb) return true;

    const { error } = await sb.from("admin_users").upsert(
      {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role,
        fixed: !!user.fixed,
        updated_at: new Date(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.warn("[sync] Save admin user failed:", error.message);
      return false;
    }
    await logAudit({
      action: "admin.user_sync_push",
      detail: `Sync user: ${user.username}`,
      username: actor,
    });
    return true;
  } catch (err) {
    console.warn("[sync] Admin sync error:", err);
    return false;
  }
}

/** Hapus user admin dari Supabase. */
export async function syncDeleteAdminUser(
  id: string,
  username: string,
  actor: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabase();
    if (!sb) return true;

    const { error } = await sb.from("admin_users").delete().eq("id", id);
    if (error) {
      console.warn("[sync] Delete admin user failed:", error.message);
      return false;
    }
    await logAudit({
      action: "admin.user_sync_delete",
      detail: `Hapus user sync: ${username}`,
      username: actor,
    });
    return true;
  } catch (err) {
    console.warn("[sync] Admin sync delete error:", err);
    return false;
  }
}

/** Tarik semua admin users dari Supabase. */
export async function syncPullAdminUsers(): Promise<SyncAdminUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb.from("admin_users").select("*");
    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      password: row.password,
      name: row.name,
      email: row.email,
      role: row.role,
      fixed: row.fixed,
      created_at: row.created_at,
    }));
  } catch (err) {
    console.warn("[sync] Pull admin users failed:", err);
    return [];
  }
}

// ── Template Sync ─────────────────────────────────────────────────────────────

/** Tarik semua template dari Supabase. */
export async function syncPullTemplates(): Promise<SuratTemplate[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from("surat_template")
      .select("*")
      .order("code", { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      description: row.description || "",
      syarat: Array.isArray(row.syarat) ? row.syarat : [],
      fields: Array.isArray(row.fields) ? row.fields : [],
      eta: row.eta || "1 hari kerja",
      body: row.body || "",
      dna_clauses: Array.isArray(row.dna_clauses) ? row.dna_clauses : undefined,
      subject_fields: Array.isArray(row.subject_fields) ? row.subject_fields : undefined,
      closing: row.closing || undefined,
      subject_count: row.subject_count || 1,
      status: (row.status as SuratTemplate["status"]) || "Draft",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.warn("[sync] Pull templates failed:", err);
    return [];
  }
}

/** Simpan/Update template ke Supabase. */
export async function syncSaveTemplate(t: SuratTemplate, actor = "system"): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabase();
    if (!sb) return true;

    // Mapping fields to DB columns
    const record = {
      id: t.id,
      code: t.code,
      name: t.name,
      category: t.category,
      description: t.description,
      syarat: t.syarat,
      fields: t.fields,
      eta: t.eta,
      body: t.body,
      dna_clauses: t.dna_clauses,
      subject_fields: t.subject_fields,
      closing: t.closing,
      subject_count: t.subject_count,
      status: t.status,
      updated_at: new Date(),
    };

    const { error } = await sb.from("surat_template").upsert(record, { onConflict: "id" });

    if (error) {
      console.warn("[sync] Save template failed:", error.message);
      return false;
    }

    await logAudit({
      action: "template.save",
      detail: `Template ${t.code} (${t.name}) disimpan`,
      username: actor,
    });
    return true;
  } catch (err) {
    console.warn("[sync] Template sync error:", err);
    return false;
  }
}

/** Hapus template dari Supabase. */
export async function syncDeleteTemplate(
  id: string,
  code: string,
  actor = "system",
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabase();
    if (!sb) return true;

    const { error } = await sb.from("surat_template").delete().eq("id", id);
    if (error) {
      console.warn("[sync] Delete template failed:", error.message);
      return false;
    }

    await logAudit({
      action: "template.delete",
      detail: `Template ${code} dihapus`,
      username: actor,
    });
    return true;
  } catch (err) {
    console.warn("[sync] Template delete error:", err);
    return false;
  }
}

/**
 * Subscribe to realtime changes for templates.
 * Memastikan data in-sync antar admin dashboard secara live.
 */
export function subscribeToTemplates(): () => void {
  if (!isSupabaseConfigured) return () => {};
  const sb = getSupabase();
  if (!sb) return () => {};

  const channel = sb
    .channel("surat_template_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "surat_template" },
      async (payload) => {
        console.info("[sync] Realtime template change detected:", payload.eventType);

        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as any;
          const template: SuratTemplate = {
            id: String(row.id ?? ""),
            code: String(row.code ?? ""),
            name: String(row.name ?? ""),
            category: String(row.category ?? ""),
            description: String(row.description ?? ""),
            syarat: Array.isArray(row.syarat) ? row.syarat : [],
            fields: Array.isArray(row.fields) ? row.fields : [],
            eta: String(row.eta ?? "1 hari kerja"),
            body: String(row.body ?? ""),
            dna_clauses: Array.isArray(row.dna_clauses) ? row.dna_clauses : [],
            subject_fields: Array.isArray(row.subject_fields) ? row.subject_fields : [],
            closing: String(row.closing ?? ""),
            subject_count: typeof row.subject_count === "number" ? row.subject_count : 1,
            status: (row.status as SuratTemplate["status"]) ?? "Draft",
            created_at: String(row.created_at ?? ""),
            updated_at: row.updated_at ? String(row.updated_at) : undefined,
          };

          // Update IndexedDB
          await idbPut("templates", template).catch(console.warn);

          // Notify listeners to refresh cache
          notifySyncListeners({
            source: "remote",
            store: "templates",
            key: template.id,
            timestamp: Date.now(),
            data: template,
          });
        } else if (payload.eventType === "DELETE") {
          const id = payload.old.id;
          await idbDelete("templates", id).catch(console.warn);

          notifySyncListeners({
            source: "remote",
            store: "templates",
            key: id,
            timestamp: Date.now(),
          });
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.info("[sync] Subscribed to surat_template realtime changes");
      }
    });

  return () => {
    sb.removeChannel(channel);
  };
}

// ── Expose cache for esurat-store.ts ─────────────────────────────────────────
export { getLocalRecords, getLocalArchive, setLocalRecords, setLocalArchive };
