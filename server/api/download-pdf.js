/**
 * POST /api/download-pdf
 *
 * Authorization:
 *   - Admin session (HMAC-signed + revocation check): can download any approved document
 *   - Warga session token: can only download their own documents (NIK match)
 *
 * Only surat with status="Disetujui" can be downloaded.
 *
 * Auth: Admin HMAC session OR warga session
 * Body: { no: string }
 * Response: { ok: true, data: { surat, warga, settings } } or { ok: false, error: string, code: number }
 */

import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole, isSessionRevoked } from "../middleware/auth.js";
import {
  badRequest,
  unauthorized,
  forbidden,
  unavailable,
  serverError,
  ok,
} from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
const IS_PROD = process.env.NODE_ENV === "production";

// ── Helpers ────────────────────────────────────────────────────────────────────

function hmacVerify(data, sig, secret) {
  if (!sig || sig.length === 0) return false;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

function buildSignPayload(userId, role, expiresAt) {
  return `${userId}|${role}|${expiresAt}`;
}

function parseSession(req) {
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!sessionToken) return null;

  try {
    return JSON.parse(sessionToken);
  } catch {
    return null;
  }
}

async function verifyAccess(req) {
  const session = parseSession(req);
  if (!session) return { valid: false, type: null };

  // ── Admin session (HMAC-signed + revocation check) ──
  if (session.role && session.expiresAt) {
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { valid: false, type: "admin", reason: "Session expired" };
    }

    const ALLOWED_ROLES = [
      "Super Admin",
      "Operator",
      "Verifikator",
      "Kepala Desa",
      "Sekretaris Desa",
    ];
    if (ALLOWED_ROLES.includes(session.role)) {
      // Revocation check
      const userId = String(session.userId ?? "");
      if (userId && (await isSessionRevoked(userId))) {
        return { valid: false, type: "admin", reason: "SESSION_REVOKED" };
      }

      // HMAC verification
      if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
        const sig = session.sig ?? "";
        if (sig.length === 0) {
          if (IS_PROD) return { valid: false, type: "admin", reason: "Signature required" };
          // Dev: allow unsigned
        } else {
          const payload = buildSignPayload(
            String(session.userId ?? ""),
            String(session.role ?? ""),
            String(session.expiresAt ?? ""),
          );
          if (!hmacVerify(payload, sig, ADMIN_SESSION_SECRET)) {
            return { valid: false, type: "admin", reason: "Invalid signature" };
          }
        }
      }

      return { valid: true, type: "admin" };
    }
  }

  // ── Warga session (NIK-based) ──
  if (session.nik && session.token) {
    return { valid: true, type: "warga", wargaNik: session.nik };
  }

  return { valid: false, type: null };
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { no } = req.body ?? {};

  if (!no || typeof no !== "string" || no.trim().length === 0) {
    return badRequest(res, "Parameter 'no' wajib diisi.");
  }

  // Authorization check
  const auth = await verifyAccess(req);
  if (!auth.valid) {
    if (auth.reason === "SESSION_REVOKED") {
      return unauthorized(res, "Sesi telah dicabut. Silakan login ulang.");
    }
    return unauthorized(res, "Unauthorized — silakan login terlebih dahulu.");
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
      return unavailable(res, `Surat '${no}' tidak ditemukan di database.`);
    }

    if (suratRow.status !== "Disetujui") {
      return forbidden(
        res,
        `PDF tidak tersedia — surat berstatus '${suratRow.status}'. Hanya surat yang Disetujui yang dapat diunduh.`,
      );
    }

    // Ownership check — warga can only download their own documents
    if (auth.type === "warga") {
      const recordNik = String(suratRow.nik ?? "");
      if (auth.wargaNik !== recordNik) {
        return forbidden(res, "Anda tidak memiliki akses ke dokumen ini.");
      }
    }

    const record = suratRow;
    const dataJson = record.data ?? record.data_json ?? {};
    const stringData = {};
    for (const [k, v] of Object.entries(dataJson)) {
      stringData[k] = String(v ?? "");
    }

    // Fetch warga
    const nik = String(record.nik ?? "");
    const { data: wargaRow } = await sb.from("warga").select("*").eq("nik", nik).single();

    // Fetch settings
    const { data: settingsRow } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "main_settings")
      .single();

    const settingsData = settingsRow?.value ?? {};
    const villageSettings = settingsData?.village ?? {};

    const surat = {
      no: String(record.no ?? no),
      kode: String(record.kode ?? ""),
      nama_surat: String(record.nama_surat ?? ""),
      pemohon: String(record.pemohon ?? ""),
      nik,
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
    console.error("[download-pdf] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
