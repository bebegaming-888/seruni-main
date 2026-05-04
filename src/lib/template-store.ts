// Template Surat store (localStorage). Seeded from SURAT_MASTER (73 jenis).
import { SURAT_MASTER, type SuratMaster } from "@/data/surat-master";

type FieldDef = SuratMaster["fields"][number];

const KEY = "e_surat_templates";

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
  body: string; // template body with {{placeholder}} tokens
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

const DEFAULT_BODY = (s: SuratMaster) =>
  `PEMERINTAH DESA SERUNI MUMBUL\nKecamatan Pringgabaya — Kabupaten Lombok Timur\n\n${s.name.toUpperCase()}\nNomor: {{no}}\n\nYang bertanda tangan di bawah ini, Kepala Desa Seruni Mumbul, menerangkan bahwa:\n\nNama        : {{nama}}\nNIK         : {{nik}}\nTempat/Tgl  : {{tempat_lahir}}, {{tanggal_lahir}}\nAlamat      : {{alamat}}\n\nAdalah benar warga kami dan surat ini dibuat untuk keperluan: {{keperluan}}.\n\nDemikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.\n\nSeruni Mumbul, {{tanggal}}\nKepala Desa,\n\n\n( ......................... )`;

function read(): SuratTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v) as SuratTemplate[];
  } catch {
    // localStorage unreadable — proceed to seed
  }
  // seed
  const seed: SuratTemplate[] = Object.values(SURAT_MASTER).map((s) => ({
    id: crypto.randomUUID(),
    code: s.code,
    name: s.name,
    category: s.category,
    description: s.description,
    syarat: s.syarat,
    fields: s.fields.map((f) => ({ ...f, enabled: true })),
    eta: s.eta,
    body: DEFAULT_BODY(s),
    status: "Disetujui" as const,
    created_at: new Date().toISOString(),
  }));
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function write(list: SuratTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listTemplates(): SuratTemplate[] {
  return read();
}

export function saveTemplate(t: SuratTemplate) {
  const all = read();
  const idx = all.findIndex((x) => x.id === t.id);
  const now = new Date().toISOString();
  if (idx >= 0) all[idx] = { ...t, updated_at: now };
  else all.unshift({ ...t, created_at: t.created_at || now });
  write(all);
}

export function deleteTemplate(id: string) {
  write(read().filter((t) => t.id !== id));
}

export function getTemplate(id: string): SuratTemplate | undefined {
  return read().find((t) => t.id === id);
}

export function setTemplateStatus(id: string, patch: Partial<SuratTemplate>) {
  const all = read();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  write(all);
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
