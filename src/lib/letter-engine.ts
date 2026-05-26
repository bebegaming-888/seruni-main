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
import { BULAN_ID } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LetterVars = Record<string, string>;

export type SubjectRow = {
  label: string;
  value: string;
};

export type RenderedLetter = {
  header: {
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
    signImageUrl?: string;
    footerText?: string;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
 * Mendukung conditional expressions untuk conditional DNA clause rendering:
 *
 *   {{key}}                          → vars[key] ?? "-"
 *   {{key || "fallback"}}            → vars[key] ?? "fallback"
 *   {{key ? 'truthy' : 'falsy'}}     → conditional inline
 *   {{key ? key + ' suffix' : ''}}   → conditional concat (key reference)
 *
 * Unresolved → "-" untuk placeholder, "" untuk conditional falsy.
 */
export function renderVars(text: string, vars: LetterVars): string {
  const val = (k: string, fallback = "-"): string => {
    const v = vars[k];
    return v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : fallback;
  };

  let result = text;

  // Pass 1: {{key || "fallback"}} | {{key||fallback}} | {{key||'fallback'}}
  // Handles DNA_CLAUSES_PRESETS format: {{tempat_lahir_ayah||''}}, {{nama || "Anonim"}}, {{key||Anonim}}
  result = result.replace(
    /\{\{([\w.]+)\s*\|\|\s*(?:'([^']*)'|"([^"]*)"|([^{}\s]+?))\}\}/g,
    (_, k, sq, dq, bare) => {
      const fallback = sq ?? dq ?? bare ?? "";
      // Empty-string fallback → return "" (caller passes `|| ''` for conditional concatenation)
      return fallback === "" ? val(k, "") : val(k, fallback);
    },
  );

  // Pass 2: {{key}} — basic replacement (no fallback), unresolved → "-"
  result = result.replace(/\{\{(\w+)\}\}/g, (_, k) => val(k, "-"));

  // Pass 3: {{key ? 'a' : 'b'}} — inline conditional
  result = result.replace(
    /\{\{([\w.]+)\s*\?\s*'([^']+)'\s*:\s*'([^']*)'\}\}/g,
    (_, k, truthy, falsy) => (val(k) !== "-" ? truthy : falsy),
  );

  // Pass 4: {{key ? 'prefix' + key + 'suffix' : ''}} — self-referential concat
  // Matches: {{id_bdt ? 'ID DTKS/BDT : ' + id_bdt + '' : ''}}
  // After prefix-quote: [^']* captures "ID DTKS/BDT : ' + key + " (including the closing quote of prefix)
  // suffix captures: ' + '' — the 'suffix' from after the + to the closing ' of suffix
  result = result.replace(
    /\{\{([a-z_][a-z0-9_]*)\s*\?\s*'([^']*)\+[a-z_][a-z0-9_]*\+'([^']*)'\s*:\s*''\}\}/g,
    (_, k, _prefix, _suffix) => {
      const v = vars[k];
      // _prefix ends with ' + key + which has 7 chars: space, ', space, +, space
      const prefix = _prefix.replace(/\s*\+\s*[a-z_][a-z0-9_]*\+\s*$/, "");
      const suffix = _suffix.replace(/^\s*\+\s*/, "");
      if (v !== undefined && v !== null && String(v).trim() !== "") return `${prefix}${v}${suffix}`;
      return "";
    },
  );

  // Pass 5: {{key ? 'value' : ''}} — simple truthy-only conditional
  result = result.replace(
    /\{\{([a-z_][a-z0-9_]*)\s*\?\s*'([^']*)'\s*:\s*''\}\}/g,
    (_, k, truthy) => (val(k) !== "-" ? truthy : ""),
  );

  return result;
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
    signImageUrl: settings.signature.sign_image_storage_path
      ? getMediaUrl(settings.signature.sign_image_storage_path, "public-media")
      : settings.signature.sign_image_url || undefined,
    footerText: kop.footer_enabled ? kop.footer_text : undefined,
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

/** Mapping Kode Klasifikasi Arsip Surat (Permendagri 83/2022) */
export const KODE_KLASIFIKASI_SURAT: Record<string, string> = {
  /* KEPENDUDUKAN & UMUM */
  SK_DOMISILI: "470",
  SK_DOMISILI_USAHA: "470",
  SK_BEDA_IDENTITAS: "470",
  SK_PENDUDUK: "470",
  SURAT_JALAN: "470",
  SP_KTP: "470",
  SP_KK: "474",
  SK_WNI_KETURUNAN: "470",

  /* KEMATIAN, KELAHIRAN & PINDAH */
  SP_AKTA_KELAHIRAN: "474.1",
  SP_AKTA_KEMATIAN: "474.3",
  SK_AHLI_WARIS: "474",
  SK_PINDAH: "475",

  /* PERNIKAHAN & KELUARGA */
  SK_BELUM_MENIKAH: "474.2",
  SK_NIKAH: "474.2",
  SK_JANDA_DUDA: "474.2",
  SK_CERAI: "474.2",
  DISPENSA_NIKAH: "474.2",
  WALI_NIKAH: "474.2",
  SK_IZIN_ORANG_TUA: "140",

  /* SOSIAL, PENDIDIKAN & EKONOMI */
  SKTM: "401",
  SK_PENGHASILAN: "401",
  SK_PROFESI_USAHA: "503",
  SK_BEASISWA: "420",
  SK_AKTIF_SEKOLAH: "420",
  SK_PENELITIAN: "070",
  SK_DISABILITAS: "460",
  SK_LANSIA: "460",
  SK_YATIM_PIATU: "460",
  VERIF_DTKS: "460",
  SURAT_BANTUAN: "460",

  /* PERTANAHAN & PERIZINAN */
  SK_TANAH_MILIK: "593",
  SK_JUAL_BELI_TANAH: "593",
  SK_HIBAH_TANAH: "593",
  SK_TANAH_WAKAF: "593",
  SK_HARGA_TANAH: "593",
  SK_RUMAH_MILIK: "593",
  SK_BELUM_PUNYA_RUMAH: "140",
  IZIN_KERAMAIAN: "332",
  SP_SKCK: "332",

  /* ADMINISTRASI KHUSUS */
  SURAT_KUASA: "140",
  SK_KEHILANGAN: "140",
  SP_INSTANSI: "140",
  SPTJM: "140",
};

/** Preset subject fields per jenis surat */
export const SUBJECT_FIELDS_PRESETS: Record<string, SubjectFieldConfig[]> = {
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
  SK_PROFESI_USAHA: [
    { key: "nama", label: "Nama", source: "warga", required: true, order: 1 },
    { key: "nik", label: "NIK", source: "warga", required: true, order: 2 },
    {
      key: "tempat_tanggal_lahir",
      label: "Tempat/Tanggal Lahir",
      source: "warga",
      required: true,
      order: 3,
    },
    { key: "alamat", label: "Alamat", source: "warga", required: true, order: 4 },
    { key: "nama_usaha", label: "Nama Usaha", source: "request", required: true, order: 5 },
    { key: "jenis_usaha", label: "Jenis Usaha", source: "request", required: true, order: 6 },
    { key: "alamat_usaha", label: "Alamat Usaha", source: "request", required: true, order: 7 },
  ],
};

/** DNA clauses per jenis surat — relevansi logis, tidak mempersulit */
export const DNA_CLAUSES_PRESETS: Record<string, string[]> = {
  /* KEPENDUDUKAN & UMUM */
  SK_DOMISILI: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat     : {{alamat}}",
    "adalah benar warga kami yang berdomisili tetap di alamat tersebut di atas.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_DOMISILI_USAHA: [
    "Dengan ini menyatakan bahwa :",
    "Nama Usaha  : {{nama_usaha}}\nJenis Usaha : {{jenis_usaha}}\nAlamat Usaha: {{alamat_usaha}}",
    "Adalah benar usaha tersebut berdomisili dan beroperasi di wilayah Desa {{nama_desa}}, yang dikelola oleh:",
    "Nama Pemilik: {{nama}}\nNIK         : {{nik}}\nAlamat      : {{alamat}}",
    "Surat keterangan domisili usaha ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_BEDA_IDENTITAS: [
    "Dengan ini menyatakan bahwa :",
    "Nama pada Dokumen 1 ({{jenis_dokumen1}}) : {{dokumen1}}\nNama pada Dokumen 2 ({{jenis_dokumen2}}) : {{dokumen2}}",
    "Keduanya adalah benar orang yang sama. Perbedaan identitas tersebut bukan untuk tujuan pemalsuan, melainkan karena kesalahan administratif.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PENDUDUK: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat     : {{alamat}}",
    "Bahwa yang bersangkutan adalah benar warga masyarakat Desa {{nama_desa}} dan tercatat dalam register kependudukan kami.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SURAT_JALAN: [
    "Dengan ini memberikan SURAT JALAN kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan bermaksud melakukan perjalanan ke:\nTujuan    : {{tujuan_perjalanan}}\nKeperluan : {{keperluan}}",
    "Berangkat pada tanggal {{tgl_berangkat}} dan diperkirakan kembali pada tanggal {{tgl_kembali}}.",
    "Demikian surat jalan ini dibuat untuk dapat dipergunakan sebagaimana mestinya oleh pihak yang berwenang.",
  ],
  SP_KTP: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk pengajuan Pembuatan/Perpanjangan KTP Elektronik dengan jenis permohonan {{jenis_permohonan}}.",
    "Demikian surat pengantar ini dibuat dan dapat dibawa ke Kantor Dukcapil untuk proses lebih lanjut.",
  ],
  SP_KK: [
    "Dengan ini memberikan PENGANTAR kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Untuk pengajuan Pembuatan/Perubahan Kartu Keluarga (KK) dengan jenis permohonan {{jenis_permohonan}}.",
    "Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya di Kantor Dukcapil.",
  ],
  SK_WNI_KETURUNAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan adalah benar Warga Negara Indonesia Keturunan yang menetap di wilayah kami.",
    "Surat keterangan ini dibuat untuk keperluan administrasi kependudukan.",
  ],

  /* KEMATIAN, KELAHIRAN & PINDAH */
  SP_AKTA_KELAHIRAN: [
    "Dengan ini memberikan PENGANTAR AKTA KELAHIRAN kepada :",
    "Nama Bayi     : {{nama_bayi}}\nTgl Lahir    : {{tanggal_lahir}}\nTempat Lahir : {{tempat_lahir}}\nJenis Kelamin : {{jenis_kelamin_bayi}}",
    "--- DATA AYAH ---",
    "Nama Ayah    : {{nama_ayah}}\nNIK Ayah     : {{nik_ayah}}\nAlamat       : {{alamat_ayah}}",
    "--- DATA IBU ---",
    "Nama Ibu     : {{nama_ibu}}\nNIK Ibu       : {{nik_ibu}}\nAlamat       : {{alamat_ibu}}",
    "--- DATA PELAPOR ---",
    "Nama Pelapor : {{nama_pelapor}} ({{hubungan_pelapor}})\nNIK Pelapor  : {{nik_pelapor}}\nAlamat       : {{alamat_pelapor}}",
    "Surat pengantar ini dibuat sebagai persyaratan pengurusan Akta Kelahiran di Dukcapil.",
  ],
  SP_AKTA_KEMATIAN: [
    "Dengan ini memberikan PENGANTAR AKTA KEMATIAN kepada :",
    "Nama Jenazah    : {{nama_jenazah}}\nNIK             : {{nik_jenazah}}\nTgl Meninggal   : {{tanggal_meninggal}}\nTempat          : {{tempat_meninggal}}\nPenyebab Kematian: {{penyebab}}",
    "--- DATA PELAPOR ---",
    "Nama Pelapor : {{nama_pelapor}}\nNIK Pelapor  : {{nik_pelapor}}\nHubungan      : {{hubungan_pelapor}}\nAlamat        : {{alamat_pelapor}}",
    "Surat pengantar ini dibuat sebagai persyaratan penerbitan Akta Kematian di Dukcapil.",
  ],
  SK_AHLI_WARIS: [
    "Dengan ini menyatakan bahwa :",
    "Telah meninggal dunia seorang warga bernama {{nama_alm}} pada tanggal {{tgl_meninggal}}.",
    "Bahwa almarhum/ah meninggalkan ahli waris yang sah secara hukum, yaitu:\n{{daftar_waris}}",
    "Surat keterangan ahli waris ini dibuat di bawah sumpah para ahli waris untuk keperluan pengurusan klaim/warisan, dan jika terjadi sengketa hukum di kemudian hari, sepenuhnya menjadi tanggung jawab para pihak.",
  ],
  SK_PINDAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan akan pindah domisili dengan tujuan:\nAlamat Tujuan  : {{alamat_tujuan}}\nAlasan Pindah  : {{alasan_pindah}}\nJumlah Pengikut: {{jumlah_pengikut}} orang",
    "Surat keterangan ini dibuat sebagai persyaratan pengurusan surat pindah antar desa/kecamatan/kabupaten.",
  ],

  /* PERNIKAHAN & KELUARGA */
  SK_BELUM_MENIKAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama              : {{nama}}\nNIK               : {{nik}}\nTempat/Tgl Lahir : {{tempat_tanggal_lahir}}\nAlamat           : {{alamat}}",
    "Berdasarkan catatan kependudukan kami, yang bersangkutan berstatus BELUM MENIKAH / belum pernah melangsungkan pernikahan.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_NIKAH: [
    "Dengan ini memberikan PENGANTAR NIKAH kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan tidak terdapat halangan untuk melangsungkan pernikahan (N1, N2, N4) dengan:",
    "Nama Pasangan  : {{nama_calon}}\nNIK Pasangan   : {{nik_calon}}\nAlamat Pasangan: {{alamat_calon}}",
    "Demikian surat pengantar nikah ini dibuat untuk dipergunakan di Kantor Urusan Agama (KUA) / Catatan Sipil.",
  ],
  SK_JANDA_DUDA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini berstatus {{status_pernikahan}} (Cerai Hidup/Cerai Mati).",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_CERAI: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan memohon surat pengantar terkait proses {{jenis_proses_cerai}} (Gugat Cerai / Talak) dengan pasangannya:",
    "Nama Pasangan : {{nama_pasangan}}\nNIK Pasangan  : {{nik_pasangan}}",
    "Surat ini dibuat sebagai pengantar administrasi ke Pengadilan Agama / Pengadilan Negeri.",
  ],
  DISPENSA_NIKAH: [
    "Dengan ini memberikan PENGANTAR DISPENSASI NIKAH kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan mengajukan dispensasi nikah karena {{alasan_dispensasi}}.",
    "Surat pengantar ini dibuat sebagai persyaratan pengajuan permohonan ke Pengadilan Agama/KUA.",
  ],
  WALI_NIKAH: [
    "Dengan ini memberikan KETERANGAN WALI NIKAH HAKIM kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa yang bersangkutan memohon penunjukan Wali Hakim karena {{alasan_wali_hakim}}.",
    "Surat keterangan ini menjadi dasar pengajuan ke Pengadilan Agama/KUA.",
  ],
  SK_IZIN_ORANG_TUA: [
    "Dengan ini menyatakan bahwa kami selaku Orang Tua / Wali :",
    "Nama Pemberi Izin : {{nama_pemberi_izin}}\nNIK               : {{nik_pemberi_izin}}\nHubungan          : {{hubungan}}",
    "Memberikan izin dan persetujuan penuh kepada anak/tanggungan kami:",
    "Nama Anak   : {{nama}}\nNIK Anak    : {{nik}}",
    "Untuk keperluan {{keperluan_izin}} (bekerja ke luar negeri/menikah/operasi medis).",
    "Demikian surat izin ini dibuat tanpa paksaan dari pihak mana pun.",
  ],

  /* SOSIAL, PENDIDIKAN & EKONOMI */
  SKTM: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Berdasarkan pendataan tingkat kesejahteraan desa, yang bersangkutan termasuk keluarga kurang mampu/prasejahtera dengan penghasilan rata-rata Rp {{penghasilan}} per bulan dan menanggung {{tanggungan}} jiwa.",
    "Surat keterangan tidak mampu ini dibuat untuk keperluan administrasi pengajuan keringanan/bantuan.",
  ],
  SK_PENGHASILAN: [
    "Dengan ini menyatakan bahwa :",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nPekerjaan  : {{pekerjaan}}\nPenghasilan: Rp {{penghasilan}} per bulan",
    "Surat keterangan penghasilan ini diterbitkan berdasarkan pengakuan/pernyataan dari yang bersangkutan dan dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_PROFESI_USAHA: [
    "Dengan ini menyatakan bahwa :",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nAlamat     : {{alamat}}",
    "Yang bersangkutan adalah benar berprofesi sebagai / memiliki usaha:\nBidang Pekerjaan / Nama Usaha: {{nama_usaha}}\nJenis/Sektor  : {{jenis_usaha}}\nLokasi        : {{alamat_usaha}}",
    "Surat keterangan ini menerangkan profesi/usaha warga untuk keperluan {{keperluan}} dan bukan izin resmi OSS.",
  ],
  SK_BEASISWA: [
    "Dengan ini menyatakan bahwa :",
    "Nama    : {{nama}}\nNIK     : {{nik}}\nAlamat  : {{alamat}}",
    "Berdasarkan catatan kami, yang bersangkutan mengajukan permohonan Surat Keterangan untuk melengkapi persyaratan program Beasiswa.",
    "Kami menyatakan bahwa yang bersangkutan berkelakuan baik dan layak dipertimbangkan sebagai penerima beasiswa.",
  ],
  SK_AKTIF_SEKOLAH: [
    "Dengan ini menyatakan bahwa :",
    "Nama        : {{nama}}\nNIK         : {{nik}}\nInstitusi   : {{nama_sekolah}}",
    "Yang bersangkutan tercatat berdomisili di desa kami dan dilaporkan masih berstatus sebagai Siswa/Mahasiswa aktif.",
    "Surat keterangan ini dibuat untuk keperluan administrasi.",
  ],
  SK_PENELITIAN: [
    "Dengan ini memberikan SURAT PENGANTAR PENELITIAN kepada :",
    "Nama Peneliti : {{nama}}\nInstitusi     : {{nama_institusi}}\nJudul Kajian  : {{judul_penelitian}}\nLokasi        : {{lokasi_penelitian}}",
    "Pemerintah Desa {{nama_desa}} mengetahui dan mengizinkan kegiatan riset/penelitian tersebut sesuai dengan peraturan yang berlaku.",
  ],
  SK_DISABILITAS: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan tercatat dalam data desa sebagai penyandang disabilitas ({{jenis_disabilitas}}).",
    "Surat keterangan ini dibuat untuk pengurusan hak dan bantuan disabilitas.",
  ],
  SK_LANSIA: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan saat ini tercatat sebagai warga Lanjut Usia (Lansia) di desa kami.",
    "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
  ],
  SK_YATIM_PIATU: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan berstatus {{status_yatim_piatu}} karena orang tuanya telah meninggal dunia.",
    "Surat keterangan ini dibuat sebagai syarat pengurusan bantuan sosial anak yatim/piatu.",
  ],
  VERIF_DTKS: [
    "Dengan ini memberikan KETERANGAN VERIFIKASI DTKS kepada :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "",
    "Bahwa warga tersebut telah kami verifikasi masuk/memenuhi kriteria Data Terpadu Kesejahteraan Sosial (DTKS).",
    "Surat ini dibuat untuk diajukan kepada Dinas Sosial terkait program bantuan {{program_bantuan}}.",
  ],
  SURAT_BANTUAN: [
    "Dengan ini melaporkan permohonan bantuan sosial untuk:",
    "Nama       : {{nama}}\nNIK        : {{nik}}\nAlamat     : {{alamat}}",
    "",
    "Kondisi sosial/ekonomi: {{kondisi_sosial}}.\nJenis Bantuan yang Diharapkan: {{jenis_bantuan}}.",
    "Demikian surat pengantar ini dibuat sebagai usulan ke tingkat yang berwenang.",
  ],

  /* PERTANAHAN & PERIZINAN */
  SK_TANAH_MILIK: [
    "Dengan ini menyatakan bahwa :",
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Berdasarkan riwayat dan penguasaan fisik, menguasai sebidang tanah:\nLokasi     : {{lokasi_tanah}}\nLuas       : {{luas_tanah}} m2\nBatas Utara: {{batas_utara}}\nBatas Timur: {{batas_timur}}\nBatas Selatan: {{batas_selatan}}\nBatas Barat: {{batas_barat}}",
    "Tanah tersebut benar-benar dikuasai oleh yang bersangkutan, tidak dalam sengketa, dan tidak digadaikan.",
    "Surat ini BUKAN sertifikat, melainkan Surat Keterangan Penguasaan Tanah untuk keperluan persyaratan administrasi BPN.",
  ],
  SK_JUAL_BELI_TANAH: [
    "Dengan ini menerangkan transaksi Jual Beli Tanah:",
    "Pihak Pertama (Penjual) : {{penjual}}\nPihak Kedua (Pembeli)   : {{pembeli}}",
    "Obyek Tanah:\nLokasi : {{lokasi_tanah}}\nLuas   : {{luas_tanah}} m2\nHarga Transaksi: Rp {{harga_jual}}",
    "Surat keterangan ini dicatat di register desa sebagai pengantar pengurusan Akta Jual Beli (AJB) melalui PPAT.",
  ],
  SK_HIBAH_TANAH: [
    "Dengan ini menerangkan pelimpahan Hak Hibah Tanah:",
    "Pihak Pemberi Hibah : {{pemberi_hibah}}\nPihak Penerima Hibah: {{penerima_hibah}}",
    "Obyek Tanah:\nLokasi : {{lokasi_tanah}}\nLuas   : {{luas_tanah}} m2",
    "Surat keterangan ini dicatat di register desa sebagai pengantar pengurusan Akta Hibah melalui PPAT.",
  ],
  SK_TANAH_WAKAF: [
    "Dengan ini menerangkan Ikrar Wakaf atas Tanah:",
    "Pewakaf (Wakif) : {{nama_wakif}}\nPenerima (Nadzir): {{nama_nadzir}}",
    "Obyek Tanah:\nLokasi : {{lokasi_tanah}}\nLuas   : {{luas_tanah}} m2\nPeruntukan Wakaf: {{peruntukan}}",
    "Surat keterangan ini diterbitkan sebagai pengantar ke KUA/BWI untuk pengurusan Akta Ikrar Wakaf (AIW).",
  ],
  SK_HARGA_TANAH: [
    "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
    "Yang bersangkutan mengajukan permohonan/pengantar terkait perceraian/rujuk dengan:",
    "Nama Pasangan : {{nama_pasangan}}\nNIK Pasangan  : {{nik_pasangan}}",
    "Surat keterangan ini dibuat sebagai pengantar ke Pengadilan Agama / KUA terkait proses {{jenis_proses}}.",
  ],
};

/** Normalize key untuk lookup DNA_CLAUSES_PRESETS — dash → underscore */
function normalizeDnaKey(key: string): string {
  return key.replace(/-/g, "_");
}

/** Get DNA clauses dengan fallback ke underscore key jika dash key tidak ada */
export function getDnaClauses(code: string): string[] {
  return DNA_CLAUSES_PRESETS[code] ?? DNA_CLAUSES_PRESETS[normalizeDnaKey(code)] ?? [];
}
