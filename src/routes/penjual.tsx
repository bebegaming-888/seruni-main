import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getSettings } from "@/lib/settings-store";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  MessageCircle,
  ChevronRight,
  Package,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Star,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { useOrdersStore, type OrderStatus } from "@/stores/orders-store";
import { buildWALink, buildStatusUpdateMessage } from "@/lib/order-wa";

export const Route = createFileRoute("/penjual")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Portal Penjual — Pasar Desa ${village.name}` },
        { name: "description", content: `Portal penjual di Pasar Desa ${village.name}` },
      ],
    };
  },
  component: () => <SellerPortal />,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment:       { label: "Menunggu Bayar",  color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3.5 w-3.5" /> },
  awaiting_confirmation:{ label: "Menunggu Konfirmasi", color: "bg-orange-100 text-orange-800", icon: <Clock className="h-3.5 w-3.5" /> },
  confirmed:            { label: "Dikonfirmasi",   color: "bg-blue-100 text-blue-800",        icon: <CheckCircle className="h-3.5 w-3.5" /> },
  processing:           { label: "Diproses",       color: "bg-purple-100 text-purple-800",   icon: <Clock className="h-3.5 w-3.5" /> },
  shipped:             { label: "Dikirim",        color: "bg-indigo-100 text-indigo-800",   icon: <Truck className="h-3.5 w-3.5" /> },
  completed:           { label: "Selesai",        color: "bg-green-100 text-green-800",    icon: <Star className="h-3.5 w-3.5" /> },
  cancelled:            { label: "Dibatalkan",     color: "bg-red-100 text-red-800",        icon: <XCircle className="h-3.5 w-3.5" /> },
};

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-800", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-ui font-semibold ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Order Card ──────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  sellerWa,
  onNextStatus,
}: {
  order: ReturnType<ReturnType<typeof useOrdersStore>["getOrdersBySeller"]>[0];
  sellerWa: string;
  onNextStatus: (orderId: string, newStatus: OrderStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Actions available for seller based on status
  const sellerActions: Partial<Record<string, { label: string; nextStatus: OrderStatus; color: string }>> = {
    confirmed:    { label: "Mulai Proses", nextStatus: "processing", color: "bg-purple-500 text-white" },
    processing:   { label: "Tandai Dikirim", nextStatus: "shipped", color: "bg-indigo-500 text-white" },
    shipped:      { label: "Tandai Selesai", nextStatus: "completed", color: "bg-green-500 text-white" },
  };

  const action = sellerActions[order.status];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 text-left hover:bg-muted/30 transition"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-sm font-bold text-ink">{order.orderId}</p>
              <StatusBadge status={order.status} />
            </div>
            <p className="font-ui text-xs text-muted-foreground mt-0.5">
              {order.buyerName} · {formatDate(order.createdAt)}
            </p>
            <p className="font-display text-sm font-bold text-primary mt-1">
              {formatRupiah(order.totalAmount)}
            </p>
            <p className="font-ui text-xs text-muted-foreground">
              {order.items.length} item · {order.paymentMethod === "bank_transfer" ? "Transfer" : "COD"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <a
              href={buildWALink(
                order.buyerWa,
                `Halo ${order.buyerName}, pesanan ${order.orderId} sedang kami proses.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-ui font-semibold hover:bg-green-600 transition"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Hubungi
            </a>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Buyer info */}
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">Pembeli</p>
            <p className="font-ui text-sm font-bold text-ink">{order.buyerName}</p>
            <p className="font-ui text-xs text-muted-foreground">{order.buyerWa}</p>
            <p className="font-ui text-xs text-muted-foreground flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              {order.buyerAddress}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">Barang</p>
            {order.items
              .filter((item) => item.sellerWa === sellerWa)
              .map((item) => (
                <div key={item.productId} className="flex items-start gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui text-sm font-semibold text-ink leading-tight">{item.productName}</p>
                    <p className="font-ui text-xs text-muted-foreground">
                      {item.quantity} × {formatRupiah(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-display text-sm font-bold text-primary shrink-0">
                    {formatRupiah(item.subtotal)}
                  </p>
                </div>
              ))}
          </div>

          {/* Seller action */}
          {action && (
            <Button
              onClick={() => onNextStatus(order.id, action.nextStatus)}
              className={`w-full rounded-2xl font-ui font-semibold py-2.5 ${action.color} hover:opacity-90 transition`}
            >
              {action.label}
            </Button>
          )}

          {/* Payment proof */}
          {order.paymentProofUrl && (
            <div className="rounded-xl border border-border overflow-hidden">
              <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2 bg-muted/50">
                Bukti Transfer
              </p>
              <img
                src={order.paymentProofUrl}
                alt="Bukti transfer"
                className="w-full max-h-48 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────────

function SellerPortal() {
  const ordersStore = useOrdersStore();
  const [sellerWa, setSellerWa] = useState("");
  const [searchWa, setSearchWa] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ordersStore.load();
  }, []);

  // Load orders when WA number is submitted
  const handleSearch = async () => {
    if (!searchWa.trim()) return;
    setIsSearching(true);
    setSellerWa(searchWa.trim());
    setIsSearching(false);
  };

  const sellerOrders = sellerWa
    ? ordersStore.getOrdersBySeller(sellerWa)
    : [];

  // Group by status
  const groupedOrders: Record<string, typeof sellerOrders> = {};
  for (const order of sellerOrders) {
    if (!groupedOrders[order.status]) groupedOrders[order.status] = [];
    groupedOrders[order.status].push(order);
  }

  const handleNextStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await ordersStore.updateStatus(orderId, newStatus);
    } catch (err) {
      console.error("[seller] updateStatus error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHero
        height="20vh"
        title="Portal Penjual"
        subtitle="Lihat dan kelola pesanan produk Anda"
      />

      <div className="max-w-lg mx-auto px-4 py-6 pb-12">
        {/* WA number search */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-primary" />
            <p className="font-ui text-sm font-bold text-ink">Masuk dengan Nomor WA</p>
          </div>
          <p className="font-ui text-xs text-muted-foreground mb-3">
            Masukkan nomor WhatsApp yang digunakan saat mendaftarkan produk Anda.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="08xxxxxxxxxx"
              value={searchWa}
              onChange={(e) => setSearchWa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-xl"
            />
            <Button
              onClick={handleSearch}
              className="rounded-xl bg-primary text-primary-foreground font-ui font-semibold shrink-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Orders list */}
        {sellerWa && (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-ui text-sm font-bold text-ink">
                {sellerOrders.length} pesanan ditemukan
              </p>
              <button
                onClick={() => setSellerWa("")}
                className="flex items-center gap-1 font-ui text-xs text-muted-foreground hover:text-ink transition"
              >
                <ArrowLeft className="h-3 w-3" />
                Ganti номер
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {Object.entries(STATUS_CONFIG).slice(0, 6).map(([status, cfg]) => {
                const count = groupedOrders[status]?.length ?? 0;
                return (
                  <div key={status} className={`rounded-2xl border border-border bg-card p-3 text-center ${count > 0 ? "border-primary/30" : ""}`}>
                    <p className={`font-display text-lg font-bold ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {count}
                    </p>
                    <p className="font-ui text-xs text-muted-foreground leading-tight mt-0.5">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Empty */}
            {sellerOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-ink">Belum ada pesanan</p>
                <p className="font-ui text-sm text-muted-foreground mt-1">
                  Pesanan untuk produk Anda akan muncul di sini setelah ada pembeli checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active orders first */}
                {(["confirmed","processing","shipped","awaiting_confirmation","pending_payment","completed","cancelled"] as const).map((status) => {
                  const orders = groupedOrders[status];
                  if (!orders || orders.length === 0) return null;
                  return (
                    <div key={status}>
                      <h3 className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {STATUS_CONFIG[status].label} ({orders.length})
                      </h3>
                      <div className="space-y-2">
                        {orders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            sellerWa={sellerWa}
                            onNextStatus={handleNextStatus}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}