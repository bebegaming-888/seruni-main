/**
 * PDF Generator — Surat Resmi with Letter-Specific Body
 *
 * Setiap jenis surat memiliki body content yang berbeda.
 * Template dipilih berdasarkan kode surat dari SURAT_MASTER.
 *
 * @param params.surat   — data surat
 * @param params.warga   — data warga
 * @param params.settings — settings sistem
 * @param params.includeQr — apakah QR ditampilkan (default true)
 */
import { PDFDocument, rgb, StandardFonts, type RGB } from "pdf-lib";
import { DNA_CLAUSES_PRESETS } from "@/lib/letter-engine";
import type { LetterVars } from "@/lib/letter-engine";

export type PdfGenParams = {
  /** Record surat (sama format dari esurat-store) */
  surat: {
    no: string;
    kode: string;
    nama_surat: string;
    pemohon: string;
    nik: string;
    kontak: string;
    data: Record<string, string>;
    status: string;
    catatan?: string;
    signed_at?: string;
    signed_by?: string;
    qr_payload?: string;
    created_at: string;
    updated_at?: string;
  };
  /** Data warga */
  warga: {
    nik: string;
    nama: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    agama: string;
    status_perkawinan: string;
    pekerjaan: string;
    kewarganegaraan: string;
    alamat: string;
    rt: string;
    rw: string;
    dusun: string;
    desa: string;
    kecamatan: string;
    kabupaten: string;
    provinsi: string;
    no_kk: string;
    no_hp: string;
  };
  /** Settings sistem */
  settings: {
    village: {
      name: string;
      head: string;
      district: string;
      regency: string;
      address: string;
      phone: string;
      email?: string;
      province?: string;
    };
    branding: { primary_color: string };
    signature: {
      signer_name: string;
      signer_title: string;
      require_qr: boolean;
      qr_secret?: string;
    };
  };
  includeQr?: boolean;
};

// ==================== HELPERS ====================

const MARGIN = 56;
const LINE_HEIGHT = 18;

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return rgb(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = BULAN_ID[d.getMonth() + 1];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

const BULAN_ID: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.length ? lines : [""];
}

