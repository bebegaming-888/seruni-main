/**
 * GET /api/surat-agenda
 * POST /api/surat-agenda
 *
 * Buku Agenda Surat (keluar & masuk) — list and create entries.
 *
 * Auth: Admin session (HMAC-signed + role check)
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

// ── GET /api/surat-agenda ──────────────────────────────────────────────────

router.get("/", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { direction, year, month, date_from, date_to, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const userId = req.adminSession?.userId;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = sb
      .from("surat_agenda")
      .select("*", { count: "exact" })
      .order("tanggal", { ascending: false })
      .range(offset, offset + limit - 1);

    if (direction === "outgoing" || direction === "incoming") {
      query = query.eq("direction", direction);
    }
    if (year) query = query.like("nomor_agenda", `%/${year}/%`);
    if (month) query = query.like("nomor_agenda", `%/${String(month).padStart(2, "0")}/%`);
    if (date_from) query = query.gte("tanggal", date_from);
    if (date_to) query = query.lte("tanggal", date_to);
    if (q) {
      query = query.or(
        `nomor_agenda.ilike.%${q}%,nomor_surat.ilike.%${q}%,Perihal.ilike.%${q}%,kepada.ilike.%${q}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) return serverError(res, "Gagal mengambil data agenda.");

    // Count summary by direction
    let outCount = 0,
      inCount = 0;
    if (!direction && !q) {
      const { count: out } = await sb
        .from("surat_agenda")
        .select("*", { count: "exact", head: true })
        .eq("direction", "outgoing");
      const { count: inn } = await sb
        .from("surat_agenda")
        .select("*", { count: "exact", head: true })
        .eq("direction", "incoming");
      outCount = out ?? 0;
      inCount = inn ?? 0;
    }

    return ok(res, {
      items: data ?? [],
      summary: { outgoing: outCount, incoming: inCount },
      pagination: {
        total: count ?? 0,
        page,
        limit,
        hasMore: offset + (data?.length ?? 0) < (count ?? 0),
      },
    });
  } catch (err) {
    console.error("[surat-agenda] GET error:", err);
    return serverError(res);
  }
});

// ── POST /api/surat-agenda ────────────────────────────────────────────────

router.post("/", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const {
    direction,
    tanggal,
    kode_surat,
    nomor_surat,
    Perihal,
    kepada,
    asal_surat,
    lampiran_url,
    keterangan,
  } = req.body ?? {};
  const userId = req.adminSession?.userId;

  if (!direction || !["outgoing", "incoming"].includes(direction)) {
    return badRequest(res, "Direction wajib: outgoing atau incoming.");
  }
  if (!tanggal) return badRequest(res, "Tanggal wajib diisi.");
  if (!Perihal) return badRequest(res, "Perihal wajib diisi.");

  const year = new Date(tanggal).getFullYear();

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Generate agenda number atomically
    const { data: counterData, error: counterErr } = await sb.rpc("get_next_agenda_number", {
      p_direction: direction,
      p_year: year,
    });

    if (counterErr || !counterData) {
      console.error("[surat-agenda] Counter error:", counterErr);
      return serverError(res, "Gagal generate nomor agenda.");
    }

    const nomor_agenda = counterData;

    const { data, error } = await sb
      .from("surat_agenda")
      .insert({
        direction,
        nomor_agenda,
        tanggal,
        kode_surat: kode_surat?.trim() || null,
        nomor_surat: nomor_surat?.trim() || null,
        Perihal: Perihal.trim(),
        kepada: kepada?.trim() || null,
        asal_surat: asal_surat?.trim() || null,
        lampiran_url: lampiran_url?.trim() || null,
        keterangan: keterangan?.trim() || null,
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[surat-agenda] Insert error:", error.message);
      return serverError(res, "Gagal menyimpan agenda.");
    }

    // Audit log
    await sb.from("audit_log").insert({
      action: "surat_agenda.create",
      table_name: "surat_agenda",
      details: `Created agenda ${nomor_agenda} (${direction}) for ${Perihal}`,
      username: userId ?? "admin",
    });

    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[surat-agenda] POST unexpected error:", err);
    return serverError(res);
  }
});

export default router;
