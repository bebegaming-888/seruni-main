// Data kependudukan Desa
// Struktur kolom mengikuti Tabel_Penduduk.xlsx (41 kolom)

export type Penduduk = {
  // ── Lokasi ───────────────────────────────────────────────────────────────
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  dusun: string;
  rt: string;
  rw?: string;
  alamat?: string;
  id_cluster?: number; // OpenSID: Mapping ID cluster wilayah

  // ── Identitas ────────────────────────────────────────────────────────────
  nama: string;
  jenis_kelamin: "Laki-Laki" | "Perempuan";
  status_dalam_kk: string; // OpenSID mapping -> hubungan_keluarga_id
  hubungan_keluarga_id?: number;
  no_kk: string;
  nik: string;
  status_perkawinan: "Belum Kawin" | "Kawin" | "Cerai Hidup" | "Cerai Mati"; // OpenSID mapping -> status_kawin
  tempat_lahir: string;
  tanggal_lahir: string; // ISO yyyy-mm-dd
  pendidikan: string; // OpenSID mapping -> pendidikan_kk_id
  pendidikan_kk_id?: number;
  pekerjaan: string; // OpenSID mapping -> pekerjaan_id
  pekerjaan_id?: number;
  pendapatan_bulan: string;
  kewarganegaraan: string; // OpenSID mapping -> warga_negara_id
  warga_negara_id?: number;
  agama: string; // OpenSID mapping -> agama_id
  agama_id?: number;
  suku: string;

  // ── Status Penduduk (OpenSID Standards) ──────────────────────────────────
  status_dasar?: number; // 1: Hidup, 2: Mati, 3: Pindah, 4: Hilang
  ktp_el?: number; // 1: Belum Rekam, 2: Sudah Rekam, 3: KTP-EL Diterbitkan
  status_rekam?: number; // 1-8 (detail status perekaman KTP)

  // ── Perumahan ────────────────────────────────────────────────────────────
  kepemilikan_rumah: string;
  luas_rumah: string;
  jumlah_lantai: string;
  jenis_lantai: string;
  jenis_dinding: string;
  jenis_atap: string;
  kepemilikan_tanah: string;
  luas_tanah: string;

  // ── Fasilitas ────────────────────────────────────────────────────────────
  penerangan: string;
  sumber_energi_masak: string;
  mck: string;
  sumber_air: string;

  // ── Sosial & Kesehatan ───────────────────────────────────────────────────
  bantuan_sosial: string;
  bantuan_extra: string;
  bpjs_kesehatan: string;
  bpjs_ketenagakerjaan: string;
  kepemilikan_aset: string;
  kondisi_fisik: string;
  cacat_id?: number; // OpenSID: 1:Cacat Fisik, 2:Cacat Netra, dst
  sakit_menahun_id?: number; // OpenSID: 1:Jantung, 2:Paru-paru, dst
  cara_kb_id?: number; // OpenSID: 1:Pil, 2:IUD, dst

  // ── Keluarga ─────────────────────────────────────────────────────────────
  nama_ibu: string;
  nama_bapak: string;
  golongan_darah: string; // OpenSID mapping -> golongan_darah_id
  golongan_darah_id?: number;

  // ── Legacy (opsional) ────────────────────────────────────────────────────
  no_hp?: string;
  email?: string;
  telegram?: string;
};

// ── Lookup lists (diambil dari data nyata Tabel_Penduduk.xlsx) ────────────────

/** Fallback static list — digunakan jika settings belum di-load (SSR / belum ada IndexedDB). */
const STATIC_DUSUN_LIST = ["Mandar", "Sasak", "Dames", "Brantapen Asri"];

export const DUSUN_LIST: string[] = STATIC_DUSUN_LIST;

/**
 * Dynamic dusun list — baca dari settings store (wilayah-store-backed).
 * Gunakan ini di komponen React (setelah init).
 * Static DUSUN_LIST export tetap ada untuk backward compat / non-React context.
 */
