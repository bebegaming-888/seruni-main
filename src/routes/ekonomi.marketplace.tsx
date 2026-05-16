import { createFileRoute } from "@tanstack/react-router";
import { useSettings } from "@/lib/settings-store";
import { getSettings } from "@/lib/settings-store";
import { useMarketplaceStore, useMarketplaceConfigStore } from "@/lib/content-store";
import { useCartStore } from "@/lib/cart-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Star,
  Package,
  X,
  Zap,
  MapPin,
  ShoppingCart,
  Home,
  LayoutGrid,
  User,
  ChevronRight,
  Timer,
  Tag,
  TagIcon,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import type { MarketplaceItem } from "@/lib/content-store";

export const Route = createFileRoute("/ekonomi/marketplace")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Pasar Desa ${village.name} — Marketplace` },
        {
          name: "description",
          content: `Pasar desa ${village.name} — beli produk lokal langsung dari penjual.`,
        },
      ],
    };
  },
  component: () => <MarketplacePage />,
});

// ── Icon maps ────────────────────────────────────────────────────────────────

const PRODUK_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt: Tag, Package, Coffee, Apple, Leaf, Star, Utensils: Tag, TreePine: Package,
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
const SHORTCUT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt: Tag, Package, Coffee, Zap, Apple: Leaf, Leaf: Star,
  Utensils: Tag, TreePine: Package, Star,
};

// ── Formatting ──────────────────────────────────────────────────────────────

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return n.toLocaleString("id-ID");
}
function formatRupiahFull(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function formatRupiahSlash(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ── Countdown timer ──────────────────────────────────────────────────────────

function FlashSaleTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!endTime) return;
    const calc = () => {
      const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const expired = timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;

  if (expired) return null;

  return (
    <div className="flex items-center gap-1 font-display font-bold text-primary">
      <Timer className="h-3.5 w-3.5" />
      <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">{pad(timeLeft.h)}</span>
      <span className="text-primary font-bold">:</span>
      <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">{pad(timeLeft.m)}</span>
      <span className="text-primary font-bold">:</span>
      <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">{pad(timeLeft.s)}</span>
    </div>
  );
}

// ── Bottom Nav Item ───────────────────────────────────────────────────────────

function BottomNavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 relative ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="font-ui text-[10px] font-semibold">{label}</span>
      {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full" />}
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function MarketplacePage() {
  const { village } = useSettings();
  const { items: marketplaceItems, load: loadMarketplace, initFromMocks: initMarketplaceMocks } = useMarketplaceStore();
  const {
    items: configItems,
    load: loadConfig,
    initFromMocks: initConfigMocks,
  } = useMarketplaceConfigStore();
  const cart = useCartStore();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [bottomNav, setBottomNav] = useState<"home" | "kategori" | "cart" | "akun">("home");
  const [storesLoaded, setStoresLoaded] = useState(false);

  const initRef = useRef(false);

  // ── Initialize stores once on mount ─────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    Promise.all([loadMarketplace(), loadConfig()]).then(() => {
      setStoresLoaded(true);
    });
  }, [loadMarketplace, loadConfig]);

  const config = configItems.find((c) => c.key === "marketplace_config") ?? null;

  // Shortcuts: real data or empty array (no mock)
  const shortcuts = config?.categoryShortcuts ?? [];

  // Flash sale config
  const flashSaleEnabled = config?.flashSaleEnabled ?? false;
  const flashSaleLabel = config?.flashSaleLabel ?? "Flash Sale";
  const flashSaleEnd = config?.flashSaleEndTime ?? null;
  const shopBadge = config?.shopBadge ?? "Pasar Desa";
  const trustNote = config?.trustNote ?? "";

  // Filtered products
  const filtered = useMemo(() => {
    let result = marketplaceItems;
    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.seller_name.toLowerCase().includes(q),
      );
    }
    return result;
  }, [marketplaceItems, selectedCategory, searchQ]);

  // Categories available in product store
  const availableCategories = useMemo(() => {
    return [...new Set(marketplaceItems.map((i) => i.category))].sort();
  }, [marketplaceItems]);

  // Flash sale items: products with discount field set
  const flashSaleItems = useMemo(() => {
    return marketplaceItems
      .filter((p) => p.stock > 0 && (p.discount ?? 0) > 0)
      .slice(0, 4);
  }, [marketplaceItems]);

  // Product with discount badge for display
  const flashSaleDisplayItems = useMemo(() => {
    if (flashSaleItems.length > 0) return flashSaleItems;
    // Fallback: show products with discount > 0 if any
    return marketplaceItems.filter((p) => (p.discount ?? 0) > 0).slice(0, 4);
  }, [flashSaleItems, marketplaceItems]);

  const totalItems = cart.totalItems();
  const totalPrice = cart.totalPrice();

  const buildWALink = (product: MarketplaceItem, qty: number): string => {
    const waNum = product.seller_wa.startsWith("0")
      ? "62" + product.seller_wa.slice(1)
      : product.seller_wa;
    const msg = encodeURIComponent(
      `Halo, saya ingin memesan:\n- ${product.name} x ${qty} ${product.unit}\n- Total: ${formatRupiahFull(product.price * qty)}\n\nMohon info ketersediaan. Terima kasih!`,
    );
    return `https://wa.me/${waNum}?text=${msg}`;
  };

  const buildCartWALink = (): string => {
    if (!cart.items.length) return "#";
    const lines = cart.items.map(
      (i) => `- ${i.product.name} x ${i.quantity} ${i.product.unit}`,
    ).join("\n");
    const waNum = cart.items[0].product.seller_wa.startsWith("0")
      ? "62" + cart.items[0].product.seller_wa.slice(1)
      : cart.items[0].product.seller_wa;
    const msg = encodeURIComponent(
      `Halo, saya ingin memesan:\n${lines}\n\nTotal: ${formatRupiahFull(totalPrice)}\n\nMohon info ketersediaan. Terima kasih!`,
    );
    return `https://wa.me/${waNum}?text=${msg}`;
  };

  const handleAddToCart = (product: MarketplaceItem, qty: number) => {
    cart.addItem(product);
    setDetailQty(1);
    setSelectedProduct(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Sticky Search Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-primary shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Brand mark */}
            <div className="shrink-0">
              <div className="h-9 w-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>

            {/* Search bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={`Cari di Pasar ${village.name}...`}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white text-sm text-foreground placeholder:text-muted-foreground/60 border-0 outline-none focus:ring-2 focus:ring-white/30 transition"
              />
            </div>

            {/* Cart icon */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0"
            >
              <ShoppingBag className="h-5 w-5 text-primary-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Category chip row */}
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 px-3 py-1 rounded-full font-ui text-[11px] font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-white text-primary"
                  : "bg-primary-foreground/20 text-primary-foreground/80 hover:bg-white/20"
              }`}
            >
              Semua
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full font-ui text-[11px] font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-white text-primary"
                    : "bg-primary-foreground/20 text-primary-foreground/80 hover:bg-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="pb-24">
        {/* ── Category Shortcuts ─────────────────────────────────────────────── */}
        {shortcuts.length > 0 && (
          <section className="bg-white border-b border-border/50">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {shortcuts.map((s) => {
                  const Icon = SHORTCUT_ICON_MAP[s.icon] ?? Package;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedCategory(s.category);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-ui text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center leading-tight">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Flash Sale Section ─────────────────────────────────────────────── */}
        {flashSaleEnabled && flashSaleDisplayItems.length > 0 && flashSaleEnd && (
          <section className="px-4 mt-4">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary fill-primary" />
                  <h2 className="font-display text-lg font-bold text-ink">{flashSaleLabel}</h2>
                  <FlashSaleTimer endTime={flashSaleEnd} />
                </div>
                <button className="flex items-center gap-1 font-ui text-xs font-semibold text-primary hover:text-primary/80 transition">
                  Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Horizontal scroll products */}
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
                {flashSaleDisplayItems.map((p) => {
                  const Icon = (p.icon && PRODUK_ICON_MAP[p.icon]) ? PRODUK_ICON_MAP[p.icon] : Package;
                  const discount = p.discount ?? 0;
                  const originalPrice = Math.round(p.price * (100 + discount) / 100);

                  return (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setDetailQty(1); }}
                      className="shrink-0 w-32 sm:w-36 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition cursor-pointer"
                    >
                      <div className="h-28 bg-gradient-to-br from-primary/5 to-cream/50 flex items-center justify-center relative">
                        <Icon className="h-10 w-10 text-primary/40" />
                        {discount > 0 && (
                          <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                            -{discount}%
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-display text-base font-bold text-primary leading-none">
                          {formatRupiahSlash(p.price)}
                        </p>
                        {discount > 0 && (
                          <p className="font-ui text-[10px] text-muted-foreground line-through">
                            {formatRupiahSlash(originalPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Trust Banner ─────────────────────────────────────────────────────── */}
        {trustNote && (
          <section className="px-4 mt-4 mb-3">
            <div className="max-w-5xl mx-auto">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-[10px] font-bold">PD</span>
                </div>
                <div className="flex-1">
                  <p className="font-ui text-xs font-bold text-primary">{shopBadge}</p>
                  <p className="font-ui text-[10px] text-muted-foreground">{trustNote}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Product Grid ─────────────────────────────────────────────────────── */}
        <section className="px-4 mb-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-ink">
                Semua Produk
                <span className="font-ui text-xs font-normal text-muted-foreground ml-2">
                  ({filtered.length} item)
                </span>
              </h2>
              {searchQ && (
                <span className="font-ui text-xs text-muted-foreground">
                  Hasil: "{searchQ}"
                </span>
              )}
            </div>

            {/* Empty state */}
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-ink">
                  {marketplaceItems.length === 0
                    ? "Belum ada produk di pasar ini"
                    : "Tidak ada produk ditemukan"}
                </p>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {marketplaceItems.length === 0
                    ? "Tambahkan produk melalui halaman Admin CMS."
                    : "Coba kata kunci atau kategori berbeda."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map((product) => {
                  const Icon =
                    (product.icon && PRODUK_ICON_MAP[product.icon])
                      ? PRODUK_ICON_MAP[product.icon]
                      : Package;
                  const catColor =
                    CATEGORY_COLORS[product.category] ||
                    CATEGORY_COLORS["Lainnya"];
                  const outOfStock = product.stock === 0;
                  const discount = product.discount ?? 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setDetailQty(1);
                      }}
                      className={`rounded-2xl border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition group cursor-pointer ${
                        outOfStock ? "opacity-60" : ""
                      }`}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-gradient-to-br from-muted/40 to-cream/50 flex items-center justify-center relative p-4">
                        <Icon className="h-14 w-14 text-primary/35" />
                        {product.badge && (
                          <span
                            className={`absolute top-2 left-2 text-[9px] font-ui font-semibold px-1.5 py-0.5 rounded-full border ${product.badgeClass}`}
                          >
                            {product.badge}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                            -{discount}%
                          </span>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="font-ui text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-full">
                              Habis
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <span
                          className={`inline-block text-[9px] font-ui font-bold px-1.5 py-0.5 rounded-full mb-1.5 ${catColor}`}
                        >
                          {product.category}
                        </span>

                        <h3 className="font-display text-xs font-bold text-ink leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>

                        {/* Price row */}
                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className="font-display text-sm font-bold text-primary leading-none">
                            {formatRupiahSlash(product.price)}
                          </span>
                          {discount > 0 && (
                            <span className="font-ui text-[9px] text-muted-foreground line-through">
                              {formatRupiahSlash(Math.round(product.price * (100 + discount) / 100))}
                            </span>
                          )}
                        </div>

                        {/* Seller */}
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="h-2.5 w-2.5 text-muted-foreground/50" />
                          <span className="font-ui text-[10px] text-muted-foreground truncate max-w-[80%]">
                            {product.seller_name}
                          </span>
                        </div>

                        {/* Stock pill */}
                        <span
                          className={`inline-block text-[9px] font-ui font-semibold px-1.5 py-0.5 rounded-full ${
                            outOfStock
                              ? "bg-muted text-muted-foreground"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {outOfStock ? "Habis" : `Stok ${product.stock}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-elev">
        <div className="max-w-5xl mx-auto flex items-center justify-around">
          <BottomNavItem
            icon={Home}
            label="Beranda"
            active={bottomNav === "home"}
            onClick={() => setBottomNav("home")}
          />
          <BottomNavItem
            icon={LayoutGrid}
            label="Kategori"
            active={bottomNav === "kategori"}
            onClick={() => setBottomNav("kategori")}
          />
          <BottomNavItem
            icon={ShoppingCart}
            label="Keranjang"
            badge={totalItems}
            active={bottomNav === "cart"}
            onClick={() => {
              setBottomNav("cart");
              setCartOpen(true);
            }}
          />
          <BottomNavItem
            icon={User}
            label="Akun"
            active={bottomNav === "akun"}
            onClick={() => setBottomNav("akun")}
          />
        </div>
      </nav>

      {/* ── Product Detail Sheet ─────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedProduct}
        onOpenChange={(v) => !v && setSelectedProduct(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedProduct && (() => {
            const Icon =
              (selectedProduct.icon && PRODUK_ICON_MAP[selectedProduct.icon])
                ? PRODUK_ICON_MAP[selectedProduct.icon]
                : Package;
            const catColor =
              CATEGORY_COLORS[selectedProduct.category] ||
              CATEGORY_COLORS["Lainnya"];
            const outOfStock = selectedProduct.stock === 0;
            const discount = selectedProduct.discount ?? 0;
            const originalPrice = Math.round(
              selectedProduct.price * (100 + discount) / 100,
            );

            return (
              <>
                <SheetHeader className="pb-2 space-y-1">
                  <div className="flex items-center justify-between pt-2">
                    <span
                      className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-full ${catColor}`}
                    >
                      {selectedProduct.category}
                    </span>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="p-1.5 hover:bg-muted rounded-full"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <SheetTitle className="text-left leading-snug text-base">
                    {selectedProduct.name}
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span className="font-ui text-xs">
                        {selectedProduct.seller_name}
                      </span>
                    </div>
                  </SheetDescription>
                </SheetHeader>

                {/* Product image */}
                <div className="aspect-square bg-gradient-to-br from-primary/5 to-cream/50 flex items-center justify-center rounded-2xl mb-4 relative">
                  <Icon className="h-20 w-20 text-primary/40" />
                  {selectedProduct.badge && (
                    <span
                      className={`absolute top-3 left-3 text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${selectedProduct.badgeClass}`}
                    >
                      {selectedProduct.badge}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold text-primary">
                      {formatRupiahSlash(selectedProduct.price)}
                    </span>
                    <span className="font-ui text-xs text-muted-foreground">
                      /{selectedProduct.unit}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-ui text-xs text-muted-foreground line-through">
                        {formatRupiahSlash(originalPrice)}
                      </span>
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Hemat {discount}%
                      </span>
                    </div>
                  )}
                  {!outOfStock && (
                    <p className="font-ui text-xs text-success font-semibold mt-1">
                      Stok tersedia: {selectedProduct.stock}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h4 className="font-ui text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Deskripsi
                  </h4>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Quantity stepper */}
                {!outOfStock && (
                  <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-muted/50">
                    <span className="font-ui text-sm font-semibold text-ink">
                      Jumlah
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setDetailQty((q) => Math.max(1, q - 1))
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-display font-bold text-lg w-10 text-center">
                        {detailQty}
                      </span>
                      <button
                        onClick={() =>
                          setDetailQty((q) =>
                            Math.min(selectedProduct.stock, q + 1),
                          )}
                        className="h-9 w-9 rounded-full border border-border bg-white flex items-center justify-center hover:bg-muted transition"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Total */}
                {!outOfStock && (
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="font-ui text-sm text-muted-foreground">
                      Total
                    </span>
                    <span className="font-display text-xl font-bold text-primary">
                      {formatRupiahSlash(selectedProduct.price * detailQty)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  {!outOfStock && (
                    <button
                      onClick={() => handleAddToCart(selectedProduct, detailQty)}
                      className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Keranjang
                    </button>
                  )}
                  <a
                    href={buildWALink(selectedProduct, detailQty)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-2xl bg-[#25D366] text-white font-ui text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#22c55e] transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Pesan WA
                  </a>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Cart Sheet ────────────────────────────────────────────────────────── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col overflow-hidden"
        >
          <SheetHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <SheetTitle>Keranjang</SheetTitle>
            </div>
            <SheetDescription>
              {totalItems} item · {formatRupiahSlash(totalPrice)}
            </SheetDescription>
          </SheetHeader>

          {/* Items */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {cart.items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display font-bold text-ink">
                  Keranjang kosong
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Belanja produk lokal desa sekarang!
                </p>
              </div>
            ) : (
              cart.items.map((item) => {
                const Icon =
                  (item.product.icon && PRODUK_ICON_MAP[item.product.icon])
                    ? PRODUK_ICON_MAP[item.product.icon]
                    : Package;
                return (
                  <div
                    key={item.product.id}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-border bg-card"
                  >
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-muted/40 to-cream/50 flex items-center justify-center shrink-0">
                      <Icon className="h-7 w-7 text-primary/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-sm text-ink leading-tight mb-0.5 truncate">
                        {item.product.name}
                      </h4>
                      <p className="font-ui text-xs text-muted-foreground">
                        {formatRupiahSlash(item.product.price)} /{" "}
                        {item.product.unit}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              cart.updateQuantity(
                                item.product.id,
                                item.quantity - 1,
                              )}
                            className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-display font-bold w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              cart.updateQuantity(
                                item.product.id,
                                item.quantity + 1,
                              )}
                            className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-display font-bold text-sm text-primary">
                          {formatRupiahSlash(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => cart.removeItem(item.product.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {cart.items.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-ui text-sm text-muted-foreground">
                  Total
                </span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatRupiahSlash(totalPrice)}
                </span>
              </div>
              <Link
                to="/ekonomi/checkout"
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                <ArrowRight className="h-4 w-4" />
                Checkout — Pesan Sekarang
              </Link>
              <button
                onClick={() => cart.clearCart()}
                className="w-full py-2.5 rounded-2xl border border-border font-ui text-xs font-semibold text-muted-foreground hover:bg-muted transition"
              >
                Kosongkan Keranjang
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}