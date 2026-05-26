/**
 * Apply SQL migrations directly to remote Supabase database via pg-net endpoint
 * Usage: node --env-file=.dev.vars scripts/apply-migrations.js
 */

require("dotenv").config({ path: ".dev.vars" });
const fs = require("fs");
const path = require("path");
const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .dev.vars");
  process.exit(1);
}

// Migrations to apply (in order)
const migrations = ["015_surat_types.sql", "057_letter_layouts.sql"];

function execRawSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: "/rest/v1/rpc/pg_net_http_post_on_url",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
    };

    const body = JSON.stringify({
      url: `postgres://${encodeURIComponent(process.env.SUPABASE_DB_USER || "postgres")}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || "")}@${url.hostname}:5432/postgres?options=-c%20search_path%3Dpublic`,
      timeout: 30000,
    });

    // Try direct REST API
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Try Supabase management API via REST
async function checkTableExists(tableName) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?limit=1`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function applyMigration(filename) {
  const filepath = path.join(__dirname, "../supabase/migrations", filename);

  if (!fs.existsSync(filepath)) {
    console.error(`  Migration file not found: ${filename}`);
    return false;
  }

  console.log(`\nApplying ${filename}...`);
  const sql = fs.readFileSync(filepath, "utf8");

  // Check if tables already exist by looking for them
  const checkTables = {
    "015_surat_types.sql": "surat_types",
    "057_letter_layouts.sql": "letter_layouts",
  };

  const existing = await checkTableExists(checkTables[filename]);
  if (existing) {
    console.log(`  Tables already exist, skipping ${filename}`);
    return true;
  }

  console.log(`  ${filename} tables not found in remote DB`);
  console.log(`  ⚠️  Direct SQL execution requires pg admin connection`);
  console.log(`  Please apply via Supabase Dashboard SQL Editor or:`);
  console.log(`  supabase db push (requires local supabase CLI linked)`);
  return false;
}

async function main() {
  console.log("============================================================");
  console.log("Supabase Migration Checker");
  console.log("============================================================");
  console.log(`Target: ${SUPABASE_URL}`);

  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log("\n============================================================");
  console.log("Check complete");
  console.log("============================================================");
}

main().catch(console.error);
