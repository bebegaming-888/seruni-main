/**
 * scripts/rebuild-layouts.ts
 * Deletes all existing letter_layouts and recreates with FULL system integration.
 *
 * Run: node --env-file=.dev.vars scripts/rebuild-layouts.ts
 */

require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Load SURAT_MASTER ───────────────────────────────────────────────────────

function loadSuratMaster() {
  const filePath = path.join(__dirname, "../src/data/surat-master.ts");
  const content = fs.readFileSync(filePath, "utf8");
  // Extract just the codes
  const codes = [];
  const re = /^\s{2}(\w+):\s*\{/gm;
  let m;
  while ((m = re.exec(content)) !== null) codes.push(m[1]);
  console.log(`Loaded ${codes.length} surat codes from SURAT_MASTER`);
  return codes;
}

// ── Fetch system data from DB ────────────────────────────────────────────────

async function fetchSystemData() {
  console.log("\nFetching system data...");

  // Fetch WILAYAH table (source of truth for village hierarchy)
  const { data: wilayahRows } = await sb
    .from("wilayah")
    .select("level, kode, nama, data")
    .eq("is_active", true)
    .order("position");

  const wilayahMap = {};
  wilayahRows?.forEach((w) => {
    wilayahMap[w.level] = w;
  });

  const getWilayahData = (level) => {
    const w = wilayahMap[level];
    if (!w) return {};
    return typeof w.data === "string" ? JSON.parse(w.data) : w.data || {};
  };

  const provinsi = wilayahMap["provinsi"];
  const kabupaten = wilayahMap["kabupaten"];
  const kecamatan = wilayahMap["kecamatan"];
  const desa = wilayahMap["desa"];

  // App settings for fallback
  const { data: settings } = await sb.from("app_settings").select("key, value");
  const settingsMap = {};
  settings?.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  // Active signers
  const { data: signers } = await sb
    .from("letter_signers")
    .select("id, role, title, name, nip, position_order")
    .eq("is_active", true)
    .order("position_order");

  const village = {
    name: desa?.nama || settingsMap.village_name || "Desa Seruni Mumbul",
    address:
      getWilayahData("desa").alamat ||
      settingsMap.village_address ||
      "Jl. Raya Seruni Mumbul No. 1",
    phone: getWilayahData("desa").telepon || settingsMap.village_phone || "(0361) 123456",
    email: getWilayahData("desa").email || settingsMap.village_email || "info@seruni-mumbul.id",
    kecamatan:
      kecamatan?.nama?.replace(/^KECAMATAN\s+/i, "") || settingsMap.kecamatan || "Kecamatan Seruni",
    kabupaten:
      kabupaten?.nama?.replace(/^KABUPATEN\s+/i, "") || settingsMap.kabupaten || "Kabupaten Badung",
    provinsi: provinsi?.nama?.replace(/^PROVINSI\s+/i, "") || settingsMap.provinsi || "Bali",
    kode_pos: getWilayahData("desa").kode_pos || settingsMap.kode_pos || "80361",
  };

  // Main settings for branding
  const { data: mainSettingsRow } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "main_settings")
    .single();
  let mainSettings = {};
  if (mainSettingsRow?.value) {
    mainSettings =
      typeof mainSettingsRow.value === "string"
        ? JSON.parse(mainSettingsRow.value)
        : mainSettingsRow.value;
  }
  const primaryColor = mainSettings?.branding?.primary_color || "#E37222";

  console.log(`  Village: ${village.name}, ${village.kecamatan}, ${village.kabupaten}`);
  console.log(`  Signers: ${signers?.length ?? 0}`);
  console.log(`  Primary color: ${primaryColor}`);

  return { village, signers: signers ?? [], primaryColor };
}

// ── Section factories ─────────────────────────────────────────────────────

function kopSection(village, color) {
  return {
    id: "kop-default",
    type: "kop",
    enabled: true,
    order: 1,
    config: {
      logo_position: "separate",
      logo_size: 60,
      kop_lines: [
        {
          text: `PEMERINTAH KABUPATEN ${village.kabupaten.toUpperCase()}`,
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
          text: `Telp: ${village.phone}  |  Email: ${village.email}`,
          font_size: 9,
          font_weight: "normal",
          align: "center",
        },
      ],
      show_border_bottom: true,
      border_style: "double",
      header_color: color,
    },
  };
}

function titleSection(kodeKlasifikasi) {
  return {
    id: "title-default",
    type: "title",
    enabled: true,
    order: 2,
    config: {
      format: "uppercase",
      show_nomor: true,
      nomor_format: `${kodeKlasifikasi}/{no_urut}/KDS.SRMB/{bulan_romawi}/{tahun}`,
      show_perihal: false,
      purview_label: "Perihal",
      align: "center",
      underline: false,
      font_weight: "bold",
    },
  };
}

