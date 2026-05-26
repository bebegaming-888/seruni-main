/**
 * POST /api/generate-pdf
 *
 * Lightweight handler — fetches surat + warga + settings from Supabase,
 * returns JSON payload for client-side PDF generation (jsPDF).
 *
 * Auth: Admin session (full verification + role check)
 * Body: { no: string }
 * Response: { ok: true, data: { surat, warga, settings } } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import {
  badRequest,
  notFound,
  forbidden,
  unavailable,
  serverError,
  ok,
} from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fetchSettings() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "main_settings")
    .single();
  return data?.value ?? null;
}

// ── Middleware: verify + role check ─────────────────────────────────────────

async function generatePdfAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;

  const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator", "Kepala Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;

  next();
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", generatePdfAuth, async (req, res) => {
  const { no } = req.body ?? {};

  if (!no || typeof no !== "string" || no.trim().length === 0) {
    return badRequest(res, "Parameter 'no' (nomor surat) wajib diisi.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return unavailable(res, "Database belum dikonfigurasi.");
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch surat record
    const { data: suratRow, error: suratErr } = await sb
      .from("surat_requests")
      .select("*")
      .eq("no", no)
      .single();

    if (suratErr || !suratRow) {
      return notFound(res, `Surat '${no}'`);
    }

    if (suratRow.status !== "Disetujui") {
      return forbidden(
        res,
        `PDF tidak tersedia — surat berstatus '${suratRow.status}'. Hanya surat yang Disetujui yang dapat diunduh.`,
      );
    }

    const record = suratRow;
    const dataJson = record.data ?? record.data_json ?? {};
    const stringData = {};
    for (const [k, v] of Object.entries(dataJson)) {
      stringData[k] = String(v ?? "");
    }

    const surat = {
      no: String(record.no ?? record.no_surat ?? no),
      kode: String(record.kode ?? ""),
      nama_surat: String(record.nama_surat ?? ""),
      pemohon: String(record.pemohon ?? ""),
      nik: String(record.nik ?? ""),
      kontak: String(record.kontak ?? ""),
      data: stringData,
      status: String(record.status ?? ""),
      catatan: record.catatan ? String(record.catatan) : undefined,
      signed_at: record.signed_at ? String(record.signed_at) : undefined,
      signed_by: record.signed_by ? String(record.signed_by) : undefined,
      qr_payload: record.qr_payload ? String(record.qr_payload) : undefined,
      created_at: record.created_at
        ? new Date(record.created_at).toISOString()
        : new Date().toISOString(),
    };

    // Fetch warga
    const nik = String(record.nik ?? "");
    const { data: wargaRow } = await sb.from("warga").select("*").eq("nik", nik).single();

    const settingsData = (await fetchSettings()) ?? {};
    const villageSettings = settingsData?.village ?? {};

    const warga = {
      nik,
      nama: String(wargaRow?.nama ?? record.pemohon ?? ""),
      tempat_lahir: String(wargaRow?.tempat_lahir ?? ""),
      tanggal_lahir: wargaRow?.tanggal_lahir ? String(wargaRow.tanggal_lahir) : "",
      jenis_kelamin: wargaRow?.jenis_kelamin === "Perempuan" ? "Perempuan" : "Laki-Laki",
      status_perkawinan: String(wargaRow?.status_perkawinan ?? "Belum Kawin"),
      pekerjaan: String(wargaRow?.pekerjaan ?? "-"),
      kewarganegaraan: String(wargaRow?.kewarganegaraan ?? "WNI"),
      agama: String(wargaRow?.agama ?? "Islam"),
      alamat: String(wargaRow?.alamat ?? ""),
      rt: String(wargaRow?.rt ?? ""),
      rw: String(wargaRow?.rw ?? ""),
      dusun: String(wargaRow?.dusun ?? ""),
      desa: String(wargaRow?.desa ?? villageSettings?.name ?? "Seruni Mumbul"),
      kecamatan: String(wargaRow?.kecamatan ?? villageSettings?.district ?? "Pringgabaya"),
      kabupaten: String(wargaRow?.kabupaten ?? villageSettings?.regency ?? "Lombok Timur"),
      provinsi: String(wargaRow?.provinsi ?? villageSettings?.province ?? "Nusa Tenggara Barat"),
      no_kk: String(wargaRow?.no_kk ?? ""),
      no_hp: String(wargaRow?.no_hp ?? ""),
    };

    const settings = {
      village: villageSettings,
      branding: settingsData?.branding ?? { primary_color: "#1e3a5f" },
      signature: settingsData?.signature ?? {
        signer_name: "H. Sumardi, S.Sos.",
        signer_title: "Kepala Desa",
      },
    };

    return ok(res, { surat, warga, settings });
  } catch (err) {
    console.error("[generate-pdf] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
