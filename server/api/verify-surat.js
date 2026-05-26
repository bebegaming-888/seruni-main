/**
 * POST /api/verify-surat
 *
 * Public endpoint — NO authentication required.
 * Fetches surat record by tracking number or NIK from Supabase (service role).
 * Used by public verification page /verifikasi/$no
 *
 * Auth: None (public)
 * Body: { no?: string, q?: string } — lookup key (tracking no or NIK)
 * Response:
 *   NIK search → { ok: true, data: { records: [...] } }
 *   Exact match → { ok: true, data: { record: {...} } }
 *   Error → { ok: false, error: string, code: number }
 */

import express from "express";
import { badRequest, notFound, unavailable, serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Rate Limiting ───────────────────────────────────────────────────────────────

// In-memory sliding window — max 5 NIK searches per IP per 60 seconds
const _rateMap = new Map();
const RATE_LIMIT_N = 5;
const RATE_WINDOW_MS = 60_000;

function rateLimitNik(ip) {
  const now = Date.now();
  const entries = (_rateMap.get(ip) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (entries.length >= RATE_LIMIT_N) return false;
  entries.push(now);
  _rateMap.set(ip, entries);
  return true;
}

function maskPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length <= 4) return phone;
  if (cleaned.startsWith("62")) {
    return "+62 " + "●".repeat(cleaned.length - 6) + cleaned.slice(-6);
  }
  return phone.slice(0, 4) + "●".repeat(Math.max(0, phone.length - 8)) + phone.slice(-4);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

/** Public-safe field projection — never exposes internal details */
function publicRecord(record) {
  // Mask NIK: show only first 4 + last 4 digits (UU PDP Indonesia)
  const nikMasked = record.nik ? record.nik.slice(0, 4) + "****" + record.nik.slice(-4) : undefined;
  return {
    no: record.no,
    kode: record.kode,
    nama_surat: record.nama_surat,
    pemohon: record.pemohon,
    nik: nikMasked,
    kontak: record.kontak ? maskPhone(record.kontak) : undefined,
    status: record.status,
    catatan: record.catatan,
    signed_at: record.signed_at,
    signed_by: record.signed_by,
    signer_title: record.signer_title,
    qr_payload: record.qr_payload,
    created_at: record.created_at,
    updated_at: record.updated_at,
    status_history: record.status_history,
  };
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { no: byNo, q: byQ } = req.body ?? {};

  // Accept { no } or { q } for backward compat
  const lookupKey = byNo ?? byQ;

  if (!lookupKey || typeof lookupKey !== "string" || lookupKey.trim().length === 0) {
    return badRequest(res, "Parameter 'no' atau 'q' wajib diisi.");
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[verify-surat] SUPABASE_URL or SERVICE_KEY not set.");
    return unavailable(res, "Database belum dikonfigurasi.");
  }

  const isNikSearch = /^\d{16}$/.test(lookupKey.trim());

  // Rate limit NIK searches to prevent enumeration
  if (isNikSearch) {
    const clientIp =
      (req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() ??
      req.socket?.remoteAddress ??
      "unknown";
    if (!rateLimitNik(clientIp)) {
      return res.status(429).json({
        ok: false,
        error: "Terlalu banyak pencarian. Silakan coba lagi dalam 1 menit.",
        code: 429,
      });
    }
  }

  try {
    let data2;

    if (isNikSearch) {
      // NIK search — return all matching records
      const nikRes = await supabaseFetch(
        `surat_requests?nik=eq.${encodeURIComponent(lookupKey)}&select=*&order=created_at.desc&limit=10`,
      );
      if (!nikRes.ok) {
        console.error("[verify-surat] Supabase NIK search failed:", nikRes.status);
        return serverError(res);
      }
      data2 = await nikRes.json();
    } else {
      // Exact match by tracking number OR no field
      const res2 = await supabaseFetch(
        `surat_requests?or=(no.eq.${encodeURIComponent(lookupKey)},tracking_no.eq.${encodeURIComponent(lookupKey)})&select=*&limit=1`,
      );
      if (!res2.ok) {
        console.error("[verify-surat] Supabase exact match failed:", res2.status);
        return serverError(res);
      }
      data2 = await res2.json();
    }

    if (!data2 || (Array.isArray(data2) && data2.length === 0)) {
      return notFound(res, "Surat");
    }

    // NIK search → array; exact match → single object
    if (isNikSearch) {
      return ok(res, { records: (data2 ?? []).map(publicRecord) });
    }
    return ok(res, { record: publicRecord(Array.isArray(data2) ? data2[0] : data2) });
  } catch (err) {
    console.error("[verify-surat] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
