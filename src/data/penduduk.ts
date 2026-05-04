// Mock data penduduk untuk demo autofill berdasarkan NIK
// Pada produksi, gantikan dengan query ke tabel `penduduk` di Lovable Cloud
export type Penduduk = {
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string; // ISO yyyy-mm-dd
  jenis_kelamin: "Laki-laki" | "Perempuan";
  agama: string;
  status_perkawinan: "Belum Kawin" | "Kawin" | "Cerai Hidup" | "Cerai Mati";
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
  no_hp?: string;
};

export const PENDUDUK_MOCK: Penduduk[] = [
  {
    nik: "5203011501900001",
    nama: "Ahmad Saifullah",
    tempat_lahir: "Lombok Timur",
    tanggal_lahir: "1990-01-15",
    jenis_kelamin: "Laki-laki",
    agama: "Islam",
    status_perkawinan: "Kawin",
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
  },
  {
    nik: "5203012203950002",
    nama: "Siti Nurhaliza",
    tempat_lahir: "Selong",
    tanggal_lahir: "1995-03-22",
    jenis_kelamin: "Perempuan",
    agama: "Islam",
    status_perkawinan: "Belum Kawin",
    pekerjaan: "Mahasiswa",
    kewarganegaraan: "WNI",
    alamat: "Jl. Pendidikan No. 45",
    rt: "001",
    rw: "002",
    dusun: "Mumbul Barat",
    desa: "Seruni Mumbul",
    kecamatan: "Pringgabaya",
    kabupaten: "Lombok Timur",
    provinsi: "Nusa Tenggara Barat",
    no_kk: "5203011501900015",
    no_hp: "082145678901",
  },
  {
    nik: "5203011008850003",
    nama: "Lalu Wirajaya",
    tempat_lahir: "Mataram",
    tanggal_lahir: "1985-08-10",
    jenis_kelamin: "Laki-laki",
    agama: "Islam",
    status_perkawinan: "Kawin",
    pekerjaan: "Wiraswasta",
    kewarganegaraan: "WNI",
    alamat: "Jl. Pasar Lama No. 7",
    rt: "003",
    rw: "001",
    dusun: "Mumbul Tengah",
    desa: "Seruni Mumbul",
    kecamatan: "Pringgabaya",
    kabupaten: "Lombok Timur",
    provinsi: "Nusa Tenggara Barat",
    no_kk: "5203011008850010",
    no_hp: "087865432109",
  },
  {
    nik: "5203015602000004",
    nama: "Baiq Anggi Lestari",
    tempat_lahir: "Lombok Timur",
    tanggal_lahir: "2000-02-16",
    jenis_kelamin: "Perempuan",
    agama: "Islam",
    status_perkawinan: "Belum Kawin",
    pekerjaan: "Karyawan Swasta",
    kewarganegaraan: "WNI",
    alamat: "Jl. Melati Blok C No. 3",
    rt: "004",
    rw: "002",
    dusun: "Mumbul Barat",
    desa: "Seruni Mumbul",
    kecamatan: "Pringgabaya",
    kabupaten: "Lombok Timur",
    provinsi: "Nusa Tenggara Barat",
    no_kk: "5203015602000010",
    no_hp: "085712345600",
  },
  {
    nik: "5203012512750005",
    nama: "H. Mahsun Effendi",
    tempat_lahir: "Pringgabaya",
    tanggal_lahir: "1975-12-25",
    jenis_kelamin: "Laki-laki",
    agama: "Islam",
    status_perkawinan: "Kawin",
    pekerjaan: "PNS",
    kewarganegaraan: "WNI",
    alamat: "Jl. Mawar No. 21",
    rt: "001",
    rw: "003",
    dusun: "Mumbul Selatan",
    desa: "Seruni Mumbul",
    kecamatan: "Pringgabaya",
    kabupaten: "Lombok Timur",
    provinsi: "Nusa Tenggara Barat",
    no_kk: "5203012512750006",
    no_hp: "081999887766",
  },
];

export function lookupPenduduk(nik: string): Penduduk | null {
  const clean = nik.trim();
  return PENDUDUK_MOCK.find((p) => p.nik === clean) ?? null;
}
