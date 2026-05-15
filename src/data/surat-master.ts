/**
 * Master Database Surat Desa — 73 Jenis Surat
 *
 * Data source: daftar_surat.csv
 * Mapping:
 * - Klasifikasi kode (474.0, 475.0, dll) mengikuti Peraturan Menteri Dalam Negeri
 * - STATUS: KEEP (pertahankan), REVISE (perlu simplifikasi), TAMBAHAN-BARU (pengganti surat non-wewenang)
 * - Target DNA: jumlah field optimal (dari kolom CATATAN)
 *
 * Schema:
 * - code: unik identifier (e.g., "SKD", "SKU")
 * - name: nama resmi surat
 * - category: kategori utama (11 kategori)
 * - wewenang: true (wewenang penuh desa) / false (hanya pengantar ke instansi)
 * - description: ringkasan fungsi
 * - eta: estimasi waktu proses
 * - fields: field spesifik per jenis (selain identitas autofill)
 * - syarat: persyaratan dokumen
 * - kodeKlasifikasi: kode Kemendagri
 * - isNew: true jika ini pengganti surat non-wewenang
 * - note: catatan penting
 */

import type { FieldDef } from "@/data/surat-fields";

export type SuratMaster = {
  code: string;
  name: string;
  category: string;
  wewenang: boolean; // true = wewenang penuh desa, false = hanya pengantar
  description: string;
  eta: string;
  fields: FieldDef[];
  syarat: string[];
  kodeKlasifikasi: string;
  isNew?: boolean; // true jika ini pengganti surat non-wewenang
  note?: string;
};

/* ==================== FIELD DEFINITIONS BIASA ==================== */

const COMMON_FIELDS_SHORT: FieldDef[] = [
  {
    key: "keperluan",
    label: "Keperluan",
    type: "textarea",
    placeholder: "Jelaskan keperluan...",
    required: true,
    colSpan: 2,
  },
];

const COMMON_FIELDS_MEDIUM: FieldDef[] = [
  {
    key: "keperluan",
    label: "Keperluan",
    type: "textarea",
    placeholder: "Jelaskan keperluan...",
    required: true,
    colSpan: 2,
  },
  { key: "keterangan", label: "Keterangan Tambahan", type: "textarea", colSpan: 2 },
];

const COMMON_FIELDS_LONG: FieldDef[] = [
  {
    key: "keperluan",
    label: "Keperluan",
    type: "textarea",
    placeholder: "Jelaskan keperluan...",
    required: true,
    colSpan: 2,
  },
  { key: "keterangan", label: "Keterangan Tambahan", type: "textarea", colSpan: 2 },
  { key: "no_surat_pengantar", label: "Nomor Surat Pengantar RT/RW", type: "text" },
];

/* ==================== MAPPING CSV → SCHEMA ==================== */

