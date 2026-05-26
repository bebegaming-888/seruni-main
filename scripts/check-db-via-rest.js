/**
 * check-db-via-rest.js
 * Checks database state using Supabase REST API (no direct Postgres needed).
 * Works for both projects — pooler hostname doesn't need to resolve locally.
 *
 * Usage: node scripts/check-db-via-rest.js
 */

import "dotenv/config";
import https from "https";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function supabaseFetch(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    };
    if (body) options.headers["Prefer"] = "return=representation";
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkTable(tableName) {
  const result = await supabaseFetch(`/rest/v1/${tableName}?select=*&limit=1`);
  return { table: tableName, status: result.status, exists: result.status !== 404 };
}

async function checkFunction(funcName, args = {}) {
  const result = await supabaseFetch(`/rest/v1/rpc/${funcName}`, "POST", args);
  return { func: funcName, status: result.status };
}

async function checkRPCExists(rpcName) {
  const result = await supabaseFetch(`/rest/v1/rpc/${rpcName}`, "POST", {});
  // 404 = function doesn't exist, 400 = exists but no args, other = exists
  const exists = result.status !== 404;
  return { rpc: rpcName, exists, status: result.status };
}

async function run() {
  console.info(`🔍 Checking database: ${SUPABASE_URL}\n`);

  // Check tables
  const tables = [
    "admin_users",
    "warga",
    "surat_requests",
    "revoked_sessions",
    "otp_rate_limits",
    "warga_sessions",
    "submission_rate_limit",
    "surat_request_versions",
    "app_settings",
    "cms_contents",
    "surat_templates",
  ];

  console.info("=== TABLES (via REST API) ===");
  for (const t of tables) {
    try {
      const result = await supabaseFetch(`/rest/v1/${t}?select=*&limit=1`);
      if (result.status === 200) {
        // Count rows
        const countResult = await supabaseFetch(`/rest/v1/${t}?select=*&limit=1000`);
        const count = Array.isArray(countResult.data) ? countResult.data.length : "?";
        console.info(`  ✅ ${t} (${count} rows)`);
      } else if (result.status === 401) {
        console.info(`  ⚠️  ${t} — requires auth (401)`);
      } else {
        console.info(`  ❌ ${t} (${result.status})`);
      }
    } catch (e) {
      console.info(`  ❌ ${t} — ${e.message}`);
    }
  }

  // Check RLS on critical tables
  console.info("\n=== RLS + PERMISSIONS (via REST API) ===");
  // We can infer RLS from error types — if 401, RLS is blocking
  for (const t of ["admin_users", "revoked_sessions", "submission_rate_limit"]) {
    const r = await supabaseFetch(`/rest/v1/${t}?select=id&limit=1`);
    console.info(
      `  ${t}: ${r.status === 200 ? "✅ accessible (service_role)" : `⚠️  ${r.status}`}`,
    );
  }

  // Check functions via RPC
  console.info("\n=== FUNCTIONS (via RPC) ===");
  const rpcs = [
    "increment_nomor_surat_counter",
    "check_otp_rate_limit",
    "verify_warga_otp",
    "delete_admin_user",
    "upsert_admin_user",
    "increment_submission_count",
  ];
  for (const rpc of rpcs) {
    const result = await checkRPCExists(rpc);
    console.info(`  ${result.exists ? "✅" : "❌"} ${rpc} (status: ${result.status})`);
  }

  // Check trigger existence via table check
  console.info("\n=== TRIGGERS ===");
  // Can't check triggers directly via REST, but we can verify by trying to update surat_requests
  // For now, just note we can't check via REST
  console.info("  ⚠️  Trigger check not available via REST API — apply via SQL Editor");

  // Admin users check
  console.info("\n=== ADMIN USERS ===");
  const adminResult = await supabaseFetch(
    "/rest/v1/admin_users?select=id,username,role,fixed&limit=5",
  );
  if (adminResult.status === 200 && Array.isArray(adminResult.data)) {
    console.info(`  ✅ admin_users: ${adminResult.data.length} user(s)`);
    adminResult.data.forEach((u) => {
      console.info(`     - ${u.username} (${u.role}) ${u.fixed ? "[fixed]" : ""}`);
    });
  } else {
    console.info(`  ❌ admin_users: ${adminResult.status}`);
  }

  // App settings check
  console.info("\n=== APP SETTINGS (sample keys) ===");
  const keys = ["village_name", "signature.signer_name"];
  for (const k of keys) {
    const r = await supabaseFetch(
      `/rest/v1/app_settings?key=eq.${encodeURIComponent(k)}&select=key`,
    );
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      console.info(`  ✅ ${k} = "${r.data[0].value}"`);
    } else {
      console.info(`  ❌ ${k} (not set)`);
    }
  }

  console.info("\n✅ Database state check complete.");
}

run().catch((e) => {
  console.error("❌ Check failed:", e.message);
  process.exit(1);
});
