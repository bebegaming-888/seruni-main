/**
 * Edge Function: /api/generate-pdf
 *
 * Generate PDF surat resmi dengan QR code verifikasi.
 * Token QR aman karena di-generate di server-side.
 *
 * Env vars (via Cloudflare Secrets / wrangler):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (NEVER expose to browser)
 *
 * Request body:
 *   { no: string }                     → fetch dari Supabase (production)
 *   { no: string, mock: true, ... }   → data mock (development only)
 *
 * Returns: application/pdf
 */

// Vite inline module — @supabase/supabase-js tersedia karena ada di package.json dependencies
import { createClient } from "@supabase/supabase-js";
import { generateSuratPdf } from "../../src/lib/pdf-generator";
import { getSettings } from "../../src/lib/settings-store";

// ---- Types ----

interface PdfRequest {
  no?: string;
  mock?: boolean;
  [key: string]: unknown;
}

// ---- Supabase Admin Client (server-side only) ----

interface Env {
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
    qr_payload: `SERUNI-MUMBUL|${String(data.no ?? `${kode}/${noUrut}/KDS.SRMB/${romawi}/${tahun}`)}|${Date.now()}`,
    created_at: new Date().toISOString(),
  };
}

function generateMockWarga(nama: string, nik: string) {
  return {
    nik,
    nama,
    tempat_lahir: "Lombok Timur",
    tanggal_lahir: "1990-01-15",
    jenis_kelamin: "Laki-laki" as const,
    agama: "Islam",
    status_perkawinan: "Kawin" as const,
    pekerjaan: "Petani",
    kewarganegaraan: "WNI",
    alamat: "Jl. Raya Seruni Mumbul No. 12",
    rt: "002",
    rw: "001",
    dusun: "Mumbul Timur",
    desa: "Seruni Mumbul",
    kecamatan: "Pringgabaya",
    kabupaten: "Lombok Timur",
    provinsi: "Nusa Tenggara Barat",
    no_kk: "5203011501900003",
    no_hp: "081234567890",
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
    no: row.no_surat,
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
    nik: row.nik,
    nama: row.nama,
    tempat_lahir: row.tempat_lahir ?? "",
    tanggal_lahir: row.tanggal_lahir ?? "",
    jenis_kelamin: row.jenis_kelamin ?? "Laki-laki",
    agama: row.agama ?? "Islam",
    status_perkawinan: row.status_kawin ?? "Belum Kawin",
    pekerjaan: row.pekerjaan ?? "-",
    kewarganegaraan: row.kewarganegaraan ?? "WNI",
    alamat: row.alamat ?? "",
    rt: row.rt ?? "",
    rw: row.rw ?? "",
    dusun: row.dusun ?? "",
    desa: row.desa ?? "Seruni Mumbul",
    kecamatan: row.kecamatan ?? "Pringgabaya",
    kabupaten: row.kabupaten ?? "Lombok Timur",
    provinsi: row.provinsi ?? "Nusa Tenggara Barat",
    no_kk: row.no_kk ?? "",
    no_hp: row.no_hp ?? "",
  };
}

// ---- Main Handler ----

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
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
      // Development mock mode — tidak perlu Supabase
      surat = generateMockSurat(body);
      warga = generateMockWarga(
        String(body.pemohon ?? "Ahmad Saifullah"),
        String(body.nik ?? "5203011501900001"),
      );
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

      // Fetch surat record
      const { data: suratRow, error: suratErr } = await sb
        .from("surat_requests")
        .select("*")
        .eq("no_surat", body.no)
        .single();

      if (suratErr || !suratRow) {
        return new Response(
          JSON.stringify({ error: `Surat '${body.no}' tidak ditemukan di database` }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      surat = mapDbSuratToRecord(suratRow as Record<string, unknown>);

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
      },
    });
  } catch (err) {
    console.error("[generate-pdf] Error:", err);
    return new Response(JSON.stringify({ error: "Gagal generate PDF", detail: String(err) }), {
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
