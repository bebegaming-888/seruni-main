// Template Surat store — IndexedDB + in-memory cache + Supabase cloud sync.
// listTemplates() tetap sinkron. initTemplateStore() dipanggil async saat mount.
// Priority: Supabase (cloud) → IndexedDB → localStorage → SURAT_MASTER seed

import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";
import { isStoreLocked } from "@/lib/settings-lock";
import { addSyncListener, broadcastTemplateChange } from "@/lib/idb-sync";
import { SURAT_MASTER, type SuratMaster } from "@/data/surat-master";
import { generateId } from "@/lib/utils";
import { getDnaClauses, SUBJECT_FIELDS_PRESETS, DEFAULT_SUBJECT_FIELDS } from "@/lib/letter-engine";
import {
  syncPullTemplates,
  syncSaveTemplate,
  syncDeleteTemplate,
  syncPushAllTemplates,
  subscribeToTemplates,
} from "@/lib/useSupabaseSync";
import { isSupabaseConfigured } from "@/lib/supabase";

// ── Constants ────────────────────────────────────────────────────────────────
/** Default ETA untuk surat baru */
export const DEFAULT_ETA = "1 hari kerja";

/** Kalimat penutup default */
export const DEFAULT_CLOSING =
  "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.";

/** DNA clause default untuk template tanpa preset */
const DEFAULT_DNA_CLAUSE: readonly string[] = [
  "Dengan ini menerangkan bahwa :",
  "adalah benar warga kami yang berdomisili di wilayah Desa {{nama_desa}}, Kecamatan {{nama_kecamatan}}, Kabupaten {{nama_kabupaten}}.",
  "Surat keterangan ini dibuat untuk keperluan yang tertera dalam surat pengajuan.",
] as const;

/** Legacy localStorage key (migrate dari versi lama) */
const LEGACY_TEMPLATES_KEY = "e_surat_templates";

type FieldDef = SuratMaster["fields"][number];

export type TemplateStatus =
  | "Draft"
  | "Menunggu Verifikasi"
  | "Diverifikasi"
  | "Disetujui"
  | "Ditolak"
  | "Archived";

export type TemplateField = FieldDef & { enabled?: boolean };

/**
 * Konfigurasi field identitas pemohon (Komponen 4 — "Yang diterangkan").
 * - `source: "warga"`   → nilai dari data Penduduk (NIK lookup)
 * - `source: "request"` → nilai dari form pengajuan
 * - `source: "vars"`    → nilai dari LetterVars (derived/computed)
 */
export type SubjectFieldConfig = {
  key: string;
  label: string;
  source: "warga" | "request" | "vars";
  required: boolean;
  order: number;
  hidden?: boolean;
};

/**
 * Template surat dengan dukungan DNA clauses dan subject fields dinamis.
 *
 * Field legacy `body` dipertahankan untuk backward compat.
 * Engine akan memprioritaskan `dna_clauses[]` jika ada.
 */
export type SuratTemplate = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  syarat: string[];
  fields: TemplateField[];
  eta: string;

  // ── Legacy (backward compat) ──
  body: string;

  // ── DNA Engine (baru) ──
  /** Array klausa isi surat. Mendukung {{vars}} interpolation. */
  dna_clauses?: string[];
  /** Konfigurasi field identitas pemohon yang ditampilkan di surat */
  subject_fields?: SubjectFieldConfig[];
  /** Kalimat penutup surat */
  closing?: string;
  /** Jumlah orang yang diterangkan (biasanya 1, bisa lebih untuk surat keluarga) */
  subject_count?: number;

  status: TemplateStatus;
  /** Version number — incremented on each edit. Active = highest version with status "Disetujui". */
  version?: number;
  /** Links to the template version this was forked from (null for original). */
  parent_version_id?: string;
  catatan?: string;
  verified_by?: string;
  verified_at?: string;
  approved_by?: string;
  approved_at?: string;
  sent_to?: string;
  sent_at?: string;
  created_at: string;
  updated_at?: string;
};

// ── In-Memory Cache ───────────────────────────────────────────────────────────
let _cache: SuratTemplate[] | null = null;

function buildSeedTemplates(): SuratTemplate[] {
  return Object.values(SURAT_MASTER).map((s) => ({
    id: generateId(),
    code: s.code,
    name: s.name,
    category: s.category,
    description: s.description,
    syarat: s.syarat,
    fields: s.fields.map((f) => ({ ...f, enabled: true })),
    eta: s.eta,
    body: "",
    dna_clauses: getDnaClauses(s.code),
    subject_fields: SUBJECT_FIELDS_PRESETS[s.code] ?? DEFAULT_SUBJECT_FIELDS,
    closing: DEFAULT_CLOSING,
    subject_count: 1,
    status: "Disetujui" as const,
    version: 1,
    created_at: new Date().toISOString(),
  }));
}

