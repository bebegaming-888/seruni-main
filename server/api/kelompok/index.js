/**
 * GET    /api/kelompok                — List community groups
 * POST   /api/kelompok                — Create group (admin)
 * GET    /api/kelompok/:id            — Get detail with members
 * PUT    /api/kelompok/:id            — Update group
 * DELETE /api/kelompok/:id            — Delete group
 * GET    /api/kelompok/:id/members    — List members
 * POST   /api/kelompok/:id/member     — Add member (admin)
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

// ── GET /api/kelompok ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { category, search } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("kelompok")
      .select(
        "id, category, name, leader_name, leader_phone, member_count, established_date, description, created_at",
        { count: "exact" },
      )
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (category) query = query.eq("category", category);
    if (search) query = query.or(`name.ilike.%${search}%,leader_name.ilike.%${search}%`);

    const { data, error, count } = await query.limit(100);
    if (error) return serverError(res, "Gagal mengambil data kelompok.");

    return ok(res, {
      items: data ?? [],
      total: count ?? 0,
      by_category: Object.groupBy(data ?? [], (k) => k.category),
    });
  } catch (err) {
    console.error("[kelompok] GET error:", err);
    return serverError(res);
  }
});

// ── POST /api/kelompok ─────────────────────────────────────────────────────────
router.post("/", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { category, name, leader_name, leader_phone, established_date, description, notes } =
    req.body ?? {};
  if (!category || !name) return badRequest(res, "Kategori dan nama kelompok wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("kelompok")
      .insert({
        category: category.trim(),
        name: name.trim(),
        leader_name: leader_name || null,
        leader_phone: leader_phone || null,
        established_date: established_date || null,
        description: description || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan kelompok.");
    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[kelompok] POST error:", err);
    return serverError(res);
  }
});

// ── GET /api/kelompok/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("kelompok")
      .select("*, members:kelompok_member(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return notFound(res, "Kelompok tidak ditemukan.");
      return serverError(res);
    }
    return ok(res, { item: data });
  } catch {
    return serverError(res);
  }
});

// ── PUT /api/kelompok/:id ──────────────────────────────────────────────────────
router.put("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const ALLOWED = [
    "category",
    "name",
    "leader_name",
    "leader_phone",
    "member_count",
    "established_date",
    "description",
    "notes",
    "is_active",
  ];
  const clean = {};
  for (const key of ALLOWED) if (key in req.body) clean[key] = req.body[key];
  if (!Object.keys(clean).length) return badRequest(res, "Tidak ada field valid.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb.from("kelompok").update(clean).eq("id", id).select().single();
    if (error) return serverError(res, "Gagal mengupdate kelompok.");
    return ok(res, { item: data });
  } catch {
    return serverError(res);
  }
});

// ── DELETE /api/kelompok/:id ────────────────────────────────────────────────────
router.delete("/:id", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { error } = await sb.from("kelompok").update({ is_active: false }).eq("id", id);
    if (error) return serverError(res);
    return ok(res, { deleted: true });
  } catch {
    return serverError(res);
  }
});

// ── GET /api/kelompok/:id/members ──────────────────────────────────────────────
router.get("/:id/members", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("kelompok_member")
      .select("*")
      .eq("kelompok_id", id)
      .eq("is_active", true)
      .order("joined_at", { ascending: false });

    if (error) return serverError(res);
    return ok(res, { items: data ?? [], total: (data ?? []).length });
  } catch {
    return serverError(res);
  }
});

// ── POST /api/kelompok/:id/member ───────────────────────────────────────────────
router.post("/:id/member", adminOnly, async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);
  const { id } = req.params;
  const { warga_nik, name, position, phone } = req.body ?? {};
  if (!name) return badRequest(res, "Nama anggota wajib diisi.");

  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data, error } = await sb
      .from("kelompok_member")
      .insert({
        kelompok_id: id,
        warga_nik: warga_nik || null,
        name: name.trim(),
        position: position || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (error) return serverError(res, "Gagal menyimpan anggota.");
    return ok(res, { item: data }, 201);
  } catch {
    return serverError(res);
  }
});

export default router;
