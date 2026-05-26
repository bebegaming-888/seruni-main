/**
 * POST /api/exec-migration
 * Execute SQL migration file (admin only)
 * Body: { filename: "015_surat_types.sql" }
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authErr = await verifyAdmin(req, res);
  if (authErr) return;

  const { filename } = req.body;

  if (!filename || !filename.endsWith(".sql")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  // Security: only allow specific migration files
  const allowedMigrations = ["015_surat_types.sql", "057_letter_layouts.sql"];

  if (!allowedMigrations.includes(filename)) {
    return res.status(403).json({ error: "Migration not allowed" });
  }

  const filepath = path.join(__dirname, "../../supabase/migrations", filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Migration file not found" });
  }

  const sql = fs.readFileSync(filepath, "utf8");

  // Use Supabase service role client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Split SQL into statements and execute one by one
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && s.length > 10);

    const results = [];
    let successCount = 0;
    let skipCount = 0;

    for (const stmt of statements) {
      if (!stmt) continue;

      try {
        // Execute via rpc if available, otherwise try direct query
        const { data, error } = await supabase.rpc("exec_sql", { query: stmt });

        if (error) {
          // Check if it's a "already exists" error (safe to skip)
          if (error.message.includes("already exists") || error.message.includes("duplicate key")) {
            skipCount++;
            results.push({ stmt: stmt.slice(0, 80), status: "skipped" });
          } else {
            results.push({
              stmt: stmt.slice(0, 80),
              status: "error",
              error: error.message,
            });
          }
        } else {
          successCount++;
          results.push({ stmt: stmt.slice(0, 80), status: "success" });
        }
      } catch (err) {
        results.push({
          stmt: stmt.slice(0, 80),
          status: "error",
          error: err.message,
        });
      }
    }

    return res.json({
      ok: true,
      filename,
      totalStatements: statements.length,
      successCount,
      skipCount,
      results: results.slice(0, 20), // Return first 20 results only
    });
  } catch (err) {
    console.error("[exec-migration] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
