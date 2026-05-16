/**
 * Edge Function: /api/generate-pdf
 *
 * Generate PDF surat resmi dengan QR code verifikasi.
 * Token QR aman karena di-generate di server-side.
 *
 * Env vars (via Cloudflare Pages Secrets):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (NEVER expose to browser)
 *   QR_SECRET                 — HMAC-SHA256 secret untuk QR payload verification
 *
 * Request body:
 *   { no: string }                     → fetch dari Supabase (production)
 *   { no: string, mock: true, ... }   → data mock (development only)
 *
 * Returns: application/pdf
 */

// Vite inline module — @supabase/supabase-js tersedia karena ada di package.json dependencies
import { createClient } from "@supabase/supabase-js";
import { hmacSha256Hex } from "../_lib/utils";
import { generateSuratPdf } from "../../src/lib/pdf-generator";
import { getSettings } from "../../src/lib/settings-store";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

// ---- Types ----

interface PdfRequest {
  no?: string;
  mock?: boolean;
  [key: string]: unknown;
}

// ---- Supabase Admin Client (server-side only) ----

interface Env {
  ADMIN_SESSION_SECRET: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

function createAdminClient(env: Env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---- Mock Data Generators ----

function generateMockSurat(data: Record<string, unknown>) {
  const tahun = new Date().getFullYear();
  const bulan = new Date().getMonth() + 1;
  const romawi = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][
    bulan
  ];
  const noUrut = "001";
  const kode = String(data.kode ?? "SKD");
  return {
    no: `${data.no ?? `${kode}/${noUrut}/KDS.SRMB/${romawi}/${tahun}`}`,
    kode,
    nama_surat: String(data.nama_surat ?? "Surat Keterangan Domisili"),
    pemohon: String(data.pemohon ?? "Ahmad Saifullah"),
    nik: String(data.nik ?? "5203011501900001"),
    kontak: String(data.kontak ?? "081234567890"),
    data: data as Record<string, string>,
    status: "Disetujui" as const,
    signed_at: new Date().toISOString(),
    signed_by: "H. Sumardi, S.Sos.",
    qr_payload: (() => {
      const no = String(data.no ?? `${kode}/${noUrut}/KDS.SRMB/${romawi}/${tahun}`);
      const nik = String(data.nik ?? "5203011501900001");
      const timestamp = Date.now().toString();
      // Format: SERUNI-MUMBUL|no|nik|kode|timestamp|signature
      // In mock/dev mode, no secret available — use "unsigned"
      const dataPart = `SERUNI-MUMBUL|${no}|${nik}|${kode}|${timestamp}`;
      return `${dataPart}|unsigned`;
    })(),
    created_at: new Date().toISOString(),
  };
}

function generateMockWarga(nama: string, nik: string) {
  // NOTE: Data ini adalah fallback last-resort untuk development mode saja.
  // Production flow gunakan mapDbWargaToPenduduk() yang baca dari Supabase.
  // Wilayah data (provinsi/kabupaten/kecamatan/desa) diambil dari settings-store,
  // tapi jika tidak tersedia (edge runtime), gunakan konstanta berikut:
  return {
    nik,
    nama,
    tempat_lahir: "Lombok Timur",
    tanggal_lahir: "1990-01-15",
    jenis_kelamin: "Laki-Laki",
    agama: "Islam",
    status_perkawinan: "Kawin",
    pekerjaan: "Petani",
    kewarganegaraan: "WNI",
    alamat: "Jl. Raya Seruni Mumbul No. 12",
    rt: "002",
    rw: "001",
    dusun: "Mandar",
    desa: "Seruni Mumbul", // dari wilayah-store (fallback)
    kecamatan: "Pringgabaya", // dari wilayah-store (fallback)
    kabupaten: "Lombok Timur", // dari wilayah-store (fallback)
    provinsi: "Nusa Tenggara Barat", // dari wilayah-store (fallback)
    no_kk: "5203011501900003",
    no_hp: "081234567890",
    // ── kolom baru dari migration 006 ──
    status_dalam_kk: "Kepala Keluarga",
    pendidikan: "SMA/Sederajat",
    pendapatan_bulan: "2500000",
    suku: "Sasak",
    kepemilikan_rumah: "Milik Sendiri",
    luas_rumah: "80 m2",
    jumlah_lantai: "1",
    jenis_lantai: "Keramik",
    jenis_dinding: "Tembok",
    jenis_atap: "Genteng",
    kepemilikan_tanah: "Milik",
    luas_tanah: "1200 m2",
    penerangan: "Listrik PLN",
    sumber_energi_masak: "LPG",
    mck: "Milik Sendiri",
    sumber_air: "Sumur",
    bantuan_sosial: "Tidak",
    bantuan_extra: "Tidak",
    bpjs_kesehatan: "Ya",
    bpjs_ketenagakerjaan: "Tidak",
    kepemilikan_aset: "Televisi, Kulkas, Motor",
    kondisi_fisik: "Normal",
    nama_ibu: "Siti Aminah",
    nama_bapak: "H. Mahmud",
    golongan_darah: "O",
  };
}

// ---- DB Record Mappers ----

function mapDbSuratToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const dataJson = (row.data_json as Record<string, unknown>) ?? {};
  const stringData: Record<string, string> = {};
  Object.entries(dataJson).forEach(([k, v]) => {
    stringData[k] = String(v ?? "");
  });
  return {
    no: row.no ?? row.no_surat, // migration 024: no_surat → no
    kode: row.kode,
    nama_surat: row.nama_surat,
    pemohon: row.pemohon,
    nik: row.nik,
    kontak: row.kontak,
    data: stringData,
    status: row.status,
    catatan: row.catatan ?? undefined,
    signed_at: row.signed_at ? String(row.signed_at) : undefined,
    signed_by: row.signed_by ? String(row.signed_by) : undefined,
    qr_payload: row.qr_payload ? String(row.qr_payload) : undefined,
    created_at: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
  };
}

