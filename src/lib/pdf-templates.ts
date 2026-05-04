/**
 * Type-Specific PDF Templates for E-Surat
 *
 * Each template category has its own layout, fields, and body text.
 * Templates are selected based on the letter's category in SURAT_MASTER.
 *
 * Categories:
 * - KETERANGAN_GENERIK  → SKD, SKTM, SKU, SK kehilangan, SK kelakuan, dll (most common)
 * - PENGANTAR           → SP-KTP, SP-KK, SP-NIKAH, dan surat pengantar lainnya
 * - PERNIKAHAN          → SK-NIKAH (N-1 s/d N-6), SK_NON_MUSLIM, DISPENSA_NIKAH, dll
 * - TANAH               → SK_TANAH_MILIK, SK_JUAL_BELI_TANAH, SK_HIBAH_TANAH, dll
 * - PERNYATAAN          → SPTJM, SURAT_KUASA (materai notice, legal disclaimer)
 * - DINAS               → SP_INSTANSI, SURAT_BANTUAN, SURAT_REKOMENDASI
 */

import type { SuratRecord } from "@/lib/esurat-store";
import type { Penduduk } from "@/data/penduduk";
import type { SystemSettings } from "@/lib/settings-store";

export type TemplateCategory =
  | "KETERANGAN_GENERIK"
  | "PENGANTAR"
  | "PERNIKAHAN"
  | "TANAH"
  | "PERNYATAAN"
  | "DINAS";

export type PdfGenContext = {
  surat: SuratRecord;
  warga: Penduduk;
  settings: SystemSettings;
};

/* ==================== TEMPLATE REGISTRY ==================== */

export function getTemplateCategory(kode: string): TemplateCategory {
  if (
    kode === "SKD" ||
    kode === "SKTM" ||
    kode === "SKU" ||
    kode === "SK_PENGHASILAN" ||
    kode === "SK_KEHILANGAN" ||
    kode === "SP_SKCK" ||
    kode === "SK_KELAKUAN_BAIK" ||
    kode === "SK_TIDAK_PUNYA_KERJA" ||
    kode === "VERIF_DTKS" ||
    kode === "BEDA_NAMA" ||
    kode === "ALAMAT_SEMENTARA" ||
    kode === "SK_BELUM_MENIKAH" ||
    kode === "SK_JANDA" ||
    kode === "SK_DUDA" ||
    kode === "SK_HUBUNGAN_KELUARGA" ||
    kode === "SK_ORGANISASI" ||
    kode === "SK_TIDAK_DI_DESA" ||
    kode === "SK_DISABILITAS" ||
    kode === "SK_LANSIA" ||
    kode === "SK_YATIM_PIATU" ||
    kode === "SK_HAMIL" ||
    kode === "SK_BEASISWA" ||
    kode === "SK_PENELITIAN" ||
    kode === "SK_PUTUS_SEKOLAH" ||
    kode === "SK_AKTIF_SEKOLAH" ||
    kode === "SK_PETERNAK" ||
    kode === "SK_NELAYAN" ||
    kode === "SK_BENCANA" ||
    kode === "SK_PENGGUNAAN_LAHAN" ||
    kode === "SK_KELOMPOK_TANI" ||
    kode === "SK_PENGRAJIN" ||
    kode === "SK_PEDAGANG_PASAR" ||
    kode === "SK_RUMAH_MILIK" ||
    kode === "SK_BELUM_PUNYA_RUMAH" ||
    kode === "SK_WNI_KETURUNAN" ||
    kode === "SK_HAJI" ||
    kode === "SK_PASPOR" ||
    kode === "SK_TKI" ||
    kode === "PINDAH_DOMISILI" ||
    kode === "PENDATANG" ||
    kode === "KK_BARU"
  ) {
    return "KETERANGAN_GENERIK";
  }

  if (
    kode === "SP_KTP" ||
    kode === "SP_KK" ||
    kode === "SP-NIKAH" ||
    kode === "SP_PTSL" ||
    kode === "SP_AKTA_KELAHIRAN" ||
    kode === "SP_AKTA_KEMATIAN" ||
    kode === "SP_AKTA_LAHIR" ||
    kode === "SP_IZIN_REKLAME" ||
    kode === "SP_IMB" ||
    kode === "SP_SANGGAR" ||
    kode === "SP_BEBAS_NARKOBA" ||
    kode === "SP_PENEBANGAN_POHON" ||
    kode === "SP_PENGGALANGAN_DANA" ||
    kode === "SP_PENDAFTARAN_TANAH" ||
    kode === "SP_VERIF_KELAHIRAN"
  ) {
    return "PENGANTAR";
  }

  if (
    kode === "SK_NIKAH" ||
    kode === "SK_NIKAH_NONMUSLIM" ||
    kode === "SK_AHLI_WARIS" ||
    kode === "DISPENSA_NIKAH" ||
    kode === "WALI_NIKAH"
  ) {
    return "PERNIKAHAN";
  }

  if (
    kode === "SK_TANAH_MILIK" ||
    kode === "SK_TANAH_TIDAK_SENGKETA" ||
    kode === "SK_HIBAH_TANAH" ||
    kode === "SK_JUAL_BELI_TANAH" ||
    kode === "SK_TANAH_WAKAF"
  ) {
    return "TANAH";
  }

  if (kode === "SPTJM" || kode === "SURAT_KUASA") {
    return "PERNYATAAN";
  }

  return "DINAS";
}

