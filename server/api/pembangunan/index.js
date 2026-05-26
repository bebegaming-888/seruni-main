/**
 * GET    /api/pembangunan           — List projects (?type=rpjmdes&year=2026)
 * POST   /api/pembangunan            — Create project (admin)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "../../middleware/auth.js";
import { badRequest, serverError, ok } from "../../lib/api-response.js";

const router = express.Router();
const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function adminOnly(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  next();
}

// ── GET /api/pembangunan ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { type, year, status, search } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("pembangunan")
      .select(
        "id, type, year, title, description, budget, location, dusun, start_year, end_year, status, priority, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (type === "rpjmdes" || type === "rkp") query = query.eq("type", type);
    if (year) query = query.eq("year", Number(year));
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);

    const { data, error, count } = await query.limit(100);
    if (error) return serverError(res, "Gagal mengambil data pembangunan.");

    return ok(res, {
      items: data ?? [],
      total: count ?? 0,
      by_status: Object.groupBy(data ?? [], (p) => String(p.status)),
    });
  } catch (err) {
    console.error("[pembangunan] GET error:", err);
    return serverError(res);
  }
});

// ── POST /api/pembangunan ─────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const {
    type,
    year,
    title,
    description,
    budget,
    location,
    dusun,
    start_year,
    end_year,
    status,
    priority,
  } = req.body ?? {};
  if (!type || !["rpjmdes", "rkp"].includes(type))
    return badRequest(res, "Tipe wajib: rpjmdes atau rkp.");
  if (!year) return badRequest(res, "Tahun wajib diisi.");
  if (!title) return badRequest(res, "Judul wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("pembangunan")
      .insert({
        type,
        year: Number(year),
        title: title.trim(),
        description: description || null,
        budget: Number(budget) || 0,
        location: location || null,
        dusun: dusun || null,
        start_year: Number(start_year) || null,
        end_year: Number(end_year) || null,
        status: status || "rencana",
        priority: priority || "medium",
        created_by: req.adminSession?.userId || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan proyek pembangunan.");

    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[pembangunan] POST error:", err);
    return serverError(res);
  }
});

export default router;
