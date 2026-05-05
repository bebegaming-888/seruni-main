import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Link } from "@/components/Link";
import {
  Store,
  TrendingUp,
  Package,
  Users,
  ArrowRight,
  Star,
  TreePine,
  Utensils,
  Shirt,
  ShieldCheck,
  BarChart3,
  MapPin,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/ekonomi/bumdes")({
  head: () => ({
    meta: [
      { title: `BUMDes Seruni Mumbul — ${VILLAGE.name}` },
      {
        name: "description",
        content:
          "Badan Usaha Milik Desa Seruni Mumbul. Wisata, usaha, dan pemberdayaan ekonomi rakyat.",
      },
    ],
  }),
  component: () => <BumdesPage />,
});

const PRODUK = [
  {
    nama: "Kain Tenun Sasak Premium",
    kategori: "Kerajinan",
    harga: "Rp 450.000",
    satuan: "/ lembar",
    desc: "Tenun tangan tradisional Sasak motifs authentically from Lombok.",
    icon: Shirt,
    badge: "Best Seller",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  {
    nama: "Kripik Pisang Org. Khas NTB",
    kategori: "Makanan",
    harga: "Rp 35.000",
    satuan: "/ pack 250g",
    desc: "Pisang kepok pilihan digoreng renyah tanpa pengawet.",
    icon: Utensils,
    badge: "Best Seller",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  {
    nama: "Madu Hutan Murni",
    kategori: "Alam",
    harga: "Rp 120.000",
    satuan: "/ 500ml",
    desc: "Madu liar dari hutan Mangge Lombok Timur, 100% natural.",
    icon: TreePine,
    badge: null,
    badgeClass: "",
  },
  {
    nama: "Kopi Robusta Lokal",
    kategori: "Minuman",
    harga: "Rp 75.000",
    satuan: "/ 250g",
    desc: "Biji kopi robusta pilihan dari kebun desa, disangrai segar.",
    icon: Package,
    badge: "New",
    badgeClass: "bg-info/15 text-info border-info/30",
  },
];

const STATS = [
  { label: "Unit Usaha", value: "6", icon: Store },
  { label: "Omzet Tahunan", value: "Rp 1,2 M", icon: TrendingUp },
  { label: "Karyawan Tetap", value: "23", icon: Users },
  { label: "Warga Terlibat", value: "147", icon: Star },
];

const PELAYANAN = [
  {
    icon: TreePine,
    title: "Wisata Air Terjun",
    desc: "Objek wisata alam air terjun dengan fasilitas pos守, kantin, dan guide lokal.",
  },
  {
    icon: Store,
    title: "Pasar Desa Mingguan",
    desc: "Pasar tradisional setiap hari Minggu, wadah ekonomi warga dan UMKM lokal.",
  },
  {
    icon: Package,
    title: "Pengelolaan Sampah",
    desc: "Bank sampah dan pengelolaan sampah organik menjadi kompos untuk pertanian.",
  },
  {
    icon: ShieldCheck,
    title: "Koperasi Desa",
    desc: "Simpan pinjam, tabungan, dan pembiayaan mikro bagi warga desa.",
  },
  {
    icon: BarChart3,
    title: "Embung & Irigasi",
    desc: "Pengelolaan sumber daya air untuk pertanian warga.",
  },
];

export function BumdesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Store className="h-3.5 w-3.5" />
              Badan Usaha Milik Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4 leading-tight">
              BUMDes
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base sm:text-lg leading-relaxed mb-8">
              Membangun kemandirian ekonomi desa melalui usaha produktif, pemberdayaan masyarakat,
              dan pemanfaatan potensi lokal untuk kesejahteraan bersama.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#produk"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-ui text-sm font-semibold hover:bg-primary-hover transition"
              >
                Lihat Produk <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/pelayanan/e-surat"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-ui text-sm font-semibold hover:bg-cream transition"
              >
                Ajukan Surat
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 -mt-8 mb-14">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border bg-card shadow-card p-5 text-center"
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-display text-2xl sm:text-3xl font-bold text-ink">{s.value}</p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tentang */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                Tentang BUMDes
              </p>
              <h2 className="font-display text-3xl font-bold text-ink mb-4 leading-tight">
                Membangun Ekonomi Desa dari Desa, Untuk Desa
              </h2>
              <p className="font-body text-muted-foreground leading-relaxed mb-4">
                BUMDes Seruni Mumbul didirikan tahun 2019 berdasarkan Undang-Undang Desa No.
                6/2014.-unit usaha kami lahir dari potensi lokal — mulai dari wisata alam, kerajinan
                tenun, hingga pengelolaan hasil bumi Lombok Timur.
              </p>
              <p className="font-body text-muted-foreground leading-relaxed">
                Saat ini BUMDes mengelola 6 unit usaha dengan 23 karyawan tetap dan melibatkan lebih
                dari 147 warga dalam program ekonomi kreatif dan pemberdayaan.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold mb-4">Unit Usaha Aktif</h3>
              <div className="space-y-3">
                {[
                  "BUMDes Wisata — Pengelolaan objek wisata",
                  "Pasar Desa — Pusat niaga warga",
                  "Bank Sampah — Lingkungan & ekonomi",
                  "Koperasi Seruni Sejahtera",
                  "Pengelolaan Embung Mumbul",
                  "Sentra Kerajinan Tenun",
                ].map((u) => (
                  <div key={u} className="flex items-center gap-3 font-ui text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    {u}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Produk */}
        <section id="produk" className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Produk & Jasa
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">Produk Unggulan Desa</h2>
              </div>
              <button className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRODUK.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.nama}
                    className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition group"
                  >
                    <div className="h-40 bg-gradient-to-br from-muted/50 to-cream/50 flex items-center justify-center relative">
                      <Icon className="h-12 w-12 text-primary/40" />
                      {p.badge && (
                        <span
                          className={`absolute top-3 left-3 text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${p.badgeClass}`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-ui text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        {p.kategori}
                      </p>
                      <h3 className="font-display font-bold text-ink leading-tight mb-1">
                        {p.nama}
                      </h3>
                      <p className="font-body text-xs text-muted-foreground mb-3 leading-relaxed">
                        {p.desc}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-display text-lg font-bold text-primary leading-none">
                            {p.harga}
                          </p>
                          <p className="font-ui text-[10px] text-muted-foreground">{p.satuan}</p>
                        </div>
                        <button className="h-8 w-8 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pelayanan */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Layanan
              </p>
              <h2 className="font-display text-3xl font-bold text-ink">6 Unit Usaha, 1 Misi</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PELAYANAN.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1.5">{p.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink mb-3">Hubungi Kami</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    Untuk kerja sama, pembelian produk, atau informasi lainnya, silakan hubungi
                    kami.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: MapPin,
                      text: "Jl. Raya Pringgabaya No. 88, Seruni Mumbul, Lombok Timur",
                    },
                    { icon: Phone, text: "+62 812-3456-7890" },
                    { icon: Store, text: "info@serunimumbul.desa.id" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 font-ui text-sm">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
