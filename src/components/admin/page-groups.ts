/** Shared PAGE_GROUPS config — avoids duplicate constant across SettingsPanel + PagesCMS */
export const PAGE_GROUPS = [
  {
    group: "Profil",
    pages: [
      { path: "/profil/desa", label: "Profil Desa" },
      { path: "/profil/perangkat", label: "Perangkat Desa" },
      { path: "/profil/lembaga", label: "Lembaga Desa" },
      { path: "/profil/bpd", label: "BPD" },
      { path: "/profil/lpm", label: "LPM" },
      { path: "/profil/karangtaruna", label: "Karang Taruna" },
      { path: "/profil/pkkrw", label: "PKK & KWT" },
    ],
  },
  {
    group: "Informasi",
    pages: [
      { path: "/informasi/berita", label: "Berita" },
      { path: "/informasi/agenda", label: "Agenda" },
      { path: "/informasi/galeri", label: "Galeri" },
      { path: "/informasi/idm", label: "IDM" },
      { path: "/informasi/pengumuman", label: "Pengumuman" },
    ],
  },
  {
    group: "Pelayanan",
    pages: [
      { path: "/pelayanan/pengaduan", label: "Pengaduan" },
      { path: "/pelayanan/penduduk", label: "Statistik Penduduk" },
    ],
  },
  {
    group: "Laporan",
    pages: [{ path: "/laporan/apbdes", label: "APBDes" }],
  },
  {
    group: "Ekonomi",
    pages: [{ path: "/ekonomi/bumdes", label: "BUMDes" }],
  },
  {
    group: "Lainnya",
    pages: [
      { path: "/lainnya/peta", label: "Peta Interaktif" },
      { path: "/lainnya/produk-hukum", label: "Produk Hukum" },
      { path: "/lainnya/monografi", label: "Monografi" },
      { path: "/lainnya/komoditas", label: "Komoditas" },
    ],
  },
];
