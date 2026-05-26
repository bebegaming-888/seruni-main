import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { useMarketplaceStore, type MarketplaceItem } from "@/lib/content-store";
import { useCartStore } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Star,
  Tag,
  MapPin,
  ArrowRight,
  Store,
  Heart,
  X,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

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
  const store = useMarketplaceStore();
  const cart = useCartStore();
  const items = store.items;
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    store.load();
  }, [store]);

  function handleAddToCart(product: MarketplaceItem) {
    cart.addItem(product);
    toast.success(`${product.name} ditambahkan ke keranjang`);
  }

  function handleWhatsAppOrder() {
    if (cart.items.length === 0) return;
    const lines = cart.items.map(
      (i) =>
        `• ${i.product.name} x${i.quantity} — Rp ${(i.product.price * i.quantity).toLocaleString("id-ID")}`,
    );
    const total = cart.totalPrice().toLocaleString("id-ID");
    const text = encodeURIComponent(
      `Halo, saya ingin memesan produk UMKM:\n\n${lines.join("\n")}\n\nTotal: Rp ${total}\n\nMohon info cara pemesanan. Terima kasih!`,
    );
    window.open(`https://wa.me/6281234567890?text=${text}`, "_blank");
    setCartOpen(false);
  }

  // Inline ProductCard — renders a single product tile
  function ProductCard({ product }: { product: MarketplaceItem }) {
    return (
      <div className="group">
        <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-4 bg-muted">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 font-ui text-[10px] font-semibold">
              {product.category}
            </span>
          </div>
          {product.badge && (
            <div className="absolute top-3 right-3">
              <span
                className={`rounded-full px-2 py-0.5 font-ui text-[10px] font-semibold text-white ${product.badgeClass ?? "bg-warning"}`}
              >
                {product.badge}
              </span>
            </div>
          )}
        </div>
        <h3 className="font-display text-base font-bold text-ink mb-1 leading-snug">
          {product.name}
        </h3>
        <p className="font-ui text-xs text-muted-foreground mb-2">{product.seller_name}</p>
        <div className="flex items-center justify-between">
          <span className="font-body text-sm font-semibold text-ink">
            {product.price > 0
              ? `Rp ${product.price.toLocaleString("id-ID")}`
              : "Hubungi untuk harga"}
          </span>
          {product.price > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink text-background font-ui text-[10px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3 w-3" />
              Tambah
            </button>
          )}
        </div>
      </div>
    );
  }

  // Store-driven products, fallback to mock data if empty
  const MOCK_PRODUCTS: MarketplaceItem[] = [
    {
      id: "mock-1",
      name: `Kain Tenun ${villageName}`,
      price: 850000,
      unit: "meter",
      category: "Kerajinan",
      description: "Kain tenun tradisional dengan motif khas desa",
      image_url:
        "https://images.unsplash.com/photo-1574279603932-f29731b40abc?auto=format&fit=crop&q=80&w=800",
      stock: 24,
      seller_name: "Koperasi Tenun Maju",
      seller_wa: "081234567890",
      badge: "Best Seller",
      badgeClass: "bg-warning text-ink",
    },
    {
      id: "mock-2",
      name: `Madu Hutan ${villageName}`,
      price: 85000,
      unit: "botol 250ml",
      category: "Makanan",
      description: "Madu hutan murni dari lebah Trigona",
      image_url:
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800",
      stock: 48,
      seller_name: "Kelompok Tani Lestari",
      seller_wa: "081234567890",
      badge: "Organic",
      badgeClass: "bg-success text-white",
    },
    {
      id: "mock-3",
      name: "Kopi Arabika Pesisir",
      price: 45000,
      unit: "250g",
      category: "Minuman",
      description: "Kopi arabika specialty dari dataran tinggi pesisir",
      image_url:
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800",
      stock: 60,
      seller_name: "Kedai Kopi Desa",
      seller_wa: "081234567890",
      badge: "New",
      badgeClass: "bg-primary text-white",
    },
    {
      id: "mock-4",
      name: "Keripik Rumput Laut",
      price: 15000,
      unit: "pack",
      category: "Camilan",
      description: "Keripik rumput laut renyah dengan bumbu tradisional",
      image_url:
        "https://images.unsplash.com/photo-1599490659213-e2b9527bb087?auto=format&fit=crop&q=80&w=800",
      stock: 100,
      seller_name: `Ibu-ibu PKK ${villageName}`,
      seller_wa: "081234567890",
    },
  ];

  const products = items.length > 0 ? items : MOCK_PRODUCTS;

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto relative">
              <input
                type="text"
                placeholder="Cari produk UMKM..."
                className="w-full sm:flex-1 h-14 pl-6 pr-4 rounded-full border border-border bg-card shadow-sm focus:outline-none focus:border-warning/50 focus:ring-4 focus:ring-warning/10 font-ui text-sm"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="h-14 px-6 rounded-full bg-warning text-ink font-ui font-bold hover:opacity-90 transition-all flex-1 sm:flex-none">
                  Cari
                </button>
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative h-14 w-14 rounded-full bg-ink text-background flex items-center justify-center hover:opacity-90 transition-all shrink-0"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart.totalItems() > 0 && (
                    <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-warning text-ink text-[10px] font-bold flex items-center justify-center">
                      {cart.totalItems()}
                    </span>
                  )}
                </button>
              </div>
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
                <ProductCard key={product.id} product={product} />
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

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          {/* Drawer */}
          <div className="relative ml-auto w-full max-w-md h-full bg-card shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-ink">Keranjang</h2>
                  <p className="font-ui text-xs text-muted-foreground">{cart.totalItems()} item</p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="font-ui text-sm text-muted-foreground">Keranjang masih kosong</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Tambahkan produk untuk memulai pesanan
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-20 w-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display text-sm font-bold text-ink leading-snug">
                          {item.product.name}
                        </h4>
                        <p className="font-ui text-xs text-muted-foreground mt-0.5">
                          {item.product.unit}
                        </p>
                        <p className="font-body text-sm font-semibold text-ink mt-1">
                          Rp {item.product.price.toLocaleString("id-ID")}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                cart.updateQuantity(item.product.id, item.quantity - 1)
                              }
                              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-ui text-sm font-bold w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                cart.updateQuantity(item.product.id, item.quantity + 1)
                              }
                              className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => cart.removeItem(item.product.id)}
                            className="text-destructive/60 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div className="p-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-xl font-bold text-ink">
                    Rp {cart.totalPrice().toLocaleString("id-ID")}
                  </span>
                </div>
                <button
                  onClick={handleWhatsAppOrder}
                  className="w-full h-14 rounded-full bg-success text-white font-ui font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all"
                >
                  <MessageCircle className="h-5 w-5" />
                  Pesan via WhatsApp
                </button>
                <button
                  onClick={cart.clearCart}
                  className="w-full h-10 font-ui text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Kosongkan keranjang
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