// ── Async Init (Supabase-first, flattened) ───────────────────────────────────
export async function initTemplateStore(): Promise<void> {
  if (typeof window === "undefined") return;

  // Subscribe to realtime changes immediately (non-blocking)
  subscribeToTemplates();
  addSyncListener(async (event) => {
    if (event.store === "templates") {
      const saved = await idbGetAll<SuratTemplate>("templates");
      _cache = saved.map((t) => migrateTemplate(t));
    }
  });

  // 1. Try Supabase first (cloud source of truth)
  if (isSupabaseConfigured) {
    const remote = await syncPullTemplates().catch(() => []);
    if (remote.length > 0) {
      _cache = remote;
      await idbReplaceAll("templates", remote).catch(console.warn);
      return;
    }
  }

  // 2. IndexedDB cache fallback
  const saved = await idbGetAll<SuratTemplate>("templates");
  if (saved.length > 0) {
    _cache = saved.map((t) => migrateTemplate(t));
    return;
  }

  // 3. localStorage legacy migration
  const raw = localStorage.getItem(LEGACY_TEMPLATES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SuratTemplate[];
      if (parsed.length > 0) {
        _cache = parsed.map((t) => migrateTemplate(t));
        await idbReplaceAll("templates", _cache).catch(console.warn);
        return;
      }
    } catch {
      // ignore corrupt localStorage
    }
  }

  // 4. Seed from SURAT_MASTER (last resort)
  // CRITICAL: Always seed if all sources are empty, regardless of lock state.
  // Lock only prevents PUSH to Supabase, not loading data for the UI.
  const seed = buildSeedTemplates();
  _cache = seed;
  await idbReplaceAll("templates", seed).catch(console.warn);

  // 5. Push seed to Supabase (only if NOT locked)
  if (!isStoreLocked("templates")) {
    syncPushAllTemplates(seed).catch(() => {
      console.warn("[template-store] Initial push to Supabase failed — will retry on next save");
    });
  }
}

/** Tambahkan field baru ke template lama yang belum punya (migasi in-place) */
function migrateTemplate(t: SuratTemplate): SuratTemplate {
  const migrated = { ...t };
  if (!migrated.dna_clauses) {
    migrated.dna_clauses = getDnaClauses(t.code);
  }
  if (!migrated.subject_fields) {
    migrated.subject_fields = SUBJECT_FIELDS_PRESETS[t.code] ?? DEFAULT_SUBJECT_FIELDS;
  }
  if (!migrated.closing) {
    migrated.closing = DEFAULT_CLOSING;
  }
  if (!migrated.subject_count) {
    migrated.subject_count = 1;
  }
  if (!migrated.status) {
    migrated.status = "Disetujui";
  }
  return migrated;
}

// ── Sync Read ─────────────────────────────────────────────────────────────────
export function listTemplates(): SuratTemplate[] {
  if (_cache !== null) return _cache;
  if (typeof window === "undefined") return [];
  // Fallback sync: seed sementara (seharusnya init sudah dipanggil)
  return buildSeedTemplates();
}

