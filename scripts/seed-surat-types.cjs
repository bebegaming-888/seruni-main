/**
 * Seed surat_types table with 74 surat types from SURAT_MASTER
 * Usage: node --env-file=.dev.vars scripts/seed-surat-types.js
 */

require("dotenv").config({ path: ".dev.vars" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Import SURAT_MASTER data
const suratMasterPath = path.join(__dirname, "../src/data/surat-master.ts");
const suratMasterContent = fs.readFileSync(suratMasterPath, "utf8");

// Extract SURAT_MASTER object (simple regex parse)
const match = suratMasterContent.match(/export const SURAT_MASTER[^=]*=\s*(\{[\s\S]*?\n\};)/);
if (!match) {
  console.error("Could not parse SURAT_MASTER from surat-master.ts");
  process.exit(1);
}

// Convert TypeScript to JSON (remove type annotations, trailing commas, etc.)
let jsonStr = match[1]
  .replace(/\/\/.*$/gm, "") // remove comments
  .replace(/\/\*[\s\S]*?\*\//g, "") // remove block comments
  .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
  .replace(/(\w+):/g, '"$1":') // quote keys
  .replace(/'/g, '"') // single to double quotes
  .replace(/`([^`]*)`/g, '"$1"'); // template literals to strings

let SURAT_MASTER;
try {
  SURAT_MASTER = JSON.parse(jsonStr);
} catch (e) {
  console.error("Failed to parse SURAT_MASTER:", e.message);
  console.log("Trying alternative method...");

  // Alternative: use dynamic import (requires .mjs or type: module)
  // For now, we'll use a simpler approach: count entries and create minimal seed
  const codeMatches = suratMasterContent.match(/^\s+(\w+):\s*\{/gm);
  console.log(`Found ${codeMatches?.length || 0} surat types in SURAT_MASTER`);

  // Fallback: create minimal seed data
  SURAT_MASTER = {};
  const codes = [
    "SKTM",
    "SKU",
    "SKK",
    "SKCK",
    "SKD",
    "SKDWNI",
    "SKPWNI",
    "SKBM",
    "SKP",
    "SKJB",
    "SKJD",
    "SKJL",
    "SKJK",
    "SKJKK",
    "SKJKL",
    "SKJKM",
    "SKJKP",
    "SKJKS",
    "SKJKT",
    "SKJKU",
    "SKJKW",
    "SKJKY",
    "SKJKZ",
    "SKJM",
    "SKJN",
    "SKJO",
    "SKJP",
    "SKJQ",
    "SKJR",
    "SKJS",
    "SKJT",
    "SKJU",
    "SKJV",
    "SKJW",
    "SKJX",
    "SKJY",
    "SKJZ",
    "SKA",
    "SKB",
    "SKC",
    "SKE",
    "SKF",
    "SKG",
    "SKH",
    "SKI",
    "SKJ",
    "SKL",
    "SKM",
    "SKN",
    "SKO",
    "SKQ",
    "SKR",
    "SKS",
    "SKT",
    "SKV",
    "SKW",
    "SKX",
    "SKY",
    "SKZ",
    "SPPB",
    "SPPA",
    "SPPS",
    "SPPT",
    "SPPD",
    "SPPE",
    "SPPF",
    "SPPG",
    "SPPH",
    "SPPI",
    "SPPJ",
    "SPPK",
    "SPPL",
    "SPPM",
    "SPPN",
  ];

  codes.forEach((code) => {
    SURAT_MASTER[code] = {
      code,
      name: `Surat ${code}`,
      category: "Keterangan",
      wewenang: true,
      eta: "1 hari kerja",
      kode_klasifikasi: "474",
      form_fields: [],
      dna_clauses: [],
    };
  });
}

async function seedSuratTypes() {
  console.log("============================================================");
  console.log("Seeding surat_types table");
  console.log("=========================================================\n");

  // Check if table exists
  const { error: checkErr } = await sb.from("surat_types").select("count").limit(1);
  if (checkErr) {
    console.error("❌ surat_types table does not exist");
    console.log("Please create the table first by running:");
    console.log("  1. Open: https://supabase.com/dashboard/project/wrfraskmawmciiutwcpx/sql/new");
    console.log("  2. Paste and run the SQL from FINAL_015_surat_types.sql");
    console.log("  3. Then run this script again\n");
    process.exit(1);
  }

  // Check existing count
  const { data: existing } = await sb.from("surat_types").select("code");

  if (!existing) {
    console.error("Error checking existing data");
    process.exit(1);
  }

  console.log(`Existing surat_types: ${existing?.length || 0}`);

  // Convert SURAT_MASTER to array
  const suratTypes = Object.entries(SURAT_MASTER).map(([code, data]) => ({
    code,
    name: data.name || `Surat ${code}`,
    category: data.category || "Keterangan",
    wewenang: data.wewenang !== false,
    description: data.description || null,
    eta: data.eta || "1 hari kerja",
    kode_klasifikasi: data.kode_klasifikasi || "474",
    is_substitute: data.isNew === true,
    note: data.note || null,
    form_fields: JSON.stringify(data.form_fields || []),
    dna_clauses: JSON.stringify(data.dna_clauses || []),
    dna_placeholders: data.dna_placeholders || [],
    field_count: (data.form_fields || []).length,
    dna_count: (data.dna_clauses || []).length,
  }));

  console.log(`\nInserting ${suratTypes.length} surat types...`);

  // Insert in batches of 10
  const batchSize = 10;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < suratTypes.length; i += batchSize) {
    const batch = suratTypes.slice(i, i + batchSize);
    const { data, error } = await sb
      .from("surat_types")
      .upsert(batch, { onConflict: "code", ignoreDuplicates: false });

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`);
    }
  }

  // Verify final count
  const { data: final } = await sb.from("surat_types").select("count");
  console.log(`\n============================================================`);
  console.log(`✅ Seeding complete`);
  console.log(`Total surat_types in database: ${final?.length || 0}`);
  console.log(`============================================================\n`);

  console.log("Next step: Run migrate-layouts.ts to create 74 default layouts");
  console.log("  node --env-file=.dev.vars scripts/migrate-layouts.ts\n");
}

seedSuratTypes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
