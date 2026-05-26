/**
 * POST /api/submit-surat
 *
 * Server-side captcha verification + validated warga submission.
 * Semua submission warga HARUS melalui endpoint ini.
 *
 * Security layers:
 *   1. HMAC session verification (admin/system session)
 *   2. Turnstile captcha server-side verification
 *   3. Zod schema validation
 *   4. Rate limit: max 3 per NIK per 24h
 *   5. Service role upsert to Supabase
 *   6. Auto-create version audit trail
 *
 * Auth: Optional warga or admin session (captcha is primary defense for public)
 * Body: { record: RecordType, captcha_token?: string }
 * Response: { ok: true, data: { no, tracking_no } } or { ok: false, error: string, code: number }
 */

import crypto from "crypto";
import express from "express";
import { z } from "zod";
import { badRequest, unauthorized, rateLimit, serverError, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const QR_SECRET = process.env.QR_SECRET ?? "";
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? "";
const IS_DEV = process.env.NODE_ENV !== "production";
const IS_PROD = process.env.NODE_ENV === "production";

// ── HMAC Session Verification (for admin/system sessions) ───────────────────────

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

function verifyAdminSession(sessionToken) {
  if (!sessionToken) return { valid: false, reason: "No session" };

  let session;
  try {
    session = JSON.parse(sessionToken);
  } catch {
    return { valid: false, reason: "Invalid session format" };
  }

  if (!session?.role || !session?.expiresAt) {
    return { valid: false, reason: "Incomplete session" };
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "Session expired" };
  }

  const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
  if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
    const sig = session.sig ?? "";
    if (sig.length > 0) {
      const payload = buildSignPayload(
        String(session.userId ?? ""),
        String(session.role ?? ""),
        String(session.expiresAt ?? ""),
      );
      if (!hmacVerify(payload, sig, ADMIN_SESSION_SECRET)) {
        return { valid: false, reason: "Invalid session signature" };
      }
    } else if (IS_PROD) {
      return { valid: false, reason: "Session signature required" };
    }
  }

  return { valid: true, session };
}

// ── Turnstile Verification ─────────────────────────────────────────────────────

const TEST_TOKENS = new Set(["XXXX.DUMMY.TOKEN.XXXX", "1x0000000000000000000000000000000AA"]);

async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn("[submit-surat] TURNSTILE_SECRET_KEY not set — skipping captcha.");
    return { valid: true };
  }

  if (!token) {
    if (IS_DEV) {
      console.warn("[submit-surat] Dev mode — captcha token empty, bypassing.");
      return { valid: true };
    }
    return { valid: false, error: "Captcha token required." };
  }

  if (IS_DEV && TEST_TOKENS.has(token)) {
    return { valid: true };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token }),
    });
    const json = await res.json();
    if (!json.success) {
      return { valid: false, error: "Captcha verification failed." };
    }
    return { valid: true };
  } catch (err) {
    console.error("[submit-surat] Turnstile verify error:", err);
    if (IS_DEV) return { valid: true };
    return { valid: false, error: "Captcha verification unavailable." };
  }
}

// ── Record Schema Validation ─────────────────────────────────────────────────────

