import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { Link } from "@/components/Link";
import { PageHero } from "@/components/sections/PageHero";
import { useBumdesStore, useMarketplaceStore } from "@/lib/content-store";
import { useCartStore } from "@/lib/cart-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  ShoppingBag,
  Plus,
  Minus,
  MessageCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/ekonomi/bumdes")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `BUMDes — ${village.name}` },
        {
          name: "description",
          content: `Badan Usaha Milik Desa ${village.name}. Wisata, usaha, dan pemberdayaan ekonomi rakyat.`,
        },
      ],
    };
  },
  component: () => <BumdesPage />,
});

const PRODUK_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt, Utensils, TreePine, Package, Coffee: Utensils,
};
const STATS_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Store, TrendingUp, Users, Star,
};
const PELAYANAN_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TreePine, Store, Package, ShieldCheck, BarChart3,
};
const CATEGORY_COLORS: Record<string, string> = {
  Kerajinan: "bg-amber-100 text-amber-800",
  Makanan: "bg-orange-100 text-orange-800",
  Minuman: "bg-blue-100 text-blue-800",
  Camilan: "bg-pink-100 text-pink-800",
  Alam: "bg-green-100 text-green-800",
  Pertanian: "bg-lime-100 text-lime-800",
  Lainnya: "bg-gray-100 text-gray-800",
};

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function resolveIcon(name?: string, fallback: React.ComponentType<{ className?: string }> = Package) {
  return (name && PELAYANAN_ICON_MAP[name]) ? PELAYANAN_ICON_MAP[name] : fallback;
}

type ProductRow = {
  id: string; name: string; price: number; unit: string;
  category: string; description: string; seller_name: string;
  seller_wa: string; stock: number; icon?: string;
  badge?: string; badgeClass?: string;
};

