/**
 * check-db-state.js
 * Checks current state of production database to determine which
 * migrations still need to be applied.
 *
 * Usage: node scripts/check-db-state.js
 */

import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

async function run() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  if (!projectRef) {
    console.error("Invalid SUPABASE_URL");
    process.exit(1);
  }

  const connectionString = `postgres://postgres.${projectRef}:${SERVICE_KEY}@${projectRef}.pooler.supabase.com:6543/postgres`;
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  console.info("🔍 Checking production database state...\n");

  try {
    const client = await pool.connect();

    // --- Table existence check ---
    const tables = [
      "revoked_sessions",
      "submission_rate_limit",
      "otp_rate_limits",
      "surat_request_versions",
    ];
    console.info("=== TABLES ===");
    for (const t of tables) {
      const r = await client.query(
        `SELECT count(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [t],
      );
      const exists = parseInt(r.rows[0]?.cnt ?? 0) > 0;
      console.info(`  ${exists ? "✅" : "❌"} ${t}`);
    }

    // --- Function check ---
    const functions = [
      "check_otp_rate_limit",
      "sync_surat_request_metadata",
      "delete_admin_user",
      "upsert_admin_user",
      "increment_submission_count",
      "verify_warga_otp",
    ];
    console.info("\n=== FUNCTIONS ===");
    for (const fn of functions) {
      const r = await client.query(
        `SELECT oid FROM pg_proc WHERE proname=$1 AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') LIMIT 1`,
        [fn],
      );
      const exists = r.rows.length > 0;
      console.info(`  ${exists ? "✅" : "❌"} ${fn}()`);
    }

    // --- Trigger check ---
    console.info("\n=== TRIGGERS ===");
    const triggerR = await client.query(
      `SELECT tgname, tgtype FROM pg_trigger WHERE tgname='sync_surat_metadata_to_versions'`,
    );
    if (triggerR.rows.length > 0) {
      const tg = triggerR.rows[0];
      // tgtype: bit 0 = BEFORE, bit 1 = AFTER
      const isBefore = (tg.tgtype & 1) !== 0;
      console.info(
        `  ${isBefore ? "✅" : "⚠️"} sync_surat_metadata_to_versions (${isBefore ? "BEFORE" : "AFTER"})`,
      );
    } else {
      console.info("  ❌ sync_surat_metadata_to_versions (not found)");
    }

    // --- RLS check on revoked_sessions ---
    console.info("\n=== RLS POLICIES ===");
    const rlsR = await client.query(
      `SELECT policyname, cmd FROM pg_policy WHERE tablename='revoked_sessions'`,
    );
    if (rlsR.rows.length > 0) {
      console.info("  ✅ revoked_sessions has RLS policies:");
      rlsR.rows.forEach((p) => console.info(`     - ${p.policyname} (${p.cmd})`));
    } else {
      console.info("  ❌ revoked_sessions: no RLS policies");
    }

    // --- Function permissions check (check_otp_rate_limit) ---
    console.info("\n=== FUNCTION PERMISSIONS ===");
    const permsR = await client.query(
      `SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name='check_otp_rate_limit'`,
    );
    if (permsR.rows.length > 0) {
      const hasAnon = permsR.rows.some((r) => r.grantee === "anon");
      console.info(
        `  check_otp_rate_limit: ${hasAnon ? "⚠️ ANON HAS ACCESS (insecure)" : "✅ anon NOT present"}`,
      );
      permsR.rows.forEach((r) => console.info(`     ${r.grantee}: ${r.privilege_type}`));
    } else {
      console.info("  check_otp_rate_limit: no grants found (may not exist)");
    }

    // --- Table counts ---
    console.info("\n=== TABLE ROW COUNTS ===");
    for (const t of ["revoked_sessions", "submission_rate_limit", "otp_rate_limits"]) {
      try {
        const r = await client.query(`SELECT count(*) as cnt FROM ${t}`);
        console.info(`  ${t}: ${r.rows[0].cnt} rows`);
      } catch {
        console.info(`  ${t}: not accessible or not found`);
      }
    }

    client.release();
    console.info("\n✅ Database state check complete.");
  } catch (err) {
    console.error("\n❌ Check failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
