export const NAV = [
  { label: "Beranda", to: "/" },
  {
    label: "Profil",
    to: "/profil",
    children: [
      { label: "Profil Desa", desc: "Sejarah, visi misi, dan profil umum", to: "/profil/desa" },
      {
        label: "Perangkat Desa",
        desc: "Struktur organisasi pemerintah desa",
        to: "/profil/perangkat",
      },
      { label: "Lembaga Desa", desc: "BPD, LPM, PKK, Karang Taruna", to: "/profil/lembaga" },
      {
        label: "BPD",
        desc: "Badan Permusyawaratan Desa",
        to: "/profil/bpd",
      },
      {
        label: "LPM",
        desc: "Lembaga Pemberdayaan Masyarakat",
        to: "/profil/lpm",
      },
      {
        label: "PKK & KWT",
        desc: "TP-PKK & Kelompok Wanita Tani",
        to: "/profil/pkkrw",
      },
      {
        label: "Karang Taruna",
        desc: "Organisasi kepemudaan desa",
        to: "/profil/karangtaruna",
      },
    ],
  },
  {
    label: "Pelayanan",
    to: "/pelayanan",
    children: [
      { label: "Ajukan Surat", desc: "E-Surat:Ajukan surat online", to: "/pelayanan/e-surat" },
      {
        label: "Lacak Surat",
        desc: "Pantau status pengajuan surat Anda",
        to: "/pelayanan/monitoring",
      },
      {
        label: "Surat Terbit",
        desc: "Arsip surat yang telah diterbitkan",
        to: "/pelayanan/surat-terbit",
      },
      {
        label: "Data Penduduk",
        desc: "Statistik dan data kependudukan",
        to: "/pelayanan/penduduk",
      },
      {
        label: "Pengaduan",
        desc: "Sampaikan aspirasi dan keluhan Anda",
        to: "/pelayanan/pengaduan",
      },
      {
        label: "Verifikasi Surat",
        desc: "Cek keabsahan dokumen surat",
        to: "/verifikasi",
      },
    ],
  },
  {
    label: "Informasi",
    to: "/informasi",
    children: [
      { label: "Berita", desc: "Kabar terkini dari desa", to: "/informasi/berita" },
      { label: "Agenda", desc: "Jadwal kegiatan mendatang", to: "/informasi/agenda" },
      { label: "Pengumuman", desc: "Informasi penting warga", to: "/informasi/pengumuman" },
      { label: "Galeri", desc: "Dokumentasi foto kegiatan", to: "/informasi/galeri" },
    ],
  },
  {
    label: "Wisata",
    to: "/wisata",
    children: [
      { label: "Destinasi", desc: "Tempat menarik di desa", to: "/wisata/destinasi" },
      { label: "UMKM", desc: "Produk usaha warga", to: "/wisata/umkm" },
    ],
  },
  {
    label: "Lainnya",
    to: "/lainnya",
    children: [
      { label: "APBDes", desc: "Anggaran desa", to: "/laporan/apbdes" },
      { label: "Produk Hukum", desc: "Peraturan desa", to: "/lainnya/produk-hukum" },
      { label: "Peta Desa", desc: "Peta lokasi dan wilayah", to: "/lainnya/peta" },
      { label: "IDM", desc: "Indeks Desa Membangun", to: "/informasi/idm" },
      { label: "Komoditas", desc: "Harga pasar", to: "/lainnya/komoditas" },
      { label: "Monografi", desc: "Data monografi desa", to: "/lainnya/monografi" },
    ],
  },
];
