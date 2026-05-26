/**
 * GET/POST/PUT/DELETE /api/wilayah
 * CRUD operations for WILAYAH (administrative area) table.
 *
 * Auth: Admin session (HMAC-signed)
 * Response: { ok: boolean, data?: any, error?: string }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// GET /api/wilayah — List all wilayah records
async function wilayahListAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Kepala Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

router.get("/", wilayahListAuth, async (req, res) => {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb
      .from("wilayah")
      .select("*")
      .order("position", { ascending: true })
      .order("level", { ascending: true });

    if (error) throw new Error(error.message);
    return ok(res, data ?? []);
  } catch (e) {
    return serverError(res, e.message);
  }
});

// POST /api/wilayah — Create new wilayah
async function wilayahWriteAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

router.post("/", wilayahWriteAuth, async (req, res) => {
  try {
    const { level, kode, nama, parent_kode, data, position } = req.body;

    if (!level || !kode || !nama) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields: level, kode, nama" });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check if kode already exists
    const { data: existing } = await sb.from("wilayah").select("id").eq("kode", kode).single();
    if (existing) {
      return res.status(409).json({ ok: false, error: `Kode "${kode}" sudah digunakan` });
    }

    const newRecord = {
      level,
      kode,
      nama,
      parent_kode: parent_kode || null,
      data: data || {},
      position: position ?? 0,
      is_active: true,
    };

    const { data: inserted, error } = await sb.from("wilayah").insert(newRecord).select().single();

    if (error) throw new Error(error.message);
    return ok(res, inserted);
  } catch (e) {
    return serverError(res, e.message);
  }
});

// PUT /api/wilayah/:id — Update wilayah
router.put("/:id", wilayahWriteAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, parent_kode, data, is_active, position } = req.body;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const updates = {};
    if (nama !== undefined) updates.nama = nama;
    if (parent_kode !== undefined) updates.parent_kode = parent_kode;
    if (data !== undefined) updates.data = data;
    if (is_active !== undefined) updates.is_active = is_active;
    if (position !== undefined) updates.position = position;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }

    const { data: updated, error } = await sb
      .from("wilayah")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Wilayah not found" });
    }

    return ok(res, updated);
  } catch (e) {
    return serverError(res, e.message);
  }
});

// DELETE /api/wilayah/:id — Delete wilayah (soft delete: set is_active = false)
router.delete("/:id", wilayahWriteAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Soft delete: set is_active = false
    const { data: updated, error } = await sb
      .from("wilayah")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Wilayah not found" });
    }

    return ok(res, { message: "Wilayah deactivated", id });
  } catch (e) {
    return serverError(res, e.message);
  }
});

export default router;
