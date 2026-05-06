// Data APBDes 2026 — Desa Seruni Mumbul
// Sumber: data simulasi untuk prototype dashboard transparansi
// Production: gantikan dengan query ke tabel `apbdes_*` di Supabase

export type ApbdesTahun = {
  tahun: number;
  status: "APBD" | "Perubahan" | "Pendapatan";
  total_pendapatan: number;
  total_belanja: number;
  total_pembiayaan: number;
  sisa: number;
};

export type PendapatanItem = {
  kode: string;
  label: string;
  nilai: number;
  kategori: "PADesa" | "DanaDesa" | "Alokasi" | "Lainnya";
};

export type BelanjaItem = {
  kode: string;
  label: string;
  nilai: number;
  kategori: "Penyelenggaraan" | "Pelaksanaan" | "Pembinaan" | "Pemberdayaan" | "TidakTerduga";
  bagian: string;
  volumen?: string;
};

export type PembiayaanItem = {
  label: string;
  jenis: "penerimaan" | "pengeluaran";
  nilai: number;
};

// ---- ANGGARAN 2026 ----
export const TAHUN_2026: ApbdesTahun = {
  tahun: 2026,
  status: "APBD",
  total_pendapatan: 2_150_000_000,
  total_belanja: 1_985_000_000,
  total_pembiayaan: 165_000_000,
  sisa: 165_000_000,
};

export const PENDAPATAN_2026: PendapatanItem[] = [
  { kode: "4.1.01", label: "Hasil Aset Desa", nilai: 85_000_000, kategori: "PADesa" },
  { kode: "4.1.02", label: "Retribusi", nilai: 25_000_000, kategori: "PADesa" },
  { kode: "4.1.03", label: "Hasil Usaha Desa (BUMDes)", nilai: 60_000_000, kategori: "PADesa" },
  { kode: "4.2.01", label: "Dana Desa (DD)", nilai: 1_020_000_000, kategori: "DanaDesa" },
  { kode: "4.2.02", label: "Alokasi Dana Desa (ADD)", nilai: 680_000_000, kategori: "Alokasi" },
  {
    kode: "4.2.03",
    label: "Bagian Hasil Pajak & Retribusi",
    nilai: 90_000_000,
    kategori: "Lainnya",
  },
  { kode: "4.2.04", label: "Bantuan Keuangan Provinsi", nilai: 120_000_000, kategori: "Lainnya" },
  { kode: "4.2.05", label: "Lain-Lain Pendapatan", nilai: 70_000_000, kategori: "Lainnya" },
];

