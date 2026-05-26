/**
 * GET /api/inventaris             — List assets (public, filtered)
 * POST /api/inventaris            — Create asset (admin)
 * GET /api/inventaris/categories  — List categories (public)
 * POST /api/inventaris/categories — Create category (admin)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../../middleware/auth.js";
import { badRequest, serverError, ok, notFound } from "../../lib/api-response.js";

const router = express.Router();

const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Auth ──────────────────────────────────────────────────────────────────────
async function adminOnly(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  next();
}

// ── GET /api/inventaris ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { category, condition, status, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("inventaris")
      .select(
        "id, code, name, description, condition, acquisition_date, acquisition_value, current_value, location, responsible, dusun, year_acquired, status, is_active, created_at",
        { count: "exact" },
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (category) query = query.eq("category_id", category);
    if (condition) query = query.eq("condition", condition);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[inventaris] GET list error:", error.message);
      return serverError(res, "Gagal mengambil data inventaris.");
    }

    // Enrich with category names
    const items = data ?? [];
    let categoryIds = [...new Set(items.map((i) => i.category_id).filter(Boolean))];
    let categories = {};

    if (categoryIds.length > 0) {
      const { data: cats } = await sb
        .from("inventaris_category")
        .select("id, code, name")
        .in("id", categoryIds);
      categories = Object.fromEntries((cats ?? []).map((c) => [c.id, c]));
    }

    const enriched = items.map((item) => ({
      ...item,
      category: categories[item.category_id] ?? null,
    }));

    return ok(res, {
      items: enriched,
      total: count ?? 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("[inventaris] GET unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/inventaris ───────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const {
    category_id,
    code,
    name,
    description,
    condition,
    acquisition_date,
    acquisition_value,
    current_value,
    location,
    responsible,
    dusun,
    year_acquired,
    status,
    notes,
  } = req.body ?? {};

  if (!name) return badRequest(res, "Nama asset wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);

    const insertData = {
      category_id: category_id || null,
      code: code || null,
      name: name.trim(),
      description: description || null,
      condition: condition || "baik",
      acquisition_date: acquisition_date || null,
      acquisition_value: Number(acquisition_value) || 0,
      current_value: Number(current_value) || Number(acquisition_value) || 0,
      location: location || null,
      responsible: responsible || null,
      dusun: dusun || null,
      year_acquired: Number(year_acquired) || null,
      status: status || "owned",
      notes: notes || null,
      created_by: req.adminSession?.userId || null,
    };

    const { data, error } = await sb.from("inventaris").insert(insertData).select().single();

    if (error) {
      console.error("[inventaris] POST error:", error.message);
      return serverError(res, "Gagal menyimpan asset.");
    }

    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[inventaris] POST unexpected error:", err);
    return serverError(res);
  }
});

// ── GET /api/inventaris/categories ────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("inventaris_category")
      .select("id, code, name, depreciation_rate, description, position, is_active")
      .eq("is_active", true)
      .order("position");

    if (error) {
      console.error("[inventaris/categories] GET error:", error.message);
      return serverError(res);
    }

    return ok(res, { items: data ?? [] });
  } catch (err) {
    console.error("[inventaris/categories] GET unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/inventaris/categories ───────────────────────────────────────────
router.post("/categories", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { code, name, depreciation_rate, description, position } = req.body ?? {};
  if (!code || !name) return badRequest(res, "Kode dan nama kategori wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("inventaris_category")
      .insert({
        code: code.trim(),
        name: name.trim(),
        depreciation_rate: Number(depreciation_rate) || 0,
        description: description || null,
        position: Number(position) || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return badRequest(res, `Kode kategori "${code}" sudah ada.`);
      return serverError(res, "Gagal menyimpan kategori.");
    }

    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[inventaris/categories] POST unexpected error:", err);
    return serverError(res);
  }
});

export default router;
