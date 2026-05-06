// Template Surat store — IndexedDB + in-memory cache.
// listTemplates() tetap sinkron. initTemplateStore() dipanggil async saat mount.

import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";
import { SURAT_MASTER, type SuratMaster } from "@/data/surat-master";

type FieldDef = SuratMaster["fields"][number];

export type TemplateStatus =
  | "Draft"
  | "Menunggu Verifikasi"
  | "Diverifikasi"
  | "Disetujui"
  | "Ditolak"
  | "Terkirim";

export type TemplateField = FieldDef & { enabled?: boolean };

export type SuratTemplate = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  syarat: string[];
  fields: TemplateField[];
  eta: string;
  body: string;
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

function buildDefaultBody(s: SuratMaster): string {
  const identityFields = [
    { key: "nama", label: "Nama" },
    { key: "nik", label: "NIK" },
    { key: "tempat_lahir", label: "Tempat Lahir" },
    { key: "tanggal_lahir", label: "Tanggal Lahir" },
    { key: "jenis_kelamin", label: "Jenis Kelamin" },
    { key: "alamat", label: "Alamat" },
  ];
  const otherFields = s.fields
    .filter((f) => f.required && !identityFields.some((id) => id.key === f.key))
    .map((f) => `  - {{${f.key}}}: {{${f.label}-placeholder}}`);
  return (
    `PEMERINTAH DESA SERUNI MUMBUL\nKecamatan Pringgabaya — Kabupaten Lombok Timur\n\n` +
    `${s.name.toUpperCase()}\nNomor: {{no}}\n\n` +
    `Yang bertanda tangan di bawah ini, Kepala Desa Seruni Mumbul, keterangan:\n\n` +
    identityFields.map((f) => `${f.label.padEnd(16)}: {{${f.key}}}`).join("\n") +
    (otherFields.length ? "\n" + otherFields.join("\n") : "") +
    `\n\nDemikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.\n\n` +
    `Seruni Mumbul, {{tanggal}}\nKepala Desa,\n\n\n( ......................... )`
  );
}

function buildSeedTemplates(): SuratTemplate[] {
  return Object.values(SURAT_MASTER).map((s) => ({
    id: crypto.randomUUID(),
    code: s.code,
    name: s.name,
    category: s.category,
    description: s.description,
    syarat: s.syarat,
    fields: s.fields.map((f) => ({ ...f, enabled: true })),
    eta: s.eta,
    body: buildDefaultBody(s),
    status: "Disetujui" as const,
    created_at: new Date().toISOString(),
  }));
}

// ── Async Init ────────────────────────────────────────────────────────────────
export async function initTemplateStore(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // Coba IndexedDB dulu
    const saved = await idbGetAll<SuratTemplate>("templates");
    if (saved.length > 0) {
      _cache = saved;
      return;
    }

    // Fallback: localStorage lama
    const raw = localStorage.getItem("e_surat_templates");
    if (raw) {
      const parsed = JSON.parse(raw) as SuratTemplate[];
      if (parsed.length > 0) {
        _cache = parsed;
        await idbReplaceAll("templates", parsed); // migrate
        return;
      }
    }
  } catch (e) {
    console.warn("[template-store] Load gagal, pakai seed:", e);
  }
  // Seed dari SURAT_MASTER
  const seed = buildSeedTemplates();
  _cache = seed;
  await idbReplaceAll("templates", seed).catch(console.warn);
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
}

export async function deleteTemplate(id: string): Promise<void> {
  _cache = (_cache ?? listTemplates()).filter((t) => t.id !== id);
  await idbDelete("templates", id).catch(console.warn);
}

export function getTemplate(id: string): SuratTemplate | undefined {
  return listTemplates().find((t) => t.id === id);
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
    id: crypto.randomUUID(),
    code: "",
    name: "",
    category: "Surat Keterangan",
    description: "",
    syarat: [],
    fields: [],
    eta: "1 hari kerja",
    body: "",
    status: "Draft",
    created_at: new Date().toISOString(),
  };
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
