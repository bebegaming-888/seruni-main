/**
 * Edge Function: /api/generate-pdf
 *
 * Generate PDF surat resmi dengan QR code verifikasi.
 * Token QR aman karena di-generate di server-side.
 *
 * Request body:
 *   { recordId: string }
 * Atau (untuk demo/development):
 *   { mock: true, kode: string, no: string, nama: string, ... }
 *
 * Returns: application/pdf
 */
import { generateSuratPdf } from "../../src/lib/pdf-generator";
import { getSettings } from "../../src/lib/settings-store";
// NOTE: Untuk production, getRecord dan warga lookup harus dari Supabase.
// Ini menggunakan fallback localStorage.

interface PdfRequest {
  recordId?: string;
  mock?: boolean;
  [key: string]: unknown;
}

function generateMockSurat(data: Record<string, unknown>) {
  return {
    no: String(data.no ?? "001/SKD/2025"),
    kode: String(data.kode ?? "SKD"),
    nama_surat: String(data.nama_surat ?? "Surat Keterangan Domisili"),
    pemohon: String(data.pemohon ?? "Ahmad Saifullah"),
    nik: String(data.nik ?? "5203011501900001"),
    kontak: String(data.kontak ?? "081234567890"),
    data: data as Record<string, string>,
    status: "Disetujui" as const,
    signed_at: new Date().toISOString(),
    signed_by: "H. Sumardi, S.Sos.",
    qr_payload: `SERUNI-MUMBUL-2025|${data.no ?? "001"}|${Date.now()}`,
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

export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { request } = context;

  let body: PdfRequest;
  try {
    body = (await request.json()) as PdfRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.mock && !body.recordId) {
    return new Response("recordId atau mock wajib diisi", { status: 400 });
  }

  try {
    const settings = getSettings();

    let surat;
    let warga;

    if (body.mock) {
      // Demo mode — generate PDF dari data mock
      surat = generateMockSurat(body as Record<string, unknown>);
      warga = generateMockWarga(
        String(body.pemohon ?? "Ahmad Saifullah"),
        String(body.nik ?? "5203011501900001"),
      );
    } else {
      // Production: get from Supabase via admin client
      // Untuk saat ini fallback ke localStorage lookup
      // TODO: Wire ke Supabase Admin client setelah Fase 1
      const { getRecord } = await import("../../src/lib/esurat-store");
      const record = getRecord(body.recordId!);
      if (!record) {
        return new Response("Record tidak ditemukan", { status: 404 });
      }
      surat = record;

      // TODO: wire ke Supabase untuk lookup warga
      const { lookupPendudukLocal } = await import("../../src/lib/esurat-store");
      const p = lookupPendudukLocal(surat.nik);
      if (!p) {
        return new Response("Data warga tidak ditemukan", { status: 404 });
      }
      warga = p as Parameters<typeof generateSuratPdf>[0]["warga"];
    }

    const pdfBytes = await generateSuratPdf({ surat, warga, settings, includeQr: true });

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${surat.no.replace(/\/[\\/]+/g, "-")}.pdf"`,
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
