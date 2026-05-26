/**
 * scripts/migrate-layouts.ts
 *
 * Migrates all 74 surat types to the letter layout system.
 * Auto-integrates: village data, signers, surat types, DNA clauses.
 *
 * Run: node --env-file=.dev.vars scripts/migrate-layouts.ts
 * Or:  bun run scripts/migrate-layouts.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load env from .dev.vars ──────────────────────────────────────────────────

const devVarsPath = path.join(__dirname, "../.dev.vars");
if (fs.existsSync(devVarsPath)) {
  const content = fs.readFileSync(devVarsPath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .dev.vars");
  process.exit(1);
}

// ── Supabase client ─────────────────────────────────────────────────────────

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Load SURAT_MASTER from src/data/surat-master.ts ─────────────────────────

interface SuratMaster {
  code: string;
  name: string;
  category: string;
  wewenang?: boolean;
  description?: string;
  eta?: string;
  fields?: Array<{ key: string; label: string }>;
  dna_clauses?: string[];
  note?: string;
}

let SURAT_MASTER: Record<string, SuratMaster> = {};

function loadSuratMaster() {
  const filePath = path.join(__dirname, "../src/data/surat-master.ts");
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/export const SURAT_MASTER[^=]*=\s*(\{[\s\S]*?\n\};)/);
  if (!match) {
    console.error("Could not parse SURAT_MASTER");
    return;
  }

  const jsonStr = match[1]
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/`([^`]*)`/g, '"$1"');

  try {
    // Safe parsing: strip all JS comments + enforce JSON structure
    const sanitized = jsonStr
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"')
      .replace(/`([^`]*)`/g, '"$1"');
    SURAT_MASTER = JSON.parse(sanitized);
    console.log(`Loaded ${Object.keys(SURAT_MASTER).length} surat types from SURAT_MASTER`);
  } catch (e) {
    // Fallback: extract just codes
    const codes = content.match(/^\s+(\w+):\s*\{/gm)?.map((m) => m.trim().split(":")[0]) ?? [];
    console.log(`Could not parse SURAT_MASTER (fallback: ${codes.length} codes)`);
    codes.forEach((code) => {
      SURAT_MASTER[code] = { code, name: `Surat ${code}`, category: "Keterangan" };
    });
  }
}

// ── System Data Types ────────────────────────────────────────────────────────

interface VillageData {
  name: string;
  address: string;
  phone: string;
  email: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_pos: string;
}

interface Signer {
  id: string;
  role: string;
  title: string;
  name: string;
  nip: string;
}

interface SystemData {
  village: VillageData;
  signers: Signer[];
}

// ── Fetch System Data ────────────────────────────────────────────────────────

async function fetchSystemData(): Promise<SystemData> {
  console.log("Fetching system data from database...");

  // Fetch app settings
  const { data: settings } = await sb.from("app_settings").select("key, value");
  const settingsMap: Record<string, string> = {};
  settings?.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  // Fetch active signers
  const { data: signers } = await sb
    .from("letter_signers")
    .select("id, role, title, name, nip")
    .eq("is_active", true)
    .order("position_order");

  const village: VillageData = {
    name: settingsMap.village_name || "Desa Seruni Mumbul",
    address: settingsMap.village_address || "Jl. Raya Seruni Mumbul No. 1",
    phone: settingsMap.village_phone || "(0361) 123456",
    email: settingsMap.village_email || "info@seruni-mumbul.id",
    kecamatan: extractSetting(settingsMap, "kecamatan") || "Kecamatan Seruni",
    kabupaten: extractSetting(settingsMap, "kabupaten") || "Kabupaten Badung",
    provinsi: extractSetting(settingsMap, "provinsi") || "Bali",
    kode_pos: extractSetting(settingsMap, "kode_pos") || "80361",
  };

  console.log(`  Village: ${village.name}, ${village.kecamatan}, ${village.kabupaten}`);
  console.log(`  Signers: ${signers?.length ?? 0}`);

  return {
    village,
    signers: signers ?? [],
  };
}

function extractSetting(map: Record<string, string>, key: string): string {
  const val = map[key];
  if (!val) return "";
  if (val.startsWith("{")) {
    try {
      return JSON.parse(val)[key] ?? "";
    } catch {
      return "";
    }
  }
  return val;
}

// ── Section Factories (with system data integration) ─────────────────────────

function createKopSection(village: VillageData, primaryColor: string) {
  return {
    id: "kop-default",
    type: "kop" as const,
    enabled: true,
    order: 1,
    config: {
      logo_position: "separate",
      logo_size: 60,
      kop_lines: [
        {
          text: `PEMERINTAH ${village.kabupaten.toUpperCase()}`,
          font_size: 13,
          font_weight: "bold",
          align: "center",
        },
        {
          text: village.kecamatan.toUpperCase(),
          font_size: 12,
          font_weight: "bold",
          align: "center",
        },
        { text: village.name.toUpperCase(), font_size: 14, font_weight: "bold", align: "center" },
        { text: village.address, font_size: 10, font_weight: "normal", align: "center" },
        {
          text: `Telp: ${village.phone} | Email: ${village.email}`,
          font_size: 9,
          font_weight: "normal",
          align: "center",
        },
      ],
      show_border_bottom: true,
      border_style: "double",
      header_color: primaryColor || "#E37222",
    },
  };
}

function createTitleSection(kodeKlasifikasi: string) {
  return {
    id: "title-default",
    type: "title" as const,
    enabled: true,
    order: 2,
    config: {
      format: "uppercase",
      show_nomor: true,
      nomor_format: `${kodeKlasifikasi || "474"}/{no_urut}/${"[SIGNA_DESA]".replace("[SIGNA_DESA]", "KDS.SRMB")}/{bulan_romawi}/{tahun}`,
      show_perihal: false,
      purview_label: "Perihal",
      align: "center",
      underline: false,
      font_weight: "bold",
    },
  };
}

function createPembukaSection(village: VillageData, primarySigner: Signer | null) {
  return {
    id: "pembuka-default",
    type: "pembuka" as const,
    enabled: true,
    order: 3,
    config: {
      text: `Yang bertanda tangan di bawah ini,\n${primarySigner?.title ?? "Kepala Desa"}\n${village.name}\nKecamatan ${village.kecamatan}\n Kabupaten ${village.kabupaten},\nmenerangkan bahwa:`,
      show_signer_table: true,
      signer_fields: [
        { label: "Nama", value_source: "signer.name" },
        { label: "Jabatan", value_source: "signer.title" },
        { label: "Desa", value_source: "village.name" },
        { label: "Kecamatan", value_source: "village.kecamatan" },
      ],
      font_size: 11,
    },
  };
}

function createSubjectSection() {
  return {
    id: "subject-default",
    type: "subject" as const,
    enabled: true,
    order: 4,
    config: {
      title: "Menerangkan bahwa :",
      fields: [],
      label_format: "{label}    : {value}",
      layout: "table",
      label_width: 25,
      separator: "    : ",
    },
  };
}

function createBodySection(dnaClauses: string[], suratCode: string) {
  // Build clauses from SURAT_MASTER if available
  const master = SURAT_MASTER[suratCode];
  let clauses = dnaClauses;

  if (!clauses || clauses.length === 0) {
    // Try to build from fields
    if (master?.fields) {
      clauses = buildDNASnippets(suratCode, master);
    }
  }

  return {
    id: "body-default",
    type: "body" as const,
    enabled: true,
    order: 5,
    config: {
      clauses_source: clauses.length ? "static" : "template",
      static_clauses: clauses.length ? clauses : getDefaultClauses(suratCode),
      format: "plain",
      numbering_style: "1.",
      indent_level: 0,
      clause_spacing: 8,
    },
  };
}

function buildDNASnippets(code: string, master: SuratMaster): string[] {
  const lines: string[] = [];
  const fields = master.fields ?? [];

  if (fields.length > 0) {
    lines.push("Dengan ini menyatakan bahwa :");
    fields.slice(0, 8).forEach((f) => {
      lines.push(`${f.label}    : {{${f.key}}}`);
    });
  }

  if (!master.note?.includes("DISINGKAT")) {
    lines.push(`Surat keterangan ini dibuat untuk keperluan {{keperluan}}.`);
  }

  return lines;
}

function getDefaultClauses(code: string): string[] {
  // Generic default clauses based on category
  const defaults: Record<string, string[]> = {
    default: [
      "Dengan ini menyatakan bahwa :",
      "Nama        : {{nama}}",
      "NIK         : {{nik}}",
      "Alamat      : {{alamat}}",
      "",
      "Yang bersangkutan adalah benar warga kami dan berdasarkan data yang ada di sistem kami, informasi yang disampaikan adalah benar.",
      "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
    ],
  };
  return defaults.default;
}

function createClosingSection(village: VillageData) {
  return {
    id: "closing-default",
    type: "closing" as const,
    enabled: true,
    order: 6,
    config: {
      text: "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
      show_date: true,
      date_format: `${village.name}, {tanggal} {bulan} {tahun}`,
      align: "left",
    },
  };
}

function createSignatureSection(village: VillageData, signers: Signer[]) {
  const kepalaDesa = signers.find((s) => s.role === "kepala_desa") ?? signers[0];

  return {
    id: "signature-default",
    type: "signature" as const,
    enabled: true,
    order: 7,
    config: {
      layout: "two_column",
      columns: [
        {
          party: "pemohon",
          title: "Yang Bersangkutan",
          show_name: true,
          show_title: false,
          show_nip: false,
          show_stamp: false,
          name_source: "form_data.nama",
          title_source: "custom:Pemohon",
          nip_source: "",
          ttd_label: "Yang Bersangkutan",
        },
        {
          party: "signer",
          title: kepalaDesa?.title ?? "Kepala Desa Seruni Mumbul",
          show_name: true,
          show_title: true,
          show_nip: true,
          show_stamp: true,
          name_source: "signer.name",
          title_source: "signer.title",
          nip_source: "signer.nip",
          ttd_label: kepalaDesa?.title ?? "Kepala Desa",
        },
      ],
      signature_height: 60,
      show_materai: false,
      materai_position: "right",
    },
  };
}

function createQRSection() {
  return {
    id: "qr-default",
    type: "qr" as const,
    enabled: true,
    order: 8,
    config: {
      position: "bottom_left",
      size: 80,
      show_verification_text: true,
      verification_text: "Scan untuk verifikasi surat",
      verification_url_template: "/verifikasi/{nomor_surat}",
    },
  };
}

function createFooterSection(village: VillageData) {
  return {
    id: "footer-default",
    type: "footer" as const,
    enabled: false,
    order: 9,
    config: {
      text: `${village.name} — ${village.address} | Telp: ${village.phone}`,
      align: "center",
      font_size: 8,
      show_page_number: true,
    },
  };
}

function createStyle(settings: any, primaryColor: string) {
  const pdfLayout = settings?.pdfLayout ?? {};
  return {
    font_family: pdfLayout.body_font ?? "Times New Roman, Times, serif",
    font_size_body: pdfLayout.body_font_size ?? 11,
    font_size_title: 13,
    font_size_header: 14,
    line_height: 1.6,
    text_color: "#1a1918",
    margins: { top: 20, bottom: 15, left: 20, right: 15 },
    header_color: primaryColor || "#E37222",
    paper_size: "A4",
  };
}

// ── Main Migration ───────────────────────────────────────────────────────────

async function migrate() {
  console.log("=".repeat(60));
  console.log("Migration: letter_layouts (fully integrated)");
  console.log("=".repeat(60) + "\n");

  // 0. Load SURAT_MASTER
  loadSuratMaster();

  // 1. Fetch system data
  const { village, signers } = await fetchSystemData();

  // 2. Fetch app settings for branding
  const { data: settingsRow } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "main_settings")
    .single();

  let settings = {};
  if (settingsRow?.value) {
    settings =
      typeof settingsRow.value === "string" ? JSON.parse(settingsRow.value) : settingsRow.value;
  }

  const primaryColor = (settings as any)?.branding?.primary_color ?? "#E37222";
  console.log(`  Primary color: ${primaryColor}\n`);

  // 3. Fetch all surat types from database
  let { data: suratTypes, error: stErr } = await sb
    .from("surat_types")
    .select("code, name, kode_klasifikasi, dna_clauses");

  if (stErr && stErr.code === "42703") {
    console.log("Column 'dna_clauses' not found, retrying...");
    const retry = await sb.from("surat_types").select("code, name, kode_klasifikasi, dna_clauses");
    suratTypes = retry.data ?? null;
    stErr = retry.error;
  }

  if (stErr || !suratTypes) {
    console.error("FATAL:", stErr?.message ?? "null data");
    process.exit(1);
  }

  console.log(`Found ${suratTypes!.length} surat types in database.\n`);

  // 4. Fetch existing layouts
  const { data: existingLayouts } = await sb
    .from("letter_layouts")
    .select("surat_type_code, status");

  const existingCodes = new Set(
    (existingLayouts ?? []).filter((l) => l.status === "active").map((l) => l.surat_type_code),
  );

  console.log(`Existing active layouts: ${existingCodes.size}\n`);

  // 5. Process each surat type
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const surat of suratTypes!) {
    process.stdout.write(`  ${surat.code}... `);

    if (existingCodes.has(surat.code)) {
      process.stdout.write("SKIP (active layout exists)\n");
      skipped++;
      continue;
    }

    // Get kode_klasifikasi from surat_types
    const kodeKlasifikasi = (surat as any).kode_klasifikasi || "474";

    // Get DNA clauses from database
    let dnaClauses: string[] = [];
    try {
      const raw = (surat as any).dna_clauses;
      if (Array.isArray(raw)) dnaClauses = raw;
      else if (typeof raw === "string" && raw.startsWith("[")) dnaClauses = JSON.parse(raw);
    } catch {
      dnaClauses = [];
    }

    // Build sections with system data
    const sections = [
      createKopSection(village, primaryColor),
      createTitleSection(kodeKlasifikasi),
      createPembukaSection(village, signers[0] ?? null),
      createSubjectSection(),
      createBodySection(dnaClauses, surat.code),
      createClosingSection(village),
      createSignatureSection(village, signers),
      createQRSection(),
      createFooterSection(village),
    ];

    const layout = {
      surat_type_code: surat.code,
      name: `Layout ${surat.name}`,
      description: `Default layout for ${surat.code} — ${surat.name}. Village: ${village.name}, Klasifikasi: ${kodeKlasifikasi}`,
      sections,
      style: createStyle(settings, primaryColor),
      version: 1,
      status: "active",
      is_default: true,
    };

    const { error: insertErr } = await sb.from("letter_layouts").insert(layout);

    if (insertErr) {
      process.stdout.write(`ERROR: ${insertErr.message}\n`);
      errors++;
    } else {
      process.stdout.write("CREATED\n");
      created++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Migration complete!");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
  console.log("=".repeat(60));
  console.log("");
  console.log("System data integrated:");
  console.log(`  Village: ${village.name}, ${village.kecamatan}, ${village.kabupaten}`);
  console.log(
    `  Signers: ${signers.length} (kepala_desa: ${signers.find((s) => s.role === "kepala_desa")?.name ?? "N/A"})`,
  );
  console.log(`  Primary color: ${primaryColor}`);

  if (errors > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