function label(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Letter Vars Builder (standalone — no getSettings() dependency) ─────────────

const BULAN_ID_LV: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

function fmtTglLahirLv(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN_ID_LV[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function fmtAlamatLv(p: PdfGenParams["warga"]): string {
  const parts: string[] = [];
  if (p.alamat) parts.push(p.alamat);
  if (p.rt && p.rw)
    parts.push(`RT ${String(p.rt).padStart(3, "0")}/RW ${String(p.rw).padStart(3, "0")}`);
  if (p.dusun) parts.push(`Dusun ${p.dusun}`);
  if (p.desa) parts.push(`Desa ${p.desa}`);
  if (p.kecamatan) parts.push(`Kecamatan ${p.kecamatan}`);
  if (p.kabupaten) parts.push(`Kabupaten ${p.kabupaten}`);
  if (p.provinsi) parts.push(`Provinsi ${p.provinsi}`);
  return parts.join(", ");
}

function fmtRupiahLv(val?: string | number): string {
  const n = Number(val ?? 0);
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/**
 * Build LetterVars from raw warga + surat data (no external state).
 * Mirrors buildLetterVars() from letter-engine.ts but standalone.
 */
function buildLetterVarsFromData(
  warga: PdfGenParams["warga"],
  surat: PdfGenParams["surat"],
  settings: PdfGenParams["settings"],
): LetterVars {
  const tgl = surat.signed_at ?? new Date().toISOString();
  const d = new Date(tgl);
  const vars: LetterVars = {
    nama: warga.nama || "-",
    nik: warga.nik || "-",
    tempat_lahir: warga.tempat_lahir || "-",
    tanggal_lahir: fmtTglLahirLv(warga.tanggal_lahir),
    tempat_tanggal_lahir: `${warga.tempat_lahir || "-"}, ${fmtTglLahirLv(warga.tanggal_lahir)}`,
    jenis_kelamin: warga.jenis_kelamin || "-",
    agama: warga.agama || "-",
    status_kawin: warga.status_perkawinan || "-",
    pekerjaan: warga.pekerjaan || "-",
    kewarganegaraan: warga.kewarganegaraan || "WNI",
    no_kk: warga.no_kk || "-",
    no_hp: warga.no_hp || "-",
    alamat: fmtAlamatLv(warga),
    alamat_singkat: warga.alamat || "-",
    rt: warga.rt || "-",
    rw: warga.rw || "-",
    dusun: warga.dusun || "-",
    desa: warga.desa || settings.village.name,
    kecamatan: warga.kecamatan || settings.village.district,
    kabupaten: warga.kabupaten || settings.village.regency,
    provinsi: warga.provinsi || settings.village.province || "Nusa Tenggara Barat",
    nomor_surat: surat.no,
    tanggal: `${d.getDate()} ${BULAN_ID_LV[d.getMonth() + 1]} ${d.getFullYear()}`,
    bulan: BULAN_ID_LV[d.getMonth() + 1],
    tahun: String(d.getFullYear()),
    nama_desa: settings.village.name,
    nama_kecamatan: settings.village.district,
    nama_kabupaten: settings.village.regency,
    nama_provinsi: settings.village.province || "Nusa Tenggara Barat",
    nama_pejabat: settings.signature.signer_name,
    jabatan_pejabat: settings.signature.signer_title,
    alamat_desa: settings.village.address,
    ...surat.data,
    penghasilan: surat.data.penghasilan ? fmtRupiahLv(surat.data.penghasilan) : "-",
  };
  return vars;
}

/** Render {{placeholder}} in text with vars values. Unresolved → "-". */
function renderVarsLv(text: string, vars: LetterVars): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? "-");
}

/** Render all DNA clauses with vars substitution. */
function renderDnaClausesLv(clauses: string[], vars: LetterVars): string[] {
  return clauses.map((c) => renderVarsLv(c, vars));
}

// ==================== TEMPLATE BUILDERS ====================

type Lines = string[];

/** Identity block — paragraf pembuka + data warga. */
function buildIdentityBlock(
  lines: Lines,
  villageName: string,
  villageDistrict: string,
  villageRegency: string,
  warga: PdfGenParams["warga"],
) {
  lines.push(
    `Yang bertanda tangan di bawah ini, Kepala Desa ${villageName},`,
    `Kecamatan ${villageDistrict} — Kabupaten ${villageRegency},`,
    "menerangkan bahwa:",
    "",
  );

  // Rapi: label 14-char, value align
  const FMT = (key: string, value: string, indent = "") => lines.push(`${indent}${key}: ${value}`);

  FMT("Nama", warga.nama);
  FMT("NIK", warga.nik);
  FMT("Tempat/Tgl Lahir", `${warga.tempat_lahir}, ${warga.tanggal_lahir}`);
  FMT("Jenis Kelamin", warga.jenis_kelamin);
  FMT("Agama", warga.agama);
  FMT("Pekerjaan", warga.pekerjaan);
  FMT("Alamat", `${warga.alamat}, RT ${warga.rt}/RW ${warga.rw}`);
  lines.push(`                  Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`);
  lines.push("");
}

/** Semua data field surat (kecuali keperluan umum). */
function buildDataFields(lines: Lines, data: Record<string, string>, excludeKeys: string[] = []) {
  Object.entries(data).forEach(([key, value]) => {
    if (!value || excludeKeys.includes(key)) return;
    lines.push(...wrapText(`${label(key)}: ${value}`, 64));
  });
  lines.push("");
}

// ---- TEMPLATE: GENERIK (keterangan umum) ----
function buildBodyGenerik(ctx: {
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  warga: PdfGenParams["warga"];
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push("Adalah benar warga kami dan surat ini dibuat untuk keperluan:");
  lines.push("");
  buildDataFields(lines, ctx.data, ["keperluan", "keterangan"]);
  const keperluan = ctx.data.keperluan ?? ctx.data.keterangan ?? "-";
  lines.push(...wrapText(`              ${keperluan}`, 64));
  lines.push("");
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );
  return lines;
}

// ---- TEMPLATE: PENGANTAR ----
function buildBodyPengantar(ctx: {
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  warga: PdfGenParams["warga"];
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  lines.push(
    `Yang bertanda tangan di bawah ini, Pemerintah Desa ${ctx.villageName},`,
    `Kecamatan ${ctx.villageDistrict} — Kabupaten ${ctx.villageRegency},`,
    "dengan ini memberikan PENGANTAR kepada:",
    "",
  );
  lines.push(`Nama  : ${ctx.warga.nama}`);
  lines.push(`NIK   : ${ctx.warga.nik}`);
  lines.push(
    `Alamat: ${ctx.warga.alamat}, RT ${ctx.warga.rt}/RW ${ctx.warga.rw},`,
    `        Desa ${ctx.warga.desa}, Kec. ${ctx.warga.kecamatan}, ${ctx.warga.kabupaten}`,
    "",
  );
  buildDataFields(lines, ctx.data, ["keperluan", "keterangan"]);
  const keperluan = ctx.data.keperluan ?? ctx.data.keterangan ?? "Pengajuan ke instansi terkait";
  lines.push(`Untuk keperluan: ${keperluan}`);
  lines.push("");
  lines.push(
    "Demikian pengantar ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
  );
  return lines;
}

// ---- TEMPLATE: SKU (Surat Keterangan Usaha) ----
function buildBodySKU(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push(
    "Berdasarkan data yang kami miliki, yang bersangkutan adalah pemilik/penanggung jawab",
    "usaha yang beroperasi di wilayah kami dan saat ini masih aktif berusaha.",
    "",
  );
  lines.push("Berikut data usaha yang kami cantumkan:");
  lines.push("");
  buildDataFields(lines, ctx.data, ["keperluan"]);
  lines.push(`Nama Usaha  : ${ctx.data.nama_usaha ?? "-"}`);
  lines.push(`Jenis Usaha : ${ctx.data.jenis_usaha ?? "-"}`);
  if (ctx.data.alamat_usaha) lines.push(...wrapText(`Alamat Usaha: ${ctx.data.alamat_usaha}`, 64));
  if (ctx.data.tahun_berdiri) lines.push(`Tahun Berdiri: ${ctx.data.tahun_berdiri}`);
  if (ctx.data.jumlah_karyawan) lines.push(`Jumlah Karyawan: ${ctx.data.jumlah_karyawan} orang`);
  lines.push("");
  lines.push(
    "Surat keterangan ini adalah KETERANGAN dari Pemerintah Desa dan BUKAN merupakan",
    "izin usaha. Untuk perizinan resmi (NIB), silakan mengurus melalui sistem Online",
    "Single Submission (OSS).",
    "",
  );
  lines.push("Demikian surat ini dibuat dengan sebenar-benarnya dan sebaik-baiknya.");
  return lines;
}

// ---- TEMPLATE: SKTM (Surat Keterangan Tidak Mampu) ----
function buildBodySKTM(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push(
    "Berdasarkan data yang kami miliki, yang bersangkutan adalah benar warga kami",
    "yang termasuk dalam keluarga kurang mampu / tidak mampu secara ekonomi.",
    "",
  );
  lines.push("Data ekonomi yang kami catat:");
  lines.push("");
  if (ctx.data.penghasilan)
    lines.push(
      `Penghasilan per Bulan : Rp ${Number(ctx.data.penghasilan).toLocaleString("id-ID")}`,
    );
  if (ctx.data.tanggungan) lines.push(`Jumlah Tanggungan        : ${ctx.data.tanggungan} orang`);
  if (ctx.data.keperluan) {
    lines.push("");
    lines.push(`Keperluan: ${ctx.data.keperluan}`);
  }
  lines.push("");
  lines.push(
    "Yang bertanda tangan bertanggung jawab penuh atas kebenaran data tersebut.",
    "Surat keterangan ini bukan merupakan bukti kemampuan finansial secara sah.",
    "",
  );
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );
  return lines;
}

// ---- TEMPLATE: TANAH ----
function buildBodyTanah(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push(
    "Berdasarkan data yang kami miliki dan setelah dilakukan verifikasi di lapangan,",
    "dengan ini kami menyatakan bahwa yang bersangkutan memiliki/menguasai tanah dengan",
    "rincian sebagai berikut:",
    "",
  );
  if (ctx.data.lokasi_tanah)
    lines.push(...wrapText(`Lokasi Tanah  : ${ctx.data.lokasi_tanah}`, 64));
  if (ctx.data.luas_tanah) lines.push(`Luas Tanah     : ${ctx.data.luas_tanah}`);
  if (ctx.data.batas) lines.push(...wrapText(`Batas-batas   : ${ctx.data.batas}`, 64));
  if (ctx.data.harga)
    lines.push(`Harga Transaksi: Rp ${Number(ctx.data.harga).toLocaleString("id-ID")}`);
  if (ctx.data.penjual) lines.push(`Penjual        : ${ctx.data.penjual}`);
  if (ctx.data.pembeli) lines.push(`Pembeli        : ${ctx.data.pembeli}`);
  if (ctx.data.penerima_hibah) lines.push(`Penerima Hibah : ${ctx.data.penerima_hibah}`);
  if (ctx.data.nadzir_wakaf) lines.push(`Nadzir Wakaf   : ${ctx.data.nadzir_wakaf}`);
  lines.push("");
  lines.push(
    "Surat keterangan ini adalah KETERANGAN dari Pemerintah Desa dan BUKAN merupakan",
    "bukti hak kepemilikan tanah. Untuk kepastian hak hukum, silakan menghubungi BPN.",
    "",
  );
  lines.push("Demikian surat ini dibuat dengan sebenar-benarnya dan sebaik-baiknya.");
  return lines;
}

// ---- TEMPLATE: PERNIKAHAN (SK-NIKAH) ----
function buildBodyNikah(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push(
    "Berdasarkan data yang kami miliki, yang bersangkutan memenuhi persyaratan untuk",
    "membuat surat nikah dan memerlukan verifikasi dari pemerintah desa.",
    "",
  );
  if (ctx.data.model_formulir) lines.push(`Model Formulir  : ${ctx.data.model_formulir}`);
  if (ctx.data.nama_calon) lines.push(`Nama Pasangan    : ${ctx.data.nama_calon}`);
  if (ctx.data.nik_calon) lines.push(`NIK Pasangan     : ${ctx.data.nik_calon}`);
  if (ctx.data.tanggal_nikah) lines.push(`Rencana Tanggal  : ${ctx.data.tanggal_nikah}`);
  if (ctx.data.tempat_nikah) lines.push(`Tempat Akad     : ${ctx.data.tempat_nikah}`);
  if (ctx.data.alasan) lines.push(...wrapText(`Alasan           : ${ctx.data.alasan}`, 64));
  if (ctx.data.nama_alm) lines.push(`Almarhum/ah     : ${ctx.data.nama_alm}`);
  if (ctx.data.tgl_meninggal) lines.push(`Tgl. Meninggal  : ${ctx.data.tgl_meninggal}`);
  if (ctx.data.daftar_waris) {
    lines.push("");
    lines.push("Daftar Ahli Waris:");
    ctx.data.daftar_waris.split("\n").forEach((line) => lines.push(`  ${line}`));
  }
  lines.push("");
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );
  return lines;
}

// ---- TEMPLATE: PERNYATAAN (SPTJM, SURAT_KUASA) ----
function buildBodyPernyataan(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  lines.push("Yang bertanda tangan di bawah ini:");
  lines.push("");
  lines.push(`Nama           : ${ctx.warga.nama}`);
  lines.push(`NIK            : ${ctx.warga.nik}`);
  lines.push(`Tempat/Tgl Lahir: ${ctx.warga.tempat_lahir}, ${ctx.warga.tanggal_lahir}`);
  lines.push(`Alamat         : ${ctx.warga.alamat}, RT ${ctx.warga.rt}/RW ${ctx.warga.rw}`);
  lines.push(
    `               Desa ${ctx.warga.desa}, Kec. ${ctx.warga.kecamatan}, ${ctx.warga.kabupaten}`,
  );
  lines.push("");
  lines.push("Dengan ini menyatakan dan bertanggung jawab penuh atas:");
  lines.push("");
  if (ctx.data.judul_pernyataan) lines.push(`Judul Pernyataan: ${ctx.data.judul_pernyataan}`);
  if (ctx.data.isi_pernyataan) {
    lines.push("");
    lines.push("Isi Pernyataan:");
    ctx.data.isi_pernyataan.split("\n").forEach((line) => lines.push(...wrapText(`  ${line}`, 62)));
  }
  if (ctx.data.penerima_kuasa) lines.push(`Penerima Kuasa   : ${ctx.data.penerima_kuasa}`);
  if (ctx.data.nik_penerima_kuasa) lines.push(`NIK Penerima Kuasa: ${ctx.data.nik_penerima_kuasa}`);
  if (ctx.data.wewenang) {
    lines.push("");
    lines.push("Wewenang yang diberikan:");
    ctx.data.wewenang.split("\n").forEach((line) => lines.push(...wrapText(`  ${line}`, 62)));
  }
  lines.push("");
  lines.push(
    "Surat pernyataan ini dibuat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.",
    "Apabila keterangan ini tidak sesuai dengan keadaan sebenarnya, saya bersedia dituntut",
    "sesuai hukum yang berlaku.",
    "",
  );
  lines.push("Surat ini WAJIB dibubuhi MATERAI Rp10.000,-");
  return lines;
}

// ---- TEMPLATE: DINAS (SP-INSTANSI, SURAT_BANTUAN, SURAT_REKOMENDASI) ----
function buildBodyDinas(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  lines.push(`Yang bertanda tangan di bawah ini, Kepala Desa ${ctx.villageName},`);
  lines.push(
    `Kecamatan ${ctx.villageDistrict} — Kabupaten ${ctx.villageRegency},`,
    "dengan ini memberikan SURAT REKOMENDASI/PENGANTAR kepada:",
    "",
  );
  lines.push(`Nama   : ${ctx.warga.nama}`);
  lines.push(`NIK    : ${ctx.warga.nik}`);
  lines.push(`Alamat : ${ctx.warga.alamat}, RT ${ctx.warga.rt}/RW ${ctx.warga.rw}`);
  lines.push(
    `         Desa ${ctx.warga.desa}, Kec. ${ctx.warga.kecamatan}, ${ctx.warga.kabupaten}`,
  );
  lines.push("");
  if (ctx.data.nama_instansi || ctx.data.instansi_tujuan)
    lines.push(`Kepada Yth. : ${ctx.data.nama_instansi || ctx.data.instansi_tujuan}`);
  if (ctx.data.alamat_instansi) lines.push(`Di          : ${ctx.data.alamat_instansi}`);
  lines.push("");
  lines.push("Dengan hormat,");
  lines.push("");
  lines.push(
    "Sehubungan dengan permohonan yang diajukan oleh saudara/i tersebut di atas,",
    "berdasarkan data dan survey yang kami lakukan, kami memberikan dukungan/rekomendasi bahwa:",
    "",
  );
  if (ctx.data.isi_rekomendasi) {
    ctx.data.isi_rekomendasi.split("\n").forEach((line) => lines.push(...wrapText(line, 64)));
  } else if (ctx.data.alasan || ctx.data.jenis_bantuan) {
    const text = ctx.data.alasan || ctx.data.jenis_bantuan;
    text.split("\n").forEach((line) => lines.push(...wrapText(line, 64)));
  } else {
    buildDataFields(lines, ctx.data);
  }
  lines.push("");
  lines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya. Atas perhatian dan kerja sama kami ucapkan terima kasih.",
  );
  return lines;
}