function pembukaSection(village, signer) {
  const signerTitle = signer?.title ?? "Kepala Desa Seruni Mumbul";
  return {
    id: "pembuka-default",
    type: "pembuka",
    enabled: true,
    order: 3,
    config: {
      text: `Yang bertanda tangan di bawah ini,\n${signerTitle}\n${village.name}\nKecamatan ${village.kecamatan}\nKabupaten ${village.kabupaten},\nmenerangkan bahwa:`,
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

function subjectSection() {
  return {
    id: "subject-default",
    type: "subject",
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

function bodySection(clauses) {
  return {
    id: "body-default",
    type: "body",
    enabled: true,
    order: 5,
    config: {
      clauses_source: clauses.length ? "static" : "template",
      static_clauses: clauses.length ? clauses : getDefaultClauses(),
      format: "plain",
      numbering_style: "1.",
      indent_level: 0,
      clause_spacing: 8,
    },
  };
}

function getDefaultClauses() {
  return [
    "Nama        : {{nama}}",
    "NIK         : {{nik}}",
    "Tempat/Tgl Lahir : {{tempat_tanggal_lahir}}",
    "Jenis Kelamin : {{jenis_kelamin}}",
    "Pekerjaan   : {{pekerjaan}}",
    "Agama       : {{agama}}",
    "Alamat      : {{alamat}}",
    "",
    "Yang tersebut di atas adalah benar warga kami dan berdasarkan data yang ada di sistem kami, ",
    "informasi yang diberikan adalah benar. Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ];
}

function closingSection(village) {
  return {
    id: "closing-default",
    type: "closing",
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

function signatureSection(village, signers) {
  const kades = signers.find((s) => s.role === "kepala_desa") ?? signers[0];
  return {
    id: "signature-default",
    type: "signature",
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
          title: kades?.title ?? "Kepala Desa Seruni Mumbul",
          show_name: true,
          show_title: true,
          show_nip: true,
          show_stamp: true,
          name_source: "signer.name",
          title_source: "signer.title",
          nip_source: "signer.nip",
          ttd_label: kades?.title ?? "Kepala Desa",
        },
      ],
      signature_height: 60,
      show_materai: false,
      materai_position: "right",
    },
  };
}

function qrSection() {
  return {
    id: "qr-default",
    type: "qr",
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

function footerSection(village) {
  return {
    id: "footer-default",
    type: "footer",
    enabled: false,
    order: 9,
    config: {
      text: `${village.name}  |  ${village.address}  |  Telp: ${village.phone}`,
      align: "center",
      font_size: 8,
      show_page_number: true,
    },
  };
}

function buildStyle(primaryColor) {
  return {
    font_family: "Times New Roman, Times, serif",
    font_size_body: 11,
    font_size_title: 13,
    font_size_header: 14,
    line_height: 1.6,
    text_color: "#1a1918",
    margins: { top: 20, bottom: 15, left: 20, right: 15 },
    header_color: primaryColor,
    paper_size: "A4",
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function rebuild() {
  console.log("============================================================");
  console.log("REBUILD letter_layouts — Full System Integration");
  console.log("============================================================");

  const suratCodes = loadSuratMaster();
  const { village, signers, primaryColor } = await fetchSystemData();

  console.log(`\nDeleting all existing layouts...`);
  const { error: delErr } = await sb
    .from("letter_layouts")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    // Try alternative delete approach
    const { data: existing } = await sb.from("letter_layouts").select("id");
    for (const l of existing ?? []) {
      await sb.from("letter_layouts").delete().eq("id", l.id);
    }
    console.log(`  Deleted ${existing?.length ?? 0} existing layouts`);
  } else {
    console.log("  All layouts deleted");
  }

  console.log(`\nCreating ${suratCodes.length} layouts with full integration...`);

  // Fetch all surat_types
  const { data: suratTypes } = await sb
    .from("surat_types")
    .select("code, name, kode_klasifikasi, dna_clauses");

  let created = 0,
    errors = 0;
  const batchSize = 10;

  for (let i = 0; i < suratCodes.length; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, suratCodes.length); j++) {
      const code = suratCodes[j];
      const suratType = suratTypes?.find((s) => s.code === code);
      const kodeKlasifikasi = suratType?.kode_klasifikasi || "474";

      // Get DNA clauses from database
      let dnaClauses = [];
      try {
        const raw = suratType?.dna_clauses;
        if (Array.isArray(raw)) dnaClauses = raw;
        else if (typeof raw === "string" && raw.startsWith("[")) dnaClauses = JSON.parse(raw);
      } catch {
        dnaClauses = [];
      }

      batch.push({
        surat_type_code: code,
        name: `Layout ${suratType?.name ?? code}`,
        description: `${village.name} — ${kodeKlasifikasi} — default layout`,
        sections: [
          kopSection(village, primaryColor),
          titleSection(kodeKlasifikasi),
          pembukaSection(village, signers[0] ?? null),
          subjectSection(),
          bodySection(dnaClauses),
          closingSection(village),
          signatureSection(village, signers),
          qrSection(),
          footerSection(village),
        ],
        style: buildStyle(primaryColor),
        version: 1,
        status: "active",
        is_default: true,
      });
    }

    const { error: insErr } = await sb.from("letter_layouts").insert(batch);
    if (insErr) {
      console.error(`  Batch ${Math.floor(i / batchSize) + 1} ERROR: ${insErr.message}`);
      errors += batch.length;
    } else {
      process.stdout.write(
        `  ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} layouts\n`,
      );
      created += batch.length;
    }
  }

  console.log("\n============================================================");
  console.log("REBUILD COMPLETE!");
  console.log(`  Created: ${created}`);
  console.log(`  Errors:  ${errors}`);
  console.log("============================================================");
  console.log("\nIntegrated data:");
  console.log(`  Village: ${village.name}, ${village.kecamatan}, ${village.kabupaten}`);
  console.log(`  Address: ${village.address}`);
  console.log(`  Phone/Email: ${village.phone} / ${village.email}`);
  console.log(`  Signers: ${signers.length}`);
  signers.forEach((s) => console.log(`    - ${s.role}: ${s.name} (${s.title})`));
  console.log(`  Primary color: ${primaryColor}`);
}

rebuild()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  });
