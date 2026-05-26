/**
 * GET /api/list-signers
 *
 * Returns list of active signers from the letter_signers table.
 * Used by SuratPreviewPanel signer selection modal.
 *
 * Auth: Admin session
 * Response: { ok: true, signers: LetterSigner[] }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../middleware/auth.js";
import { serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function listSigners() {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await sb
    .from("letter_signers")
    .select("*")
    .eq("is_active", true)
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[list-signers] error:", error);
    return [];
  }
  return data ?? [];
}

router.get("/", async (req, res) => {
  const authErr = await verifyAdmin(req, res);
  if (authErr) return;

  try {
    const signers = await listSigners();
    return ok(res, { signers });
  } catch (err) {
    console.error("[list-signers] unexpected error:", err);
    return serverError(res);
  }
});

export default router;
