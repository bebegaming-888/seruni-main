// Template Surat store — IndexedDB + in-memory cache.
// listTemplates() tetap sinkron. initTemplateStore() dipanggil async saat mount.

import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";
import { isStoreLocked } from "@/lib/settings-lock";
import { addSyncListener, broadcastTemplateChange } from "@/lib/idb-sync";
import { SURAT_MASTER, type SuratMaster } from "@/data/surat-master";
import { generateId } from "@/lib/utils";
import {
  DNA_CLAUSES_PRESETS,
  SUBJECT_FIELDS_PRESETS,
  DEFAULT_SUBJECT_FIELDS,
} from "@/lib/letter-engine";
import {
  syncPullTemplates,
  syncSaveTemplate,
  syncDeleteTemplate,
  subscribeToTemplates,
} from "@/lib/useSupabaseSync";

type FieldDef = SuratMaster["fields"][number];

export type TemplateStatus =
  | "Draft"
  | "Menunggu Verifikasi"
  | "Diverifikasi"
  | "Disetujui"
  | "Ditolak"
  | "Terkirim";

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
    // Legacy body (kosong, engine akan pakai dna_clauses)
    body: "",
    // DNA Engine
    dna_clauses: DNA_CLAUSES_PRESETS[s.code] ?? [
      "Dengan ini menerangkan bahwa :",
      "adalah benar warga kami yang berdomisili di wilayah Desa {{nama_desa}}, Kecamatan {{nama_kecamatan}}, Kabupaten {{nama_kabupaten}}.",
      "Surat keterangan ini dibuat untuk keperluan yang tertera dalam surat pengajuan.",
    ],
    subject_fields: SUBJECT_FIELDS_PRESETS[s.code] ?? DEFAULT_SUBJECT_FIELDS,
    closing:
      "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
    subject_count: 1,
    status: "Disetujui" as const,
    created_at: new Date().toISOString(),
  }));
}

// ── Async Init ────────────────────────────────────────────────────────────────
export async function initTemplateStore(): Promise<void> {
  if (typeof window === "undefined") return;

  // ── Realtime & Cross-tab Sync ──
  subscribeToTemplates();
  addSyncListener(async (event) => {
    if (event.store === "templates") {
      console.info("[template-store] Sync event received, refreshing cache from IDB...");
      const saved = await idbGetAll<SuratTemplate>("templates");
      _cache = saved.map((t) => migrateTemplate(t));
    }
  });

  try {
    // Coba IndexedDB dulu
    const saved = await idbGetAll<SuratTemplate>("templates");
    if (saved.length > 0) {
      // Migrasi: pastikan field baru ada (backward compat)
      _cache = saved.map((t) => migrateTemplate(t));
      return;
    }

    // Fallback: localStorage lama
    const raw = localStorage.getItem("e_surat_templates");
    if (raw) {
      const parsed = JSON.parse(raw) as SuratTemplate[];
      if (parsed.length > 0) {
        _cache = parsed.map((t) => migrateTemplate(t));
        await idbReplaceAll("templates", _cache); // migrate
        return;
      }
    }

    // ── Supabase Sync (Cloud Source of Truth) ──
    const remote = await syncPullTemplates();
    if (remote.length > 0) {
      _cache = remote;
      await idbReplaceAll("templates", remote).catch(console.warn);
      return;
    }
  } catch (e) {
    console.warn("[template-store] Load gagal, pakai seed:", e);
  }
  // Seed dari SURAT_MASTER HANYA jika tidak di-lock
  if (isStoreLocked("templates")) {
    _cache = [];
    console.info("[template-store] Templates locked — skipping SURAT_MASTER seed");
    return;
  }
  const seed = buildSeedTemplates();
  _cache = seed;
  await idbReplaceAll("templates", seed).catch(console.warn);
}

/** Tambahkan field baru ke template lama yang belum punya (migasi in-place) */
function migrateTemplate(t: SuratTemplate): SuratTemplate {
  const migrated = { ...t };
  if (!migrated.dna_clauses) {
    migrated.dna_clauses = DNA_CLAUSES_PRESETS[t.code] ?? [
      "Dengan ini menerangkan bahwa :",
      "adalah benar warga kami yang berdomisili di wilayah Desa {{nama_desa}}, Kecamatan {{nama_kecamatan}}, Kabupaten {{nama_kabupaten}}.",
      "Surat keterangan ini dibuat untuk keperluan yang tertera dalam surat pengajuan.",
    ];
  }
  if (!migrated.subject_fields) {
    migrated.subject_fields = SUBJECT_FIELDS_PRESETS[t.code] ?? DEFAULT_SUBJECT_FIELDS;
  }
  if (!migrated.closing) {
    migrated.closing =
      "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.";
  }
  if (!migrated.subject_count) {
    migrated.subject_count = 1;
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
  return list.find((t) => t.code === codeOrId) ?? list.find((t) => t.id === codeOrId);
}

export async function setTemplateStatus(id: string, patch: Partial<SuratTemplate>): Promise<void> {
  const all = _cache ?? listTemplates();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  _cache = all;
  await idbPut("templates", all[idx]).catch(console.warn);
}

export function newBlankTemplate(): SuratTemplate {
  return {
    id: generateId(),
    code: "",
    name: "",
    category: "Surat Keterangan",
    description: "",
    syarat: [],
    fields: [],
    eta: "1 hari kerja",
    body: "",
    dna_clauses: [
      "Dengan ini menerangkan bahwa :",
      "adalah benar warga kami yang berdomisili di wilayah Desa {{nama_desa}}, Kecamatan {{nama_kecamatan}}, Kabupaten {{nama_kabupaten}}.",
      "Surat keterangan ini dibuat untuk keperluan yang tertera dalam surat pengajuan.",
    ],
    subject_fields: DEFAULT_SUBJECT_FIELDS,
    closing:
      "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
    subject_count: 1,
    status: "Draft",
    created_at: new Date().toISOString(),
  };
}

/** Legacy render untuk backward compat */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
