/**
 * Letter Engine — Rendering & Variable Substitution
 *
 * Utilities untuk:
 * 1. Render {{placeholder}} dalam dna_clauses dan body
 * 2. Build subject fields dari data warga + request
 * 3. Format tanggal, angka, alamat lengkap
 */

import type { SuratTemplate, SubjectFieldConfig } from "@/lib/template-store";
import type { Penduduk } from "@/data/penduduk";
import { getSettings } from "@/lib/settings-store";
import { getVillage } from "@/lib/village-dynamic";
import { getMediaUrl } from "@/lib/media-upload";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LetterVars = Record<string, string>;

export type SubjectRow = {
  label: string;
  value: string;
};

export type RenderedLetter = {
  header: {
    logoKabupatenUrl: string;
    logoDesaUrl: string;
    namaKabupaten: string;
    namaKecamatan: string;
    namaDesa: string;
    alamat: string;
    kontak: string;
  };
  title: {
    namaSurat: string; // UPPERCASE
    nomorSurat: string; // "Nomor: 470/001/KDS.SRMB/V/2026"
  };
  signer: {
    pembuka: string; // "Yang bertanda tangan di bawah ini,"
    rows: SubjectRow[]; // [{ label: "Nama", value: "TAJUDDIN MS." }, ...]
  };
  subject: SubjectRow[]; // Identitas pemohon
  body: string[]; // Array paragraf (DNA clauses setelah substitusi)
  closing: string;
  signature: {
    lokasi: string;
    tanggal: string;
    jabatan: string;
    namaPejabat: string;
    qrPayload?: string;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BULAN_ID = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function fmtTanggal(iso?: string): string {
  if (!iso)
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN_ID[d.getMonth() + 1]} ${d.getFullYear()}`;
}

export function fmtTanggalLahir(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN_ID[d.getMonth() + 1]} ${d.getFullYear()}`;
}

export function fmtAlamat(p: Partial<Penduduk>): string {
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

export function fmtRupiah(val?: string | number): string {
  const n = Number(val ?? 0);
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/** Ganti semua {{key}} dalam teks dengan nilai dari vars.
 * Unresolved placeholder → tampil "-" bukan " {{key}}" (mencegah PDF rusak). */
export function renderVars(text: string, vars: LetterVars): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? "-");
}

/** Render semua klausa DNA dari array, substitusi vars pada tiap klausa. */
export function renderDnaClauses(clauses: string[], vars: LetterVars): string[] {
  return clauses.map((c) => renderVars(c, vars));
}

// ── Build LetterVars dari Warga + Request Data ────────────────────────────────

export function buildLetterVars(
  warga: Partial<Penduduk>,
  requestData: Record<string, string>,
  nomorSurat: string,
  tanggalSurat?: string,
): LetterVars {
  const villageInfo = getVillage();
  const settings = getSettings();
  const tgl = tanggalSurat ?? new Date().toISOString();
  const vars: LetterVars = {
    // Identitas warga
    nama: warga.nama ?? "-",
    nik: warga.nik ?? "-",
    tempat_lahir: warga.tempat_lahir ?? "-",
    tanggal_lahir: fmtTanggalLahir(warga.tanggal_lahir),
    tempat_tanggal_lahir: `${warga.tempat_lahir ?? "-"}, ${fmtTanggalLahir(warga.tanggal_lahir)}`,
    jenis_kelamin: warga.jenis_kelamin ?? "-",
    agama: warga.agama ?? "-",
    status_kawin: warga.status_perkawinan ?? "-",
    pekerjaan: warga.pekerjaan ?? "-",
    kewarganegaraan: warga.kewarganegaraan ?? "WNI",
    no_kk: warga.no_kk ?? "-",
    no_hp: warga.no_hp ?? "-",
    alamat: fmtAlamat(warga),
    alamat_singkat: warga.alamat ?? "-",
    rt: warga.rt ?? "-",
    rw: warga.rw ?? "-",
    dusun: warga.dusun ?? "-",
    desa: warga.desa ?? villageInfo.village,
    kecamatan: warga.kecamatan ?? villageInfo.district,
    kabupaten: warga.kabupaten ?? villageInfo.regency,
    provinsi: warga.provinsi ?? villageInfo.province,

    // Surat
    nomor_surat: nomorSurat,
    tanggal: fmtTanggal(tgl),
    bulan: BULAN_ID[new Date(tgl).getMonth() + 1],
    tahun: String(new Date(tgl).getFullYear()),

    // Desa / pejabat
    nama_desa: villageInfo.village,
    nama_kecamatan: villageInfo.district,
    nama_kabupaten: villageInfo.regency,
    nama_provinsi: villageInfo.province,
    nama_pejabat: settings.signature.signer_name,
    jabatan_pejabat: settings.signature.signer_title,
    alamat_desa: villageInfo.address,

    // Semua field dari request
    ...requestData,

    // Override: format rupiah jika ada penghasilan
    penghasilan: requestData.penghasilan ? fmtRupiah(requestData.penghasilan) : "-",
  };

  return vars;
}

// ── Build Subject Rows dari SubjectFieldConfig ────────────────────────────────

/** Field bawaan identitas warga (mapping key → path di Penduduk) */
const WARGA_FIELD_MAP: Record<string, (p: Partial<Penduduk>, vars: LetterVars) => string> = {
  nama: (p) => p.nama ?? "-",
  nik: (p) => p.nik ?? "-",
  tempat_lahir: (p) => p.tempat_lahir ?? "-",
  tanggal_lahir: (p) => fmtTanggalLahir(p.tanggal_lahir),
  tempat_tanggal_lahir: (p) => `${p.tempat_lahir ?? "-"}, ${fmtTanggalLahir(p.tanggal_lahir)}`,
  jenis_kelamin: (p) => p.jenis_kelamin ?? "-",
  agama: (p) => p.agama ?? "-",
  status_perkawinan: (p) => p.status_perkawinan ?? "-",
  pekerjaan: (p) => p.pekerjaan ?? "-",
  kewarganegaraan: (p) => p.kewarganegaraan ?? "WNI",
  no_kk: (p) => p.no_kk ?? "-",
  no_hp: (p) => p.no_hp ?? "-",
  alamat: (p) => fmtAlamat(p),
};

export function buildSubjectRows(
  subjectFields: SubjectFieldConfig[],
  warga: Partial<Penduduk>,
  requestData: Record<string, string>,
  vars: LetterVars,
): SubjectRow[] {
  return subjectFields
    .filter((f) => !f.hidden)
    .sort((a, b) => a.order - b.order)
    .map((f) => {
      let value = "-";
      if (f.source === "warga" && WARGA_FIELD_MAP[f.key]) {
        value = WARGA_FIELD_MAP[f.key](warga, vars);
      } else if (f.source === "request") {
        value = requestData[f.key] ?? "-";
      } else if (f.source === "vars") {
        value = vars[f.key] ?? "-";
      } else {
        // fallback: coba warga dulu, lalu request
        value = WARGA_FIELD_MAP[f.key]?.(warga, vars) ?? requestData[f.key] ?? vars[f.key] ?? "-";
      }
      return { label: f.label, value };
    });
}

// ── Build Signer Rows (dari settings) ─────────────────────────────────────────

export function buildSignerRows(vars: LetterVars): SubjectRow[] {
  const settings = getSettings();
  const villageInfo = getVillage();
  const wilayah = [
    villageInfo.name,
    `Kecamatan ${villageInfo.district}`,
    `Kabupaten ${villageInfo.regency}`,
    `Provinsi ${villageInfo.province}`,
  ].join(", ");

  return [
    { label: "Nama", value: settings.signature.signer_name },
    { label: "Jabatan", value: settings.signature.signer_title + ", " + wilayah },
  ];
}

// ── Build Rendered Letter ─────────────────────────────────────────────────────

export function buildRenderedLetter(opts: {
  template: SuratTemplate;
  warga: Partial<Penduduk>;
  requestData: Record<string, string>;
  nomorSurat: string;
  tanggalSurat?: string;
  qrPayload?: string;
}): RenderedLetter {
  const { template, warga, requestData, nomorSurat, tanggalSurat, qrPayload } = opts;
  const settings = getSettings();
  const v = getVillage();

  const vars = buildLetterVars(warga, requestData, nomorSurat, tanggalSurat);

  // Header — read from structured kop_lines
  const kop = settings.kopSurat;
  const header: RenderedLetter["header"] = {
    logoKabupatenUrl: kop.logo_kab_storage_path
      ? getMediaUrl(kop.logo_kab_storage_path, "public-media")
      : kop.logo_kab_url || "",
    logoDesaUrl: kop.logo_desa_storage_path
      ? getMediaUrl(kop.logo_desa_storage_path, "public-media")
      : kop.logo_desa_url || "",
    namaKabupaten:
      kop.kop_lines.find((l) => l.id === "kab")?.text ??
      `PEMERINTAH KABUPATEN ${v.regency.toUpperCase()}`,
    namaKecamatan:
      kop.kop_lines.find((l) => l.id === "kec")?.text ?? `KECAMATAN ${v.district.toUpperCase()}`,
    namaDesa: kop.kop_lines.find((l) => l.id === "des")?.text ?? getVillage("kop_desa"),
    alamat: kop.kop_lines.find((l) => l.id === "almt")?.text ?? v.address,
    kontak: [kop.kop_lines.find((l) => l.id === "kontak")?.text].filter(Boolean).join(" | "),
  };

  // Title
  const title: RenderedLetter["title"] = {
    namaSurat: template.name.toUpperCase(),
    nomorSurat: `Nomor : ${nomorSurat}`,
  };

  // Signer
  const signer: RenderedLetter["signer"] = {
    pembuka: "Yang bertanda tangan di bawah ini,",
    rows: buildSignerRows(vars),
  };

  // Subject
  const subject = buildSubjectRows(
    template.subject_fields ?? DEFAULT_SUBJECT_FIELDS,
    warga,
    requestData,
    vars,
  );

  // Body — render DNA clauses
  const clauses = template.dna_clauses?.length
    ? template.dna_clauses
    : template.body
      ? [template.body]
      : ["Dengan ini menerangkan bahwa yang bersangkutan adalah benar warga kami."];

  const body = renderDnaClauses(clauses, vars);

  // Closing
  const closing = renderVars(
    template.closing ??
      "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
    vars,
  );

  // Signature
  const tgl = tanggalSurat ?? new Date().toISOString();
  const signature: RenderedLetter["signature"] = {
    lokasi: v.village,
    tanggal: fmtTanggal(tgl),
    jabatan: settings.signature.signer_title,
    namaPejabat: settings.signature.signer_name,
    qrPayload,
  };

  return { header, title, signer, subject, body, closing, signature };
}

// ── Default subject fields (fallback jika template belum punya) ───────────────

export const DEFAULT_SUBJECT_FIELDS: SubjectFieldConfig[] = [
  { key: "nama", label: "Nama", source: "warga", required: true, order: 1 },
  { key: "nik", label: "NIK", source: "warga", required: true, order: 2 },
  {
    key: "tempat_tanggal_lahir",
    label: "Tempat/Tanggal Lahir",
    source: "warga",
    required: true,
    order: 3,
  },
  { key: "jenis_kelamin", label: "Jenis Kelamin", source: "warga", required: true, order: 4 },
  { key: "pekerjaan", label: "Pekerjaan", source: "warga", required: true, order: 5 },
  { key: "agama", label: "Agama", source: "warga", required: false, order: 6 },
  { key: "kewarganegaraan", label: "Kewarganegaraan", source: "warga", required: false, order: 7 },
  { key: "alamat", label: "Alamat", source: "warga", required: true, order: 8 },
];

/** Preset subject fields per jenis surat */
export const SUBJECT_FIELDS_PRESETS: Record<string, SubjectFieldConfig[]> = {
  SKD: [
    { key: "nama", label: "Nama", source: "warga", required: true, order: 1 },
    { key: "nik", label: "NIK", source: "warga", required: true, order: 2 },
    {
      key: "tempat_tanggal_lahir",
      label: "Tempat/Tanggal Lahir",
      source: "warga",
      required: true,
      order: 3,
    },
    { key: "jenis_kelamin", label: "Jenis Kelamin", source: "warga", required: true, order: 4 },
    { key: "pekerjaan", label: "Pekerjaan", source: "warga", required: true, order: 5 },
    { key: "agama", label: "Agama", source: "warga", required: true, order: 6 },
    { key: "kewarganegaraan", label: "Kewarganegaraan", source: "warga", required: true, order: 7 },
    { key: "alamat", label: "Alamat", source: "warga", required: true, order: 8 },
  ],
  SKTM: [
    { key: "nama", label: "Nama", source: "warga", required: true, order: 1 },
    { key: "nik", label: "NIK", source: "warga", required: true, order: 2 },
    {
      key: "tempat_tanggal_lahir",
      label: "Tempat/Tanggal Lahir",
      source: "warga",
      required: true,
      order: 3,
    },
    { key: "jenis_kelamin", label: "Jenis Kelamin", source: "warga", required: true, order: 4 },
    { key: "pekerjaan", label: "Pekerjaan", source: "warga", required: true, order: 5 },
    { key: "alamat", label: "Alamat", source: "warga", required: true, order: 6 },
    { key: "penghasilan", label: "Penghasilan/Bulan", source: "request", required: true, order: 7 },
    { key: "tanggungan", label: "Jumlah Tanggungan", source: "request", required: true, order: 8 },
  ],
  SKU: [
    { key: "nama", label: "Nama", source: "warga", required: true, order: 1 },
    { key: "nik", label: "NIK", source: "warga", required: true, order: 2 },
    {
      key: "tempat_tanggal_lahir",
      label: "Tempat/Tanggal Lahir",
      source: "warga",
      required: true,
      order: 3,
    },
    { key: "jenis_kelamin", label: "Jenis Kelamin", source: "warga", required: true, order: 4 },
    { key: "alamat", label: "Alamat", source: "warga", required: true, order: 5 },
    { key: "nama_usaha", label: "Nama Usaha", source: "request", required: true, order: 6 },
    { key: "jenis_usaha", label: "Jenis Usaha", source: "request", required: true, order: 7 },
    { key: "alamat_usaha", label: "Alamat Usaha", source: "request", required: true, order: 8 },
  ],
};

/** DNA clauses per jenis surat — relevansi logis, tidak mempersulit */
export const DNA_CLAUSES_PRESETS: Record<string, string[]> = {
  /* KEPENDUDUKAN */
  SKD: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat     : {{alamat}}",
    "adalah benar warga kami yang berdomisili di {{alamat}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  PINDAH_DOMISILI: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan akan melakukan pindah domisili dengan tujuan:\nAlamat Tujuan  : {{alamat_tujuan}}\nJenis Kepindahan: {{jenis_kepindahan}}\nJumlah Pengikut: {{jumlah_pengikut}} orang",
    "Surat keterangan ini dibuat sebagai persyaratan administrasi kepindahan.",
  ],
  PENDATANG: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}} (numpek di KK {{nama_pemilik_kk}})",
    "Asal daerah : {{asal}}\nAlasan            : {{alasan_datang}}",
    "Surat keterangan ini dibuat untuk pencatatan administratif dan bukan merupakan izin menetap.",
  ],
  KK_BARU: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan belum memiliki Kartu Keluarga (KK) dengan alasan: {{alasan}}.\nJumlah anggota keluarga yang akan terdaftar: {{jumlah_anggota}} orang.\nDaftar anggota keluarga:\n{{daftar_anggota}}",
    "Surat keterangan ini dibuat sebagai persyaratan pengurusan KK baru di Dukcapil.",
  ],
  BEDA_NAMA: [
    "Dengan ini menyatakan bahwa :",
    "Nama pada Dokumen 1 ({{jenis_dokumen1}}) : {{dokumen1}}\nNama pada Dokumen 2 ({{jenis_dokumen2}}) : {{dokumen2}}",
    "Keduanya adalah benar orang yang sama. Perbedaan nama bukan untuk tujuan pemalsuan identitas.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  ALAMAT_SEMENTARA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat Tetap : {{alamat}}",
    "Yang bersangkutan saat ini berdomisili sementara di {{alamat_sementara}}.\nAlasan       : {{alasan}}",
    "Surat ini dibuat sebagai bukti alamat sementara dan bukan untuk keperluan tetap.",
  ],
  SP_KTP: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk pengajuan Pembuatan KTP dengan jenis permohonan {{jenis_permohonan}}.",
    "Demikian surat pengantar ini dibuat dan dapat dibawa ke Kantor Dukcapil untuk proses lebih lanjut.",
  ],
  SP_KK: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk pengajuan Pembuatan/Perubahan Kartu Keluarga dengan jenis {{jenis_perubahan}}.",
    "Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
  ],

  /* SOSIAL & EKONOMI */
  SKTM: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan termasuk keluarga kurang mampu/prasejahtera dengan penghasilan Rp {{penghasilan}} per bulan dan menanggung {{tanggungan}} jiwa.",
    // ✅ ADOPSI OpenSID: DTKS integration
    "{{id_bdt ? 'ID DTKS/BDT : ' + id_bdt : ''}}",
    "{{program_bantuan ? 'Program Bantuan : ' + program_bantuan : ''}}",
    "{{no_kartu_bantuan ? 'No. Kartu Bantuan : ' + no_kartu_bantuan : ''}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PENGHASILAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nPekerjaan  : {{pekerjaan}}\nPenghasilan : Rp {{penghasilan}} per bulan",
    // ✅ ADOPSI OpenSID: Data orang tua untuk pelajar
    "{{nama_ayah ? '--- DATA AYAH ---' : ''}}",
    "{{nama_ayah ? 'Nama Ayah   : ' + nama_ayah : ''}}",
    "{{nik_ayah ? 'NIK Ayah    : ' + nik_ayah : ''}}",
    "{{tempat_lahir_ayah || tanggal_lahir_ayah ? 'TTL Ayah   : ' + (tempat_lahir_ayah||'') + '|' + (tanggal_lahir_ayah||'') : ''}}",
    "{{pekerjaan_ayah ? 'Pekerjaan  : ' + pekerjaan_ayah : ''}}",
    "{{penghasilan_ayah ? 'Penghasilan: Rp ' + penghasilan_ayah + '/bulan' : ''}}",
    "{{alamat_ayah ? 'Alamat     : ' + alamat_ayah : ''}}",
    "{{nama_ibu ? '--- DATA IBU ---' : ''}}",
    "{{nama_ibu ? 'Nama Ibu    : ' + nama_ibu : ''}}",
    "{{nik_ibu ? 'NIK Ibu     : ' + nik_ibu : ''}}",
    "{{tempat_lahir_ibu || tanggal_lahir_ibu ? 'TTL Ibu    : ' + (tempat_lahir_ibu||'') + '|' + (tanggal_lahir_ibu||'') : ''}}",
    "{{pekerjaan_ibu ? 'Pekerjaan  : ' + pekerjaan_ibu : ''}}",
    "{{penghasilan_ibu ? 'Penghasilan: Rp ' + penghasilan_ibu + '/bulan' : ''}}",
    "{{alamat_ibu ? 'Alamat     : ' + alamat_ibu : ''}}",
    "{{nama_sekolah ? '--- DATA SEKOLAH ---' : ''}}",
    "{{nama_sekolah ? 'Sekolah    : ' + nama_sekolah : ''}}",
    "{{jurusan ? 'Jurusan    : ' + jurusan : ''}}",
    "{{kelas_semester ? 'Kelas/Smt : ' + kelas_semester : ''}}",
    "{{nomor_induk ? 'No. Induk  : ' + nomor_induk : ''}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_KEHILANGAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama             : {{nama}}\nNIK              : {{nik}}\nBarang/Dokumen : {{barang_hilang}}\nTempat          : {{tempat_hilang}}\nWaktu           : {{waktu_hilang}}",
    "Surat keterangan ini diterbitkan untuk keperluan administrasi. Untuk laporan resmi, silakan hubungi kantor polisi terdekat.",
  ],
  SP_SKCK: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan adalah benar warga kami dan selama berdomisili di Desa {{nama_desa}}, tidak pernah tercatat melakukan tindak pidana/kejahatan.",
    "Surat pengantar ini dibuat untuk pengajuan SKCK dan keperluan {{keperluan}}.",
  ],
  SK_KELAKUAN_BAIK: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan dikenal berkelakuan baik, tidak pernah tersangkut masalah hukum, dan aktif dalam kegiatan sosial kemasyarakatan.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_TIDAK_PUNYA_KERJA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini tidak memiliki pekerjaan tetap dan termasuk kategori Pencari Kerja.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  VERIF_DTKS: [
    "Dengan ini memberikan PENGANTAR VERIFIKASI DTKS kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa warga tersebut telah kami verifikasi dan data kehadirannya tercatat dalam sistem kami.\nProgram bantuan yang dituju: {{program_bantuan}}.",
    "Surat ini dibuat sebagai bahan verifikasi Data Terpadu Kesejahteraan Sosial (DTKS).",
  ],

  /* PERNIKAHAN & KELUARGA */
  SK_BELUM_MENIKAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama              : {{nama}}\nNIK               : {{nik}}\nTempat/Tgl Lahir : {{tempat_tanggal_lahir}}",
    "Yang bersangkutan berstatus BELUM MENIKAH / belum pernah melangsungkan pernikahan.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}} sebagai salah satu syarat pengajuan akta nikah.",
  ],
  SK_NIKAH: [
    "Dengan ini memberikan SURAT PENGANTAR NIKAH kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan memenuhi persyaratan untuk melangsungkan pernikahan.{{binti ? '\nNama Binti (Nama gadis ibu kandung): ' + binti : ''}}",
    "Model Formulir  : {{model_formulir}}\nNama Pasangan  : {{nama_calon}}\nNIK Pasangan   : {{nik_calon}}",
    "Demikian surat pengantar nikah ini dibuat dan dapat dipergunakan sebagaimana mestinya.",
  ],
  SK_NIKAH_NONMUSLIM: [
    "Dengan ini memberikan SURAT PENGANTAR NIKAH NON-MUSLIM kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan rencana akan melangsungkan pernikahan dan surat ini dibuat untuk dicatatkan di Kantor Catatan Sipil.",
  ],
  SK_JANDA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini berstatus JANDA.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_DUDA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini berstatus DUDA.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_HUBUNGAN_KELUARGA: [
    "Dengan ini menyatakan bahwa :",
    "Nama              : {{nama}}\nNIK               : {{nik}}\nHubungan Keluarga : {{hubungan}}",
    "Dengan ini menyatakan bahwa yang bersangkutan memiliki hubungan keluarga dengan {{nama_anggota_keluarga}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan bukan merupakan akta catatan sipil.",
  ],
  SK_AHLI_WARIS: [
    "Dengan ini menyatakan bahwa :",
    "Yang bersangkutan adalah benar ahli waris sah dari:\nNama Almarhum/ah : {{nama_alm}}\nTanggal Meninggal : {{tgl_meninggal}}\nDaftar Ahli Waris :\n{{daftar_waris}}",
    "Surat keterangan ini dibuat sebagai salah satu persyaratan pengurusan klaim dan bukan merupakan pengesahan waris secara hukum.",
  ],
  DISPENSA_NIKAH: [
    "Dengan ini memberikan PENGANTAR DISPENSASI NIKAH kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan mengajukan dispensasi nikah ke Pengadilan Agama dengan alasan: {{alasan}}.",
    "Surat pengantar ini dibuat sebagai persyaratan pengajuan dispensasi nikah dan bukan merupakan izin nikah.",
  ],
  WALI_NIKAH: [
    "Dengan ini memberikan KETERANGAN WALI NIKAH HAKIM kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan tidak memiliki wali nikah yang dapat hadir karena: {{alasan_tidak_ada_wali}}.",
    "Surat keterangan ini menjadi dasar pengajuan penunjukan wali nikah hakim ke Pengadilan Agama.",
  ],

  /* USAHA & EKONOMI */
  SKU: [
    "Dengan ini menyatakan bahwa :",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nAlamat     : {{alamat}}",
    "Yang bersangkutan memiliki dan mengelola usaha dengan data:\nNama Usaha    : {{nama_usaha}}\nJenis Usaha    : {{jenis_usaha}}\nAlamat Usaha  : {{alamat_usaha}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}. Untuk perizinan resmi (NIB), silakan mengurus melalui sistem OSS.",
  ],
  IZIN_KERAMAIAN: [
    "Dengan ini memberikan IZIN KERAMAIAN kepada :",
    "Nama Acara   : {{nama_acara}}\nPelaksana   : {{nama}}\nLokasi      : {{lokasi}}",
    "Tanggal      : {{tgl_mulai}} s.d. {{tgl_selesai}}\nPerkiraan Tamu: {{jumlah_tamu}} orang",
    "Surat izin ini wajib dibawa saat acara dan dapat ditunjukkan kepada pihak berwajib.",
  ],
  SK_PETERNAK: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan berprofesi sebagai peternak di wilayah Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PENGRAJIN: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan bergerak di bidang kerajinan/seni: {{jenis_kerajinan}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PEDAGANG_PASAR: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan tercatat sebagai pedagang di {{nama_pasar}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],

  /* TANAH & PROPERTI */
  SK_TANAH_MILIK: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Berdasarkan data yang kami miliki, yang bersangkutan memiliki/menguasai tanah:\nLokasi     : {{lokasi_tanah}}\nLuas       : {{luas_tanah}}\nBatas-batas: {{batas}}",
    "Surat ini KETERANGAN dari Pemerintah Desa dan BUKAN merupakan sertifikat tanah. Untuk kepastian hukum, silakan menghubungi BPN.",
  ],
  SK_TANAH_TIDAK_SENGKETA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Tanah yang dikuasai:\nLokasi     : {{lokasi_tanah}}\nLuas       : {{luas_tanah}}\nBatas-batas: {{batas}}",
    "Tanah tersebut bebas sengketa dan tidak sedang dalam proses hukum di pengadilan.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_HIBAH_TANAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama            : {{nama}}\nNIK             : {{nik}}",
    "Tanah yang dihibahkan:\nLokasi        : {{lokasi_tanah}}\nLuas          : {{luas_tanah}}\nPenerima Hibah: {{penerima_hibah}}",
    "Surat keterangan ini dibuat sebagai tahap awal pengurusan hibah tanah di PPAT dan BPN.",
  ],
  SK_JUAL_BELI_TANAH: [
    "Dengan ini menyatakan bahwa :",
    "Transaksi jual beli tanah:\nLokasi  : {{lokasi_tanah}}\nLuas    : {{luas_tanah}}\nPenjual : {{penjual}}\nPembeli : {{pembeli}}",
    "Surat keterangan ini dibuat sebagai tahap awal pengurusan Akta Jual Beli (AJB) di PPAT.",
  ],
  SK_RUMAH_MILIK: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Yang bersangkutan memiliki bangunan rumah:\nLokasi      : {{lokasi_rumah}}\nLuas        : {{luas_bangunan}} m2\nTahun Dibangun: {{tahun_bangun}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan bukan merupakan IMB/PBG resmi.",
  ],
  SK_BELUM_PUNYA_RUMAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini belum memiliki rumah/kediaman sendiri.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_TANAH_WAKAF: [
    "Dengan ini menyatakan bahwa :",
    "Tanah wakaf:\nLokasi    : {{lokasi_tanah}}\nLuas      : {{luas_tanah}}\nNadzir    : {{nadzir_wakaf}}\nTujuan    : {{tujuan_wakaf}}",
    "Surat keterangan ini dibuat sebagai tahap awal pendaftaran wakaf di BWI.",
  ],

  /* PENDIDIKAN */
  SK_BEASISWA: [
    "Dengan ini menyatakan bahwa :",
    "Nama    : {{nama}}\nNIK     : {{nik}}\nAlamat  : {{alamat}}",
    "Yang bersangkutan saat ini menempuh pendidikan:\nNama Institusi   : {{nama_institusi}}\nProgram Beasiswa : {{program_beasiswa}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PENELITIAN: [
    "Dengan ini memberikan SURAT PENGANTAR kepada :",
    "Nama Kegiatan : {{judul_kegiatan}}\nInstitusi     : {{nama_institusi}}\nLokasi        : {{lokasi_penelitian}}\nLama          : {{lama_kegiatan}}\nPeserta       : {{jumlah_peserta}} orang",
    "Surat pengantar ini dibuat sebagai salah satu persyaratan kegiatan.",
  ],
  SK_PUTUS_SEKOLAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan pernah duduk di bangku pendidikan namun kemudian putus sekolah.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_AKTIF_SEKOLAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nNama Sekolah: {{nama_sekolah}}\nJenjang     : {{jenjang}}",
    "Yang bersangkutan saat ini masih aktif bersekolah.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],

  /* KESEHATAN & KHUSUS */
  SK_DISABILITAS: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan termasuk kategori penyandang disabilitas: {{jenis_disabilitas}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_LANSIA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini berusia {{umur}} tahun dan termasuk kategori lanjut usia (Lansia).",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_YATIM_PIATU: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan termasuk dalam kategori: {{status_yatim}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_HAMIL: [
    "Dengan ini memberikan KETERANGAN HAMIL kepada :",
    "Nama           : {{nama}}\nNIK            : {{nik}}\nUsia Kandungan : {{usia_kandungan}} bulan",
    "Surat keterangan ini dibuat sebagai salah satu syarat pemeriksaan dan bukan surat keterangan medis resmi.",
  ],

  /* PERTANIAN & LINGKUNGAN */
  SK_PETANI: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan berprofesi sebagai petani di wilayah Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_NELAYAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan berprofesi sebagai nelayan di wilayah pesisir Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_BENCANA: [
    "Dengan ini menyatakan bahwa :",
    "Nama           : {{nama}}\nNIK            : {{nik}}\nAlamat        : {{alamat}}",
    "Yang bersangkutan terdampak bencana:\nJenis    : {{jenis_bencana}}\nTanggal  : {{tanggal_kejadian}}\nKerugian: {{kerugian}}",
    "Surat keterangan ini dibuat untuk keperluan klaim dan bukan surat pernyataan resmi BNPB.",
  ],
  SK_PENGGUNAAN_LAHAN: [
    "Dengan ini menyatakan bahwa :",
    "Lahan dengan:\nLokasi             : {{lokasi_lahan}}\nLuas              : {{luas_lahan}}\nPeruntukan Sekarang : {{peruntukan_sekarang}}\nPeruntukan Usulan   : {{peruntukan_usulan}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_KELOMPOK_TANI: [
    "Dengan ini menyatakan bahwa :",
    "Kelompok Tani: {{nama_kelompok}}\nJumlah Anggota: {{jumlah_anggota}} orang",
    "Kelompok tersebut tercatat di Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],

  /* SURAT DINAS */
  SP_INSTANSI: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk keperluan kepada:\nInstansi : {{nama_instansi}}\nAlamat  : {{alamat_instansi}}",
    "Keperluan: {{keperluan}}.",
    "Demikian surat pengantar ini dibuat dengan sebenar-benarnya.",
  ],
  SURAT_BANTUAN: [
    "Dengan ini melaporkan permohonan bantuan dari warga kami:",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nAlamat     : {{alamat}}",
    "",
    "Jenis bantuan: {{jenis_bantuan}}\nAlasan pengajuan: {{alasan}}.",
    "Surat keterangan ini dibuat sebagai salah satu syarat pengajuan bantuan.",
  ],
  SURAT_REKOMENDASI: [
    "Dengan ini memberikan REKOMENDASI kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Isi Rekomendasi:\n{{isi_rekomendasi}}",
    "Demikian surat rekomendasi ini dibuat dengan sebenar-benarnya.",
  ],

  /* SURAT UMUM & LAINNYA */
  SPTJM: [
    "Dengan ini saya yang bertanda tangan di bawah ini:\nNama           : {{nama}}\nNIK            : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat         : {{alamat}}",
    "",
    "Menyatakan dan bertanggung jawab penuh atas:\nJudul Pernyataan: {{judul_pernyataan}}",
    "",
    "Isi Pernyataan:\n{{isi_pernyataan}}",
    "Surat pernyataan ini dibuat dengan penuh kesadaran tanpa paksaan. Apabila tidak sesuai, saya bersedia dituntut sesuai hukum yang berlaku.",
    "Surat ini WAJIB dibubuhi MATERAI Rp10.000,-",
  ],
  SURAT_KUASA: [
    "Dengan ini memberikan KUASA dari:\nNama Pemberi Kuasa : {{nama}}\nNIK Pemberi Kuasa  : {{nik}}\nKepada:\nNama Penerima Kuasa : {{penerima_kuasa}}\nNIK Penerima Kuasa  : {{nik_penerima_kuasa}}",
    "",
    "Wewenang yang diberikan:\n{{wewenang}}",
    "Surat kuasa ini dibuat di hadapan competent authority dan WAJIB dibubuhi materai Rp10.000,-",
  ],
  SK_WNI_KETURUNAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan adalah warga negara Indonesia keturunan.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_HAJI: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan akan menunaikan ibadah Haji/Umrah.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PASPOR: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan akan mengajukan pembuatan paspor dan membutuhkan surat pengantar dari pemerintah desa.",
    "Surat pengantar ini dibuat untuk keperluan {{keperluan}} dan bukan merupakan surat rekomendasi imigrasi.",
  ],
  SK_TKI: [
    "Dengan ini memberikan PENGANTAR CALON TKI/PMI kepada :",
    "Nama           : {{nama}}\nNIK            : {{nik}}\nNegara Tujuan : {{negara_tujuan}}\nJenis Pekerjaan: {{jenis_pekerjaan}}",
    "Perusahaan/PJTKI: {{nama_pt}}",
    "Surat keterangan ini dibuat sebagai salah satu syarat BP2MI dan Disnaker.",
  ],
  SK_ORGANISASI: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan aktif dalam organisasi kemasyarakatan di Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_TIDAK_DI_DESA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini tidak berada di Desa {{nama_desa}}.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SP_PTSL: [
    "Dengan ini memberikan PENGANTAR PTSL kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk pengajuan:\nLokasi Tanah : {{lokasi_tanah}}\nLuas Tanah   : {{luas_tanah}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat Program PTSL oleh BPN.",
  ],
  SP_AKTA_KEMATIAN: [
    "Dengan ini memberikan PENGANTAR AKTA KEMATIAN kepada :",
    "Nama Jenazah    : {{nama_jenazah}}\nNIK             : {{nik}}\nTgl Meninggal   : {{tanggal_meninggal}}\nTempat          : {{tempat_meninggal}}\nPenyebab Kematian: {{penyebab}}",
    "--- DATA PELAPOR ---",
    "Nama Pelapor : {{nama_pelapor}}\nNIK Pelapor  : {{nik_pelapor}}\nHubungan      : {{hubungan_pelapor}}\nAlamat        : {{alamat_pelapor}}",
    "--- DATA SAKSI ---",
    "Saksi        : {{nama_saksi}}\nNIK Saksi   : {{nik_saksi}}\nAlamat       : {{alamat_saksi}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat penerbitan Akta Kematian di Dukcapil.",
  ],
  SP_AKTA_KELAHIRAN: [
    "Dengan ini memberikan PENGANTAR AKTA KELAHIRAN kepada :",
    "Nama Bayi     : {{nama_bayi}}\nTgl Lahir    : {{tanggal_lahir}}\nTempat Lahir : {{tempat_lahir}}\nJenis Kelamin : {{jenis_kelamin_bayi}}",
    "--- DATA AYAH ---",
    "Nama Ayah    : {{nama_ayah}}\nNIK Ayah     : {{nik_ayah}}\nTTL Ayah     : {{tempat_lahir_ayah}}|{{tanggal_lahir_ayah}}\nPekerjaan    : {{pekerjaan_ayah}}\nKewarganegaraan: {{kewarganegaraan_ayah}}\nAlamat       : {{alamat_ayah}}",
    "--- DATA IBU ---",
    "Nama Ibu     : {{nama_ibu}}\nNIK Ibu       : {{nik_ibu}}\nTTL Ibu       : {{tempat_lahir_ibu}}|{{tanggal_lahir_ibu}}\nPekerjaan    : {{pekerjaan_ibu}}\nKewarganegaraan: {{kewarganegaraan_ibu}}\nAlamat       : {{alamat_ibu}}",
    "--- DATA PELAPOR ---",
    "Nama Pelapor : {{nama_pelapor}} ({{hubungan_pelapor}})\nNIK Pelapor  : {{nik_pelapor}}\nAlamat       : {{alamat_pelapor}}",
    "--- DATA SAKSI ---",
    "Saksi 1      : {{nama_saksi_1}} | {{nik_saksi_1}} | {{alamat_saksi_1}}",
    "Saksi 2      : {{nama_saksi_2}} | {{nik_saksi_2}} | {{alamat_saksi_2}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat penerbitan Akta Kelahiran di Dukcapil.",
  ],
  SP_AKTA_LAHIR: [
    "Dengan ini memberikan PENGANTAR untuk penerbitan Akta Lahir kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengurusan Akta Lahir bagi warga yang belum memiliki.",
  ],
  SP_IZIN_REKLAME: [
    "Dengan ini memberikan PENGANTAR untuk Izin Reklame kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin reklame ke Dinas Perizinan.",
  ],
  SP_IMB: [
    "Dengan ini memberikan PENGANTAR untuk Izin Bangunan kepada :",
    "Nama    : {{nama}}\nNIK     : {{nik}}\nLokasi   : {{lokasi_bangunan}}\nLuas     : {{luas_bangunan}} m2\nFungsi   : {{fungsi_bangunan}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengajuan IMB/PBG ke Dinas Perizinan.",
  ],
  SP_SANGGAR: [
    "Dengan ini memberikan PENGANTAR untuk Pendirian Sanggar/Kursus kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin pendirian sanggar/kursus.",
  ],
  SP_BEBAS_NARKOBA: [
    "Dengan ini memberikan PENGANTAR untuk Pemeriksaan Bebas Narkotika kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pemeriksaan bebas narkoba diinstansi kesehatan.",
  ],
  SP_PENEBANGAN_POHON: [
    "Dengan ini memberikan PENGANTAR untuk Penebangan Pohon kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nJumlah Pohon : {{jumlah_pohon}} pohon\nLokasi Pohon: {{lokasi}}\nAlasan       : {{alasan}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin penebangan pohon.",
  ],
  SP_PENGGALANGAN_DANA: [
    "Dengan ini memberikan PENGANTAR untuk Penggalangan Dana kepada :",
    "Nama Kegiatan : {{nama_acara}}\nTarget Dana  : Rp {{target_dana}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin penggalangan dana.",
  ],
  SP_PENDAFTARAN_TANAH: [
    "Dengan ini memberikan PENGANTAR untuk Pendaftaran Tanah kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nLokasi : {{lokasi_tanah}}\nLuas   : {{luas_tanah}}",
    "Surat pengantar ini dibuat sebagai salah satu syarat Sporadik/PTSL ke BPN.",
  ],
  SP_VERIF_KELAHIRAN: [
    "Dengan ini memberikan PENGANTAR VERIFIKASI KELAHIRAN kepada :",
    "Nama Bayi     : {{nama_bayi}}\nTgl Lahir    : {{tanggal_lahir}}\nTempat Lahir : {{tempat_lahir}}\nNama Ibu      : {{nama_ibu}}\nNama Ayah     : {{nama_ayah}}",
    "Surat pengantar ini dibuat untuk verifikasi data kelahiran di tingkat desa.",
  ],

  /* ==================== TAMBAHAN DARI OpenSID (3 Surat) ==================== */

  SK_HARGA_TANAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nAlamat     : {{alamat}}",
    "--- DATA TANAH ---",
    "Lokasi       : {{lokasi_tanah}}\nLuas Tanah   : {{luas_tanah}} m²{{luas_bangunan ? '\nLuas Bangunan: ' + luas_bangunan + ' m²' : ''}}",
    "{{atas_nama_tanah ? 'Atas Nama    : ' + atas_nama_tanah : ''}}",
    "{{nomor_sertifikat ? 'No. Sertifikat: ' + nomor_sertifikat : ''}}",
    "Harga Tanah  : Rp {{harga_tanah}}/m²{{harga_bangunan ? '\nHarga Bangunan: Rp ' + harga_bangunan + '/m²' : ''}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],

  SK_LAHIR_MATI: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}",
    "--- DATA IBU ---",
    "Nama        : {{nama_ibu}}\nKehamilan   : {{lama_kandungan}} bulan",
    "--- DATA Kelahiran ---",
    "Tanggal     : {{tanggal_kelahiran}}{{hari ? '\nHari        : ' + hari : ''}}{{jam ? '\nJam         : ' + jam : ''}}\nTempat      : {{tempat_mati}}{{jenis_kelamin_janin ? '\nJenis Kelamin: ' + jenis_kelamin_janin : ''}}",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],

  SK_IZIN_ORANG_TUA: [
    "Dengan ini menyatakan bahwa :",
    "Nama Pemberi Izin : {{nama_pemberi_izin}}",
    "--- DATA ANAK ---",
    "Nama        : {{nama_anak}}\nAlamat     : {{alamat_anak}}{{pekerjaan_anak ? '\nPekerjaan  : ' + pekerjaan_anak : ''}}{{status_pekerjaan ? '\nStatus      : ' + status_pekerjaan : ''}}{{negara_tujuan ? '\nTujuan      : ' + negara_tujuan : ''}}{{masa_kontrak ? '\nLama Kontrak: ' + masa_kontrak + ' tahun' : ''}}",
    "Yang bersangkutan telah memberikan izin {{keperluan}}.",
  ],
};