// ── Write ─────────────────────────────────────────────────────────────────────
export async function saveTemplate(t: SuratTemplate): Promise<void> {
  const all = _cache ?? listTemplates();
  const idx = all.findIndex((x) => x.id === t.id);
  const now = new Date().toISOString();
  const record = idx >= 0 ? { ...t, updated_at: now } : { ...t, created_at: t.created_at || now };
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  _cache = all;
  await idbPut("templates", record).catch(console.warn);
  broadcastTemplateChange();

  // Sync to Cloud
  await syncSaveTemplate(record).catch((err) => {
    console.warn("[template-store] Cloud sync failed (save):", err);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const all = _cache ?? listTemplates();
  const target = all.find((t) => t.id === id);
  if (!target) return;

  _cache = all.filter((t) => t.id !== id);
  await idbDelete("templates", id).catch(console.warn);
  broadcastTemplateChange();

  // Sync to Cloud
  await syncDeleteTemplate(id, target.code).catch((err) => {
    console.warn("[template-store] Cloud sync failed (delete):", err);
  });
}

/**
 * Get template by code (e.g. "SKTM", "SP-KTP") or by UUID id.
 * Called with kode from surat records — searches by code first (the dominant usage),
 * then by id as a fallback (for custom templates that use UUID id).
 */
export function getTemplate(codeOrId: string): SuratTemplate | undefined {
  const list = listTemplates();
  // Priority 1: active approved version for kode lookup (for submissions)
  const activeForCode = getActiveTemplate(codeOrId);
  if (activeForCode && activeForCode.code === codeOrId) return activeForCode;
  // Priority 2: approved version for ID lookup
  const activeForId = list.find((t) => t.id === codeOrId && t.status === "Disetujui");
  if (activeForId) return activeForId;
  // Fallback: first match (legacy behavior)
  return list.find((t) => t.code === codeOrId) ?? list.find((t) => t.id === codeOrId);
}

export async function setTemplateStatus(id: string, patch: Partial<SuratTemplate>): Promise<void> {
  const all = _cache ?? listTemplates();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  _cache = all;
  await idbPut("templates", all[idx]).catch(console.warn);
  broadcastTemplateChange(); // notify other tabs
}

// ── Template Versioning ─────────────────────────────────────────────────────────

/** Get the active (Disetujui) template for a kode — used for submission.
 *  Filters out Draft, Ditolak, Archived versions. */
export function getActiveTemplate(code: string): SuratTemplate | undefined {
  const list = listTemplates();
  // Find all versions of this code, pick the Disetujui one with highest version
  const versions = list.filter((t) => t.code === code && t.status === "Disetujui");
  if (versions.length === 0) {
    // Fallback: any Disetujui template (for legacy data without versioning)
    return list.find((t) => t.code === code && t.status === "Disetujui");
  }
  return versions.reduce((latest, t) => ((t.version ?? 1) > (latest.version ?? 1) ? t : latest));
}

/** Get full version history for a kode (all versions, sorted desc). */
export function getTemplateHistory(code: string): SuratTemplate[] {
  const list = listTemplates();
  return list.filter((t) => t.code === code).sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
}

/** Fork an approved template to create a new draft version.
 *  Called when admin wants to edit an existing template.
 *  The approved template is kept for historical record.
 *  Returns the new draft template. */
export async function forkTemplate(templateId: string): Promise<SuratTemplate> {
  const all = _cache ?? listTemplates();
  const source = all.find((t) => t.id === templateId);
  if (!source) throw new Error(`Template ${templateId} tidak ditemukan`);

  // If source is Draft/Archived, fork from the approved parent
  let parent = source;
  if (source.status !== "Disetujui" && source.parent_version_id) {
    parent = all.find((t) => t.id === source.parent_version_id) ?? source;
  }

  const now = new Date().toISOString();
  const newVersion: SuratTemplate = {
    ...parent,
    id: generateId(),
    status: "Draft",
    version: (parent.version ?? 1) + 1,
    parent_version_id: parent.id,
    approved_by: undefined,
    approved_at: undefined,
    catatan: undefined,
    verified_by: undefined,
    verified_at: undefined,
    sent_to: undefined,
    sent_at: undefined,
    created_at: now,
    updated_at: now,
  };

  // Save draft
  const list = _cache ?? listTemplates();
  list.unshift(newVersion);
  _cache = list;
  await idbPut("templates", newVersion).catch(console.warn);
  broadcastTemplateChange();
  return newVersion;
}

/** Approve a draft template — Super Admin only.
 *  After approval, the template becomes active for submissions.
 *  Previous approved versions are automatically archived. */
export async function approveTemplate(templateId: string, approvedBy: string): Promise<void> {
  const all = _cache ?? listTemplates();
  const idx = all.findIndex((t) => t.id === templateId);
  if (idx < 0) throw new Error(`Template ${templateId} tidak ditemukan`);

  const draft = all[idx];
  if (draft.status !== "Draft") throw new Error("Template bukan status Draft");

  const now = new Date().toISOString();
  // Archive all previous approved versions of this code
  const updatedAll = all.map((t) => {
    if (t.code === draft.code && t.status === "Disetujui" && t.id !== templateId) {
      return { ...t, status: "Archived" as const, updated_at: now };
    }
    return t;
  });

  // Approve the draft
  updatedAll[idx] = {
    ...draft,
    status: "Disetujui" as const,
    approved_by: approvedBy,
    approved_at: now,
    updated_at: now,
  };

  _cache = updatedAll;
  await idbPut("templates", updatedAll[idx]).catch(console.warn);
  // Also update archived versions
  for (const t of updatedAll.filter((t) => t.status === "Archived")) {
    await idbPut("templates", t).catch(console.warn);
  }
  broadcastTemplateChange();
}

/** Reject a draft template. */
export async function rejectTemplate(templateId: string, catatan?: string): Promise<void> {
  const all = _cache ?? listTemplates();
  const idx = all.findIndex((t) => t.id === templateId);
  if (idx < 0) throw new Error(`Template ${templateId} tidak ditemukan`);

  const draft = all[idx];
  if (draft.status !== "Draft") throw new Error("Template bukan status Draft");

  all[idx] = {
    ...draft,
    status: "Ditolak" as const,
    catatan: catatan ?? draft.catatan,
    updated_at: new Date().toISOString(),
  };
  _cache = all;
  await idbPut("templates", all[idx]).catch(console.warn);
  broadcastTemplateChange();
}

export function newBlankTemplate(): SuratTemplate {
  return {
    id: generateId(),
    code: "",
    name: "",
    category: "Surat Keterangan",
    description: "",
    body: "",
    syarat: [],
    fields: [],
    eta: DEFAULT_ETA,
    dna_clauses: [...DEFAULT_DNA_CLAUSE],
    closing: DEFAULT_CLOSING,
    subject_count: 1,
    status: "Draft",
    version: 1,
    parent_version_id: undefined,
    approved_by: undefined,
    approved_at: undefined,
    created_at: new Date().toISOString(),
  };
}

/** Legacy render untuk backward compat */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
