import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { useSettings, getSettings } from "@/lib/settings-store";

import { ShoppingBag, Star, Tag, MapPin, ArrowRight, Store, Heart } from "lucide-react";

export const Route = createFileRoute("/wisata/umkm")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `UMKM & Produk Unggulan — ${v.village}` },
        {
          name: "description",
          content: `Dukung ekonomi lokal dengan membeli produk-produk unggulan UMKM ${v.village}.`,
        },
      ],
    };
  },
  component: () => <UMKMPage />,
});

export function UMKMPage() {
  const { village: villageName } = useVillage();

  // Inline ProductCard — renders a single product tile
  function ProductCard({ product }: { product: (typeof products)[number] }) {
    return (
      <div className="group cursor-pointer">
        <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-4 bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 font-ui text-[10px] font-semibold">
              {product.category}
            </span>
          </div>
        </div>
        <h3 className="font-display text-base font-bold text-ink mb-1 leading-snug">
          {product.name}
        </h3>
        <p className="font-ui text-xs text-muted-foreground mb-2">{product.seller}</p>
        <div className="flex items-center justify-between">
          <span className="font-body text-sm font-semibold text-ink">{product.price}</span>
          <div className="flex items-center gap-1 text-warning">
            <Star className="h-3 w-3 fill-warning" />
            <span className="font-ui text-xs font-semibold">{product.rating}</span>
          </div>
        </div>
      </div>
    );
  }

  const products = [
    {
      id: "1",
      name: `Kain Tenun ${villageName}`,
      price: "Rp 350.000 - 1.200.000",
      category: "Kerajinan",
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1574279603932-f29731b40abc?auto=format&fit=crop&q=80&w=800",
      seller: "Koperasi Tenun Maju",
    },
    {
      id: "2",
      name: `Madu Hutan ${villageName}`,
      price: "Rp 85.000",
      category: "Makanan",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800",
      seller: "Kelompok Tani Lestari",
    },
    {
      id: "3",
      name: "Kopi Arabika Pesisir",
      price: "Rp 45.000",
      category: "Minuman",
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800",
      seller: "Kedai Kopi Desa",
    },
    {
      id: "4",
      name: "Keripik Rumput Laut",
      price: "Rp 15.000",
      category: "Camilan",
      rating: 4.6,
      image:
        "https://images.unsplash.com/photo-1599490659213-e2b9527bb087?auto=format&fit=crop&q=80&w=800",
      seller: `Ibu-ibu PKK ${villageName}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-warning/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 border border-warning/20 px-3 py-1 font-ui text-xs font-semibold text-warning mb-6">
              <ShoppingBag className="h-3.5 w-3.5" />
              Ekonomi Lokal
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-6 tracking-tight">
              Produk Unggulan <span className="text-warning">Desa</span>
            </h1>
            <p className="font-body text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              Mendukung kreativitas dan kemandirian ekonomi masyarakat {villageName} melalui
              produk-produk berkualitas tinggi.
            </p>
            <div className="max-w-2xl mx-auto relative">
              <input
                type="text"
                placeholder="Cari produk UMKM..."
                className="w-full h-14 pl-6 pr-32 rounded-full border border-border bg-card shadow-sm focus:outline-none focus:border-warning/50 focus:ring-4 focus:ring-warning/10 font-ui text-sm"
              />
              <button className="absolute right-2 top-2 h-10 px-6 rounded-full bg-warning text-ink font-ui font-bold hover:opacity-90 transition-all">
                Cari
              </button>
            </div>
          </div>
        </section>

        {/* Featured Stores/UMKM */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="font-display text-3xl font-bold text-ink mb-2">
                  UMKM Terverifikasi
                </h2>
                <p className="font-body text-muted-foreground">
                  Daftar kelompok usaha dan perorangan yang telah mendapatkan pembinaan desa.
                </p>
              </div>
              <button className="font-ui text-sm font-bold text-warning flex items-center gap-2 hover:underline">
                Daftarkan UMKM Anda
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { name: `Tenun ${villageName}`, items: "12 Produk", icon: Tag },
                { name: `Madu ${villageName}`, items: "4 Produk", icon: Tag },
                { name: "Kopi Pesisir", items: "8 Produk", icon: Tag },
                { name: "Oleh-oleh", items: "24 Produk", icon: Tag },
              ].map((cat, i) => (
                <div
                  key={i}
                  className="p-6 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-center group cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-display text-base font-bold text-ink">{cat.name}</h4>
                  <p className="font-body text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    {cat.items}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-display text-3xl font-bold text-ink">Katalog Produk</h2>
              <div className="flex items-center gap-2 text-muted-foreground font-ui text-xs font-bold uppercase">
                Urutkan: <span className="text-ink">Terpopuler</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as (typeof products)[number]} />
              ))}
            </div>
            <div className="mt-16 text-center">
              <button className="btn-pill border border-border text-ink hover:bg-muted px-12">
                Lihat Selengkapnya
              </button>
            </div>
          </div>
        </section>

        {/* Local Support Banner */}
        <section className="px-4 mb-24">
          <div className="max-w-5xl mx-auto p-12 rounded-[3rem] bg-warning text-ink relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 p-8 opacity-5">
              <ShoppingBag className="h-48 w-48" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 relative z-10">
              Bela Beli Produk Desa
            </h2>
            <p className="font-body text-lg opacity-80 mb-8 max-w-xl relative z-10 leading-relaxed">
              Setiap rupiah yang Anda belanjakan untuk produk lokal membantu kesejahteraan puluhan
              keluarga di {villageName}.
            </p>
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-12 rounded-full border-4 border-warning bg-muted overflow-hidden"
                  >
                    <img
                      src={`https://i.pravatar.cc/100?u=${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="font-ui text-sm font-bold">Dukung +50 Pelaku UMKM</div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
