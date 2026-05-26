import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import {
  Sprout,
  TrendingUp,
  BarChart3,
  Map,
  Droplets,
  Sun,
  Wind,
  ChevronRight,
} from "lucide-react";
import { useKomoditasStore, type KomoditasItem } from "@/lib/content-store";
import { useEffect } from "react";

export const Route = createFileRoute("/lainnya/komoditas")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Potensi Komoditas — ${village.name}` },
        {
          name: "description",
          content: `Informasi mengenai potensi hasil bumi, perikanan, dan komoditas unggulan di ${village.name}.`,
        },
      ],
    };
  },
  component: () => <KomoditasPage />,
});

// COMMODITIES are now dynamic from store

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sprout,
  TrendingUp,
  BarChart3,
  Map,
  Droplets,
  Sun,
  Wind,
};

function CommodityCard({ item }: { item: KomoditasItem }) {
  const Icon = ICON_MAP[item.icon ?? ""] || Sprout;
  return (
    <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-8">
        <div
          className={`h-14 w-14 rounded-2xl bg-muted flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <span className="px-3 py-1 rounded-full bg-muted font-ui text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {item.status}
        </span>
      </div>
      <h3 className="font-display text-2xl font-bold text-ink mb-4">{item.name}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="font-body text-sm text-muted-foreground">Luas Lahan</span>
          <span className="font-ui text-sm font-bold text-ink">{item.area}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="font-body text-sm text-muted-foreground">Harga Saat Ini</span>
          <span className="font-ui text-sm font-bold text-ink">
            Rp {item.price.toLocaleString()}/{item.unit}
          </span>
        </div>
      </div>
      <button className="w-full mt-8 py-3 rounded-2xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all flex items-center justify-center gap-2 font-ui text-sm font-bold text-ink">
        Lihat Detail Potensi
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function KomoditasPage() {
  const { village } = useSettings();
  const store = useKomoditasStore();
  const items = store.items;

  useEffect(() => {
    store.load();
  }, [store]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Potensi"
          titleSecond="Komoditas"
          description={
            "Memetakan kekayaan sumber daya alam " +
            (village as { name?: string }).name +
            " sebagai modal pembangunan ekonomi."
          }
          badge="Kekayaan Alam"
          badgeIcon={<Sprout className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Lainnya" }, { label: "Komoditas" }]}
        />

        {/* Stats Overview */}
        <section className="px-4 -mt-10 mb-20">
          <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6">
            {[
              { label: "Sektor Pertanian", value: "65%", icon: BarChart3, color: "text-success" },
              { label: "Sektor Perikanan", value: "25%", icon: Droplets, color: "text-info" },
              { label: "Sektor Lainnya", value: "10%", icon: TrendingUp, color: "text-warning" },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-8 rounded-[2rem] bg-card border border-border shadow-lg flex items-center gap-6"
              >
                <div
                  className={`h-14 w-14 rounded-2xl bg-muted flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="h-7 w-7" />
                </div>
                <div>
                  <div className="font-ui text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {stat.label}
                  </div>
                  <div className="font-display text-3xl font-bold text-ink">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Commodity Grid */}
        <section className="py-12 px-4 mb-24">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-display text-3xl font-bold text-ink">Komoditas Utama</h2>
              <button className="flex items-center gap-2 font-ui text-sm font-bold text-primary hover:underline">
                <Map className="h-4 w-4" />
                Peta Sebaran Lahan
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {items.map((item) => (
                <CommodityCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* Investor Section */}
        <section className="px-4 mb-24">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-ink p-12 sm:p-16 text-background relative overflow-hidden">
            <div className="absolute bottom-0 right-0 p-12 opacity-10">
              <TrendingUp className="h-64 w-64" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
                Peluang Investasi
              </h2>
              <p className="font-body text-lg text-background/70 mb-10 leading-relaxed">
                Kami membuka peluang kerja sama bagi investor dan mitra bisnis untuk mengembangkan
                hilirisasi produk pertanian dan perikanan di {village.name}.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="btn-pill bg-primary text-primary-foreground font-ui font-bold hover:bg-primary px-8">
                  Dapatkan Profil Investasi
                </button>
                <button className="btn-pill bg-white/10 text-white font-ui font-bold hover:bg-white/20 px-8">
                  Hubungi BUMDes
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
