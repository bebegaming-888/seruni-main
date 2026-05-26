/**
 * GET    /api/bantuan                — List programs (?year=2026)
 * POST   /api/bantuan                — Create program (admin)
 * GET    /api/bantuan/:id            — Get detail
 * PUT    /api/bantuan/:id            — Update program
 * DELETE /api/bantuan/:id            — Delete program
 * GET    /api/bantuan/:id/recipients — List recipients
 * POST   /api/bantuan/:id/recipient  — Add recipient (admin)
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

// ── GET /api/bantuan ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { year, status, search } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("bantuan")
      .select(
        "id, name, source, year, start_date, end_date, total_budget, recipient_count, description, status, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (year) query = query.eq("year", Number(year));
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query.limit(50);
    if (error) return serverError(res, "Gagal mengambil data bantuan.");

    return ok(res, { items: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("[bantuan] GET error:", err);
    return serverError(res);
  }
});

// ── POST /api/bantuan ──────────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { name, source, year, start_date, end_date, total_budget, description, status } =
    req.body ?? {};
  if (!name) return badRequest(res, "Nama program wajib diisi.");
  if (!year) return badRequest(res, "Tahun wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("bantuan")
      .insert({
        name: name.trim(),
        source: source || null,
        year: Number(year),
        start_date: start_date || null,
        end_date: end_date || null,
        total_budget: Number(total_budget) || 0,
        description: description || null,
        status: status || "planning",
        created_by: req.adminSession?.userId || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan program bantuan.");
    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[bantuan] POST error:", err);
    return serverError(res);
  }
});

// ── GET /api/bantuan/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("bantuan")
      .select("*, recipients:bantuan_recipient(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return notFound(res, "Program tidak ditemukan.");
      return serverError(res);
    }
    return ok(res, { item: data });
  } catch {
    return serverError(res);
  }
});

// ── PUT /api/bantuan/:id ───────────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const ALLOWED = [
    "name",
    "source",
    "year",
    "start_date",
    "end_date",
    "total_budget",
    "description",
    "status",
    "recipient_count",
  ];
  const clean = {};
  for (const key of ALLOWED) if (key in req.body) clean[key] = req.body[key];
  if (!Object.keys(clean).length) return badRequest(res, "Tidak ada field valid.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb.from("bantuan").update(clean).eq("id", id).select().single();
    if (error) return serverError(res, "Gagal mengupdate program.");
    return ok(res, { item: data });
  } catch {
    return serverError(res);
  }
});

// ── DELETE /api/bantuan/:id ─────────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { error } = await sb.from("bantuan").delete().eq("id", id);
    if (error) return serverError(res);
    return ok(res, { deleted: true });
  } catch {
    return serverError(res);
  }
});

// ── GET /api/bantuan/:id/recipients ────────────────────────────────────────────
router.get("/:id/recipients", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("bantuan_recipient")
      .select("*")
      .eq("bantuan_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return serverError(res);
    return ok(res, { items: data ?? [], total: (data ?? []).length });
  } catch {
    return serverError(res);
  }
});

// ── POST /api/bantuan/:id/recipient ─────────────────────────────────────────────
router.post("/:id/recipient", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const { warga_nik, warga_name, warga_address, amount, distribution_date, notes } = req.body ?? {};
  if (!warga_nik || !warga_name) return badRequest(res, "NIK dan nama warga wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("bantuan_recipient")
      .insert({
        bantuan_id: id,
        warga_nik: warga_nik.trim(),
        warga_name: warga_name.trim(),
        warga_address: warga_address || null,
        amount: Number(amount) || 0,
        distribution_date: distribution_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan penerima bantuan.");
    return ok(res, { item: data }, 201);
  } catch {
    return serverError(res);
  }
});

export default router;
