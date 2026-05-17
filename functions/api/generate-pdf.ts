/**
 * Edge Function: /api/generate-pdf
 *
 * Lightweight handler — fetches surat + warga + settings from Supabase,
 * returns JSON payload for client-side PDF generation (jsPDF).
 *
 * PDF generation is done CLIENT-SIDE in the browser:
 *   import { generateSuratPdf } from "@/lib/pdf-generator";
 *   const pdfBytes = await generateSuratPdf({ surat, warga, settings, includeQr: false });
 *
 * QR code: already pre-computed and stored in qr_payload at approval time.
 * The client embeds it from the record's qr_payload field.
 *
 * Env vars (Cloudflare Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { no: string }  — fetch dari Supabase (production)
 *
 * Response:
 *   { ok: true, surat, warga, settings }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions } from "../_lib/utils";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface PdfRequest {
  no: string;
}

interface SettingsVillage {
  name: string;
  head: string;
  district: string;
  regency: string;
  address: string;
  phone: string;
  email?: string;
  province?: string;
}

interface SettingsSignature {
  signer_name: string;
  signer_title: string;
  require_qr: boolean;
  qr_secret?: string;
}

interface Settings {
  village: SettingsVillage;
  branding: { primary_color: string };
  signature: SettingsSignature;
}

/** Fetch village + signature settings from app_settings. */
async function fetchSettings(sb: ReturnType<typeof createClient>): Promise<Settings> {
  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "main_settings")
    .single();

  const defVillage: SettingsVillage = {
    name: "Seruni Mumbul",
    head: "H. Sumardi, S.Sos.",
    district: "Pringgabaya",
    regency: "Lombok Timur",
    address: "Jl. Raya Pringgabaya No. 88",
    phone: "+62 812-3456-7890",
    province: "Nusa Tenggara Barat",
  };

  const defSignature: SettingsSignature = {
    signer_name: "H. Sumardi, S.Sos.",
    signer_title: "Kepala Desa",
    require_qr: true,
  };

  if (!data?.value || typeof data.value !== "object") {
    return {
      village: defVillage,
      branding: { primary_color: "#1e3a5f" },
      signature: defSignature,
    };
  }

  const val = data.value as Record<string, unknown>;

  // village
  const villageRaw = val.village;
  const village: SettingsVillage =
    villageRaw && typeof villageRaw === "object" && !Array.isArray(villageRaw)
      ? ({
          name: String((villageRaw as Record<string, unknown>).name ?? defVillage.name),
          head: String((villageRaw as Record<string, unknown>).head ?? defVillage.head),
          district: String((villageRaw as Record<string, unknown>).district ?? defVillage.district),
          regency: String((villageRaw as Record<string, unknown>).regency ?? defVillage.regency),
          address: String((villageRaw as Record<string, unknown>).address ?? defVillage.address),
          phone: String((villageRaw as Record<string, unknown>).phone ?? defVillage.phone),
          email: String((villageRaw as Record<string, unknown>).email ?? ""),
          province: String((villageRaw as Record<string, unknown>).province ?? defVillage.province),
        } as SettingsVillage)
      : defVillage;

  // branding
  const brandingRaw = val.branding;
  const branding =
    brandingRaw && typeof brandingRaw === "object" && !Array.isArray(brandingRaw)
      ? { primary_color: String((brandingRaw as Record<string, unknown>).primary_color ?? "#1e3a5f") }
      : { primary_color: "#1e3a5f" };

  // signature
  const sigRaw = val.signature;
  const signature: SettingsSignature =
    sigRaw && typeof sigRaw === "object" && !Array.isArray(sigRaw)
      ? ({
          signer_name: String((sigRaw as Record<string, unknown>).signer_name ?? defSignature.signer_name),
          signer_title: String((sigRaw as Record<string, unknown>).signer_title ?? defSignature.signer_title),
          require_qr: Boolean((sigRaw as Record<string, unknown>).require_qr ?? defSignature.require_qr),
          qr_secret: undefined,
        } as SettingsSignature)
      : defSignature;

  return { village, branding, signature };
}

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: PdfRequest;
  try {
    body = (await context.request.json()) as PdfRequest;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  if (!body.no) {
    return json({ ok: false, error: "Parameter 'no' (nomor surat) wajib diisi" }, 400);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Supabase not configured" }, 503);
  }

  // Fetch surat record (migration 024: no_surat → no)
  const { data: suratRow, error: suratErr } = await sb
    .from("surat_requests")
    .select("*")
    .eq("no", body.no)
    .single();

  if (suratErr || !suratRow) {
    return json({ ok: false, error: `Surat '${body.no}' tidak ditemukan di database` }, 404);
  }

  const record = suratRow as Record<string, unknown>;

  // Access control: only Disetujui records can be downloaded as PDF
  if (record.status !== "Disetujui") {
    return json(
      {
        ok: false,
        error: `PDF tidak tersedia — surat berstatus '${record.status}'. Hanya surat yang Disetujui yang dapat diunduh.`,
      },
      403,
    );
  }

  // Map surat record
  const dataJson = (record.data_json as Record<string, unknown>) ?? {};
  const stringData: Record<string, string> = {};
  Object.entries(dataJson).forEach(([k, v]) => {
    stringData[k] = String(v ?? "");
  });

  const surat = {
    no: String(record.no ?? record.no_surat ?? body.no),
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
      ? new Date(record.created_at as string).toISOString()
      : new Date().toISOString(),
  };

  // Fetch warga
  const nik = String(record.nik ?? "");
  const { data: wargaRow } = await sb.from("warga").select("*").eq("nik", nik).single();

  let warga: Record<string, string>;
  if (!wargaRow) {
    // Fallback: warga not in DB, use data from surat record + settings
    const settingsData = await fetchSettings(sb);
    warga = {
      nik,
      nama: String(surat.pemohon ?? ""),
      tempat_lahir: "",
      tanggal_lahir: "",
      jenis_kelamin: "Laki-Laki",
      agama: "Islam",
      status_perkawinan: "Belum Kawin",
      pekerjaan: "-",
      kewarganegaraan: "WNI",
      alamat: "",
      rt: "",
      rw: "",
      dusun: "",
      desa: settingsData?.village?.name ?? "Seruni Mumbul",
      kecamatan: settingsData?.village?.district ?? "Pringgabaya",
      kabupaten: settingsData?.village?.regency ?? "Lombok Timur",
      provinsi: settingsData?.village?.province ?? "Nusa Tenggara Barat",
      no_kk: "",
      no_hp: String(surat.kontak ?? ""),
    };
  } else {
    const wr = wargaRow as Record<string, unknown>;
    warga = {
      nik: String(wr.nik ?? ""),
      nama: String(wr.nama ?? ""),
      tempat_lahir: String(wr.tempat_lahir ?? ""),
      tanggal_lahir: wr.tanggal_lahir ? String(wr.tanggal_lahir) : "",
      jenis_kelamin: wr.jenis_kelamin === "Perempuan" ? "Perempuan" : "Laki-Laki",
      status_perkawinan: String(wr.status_perkawinan ?? wr.status_kawin ?? "Belum Kawin"),
      pekerjaan: String(wr.pekerjaan ?? "-"),
      kewarganegaraan: String(wr.kewarganegaraan ?? "WNI"),
      agama: String(wr.agama ?? "Islam"),
      alamat: String(wr.alamat ?? ""),
      rt: String(wr.rt ?? ""),
      rw: String(wr.rw ?? ""),
      dusun: String(wr.dusun ?? ""),
      desa: String(wr.desa ?? "Seruni Mumbul"),
      kecamatan: String(wr.kecamatan ?? "Pringgabaya"),
      kabupaten: String(wr.kabupaten ?? "Lombok Timur"),
      provinsi: String(wr.provinsi ?? "Nusa Tenggara Barat"),
      no_kk: String(wr.no_kk ?? ""),
      no_hp: String(wr.no_hp ?? ""),
    };
  }

  // Fetch settings
  const settings = await fetchSettings(sb);

  return json({ ok: true, surat, warga, settings }, 200, {
    "Cache-Control": "private, max-age=60",
  });