// ---- TEMPLATE: KEHILANGAN ----
function buildBodyKehilangan(ctx: {
  warga: PdfGenParams["warga"];
  villageName: string;
  villageDistrict: string;
  villageRegency: string;
  data: Record<string, string>;
}): Lines {
  const lines: Lines = [];
  buildIdentityBlock(lines, ctx.villageName, ctx.villageDistrict, ctx.villageRegency, ctx.warga);
  lines.push(
    "Berdasarkan data yang kami miliki dan setelah dilakukan verifikasi,",
    "dengan ini kami menyatakan bahwa yang bersangkutan telah kehilangan dokumen/barang berikut:",
    "",
  );
  buildDataFields(lines, ctx.data, ["keperluan", "keterangan"]);
  lines.push(`Barang/Dokumen    : ${ctx.data.barang_hilang ?? "-"}`);
  lines.push(`Tempat Kehilangan : ${ctx.data.tempat_hilang ?? "-"}`);
  lines.push(`Waktu Kehilangan  : ${ctx.data.waktu_hilang ? fmtDate(ctx.data.waktu_hilang) : "-"}`);
  if (ctx.data.keterangan) lines.push(...wrapText(`Keterangan: ${ctx.data.keterangan}`, 64));
  lines.push("");
  lines.push(
    "Surat keterangan ini diterbitkan untuk keperluan administrasi dan bukan merupakan",
    "laporan kehilangan resmi kepada pihak berwajib. Untuk laporan resmi, silakan",
    "menghubungi kantor polisi terdekat.",
    "",
  );
  lines.push("Demikian surat ini dibuat dengan sebenar-benarnya dan sebaik-baiknya.");
  return lines;
}