export const BELANJA_2026: BelanjaItem[] = [
  // Penyelenggaraan Pemerintah Desa
  {
    kode: "5.1.01",
    label: "Gaji Kepala Desa",
    nilai: 84_000_000,
    kategori: "Penyelenggaraan",
    bagian: "12 bulan",
    volumen: "1 Orang",
  },
  {
    kode: "5.1.02",
    label: "Gaji Sekretariat Desa",
    nilai: 144_000_000,
    kategori: "Penyelenggaraan",
    bagian: "12 bulan",
    volumen: "4 Orang",
  },
  {
    kode: "5.1.03",
    label: "Gaji Kasi & Kader",
    nilai: 180_000_000,
    kategori: "Penyelenggaraan",
    bagian: "12 bulan",
    volumen: "6 Orang",
  },
  {
    kode: "5.1.04",
    label: "Operasi Kantor & Adm.",
    nilai: 48_000_000,
    kategori: "Penyelenggaraan",
    bagian: "12 bulan",
  },
  {
    kode: "5.1.05",
    label: "Penyelenggaraan rapat desa",
    nilai: 24_000_000,
    kategori: "Penyelenggaraan",
    bagian: "12 kegiatan",
  },
  // Pelaksanaan Pembangunan
  {
    kode: "5.2.01",
    label: "Jalan Desa (RTB & pemeliharaan)",
    nilai: 380_000_000,
    kategori: "Pelaksanaan",
    bagian: "2 kegiatan",
  },
  {
    kode: "5.2.02",
    label: "Pembangunan/Peningkatan Irigasi",
    nilai: 250_000_000,
    kategori: "Pelaksanaan",
    bagian: "1 kegiatan",
  },
  {
    kode: "5.2.03",
    label: "Pembangunan MCK Umum",
    nilai: 120_000_000,
    kategori: "Pelaksanaan",
    bagian: "5 unit",
  },
  {
    kode: "5.2.04",
    label: "Peningkatan Jalan Usaha Tani",
    nilai: 180_000_000,
    kategori: "Pelaksanaan",
    bagian: "2 kegiatan",
  },
  {
    kode: "5.2.05",
    label: "Drainase/DES (30%DD)",
    nilai: 120_000_000,
    kategori: "Pelaksanaan",
    bagian: "3 kegiatan",
  },
  {
    kode: "5.2.06",
    label: "Pembersihan Embung",
    nilai: 60_000_000,
    kategori: "Pelaksanaan",
    bagian: "1 kegiatan",
  },
  // Pembinaan Kemasyarakatan
  {
    kode: "5.3.01",
    label: "Honorer & Outsourching",
    nilai: 96_000_000,
    kategori: "Pembinaan",
    bagian: "8 Orang",
  },
  {
    kode: "5.3.02",
    label: "Kegiatan BPD",
    nilai: 36_000_000,
    kategori: "Pembinaan",
    bagian: "12 kegiatan",
  },
  {
    kode: "5.3.03",
    label: "Subsidi transportasi kegiatan",
    nilai: 24_000_000,
    kategori: "Pembinaan",
    bagian: "12 bulan",
  },
  {
    kode: "5.3.04",
    label: "Pelatihan & Bimtek",
    nilai: 40_000_000,
    kategori: "Pembinaan",
    bagian: "4 kegiatan",
  },
  // Pemberdayaan Masyarakat
  {
    kode: "5.4.01",
    label: "BLT-DD (40% DD)",
    nilai: 408_000_000,
    kategori: "Pemberdayaan",
    bagian: "12 bulan",
    volumen: "40 KK",
  },
  {
    kode: "5.4.02",
    label: "Program Stunting & Gizi",
    nilai: 60_000_000,
    kategori: "Pemberdayaan",
    bagian: "4 kegiatan",
  },
  {
    kode: "5.4.03",
    label: "Bantuan Alsintan",
    nilai: 50_000_000,
    kategori: "Pemberdayaan",
    bagian: "1 kegiatan",
  },
  {
    kode: "5.4.04",
    label: "Pendampingan UMKM & BUMDes",
    nilai: 45_000_000,
    kategori: "Pemberdayaan",
    bagian: "3 kegiatan",
  },
  {
    kode: "5.4.05",
    label: "PKK & Posyandu",
    nilai: 60_000_000,
    kategori: "Pemberdayaan",
    bagian: "12 kegiatan",
  },
  // Tidak Terduga
  {
    kode: "5.5.01",
    label: "Dana Cadangan Desa",
    nilai: 120_000_000,
    kategori: "TidakTerduga",
    bagian: "1 tahun",
  },
  {
    kode: "5.5.02",
    label: "Penyertaan Modal BUMDes",
    nilai: 80_000_000,
    kategori: "TidakTerduga",
    bagian: "1 kegiatan",
  },
];

export const REALISASI_2026: {
  pendapatan: { realised: number; percent: number };
  belanja: Record<string, { realised: number; percent: number }>;
} = {
  // Persentase realised per kategori (simulasi Mei 2026)
  pendapatan: { realised: 1_180_000_000, percent: 55 },
  belanja: {
    Penyelenggaraan: { realised: 290_000_000, percent: 58 },
    Pelaksanaan: { realised: 420_000_000, percent: 42 },
    Pembinaan: { realised: 140_000_000, percent: 47 },
    Pemberdayaan: { realised: 310_000_000, percent: 45 },
    TidakTerduga: { realised: 0, percent: 0 },
  },
};

// ---- HISTORI 5 TAHUN ----
export const HISTORY_APBDES = [
  { tahun: 2022, pendapatan: 1_850_000_000, belanja: 1_720_000_000 },
  { tahun: 2023, pendapatan: 1_950_000_000, belanja: 1_810_000_000 },
  { tahun: 2024, pendapatan: 2_050_000_000, belanja: 1_900_000_000 },
  { tahun: 2025, pendapatan: 2_100_000_000, belanja: 1_950_000_000 },
  { tahun: 2026, pendapatan: 2_150_000_000, belanja: 1_985_000_000 },
];

// ---- HELPERS ----
export function formatRupiah(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function formatRupiahFull(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")},00`;
}

export function pct(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

export const BELANJA_KATEGORI = [
  "Penyelenggaraan",
  "Pelaksanaan",
  "Pembinaan",
  "Pemberdayaan",
  "TidakTerduga",
] as const;

export const APBDES_DATA = {
  tahun: TAHUN_2026.tahun,
  status: TAHUN_2026.status,
  pendapatan: {
    total: TAHUN_2026.total_pendapatan,
    items: PENDAPATAN_2026,
    realisasi: REALISASI_2026.pendapatan,
  },
  belanja: {
    total: TAHUN_2026.total_belanja,
    items: BELANJA_2026,
    realisasi: REALISASI_2026.belanja,
  },
  pembiayaan: {
    netto: TAHUN_2026.total_pembiayaan,
    sisa: TAHUN_2026.sisa,
  },
  history: HISTORY_APBDES,
};
