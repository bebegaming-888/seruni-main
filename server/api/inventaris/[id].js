/**
 * GET    /api/inventaris/:id      — Get single asset
 * PUT    /api/inventaris/:id      — Update asset (admin)
 * DELETE /api/inventaris/:id      — Soft-delete asset (admin)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../../middleware/auth.js";
import { badRequest, serverError, ok, notFound } from "../../lib/api-response.js";

const router = express.Router();
const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function adminOnly(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  next();
}

// ── GET /api/inventaris/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { id } = req.params;
  if (!id) return badRequest(res, "ID wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("inventaris")
      .select("*, category:inventaris_category(id, code, name, depreciation_rate)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return notFound(res, "Asset tidak ditemukan.");
      return serverError(res, "Gagal mengambil detail asset.");
    }

    return ok(res, { item: data });
  } catch (err) {
    console.error("[inventaris/:id] GET error:", err);
    return serverError(res);
  }
});

// ── PUT /api/inventaris/:id ───────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { id } = req.params;
  const updates = req.body ?? {};

  // Filter allowed fields
  const ALLOWED = [
    "category_id",
    "code",
    "name",
    "description",
    "condition",
    "acquisition_date",
    "acquisition_value",
    "current_value",
    "location",
    "responsible",
    "dusun",
    "year_acquired",
    "status",
    "notes",
    "is_active",
  ];
  const clean = {};
  for (const key of ALLOWED) {
    if (key in updates) clean[key] = updates[key];
  }

  if (Object.keys(clean).length === 0)
    return badRequest(res, "Tidak ada field valid untuk diupdate.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("inventaris")
      .update(clean)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[inventaris/:id] PUT error:", error.message);
      return serverError(res, "Gagal mengupdate asset.");
    }

    return ok(res, { item: data });
  } catch (err) {
    console.error("[inventaris/:id] PUT unexpected error:", err);
    return serverError(res);
  }
});

// ── DELETE /api/inventaris/:id ────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { id } = req.params;
  if (!id) return badRequest(res, "ID wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { error } = await sb
      .from("inventaris")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[inventaris/:id] DELETE error:", error.message);
      return serverError(res, "Gagal menghapus asset.");
    }

    return ok(res, { deleted: true });
  } catch (err) {
    console.error("[inventaris/:id] DELETE unexpected error:", err);
    return serverError(res);
  }
});

export default router;
