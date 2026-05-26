/**
 * POST /api/surat/estimasi
 *
 * Returns estimated processing duration per letter type in hours.
 * Sourced from surat_types table (with defaults) and cached server-side.
 *
 * Auth: None (public)
 * Body: {} (empty)
 * Response: { ok: true, data: { estimasi: Record<string, number> } }
 */

import express from "express";
import { ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Defaults (jam kerja) ───────────────────────────────────────────────────────

const DEFAULT_ESTIMASI = {
  // Kependudukan
  SKD: 8,
  PINDAH_DOMISILI: 24,
  PENDATANG: 24,
  KK_BARU: 24,
  BEDA_NAMA: 24,
  ALAMAT_SEMENTARA: 16,
  "SP-KTP": 8,
  "SP-KK": 8,
  // Sosial & Ekonomi
  SKTM: 16,
  SK_PENGHASILAN: 16,
  SK_KEHILANGAN: 24,
  SP_SKCK: 16,
  SK_KELAKUAN_BAIK: 16,
  SK_TIDAK_PUNYA_KERJA: 16,
  VERIF_DTKS: 16,
  // Pernikahan & Keluarga
  SK_BELUM_MENIKAH: 24,
  SK_NIKAH: 32,
  SK_NIKAH_NONMUSLIM: 32,
  SK_JANDA: 24,
  SK_DUDA: 24,
  SK_HUBUNGAN_KELUARGA: 32,
  SK_AHLI_WARIS: 40,
  DISPENSA_NIKAH: 40,
  WALINIKAH: 40,
  // Usaha & Ekonomi
  SKU: 16,
  IZIN_KERAMAIAN: 24,
  SK_PETERNAK: 16,
  SK_PENGRAJIN: 16,
  SK_PEDAGANG_PASAR: 16,
  // Tanah & Properti
  SK_TANAH_MILIK: 40,
  SK_TANAH_TIDAK_SENGKETA: 40,
  SK_HIBAH_TANAH: 40,
  SK_JUAL_BELI_TANAH: 40,
  SK_RUMAH_MILIK: 32,
  SK_BELUM_PUNYA_RUMAH: 24,
  SK_TANAH_WAKAF: 48,
  "SP-PTSL": 40,
  SP_PENDAFTARAN_TANAH: 40,
  // Pendidikan
  SK_BEASISWA: 16,
  SK_PENELITIAN: 24,
  SK_PUTUS_SEKOLAH: 16,
  SK_AKTIF_SEKOLAH: 16,
  // Kesehatan & Khusus
  SK_DISABILITAS: 24,
  SK_LANSIA: 24,
  SK_YATIM_PIATU: 24,
  SK_HAMIL: 16,
  // Pertanian & Lingkungan
  SK_PETANI: 16,
  SK_NELAYAN: 16,
  SK_BENCANA: 32,
  SK_PENGGUNAAN_LAHAN: 32,
  SK_KELOMPOK_TANI: 24,
  // Surat Dinas
  SP_INSTANSI: 24,
  SURAT_BANTUAN: 32,
  SURAT_REKOMENDASI: 32,
  // Surat Umum & Lainnya
  SPTJM: 16,
  SURAT_KUASA: 24,
  SK_WNI_KETURUNAN: 32,
  SK_HARGI: 16,
  SK_PASPOR: 24,
  SK_TKI: 32,
  SK_ORGANISASI: 16,
  SK_TIDAK_DI_DESA: 16,
  // Kelahiran & Kematian
  SP_AKTA_KEMATIAN: 32,
  SP_AKTA_KELAHIRAN: 32,
  SP_AKTA_LAHIR: 32,
  SP_VERIF_KELAHIRAN: 24,
  // Others
  SP_IZIN_REKLAME: 24,
  SP_SANGGAR: 32,
  SP_BEBAS_NARKOBA: 24,
  SP_PENEBANGAN_POHON: 32,
  SP_PENGGALANGAN_DANA: 40,
  SK_HARGA_TANAH: 32,
  SK_LAHIR_MATI: 32,
  SK_IZIN_ORANG_TUA: 40,
  // Fallback
  DEFAULT: 24,
};

// ── Server-side Cache ─────────────────────────────────────────────────────────

let cachedEstimasi = null;
let cacheFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ────────────────────────────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "count=none",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ── Route Handler ───────────────────────────────────────��─────────────────────

router.post("/", async (req, res) => {
  // Return cached data if fresh
  if (cachedEstimasi && Date.now() - cacheFetchedAt < CACHE_TTL_MS) {
    return ok(res, { estimasi: cachedEstimasi });
  }

  // Try to fetch from Supabase surat_types table
  if (SUPABASE_URL && SERVICE_KEY) {
    try {
      const dbRes = await supabaseFetch("surat_types?select=kode,estimasi_jam&order=kode.asc");

      if (dbRes.ok) {
        const data = await dbRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const fromDb = {};
          for (const row of data) {
            if (row.kode && row.estimasi_jam) {
              fromDb[row.kode] = Number(row.estimasi_jam);
            }
          }
          cachedEstimasi = { ...DEFAULT_ESTIMASI, ...fromDb };
        }
      }
    } catch {
      // Fall through to defaults
    }
  }

  // Use defaults if no DB or cache miss
  if (!cachedEstimasi) {
    cachedEstimasi = DEFAULT_ESTIMASI;
  }
  cacheFetchedAt = Date.now();

  return ok(res, { estimasi: cachedEstimasi });
});

export default router;