export function BumdesPage() {
  const { village } = useSettings();
  const { items: bumdesData } = useBumdesStore();
  const { items: marketplaceItems } = useMarketplaceStore();
  const cart = useCartStore();

  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  const data = bumdesData.find((b) => b.key === "bumdes") ?? null;

  // Primary source: marketplace store (top 4)
  const marketplaceProducts: ProductRow[] = marketplaceItems.slice(0, 4).map((p) => ({
    id: p.id, name: p.name, price: p.price, unit: p.unit,
    category: p.category, description: p.description,
    seller_name: p.seller_name, seller_wa: p.seller_wa, stock: p.stock,
    icon: p.icon, badge: p.badge, badgeClass: p.badgeClass,
  }));

  // Fallback chain: marketplace → BUMDes produk_unggulan → hardcoded
  const produkItems: ProductRow[] = marketplaceProducts.length
    ? marketplaceProducts
    : data?.produk_unggulan?.length
      ? data.produk_unggulan.map((p) => ({
          id: p.id, name: p.nama,
          price: parseInt(String(p.harga).replace(/[^0-9]/g, ""), 10) || 0,
          unit: p.satuan, category: p.kategori, description: p.desc,
          seller_name: village.name, seller_wa: village.whatsapp, stock: 99,
          icon: p.icon, badge: p.badge, badgeClass: p.badgeClass,
        }))
      : [
          { id: "fb-1", name: "Kain Tenun Sasak Premium", price: 450000, unit: "lembar", category: "Kerajinan", description: "Tenun tangan tradisional Sasak motifs authentically from Lombok.", seller_name: village.name, seller_wa: village.whatsapp, stock: 15, icon: "Shirt", badge: "Best Seller", badgeClass: "bg-primary/15 text-primary border-primary/30" },
          { id: "fb-2", name: "Kripik Pisang Org. Khas NTB", price: 35000, unit: "pack 250g", category: "Makanan", description: "Pisang kepok pilihan digoreng renyah tanpa pengawet.", seller_name: village.name, seller_wa: village.whatsapp, stock: 80, icon: "Utensils", badge: "Best Seller", badgeClass: "bg-primary/15 text-primary border-primary/30" },
          { id: "fb-3", name: "Madu Hutan Murni", price: 120000, unit: "500ml", category: "Alam", description: "Madu liar dari hutan Mangge Lombok Timur, 100% natural.", seller_name: village.name, seller_wa: village.whatsapp, stock: 20, icon: "TreePine", badge: null, badgeClass: "" },
          { id: "fb-4", name: "Kopi Robusta Lokal", price: 75000, unit: "250g", category: "Minuman", description: "Biji kopi robusta pilihan dari kebun desa, disangrai segar.", seller_name: village.name, seller_wa: village.whatsapp, stock: 0, icon: "Package", badge: "Habis", badgeClass: "bg-muted text-muted-foreground" },
        ];

  const statsItems = data?.stats?.length
    ? data.stats
    : [
        { label: "Unit Usaha", value: "6", icon: "Store" },
        { label: "Omzet Tahunan", value: "Rp 1,2 M", icon: "TrendingUp" },
        { label: "Karyawan Tetap", value: "23", icon: "Users" },
        { label: "Warga Terlibat", value: "147", icon: "Star" },
      ];

  const pelayananItems = data?.unit_usaha?.length
    ? data.unit_usaha.map((u: string, i: number) => {
        const iconKeys = ["TreePine", "Store", "Package", "ShieldCheck", "BarChart3"];
        return { title: u, icon: iconKeys[i % iconKeys.length] as string, desc: "Unit usaha aktif BUMDes." };
      })
    : [
        { title: "Wisata Air Terjun", icon: "TreePine", desc: "Objek wisata alam air terjun dengan fasilitas pos, kantin, dan guide lokal." },
        { title: "Pasar Desa Mingguan", icon: "Store", desc: "Pasar tradisional setiap hari Minggu, wadah ekonomi warga dan UMKM lokal." },
        { title: "Pengelolaan Sampah", icon: "Package", desc: "Bank sampah dan pengelolaan sampah organik menjadi kompos untuk pertanian." },
        { title: "Koperasi Desa", icon: "ShieldCheck", desc: "Simpan pinjam, tabungan, dan pembiayaan mikro bagi warga desa." },
        { title: "Embung & Irigasi", icon: "BarChart3", desc: "Pengelolaan sumber daya air untuk pertanian warga." },
      ];

  const buildWALink = (product: ProductRow, qty: number): string => {
    const waNum = product.seller_wa.startsWith("0")
      ? "62" + product.seller_wa.slice(1)
      : product.seller_wa;
    const msg = encodeURIComponent(
      `Halo, saya ingin memesan:\n- ${product.name} x ${qty} ${product.unit}\n- Total: ${formatRupiah(product.price * qty)}\n\nMohon info ketersediaan. Terima kasih!`,
    );
    return `https://wa.me/${waNum}?text=${msg}`;
  };

  const openProductDetail = (product: ProductRow) => {
    setSelectedProduct(product);
    setDetailQty(1);
    setProductSheetOpen(true);
  };

  const handleAddToCart = (product: ProductRow, qty: number) => {
    cart.addItem({
      id: product.id, name: product.name, price: product.price, unit: product.unit,
      category: product.category, description: product.description,
      image_url: "", stock: product.stock,
      seller_name: product.seller_name, seller_wa: product.seller_wa,
      badge: product.badge, badgeClass: product.badgeClass, icon: product.icon,
    } as Parameters<typeof cart.addItem>[0]);
    setProductSheetOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="BUMDes"
          titleSecond="Desa"
          description="Badan Usaha Milik Desa — wisata, usaha, dan pemberdayaan ekonomi rakyat."
          badge="Badan Usaha Milik Desa"
          badgeIcon={<Store className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Ekonomi" }, { label: "BUMDes" }]}
        />

        {/* Stats */}
        <section className="px-4 -mt-8 mb-14">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statsItems.map((s) => {
              const Icon = STATS_ICON_MAP[s.icon] ?? Store;
              return (
                <div key={s.label} className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
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
                BUMDes {village.name} didirikan tahun 2019 berdasarkan Undang-Undang Desa No.
                6/2014. Unit usaha kami lahir dari potensi lokal — mulai dari wisata alam, kerajinan
                tenun, hingga pengelolaan hasil bumi di wilayah {village.name}.
              </p>
              <p className="font-body text-muted-foreground leading-relaxed">
                Saat ini BUMDes mengelola 6 unit usaha dengan 23 karyawan tetap dan melibatkan lebih
                dari 147 warga dalam program ekonomi kreatif dan pemberdayaan.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold mb-4">Unit Usaha Aktif</h3>
              <div className="space-y-3">
                {pelayananItems.map((u) => {
                  const Icon = resolveIcon(u.icon);
                  return (
                    <div key={u.title} className="flex items-start gap-3 font-ui text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-ink">{u.title}</span>
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-0.5 leading-relaxed">{u.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Produk Unggulan */}
        <section id="produk" className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Produk &amp; Jasa
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">Produk Unggulan Desa</h2>
              </div>
              <Link
                to="/ekonomi/marketplace"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {produkItems.map((p) => {
                const Icon = (p.icon && PRODUK_ICON_MAP[p.icon]) ? PRODUK_ICON_MAP[p.icon] : Package;
                const catColor = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS["Lainnya"];
                const outOfStock = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition group cursor-pointer ${outOfStock ? "opacity-70" : ""}`}
                    onClick={() => openProductDetail(p)}
                  >
                    <div className="h-40 bg-gradient-to-br from-muted/50 to-cream/50 flex items-center justify-center relative">
                      <Icon className="h-12 w-12 text-primary/40" />
                      {p.badge && (
                        <span className={`absolute top-3 left-3 text-[9px] font-ui font-semibold px-2 py-0.5 rounded-full border ${p.badgeClass}`}>
                          {p.badge}
                        </span>
                      )}
                      {outOfStock && (
                        <span className="absolute top-3 right-3 text-[9px] font-ui font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Habis
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`text-[9px] font-ui font-bold px-1.5 py-0.5 rounded-full ${catColor}`}>
                          {p.category}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-ink leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="font-body text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                        {p.description}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-display text-lg font-bold text-primary leading-none">
                            {formatRupiah(p.price)}
                          </p>
                          <p className="font-ui text-[10px] text-muted-foreground">/{p.unit}</p>
                        </div>
                        <button className="h-8 w-8 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Mobile CTA */}
            <div className="mt-6 text-center sm:hidden">
              <Link
                to="/ekonomi/marketplace"
                className="inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline"
              >
                Lihat Semua Produk <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Layanan Unit Usaha */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Layanan
              </p>
              <h2 className="font-display text-3xl font-bold text-ink">Unit Usaha BUMDes</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pelayananItems.map((p) => {
                const Icon = resolveIcon(p.icon);
                return (
                  <div key={p.title} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group">
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
                    Untuk kerja sama, pembelian produk, atau informasi lainnya, silakan hubungi kami.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: MapPin, text: village.address },
                    { icon: Phone, text: village.whatsapp },
                    { icon: Store, text: village.email },
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

      {/* Product Detail Sheet */}
      <Sheet open={productSheetOpen} onOpenChange={setProductSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedProduct && (() => {
            const Icon = (selectedProduct.icon && PRODUK_ICON_MAP[selectedProduct.icon]) ? PRODUK_ICON_MAP[selectedProduct.icon] : Package;
            const catColor = CATEGORY_COLORS[selectedProduct.category] ?? CATEGORY_COLORS["Lainnya"];
            const outOfStock = selectedProduct.stock === 0;
            return (
              <>
                <SheetHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-full ${catColor}`}>
                      {selectedProduct.category}
                    </span>
                    <button onClick={() => setProductSheetOpen(false)} className="p-1 hover:bg-muted rounded-full">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <SheetTitle className="text-left leading-snug">{selectedProduct.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground text-left">
                    Dijual oleh <strong>{selectedProduct.seller_name}</strong>
                  </p>
                </SheetHeader>

                <div className="h-48 bg-gradient-to-br from-muted/50 to-cream/50 flex items-center justify-center rounded-2xl mb-4 relative">
                  <Icon className="h-16 w-16 text-primary/40" />
                  {selectedProduct.badge && (
                    <span className={`absolute top-3 left-3 text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${selectedProduct.badgeClass}`}>
                      {selectedProduct.badge}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="font-display text-3xl font-bold text-primary">
                    {formatRupiah(selectedProduct.price)}
                  </div>
                  <div className="font-ui text-sm text-muted-foreground">per {selectedProduct.unit}</div>
                </div>

                <div className="mb-4">
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-muted/50">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-ui text-xs font-semibold ${outOfStock ? "text-destructive" : "text-success"}`}>
                    {outOfStock ? "Stok habis" : `Tersedia: ${selectedProduct.stock} ${selectedProduct.unit}`}
                  </span>
                </div>

                {!outOfStock && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-ui text-sm font-semibold text-ink">Jumlah</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))} className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-display font-bold text-lg w-10 text-center">{detailQty}</span>
                      <button onClick={() => setDetailQty((q) => Math.min(selectedProduct.stock, q + 1))} className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!outOfStock && (
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="font-ui text-sm text-muted-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-primary">
                      {formatRupiah(selectedProduct.price * detailQty)}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  {!outOfStock && (
                    <button
                      onClick={() => handleAddToCart(selectedProduct, detailQty)}
                      className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Tambah ke Keranjang
                    </button>
                  )}
                  <a
                    href={buildWALink(selectedProduct, detailQty)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-2xl bg-[#25D366] text-white font-ui text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#22c55e] transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Pesan via WhatsApp
                  </a>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}