function mapDbWargaToPenduduk(row: Record<string, unknown>): Record<string, unknown> {
  return {
    // ── identitas ──
    nik: row.nik,
    nama: row.nama,
    tempat_lahir: row.tempat_lahir ?? "",
    tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir) : "",
    jenis_kelamin: row.jenis_kelamin === "Perempuan" ? "Perempuan" : "Laki-Laki",
    status_dalam_kk: row.status_dalam_kk ?? "Anggota",
    no_kk: row.no_kk ?? "",
    status_perkawinan: (row.status_perkawinan ?? row.status_kawin ?? "Belum Kawin") as string,
    pendidikan: row.pendidikan ?? "",
    pekerjaan: row.pekerjaan ?? "-",
    pendapatan_bulan: row.pendapatan_bulan ?? "0",
    kewarganegaraan: row.kewarganegaraan ?? "Indonesia",
    agama: row.agama ?? "Islam",
    suku: row.suku ?? "",
    // ── lokasi ──
    alamat: row.alamat ?? "",
    rt: row.rt ?? "",
    rw: row.rw ?? "",
    dusun: row.dusun ?? "",
    desa: row.desa ?? "Seruni Mumbul",
    kecamatan: row.kecamatan ?? "Pringgabaya",
    kabupaten: row.kabupaten ?? "Lombok Timur",
    provinsi: row.provinsi ?? "Nusa Tenggara Barat",
    // ── kontak ──
    no_hp: row.no_hp ?? "",
    // ── perumahan ──
    kepemilikan_rumah: row.kepemilikan_rumah ?? "-",
    luas_rumah: row.luas_rumah ?? "-",
    jumlah_lantai: row.jumlah_lantai ?? "-",
    jenis_lantai: row.jenis_lantai ?? "-",
    jenis_dinding: row.jenis_dinding ?? "-",
    jenis_atap: row.jenis_atap ?? "-",
    kepemilikan_tanah: row.kepemilikan_tanah ?? "-",
    luas_tanah: row.luas_tanah ?? "-",
    // ── fasilitas ──
    penerangan: row.penerangan ?? "-",
    sumber_energi_masak: row.sumber_energi_masak ?? "-",
    mck: row.mck ?? "-",
    sumber_air: row.sumber_air ?? "-",
    // ── sosial & kesehatan ──
    bantuan_sosial: row.bantuan_sosial ?? "Tidak",
    bantuan_extra: row.bantuan_extra ?? "Tidak",
    bpjs_kesehatan: row.bpjs_kesehatan ?? "Tidak",
    bpjs_ketenagakerjaan: row.bpjs_ketenagakerjaan ?? "Tidak",
    kepemilikan_aset: row.kepemilikan_aset ?? "Tidak",
    kondisi_fisik: row.kondisi_fisik ?? "Normal",
    // ── keluarga ──
    nama_ibu: row.nama_ibu ?? "",
    nama_bapak: row.nama_bapak ?? "",
    golongan_darah: row.golongan_darah ?? "-",
  };
}

