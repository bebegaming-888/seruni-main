// Definisi field tambahan per jenis surat (di luar identitas yang sudah autofill)
export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helper?: string;
  colSpan?: 1 | 2;
};

export type SuratSchema = {
  code: string;
  name: string;
  category: string;
  description: string;
  syarat: string[];
  fields: FieldDef[];
  eta: string;
};

export const SURAT_SCHEMAS: Record<string, SuratSchema> = {
  SKD: {
    code: "SKD",
    name: "Surat Keterangan Domisili",
    category: "Surat Keterangan",
    description: "Surat keterangan tempat tinggal warga di wilayah Desa Seruni Mumbul.",
    syarat: ["Fotokopi KTP", "Fotokopi Kartu Keluarga", "Surat pengantar RT/RW"],
    eta: "1 hari kerja",
    fields: [
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Untuk persyaratan pembukaan rekening bank ...",
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
  },
  SKU: {
    code: "SKU",
    name: "Surat Keterangan Usaha",
    category: "Surat Keterangan",
    description: "Diterbitkan untuk warga yang memiliki usaha di wilayah desa.",
    syarat: ["Fotokopi KTP", "Foto tempat usaha", "Pengantar RT/RW"],
    eta: "2 hari kerja",
    fields: [
      { key: "nama_usaha", label: "Nama Usaha", type: "text", required: true },
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
      },
      { key: "tahun_berdiri", label: "Tahun Berdiri", type: "number", required: true },
      {
        key: "jumlah_karyawan",
        label: "Jumlah Karyawan",
        type: "number",
        placeholder: "0",
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
  },
  SKTM: {
    code: "SKTM",
    name: "Surat Keterangan Tidak Mampu",
    category: "Surat Keterangan",
    description: "Untuk warga kurang mampu sebagai persyaratan bantuan/beasiswa.",
    syarat: ["Fotokopi KTP & KK", "Pengantar RT/RW", "Foto rumah (opsional)"],
    eta: "1 hari kerja",
    fields: [
      {
        key: "penghasilan",
        label: "Penghasilan per Bulan (Rp)",
        type: "number",
        required: true,
      },
      {
        key: "tanggungan",
        label: "Jumlah Tanggungan",
        type: "number",
        required: true,
      },
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        placeholder: "Contoh: Pengajuan beasiswa KIP-Kuliah",
        required: true,
        colSpan: 2,
      },
    ],
  },
  SKBM: {
    code: "SKBM",
    name: "Surat Keterangan Belum Menikah",
    category: "Surat Keterangan",
    description: "Pernyataan status lajang yang dikeluarkan kepala desa.",
    syarat: ["Fotokopi KTP", "Fotokopi KK", "Materai 10000"],
    eta: "1 hari kerja",
    fields: [
      {
        key: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
      { key: "saksi_1", label: "Nama Saksi 1", type: "text", required: true },
      { key: "saksi_2", label: "Nama Saksi 2", type: "text", required: true },
    ],
  },
  "SP-KTP": {
    code: "SP-KTP",
    name: "Pengantar Pembuatan KTP",
    category: "Pengantar",
    description: "Pengantar dari desa untuk pengurusan KTP di Disdukcapil.",
    syarat: ["Fotokopi KK", "Pas foto 3x4"],
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_permohonan",
        label: "Jenis Permohonan",
        type: "select",
        options: ["Baru", "Perpanjangan", "Hilang/Rusak", "Perubahan Data"],
        required: true,
      },
    ],
  },
  "SP-KK": {
    code: "SP-KK",
    name: "Pengantar Kartu Keluarga",
    category: "Pengantar",
    description: "Pengantar untuk perubahan data Kartu Keluarga.",
    syarat: ["KK lama", "Akta nikah/kelahiran (jika perubahan)"],
    eta: "1 hari kerja",
    fields: [
      {
        key: "jenis_perubahan",
        label: "Jenis Perubahan",
        type: "select",
        options: ["Penambahan Anggota", "Pengurangan Anggota", "Pisah KK", "KK Baru"],
        required: true,
      },
      {
        key: "keterangan",
        label: "Keterangan",
        type: "textarea",
        colSpan: 2,
      },
    ],
  },
  "SP-NIKAH": {
    code: "SP-NIKAH",
    name: "Pengantar Nikah",
    category: "Pengantar",
    description: "Pengantar nikah (model N) untuk dilanjutkan ke KUA.",
    syarat: ["Fotokopi KTP & KK", "Akta kelahiran", "Pas foto 2x3 & 4x6"],
    eta: "2 hari kerja",
    fields: [
      { key: "nama_calon", label: "Nama Calon Pasangan", type: "text", required: true },
      { key: "nik_calon", label: "NIK Calon Pasangan", type: "text", required: true },
      { key: "tanggal_nikah", label: "Rencana Tanggal Nikah", type: "date", required: true },
      { key: "tempat_nikah", label: "Tempat Akad", type: "text", required: true },
    ],
  },
  SKAW: {
    code: "SKAW",
    name: "Surat Kuasa Ahli Waris",
    category: "Lainnya",
    description: "Pernyataan ahli waris yang sah atas peninggalan almarhum.",
    syarat: ["Akta kematian", "KK & KTP ahli waris", "Materai 10000"],
    eta: "3 hari kerja",
    fields: [
      { key: "nama_alm", label: "Nama Almarhum/ah", type: "text", required: true },
      { key: "tgl_meninggal", label: "Tanggal Meninggal", type: "date", required: true },
      {
        key: "daftar_waris",
        label: "Daftar Ahli Waris (satu per baris)",
        type: "textarea",
        required: true,
        colSpan: 2,
      },
    ],
  },
  SIUM: {
    code: "SIUM",
    name: "Surat Izin Keramaian",
    category: "Lainnya",
    description: "Izin penyelenggaraan acara/keramaian di wilayah desa.",
    syarat: ["Proposal acara", "Pengantar RT/RW", "Persetujuan tetangga"],
    eta: "2 hari kerja",
    fields: [
      { key: "nama_acara", label: "Nama Acara", type: "text", required: true },
      { key: "tgl_mulai", label: "Tanggal Mulai", type: "date", required: true },
      { key: "tgl_selesai", label: "Tanggal Selesai", type: "date", required: true },
      { key: "lokasi", label: "Lokasi Acara", type: "text", required: true, colSpan: 2 },
      {
        key: "jumlah_tamu",
        label: "Perkiraan Jumlah Tamu",
        type: "number",
        required: true,
      },
      {
        key: "keterangan",
        label: "Keterangan Tambahan",
        type: "textarea",
        colSpan: 2,
      },
    ],
  },
};

export function getSchema(code: string): SuratSchema | null {
  return SURAT_SCHEMAS[code] ?? null;
}
