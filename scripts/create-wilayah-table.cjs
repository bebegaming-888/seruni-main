/**
 * scripts/create-wilayah-table.cjs
 * Creates wilayah table and seeds village hierarchy data.
 * Run: node --env-file=.dev.vars scripts/create-wilayah-table.cjs
 */

require("dotenv/config");
const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Management API token — used only in Node scripts (never exposed to browser)
const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN || SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Management API helper for direct DB access (bypasses PostgREST schema cache)
function mgmtQuery(sql) {
  return new Promise((resolve, reject) => {
    const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
    const body = JSON.stringify({ query: sql }); // JSON.stringify handles all escaping
    const opts = {
      hostname: "api.supabase.com",
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${MGMT_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(d || "[]"));
        else reject(new Error(`HTTP ${res.statusCode}: ${d}`));
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Seed Data: Village Hierarchy ───────────────────────────────────────────────

const WILAYAH_DATA = [
  // Provinsi
  {
    level: "provinsi",
    kode: "PROV-51",
    nama: "PROVINSI BALI",
    parent_kode: null,
    data: { ibukota: "Denpasar", kode_pos_prefix: "80" },
    position: 1,
  },
  // Kabupaten
  {
    level: "kabupaten",
    kode: "KAB-BADUNG",
    nama: "KABUPATEN BADUNG",
    parent_kode: "PROV-51",
    data: { ibukota: "Mengwi", kode_pos_prefix: "803" },
    position: 1,
  },
  // Kecamatan
  {
    level: "kecamatan",
    kode: "KEC-ABIANANG",
    nama: "KECAMATAN ABIANSEMAL",
    parent_kode: "KAB-BADUNG",
    data: { luas_km2: 68.12 },
    position: 1,
  },
  // Desa
  {
    level: "desa",
    kode: "DESA-SERUNI-MUMBUL",
    nama: "Desa Seruni Mumbul",
    parent_kode: "KEC-ABIANANG",
    data: {
      alamat: "Jl. Raya Seruni Mumbul No. 1",
      telepon: "(0361) 123456",
      whatsapp: "081234567890",
      email: "info@seruni-mumbul.id",
      website: "https://serunimumbul.desa.id",
      kode_pos: "80361",
      rt_rw: "RT 001 RW 002",
      dusun: "Mumbul",
      koordinat_lat: "-8.6102",
      koordinat_lng: "115.1834",
    },
    position: 1,
  },
];

async function createAndSeed() {
  console.log("============================================================");
  console.log("Creating WILAYAH table and seeding data");
  console.log("============================================================\n");

  // 1. Check if table exists via Management API
  let tableExists = true;
  try {
    await mgmtQuery("SELECT 1 FROM public.wilayah LIMIT 1");
  } catch {
    tableExists = false;
  }

  if (tableExists) {
    console.log("Table wilayah already exists. Checking for data...");
    const existing = await mgmtQuery(
      "SELECT level, kode, nama FROM public.wilayah ORDER BY position, level",
    );
    if (existing.length > 0) {
      console.log("Existing data:");
      existing.forEach((w) => console.log("  " + w.level + ": " + w.nama));
      console.log("\nDeleting old data and re-seeding...\n");
      await mgmtQuery("DELETE FROM public.wilayah");
    }
  } else {
    console.log("Table does not exist — applying migration via Management API...");
    const fs = require("fs");
    const path = require("path");
    const sql = fs.readFileSync(
      path.join(__dirname, "../supabase/migrations/058_wilayah.sql"),
      "utf8",
    );
    await new Promise((resolve, reject) => {
      const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
      const body = JSON.stringify({ query: sql });
      const opts = {
        hostname: "api.supabase.com",
        port: 443,
        path: `/v1/projects/${projectRef}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${MGMT_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };
      const req = https.request(opts, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error("Migration failed: HTTP " + res.statusCode + " " + d));
        });
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    console.log("Migration applied!\n");
  }

  // 2. Seed data via Management API
  console.log("Seeding wilayah data...\n");

  let seeded = 0;
  for (const wilayah of WILAYAH_DATA) {
    const dataJson = JSON.stringify(wilayah.data || {});
    const parentVal = wilayah.parent_kode ? `'${wilayah.parent_kode}'` : "NULL";
    const sql = `INSERT INTO public.wilayah (level, kode, nama, parent_kode, data, position)
      VALUES ('${wilayah.level}', '${wilayah.kode}', '${wilayah.nama}', ${parentVal},
              '${dataJson.replace(/'/g, "''")}'::jsonb, ${wilayah.position})
      ON CONFLICT (kode) DO UPDATE SET
        level = EXCLUDED.level, nama = EXCLUDED.nama, parent_kode = EXCLUDED.parent_kode,
        data = EXCLUDED.data, position = EXCLUDED.position`;
    try {
      await mgmtQuery(sql);
      console.log("  ✅ " + wilayah.level + ": " + wilayah.nama);
      seeded++;
    } catch (e) {
      console.log("  ❌ " + wilayah.level + ": " + wilayah.nama + " — " + e.message);
    }
  }

  // 3. Verify
  console.log("\n--- Verification ---");
  const all = await mgmtQuery(
    "SELECT level, kode, nama FROM public.wilayah ORDER BY position, level",
  );
  console.log("Total entries: " + all.length);
  all.forEach((w) => console.log("  " + w.level + ": " + w.nama));

  // 4. Get desa data
  const desaRows = await mgmtQuery(
    "SELECT * FROM public.wilayah WHERE kode = 'DESA-SERUNI-MUMBUL'",
  );
  if (desaRows.length > 0) {
    const desa = desaRows[0];
    const d = typeof desa.data === "string" ? JSON.parse(desa.data) : desa.data || {};
    console.log("\n--- Desa Data ---");
    console.log("  Nama: " + desa.nama);
    console.log("  Alamat: " + (d.alamat ?? "-"));
    console.log("  Telepon: " + (d.telepon ?? "-"));
    console.log("  Email: " + (d.email ?? "-"));
    console.log("  Website: " + (d.website ?? "-"));
    console.log("  Kode Pos: " + (d.kode_pos ?? "-"));
    console.log("  RT/RW: " + (d.rt_rw ?? "-"));
    console.log("  Whatsapp: " + (d.whatsapp ?? "-"));
  }

  console.log("\n============================================================");
  console.log("Wilayah data: " + seeded + " entries seeded");
  console.log("============================================================");
  console.log("\nNext: Run rebuild-layouts.cjs to use wilayah data in all 74 layouts");
}

createAndSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err.message);
    process.exit(1);
  });