// ---- Main Handler ----

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  // Rate limit first — no auth required for approved documents
  // Public download: warga yang mengajukan bisa mengunduh PDF suratnya sendiri
  // asal surat sudah berstatus "Disetujui". Tidak perlu login.
  // Admin auth hanya untuk audit trail (logged separately di updateAuditLog).
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  const { request, env } = context;

  let body: PdfRequest;
  try {
    body = (await request.json()) as PdfRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.no) {
    return new Response("Parameter 'no' (nomor surat) wajib diisi", { status: 400 });
  }

  try {
    const settings = getSettings();

    let surat: Record<string, unknown>;
    let warga: Record<string, unknown>;

    if (body.mock === true) {
      return new Response(JSON.stringify({ error: "Mock mode disabled in production" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Production: fetch dari Supabase via admin client
      const sb = createAdminClient(env);
      if (!sb) {
        return new Response(
          JSON.stringify({
            error: "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }

      // Fetch surat record (migration 024: no_surat → no)
      const { data: suratRow, error: suratErr } = await sb
        .from("surat_requests")
        .select("*")
        .eq("no", body.no)
        .single();

      if (suratErr || !suratRow) {
        return new Response(
          JSON.stringify({ error: `Surat '${body.no}' tidak ditemukan di database` }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Access control: only Disetujui records can be downloaded as PDF
      const record = suratRow as Record<string, unknown>;
      if (record.status !== "Disetujui") {
        return new Response(
          JSON.stringify({
            error: `PDF tidak tersedia — surat berstatus '${record.status}'. Hanya surat yang Disetujui yang dapat diunduh.`,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      // Extract key fields first — used by both existing payload and legacy fallback
      const recordNik = String(record.nik ?? "");
      const recordNo = String(record.no ?? record.no_surat ?? body.no);
      const recordKode = String(record.kode ?? "");

      // Use existing qr_payload if already set (signed at approval time by admin).
      // This ensures QR on PDF matches QR shown on verifikasi page — same timestamp.
      // For legacy records without qr_payload, regenerate using signed_at timestamp.
      let qrPayload: string;
      const existingPayload = record.qr_payload ? String(record.qr_payload) : undefined;
      if (existingPayload) {
        qrPayload = existingPayload;
      } else {
        // Legacy fallback: regenerate with signed_at as timestamp (or now if also missing)
        const timestamp = record.signed_at
          ? new Date(record.signed_at as string).getTime().toString()
          : Date.now().toString();
        const dataPart = `SERUNI-MUMBUL|${recordNo}|${recordNik}|${recordKode}|${timestamp}`;
        const secret = settings.signature.qr_secret;
        qrPayload = secret
          ? `${dataPart}|${await hmacSha256Hex(dataPart, secret)}`
          : `${dataPart}|unsigned`;
      }
      record.qr_payload = qrPayload;

      // Assign signed record to surat BEFORE warga lookup
      surat = mapDbSuratToRecord(record);

      // Fetch warga data
      const nik = String(surat.nik ?? "");
      const { data: wargaRow } = await sb.from("warga").select("*").eq("nik", nik).single();

      if (!wargaRow) {
        // Fallback: warga not in DB, use data from surat record
        warga = {
          nik,
          nama: String(surat.pemohon ?? ""),
          tempat_lahir: "",
          tanggal_lahir: "",
          jenis_kelamin: "Laki-laki",
          agama: "Islam",
          status_perkawinan: "Belum Kawin",
          pekerjaan: "-",
          kewarganegaraan: "WNI",
          alamat: "",
          rt: "",
          rw: "",
          dusun: "",
          desa: settings.village.name,
          kecamatan: settings.village.district,
          kabupaten: settings.village.regency,
          provinsi: settings.village.province,
          no_kk: "",
          no_hp: String(surat.kontak ?? ""),
        };
      } else {
        warga = mapDbWargaToPenduduk(wargaRow as Record<string, unknown>);
      }
    }

    const pdfBytes = await generateSuratPdf({ surat, warga, settings, includeQr: true });

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${String(surat.no).replace(/\/[\\/]+/g, "-")}.pdf"`,
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[generate-pdf] Error:", err);
    // Jangan expose detail error ke client — hanya log ke server.
    return new Response(JSON.stringify({ error: "Gagal generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
