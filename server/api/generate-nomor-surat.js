/**
 * POST /api/generate-nomor-surat
 *
 * Generate nomor surat resmi (atomic, no duplicates).
 * Format: {klasifikasi}/{noUrut:3digit}/{inisialJabatan}.{inisialDesa}/{bulanRomawi}/{tahun}
 *
 * CRITICAL: Uses atomic RPC — no fallback. If RPC fails, returns 503.
 *
 * Auth: Admin session (full verification + role check)
 * Body: { kode: string, klasifikasi: string, inisialJabatan?: string, inisialDesa?: string }
 * Response: { ok: true, data: { nomor: string } } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { badRequest, unavailable, serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Constants ────────────────────────────────────────────────────────────────

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const INISIAL_RE = /^[A-Z0-9.]+$/;
const MAX_INISIAL_LEN = 10;
const DEFAULT_INISIAL_JABATAN = "KDS";
const DEFAULT_INISIAL_DESA = "SRMB";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Whitelist-validate an inisial value — prevents injection into letter numbers. */
function sanitizeInisial(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim().slice(0, MAX_INISIAL_LEN);
  if (trimmed.length === 0) return null;
  if (!INISIAL_RE.test(trimmed)) return null;
  return trimmed;
}

function formatNomorSurat(klasifikasi, noUrut, tahun, bulan, inisialJabatan, inisialDesa) {
  const bulanRomawi = ROMAWI[bulan] ?? "";
  return `${klasifikasi}/${String(noUrut).padStart(3, "0")}/${inisialJabatan}.${inisialDesa}/${bulanRomawi}/${tahun}`;
}

async function fetchSettingsInisial() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { inisialJabatan: DEFAULT_INISIAL_JABATAN, inisialDesa: DEFAULT_INISIAL_DESA };
  }
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "main_settings")
      .single();
    const settings = data?.value ?? {};
    return {
      inisialJabatan: settings?.nomor?.inisialJabatan || DEFAULT_INISIAL_JABATAN,
      inisialDesa: settings?.nomor?.inisialDesa || DEFAULT_INISIAL_DESA,
    };
  } catch {
    return { inisialJabatan: DEFAULT_INISIAL_JABATAN, inisialDesa: DEFAULT_INISIAL_DESA };
  }
}

// ── Middleware: verify + role check ─────────────────────────────────────────

async function generateNomorAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;

  const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator", "Kepala Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;

  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", generateNomorAuth, async (req, res) => {
  const {
    kode,
    klasifikasi,
    inisialJabatan: reqInisialJabatan,
    inisialDesa: reqInisialDesa,
  } = req.body ?? {};

  if (!kode || typeof kode !== "string" || kode.trim().length === 0) {
    return badRequest(res, "Parameter 'kode' wajib diisi.");
  }
  if (!klasifikasi || typeof klasifikasi !== "string" || klasifikasi.trim().length === 0) {
    return badRequest(res, "Parameter 'klasifikasi' wajib diisi.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return unavailable(res, "Database belum dikonfigurasi.");
  }

  // Sanitize inisial values — prevent injection into letter numbers
  const sanitizedJabatan = sanitizeInisial(reqInisialJabatan);
  const sanitizedDesa = sanitizeInisial(reqInisialDesa);

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const tahun = new Date().getFullYear();
    const bulan = new Date().getMonth() + 1;

    // Resolve inisial — prefer request body, fallback to Supabase settings
    let inisialJabatan = sanitizedJabatan;
    let inisialDesa = sanitizedDesa;
    if (!inisialJabatan || !inisialDesa) {
      const fromSettings = await fetchSettingsInisial();
      inisialJabatan = inisialJabatan || fromSettings.inisialJabatan;
      inisialDesa = inisialDesa || fromSettings.inisialDesa;
    }

    // Atomic RPC — NO FALLBACK
    const { data: nextCounter, error: rpcErr } = await sb.rpc("increment_nomor_surat_counter", {
      p_tahun: tahun,
    });

    if (rpcErr) {
      console.error(
        "[generate-nomor-surat] RPC failed — refusing fallback to prevent duplicate nomor:",
        rpcErr.message,
      );
      return unavailable(
        res,
        "Generator nomor surat tidak tersedia. Hubungi administrator untuk pemeriksaan database.",
      );
    }

    const nomor = formatNomorSurat(
      klasifikasi,
      nextCounter ?? 1,
      tahun,
      bulan,
      inisialJabatan,
      inisialDesa,
    );

    console.info(`[generate-nomor-surat] Generated: ${nomor} by ${req.adminSession.username}`);
    return ok(res, { nomor });
  } catch (err) {
    console.error("[generate-nomor-surat] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
