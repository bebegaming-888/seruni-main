// Data Berita — CMS artikel untuk portal Desa
// Production: ganti dengan query ke tabel `articles` di Supabase

export type ArticleCategory =
  | "Berita"
  | "Pengumuman"
  | "Agenda"
  | "Budaya"
  | "Ekonomi"
  | "Kesehatan";

export type ArticleTag = string;

export type ArticleAuthor = {
  nama: string;
  role: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML
  category: ArticleCategory;
  tags: ArticleTag[];
  author: ArticleAuthor;
  published_at: string; // ISO date string
  updated_at: string;
  cover_image: string; // URL atau path public/
  read_time: number; // minutes
  featured: boolean;
  views: number;
};

export const ARTICLES: Article[] = [
  {
    id: "1",
    slug: "musrenbangdes-2027-desa-desa-digital",
    title: "Musrenbangdes 2027: 47 Proposal Warga Disetujui untuk Tahun Depan",
    excerpt:
      "Musyawarah Perencanaan Desa Tahun 2027 menghasilkan 47 proposal dari 4 dusun. Prioritas pembangunan jalan, irigasi, dan pemberdayaan ekonomi.",
    content: `
<p>Wilayah Desa — Musyawarah Perencanaan Desa (Musrenbangdes) Tahun 2027 resmi ditutup hari ini di Balai Desa. Kegiatan yang dimulai sejak pukul 08.30 WITA ini berhasil menghimpun <strong>47 proposal</strong> dari berbagai lapisan masyarakat di 4 dusun.</p>

<h2>Hasil Utama Musrenbangdes</h2>
<p>Ketua BPD H. M. Natsir, S.Pd. menyampaikan bahwa proposal yang masuk mencakup tiga prioritas utama:</p>
<ul>
  <li><strong>Pembangunan Infrastruktur</strong> (21 proposal) — meliputi pembangunan jalan usaha tani, normalisasi saluran irigasi, dan perbaikan drainase di 6 titik.</li>
  <li><strong>Pemberdayaan Ekonomi</strong> (14 proposal) — pelatihan kewirausahaan, bantuan Alsintan, dan pengembangan potensi BUMDes.</li>
  <li><strong>Kesejahteraan Sosial</strong> (12 proposal) — peningkatan program BLT-DD, perbaikan Posyandu, dan bantuan pendidikan bagi keluarga tidak mampu.</li>
</ul>

<p>"Alhamdulillah, Musrenbangdes tahun ini berjalan dengan sangat demokratis. Semua suara warga terdengar dan dicatat dengan baik," kata H. Sumardi, S.Sos. selaku Kepala Desa.</p>

<h2>Proses Seleksi Proposal</h2>
<p>Seluruh proposal yang masuk akan diverifikasi oleh Tim Verifikasi yang terdiri dari perangkat desa, BPD, dan perwakilan masyarakat. Proposal yang lolos verifikasi akan dianggarkan dalam RKPDes 2027 dan diusulkan dalam APBDes 2027.</p>

<p>Hasil akhir Musrenbangdes akan dipublikasikan melalui portal desa dan ditempelkan di papan pengumuman kantor desa dalam waktu 7 hari kerja.</p>
    `.trim(),
    category: "Berita",
    tags: ["musrenbangdes", "perencanaan", "pembangunan"],
    author: { nama: "Lalu Ahmad Zaini, S.Sos.", role: "Sekretaris Desa" },
    published_at: "2026-05-02T08:00:00Z",
    updated_at: "2026-05-02T10:30:00Z",
    cover_image: "/images/berita-musrenbangdes.jpg",
    read_time: 4,
    featured: true,
    views: 342,
  },
  {
    id: "2",
    slug: "pembangunan-jalan-usaha-tani-dusun-timur",
    title: "Pembangunan Jalan Usaha Tani 1,2 Km di Wilayah Timur",
    excerpt:
      "Jalan usaha tani sepanjang 1,2 kilometer di wilayah Timur mulai dikerjakan bulan ini. Dana berasal dari DD 30% sebesar Rp 180 juta.",
    content: `
<p>Wilayah Desa — Pemerintah Desa resmi memulai pembangunan jalan usaha tani (JUT) di wilayah Timur Desa, Jumat (02/05/2026). Pembangunan ini menggunakan Dana Desa (DD) 30% sebesar <strong>Rp 180.000.000</strong>.</p>

<h2>Spesifikasi Teknis</h2>
<p>Jalan yang dibangun memiliki spesifikasi:</p>
<ul>
  <li>Panjang: 1.200 meter</li>
  <li>Lebar: 3 meter</li>
  <li>Fondasi: Sirtu (pasir dan batu) setebal 20 cm</li>
  <li>Permukaan: Rabat beton setebal 15 cm</li>
  <li>Drainase: Saluran samping permanen</li>
</ul>

<p>Pekerjaan diperkirakan selesai dalam 45 hari kalender dan menyerap <strong>25 tenaga kerja</strong> dari warga Desa.</p>

<h2>Dampak bagi Petani</h2>
<p>Jalan ini diharapkan dapat meningkatkan aksesibilitas petani di wilayah Timur yang selama ini menghadapi kesulitan saat musim hujan. Dari <strong>67 Kepala Keluarga</strong> yang terdampak, sekitar 45 KK merupakan petani pemilik lahan hortikultura.</p>
    `.trim(),
    category: "Berita",
    tags: ["pembangunan", "dana-desa", "pertanian"],
    author: { nama: "M. Natsir", role: "Kasi Keuangan" },
    published_at: "2026-05-01T07:30:00Z",
    updated_at: "2026-05-01T09:00:00Z",
    cover_image: "/images/berita-jalan.jpg",
    read_time: 3,
    featured: true,
    views: 218,
  },
  {
    id: "3",
    slug: "pendaftaran-bantuan-sosial-tahap-ii-2026",
    title: "Pendaftaran Bantuan Sosial Tahap II 2026 Resmi Dibuka",
    excerpt:
      "Warga Desa yang memenuhi kriteria dapat mendaftar bantuan sosial tahap II mulai 1 Juni hingga 15 Juni 2026.",
    content: `
<p>Wilayah Desa — Pemerintah Desa mengumumkan pembukaan pendaftaran bantuan sosial tahap II Tahun 2026. Pendaftaran dimulai <strong>1 Juni 2026</strong> dan berakhir pada <strong>15 Juni 2026</strong>.</p>

<h2>Syarat Penerima</h2>
<p>Bantuan sosial diperuntukkan bagi warga yang memenuhi kriteria berikut:</p>
<ul>
  <li>Kartu Keluarga (KK) aktif di Desa</li>
  <li>Terdata dalam DTKS (Data Terpadu Kesejahteraan Sosial)</li>
  <li>Tidak menerima bantuan sosial dari program lainnya</li>
  <li>Memiliki kartu identitas yang valid</li>
</ul>

<h2>Cara Pendaftaran</h2>
<p>Pendaftaran dapat dilakukan dengan dua cara:</p>
<ol>
  <li><strong>Offline</strong>: Datang langsung ke Kantor Desa dengan membawa fotokopi KK, KTP, dan surat keterangan tidak mampu dari rt/rw.</li>
  <li><strong>Online</strong>: Mengisi formulir di portal desa pada menu pelayanan.</li>
</ol>

<p>Untuk informasi lebih lanjut, silakan hubungi Kasi Kesejahteraan Rakyat Bapak M. Natsir di nomor 081234567893.</p>
    `.trim(),
    category: "Pengumuman",
    tags: ["bantuan-sosial", "pendaftaran", "dtks"],
    author: { nama: "Baiq Rahmawati", role: "Kasi Kesejahteraan Rakyat" },
    published_at: "2026-05-20T09:00:00Z",
    updated_at: "2026-05-20T09:00:00Z",
    cover_image: "/images/berita-bansos.jpg",
    read_time: 2,
    featured: false,
    views: 512,
  },
  {
    id: "4",
    slug: "festival-tenun-sasak-2026",
    title: "Festival Tenun Sasak 2026: Melestarikan Warisan Budaya Lombok",
    excerpt:
      "Festival Tenun Sasak akan diselenggarakan pada 17 Juni 2026 di Lapangan Desa. Agenda ini menampilkan lomba tenun, exhibition, dan bazar produk kerajinan.",
    content: `
<p>Wilayah Desa — Pemerintah Desa melalui kelompok pengrajin tenun akan mengadakan <strong>Festival Tenun Sasak 2026</strong> pada tanggal 17 Juni 2026 di Lapangan Desa.</p>

<h2>Rangkaian Kegiatan</h2>
<p>Festival yang dimulai pukul 14.00 WITA ini menyajikan berbagai kegiatan:</p>
<ul>
  <li><strong>Lomba Tenun Antar-Kelompok</strong> — mengikuti 8 kelompok tenun dari NTB</li>
  <li><strong>Exhibition Kerajinan</strong> — pameran dan demonstrasi tenun langsung</li>
  <li><strong>Bazar Produk Unggulan</strong> — penjualan kain tenun, keripik pisang, dan madu</li>
  <li><strong>Pentas Seni Budaya</strong> — tarian tradisional Sasak dan musik gamelan</li>
</ul>

<h2>Partisipasi Warga</h2>
<p>Diharapkan seluruh warga Desa dapat hadir dan mendukung kegiatan ini. Keluarga yang memiliki usaha tenun dapat mendaftarkan produknya sebagai peserta bazar melalui hubungi Kader Pemberdayaan Hj. Baiq Munawwaroh.</p>
    `.trim(),
    category: "Agenda",
    tags: ["festival", "budaya", "tenun", "kesehatan"],
    author: { nama: "Hj. Baiq Munawwaroh", role: "Kader Pemberdayaan" },
    published_at: "2026-04-25T10:00:00Z",
    updated_at: "2026-04-28T14:00:00Z",
    cover_image: "/images/berita-festival.jpg",
    read_time: 3,
    featured: false,
    views: 187,
  },
  {
    id: "5",
    slug: "posyandu-bayi-bulan-mei-2026",
    title: "Jadwal Posyandu Bulan Juni 2026 untuk Balita dan Lansia",
    excerpt:
      "Posyandu di 4 pos terbagi dalam 2 hari kegiatan. Balita dan lansia diminta hadir sesuai jadwal untuk pemeriksaan kesehatan rutin.",
    content: `
<p>Wilayah Desa — Petugas kesehatan Posyandu Desa mengumumkan jadwal kegiatan Posyandu bulan Juni 2026.</p>

<h2>Jadwal Setiap Pos</h2>
<ul>
  <li><strong>Posyandu Mawar (Dusun Timur)</strong> — Sabtu, 14 Juni 2026, pukul 09.00–11.00 WITA, di balaiRT 03</li>
  <li><strong>Posyandu Melati (Dusun Barat)</strong> — Jum'at, 13 Juni 2026, pukul 09.00–11.00 WITA, di balaiRT 01</li>
  <li><strong>Posyandu Kenanga (Dusun Utara)</strong> — Sabtu, 14 Juni 2026, pukul 09.00–11.00 WITA, di Pos Kesehatan Desa</li>
  <li><strong>Posyandu Anggrek (Dusun Selatan)</strong> — Jum'at, 13 Juni 2026, pukul 09.00–11.00 WITA, di balaiRT 06</li>
</ul>

<h2>Pelayanan yang Diberikan</h2>
<ul>
  <li>Penimbangan berat badan dan pengukuran tinggi badan balita</li>
  <li>Pemeriksaan kesehatan ibu hamil dan menyusui</li>
  <li>Pengukuran tekanan darah dan pemeriksaan kesehatan lansia</li>
  <li>Penyerahan vitamin dan suplemen bagi balita dan ibu hamil</li>
  <li>Konsultasi gizi dan pola makan sehat</li>
</ul>

<p>Warga yang memiliki balita atau lansia diimbau untuk hadir tepat waktu membawa buku kesehatan (KIA/KMS) masing-masing.</p>
    `.trim(),
    category: "Kesehatan",
    tags: ["posyandu", "kesehatan", "balita", "lansia"],
    author: { nama: "Siti Aminah", role: "Kader Kesehatan" },
    published_at: "2026-05-18T08:00:00Z",
    updated_at: "2026-05-18T08:00:00Z",
    cover_image: "/images/berita-posyandu.jpg",
    read_time: 2,
    featured: false,
    views: 94,
  },
  {
    id: "6",
    slug: "pelatihan-kewirausahaan-umkm-bumdes",
    title: "30 Warga Ikuti Pelatihan Kewirausahaan Berbasis Digital",
    excerpt:
      "Sebanyak 30 warga Desa mengikuti pelatihan kewirausahaan selama 3 hari. Pelatihan fokus pada pemasaran digital dan manajemen keuangan usaha.",
    content: `
<p>Wilayah Desa — Pemerintah Desa bekerja sama dengan DPMD Kabupaten menyelenggarakan <strong>Pelatihan Kewirausahaan Berbasis Digital</strong> bagi warga Desa. Kegiatan yang berlangsung selama 3 hari (27–29 April 2026) ini diikuti <strong>30 peserta</strong> dari berbagai kelompok usaha.</p>

<h2>Materi Pelatihan</h2>
<ul>
  <li>Analisis usaha dan studi kelayakan</li>
  <li>Pemasaran digital melalui media sosial (Instagram, TikTok Shop)</li>
  <li>Penyusunan laporan keuangan sederhana</li>
  <li>Branding dan pengemasan produk</li>
  <li>Akses permodalan melalui KUR dan Dana Desa</li>
</ul>

<h2>Hasil yang Diharapkan</h2>
<p>Peserta diharapkan dapat membuka usaha baru atau meningkatkan kapasitas usaha existing mereka. Setelah pelatihan, peserta akan mendapat pendampingan selama 3 bulan dari pendamping desa.</p>

<p>Kepala Desa H. Sumardi, S.Sos. menyampaikan apresiasinya: "Keterampilan digital sangat penting bagi pelaku UMKM di era modern. Saya berharap peserta dapat memanfaatkan ilmu ini dengan maksimal."</p>
    `.trim(),
    category: "Ekonomi",
    tags: ["pelatihan", "umkm", "digital", "bumdes"],
    author: { nama: "Baiq Rahmawati", role: "Kasi Kesejahteraan Rakyat" },
    published_at: "2026-04-30T07:00:00Z",
    updated_at: "2026-04-30T11:00:00Z",
    cover_image: "/images/berita-pelatihan.jpg",
    read_time: 3,
    featured: false,
    views: 156,
  },
];

export const CATEGORIES: ArticleCategory[] = [
  "Berita",
  "Pengumuman",
  "Agenda",
  "Budaya",
  "Ekonomi",
  "Kesehatan",
];

export function getArticleBySlug(slug: string): Article | null {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function getArticlesByCategory(category: ArticleCategory): Article[] {
  return ARTICLES.filter((a) => a.category === category);
}

export function getFeaturedArticles(): Article[] {
  return ARTICLES.filter((a) => a.featured);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = BULAN_ID[d.getMonth() + 1];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

const BULAN_ID: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

export function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  return formatDate(dateStr);
}