export const SURAT_MASTER: Record<string, SuratMaster> = {
  /* ==================== KEPENDUDUKAN (10) ==================== */
  SKD: {
    code: "SKD",
    name: "Surat Keterangan Domisili",
    category: "Kependudukan",
    wewenang: true,
    description:
      "Surat paling fundamental dan paling banyak dipakai. Wewenang penuh desa. Semua keperluan domisili.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Untuk persyaratan pembukaan rekening bank...",
        required: true,
        colSpan: 2,
      },
      {
        key: "lama_tinggal",
        label: "Lama Berdomisili",
        type: "text",
        placeholder: "Contoh: 5 tahun",
        required: true,
      },
    ],
    syarat: ["Fotokopi KTP", "Fotokopi Kartu Keluarga", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "474",
    note: "Target DNA: 13 field (dari 28)",
  },

  PINDAH_DOMISILI: {
    code: "PINDAH_DOMISILI",
    name: "Surat Keterangan Pindah Domisili",
    category: "Kependudukan",
    wewenang: true,
    description: "Wewenang desa. Syarat mutasi kepindahan di Dukcapil dengan form F-1.02.",
    eta: "2 hari kerja",
    fields: [
      {
        key: "alamat_tujuan",
        label: "Alamat Tujuan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
      {
        key: "alasan_pindah",
        label: "Alasan Pindah",
        type: "select",
        options: ["Pekerjaan", "Pendidikan", "Keluarga", "Keamanan", "Lainnya"],
        required: true,
      },
      {
        key: "jumlah_pengikut",
        label: "Jumlah Anggota Keluarga yang Pindah",
        type: "number",
        required: true,
      },
      {
        key: "jenis_kepindahan",
        label: "Jenis Kepindahan",
        type: "select",
        options: [
          "Kepindahan dalam satu desa/kelurahan",
          "Kepindahan antar desa/kelurahan",
          "Kepindahan antar kecamatan",
          "Kepindahan antar kabupaten/kota",
          "Kepindahan antar provinsi",
        ],
        required: true,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Form F-1.02 dari Dukcapil", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "475",
    note: "Target DNA: 16 field (dari 26)",
  },

  PENDATANG: {
    code: "PENDATANG",
    name: "Surat Keterangan Pendatang / Numpang KK",
    category: "Kependudukan",
    wewenang: true,
    description: "Wewenang desa. Catat pendatang yang numpang KK. Syarat KK baru.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "asal",
        label: "Asal Pendatang (Desa/Kecamatan/Kabupaten)",
        type: "text",
        required: true,
      },
      {
        key: "alasan_datang",
        label: "Alasan Datang",
        type: "select",
        options: ["Kerja", "Kunjungan", "Menetap", "Lainnya"],
        required: true,
      },
      { key: "lama_tinggal", label: "Lama Tinggal (hari/bulan)", type: "text", required: true },
      {
        key: "nama_pemilik_kk",
        label: "Nama Pemilik KK yang Ditumpangi",
        type: "text",
        required: true,
      },
    ],
    syarat: ["Fotokopi KTP pendatang", "KK baru pemilik", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "475.1",
    note: "Target DNA: 18 field (dari 27)",
  },

  KK_BARU: {
    code: "KK_BARU",
    name: "Surat Keterangan Kepala Keluarga",
    category: "Kependudukan",
    wewenang: true,
    description: "Akses program bantuan (PKH, BST). Untuk warga yang belum punya KK.",
    eta: "2 hari kerja",
    fields: [
      {
        key: "alasan",
        label: "Alasan Belum Punya KK",
        type: "select",
        options: ["KK hilang", "Belum terbit", "Pisah KK", "Lainnya"],
        required: true,
      },
      { key: "jumlah_anggota", label: "Jumlah Anggota Keluarga", type: "number", required: true },
      {
        key: "daftar_anggota",
        label: "Daftar Anggota Keluarga",
        type: "textarea",
        helper: "Nama, NIK, hubungan keluarga",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: [
      "Fotokopi KTP semua anggota",
      "Surat pengantar RT/RW",
      "Keterangan hilang dari kepolisian (jika hilang)",
    ],
    kodeKlasifikasi: "474.5",
  },

  BEDA_NAMA: {
    code: "BEDA_NAMA",
    name: "Surat Keterangan Beda Nama",
    category: "Kependudukan",
    wewenang: true,
    description: "Penyamaan 2 nama berbeda di 2 dokumen.",
    eta: "1 hari kerja",
    fields: [
      { key: "dokumen1", label: "Nama di Dokumen 1", type: "text", required: true },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      {
        key: "jenis_dokumen1",
        label: "Jenis Dokumen 1",
        type: "select",
        options: ["KTP", "KK", "Ijazah", "Akta Kelahiran", "Buku Nikah"],
        required: true,
      },
      { key: "dokumen2", label: "Nama di Dokumen 2", type: "text", required: true },
      {
        key: "jenis_dokumen2",
        label: "Jenis Dokumen 2",
        type: "select",
        options: ["KTP", "KK", "Ijazah", "Akta Kelahiran", "Buku Nikah"],
        required: true,
      },
    ],
    syarat: ["Fotokopi kedua dokumen", "Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "474.3",
    note: "DNA DISINGKAT",
  },

  ALAMAT_SEMENTARA: {
    code: "ALAMAT_SEMENTARA",
    name: "Surat Keterangan Alamat Sementara",
    category: "Kependudukan",
    wewenang: true,
    description: "Untuk warga yang sementara tinggal di luar desanya.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "alamat_sementara",
        label: "Alamat Sementara",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
      {
        key: "alasan",
        label: "Alasan Tinggal Sementara",
        type: "select",
        options: ["Kerja", "Sekolah", "Merantau", "Lainnya"],
        required: true,
      },
      { key: "lama_tinggal", label: "Perkiraan Lama Tinggal", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "475.2",
    note: "DNA DISINGKAT",
  },

  SP_KTP: {
    code: "SP-KTP",
    name: "Surat Pengantar Pembuatan KTP",
    category: "Kependudukan",
    wewenang: true,
    description: "Pengantar pembuatan KTP. Wewenang penuh.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_permohonan",
        label: "Jenis Permohonan",
        type: "select",
        options: ["Baru", "Perpanjangan", "Hilang/Rusak", "Perubahan Data"],
        required: true,
      },
      { key: "alasan", label: "Keterangan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KK", "Pas foto 3x4"],
    kodeKlasifikasi: "465",
    note: "Target DNA: 12 field (dari 22)",
  },

  SP_KK: {
    code: "SP-KK",
    name: "Surat Pengantar Pembuatan KK",
    category: "Kependudukan",
    wewenang: true,
    description: "Pengganti ELIMINASI KK Sementara.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_perubahan",
        label: "Jenis Perubahan",
        type: "select",
        options: ["Penambahan Anggota", "Pengurangan Anggota", "Pisah KK", "KK Baru"],
        required: true,
      },
      { key: "keterangan", label: "Keterangan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["KK lama", "Akta nikah/kelahiran (jika perubahan)"],
    kodeKlasifikasi: "465.2",
    note: "Target DNA: 12 field (dari 22)",
  },

  /* ==================== SOSIAL & EKONOMI (8) ==================== */
  SKTM: {
    code: "SKTM",
    name: "Surat Keterangan Tidak Mampu (SKTM)",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "SURAT PALING PENTING. Akses BPJS PBI, beasiswa, bantuan sosial.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "penghasilan",
        label: "Penghasilan per Bulan (Rp)",
        type: "number",
        required: true,
        autofill: "pendapatan_bulan",
      },
      { key: "tanggungan", label: "Jumlah Tanggungan", type: "number", required: true },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Pengajuan beasiswa KIP-Kuliah",
        required: true,
        colSpan: 2,
      },
      // ✅ ADOPSI OpenSID: ID DTKS untuk verifikasi bantuan sosial
      {
        key: "id_bdt",
        label: "ID BDTPBIDTKS (jika sudah terintegrasi DTKS)",
        type: "text",
        placeholder: "Kosongkan jika belum teregistrasi DTKS",
        colSpan: 2,
      },
      {
        key: "program_bantuan",
        label: "Program Bantuan yang Dituju",
        type: "multiselect",
        options: ["PKH", "BPNT", "PBI JKN (BPJS)", "KIP", "BLSM", "Program Desa", "Lainnya"],
        colSpan: 2,
      },
      {
        key: "no_kartu_bantuan",
        label: "No. Kartu Bantuan (jika sudah memiliki)",
        type: "text",
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Foto rumah (opsional)"],
    kodeKlasifikasi: "474.6",
  },

  SK_PENGHASILAN: {
    code: "SK_PENGHASILAN",
    name: "Surat Keterangan Penghasilan",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Untuk KUR (Kredit Usaha Rakyat), pendaftaran sekolah, dan lainnya.",
    eta: "1 hari kerja",
    fields: [
      // Data pemohon (existing)
      {
        key: "penghasilan",
        label: "Penghasilan per Bulan (Rp)",
        type: "number",
        required: true,
        autofill: "pendapatan_bulan",
      },
      {
        key: "sumber_penghasilan",
        label: "Sumber Penghasilan",
        type: "text",
        required: true,
        autofill: "pekerjaan",
      },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
      // ✅ ADOPSI OpenSID: Data Ayah (untuk pelajar/mahasiswa)
      {
        key: "nama_ayah",
        label: "Nama Lengkap Ayah",
        type: "text",
        required: true,
        // autofill ke nama_bapak — kolom nama_ayah tidak ada di data penduduk
        autofill: "nama_bapak",
      },
      { key: "nik_ayah", label: "NIK Ayah", type: "text", required: true },
      { key: "tanggal_lahir_ayah", label: "Tanggal Lahir Ayah", type: "date" },
      { key: "tempat_lahir_ayah", label: "Tempat Lahir Ayah", type: "text" },
      { key: "pekerjaan_ayah", label: "Pekerjaan Ayah", type: "text" },
      { key: "penghasilan_ayah", label: "Penghasilan Ayah/Bulan (Rp)", type: "text" },
      { key: "alamat_ayah", label: "Alamat Ayah", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data Ibu (untuk pelajar/mahasiswa)
      {
        key: "nama_ibu",
        label: "Nama Lengkap Ibu",
        type: "text",
        required: true,
        autofill: "nama_ibu",
      },
      { key: "nik_ibu", label: "NIK Ibu", type: "text", required: true },
      { key: "tanggal_lahir_ibu", label: "Tanggal Lahir Ibu", type: "date" },
      { key: "tempat_lahir_ibu", label: "Tempat Lahir Ibu", type: "text" },
      { key: "pekerjaan_ibu", label: "Pekerjaan Ibu", type: "text" },
      { key: "penghasilan_ibu", label: "Penghasilan Ibu/Bulan (Rp)", type: "text" },
      { key: "alamat_ibu", label: "Alamat Ibu", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data sekolah (untuk pelajar)
      { key: "nama_sekolah", label: "Nama Sekolah/Perguruan Tinggi", type: "text" },
      { key: "jurusan", label: "Jurusan/Fakultas/Program Studi", type: "text" },
      { key: "kelas_semester", label: "Kelas/Semester", type: "text" },
      { key: "nomor_induk", label: "Nomor Induk Siswa/Mahasiswa", type: "text" },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "300",
    note: "DNA DISINGKAT",
  },

  SK_KEHILANGAN: {
    code: "SK_KEHILANGAN",
    name: "Surat Keterangan Kehilangan",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Pengantar penggantian dokumen/barang hilang. Wewenang desa. Kebutuhan umum.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "barang_hilang",
        label: "Nama Barang/Dokumen yang Hilang",
        type: "text",
        required: true,
      },
      { key: "tempat_hilang", label: "Perkiraan Tempat Kehilangan", type: "text", required: true },
      { key: "waktu_hilang", label: "Perkiraan Waktu Kehilangan", type: "date", required: true },
      { key: "keterangan", label: "Keterangan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "300.1",
    note: "Target DNA: 14 field (dari 24)",
  },

  SP_SKCK: {
    code: "SP-SKCK",
    name: "Surat Pengantar SKCK",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Paling sering diminta untuk lamaran kerja.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Pas foto 4x6 (2 lembar)", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "465.4",
    note: "Target DNA: 17 field (dari 27)",
  },

  SK_KELAKUAN_BAIK: {
    code: "SK_KELAKUAN_BAIK",
    name: "Surat Keterangan Kelakuan Baik",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Kebutuhan lamaran kerja/organisasi.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Untuk persyaratan melamar pekerjaan",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "475.3",
    note: "Disclaimer: Berdasarkan yang kami ketahui",
  },

  SK_TIDAK_PUNYA_KERJA: {
    code: "SK_TIDAK_PUNYA_KERJA",
    name: "Surat Keterangan Tidak Punya Pekerjaan",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Untuk Kartu Prakerja.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "475.4",
  },

  VERIF_DTKS: {
    code: "VERIF-DTKS",
    name: "Surat Pengantar Verifikasi DTKS",
    category: "Sosial & Ekonomi",
    wewenang: true,
    description: "Desa hanya mengecek apakah warga ada di DTKS.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "program_bantuan",
        label: "Program Bantuan yang Dituju",
        type: "select",
        options: ["PKH", "BPNT", "PBI JKN", "Program Lain"],
        required: true,
      },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Formulir verifikasi DTKS"],
    kodeKlasifikasi: "474.7",
    isNew: true,
    note: "PENGGANTI Penerima PKH",
  },

  /* ==================== PERNIKAHAN & KELUARGA (12) ==================== */
  SK_BELUM_MENIKAH: {
    code: "SK_BELUM_MENIKAH",
    name: "Surat Keterangan Belum Menikah",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Syarat utama akta nikah KUA.",
    eta: "1 hari kerja",
    fields: [
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
      { key: "saksi_1", label: "Nama Saksi 1", type: "text", required: true },
      { key: "saksi_2", label: "Nama Saksi 2", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP", "Fotokopi KK", "Materai 10000"],
    kodeKlasifikasi: "451",
    note: "Target DNA: 14 field (dari 24)",
  },

  SK_NIKAH: {
    code: "SK-NIKAH",
    name: "Surat Keterangan Nikah (N-1 s/d N-6)",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "SATUKAN 6 formulir menjadi 1 template dengan switch N-1 sd N-6.",
    eta: "2 hari kerja",
    fields: [
      {
        key: "model_formulir",
        label: "Model Formulir",
        type: "select",
        options: [
          "N-1 (Permohonan)",
          "N-2 (Keterangan)",
          "N-3 (Persetujuan)",
          "N-4 (Pernyataan)",
          "N-5 (Isian Data)",
          "N-6 (Rekomendasi)",
        ],
        required: true,
      },
      { key: "nama_calon", label: "Nama Calon Pasangan", type: "text", required: true },
      { key: "nik_calon", label: "NIK Calon Pasangan", type: "text", required: true },
      { key: "tanggal_nikah", label: "Rencana Tanggal Nikah", type: "date", required: true },
      { key: "tempat_nikah", label: "Tempat Akad", type: "text", required: true },
      // ✅ ADOPSI OpenSID: Data tambahan untuk KUA
      {
        key: "binti",
        label: "Nama Binti (Nama gadis ibu kandung)",
        type: "text",
        placeholder: "Contoh: Siti Aminah",
      },
      { key: "nama_camat", label: "Nama Camat", type: "text" },
      { key: "dusun", label: "Dusun", type: "text" },
      { key: "rw", label: "RW", type: "text" },
    ],
    syarat: ["Fotokopi KTP & KK", "Akta kelahiran", "Pas foto 2x3 & 4x6", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "477",
    note: "Target DNA: 22 field (dari 35)",
  },

  SK_NIKAH_NONMUSLIM: {
    code: "SK_NIKAH_NONMUSLIM",
    name: "Surat Keterangan Nikah Non-Muslim",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Non-muslim yang menikah di Catatan Sipil.",
    eta: "2 hari kerja",
    fields: [
      { key: "nama_calon", label: "Nama Calon Pasangan", type: "text", required: true },
      { key: "nik_calon", label: "NIK Calon Pasangan", type: "text", required: true },
      { key: "tanggal_nikah", label: "Rencana Tanggal Nikah", type: "date", required: true },
      { key: "tempat_nikah", label: "Tempat Pencatatan", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Akta kelahiran", "Pas foto 2x3 & 4x6"],
    kodeKlasifikasi: "477.1",
  },

  SK_JANDA: {
    code: "SK_JANDA",
    name: "Surat Keterangan Status Janda",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "DNA DISINGKAT - cukup NIK + Alasan + Tanggal.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "alasan_janda",
        label: "Alasan Menjadi Janda",
        type: "select",
        options: ["Cerai Hidup", "Ditinggal Mati"],
        required: true,
      },
      { key: "tanggal_status", label: "Tanggal Menjadi Janda", type: "date", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat cerai / akta kematian"],
    kodeKlasifikasi: "477.2",
    note: "Target DNA: 10 field (dari 25)",
  },

  SK_DUDA: {
    code: "SK_DUDA",
    name: "Surat Keterangan Status Duda",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "DNA DISINGKAT - cukup NIK + Alasan + Tanggal.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "alasan_duda",
        label: "Alasan Menjadi Duda",
        type: "select",
        options: ["Cerai Hidup", "Ditinggal Mati"],
        required: true,
      },
      { key: "tanggal_status", label: "Tanggal Menjadi Duda", type: "date", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat cerai / akta kematian"],
    kodeKlasifikasi: "474.8",
    note: "Target DNA: 10 field (dari 24)",
  },

  SK_HUBUNGAN_KELUARGA: {
    code: "SK_HUBUNGAN_KELUARGA",
    name: "Surat Keterangan Hubungan Keluarga",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Klaim asuransi.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "nama_anggota_keluarga",
        label: "Nama Anggota Keluarga",
        type: "text",
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      {
        key: "hubungan",
        label: "Hubungan Keluarga",
        type: "select",
        options: ["Orang Tua", "Anak", "Suami/Istri", "Saudara Kandung"],
        required: true,
      },
    ],
    syarat: ["Fotokopi KTP & KK kedua belah pihak", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "474.9",
  },

  SK_AHLI_WARIS: {
    code: "SK_AHLI_WARIS",
    name: "Surat Keterangan Ahli Waris",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Klaim tabungan.",
    eta: "2 hari kerja",
    fields: [
      { key: "nama_alm", label: "Nama Almarhum/ah", type: "text", required: true },
      { key: "tgl_meninggal", label: "Tanggal Meninggal", type: "date", required: true },
      {
        key: "daftar_waris",
        label: "Daftar Ahli Waris",
        type: "textarea",
        helper: "Satu per baris: Nama, NIK, hubungan",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Akta kematian", "KK & KTP ahli waris", "Materai 10000"],
    kodeKlasifikasi: "451.1",
  },

  DISPENSA_NIKAH: {
    code: "DISPENSA_NIKAH",
    name: "Surat Dispensasi Nikah (Pengantar PA)",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Dispensasi nikah di bawah umur. Pengantar ke Pengadilan Agama.",
    eta: "3 hari kerja",
    fields: [
      {
        key: "alasan",
        label: "Alasan Dispensasi",
        type: "select",
        options: ["Hamil di luar nikah", "Dukungan orang tua", "Alasan mendesak lainnya"],
        required: true,
      },
      { key: "keterangan", label: "Keterangan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: [
      "Fotokopi KTP & KK kedua calon",
      "Surat pengantar RT/RW",
      "Surat keterangan hamil (jika ada)",
    ],
    kodeKlasifikasi: "451.2",
    note: "Target DNA: 14 field (dari 26)",
  },

  WALI_NIKAH: {
    code: "WALI_NIKAH",
    name: "Surat Keterangan Wali Nikah Hakim",
    category: "Pernikahan & Keluarga",
    wewenang: true,
    description: "Wali tidak ada/berhalangan. Dasar penunjukan wali hakim.",
    eta: "2 hari kerja",
    fields: [
      {
        key: "alasan_tidak_ada_wali",
        label: "Alasan Tidak Ada Wali",
        type: "select",
        options: [
          "Wali meninggal",
          "Wali tidak diketahui",
          "Wali berhalangan",
          "Wali tidak bersedia",
        ],
        required: true,
      },
      { key: "keterangan", label: "Keterangan", type: "textarea", colSpan: 2 },
    ],
    syarat: [
      "Fotokopi KTP & KK",
      "Surat keterangan tidak ada wali dari RT/RW",
      "Surat keterangan kematian wali (jika ada)",
    ],
    kodeKlasifikasi: "510",
    note: "Target DNA: 14 field (dari 25)",
  },

  /* ==================== USAHA & EKONOMI (5) ==================== */
  SKU: {
    code: "SKU",
    name: "Surat Keterangan Usaha (SKU)",
    category: "Usaha & Ekonomi",
    wewenang: true,
    description: "SURAT PALING PENTING kategori usaha. Syarat NIB.",
    eta: "2 hari kerja",
    fields: [
      { key: "nama_usaha", label: "Nama Usaha", type: "text", required: true },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      {
        key: "jenis_usaha",
        label: "Jenis Usaha",
        type: "select",
        options: ["Perdagangan", "Jasa", "Pertanian", "Industri Rumahan", "Lainnya"],
        required: true,
      },
      {
        key: "alamat_usaha",
        label: "Alamat Usaha",
        type: "textarea",
        required: true,
        colSpan: 2,
        autofill: "alamat",
      },
      { key: "tahun_berdiri", label: "Tahun Berdiri", type: "number", required: true },
      { key: "jumlah_karyawan", label: "Jumlah Karyawan", type: "number", placeholder: "0" },
    ],
    syarat: ["Fotokopi KTP", "Foto tempat usaha", "Pengantar RT/RW"],
    kodeKlasifikasi: "140",
  },

  IZIN_KERAMAIAN: {
    code: "IZIN_KERAMAIAN",
    name: "Surat Keterangan Izin Keramaian",
    category: "Usaha & Ekonomi",
    wewenang: true,
    description: "Keramaian/hajatan.",
    eta: "2 hari kerja",
    fields: [
      { key: "nama_acara", label: "Nama Acara", type: "text", required: true },
      { key: "tgl_mulai", label: "Tanggal Mulai", type: "date", required: true },
      { key: "tgl_selesai", label: "Tanggal Selesai", type: "date", required: true },
      { key: "lokasi", label: "Lokasi Acara", type: "text", required: true, colSpan: 2 },
      {
        key: "jumlah_tamu",
        label: "Perkiraan Jumlah Tamu",
        type: "text",
        placeholder: "Khalayak umum / kira-kira jumlah",
        required: true,
      },
      { key: "keterangan", label: "Keterangan Tambahan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Proposal acara", "Pengantar RT/RW", "Persetujuan tetangga"],
    kodeKlasifikasi: "524",
    note: "Target DNA: 15 field (dari 27)",
  },

  SK_PETERNAK: {
    code: "SK_PETERNAK",
    name: "Surat Keterangan Peternak",
    category: "Usaha & Ekonomi",
    wewenang: true,
    description: "Kartu ternak.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_MEDIUM,
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "530",
  },

  SK_PENGRAJIN: {
    code: "SK_PENGRAJIN",
    name: "Surat Keterangan Pengrajin / Seniman",
    category: "Usaha & Ekonomi",
    wewenang: true,
    description: "Program Ekraf.",
    eta: "1 hari kerja",
    fields: [
      { key: "jenis_kerajinan", label: "Jenis Kerajinan/Seni", type: "text", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Portofolio (opsional)"],
    kodeKlasifikasi: "510.2",
  },

  SK_PEDAGANG_PASAR: {
    code: "SK_PEDAGANG_PASAR",
    name: "Surat Keterangan Pedagang Pasar",
    category: "Usaha & Ekonomi",
    wewenang: true,
    description: "SIUP mikro.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_pasar", label: "Nama Pasar", type: "text", required: true },
      { key: "jenis_dagangan", label: "Jenis Dagangan", type: "text", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Surat keterangan dari pengelola pasar"],
    kodeKlasifikasi: "30.1",
  },

  /* ==================== TANAH & PROPERTI (10) ==================== */
  SK_TANAH_MILIK: {
    code: "SK_TANAH_MILIK",
    name: "Surat Keterangan Kepemilikan Tanah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "KETERANGAN BUKAN bukti hukum. Untuk legal -> BPN.",
    eta: "2 hari kerja",
    fields: [
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      // ✅ ADOPSI OpenSID: Data sertifikat & batas lengkap
      {
        key: "atas_nama_tanah",
        label: "Atas Nama (Nama di Sertifikat)",
        type: "text",
        required: true,
      },
      { key: "nomor_sertifikat", label: "Nomor Sertifikat/Hak", type: "text" },
      {
        key: "jenis_hak",
        label: "Jenis Hak Tanah",
        type: "select",
        options: ["Hak Milik", "Hak Guna Bangunan", "Hak Pakai", "Hak Sewa", "Lainnya"],
      },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "batas_utara", label: "Batas Utara", type: "text" },
      { key: "batas_timur", label: "Batas Timur", type: "text" },
      { key: "batas_selatan", label: "Batas Selatan", type: "text" },
      { key: "batas_barat", label: "Batas Barat", type: "text" },
      {
        key: "bukti_kepemilikan",
        label: "Bukti Kepemilikan",
        type: "select",
        options: ["Sertifikat", "Akta Jual Beli", "Girik", "Letter C", "SPPT", "Lainnya"],
      },
      {
        key: "batas",
        label: "Keterangan Batas (rangkuman)",
        type: "textarea",
        helper: "Utara, Selatan, Timur, Barat",
        colSpan: 2,
      },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Fotokopi Sertifikat (jika ada)"],
    kodeKlasifikasi: "30.2",
  },

  SK_TANAH_TIDAK_SENGKETA: {
    code: "SK_TANAH_TIDAK_SENGKETA",
    name: "Surat Keterangan Tidak Sengketa Tanah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "Transaksi tanah.",
    eta: "2 hari kerja",
    fields: [
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "batas", label: "Batas-batas Tanah", type: "textarea", colSpan: 2 },
      { key: "keterangan", label: "Keterangan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "30.3",
    note: "Disclaimer: Berdasarkan yang kami ketahui",
  },

  SK_HIBAH_TANAH: {
    code: "SK_HIBAH_TANAH",
    name: "Surat Keterangan Hibah Tanah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "Tahap awal proses hibah di PPAT.",
    eta: "2 hari kerja",
    fields: [
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "penerima_hibah", label: "Nama Penerima Hibah", type: "text", required: true },
      { key: "hubungan", label: "Hubungan dengan Pemberi Hibah", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK kedua belah pihak", "Pengantar RT/RW"],
    kodeKlasifikasi: "30.4",
    note: "Target DNA: 16 field (dari 29)",
  },

  SK_JUAL_BELI_TANAH: {
    code: "SK_JUAL_BELI_TANAH",
    name: "Surat Keterangan Jual Beli Tanah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "Tahap awal AJB di PPAT. SANGAT umum dibutuhkan.",
    eta: "2 hari kerja",
    fields: [
      // Data tanah (existing)
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "harga", label: "Harga Transaksi (Rp)", type: "text", required: true },
      // ✅ ADOPSI OpenSID: Data penjual lengkap
      { key: "penjual", label: "Nama Penjual", type: "text", required: true },
      { key: "nik_penjual", label: "NIK Penjual", type: "text", required: true },
      { key: "alamat_penjual", label: "Alamat Penjual", type: "textarea" },
      { key: "pekerjaan_penjual", label: "Pekerjaan Penjual", type: "text" },
      // ✅ ADOPSI OpenSID: Data pembeli lengkap (PPAT minta)
      { key: "pembeli", label: "Nama Pembeli", type: "text", required: true },
      { key: "nik_pembeli", label: "NIK Pembeli", type: "text", required: true },
      { key: "tanggal_lahir_pembeli", label: "Tanggal Lahir Pembeli", type: "date" },
      { key: "tempat_lahir_pembeli", label: "Tempat Lahir Pembeli", type: "text" },
      { key: "pekerjaan_pembeli", label: "Pekerjaan Pembeli", type: "text" },
      { key: "alamat_pembeli", label: "Alamat Lengkap Pembeli", type: "textarea" },
      // ✅ ADOPSI OpenSID: Sertifikat info
      { key: "nomor_sertifikat", label: "Nomor Sertifikat tanah", type: "text" },
    ],
    syarat: ["Fotokopi KTP & KK kedua belah pihak", "Pengantar RT/RW"],
    kodeKlasifikasi: "650",
  },

  SK_RUMAH_MILIK: {
    code: "SK_RUMAH_MILIK",
    name: "Surat Keterangan Kepemilikan Rumah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "IMB/PBG.",
    eta: "1 hari kerja",
    fields: [
      { key: "lokasi_rumah", label: "Lokasi Rumah", type: "textarea", required: true, colSpan: 2 },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      { key: "luas_bangunan", label: "Luas Bangunan (m²)", type: "text", required: true },
      { key: "tahun_bangun", label: "Tahun Dibangun", type: "number", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "650.1",
  },

  SK_BELUM_PUNYA_RUMAH: {
    code: "SK_BELUM_PUNYA_RUMAH",
    name: "Surat Keterangan Belum Memiliki Rumah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "BSPS.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Surat pernyataan tidak punya rumah"],
    kodeKlasifikasi: "451.3",
  },

  SK_TANAH_WAKAF: {
    code: "SK_TANAH_WAKAF",
    name: "Surat Keterangan Tanah Wakaf",
    category: "Tanah & Properti",
    wewenang: true,
    description: "Pendaftaran di BWI dan Kanwil Depag.",
    eta: "2 hari kerja",
    fields: [
      {
        key: "lokasi_tanah",
        label: "Lokasi Tanah Wakaf",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "nadzir_wakaf", label: "Nama Nadzir Wakaf", type: "text", required: true },
      { key: "tujuan_wakaf", label: "Tujuan Wakaf", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Akta ikrar wakaf (jika ada)"],
    kodeKlasifikasi: "420",
    note: "Target DNA: 14 field (dari 26)",
  },

  /* ==================== PENDIDIKAN (4) ==================== */
  SK_BEASISWA: {
    code: "SK_BEASISWA",
    name: "Surat Keterangan untuk Beasiswa",
    category: "Pendidikan",
    wewenang: true,
    description: "Akses beasiswa.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_institusi", label: "Nama Institusi Pendidikan", type: "text", required: true },
      { key: "program_beasiswa", label: "Program Beasiswa", type: "text", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat keterangan aktif kuliah/sekolah"],
    kodeKlasifikasi: "420.2",
    note: "Target DNA: 14 field (dari 28)",
  },

  SK_PENELITIAN: {
    code: "SK_PENELITIAN",
    name: "Surat Keterangan Penelitian / KKN / PKL",
    category: "Pendidikan",
    wewenang: true,
    description: "KKN tradisi akademik Indonesia.",
    eta: "2 hari kerja",
    fields: [
      { key: "nama_institusi", label: "Nama Institusi Pendidikan", type: "text", required: true },
      { key: "judul_kegiatan", label: "Judul Kegiatan/Penelitian", type: "text", required: true },
      { key: "lokasi_penelitian", label: "Lokasi Penelitian/KKN", type: "textarea", colSpan: 2 },
      {
        key: "lama_kegiatan",
        label: "Lama Kegiatan",
        type: "text",
        placeholder: "Contoh: 1 bulan",
        required: true,
      },
      { key: "jumlah_peserta", label: "Jumlah Peserta", type: "number", required: true },
    ],
    syarat: ["Proposal kegiatan", "Surat pengantar dari kampus"],
    kodeKlasifikasi: "420.3",
    note: "Target DNA: 14 field (dari 25)",
  },

  SK_PUTUS_SEKOLAH: {
    code: "SK_PUTUS_SEKOLAH",
    name: "Surat Keterangan Putus Sekolah",
    category: "Pendidikan",
    wewenang: true,
    description: "Akses program kesetaraan dan pelatihan.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "alasan",
        label: "Alasan Putus Sekolah",
        type: "select",
        options: ["Ekonomi", "Bekerja", "Lainnya"],
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Ijazah terakhir (jika ada)"],
    kodeKlasifikasi: "420.5",
    note: "Target DNA: 12 field (dari 25)",
  },

  SK_AKTIF_SEKOLAH: {
    code: "SK_AKTIF_SEKOLAH",
    name: "Surat Aktif Sekolah (PIP/KPS)",
    category: "Pendidikan",
    wewenang: true,
    description: "Pencairan PIP.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_sekolah", label: "Nama Sekolah", type: "text", required: true },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      {
        key: "jenjang",
        label: "Jenjang",
        type: "select",
        options: ["SD", "SMP", "SMA", "SMK", "Ponpes"],
        required: true,
      },
    ],
    syarat: ["Fotokopi KTP & KK orang tua", "Surat keterangan aktif sekolah"],
    kodeKlasifikasi: "461",
    note: "Target DNA: 13 field (dari 25)",
  },

  /* ==================== KESEHATAN & KHUSUS (4) ==================== */
  SK_DISABILITAS: {
    code: "SK_DISABILITAS",
    name: "Surat Keterangan Penyandang Disabilitas",
    category: "Kesehatan & Khusus",
    wewenang: true,
    description: "Akses program ATENSI.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_disabilitas",
        label: "Jenis Disabilitas",
        type: "select",
        options: [
          "Tunanetra",
          "Tunarungu",
          "Tunadaksa",
          "Tunagrahita",
          "Disabilitas Netra",
          "Disabilitas Rungu",
          "Disabilitas Fisik",
          "Lainnya",
        ],
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat keterangan rumah sakit"],
    kodeKlasifikasi: "463.1",
  },

  SK_LANSIA: {
    code: "SK_LANSIA",
    name: "Surat Keterangan Lansia",
    category: "Kesehatan & Khusus",
    wewenang: true,
    description: "Bantuan lansia.",
    eta: "1 hari kerja",
    fields: [
      { key: "umur", label: "Umur (tahun)", type: "number", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "463.2",
  },

  SK_YATIM_PIATU: {
    code: "SK_YATIM_PIATU",
    name: "Surat Keterangan Anak Yatim / Piatu",
    category: "Kesehatan & Khusus",
    wewenang: true,
    description: "Beasiswa yatim.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "status_yatim",
        label: "Status",
        type: "select",
        options: ["Yatim", "Piatu", "Yatim Piatu"],
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Akta kematian orang tua"],
    kodeKlasifikasi: "440.1",
  },

  SK_HAMIL: {
    code: "SK_HAMIL",
    name: "Surat Keterangan Hamil / Ibu Melahirkan",
    category: "Kesehatan & Khusus",
    wewenang: true,
    description: "ANC.",
    eta: "1 hari kerja",
    fields: [
      { key: "usia_kandungan", label: "Usia Kandungan (bulan)", type: "number", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat keterangan bidan/dokter"],
    kodeKlasifikasi: "520",
  },

  /* ==================== PERTANIAN & LINGKUNGAN (5) ==================== */
  SK_PETANI: {
    code: "SK_PETANI",
    name: "Surat Keterangan Petani",
    category: "Pertanian & Lingkungan",
    wewenang: true,
    description: "Kartu tani.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_MEDIUM,
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "523",
  },

  SK_NELAYAN: {
    code: "SK_NELAYAN",
    name: "Surat Keterangan Nelayan",
    category: "Pertanian & Lingkungan",
    wewenang: true,
    description: "Kartu nelayan.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_MEDIUM,
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "360",
  },

  SK_BENCANA: {
    code: "SK_BENCANA",
    name: "Surat Keterangan Dampak Bencana",
    category: "Pertanian & Lingkungan",
    wewenang: true,
    description: "Klaim asuransi.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_bencana",
        label: "Jenis Bencana",
        type: "select",
        options: [
          "Banjir",
          "Tanah Longsor",
          "Kebakaran",
          "Angin Puting Beliung",
          "Gempa Bumi",
          "Lainnya",
        ],
        required: true,
      },
      { key: "tanggal_kejadian", label: "Tanggal Kejadian", type: "date", required: true },
      { key: "kerugian", label: "Keterangan Kerugian", type: "textarea", colSpan: 2 },
    ],
    syarat: [
      "Fotokopi KTP & KK",
      "Dokumentasi kejadian (foto/video)",
      "Surat keterangan dari BPBD",
    ],
    kodeKlasifikasi: "520.2",
  },

  SK_PENGGUNAAN_LAHAN: {
    code: "SK_PENGGUNAAN_LAHAN",
    name: "Surat Keterangan Penggunaan Lahan",
    category: "Pertanian & Lingkungan",
    wewenang: true,
    description: "Pengajuan perubahan peruntukan.",
    eta: "2 hari kerja",
    fields: [
      { key: "lokasi_lahan", label: "Lokasi Lahan", type: "textarea", required: true, colSpan: 2 },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      { key: "luas_lahan", label: "Luas Lahan (m²)", type: "text", required: true },
      { key: "peruntukan_sekarang", label: "Peruntukan Sekarang", type: "text", required: true },
      { key: "peruntukan_usulan", label: "Peruntukan Usulan", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Peta lokasi"],
    kodeKlasifikasi: "520.3",
    note: "Target DNA: 13 field (dari 25)",
  },

  SK_KELOMPOK_TANI: {
    code: "SK_KELOMPOK_TANI",
    name: "Surat Keterangan Kelompok Tani / Nelayan",
    category: "Pertanian & Lingkungan",
    wewenang: true,
    description: "Akses program Gapoktan.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_kelompok", label: "Nama Kelompok", type: "text", required: true },
      { key: "jumlah_anggota", label: "Jumlah Anggota", type: "number", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP ketua & anggota", "SK Kelompok", "Pengantar RT/RW"],
    kodeKlasifikasi: "140.1",
    note: "Target DNA: 14 field (dari 26)",
  },

  /* ==================== SURAT DINAS (3) ==================== */
  SP_INSTANSI: {
    code: "SP-INSTANSI",
    name: "Surat Pengantar ke Instansi Lain",
    category: "Surat Dinas",
    wewenang: true,
    description: "Safety net untuk keperluan yang tidak tercakup surat spesifik.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_instansi", label: "Nama Instansi Tujuan", type: "text", required: true },
      { key: "alamat_instansi", label: "Alamat Instansi", type: "text", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "140.2",
    note: "Target DNA: 12 field (dari 21)",
  },

  SURAT_BANTUAN: {
    code: "SURAT_BANTUAN",
    name: "Surat Permohonan Bantuan",
    category: "Surat Dinas",
    wewenang: true,
    description: "Warga meminta bantuan ke desa.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_bantuan",
        label: "Jenis Bantuan",
        type: "select",
        options: [
          "Bantuan Sosial",
          "Bantuan Pembangunan",
          "Bantuan Kesehatan",
          "Bantuan Pendidikan",
          "Lainnya",
        ],
        required: true,
      },
      {
        key: "alasan",
        label: "Alasan Meminta Bantuan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "140.3",
    note: "Target DNA: 12 field (dari 23)",
  },

  SURAT_REKOMENDASI: {
    code: "SURAT_REKOMENDASI",
    name: "Surat Rekomendasi",
    category: "Surat Dinas",
    wewenang: true,
    description: "Rekomendasi keinstansi.",
    eta: "1 hari kerja",
    fields: [
      { key: "instansi_tujuan", label: "Instansi Tujuan", type: "text", required: true },
      {
        key: "isi_rekomendasi",
        label: "Isi Rekomendasi",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "474.10",
    note: "Target DNA: 12 field (dari 23)",
  },

  /* ==================== SURAT UMUM (28) ==================== */
  SPTJM: {
    code: "SPTJM",
    name: "Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Saat dokumen primer tidak ada. WAJIB MATERAI.",
    eta: "1 hari kerja",
    fields: [
      { key: "judul_pernyataan", label: "Judul Pernyataan", type: "text", required: true },
      {
        key: "isi_pernyataan",
        label: "Isi Pernyataan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP & KK", "Materai 10000"],
    kodeKlasifikasi: "474.11",
    note: "Target DNA: 12 field (dari 23)",
  },

  SURAT_KUASA: {
    code: "SURAT_KUASA",
    name: "Surat Kuasa",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Instrumen hukum umum. Wewenang cukup.",
    eta: "1 hari kerja",
    fields: [
      { key: "penerima_kuasa", label: "Nama Penerima Kuasa", type: "text", required: true },
      { key: "nik_penerima_kuasa", label: "NIK Penerima Kuasa", type: "text", required: true },
      {
        key: "wewenang",
        label: "Wewenang yang Diberikan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP pemberi & penerima kuasa", "Materai 10000"],
    kodeKlasifikasi: "474.12",
    note: "Target DNA: 12 field (dari 24)",
  },

  SK_WNI_KETURUNAN: {
    code: "SK_WNI_KETURUNAN",
    name: "Surat Keterangan WNI Keturunan",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Keperluan kependudukan dan hukum.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Dokumen keturunan (jika ada)"],
    kodeKlasifikasi: "180",
    note: "Target DNA: 12 field (dari 22)",
  },

  SK_HAJI: {
    code: "SK_HAJI",
    name: "Surat Keterangan Naik Haji / Umrah",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Kementerian Agama kadang minta.",
    eta: "1 hari kerja",
    fields: [
      { key: "tahun", label: "Tahun Rencana Berangkat", type: "number", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Paspun (jika ada)", "Surat pendaftaran haji (jika ada)"],
    kodeKlasifikasi: "471",
    note: "Target DNA: 12 field (dari 26)",
  },

  SK_PASPOR: {
    code: "SK_PASPOR",
    name: "Surat Keterangan untuk Paspor",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Imigrasi kadang minta.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Kartu Keluarga"],
    kodeKlasifikasi: "456",
    note: "Target DNA: 12 field (dari 24)",
  },

  SK_TKI: {
    code: "SK_TKI",
    name: "Surat Keterangan Calon TKI / PMI",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Syarat BP2MI dan Disnaker.",
    eta: "2 hari kerja",
    fields: [
      { key: "negara_tujuan", label: "Negara Tujuan", type: "text", required: true },
      { key: "jenis_pekerjaan", label: "Jenis Pekerjaan", type: "text", required: true },
      { key: "nama_pt", label: "Nama PT/PJTKI", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Paspor", "Kontrak kerja (jika ada)"],
    kodeKlasifikasi: "471.1",
    note: "Target DNA: 14 field (dari 27)",
  },

  SP_PTSL: {
    code: "SP-PTSL",
    name: "Surat Pengantar PTSL",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PTSL sering dilakukan BPN.",
    eta: "1 hari kerja",
    fields: [
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "471.2",
    note: "Target DNA: 13 field (dari 26)",
  },

  SK_ORGANISASI: {
    code: "SK_ORGANISASI",
    name: "Surat Keterangan Keaktifan Organisasi",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Administrasi dan kegiatan resmi.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Surat keterangan organisasi"],
    kodeKlasifikasi: "30.9",
    note: "Target DNA: 12 field (dari 25)",
  },

  SK_TIDAK_DI_DESA: {
    code: "SK_TIDAK_DI_DESA",
    name: "Surat Keterangan Tidak Berada di Desa",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Alibi.",
    eta: "1 hari kerja",
    fields: [
      {
        key: "alasan",
        label: "Alasan Tidak Berada di Desa",
        type: "select",
        options: ["Merantau", "Sekolah", "Kerja", "Lainnya"],
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan pengajuan surat ini...",
        required: true,
        colSpan: 2,
      },
      { key: "lokasi_sekarang", label: "Lokasi Sekarang", type: "text", required: true },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "220",
  },

  /* ==================== PENGANTAR BARU (7 surat pengganti non-wewenang) ==================== */
  SP_AKTA_KELAHIRAN: {
    code: "SP-AKTA-KELAHIRAN",
    name: "Surat Pengantar Penerbitan Akta Kelahiran",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description:
      "PENGGANTI Surat Keterangan Kelahiran (bukan wewenang). Surat pengantar ke Dukcapil.",
    eta: "1 hari kerja",
    fields: [
      // Data bayi (existing)
      { key: "nama_bayi", label: "Nama Bayi", type: "text", required: true },
      { key: "tanggal_lahir", label: "Tanggal Lahir", type: "date", required: true },
      { key: "tempat_lahir", label: "Tempat Lahir", type: "text", required: true },
      {
        key: "jenis_kelamin_bayi",
        label: "Jenis Kelamin Bayi",
        type: "select",
        options: ["Laki-Laki", "Perempuan"],
        required: true,
      },
      { key: "nama_ibu", label: "Nama Lengkap Ibu", type: "text", required: true },
      { key: "nama_ayah", label: "Nama Lengkap Ayah", type: "text", required: true },
      // ✅ ADOPSI OpenSID: Data Ayah lengkap
      { key: "nik_ayah", label: "NIK Ayah", type: "text", required: true },
      { key: "tempat_lahir_ayah", label: "Tempat Lahir Ayah", type: "text", required: true },
      { key: "tanggal_lahir_ayah", label: "Tanggal Lahir Ayah", type: "date", required: true },
      {
        key: "kewarganegaraan_ayah",
        label: "Kewarganegaraan Ayah",
        type: "text",
        default: "Indonesia",
      },
      { key: "pekerjaan_ayah", label: "Pekerjaan Ayah", type: "text" },
      { key: "alamat_ayah", label: "Alamat Ayah", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data Ibu lengkap
      { key: "nik_ibu", label: "NIK Ibu", type: "text", required: true },
      { key: "tempat_lahir_ibu", label: "Tempat Lahir Ibu", type: "text", required: true },
      { key: "tanggal_lahir_ibu", label: "Tanggal Lahir Ibu", type: "date", required: true },
      {
        key: "kewarganegaraan_ibu",
        label: "Kewarganegaraan Ibu",
        type: "text",
        default: "Indonesia",
      },
      { key: "pekerjaan_ibu", label: "Pekerjaan Ibu", type: "text" },
      { key: "alamat_ibu", label: "Alamat Ibu", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data Pelapor
      { key: "nama_pelapor", label: "Nama Pelapor", type: "text", required: true },
      { key: "nik_pelapor", label: "NIK Pelapor", type: "text", required: true },
      {
        key: "hubungan_pelapor",
        label: "Hubungan dengan Bayi",
        type: "select",
        options: ["Ayah", "Ibu", "Kakek", "Nenek", "Saudara", "Lainnya"],
        required: true,
      },
      { key: "alamat_pelapor", label: "Alamat Pelapor", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data Saksi
      { key: "nama_saksi_1", label: "Nama Saksi 1", type: "text", required: true },
      { key: "nik_saksi_1", label: "NIK Saksi 1", type: "text", required: true },
      { key: "alamat_saksi_1", label: "Alamat Saksi 1", type: "textarea" },
      { key: "nama_saksi_2", label: "Nama Saksi 2", type: "text", required: true },
      { key: "nik_saksi_2", label: "NIK Saksi 2", type: "text", required: true },
      { key: "alamat_saksi_2", label: "Alamat Saksi 2", type: "textarea" },
    ],
    syarat: ["Surat Keterangan Bidan/RS", "Fotokopi KTP & KK orang tua"],
    kodeKlasifikasi: "475.5",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_AKTA_KEMATIAN: {
    code: "SP-AKTA-KEMATIAN",
    name: "Surat Pengantar Penerbitan Akta Kematian",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description:
      "PENGGANTI Surat Keterangan Kematian (bukan wewenang). Surat pengantar ke Dukcapil.",
    eta: "1 hari kerja",
    fields: [
      // Data jenazah (existing)
      { key: "nama_jenazah", label: "Nama Jenazah", type: "text", required: true },
      { key: "tanggal_meninggal", label: "Tanggal Meninggal", type: "date", required: true },
      { key: "tempat_meninggal", label: "Tempat Meninggal", type: "text", required: true },
      { key: "penyebab", label: "Penyebab Kematian", type: "textarea", required: true },
      // ✅ ADOPSI OpenSID: Data Pelapor lengkap
      { key: "nama_pelapor", label: "Nama Pelapor", type: "text", required: true },
      { key: "nik_pelapor", label: "NIK Pelapor", type: "text", required: true },
      {
        key: "hubungan_pelapor",
        label: "Hubungan dengan Jenazah",
        type: "select",
        options: ["Suami/Istri", "Anak", "Orang Tua", "Saudara", "Lainnya"],
        required: true,
      },
      { key: "alamat_pelapor", label: "Alamat Pelapor", type: "textarea" },
      // ✅ ADOPSI OpenSID: Data Saksi
      { key: "nama_saksi", label: "Nama Saksi", type: "text", required: true },
      { key: "nik_saksi", label: "NIK Saksi", type: "text", required: true },
      { key: "alamat_saksi", label: "Alamat Saksi", type: "textarea" },
    ],
    syarat: ["Surat Keterangan RS/Bidan", "Fotokopi KTP & KK pelapor"],
    kodeKlasifikasi: "474.20",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_AKTA_LAHIR: {
    code: "SP-AKTA-LAHIR",
    name: "Surat Pengantar Penerbitan Akta Lahir",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Belum Ada Akta Lahir (bukan wewenang).",
    eta: "1 hari kerja",
    fields: [
      { key: "keperluan", label: "Keperluan", type: "textarea", required: true, colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Surat keterangan tidak ada akta dari Dukcapil"],
    kodeKlasifikasi: "474.21",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_IZIN_REKLAME: {
    code: "SP-IZIN-REKLAME",
    name: "Surat Pengantar Izin Reklame",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description:
      "PENGGANTI Surat Izin Reklame (bukan wewenang). Surat pengantar ke Dinas Perizinan.",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Desain reklame"],
    kodeKlasifikasi: "474.22",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  /* ==================== TAMBAHAN DARI OpenSID (3 Surat) ==================== */

  SK_HARGA_TANAH: {
    code: "SK_HARGA_TANAH",
    name: "Surat Keterangan Harga Tanah",
    category: "Tanah & Properti",
    wewenang: true,
    description: "Keterangan harga tanah untuk transaksi, patokan NJOP, atau pengajuan KPR.",
    eta: "1 hari kerja",
    fields: [
      // ✅ ADOPSI OpenSID: field lengkap untuk appraisal tanah
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "luas_bangunan", label: "Luas Bangunan (m²)", type: "text" },
      { key: "nama_sertifikat", label: "Atas Nama Sertifikat", type: "text" },
      { key: "nomor_sertifikat", label: "Nomor Sertifikat", type: "text" },
      { key: "harga_tanah", label: "Harga Tanah/m² (Rp)", type: "text", required: true },
      { key: "harga_bangunan", label: "Harga Bangunan/m² (Rp)", type: "text" },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Transaksi AJB, Pengajuan KPR, Patokan NJOP...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi Sertifikat/Girik", "Pengantar RT/RW"],
    kodeKlasifikasi: "845",
  },

  SK_LAHIR_MATI: {
    code: "SK_LAHIR_MATI",
    name: "Surat Keterangan Lahir Mati",
    category: "Kesehatan & Khusus",
    wewenang: true,
    description: "Keterangan lahir mati untuk klaim asuransi atau proses administrasi.",
    eta: "1 hari kerja",
    fields: [
      // ✅ ADOPSI OpenSID: field dari template F-2.30
      { key: "nama_ibu", label: "Nama Lengkap Ibu", type: "text", required: true },
      { key: "tanggal_kelahiran", label: "Tanggal", type: "date", required: true },
      { key: "hari", label: "Hari", type: "text" },
      { key: "jam", label: "Jam Lahir", type: "text" },
      { key: "tempat_mati", label: "Tempat Meninggal/Janin", type: "text", required: true },
      { key: "lama_kandungan", label: "Lama Kandungan (bulan)", type: "text" },
      {
        key: "jenis_kelamin_janin",
        label: "Jenis Kelamin Janin",
        type: "select",
        options: ["Laki-Laki", "Perempuan", "Tidak Diketahui"],
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Klaim asuransi jiwa, proses adm. kematian...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Surat keterangan bidan/dokter/RS", "Fotokopi KTP ibu"],
    kodeKlasifikasi: "S-22",
  },

  SK_IZIN_ORANG_TUA: {
    code: "SK_IZIN_ORANG_TUA",
    name: "Surat Keterangan Izin Orang Tua",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "Izin orang tua untuk pernikahan di luar kecamatan atau dokumen legal lainnya.",
    eta: "1 hari kerja",
    fields: [
      // ✅ ADOPSI OpenSID: field dari S-39
      {
        key: "nama_pemberi_izin",
        label: "Nama Pemberi Izin (Ayah/Ibu)",
        type: "text",
        required: true,
      },
      { key: "nama_anak", label: "Nama Anak yang Dituju", type: "text", required: true },
      { key: "alamat_anak", label: "Alamat Anak", type: "textarea", required: true },
      { key: "pekerjaan_anak", label: "Pekerjaan Anak", type: "text" },
      {
        key: "status_pekerjaan",
        label: "Status Pekerjaan (TKI/TKW/etc)",
        type: "text",
      },
      { key: "negara_tujuan", label: "Negara Tujuan (jika luar negeri)", type: "text" },
      { key: "masa_kontrak", label: "Lama Kontrak/Perjalanan (tahun)", type: "text" },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Jelaskan keperluan surat izin ini...",
        required: true,
        colSpan: 2,
      },
    ],
    syarat: ["Fotokopi KTP orang tua & anak", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "S-39",
  },

  SP_SANGGAR: {
    code: "SP-SANGGAR",
    name: "Surat Pengantar Pendirian Sanggar / Kursus",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Izin Mendirikan Sanggar (bukan wewenang).",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Proposal kegiatan"],
    kodeKlasifikasi: "510.5",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_BEBAS_NARKOBA: {
    code: "SP-BEBAS-NARKOBA",
    name: "Surat Pengantar Pemeriksaan Bebas Narkoba",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Pengantar Bebas Narkoba (bukan wewenang).",
    eta: "1 hari kerja",
    fields: COMMON_FIELDS_SHORT,
    syarat: ["Fotokopi KTP & KK", "Surat pengantar RT/RW"],
    kodeKlasifikasi: "510.6",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_PENEBANGAN_POHON: {
    code: "SP-PENEBANGAN-POHON",
    name: "Surat Pengantar Izin Penebangan Pohon",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Izin Penebangan Pohon (bukan wewenang).",
    eta: "1 hari kerja",
    fields: [
      { key: "jumlah_pohon", label: "Jumlah Pohon", type: "number", required: true },
      { key: "lokasi", label: "Lokasi Pohon", type: "textarea", colSpan: 2 },
      { key: "alasan", label: "Alasan Penebangan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Foto lokasi"],
    kodeKlasifikasi: "440.2",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_PENGGALANGAN_DANA: {
    code: "SP-PENGGALANGAN-DANA",
    name: "Surat Pengantar Izin Penggalangan Dana",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Izin Penggalangan Dana (bukan wewenang).",
    eta: "1 hari kerja",
    fields: [
      { key: "jenis_kegiatan", label: "Jenis Kegiatan", type: "text", required: true },
      { key: "target_dana", label: "Target Dana (Rp)", type: "text", required: true },
      { key: "keperluan", label: "Keperluan", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Proposal kegiatan", "Rekening tujuan"],
    kodeKlasifikasi: "510.7",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_PENDAFTARAN_TANAH: {
    code: "SP-PENDAFTARAN-TANAH",
    name: "Surat Pengantar Pendaftaran Tanah",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Sporadik Tanah (bukan wewenang).",
    eta: "1 hari kerja",
    fields: [
      { key: "lokasi_tanah", label: "Lokasi Tanah", type: "textarea", required: true, colSpan: 2 },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "text", required: true },
      { key: "batas", label: "Batas-batas", type: "textarea", colSpan: 2 },
    ],
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW"],
    kodeKlasifikasi: "466.1",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },

  SP_VERIF_KELAHIRAN: {
    code: "SP-VERIF-KELAHIRAN",
    name: "Surat Pengantar Verifikasi Kelahiran",
    category: "Surat Umum & Lainnya",
    wewenang: true,
    description: "PENGGANTI Surat Keterangan Kelahiran. Verifikasi data kelahiran di desa.",
    eta: "1 hari kerja",
    fields: [
      { key: "nama_bayi", label: "Nama Bayi", type: "text", required: true },
      { key: "tanggal_lahir", label: "Tanggal Lahir", type: "date", required: true },
      { key: "tempat_lahir", label: "Tempat Lahir", type: "text", required: true },
      { key: "nama_ibu", label: "Nama Ibu", type: "text", required: true },
      { key: "nama_ayah", label: "Nama Ayah", type: "text", required: true },
    ],
    syarat: ["Surat Keterangan Bidan/RS", "Fotokopi KTP & KK orang tua"],
    kodeKlasifikasi: "30.10",
    isNew: true,
    note: "SURAT BARU - GANTI yang bukan wewenang",
  },
};

/* ==================== HELPERS ==================== */

export function getSuratMaster(code: string): SuratMaster | undefined {
  return SURAT_MASTER[code];
}

export function getAllSuratMaster(): SuratMaster[] {
  return Object.values(SURAT_MASTER);
}

export function getSuratByCategory(category: string): SuratMaster[] {
  return Object.values(SURAT_MASTER).filter((s) => s.category === category);
}

export const SURAT_CATEGORIES = [
  "Kependudukan",
  "Sosial & Ekonomi",
  "Pernikahan & Keluarga",
  "Usaha & Ekonomi",
  "Tanah & Properti",
  "Pendidikan",
  "Kesehatan & Khusus",
  "Pertanian & Lingkungan",
  "Surat Dinas",
  "Surat Umum & Lainnya",
] as const;
