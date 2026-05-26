/**
 * Apply all migrations using direct pg connection
 * Usage: node --env-file=.dev.vars scripts/apply-all-migrations.cjs
 */
require("dotenv").config({ path: ".dev.vars" });
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DIRECT_DB_URL =
  process.env.DIRECT_DB_URL ||
  "postgresql://postgres:Serunimumbul88@db.wrfraskmawmciiutwcpx.supabase.co:5432/postgres";

async function applyFile(client, filename) {
  const filepath = path.join(__dirname, "../supabase/migrations", filename);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return false;
  }

  const sql = fs.readFileSync(filepath, "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));

  console.log(`\n📄 ${filename} (${statements.length} statements)`);
  let success = 0,
    skipped = 0,
    errors = 0;

  for (const stmt of statements) {
    if (!stmt || stmt.length < 10) continue;
    try {
      await client.query(stmt);
      success++;
      // Show first 60 chars of each statement for visibility
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      console.log(`  ✅ ${preview}...`);
    } catch (err) {
      if (
        err.message.includes("already exists") ||
        err.message.includes("duplicate key") ||
        err.message.includes("does not exist")
      ) {
        skipped++;
        const preview = stmt.replace(/\s+/g, " ").slice(0, 60);
        console.log(`  ⏭️  ${preview}...`);
      } else {
        errors++;
        console.log(`  ❌ ${err.message.slice(0, 120)}`);
      }
    }
  }

  console.log(`  → ${success} applied, ${skipped} skipped, ${errors} errors`);
  return errors === 0;
}

async function main() {
  console.log("============================================================");
  console.log("Connecting to Supabase...");
  console.log("============================================================");

  const client = new Client({
    connectionString: DIRECT_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase\n");

    // Check existing tables
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("Existing tables:", rows.map((r) => r.table_name).join(", ") || "none");

    // Apply migrations in order
    const all = await applyFile(client, "015_surat_types.sql");
    if (!all) throw new Error("Migration 015 failed");

    const all2 = await applyFile(client, "057_letter_layouts.sql");
    if (!all2) throw new Error("Migration 057 failed");

    // Verify
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("\n============================================================");
    console.log("✅ All migrations applied successfully!");
    console.log("Tables:", tables.map((r) => r.table_name).join(", "));
    console.log("============================================================");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
