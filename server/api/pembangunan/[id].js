/**
 * GET    /api/pembangunan/:id          — Get project detail
 * PUT    /api/pembangunan/:id          — Update project
 * DELETE /api/pembangunan/:id          — Delete project
 * GET    /api/pembangunan/:id/activities — List activities
 * POST   /api/pembangunan/:id/activity  — Add activity
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

// ── GET /api/pembangunan/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("pembangunan")
      .select("*, activities:pembangunan_activity(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return notFound(res, "Proyek tidak ditemukan.");
      return serverError(res);
    }
    return ok(res, { item: data });
  } catch (err) {
    return serverError(res);
  }
});

// ── PUT /api/pembangunan/:id ───────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const ALLOWED = [
    "type",
    "year",
    "title",
    "description",
    "budget",
    "location",
    "dusun",
    "start_year",
    "end_year",
    "status",
    "priority",
  ];
  const clean = {};
  for (const key of ALLOWED) if (key in req.body) clean[key] = req.body[key];
  if (!Object.keys(clean).length) return badRequest(res, "Tidak ada field valid.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("pembangunan")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) return serverError(res, "Gagal mengupdate proyek.");
    return ok(res, { item: data });
  } catch {
    return serverError(res);
  }
});

// ── DELETE /api/pembangunan/:id ────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { error } = await sb.from("pembangunan").delete().eq("id", id);
    if (error) return serverError(res);
    return ok(res, { deleted: true });
  } catch {
    return serverError(res);
  }
});

// ── GET /api/pembangunan/:id/activities ────────────────────────────────────────
router.get("/:id/activities", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("pembangunan_activity")
      .select("*")
      .eq("pembangunan_id", id)
      .order("year", { ascending: false });

    if (error) return serverError(res);
    return ok(res, { items: data ?? [] });
  } catch {
    return serverError(res);
  }
});

// ── POST /api/pembangunan/:id/activity ────────────────────────────────────────
router.post("/:id/activity", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const { year, month, activity, target, realization, output, notes } = req.body ?? {};
  if (!year || !activity) return badRequest(res, "Tahun dan aktivitas wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("pembangunan_activity")
      .insert({
        pembangunan_id: id,
        year: Number(year),
        month: Number(month) || null,
        activity: activity.trim(),
        target: target || null,
        realization: Number(realization) || 0,
        output: output || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan aktivitas.");
    return ok(res, { item: data }, 201);
  } catch {
    return serverError(res);
  }
});

export default router;