export async function getDusunList(): Promise<string[]> {
  try {
    const { getSettings } = await import("@/lib/settings-store");
    const dusun = getSettings().wilayah?.dusun_list;
    return Array.isArray(dusun) && dusun.length > 0 ? dusun : STATIC_DUSUN_LIST;
  } catch {
    return STATIC_DUSUN_LIST;
  }
}

/**
 * Alias for backward compatibility.
 * @deprecated Use getDusunList() instead for dynamic data.
 */
export function getDefaultDusunList(): string[] {
  return STATIC_DUSUN_LIST;
}

export const PEKERJAAN_LIST = [
  "Petani",
  "Buruh Tani",
  "Buruh Nelayan",
  "Nelayan",
  "Peternak",
  "Wiraswasta",
  "Pedagang",
  "Karyawan Swasta",
  "Karyawan BUMN/BUMD",
  "PNS/ASN",
  "TNI",
  "POLRI",
  "Honorer",
  "Aparat Desa",
  "Guru/Pendidik",
  "Tenaga Kesehatan",
  "Transportasi/Ojek/Supir",
  "Tukang",
  "Buruh",
  "Ibu Rumah Tangga",
  "Pelajar/Mahasiswa",
  "Pensiunan",
  "Tidak Bekerja",
  "Lainnya",
];

export const PENDIDIKAN_LIST = [
  "Belum/Tidak Sekolah",
  "PAUD",
  "SD/Sederajat",
  "SMP/Sederajat",
  "SMA/Sederajat",
  "Diploma I",
  "Diploma II",
  "Diploma III",
  "Diploma IV/Sarjana Terapan",
  "S1/Sarjana",
  "S2/Magister",
  "S3/Doktor",
];

export const AGAMA_LIST = ["Islam", "Kristen", "Katholik", "Hindu", "Buddha"];

export const SUKU_LIST = ["Sasak", "Bima", "Sumbawa", "Bugis", "Jawa", "Sapuka", "Lainnya"];

export const STATUS_DALAM_KK_LIST = [
  "Kepala Keluarga",
  "Istri",
  "Anak",
  "Cucu",
  "Orangtua",
  "Famili Lain",
];

export const GOLONGAN_DARAH_LIST = ["A", "B", "AB", "O", "Tidak Diketahui"];

export const KONDISI_FISIK_LIST = [
  "Normal",
  "Tunadaksa",
  "Tunanetra",
  "Tunarungu",
  "Tunawicara",
  "Lainnya",
];

export const KEPEMILIKAN_RUMAH_LIST = ["Sendiri", "Sewa", "Numpang", "-"];
export const JENIS_LANTAI_LIST = ["Keramik", "Semen", "Papan", "Tanah", "-"];
export const JENIS_DINDING_LIST = ["Bata", "Batako", "Semen", "Keramik", "Papan", "-"];
export const JENIS_ATAP_LIST = ["Genteng", "Asbes", "Spandek", "Beton", "Daun/Alami", "-"];
export const KEPEMILIKAN_TANAH_LIST = ["Sendiri", "Sewa", "Numpang", "-"];
export const PENERANGAN_LIST = ["PLN", "Non PLN", "Numpang", "-"];
export const SUMBER_ENERGI_LIST = ["Gas LPG 3 Kg", "Gas PLN", "Kayu Bakar", "-"];
export const MCK_LIST = ["Sendiri", "Numpang", "-"];
export const SUMBER_AIR_LIST = ["PDAM", "Perpipaan", "Mata Air", "-"];
export const KEPEMILIKAN_ASET_LIST = ["Tidak", "Roda 2", "Roda 4"];