/* ==================== KOP SURAT ==================== */
// Kop surat is rendered in pdf-generator.ts using StandardFonts.
// This file only defines body content per template category.

/* ==================== KETERANGAN_GENERIK BODY ==================== */

export function buildBodyKeterangan(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  // Format date helper
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  lines.push(`Yang bertanda tangan di bawah ini, Kepala Desa ${context.settings.village.name},`);
  lines.push(
    `Kecamatan ${context.settings.village.district} — Kabupaten ${context.settings.village.regency},`,
  );
  lines.push("menerangkan bahwa:");
  lines.push("");

  // Identity block
  lines.push(`Nama           : ${warga.nama}`);
  lines.push(`NIK            : ${warga.nik}`);
  lines.push(`Tempat/Tgl Lahir: ${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  lines.push(`Jenis Kelamin  : ${warga.jenis_kelamin}`);
  lines.push(`Agama          : ${warga.agama}`);
  lines.push(`Alamat         : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`               Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");
  lines.push("Adalah benar warga kami dan surat ini dibuat untuk keperluan:");
  lines.push("");

  // Data fields (skip keperluan, it comes after)
  Object.entries(data).forEach(([key, value]) => {
    if (!value || key === "keperluan") return;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${value}`);
  });

  lines.push("");
  const keperluan = data.keperluan ?? data.keperluan ?? "mengajukan surat ini";
  lines.push(`              ${keperluan}`);
  lines.push("");
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );

  return lines;
}

/* ==================== PENGANTAR BODY ==================== */

