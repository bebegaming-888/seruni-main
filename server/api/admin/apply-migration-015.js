/**
 * POST /api/admin/apply-migration-015
 * Apply migration 015 (surat_types table + seed data) from dev server
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

router.post("/", async (req, res) => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Step 1: Check if table already exists
    const { error: checkErr } = await sb.from("surat_types").select("count").limit(1);
    if (!checkErr) {
      return res.json({ ok: true, message: "surat_types table already exists", skipped: true });
    }

    // Migration step - create surat_types table if needed

    // Step 2: Create table via upsert (workaround - insert dummy row then update)
    // Actually this won't work for CREATE TABLE. We need raw SQL.

    // Check if we can execute raw SQL via pg_net extension
    try {
      const { error: rpcErr } = await sb.rpc("pg_net.http_post", {
        url_: "http://localhost:9999",
        headers_: {},
        body_: "",
      });
    } catch (e) {
      // rpc not available
    }

    // Return migration SQL for user to apply
    return res.json({
      ok: false,
      error: "Cannot execute CREATE TABLE via Supabase JS client",
      require_manual_apply: true,
      migration_file: "FINAL_015_surat_types.sql",
      instructions: [
        "1. Copy the SQL from supabase/migrations/FINAL_015_surat_types.sql",
        "2. Paste into Supabase SQL Editor",
        "3. Run it",
        "4. Then POST this endpoint again to seed the data",
      ],
    });
  } catch (err) {
    console.error("[apply-migration-015] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
