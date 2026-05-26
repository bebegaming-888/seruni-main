/**
 * Create letter_layouts tables programmatically via Supabase client
 * Usage: node --env-file=.dev.vars scripts/create-tables-programmatic.js
 */

require("dotenv").config({ path: ".dev.vars" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAndCreateTables() {
  console.log("============================================================");
  console.log("Checking and creating letter_layouts tables");
  console.log("============================================================");
  console.log(`Target: ${SUPABASE_URL}\n`);

  // Check if surat_types exists
  console.log("1. Checking surat_types table...");
  const { data: suratTypes, error: stErr } = await sb.from("surat_types").select("code").limit(1);

  if (stErr) {
    console.error("   ❌ surat_types table not found");
    console.error("   Error:", stErr.message);
    console.log("\n   Please apply migration 015_surat_types.sql first via:");
    console.log("   - Supabase Dashboard → SQL Editor");
    console.log("   - Copy contents of supabase/migrations/015_surat_types.sql");
    console.log("   - Paste and run in SQL Editor\n");
    return false;
  }

  console.log("   ✅ surat_types table exists");

  // Check if letter_signers exists
  console.log("\n2. Checking letter_signers table...");
  const { data: signers, error: sigErr } = await sb.from("letter_signers").select("id").limit(1);

  if (sigErr) {
    console.error("   ❌ letter_signers table not found");
    console.log("   Creating seed data via INSERT...");

    // Insert default signers
    const defaultSigners = [
      {
        role: "kepala_desa",
        title: "Kepala Desa Seruni Mumbul",
        name: "H. SUMARDI, S.Sos.",
        nip: "196512311985031023",
        position_order: 1,
        is_active: true,
      },
      {
        role: "sekretaris_desa",
        title: "Sekretaris Desa Seruni Mumbul",
        name: "MUHAMMAD YUSUF, S.Sos.",
        nip: "197001011990031005",
        position_order: 2,
        is_active: true,
      },
      {
        role: "kaur_pemerintahan",
        title: "Kaur Pemerintahan",
        name: "AHMAD FAUZI, S.AP.",
        nip: "198505152010011008",
        position_order: 3,
        is_active: true,
      },
    ];

    const { error: insertErr } = await sb.from("letter_signers").insert(defaultSigners);

    if (insertErr) {
      console.error("   ⚠️  Could not insert signers:", insertErr.message);
      console.log("   Table might not exist. Please apply migration 057_letter_layouts.sql");
    } else {
      console.log("   ✅ Default signers created");
    }
  } else {
    console.log("   ✅ letter_signers table exists");
  }

  // Check if rejection_reasons exists
  console.log("\n3. Checking rejection_reasons table...");
  const { data: reasons, error: rrErr } = await sb.from("rejection_reasons").select("id").limit(1);

  if (rrErr) {
    console.error("   ❌ rejection_reasons table not found");
    console.log("   Creating seed data via INSERT...");

    const defaultReasons = [
      {
        code: "DATA_TIDAK_LENGKAP",
        reason: "Data tidak lengkap",
        category: "dokumen",
        position_order: 1,
        is_active: true,
      },
      {
        code: "DOKUMEN_TIDAK_SAH",
        reason: "Dokumen pendukung tidak sah",
        category: "dokumen",
        position_order: 2,
        is_active: true,
      },
      {
        code: "TIDAK_SESUAI_SYARAT",
        reason: "Tidak memenuhi syarat",
        category: "persyaratan",
        position_order: 3,
        is_active: true,
      },
      {
        code: "DATA_TIDAK_VALID",
        reason: "Data tidak valid/tidak sesuai",
        category: "data",
        position_order: 4,
        is_active: true,
      },
      {
        code: "DUPLIKAT",
        reason: "Pengajuan duplikat",
        category: "sistem",
        position_order: 5,
        is_active: true,
      },
      {
        code: "LAINNYA",
        reason: "Alasan lainnya (lihat catatan)",
        category: "lainnya",
        position_order: 6,
        is_active: true,
      },
    ];

    const { error: insertErr } = await sb.from("rejection_reasons").insert(defaultReasons);

    if (insertErr) {
      console.error("   ⚠️  Could not insert reasons:", insertErr.message);
    } else {
      console.log("   ✅ Default rejection reasons created");
    }
  } else {
    console.log("   ✅ rejection_reasons table exists");
  }

  // Check if letter_layouts exists
  console.log("\n4. Checking letter_layouts table...");
  const { data: layouts, error: llErr } = await sb.from("letter_layouts").select("id").limit(1);

  if (llErr) {
    console.error("   ❌ letter_layouts table not found");
    console.log("\n   Please apply migration 057_letter_layouts.sql via:");
    console.log("   - Supabase Dashboard → SQL Editor");
    console.log("   - Copy contents of supabase/migrations/057_letter_layouts.sql");
    console.log("   - Paste and run in SQL Editor\n");
    return false;
  }

  console.log("   ✅ letter_layouts table exists");

  console.log("\n============================================================");
  console.log("✅ All tables ready");
  console.log("============================================================");
  return true;
}

checkAndCreateTables()
  .then((success) => {
    if (success) {
      console.log("\nNext step: Run migrate-layouts.ts to create 74 default layouts");
      console.log("  node --env-file=.dev.vars scripts/migrate-layouts.ts");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