// ---- MASTER BUILD: pilih template berdasarkan kode ----
function buildSuratBody(
  surat: PdfGenParams["surat"],
  warga: PdfGenParams["warga"],
  settings: PdfGenParams["settings"],
): Lines {
  const { kode, data } = surat;
  const { village } = settings;
  const ctx = {
    warga,
    villageName: village.name,
    villageDistrict: village.district,
    villageRegency: village.regency,
    data,
  };

  // ── Prioritas 1: DNA clauses dari letter-engine (73+ surat types) ──────────
  const dnaClauses = DNA_CLAUSES_PRESETS[kode];
  if (dnaClauses) {
    const vars = buildLetterVarsFromData(warga, surat, settings);
    return renderDnaClausesLv(dnaClauses, vars);
  }

  // ── Prioritas 2: fallback ke hardcoded template builder ─────────────────────
  // Pernikahan
  if (kode === "SK-NIKAH" || kode === "SK_NIKAH") return buildBodyNikah(ctx);
  if (kode === "SK_NIKAH_NONMUSLIM") return buildBodyNikah(ctx);
  if (kode === "SK_AHLI_WARIS") return buildBodyNikah(ctx);
  if (kode === "DISPENSA_NIKAH") return buildBodyNikah(ctx);
  if (kode === "WALI_NIKAH") return buildBodyNikah(ctx);

  // Pernyataan
  if (kode === "SPTJM" || kode === "SURAT_KUASA") return buildBodyPernyataan(ctx);

  // Tanah
  if (
    kode === "SK_TANAH_MILIK" ||
    kode === "SK_TANAH_TIDAK_SENGKETA" ||
    kode === "SK_HIBAH_TANAH" ||
    kode === "SK_JUAL_BELI_TANAH" ||
    kode === "SK_TANAH_WAKAF" ||
    kode === "SK_RUMAH_MILIK" ||
    kode === "SK_BELUM_PUNYA_RUMAH" ||
    kode === "SP-PTSL" ||
    kode === "SP-PENDAFTARAN-TANAH"
  )
    return buildBodyTanah(ctx);

  // Usaha
  if (kode === "SKU") return buildBodySKU(ctx);

  // Kehidupan
  if (kode === "SKTM") return buildBodySKTM(ctx);
  if (kode === "SK_KEHILANGAN") return buildBodyKehilangan(ctx);

  // Dinas
  if (kode === "SP-INSTANSI" || kode === "SURAT_BANTUAN" || kode === "SURAT_REKOMENDASI")
    return buildBodyDinas(ctx);

  // Pengantar (SP-*)
  if (kode.startsWith("SP-")) return buildBodyPengantar(ctx);

  // Default: generik
  return buildBodyGenerik(ctx);
}

