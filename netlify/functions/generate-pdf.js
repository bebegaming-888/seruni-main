/**
 * Netlify Function: generate-pdf
 *
 * Lightweight handler — fetches surat + warga + settings from Supabase,
 * returns JSON payload for client-side PDF generation (jsPDF).
 *
 * Env vars (set via Netlify dashboard):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
  "Cache-Control": "private, max-age=60",
};

function json(data, status = 200) {
  return { statusCode: status, headers, body: JSON.stringify(data) };
}

// ── Fetch settings from app_settings ─────────────────────────────────────────
async function fetchSettings() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "main_settings")
    .single();

  return data?.value ?? null;
}

exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { no } = body;
  if (!no) {
    return json({ ok: false, error: "Parameter 'no' (nomor surat) wajib diisi" }, 400);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "Supabase not configured" }, 503);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Fetch surat record
  const { data: suratRow, error: suratErr } = await sb
    .from("surat_requests")
    .select("*")
    .eq("no", no)
    .single();

  if (suratErr || !suratRow) {
    return json({ ok: false, error: `Surat '${no}' tidak ditemukan di database` }, 404);
  }

  if (suratRow.status !== "Disetujui") {
    return json({ ok: false, error: `PDF tidak tersedia — surat berstatus '${suratRow.status}'. Hanya surat yang Disetujui yang dapat diunduh.` }, 403);
  }

  const record = suratRow;
  const dataJson = (record.data_json ?? {}) as Record<string, string>;
  const stringData = {};
  for (const [k, v] of Object.entries(dataJson)) stringData[k] = String(v ?? "");

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
    created_at: record.created_at ? new Date(record.created_at).toISOString() : new Date().toISOString(),
  };

  // Fetch warga
  const nik = String(record.nik ?? "");
  const { data: wargaRow } = await sb.from("warga").select("*").eq("nik", nik).single();

  const settingsData = await fetchSettings() ?? {};
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
    signature: settingsData?.signature ?? { signer_name: "H. Sumardi, S.Sos.", signer_title: "Kepala Desa" },
  };

  return json({ ok: true, surat, warga, settings });
};