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
    ],
  },
  {
    label: "Pelayanan",
    to: "/pelayanan",
    children: [
      { label: "E-Surat", desc: "Ajukan surat online dengan mudah", to: "/pelayanan/e-surat" },
      {
        label: "Data Penduduk",
        desc: "Statistik dan data kependudukan",
        to: "/pelayanan/penduduk",
      },
      {
        label: "Konsultasi",
        desc: "Konsultasi langsung dengan perangkat",
        to: "/pelayanan/konsultasi",
      },
      { label: "Pengaduan", desc: "Sampaikan keluhan dan aspirasi", to: "/pelayanan/pengaduan" },
    ],
  },
  {
    label: "Informasi",
    to: "/informasi",
    children: [
      { label: "Berita", desc: "Kabar terkini dari desa", to: "/informasi/berita" },
      { label: "Agenda", desc: "Jadwal kegiatan mendatang", to: "/informasi/agenda" },
      { label: "Galeri", desc: "Dokumentasi foto kegiatan", to: "/informasi/galeri" },
      { label: "IDM", desc: "Indeks Desa Membangun", to: "/informasi/idm" },
      { label: "Pengumuman", desc: "Informasi penting warga", to: "/informasi/pengumuman" },
    ],
  },
  {
    label: "Laporan",
    to: "/laporan",
    children: [
      { label: "APBDes", desc: "Anggaran Pendapatan & Belanja Desa", to: "/laporan/apbdes" },
      {
        label: "Realisasi Anggaran",
        desc: "Realisasi penggunaan APBDes",
        to: "/laporan/realisasi",
      },
    ],
  },
  {
    label: "Wisata & Ekonomi",
    to: "/wisata",
    children: [
      { label: "Destinasi Wisata", desc: "Tempat-tempat menarik di desa", to: "/wisata/destinasi" },
      { label: "Peta Wisata", desc: "Peta interaktif lokasi wisata", to: "/wisata/peta" },
      { label: "Profil BUMDes", desc: "Badan Usaha Milik Desa", to: "/ekonomi/bumdes" },
      { label: "Marketplace", desc: "Pasar desa — beli produk lokal langsung dari penjual", to: "/ekonomi/marketplace" },
      { label: "Kopi", desc: "Koperasi Desa — simpan pinjam dan pembiayaan mikro", to: "/ekonomi/kopi" },
      { label: "Portal Penjual", desc: "Pelajari dan kelola pesanan produk Anda", to: "/penjual" },
    ],
  },
  {
    label: "Lainnya",
    to: "/lainnya",
    children: [
      { label: "Monografi Desa", desc: "Data lengkap profil desa", to: "/lainnya/monografi" },
      { label: "Produk Hukum", desc: "Perdes & Peraturan Desa", to: "/lainnya/produk-hukum" },
      { label: "Harga Komoditas", desc: "Harga pasar komoditas terkini", to: "/lainnya/komoditas" },
      { label: "Peta Desa", desc: "Peta wilayah administratif", to: "/lainnya/peta" },
    ],
  },
];