/**
 * GET    /api/surat-agenda/:id
 * PUT    /api/surat-agenda/:id
 * DELETE /api/surat-agenda/:id
 *
 * Single agenda entry management.
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../../middleware/auth.js";
import { badRequest, serverError, ok, notFound } from "../../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function adminAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator", "Sekretaris Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// ── GET /api/surat-agenda/:id ───────────────────────────────────────────────

router.get("/:id", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");
  const { id } = req.params;
  if (!id) return badRequest(res, "ID wajib diisi.");

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb.from("surat_agenda").select("*").eq("id", id).single();
    if (error || !data) return notFound(res, "Agenda");
    return ok(res, { item: data });
  } catch (err) {
    console.error("[surat-agenda/:id] error:", err);
    return serverError(res);
  }
});

// ── PUT /api/surat-agenda/:id ───────────────────────────────────────────────

router.put("/:id", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");
  const { id } = req.params;
  const {
    tanggal,
    kode_surat,
    nomor_surat,
    Perihal,
    kepada,
    asal_surat,
    lampiran_url,
    keterangan,
  } = req.body ?? {};

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const updateData = { updated_at: new Date().toISOString() };
    if (tanggal) updateData.tanggal = tanggal;
    if (kode_surat !== undefined) updateData.kode_surat = kode_surat;
    if (nomor_surat !== undefined) updateData.nomor_surat = nomor_surat;
    if (Perihal !== undefined) updateData.Perihal = Perihal;
    if (kepada !== undefined) updateData.kepada = kepada;
    if (asal_surat !== undefined) updateData.asal_surat = asal_surat;
    if (lampiran_url !== undefined) updateData.lampiran_url = lampiran_url;
    if (keterangan !== undefined) updateData.keterangan = keterangan;

    const { data, error } = await sb
      .from("surat_agenda")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return notFound(res, "Agenda");
    return ok(res, { item: data });
  } catch (err) {
    console.error("[surat-agenda/:id] PUT error:", err);
    return serverError(res);
  }
});

// ── DELETE /api/surat-agenda/:id ───────────────────────────────────────────

router.delete("/:id", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");
  const { id } = req.params;
  if (!id) return badRequest(res, "ID wajib diisi.");

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await sb.from("surat_agenda").delete().eq("id", id);
    if (error) return serverError(res, "Gagal menghapus agenda.");
    return ok(res, { deleted: true });
  } catch (err) {
    console.error("[surat-agenda/:id] DELETE error:", err);
    return serverError(res);
  }
});

export default router;
