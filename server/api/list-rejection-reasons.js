/**
 * GET /api/list-rejection-reasons
 *
 * Returns list of active rejection reasons from the rejection_reasons table.
 * Used by SuratPreviewPanel rejection modal.
 *
 * Auth: Admin session
 * Response: { ok: true, reasons: RejectionReason[] }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../middleware/auth.js";
import { serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function listRejectionReasons() {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await sb
    .from("rejection_reasons")
    .select("*")
    .eq("is_active", true)
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[list-rejection-reasons] error:", error);
    return [];
  }
  return data ?? [];
}

router.get("/", async (req, res) => {
  const authErr = await verifyAdmin(req, res);
  if (authErr) return;

  try {
    const reasons = await listRejectionReasons();
    return ok(res, { reasons });
  } catch (err) {
    console.error("[list-rejection-reasons] unexpected error:", err);
    return serverError(res);
  }
});

export default router;