// ── Data Mock (25 record contoh, mengikuti struktur 41 kolom) ─────────────────
export const PENDUDUK_MOCK: Penduduk[] = [
  {
    provinsi: "Nusa Tenggara Barat",
    kabupaten: "Lombok Timur",
    kecamatan: "Pringgabaya",
    desa: "Desa",
    dusun: "Mandar",
    rt: "002",
    rw: "001",
    nik: "5203011501900001",
    nama: "Ahmad Saifullah",
    jenis_kelamin: "Laki-Laki",
    status_dalam_kk: "Kepala Keluarga",
    no_kk: "5203011501900003",
    status_perkawinan: "Kawin",
    tempat_lahir: "Lombok Timur",
    tanggal_lahir: "1990-01-15",
    pendidikan: "SD/Sederajat",
    pekerjaan: "Petani",
    pendapatan_bulan: "500000",
    kewarganegaraan: "Indonesia",
    agama: "Islam",
    suku: "Sasak",
    kepemilikan_rumah: "Sendiri",
    luas_rumah: "60",
    jumlah_lantai: "1",
    jenis_lantai: "Semen",
    jenis_dinding: "Batako",
    jenis_atap: "Asbes",
    kepemilikan_tanah: "Sendiri",
    luas_tanah: "100",
    penerangan: "PLN",
    sumber_energi_masak: "Gas LPG 3 Kg",
    mck: "Sendiri",
    sumber_air: "PDAM",
    bantuan_sosial: "Ya",
    bantuan_extra: "Tidak",
    bpjs_kesehatan: "Ya",
    bpjs_ketenagakerjaan: "Tidak",
    kepemilikan_aset: "Roda 2",
    kondisi_fisik: "Normal",
    nama_ibu: "Fatimah",
    nama_bapak: "Muhammad Ali",
    golongan_darah: "O",
    no_hp: "081234567890",
    alamat: "Jl. Raya Desa No. 12",
  },
  {
    provinsi: "Nusa Tenggara Barat",
    kabupaten: "Lombok Timur",
    kecamatan: "Pringgabaya",
    desa: "Desa",
    dusun: "Sasak",
    rt: "001",
    rw: "002",
    nik: "5203012203950002",
    nama: "Siti Nurhaliza",
    jenis_kelamin: "Perempuan",
    status_dalam_kk: "Anak",
    no_kk: "5203011501900015",
    status_perkawinan: "Belum Kawin",
    tempat_lahir: "Selong",
    tanggal_lahir: "1995-03-22",
    pendidikan: "SMA/Sederajat",
    pekerjaan: "Pelajar/Mahasiswa",
    pendapatan_bulan: "0",
    kewarganegaraan: "Indonesia",
    agama: "Islam",
    suku: "Sasak",
    kepemilikan_rumah: "-",
    luas_rumah: "-",
    jumlah_lantai: "-",
    jenis_lantai: "-",
    jenis_dinding: "-",
    jenis_atap: "-",
    kepemilikan_tanah: "-",
    luas_tanah: "-",
    penerangan: "PLN",
    sumber_energi_masak: "Gas LPG 3 Kg",
    mck: "Numpang",
    sumber_air: "PDAM",
    bantuan_sosial: "Tidak",
    bantuan_extra: "Tidak",
    bpjs_kesehatan: "Ya",
    bpjs_ketenagakerjaan: "Tidak",
    kepemilikan_aset: "Tidak",
    kondisi_fisik: "Normal",
    nama_ibu: "Rohani",
    nama_bapak: "Lalu Suherman",
    golongan_darah: "A",
    no_hp: "082145678901",
    alamat: "Jl. Pendidikan No. 45",
  },
  {
    provinsi: "Nusa Tenggara Barat",
    kabupaten: "Lombok Timur",
    kecamatan: "Pringgabaya",
    desa: "Desa",
    dusun: "Dames",
    rt: "003",
    rw: "001",
    nik: "5203011008850003",
    nama: "Lalu Wirajaya",
    jenis_kelamin: "Laki-Laki",
    status_dalam_kk: "Kepala Keluarga",
    no_kk: "5203011008850010",
    status_perkawinan: "Kawin",
    tempat_lahir: "Mataram",
    tanggal_lahir: "1985-08-10",
    pendidikan: "SMA/Sederajat",
    pekerjaan: "Wiraswasta",
    pendapatan_bulan: "2000000",
    kewarganegaraan: "Indonesia",
    agama: "Islam",
    suku: "Sasak",
    kepemilikan_rumah: "Sendiri",
    luas_rumah: "80",
    jumlah_lantai: "1",
    jenis_lantai: "Keramik",
    jenis_dinding: "Bata",
    jenis_atap: "Genteng",
    kepemilikan_tanah: "Sendiri",
    luas_tanah: "150",
    penerangan: "PLN",
    sumber_energi_masak: "Gas LPG 3 Kg",
    mck: "Sendiri",
    sumber_air: "PDAM",
    bantuan_sosial: "Tidak",
    bantuan_extra: "Tidak",
    bpjs_kesehatan: "Ya",
    bpjs_ketenagakerjaan: "Ya",
    kepemilikan_aset: "Roda 2",
    kondisi_fisik: "Normal",
    nama_ibu: "Inaq Murni",
    nama_bapak: "Amaq Sahril",
    golongan_darah: "B",
    no_hp: "087865432109",
    alamat: "Jl. Pasar Lama No. 7",
  },
];

