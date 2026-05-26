/**
 * GET /api/pengaduan/track/:ticket
 *
 * Public tracking endpoint for warga to check pengaduan status.
 * No auth required. Rate limited via publicEndpointRateLimiter.
 *
 * Returns sanitized data (no admin notes, no admin_tindak visible to public).
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, ok, notFound } from "../../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

// ── GET /api/pengaduan/track/:ticket ───────────────────────────────────────

router.get("/track/:ticket", async (req, res) => {
  const { ticket } = req.params;
  if (!ticket) return badRequest(res, "Ticket wajib diisi.");

  // Sanitize ticket input
  const cleanTicket = ticket.trim().toUpperCase().slice(0, 20);

  if (!SUPABASE_URL || !ANON_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  try {
    const sb = createClient(SUPABASE_URL, ANON_KEY);

    const { data, error } = await sb
      .from("pengaduan")
      .select(
        "ticket, nama, kontak, kategori, judul, isi, status, prioritas, created_at, updated_at, resolved_at",
      )
      .eq("ticket", cleanTicket)
      .single();

    if (error || !data) return notFound(res, "Pengaduan");

    // Sanitize phone (show only first 3 + last 4)
    const phone = String(data.kontak ?? "");
    const maskedPhone = phone.length > 7 ? phone.slice(0, 3) + "****" + phone.slice(-4) : phone;

    // Sanitize pelapor name (first name only)
    const maskedName = String(data.nama ?? "").split(" ")[0] + " ***";

    return ok(res, {
      ticket: data.ticket,
      nama: maskedName,
      kontak: maskedPhone,
      kategori: data.kategori,
      judul: data.judul,
      isi: data.isi,
      status: data.status,
      prioritas: data.prioritas,
      created_at: data.created_at,
      updated_at: data.updated_at,
      resolved_at: data.resolved_at,
    });
  } catch (err) {
    console.error("[pengaduan/track] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
