// Shared map facilities data — imported by both VillageMap component and peta route
export type MapFacilityType =
  | "kantor-desa"
  | "posyandu"
  | "sekolah"
  | "masjid"
  | "olahraga"
  | "pasar"
  | "bumdes"
  | "objek-wisata"
  | "dusun";

export type MapFacility = {
  id: string;
  name: string;
  type: MapFacilityType;
  coords: [number, number]; // [lat, lng]
  description?: string;
  dusun?: string;
};

export const TYPE_CONFIG: Record<MapFacilityType, { color: string; icon: string; label: string }> =
  {
    // Brand palette colors (E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5)
    "kantor-desa": { color: "#078898", icon: "🏛️", label: "Kantor Desa" },
    posyandu: { color: "#E37222", icon: "🏥", label: "Posyandu" },
    sekolah: { color: "#66B9BF", icon: "🏫", label: "Sekolah" },
    masjid: { color: "#EEAA78", icon: "🕌", label: "Masjid" },
    olahraga: { color: "#078898", icon: "⚽", label: "Olahraga" },
    pasar: { color: "#E37222", icon: "🏪", label: "Pasar" },
    bumdes: { color: "#66B9BF", icon: "🏢", label: "BUMDes" },
    "objek-wisata": { color: "#EEAA78", icon: "🌿", label: "Objek Wisata" },
    dusun: { color: "#D5D5D5", icon: "🏘️", label: "Dusun" },
  };

export const FACILITIES: MapFacility[] = [
  {
    id: "kantor-desa",
    name: "Kantor Desa",
    type: "kantor-desa",
    coords: [-8.5732, 116.6214],
    description: "Pusat pemerintahan Desa",
  },
  {
    id: "posyandu-mawar",
    name: "Posyandu Mawar",
    type: "posyandu",
    coords: [-8.575, 116.623],
    description: "Pos kesehatan masyarakat untuk balita dan lansia — wilayah Timur",
    dusun: "Dusun Timur",
  },
  {
    id: "posyandu-melati",
    name: "Posyandu Melati",
    type: "posyandu",
    coords: [-8.572, 116.619],
    description: "Pos kesehatan masyarakat — wilayah Barat",
    dusun: "Dusun Barat",
  },
  {
    id: "sekolah-dasar",
    name: "Sekolah Dasar Negeri",
    type: "sekolah",
    coords: [-8.5735, 116.622],
    description: "Sekolah Dasar Negeri di Desa",
  },
  {
    id: "masjid-jami",
    name: "Masjid Jami Al-Muttaqin",
    type: "masjid",
    coords: [-8.573, 116.6205],
    description: "Masjid utama di Desa",
  },
  {
    id: "lapangan-olahraga",
    name: "Lapangan Olahraga Desa",
    type: "olahraga",
    coords: [-8.5745, 116.624],
    description: "Lapangan voli dan sepak bola masyarakat",
  },
  {
    id: "pasar-desa",
    name: "Pasar Desa",
    type: "pasar",
    coords: [-8.5728, 116.6235],
    description: "Pasar mingguan, setiap hari Sabtu",
  },
  {
    id: "bumdes",
    name: "Kantor BUMDes",
    type: "bumdes",
    coords: [-8.5738, 116.6218],
    description: "Pusat usaha BUMDes dan penjualan produk lokal",
  },
  {
    id: "objek-wisata-embung",
    name: "Embung Desa",
    type: "objek-wisata",
    coords: [-8.576, 116.625],
    description: "Embung wisata dengan pemandangan sawah terasering",
  },
  {
    id: "dusun-timur",
    name: "Dusun Timur",
    type: "dusun",
    coords: [-8.5755, 116.6245],
    dusun: "Dusun Timur",
  },
  {
    id: "dusun-barat",
    name: "Dusun Barat",
    type: "dusun",
    coords: [-8.5715, 116.6185],
    dusun: "Dusun Barat",
  },
];

export const DUSUN_LABELS = ["Dusun Timur", "Dusun Barat", "Dusun Utara", "Dusun Selatan"] as const;
