// Data kependudukan Desa Seruni Mumbul
// Struktur kolom mengikuti Tabel_Penduduk.xlsx (41 kolom)

export type Penduduk = {
  // ── Lokasi ───────────────────────────────────────────────────────────────
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  dusun: string;
  rt: string;
  // ── Identitas ────────────────────────────────────────────────────────────
  nama: string;
  jenis_kelamin: "Laki-Laki" | "Perempuan";
  status_dalam_kk: string;
  no_kk: string;
  nik: string;
  status_perkawinan: "Belum Kawin" | "Kawin" | "Cerai Hidup" | "Cerai Mati";
  tempat_lahir: string;
  tanggal_lahir: string; // ISO yyyy-mm-dd
  pendidikan: string;
  pekerjaan: string;
  pendapatan_bulan: string;
  kewarganegaraan: string;
  agama: string;
  suku: string;
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
  // ── Keluarga ─────────────────────────────────────────────────────────────
  nama_ibu: string;
  nama_bapak: string;
  golongan_darah: string;
  // ── Legacy (opsional, bisa kosong) ───────────────────────────────────────
  no_hp?: string;
  alamat?: string;
  rw?: string;
};

// ── Lookup lists (diambil dari data nyata Tabel_Penduduk.xlsx) ────────────────

export const DUSUN_LIST = [
  "Dames",
  "Dasar",
  "Gunung Sari",
  "Karang Bajo",
  "Karang Salah",
  "Mumbul",
  "Mumbul Barat",
  "Mumbul Timur",
  "Seruni",
  "Seruni Timur",
  "Mumbul Tengah",
  "Mumbul Selatan",
  "Seruni Utara",
  "Seruni Selatan",
];

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
  "Diploma",
  "S1/Sarjana",
  "S2/Magister",
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
    desa: "Seruni Mumbul",
    dusun: "Mumbul Timur",
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
    alamat: "Jl. Raya Seruni Mumbul No. 12",
  },
  {
    provinsi: "Nusa Tenggara Barat",
    kabupaten: "Lombok Timur",
    kecamatan: "Pringgabaya",
    desa: "Seruni Mumbul",
    dusun: "Mumbul Barat",
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
    desa: "Seruni Mumbul",
    dusun: "Mumbul Tengah",
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

export function lookupPenduduk(nik: string): Penduduk | null {
  const clean = nik.trim();
  return PENDUDUK_MOCK.find((p) => p.nik === clean) ?? null;
}