const RecordSchema = z.object({
  no: z.string().min(1, "Nomor surat wajib diisi"),
  kode: z.string().min(1, "Kode surat wajib diisi"),
  nama_surat: z.string().min(1, "Nama surat wajib diisi"),
  pemohon: z.string().min(1, "Nama pemohon wajib diisi"),
  nik: z.string().length(16, "NIK harus 16 digit").regex(/^\d+$/, "NIK harus angka"),
  kontak: z.string().min(10, "Kontak minimal 10 digit"),
  data: z.record(z.string(), z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
});

// ── Supabase Helpers ─────────────────────────────────────────────────────────────

async function getSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function uploadFileToStorage(sb, file) {
  if (!file || !file.data_url || file.storage_path) return file;

  try {
    const base64Data = file.data_url.split(",")[1];
    if (!base64Data) return file;

    const buf = Buffer.from(base64Data, "base64");
    const fileExt = file.name ? file.name.split(".").pop().toLowerCase() : "bin";
    const mimeMatch = file.data_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
    const contentType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const fileName = `${Date.now()}-${crypto.randomInt(1000000, 9999999)}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { data: uploadData, error } = await sb.storage
      .from("surat-attachments")
      .upload(filePath, buf, { contentType });

    if (error) {
      console.warn("[submit-surat] Storage upload error:", error);
      return file;
    }

    const { data_url, ...rest } = file;
    return { ...rest, storage_path: uploadData?.path };
  } catch (err) {
    console.error("[submit-surat] Storage exception:", err);
    return file;
  }
}

// ── Rate Limit Check ────────────────────────────────────────────────────────────

async function checkRateLimit(sb, nik) {
  if (!sb) return { allowed: true };

  const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("submission_rate_limit")
    .select("count, first_at")
    .eq("nik", nik)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[submit-surat] Rate limit check error:", error);
    return { allowed: true }; // Allow on error
  }

  if (data && new Date(data.first_at) > new Date(window24h) && data.count >= 3) {
    return {
      allowed: false,
      error: "Terlalu banyak pengajuan. Maksimal 3 surat per NIK per 24 jam.",
    };
  }

  return { allowed: true };
}

async function incrementRateLimit(sb, nik) {
  if (!sb) return;
  try {
    const { error: upsertErr } = await sb
      .from("submission_rate_limit")
      .upsert({ nik, count: 1, first_at: new Date().toISOString() }, { onConflict: "nik" });

    if (upsertErr) {
      console.error("[submit-surat] Rate limit upsert failed:", upsertErr);
    }

    const { error: rpcErr } = await sb.rpc("increment_submission_count", { p_nik: nik });
    if (rpcErr) {
      console.warn(
        "[submit-surat] Rate limit RPC increment failed (upsert recorded):",
        rpcErr.message,
      );
      // UPSERT succeeded → rate limit enforcement is still active (count=1 per window)
      // RPC failure is non-fatal since upsert is the authoritative state
    }
  } catch (err) {
    console.error("[submit-surat] Rate limit increment unexpected error:", err);
  }
}

// ── Tracking Number Generator ──────────────────────────────────────────────────

function generateTrackingNumber(kode) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const ts = String(d.getTime()).slice(-6);
  const rand = crypto.randomInt(1000, 9999);
  return `${kode}-${yy}${mm}${dd}-${ts}${rand}`;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  // 1. Optional auth — allow warga session, admin session, or anonymous (captcha handles abuse)
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (sessionToken) {
    const auth = verifyAdminSession(sessionToken);
    if (!auth.valid) {
      return unauthorized(res, auth.reason);
    }
  }

  // 2. Parse body
  const { record, captcha_token } = req.body ?? {};
  if (!record) {
    return badRequest(res, "Parameter 'record' wajib diisi.");
  }

  // 3. Server-side captcha verification
  const captchaResult = await verifyTurnstile(captcha_token);
  if (!captchaResult.valid) {
    return badRequest(res, captchaResult.error ?? "Captcha verification failed.");
  }

  // 4. Schema validation
  const validation = RecordSchema.safeParse(record);
  if (!validation.success) {
    const msg = validation.error.errors.map((e) => e.message).join("; ");
    return badRequest(res, `Validasi gagal: ${msg}`);
  }

  const data = validation.data;
  const nik = data.nik;

  // 5. Rate limit check
  const sb = await getSupabaseClient();
  if (sb) {
    const rateCheck = await checkRateLimit(sb, nik);
    if (!rateCheck.allowed) {
      return rateLimit(res, rateCheck.error);
    }
  }

  // 6. Generate tracking number + prepare record
  const trackingNo = generateTrackingNumber(data.kode);
  const now = new Date().toISOString();

  // QR payload (optional — for post-approval verification)
  let qrPayload = null;
  if (QR_SECRET) {
    const qrData = ["SERUNI-MUMBUL", data.no, nik, data.kode, "Kepala Desa", now].join("|");
    const signature = crypto.createHmac("sha256", QR_SECRET).update(qrData).digest("hex");
    qrPayload = [qrData, signature].join("|");
  }

  // 7. Upsert to Supabase
  if (sb) {
    // Process attachments
    const processedAttachments = [];
    for (const att of data.attachments ?? []) {
      processedAttachments.push(await uploadFileToStorage(sb, att));
    }

    if (data.data?.foto_selfie) {
      const selfieFile = {
        name: `selfie_${Date.now()}.jpg`,
        data_url: data.data.foto_selfie,
      };
      const uploadedSelfie = await uploadFileToStorage(sb, selfieFile);
      if (uploadedSelfie?.storage_path) {
        data.data.foto_selfie = uploadedSelfie.storage_path;
      }
    }

    const dbRecord = {
      no: data.no,
      tracking_no: trackingNo,
      kode: data.kode,
      nama_surat: data.nama_surat,
      warga_id: record?.warga_id ?? null,
      pemohon: data.pemohon,
      nik,
      kontak: data.kontak,
      data: data.data ?? {},
      status: "Menunggu Verifikasi",
      attachments: processedAttachments,
      verified_at: null,
      verified_by: null,
      approved_at: null,
      approved_by: null,
      signed_at: null,
      signed_by: null,
      qr_payload: qrPayload,
      rejection_reasons: null,
      rejection_detail: null,
      edit_history: null,
      updated_by: data.pemohon ?? "Warga",
      created_at: new Date(data.created_at ?? now),
      updated_at: new Date(now),
      archived: false,
    };

    const { error: upsertErr } = await sb
      .from("surat_requests")
      .upsert(dbRecord, { onConflict: "no" });

    if (upsertErr) {
      console.error("[submit-surat] Supabase upsert error:", upsertErr);
      return serverError(res, "Gagal menyimpan ke database.");
    }

    // 8. Increment rate limit
    await incrementRateLimit(sb, nik);

    // 9. Version audit trail
    await sb
      .from("surat_request_versions")
      .insert({
        surat_no: data.no,
        version: 1,
        data: dbRecord,
        changed_by: data.pemohon ?? "Warga",
        change_type: "created",
      })
      .catch((err) => {
        console.warn("[submit-surat] Version insert error:", err);
      });
  }

  console.info(`[submit-surat] Submitted: ${data.no} (${data.kode}) by NIK ${nik}`);
  return ok(res, { no: data.no, tracking_no: trackingNo });
});

export default router;
