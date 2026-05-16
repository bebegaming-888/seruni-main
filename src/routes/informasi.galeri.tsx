import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useSettings, getSettings } from "@/lib/settings-store";
import { Camera, Image as ImageIcon, Filter, Maximize2 } from "lucide-react";
import { useState } from "react";
import { type GaleriItem, useGaleriStore } from "@/lib/content-store";
import { PageHero } from "@/components/sections/PageHero";
import galeriHero from "@/assets/galeri-1.jpg";

export const Route = createFileRoute("/informasi/galeri")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Galeri Foto — ${village.name}` },
        {
          name: "description",
          content: `Koleksi foto kegiatan dan pemandangan di ${village.name}.`,
        },
      ],
    };
  },
  component: () => <GaleriPage />,
});

function GaleriCard({ item }: { item: GaleriItem }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-card border border-border aspect-[4/3] cursor-pointer">
      <img
        src={item.url}
        alt={item.title}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-6 flex flex-col justify-end">
        <span className="font-ui text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
          {item.category || "Foto"}
        </span>
        <h3 className="font-display text-lg font-bold text-white leading-tight">{item.title}</h3>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <Maximize2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GaleriPage() {
  const { village } = useSettings();
  const items = useGaleriStore((state) => state.items);
  const [activeTab, setActiveTab] = useState("Semua");

  const categories = ["Semua", ...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items.filter((i) => activeTab === "Semua" || i.category === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Galeri"
          titleSecond="Desa"
          description="Momen berharga, keindahan alam, dan kemajuan pembangunan desa yang terekam dalam lensa."
          badge="Visual"
          badgeIcon={<Camera className="h-3.5 w-3.5" />}
          bgImage={galeriHero}
          breadcrumbs={[{ label: "Galeri" }]}
        />

        {/* Categories */}
        <section className="px-4 mb-8 -mt-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground mr-2 font-ui text-xs font-bold uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              Filter:
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat as string)}
                className={`px-4 py-2 rounded-full font-ui text-sm font-semibold transition-all shadow-sm ${
                  activeTab === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Content */}
        <section className="px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-20 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-display text-xl font-bold text-ink mb-2">
                  Belum ada foto di kategori ini
                </p>
                <button
                  onClick={() => setActiveTab("Semua")}
                  className="mt-6 font-ui text-sm font-bold text-primary hover:underline"
                >
                  Lihat Semua Foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => (
                  <GaleriCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