// ==================== PDF GENERATOR ====================

export async function generateSuratPdf({
  surat,
  warga,
  settings,
  includeQr = true,
}: PdfGenParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait (1/72 inch)
  const { width, height } = page.getSize();

  // Body font: locked to Arial 11pt per blanko requirements
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontCourier = await doc.embedFont(StandardFonts.Courier);
  const bodyFontSize = 11;

  const primaryRgb = hexToRgb(settings.branding.primary_color);
  const greyRgb = rgb(0.4, 0.4, 0.4);

  let y = height - MARGIN;
  const lineBuffer: {
    text: string;
    font: typeof fontRegular;
    size: number;
    color: RGB;
    x: number;
  }[] = [];

  const drawLater = (
    text: string,
    opts?: {
      font?: typeof fontRegular;
      size?: number;
      color?: RGB;
      bold?: boolean;
      align?: "left" | "center" | "right";
    },
  ) => {
    const font = opts?.bold ? fontBold : (opts?.font ?? fontRegular);
    const size = opts?.size ?? 10;
    const color = opts?.color ?? rgb(0, 0, 0);
    const textWidth = font.widthOfTextAtSize(text, size);
    let x: number;
    if (opts?.align === "center") x = (width - textWidth) / 2;
    else if (opts?.align === "right") x = width - MARGIN - textWidth;
    else x = MARGIN;
    lineBuffer.push({ text, font, size, color, x });
  };

  const flush = () => {
    for (const l of lineBuffer) {
      if (y < MARGIN + 60) {
        const np = doc.addPage([595.28, 841.89]);
        y = height - MARGIN;
        np.drawText(l.text, { x: l.x, y, size: l.size, font: l.font, color: l.color });
        y -= LINE_HEIGHT;
      } else {
        page.drawText(l.text, { x: l.x, y, size: l.size, font: l.font, color: l.color });
        y -= LINE_HEIGHT;
      }
    }
    lineBuffer.length = 0;
  };

  const nl = () => {
    flush();
    y -= 6;
  };
  const md = () => {
    flush();
    y -= LINE_HEIGHT;
  };

  // ============ KOP SURAT ============
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 2,
    color: primaryRgb,
  });
  y -= 6;

  drawLater(settings.village.name.toUpperCase(), { size: 14, bold: true, align: "center" });
  drawLater(settings.village.address, { size: 9, align: "center", color: greyRgb });
  drawLater(
    `${settings.village.phone}${settings.village.email ? ` · ${settings.village.email}` : ""}`.trim(),
    { size: 8, align: "center", color: greyRgb },
  );
  flush();
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1.5,
    color: primaryRgb,
  });
  y -= 16;

  // ============ NOMOR SURAT ============
  drawLater(`${surat.nama_surat.toUpperCase()}`, { size: 13, bold: true, align: "center" });
  drawLater(`Nomor: ${surat.no}`, { size: 10, align: "center" });
  flush();
  y -= 10;

  // ============ BODY SURAT ============
  const bodyLines = buildSuratBody(surat, warga, settings);
  for (const line of bodyLines) {
    drawLater(line, { size: bodyFontSize });
    flush();
  }

  y -= 8;
  md();

  // ============ TANDA TANGAN ============
  const ttdY = y;
  const tglSurat = surat.signed_at ? fmtDate(surat.signed_at) : fmtDate(new Date().toISOString());

  // Kolom kiri: pemohon
  drawLater("Yang Bersangkutan,", { size: 9, align: "center" });
  flush();
  y -= 50;
  drawLater(warga.nama, { size: 10, bold: true, align: "center" });
  flush();

  y = ttdY;

  // Kolom kanan: kepala desa
  drawLater(`${settings.village.name}, ${tglSurat}`, { size: 9, align: "center" });
  flush();
  if (surat.signed_by) {
    drawLater("Kepala Desa,", { size: 9, align: "center" });
    flush();
    y -= 50;
    drawLater(surat.signed_by, { size: 10, bold: true, align: "center" });
    flush();
  } else {
    drawLater("Kepala Desa,", { size: 9, align: "center" });
    flush();
    y -= 50;
    drawLater(settings.signature.signer_name, { size: 10, bold: true, align: "center" });
    flush();
    drawLater(settings.signature.signer_title, { size: 8, align: "center", color: greyRgb });
    flush();
  }

  // ============ QR CODE ============
  if (includeQr && settings.signature.require_qr && surat.qr_payload) {
    try {
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(surat.qr_payload, { width: 80, margin: 1 });
      const qrBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const qrImage = await doc.embedPng(qrBytes);
      page.drawImage(qrImage, { x: MARGIN, y: MARGIN + 60, width: 80, height: 80 });
      page.drawText("Scan untuk verifikasi", {
        x: MARGIN,
        y: MARGIN + 55,
        size: 7,
        font: fontRegular,
        color: greyRgb,
      });
      page.drawText(surat.no, {
        x: MARGIN,
        y: MARGIN + 47,
        size: 7,
        font: fontCourier,
        color: greyRgb,
      });
    } catch (qrErr) {
      console.warn("[PDF] QR code generation failed:", qrErr);
    }
  }

  // ============ FOOTER ============
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 10 },
    end: { x: width - MARGIN, y: MARGIN + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(
    `Dokumen ini diterbitkan oleh ${settings.village.name}. Verifikasi: ${settings.village.phone}`,
    { x: MARGIN, y: MARGIN, size: 7, font: fontRegular, color: rgb(0.5, 0.5, 0.5) },
  );

  return doc.save();
}