export function buildBodyPengantar(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  lines.push(
    `Yang bertanda tangan di bawah ini, Pemerintah Desa ${context.settings.village.name},`,
  );
  lines.push(
    `Kecamatan ${context.settings.village.district} — Kabupaten ${context.settings.village.regency},`,
  );
  lines.push("dengan ini memberikan PENGANTAR kepada:");
  lines.push("");
  lines.push(`Nama           : ${warga.nama}`);
  lines.push(`NIK            : ${warga.nik}`);
  lines.push(`Tempat/Tgl Lahir: ${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  lines.push(`Alamat         : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`               Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");

  const keperluan = data.keperluan ?? data.keterangan ?? "Pengajuan ke instansi terkait";
  lines.push(`Untuk keperluan: ${keperluan}`);
  lines.push("");
  lines.push(
    "Demikian pengantar ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
  );

  return lines;
}

/* ==================== TANAH BODY ==================== */

export function buildBodyTanah(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  lines.push(`Yang bertanda tangan di bawah ini, Kepala Desa ${context.settings.village.name},`);
  lines.push(
    `Kecamatan ${context.settings.village.district} — Kabupaten ${context.settings.village.regency},`,
  );
  lines.push("menerangkan dengan sebenarnya bahwa:");
  lines.push("");
  lines.push(`Nama           : ${warga.nama}`);
  lines.push(`NIK            : ${warga.nik}`);
  lines.push(`Tempat/Tgl Lahir: ${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  lines.push(`Alamat         : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`               Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");
  lines.push("Berdasarkan[data yang kami miliki dan setelah dilakukan verification di lapangan,");
  lines.push("dengan ini kami menyatakan bahwa:");
  lines.push("");

  // Tanah fields
  if (data.lokasi_tanah) lines.push(`Lokasi Tanah   : ${data.lokasi_tanah}`);
  if (data.luas_tanah) lines.push(`Luas Tanah     : ${data.luas_tanah}`);
  if (data.batas) lines.push(`Batas-batas    : ${data.batas}`);
  if (data.harga) lines.push(`Harga Transaksi: ${data.harga}`);
  if (data.penjual) lines.push(`Penjual        : ${data.penjual}`);
  if (data.pembeli) lines.push(`Pembeli        : ${data.pembeli}`);
  if (data.penerima_hibah) lines.push(`Penerima Hibah : ${data.penerima_hibah}`);
  if (data.nadzir_wakaf) lines.push(`Nadzir Wakaf   : ${data.nadzir_wakaf}`);
  if (data.keperluan) lines.push(`Keperluan      : ${data.keperluan}`);
  lines.push("");
  lines.push("Surat keterangan ini adalah KETERANGAN dari Pemerintah Desa dan BUKAN merupakan");
  lines.push("bukti hak kepemilikan tanah. Untuk kepastian hak hukum, silakan menghubungi BPN.");
  lines.push("");
  lines.push("Demikian surat ini dibuat dengan sebenar-benarnya dan sebaik-baiknya.");

  return lines;
}

/* ==================== PERNYATAAN BODY ==================== */

export function buildBodyPernyataan(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  lines.push(`Yang bertanda tangan di bawah ini:`);
  lines.push("");
  lines.push(`Nama           : ${warga.nama}`);
  lines.push(`NIK            : ${warga.nik}`);
  lines.push(`Tempat/Tgl Lahir: ${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  lines.push(`Alamat         : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`               Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");
  lines.push("Dengan ini menyatakan dan bertanggung jawab penuh atas:");
  lines.push("");

  if (data.judul_pernyataan) lines.push(`Judul Pernyataan: ${data.judul_pernyataan}`);
  if (data.isi_pernyataan) {
    lines.push("");
    lines.push("Isi Pernyataan:");
    lines.push(...data.isi_pernyataan.split("\n"));
  }
  if (data.penerima_kuasa) lines.push(`Penerima Kuasa  : ${data.penerima_kuasa}`);
  if (data.nik_penerima_kuasa) lines.push(`NIK Penerima Kuasa: ${data.nik_penerima_kuasa}`);
  if (data.wewenang) {
    lines.push("");
    lines.push("Wewenang yang diberikan:");
    lines.push(...data.wewenang.split("\n"));
  }
  if (data.keperluan) {
    lines.push("");
    lines.push(`Keperluan      : ${data.keperluan}`);
  }
  lines.push("");
  lines.push(
    "Surat pernyataan ini dibuat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.",
  );
  lines.push(
    "Apabila keterangan ini tidak sesuai dengan keadaan sebenarnya, saya bersedia dituntut",
  );
  lines.push("sesuai hukum yang berlaku.");
  lines.push("");
  lines.push("Surat ini WAJIB dibubuhi MATERAI Rp10.000,-");

  return lines;
}

/* ==================== DINAS BODY ==================== */

export function buildBodyDinas(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  lines.push(`Yang bertanda tangan di bawah ini, Kepala Desa ${context.settings.village.name},`);
  lines.push(
    `Kecamatan ${context.settings.village.district} — Kabupaten ${context.settings.village.regency},`,
  );
  lines.push("dengan ini memberikan SURAT REKOMENDASI/PENGANTAR kepada:");
  lines.push("");
  lines.push(`Nama           : ${warga.nama}`);
  lines.push(`NIK            : ${warga.nik}`);
  lines.push(`Alamat         : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`               Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");

  if (data.nama_instansi || data.instansi_tujuan) {
    lines.push(`Kepada Yth.   : ${data.nama_instansi || data.instansi_tujuan}`);
  }
  if (data.alamat_instansi) lines.push(`Di             : ${data.alamat_instansi}`);
  lines.push("");
  lines.push("Dengan hormat,");
  lines.push("");
  lines.push("Sehubungan dengan permohonan yang diajukan oleh saudara/i tersebut di atas,");
  lines.push("berdasarkan[data dan survey yang kami lakukan, kami memberikan rekomendasi bahwa:");
  lines.push("");

  if (data.isi_rekomendasi) {
    lines.push(...data.isi_rekomendasi.split("\n"));
  } else if (data.alasan || data.jenis_bantuan) {
    const text = data.alasan || data.jenis_bantuan;
    lines.push(...text.split("\n"));
  }
  lines.push("");
  lines.push("Demikian surat ini dibuat dengan sebenar-benarnya. Atas perhatian dan kerja sama");
  lines.push("kami ucapkan terima kasih.");

  return lines;
}

/* ==================== PERNIKAHAN BODY ==================== */

export function buildBodyPernikahan(context: PdfGenContext): string[] {
  const { surat, warga } = context;
  const lines: string[] = [];
  const data = surat.data ?? {};

  lines.push(`Yang bertanda tangan di bawah ini, Kepala Desa ${context.settings.village.name},`);
  lines.push(
    `Kecamatan ${context.settings.village.district} — Kabupaten ${context.settings.village.regency},`,
  );
  lines.push("menerangkan bahwa warga kami:");
  lines.push("");
  lines.push(`Nama             : ${warga.nama}`);
  lines.push(`NIK              : ${warga.nik}`);
  lines.push(`Tempat/Tgl Lahir : ${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  lines.push(`Alamat           : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push("");
  lines.push(
    "Berdasarkan[data yang kami miliki, Demikian surat nikah ini dibuat untuk dipergunakan",
  );
  lines.push("sebagaimana mestinya.");
  lines.push("");

  if (data.nama_calon) lines.push(`Calon Pasangan   : ${data.nama_calon}`);
  if (data.nik_calon) lines.push(`NIK Pasangan     : ${data.nik_calon}`);
  if (data.tanggal_nikah) lines.push(`Rencana Tanggal  : ${data.tanggal_nikah}`);
  if (data.tempat_nikah) lines.push(`Tempat Akad     : ${data.tempat_nikah}`);
  if (data.model_formulir) lines.push(`Model Formulir  : ${data.model_formulir}`);
  if (data.alasan) lines.push(`Alasan           : ${data.alasan}`);
  if (data.nama_alm) lines.push(`Almarhum/ah     : ${data.nama_alm}`);
  if (data.tgl_meninggal) lines.push(`Tgl. Meninggal  : ${data.tgl_meninggal}`);
  if (data.daftar_waris) {
    lines.push("");
    lines.push("Daftar Ahli Waris:");
    data.daftar_waris.split("\n").forEach((line: string) => lines.push(`  ${line}`));
  }
  lines.push("");
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );

  return lines;
}

/* ==================== MASTER BUILD FUNCTION ==================== */

export function buildSuratBody(context: PdfGenContext): string[] {
  const category = getTemplateCategory(context.surat.kode);

  switch (category) {
    case "KETERANGAN_GENERIK":
      return buildBodyKeterangan(context);
    case "PENGANTAR":
      return buildBodyPengantar(context);
    case "TANAH":
      return buildBodyTanah(context);
    case "PERNYATAAN":
      return buildBodyPernyataan(context);
    case "DINAS":
      return buildBodyDinas(context);
    case "PERNIKAHAN":
      return buildBodyPernikahan(context);
    default:
      return buildBodyKeterangan(context);
  }
}