/**
 * Mock-only lookup — searches PENDUDUK_MOCK only.
 * For real penduduk lookup, use getPendudukByNik() from @/lib/penduduk-store.
 * @deprecated Use getPendudukByNik() instead — this function is kept for
 *   backward compatibility and will be removed in a future version.
 */
export function lookupPenduduk(nik: string): Penduduk | null {
  const clean = nik.trim();
  return PENDUDUK_MOCK.find((p) => p.nik === clean) ?? null;
}

// ── OpenSID Standard Mapping Helpers ──────────────────────────────────────────

export const MAP_AGAMA: Record<string, number> = {
  Islam: 1,
  Kristen: 2,
  Katholik: 3,
  Hindu: 4,
  Buddha: 5,
  Khonghucu: 6,
  "Kepercayaan Terhadap Tuhan YME / Lainnya": 7,
};

export const MAP_GOLONGAN_DARAH: Record<string, number> = {
  A: 1,
  B: 2,
  AB: 3,
  O: 4,
  "A+": 5,
  "A-": 6,
  "B+": 7,
  "B-": 8,
  "AB+": 9,
  "AB-": 10,
  "O+": 11,
  "O-": 12,
  "Tidak Diketahui": 13,
};

export const MAP_HUBUNGAN_KK: Record<string, number> = {
  "Kepala Keluarga": 1,
  Suami: 2,
  Istri: 3,
  Anak: 4,
  Menantu: 5,
  Cucu: 6,
  Orangtua: 7,
  Mertua: 8,
  "Famili Lain": 9,
  Pembantu: 10,
  Lainnya: 11,
};

export const MAP_STATUS_KAWIN: Record<string, number> = {
  "Belum Kawin": 1,
  Kawin: 2,
  "Cerai Hidup": 3,
  "Cerai Mati": 4,
};

/**
 * Computes missing OpenSID _id properties based on the string values inside a Penduduk object.
 * Call this before saving or exporting to ensure standards compliance.
 */
export function syncOpenSidProperties(p: Partial<Penduduk>): void {
  if (p.agama) p.agama_id = MAP_AGAMA[p.agama] || 7;
  if (p.golongan_darah) p.golongan_darah_id = MAP_GOLONGAN_DARAH[p.golongan_darah] || 13;
  if (p.status_dalam_kk) p.hubungan_keluarga_id = MAP_HUBUNGAN_KK[p.status_dalam_kk] || 11;
  // Note: For other standard mappings like Pendidikan/Pekerjaan,
  // you can extend this dictionary pattern based on OpenSID spec.

  // Ensure default fallback values for critical fields
  p.status_dasar = Number(p.status_dasar) || 1;
  p.ktp_el = Number(p.ktp_el) || 1;
  p.status_rekam = Number(p.status_rekam) || 1;
  p.cacat_id = Number(p.cacat_id) || 0;
  p.sakit_menahun_id = Number(p.sakit_menahun_id) || 0;
  p.cara_kb_id = Number(p.cara_kb_id) || 0;
}
