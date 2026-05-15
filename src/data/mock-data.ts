export const PENGUMUMAN = [
  {
    id: 1,
    priority: "urgent" as const,
    title: "Pemadaman Listrik Bergilir 28–30 Mei 2026",
    excerpt: "PLN akan melakukan pemeliharaan jaringan. Pemadaman pukul 09:00–14:00 WITA.",
    date: "26 Mei 2026",
    countdown: "2 hari tersisa",
  },
  {
    id: 2,
    priority: "important" as const,
    title: "Pendaftaran Bantuan Sosial Tahap II Dibuka",
    excerpt: "Warga yang memenuhi kriteria dapat mendaftar di kantor desa hingga 15 Juni 2026.",
    date: "20 Mei 2026",
    countdown: "21 hari tersisa",
  },
  {
    id: 3,
    priority: "normal" as const,
    title: "Jadwal Posyandu Bulan Juni",
    excerpt: "Posyandu balita & lansia setiap Selasa minggu kedua di balai desa.",
    date: "18 Mei 2026",
    countdown: null,
  },
];

export const SURAT_KATEGORI: Array<{
  name: string;
  items: Array<{ code: string; name: string; popular: boolean; eta: string }>;
}> = [
  {
    name: "Kependudukan",
    items: [
      { code: "SKD", name: "Surat Keterangan Domisili", popular: true, eta: "1 hari kerja" },
      {
        code: "PINDAH_DOMISILI",
        name: "Surat Keterangan Pindah Domisili",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "PENDATANG",
        name: "Surat Keterangan Pendatang / Numpang KK",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "KK_BARU",
        name: "Surat Keterangan Kepala Keluarga",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "BEDA_NAMA",
        name: "Surat Keterangan Beda Nama",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "ALAMAT_SEMENTARA",
        name: "Surat Keterangan Alamat Sementara",
        popular: false,
        eta: "1 hari kerja",
      },
      { code: "SP-KTP", name: "Surat Pengantar Pembuatan KTP", popular: true, eta: "1 hari kerja" },
      { code: "SP-KK", name: "Surat Pengantar Pembuatan KK", popular: true, eta: "1 hari kerja" },
    ],
  },
  {
    name: "Sosial & Ekonomi",
    items: [
      {
        code: "SKTM",
        name: "Surat Keterangan Tidak Mampu (SKTM)",
        popular: true,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PENGHASILAN",
        name: "Surat Keterangan Penghasilan",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_KEHILANGAN",
        name: "Surat Keterangan Kehilangan",
        popular: false,
        eta: "1 hari kerja",
      },
      { code: "SP-SKCK", name: "Surat Pengantar SKCK", popular: true, eta: "1 hari kerja" },
      {
        code: "SK_KELAKUAN_BAIK",
        name: "Surat Keterangan Kelakuan Baik",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_TIDAK_PUNYA_KERJA",
        name: "Surat Keterangan Tidak Punya Pekerjaan",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "VERIF-DTKS",
        name: "Surat Pengantar Verifikasi DTKS",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
  {
    name: "Pernikahan & Keluarga",
    items: [
      {
        code: "SK_BELUM_MENIKAH",
        name: "Surat Keterangan Belum Menikah",
        popular: true,
        eta: "1 hari kerja",
      },
      {
        code: "SK-NIKAH",
        name: "Surat Keterangan Nikah (N-1 s/d N-6)",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_NIKAH_NONMUSLIM",
        name: "Surat Keterangan Nikah Non-Muslim",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_JANDA",
        name: "Surat Keterangan Status Janda",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_DUDA",
        name: "Surat Keterangan Status Duda",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_HUBUNGAN_KELUARGA",
        name: "Surat Keterangan Hubungan Keluarga",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_AHLI_WARIS",
        name: "Surat Keterangan Ahli Waris",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "DISPENSA_NIKAH",
        name: "Surat Dispensasi Nikah (Pengantar PA)",
        popular: false,
        eta: "3 hari kerja",
      },
      {
        code: "WALI_NIKAH",
        name: "Surat Keterangan Wali Nikah Hakim",
        popular: false,
        eta: "2 hari kerja",
      },
    ],
  },
  {
    name: "Usaha & Ekonomi",
    items: [
      { code: "SKU", name: "Surat Keterangan Usaha (SKU)", popular: true, eta: "2 hari kerja" },
      {
        code: "IZIN_KERAMAIAN",
        name: "Surat Keterangan Izin Keramaian",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_PETERNAK",
        name: "Surat Keterangan Peternak",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PENGRAJIN",
        name: "Surat Keterangan Pengrajin / Seniman",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PEDAGANG_PASAR",
        name: "Surat Keterangan Pedagang Pasar",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
  {
    name: "Tanah & Properti",
    items: [
      {
        code: "SK_TANAH_MILIK",
        name: "Surat Keterangan Kepemilikan Tanah",
        popular: true,
        eta: "2 hari kerja",
      },
      {
        code: "SK_TANAH_TIDAK_SENGKETA",
        name: "Surat Keterangan Tidak Sengketa Tanah",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_HIBAH_TANAH",
        name: "Surat Keterangan Hibah Tanah",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_JUAL_BELI_TANAH",
        name: "Surat Keterangan Jual Beli Tanah",
        popular: true,
        eta: "2 hari kerja",
      },
      {
        code: "SK_RUMAH_MILIK",
        name: "Surat Keterangan Kepemilikan Rumah",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_BELUM_PUNYA_RUMAH",
        name: "Surat Keterangan Belum Memiliki Rumah",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_TANAH_WAKAF",
        name: "Surat Keterangan Tanah Wakaf",
        popular: false,
        eta: "2 hari kerja",
      },
    ],
  },
  {
    name: "Pendidikan",
    items: [
      {
        code: "SK_BEASISWA",
        name: "Surat Keterangan untuk Beasiswa",
        popular: true,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PENELITIAN",
        name: "Surat Keterangan Penelitian / KKN / PKL",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_PUTUS_SEKOLAH",
        name: "Surat Keterangan Putus Sekolah",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_AKTIF_SEKOLAH",
        name: "Surat Aktif Sekolah (PIP/KPS)",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
  {
    name: "Kesehatan & Khusus",
    items: [
      {
        code: "SK_DISABILITAS",
        name: "Surat Keterangan Penyandang Disabilitas",
        popular: false,
        eta: "1 hari kerja",
      },
      { code: "SK_LANSIA", name: "Surat Keterangan Lansia", popular: false, eta: "1 hari kerja" },
      {
        code: "SK_YATIM_PIATU",
        name: "Surat Keterangan Anak Yatim / Piatu",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_HAMIL",
        name: "Surat Keterangan Hamil / Ibu Melahirkan",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
  {
    name: "Pertanian & Lingkungan",
    items: [
      { code: "SK_PETANI", name: "Surat Keterangan Petani", popular: false, eta: "1 hari kerja" },
      { code: "SK_NELAYAN", name: "Surat Keterangan Nelayan", popular: false, eta: "1 hari kerja" },
      {
        code: "SK_BENCANA",
        name: "Surat Keterangan Dampak Bencana",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PENGGUNAAN_LAHAN",
        name: "Surat Keterangan Penggunaan Lahan",
        popular: false,
        eta: "2 hari kerja",
      },
      {
        code: "SK_KELOMPOK_TANI",
        name: "Surat Keterangan Kelompok Tani / Nelayan",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
  {
    name: "Surat Dinas",
    items: [
      {
        code: "SP-INSTANSI",
        name: "Surat Pengantar ke Instansi Lain",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SURAT_BANTUAN",
        name: "Surat Permohonan Bantuan",
        popular: false,
        eta: "1 hari kerja",
      },
      { code: "SURAT_REKOMENDASI", name: "Surat Rekomendasi", popular: false, eta: "1 hari kerja" },
    ],
  },
  {
    name: "Surat Umum & Lainnya",
    items: [
      {
        code: "SPTJM",
        name: "Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)",
        popular: false,
        eta: "1 hari kerja",
      },
      { code: "SURAT_KUASA", name: "Surat Kuasa", popular: false, eta: "1 hari kerja" },
      {
        code: "SK_WNI_KETURUNAN",
        name: "Surat Keterangan WNI Keturunan",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_HAJI",
        name: "Surat Keterangan Naik Haji / Umrah",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_PASPOR",
        name: "Surat Keterangan untuk Paspor",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_TKI",
        name: "Surat Keterangan Calon TKI / PMI",
        popular: false,
        eta: "2 hari kerja",
      },
      { code: "SP-PTSL", name: "Surat Pengantar PTSL", popular: false, eta: "1 hari kerja" },
      {
        code: "SK_ORGANISASI",
        name: "Surat Keterangan Keaktifan Organisasi",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SK_TIDAK_DI_DESA",
        name: "Surat Keterangan Tidak Berada di Desa",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-AKTA-KELAHIRAN",
        name: "Surat Pengantar Penerbitan Akta Kelahiran",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-AKTA-KEMATIAN",
        name: "Surat Pengantar Penerbitan Akta Kematian",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-AKTA-LAHIR",
        name: "Surat Pengantar Penerbitan Akta Lahir",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-IZIN-REKLAME",
        name: "Surat Pengantar Izin Reklame",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-IMB",
        name: "Surat Pengantar Izin Bangunan (IMB/PBG)",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-SANGGAR",
        name: "Surat Pengantar Pendirian Sanggar / Kursus",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-BEBAS-NARKOBA",
        name: "Surat Pengantar Pemeriksaan Bebas Narcob",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-PENEBANGAN-POHON",
        name: "Surat Pengantar Izin Penebangan Pohon",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-PENGGALANGAN-DANA",
        name: "Surat Pengantar Izin Penggalangan Dana",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-PENDAFTARAN-TANAH",
        name: "Surat Pengantar Pendaftaran Tanah",
        popular: false,
        eta: "1 hari kerja",
      },
      {
        code: "SP-VERIF-KELAHIRAN",
        name: "Surat Pengantar Verifikasi Kelahiran",
        popular: false,
        eta: "1 hari kerja",
      },
    ],
  },
];

export const AGENDA = [
  {
    id: 1,
    day: "04",
    month: "JUN",
    title: "Musrenbangdes 2027",
    time: "08:30 – 12:00 WITA",
    location: "Balai Desa",
    category: "Musyawarah",
  },
  {
    id: 2,
    day: "11",
    month: "JUN",
    title: "Posyandu Balita Dusun Timur",
    time: "09:00 – 11:00 WITA",
    location: "Posyandu Mawar",
    category: "Kesehatan",
  },
  {
    id: 3,
    day: "17",
    month: "JUN",
    title: "Festival Tenun Sasak",
    time: "14:00 – 21:00 WITA",
    location: "Lapangan Desa",
    category: "Budaya",
  },
];

export const KOMODITAS = [
  { name: "Padi", price: 6800, unit: "kg", trend: "up" as const, change: 2.1 },
  { name: "Jagung", price: 5400, unit: "kg", trend: "down" as const, change: 1.4 },
  { name: "Cabai Rawit", price: 48000, unit: "kg", trend: "up" as const, change: 8.3 },
  { name: "Bawang Merah", price: 32000, unit: "kg", trend: "down" as const, change: 3.0 },
  { name: "Tomat", price: 12500, unit: "kg", trend: "up" as const, change: 4.2 },
  { name: "Kelapa", price: 6000, unit: "butir", trend: "up" as const, change: 0.8 },
];
