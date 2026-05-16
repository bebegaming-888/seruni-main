import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getSettings, useSettings } from "@/lib/settings-store";
import { useMarketplaceStore, useMarketplaceConfigStore } from "@/lib/content-store";
import { useCartStore } from "@/lib/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  MessageCircle,
  ShoppingBag,
  CreditCard,
  Truck,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { BankAccount } from "@/lib/order-wa";

export const Route = createFileRoute("/ekonomi/checkout")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Checkout — Pasar Desa ${village.name}` },
        { name: "description", content: `Checkout pesanan di Pasar Desa ${village.name}` },
      ],
    };
  },
  component: () => <CheckoutPage />,
});

// ── Types ────────────────────────────────────────────────────────────────────────

type CheckoutStep = "alamat" | "pembayaran" | "review";

interface BuyerInfo {
  name: string;
  wa: string;
  address: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

// ── Step 1: Alamat ─────────────────────────────────────────────────────────────

function AlamatStep({
  buyer,
  onChange,
  onNext,
}: {
  buyer: BuyerInfo;
  onChange: (b: BuyerInfo) => void;
  onNext: () => void;
}) {
  const [nameErr, setNameErr] = useState("");
  const [waErr, setWaErr] = useState("");
  const [addrErr, setAddrErr] = useState("");

  const handleNext = () => {
    let valid = true;
    if (!buyer.name.trim()) { setNameErr("Nama lengkap wajib diisi"); valid = false; }
    else setNameErr("");

    if (!buyer.wa.trim()) { setWaErr("Nomor WhatsApp wajib diisi"); valid = false; }
    else if (!/^[\d\s+]+$/.test(buyer.wa)) { setWaErr("Format nomor WA tidak valid"); valid = false; }
    else setWaErr("");

    if (!buyer.address.trim()) { setAddrErr("Alamat lengkap wajib diisi"); valid = false; }
    else if (buyer.address.trim().length < 20) { setAddrErr("Min. 20 karakter"); valid = false; }
    else setAddrErr("");

    if (valid) onNext();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
          1
        </div>
        <div>
          <p className="font-ui text-sm font-bold text-ink">Data Pengiriman</p>
          <p className="font-ui text-xs text-muted-foreground">Nama, WhatsApp, dan alamat lengkap</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="buyer-name">Nama Lengkap</Label>
          <Input
            id="buyer-name"
            placeholder="Nama lengkap sesuai KTP"
            value={buyer.name}
            onChange={(e) => { onChange({ ...buyer, name: e.target.value }); setNameErr(""); }}
            className="rounded-xl"
          />
          {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buyer-wa">No. WhatsApp</Label>
          <Input
            id="buyer-wa"
            placeholder="08xxxxxxxxxx"
            value={buyer.wa}
            onChange={(e) => { onChange({ ...buyer, wa: e.target.value }); setWaErr(""); }}
            className="rounded-xl"
          />
          {waErr && <p className="text-xs text-destructive">{waErr}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buyer-address">Alamat Lengkap</Label>
          <Textarea
            id="buyer-address"
            rows={3}
            placeholder="Nama jalan, RT/RW, Desa, Kecamatan, Kabupaten, Kode Pos"
            value={buyer.address}
            onChange={(e) => { onChange({ ...buyer, address: e.target.value }); setAddrErr(""); }}
            className="rounded-xl resize-none"
          />
          {addrErr && <p className="text-xs text-destructive">{addrErr}</p>}
        </div>
      </div>

      <Button
        onClick={handleNext}
        className="w-full rounded-2xl bg-primary text-primary-foreground font-ui font-semibold py-3"
      >
        Lanjut ke Pembayaran
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 2: Pembayaran ────────────────────────────────────────────────────────

function PembayaranStep({
  paymentMethod,
  onChange,
  bankAccounts,
  onBack,
  onNext,
}: {
  paymentMethod: "bank_transfer" | "cod";
  onChange: (m: "bank_transfer" | "cod") => void;
  bankAccounts: BankAccount[];
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
          2
        </div>
        <div>
          <p className="font-ui text-sm font-bold text-ink">Metode Pembayaran</p>
          <p className="font-ui text-xs text-muted-foreground">Pilih cara bayar</p>
        </div>
      </div>

      <div className="space-y-2">
        {bankAccounts.length > 0 && (
          <button
            onClick={() => onChange("bank_transfer")}
            className={`w-full rounded-2xl border-2 p-4 text-left transition ${
              paymentMethod === "bank_transfer"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                paymentMethod === "bank_transfer" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-ui text-sm font-bold text-ink">Transfer Bank</p>
                <p className="font-ui text-xs text-muted-foreground">Transfer ke rekening BUMDes</p>
              </div>
              {paymentMethod === "bank_transfer" && (
                <CheckCircle className="h-5 w-5 text-primary ml-auto shrink-0" />
              )}
            </div>

            {paymentMethod === "bank_transfer" && (
              <div className="mt-3 space-y-2">
                {bankAccounts.map((acc, i) => (
                  <div key={i} className="rounded-xl bg-white border border-border p-3">
                    <p className="font-ui text-xs font-bold text-ink">{acc.bank_name}</p>
                    <p className="font-display text-sm font-bold text-primary">{acc.account_number}</p>
                    <p className="font-ui text-xs text-muted-foreground">a.n. {acc.account_name}</p>
                  </div>
                ))}
              </div>
            )}
          </button>
        )}

        <button
          onClick={() => onChange("cod")}
          className={`w-full rounded-2xl border-2 p-4 text-left transition ${
            paymentMethod === "cod"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              paymentMethod === "cod" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-ui text-sm font-bold text-ink">COD — Bayar Saat Terima</p>
              <p className="font-ui text-xs text-muted-foreground">Bayar langsung saat barang diterima</p>
            </div>
            {paymentMethod === "cod" && (
              <CheckCircle className="h-5 w-5 text-primary ml-auto shrink-0" />
            )}
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex-1 rounded-2xl font-ui font-semibold py-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 rounded-2xl bg-primary text-primary-foreground font-ui font-semibold py-3"
        >
          Lanjut ke Review
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Review ─────────────────────────────────────────────────────────────

function ReviewStep({
  buyer,
  paymentMethod,
  bankAccounts,
  cart,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  buyer: BuyerInfo;
  paymentMethod: "bank_transfer" | "cod";
  bankAccounts: BankAccount[];
  cart: ReturnType<typeof useCartStore>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const totalPrice = cart.totalPrice();
  const insufficient = cart.items.filter((ci) => {
    const p = ci.product;
    return p.stock > 0 && p.stock < ci.quantity;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
          3
        </div>
        <div>
          <p className="font-ui text-sm font-bold text-ink">Review & Konfirmasi</p>
          <p className="font-ui text-xs text-muted-foreground">Periksa pesanan sebelum提交</p>
        </div>
      </div>

      {/* Buyer info */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Pembeli</p>
        <p className="font-ui text-sm font-bold text-ink">{buyer.name}</p>
        <p className="font-ui text-xs text-muted-foreground">{buyer.wa}</p>
        <p className="font-ui text-xs text-muted-foreground">{buyer.address}</p>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Item Pesanan ({cart.items.length})
        </p>
        <div className="space-y-3">
          {cart.items.map((ci) => (
            <div key={ci.product.id} className="flex items-start gap-3">
              <ShoppingBag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-ink leading-tight">{ci.product.name}</p>
                <p className="font-ui text-xs text-muted-foreground">
                  {ci.quantity} × {formatRupiah(ci.product.price)} / {ci.product.unit}
                </p>
              </div>
              <p className="font-display text-sm font-bold text-primary shrink-0">
                {formatRupiah(ci.product.price * ci.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t flex justify-between">
          <p className="font-ui text-sm font-bold text-ink">Total</p>
          <p className="font-display text-lg font-bold text-primary">{formatRupiah(totalPrice)}</p>
        </div>
      </div>

      {/* Payment method */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">Metode Bayar</p>
        <p className="font-ui text-sm font-bold text-ink">
          {paymentMethod === "bank_transfer" ? "Transfer Bank" : "COD — Bayar Saat Terima"}
        </p>
        {paymentMethod === "bank_transfer" && bankAccounts.length > 0 && (
          <div className="mt-2 space-y-1">
            {bankAccounts.map((acc, i) => (
              <div key={i} className="rounded-xl bg-muted/50 p-2">
                <p className="font-ui text-xs font-bold text-ink">{acc.bank_name}</p>
                <p className="font-display text-sm font-bold text-primary">{acc.account_number}</p>
                <p className="font-ui text-xs text-muted-foreground">a.n. {acc.account_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {insufficient.length > 0 && (
        <div className="rounded-2xl border border-destructive bg-destructive/5 p-4">
          <p className="font-ui text-sm font-bold text-destructive mb-1">Stok Tidak Mencukupi</p>
          {insufficient.map((ci) => (
            <p key={ci.product.id} className="font-ui text-xs text-destructive">
              • {ci.product.name} — hanya {ci.product.stock} tersisa
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex-1 rounded-2xl font-ui font-semibold py-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || insufficient.length > 0}
          className="flex-1 rounded-2xl bg-primary text-primary-foreground font-ui font-semibold py-3"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</>
          ) : (
            <><CheckCircle className="h-4 w-4 mr-2" />Konfirmasi Pesanan</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Success Step ───────────────────────────────────────────────────────────────

function SuccessStep({
  orderId,
  waLink,
  buyerName,
  paymentMethod,
}: {
  orderId: string;
  waLink: string;
  buyerName: string;
  paymentMethod: "bank_transfer" | "cod";
}) {
  const [uploading, setUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ordersStore = useOrdersStore();

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File terlalu besar. Maksimal 5MB.");
      return;
    }
    setUploading(true);
    try {
      // Find the order by orderId
      const order = ordersStore.getOrderByOrderId(orderId);
      if (!order) throw new Error("Order not found");
      await ordersStore.addPaymentProof(order.id, file);
      setProofUploaded(true);
      toast.success("Bukti pembayaran berhasil diupload!");
    } catch (err) {
      toast.error("Gagal upload bukti pembayaran.");
      console.error("[checkout] proof upload error:", err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10" />
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-ink">Pesanan Terkirim!</p>
        <p className="font-ui text-sm text-muted-foreground mt-1">
          Terima kasih{buyerName ? ` ${buyerName}` : ""}, pesanan Anda sedang diproses.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">ID Pesanan</p>
        <p className="font-display text-xl font-bold text-primary">{orderId}</p>
        <p className="font-ui text-xs text-muted-foreground mt-1">
          {paymentMethod === "bank_transfer"
            ? "Segera transfer dan upload bukti pembayaran."
            : "Pembayaran dilakukan saat barang diterima."}
        </p>
      </div>

      {/* Payment proof upload (bank transfer only) */}
      {paymentMethod === "bank_transfer" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          {proofUploaded ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <p className="font-ui text-sm font-semibold">Bukti pembayaran sudah diupload!</p>
            </div>
          ) : (
            <>
              <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Upload Bukti Transfer
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProofUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-border font-ui text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Mengupload...</>
                ) : (
                  <><Upload className="h-4 w-4" />Pilih File Bukti Transfer</>
                )}
              </button>
              <p className="font-ui text-xs text-muted-foreground text-center mt-1.5">
                JPG/PNG/WebP, maks 5MB
              </p>
            </>
          )}
        </div>
      )}

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-ui text-sm font-bold hover:bg-[#22c55e] transition"
      >
        <MessageCircle className="h-4 w-4" />
        Hubungi Penjual via WhatsApp
      </a>

      <a
        href="/ekonomi/marketplace"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border font-ui text-sm font-semibold text-muted-foreground hover:bg-muted transition"
      >
        Kembali ke Marketplace
      </a>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function CheckoutPage() {
  const { village } = useSettings();
  const cart = useCartStore();
  const { items: configItems } = useMarketplaceConfigStore();
  const ordersStore = useOrdersStore();

  const [step, setStep] = useState<CheckoutStep | "success">("alamat");
  const [buyer, setBuyer] = useState<BuyerInfo>({ name: "", wa: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cod">("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; waLink: string } | null>(null);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ordersStore.load();
  }, []);

  // Bank accounts from config
  const config = configItems.find((c) => c.key === "marketplace_config");
  const bankAccounts: BankAccount[] = (config as Record<string, unknown>)?.bank_accounts ?? [];
  const codEnabled = (config as Record<string, unknown>)?.cod_enabled ?? true;
  const effectivePayment = (bankAccounts.length > 0 || codEnabled) ? paymentMethod : "cod";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { orderId, waLink } = await ordersStore.createOrder(cart.items, buyer, effectivePayment);
      cart.clearCart();
      setResult({ orderId, waLink });
      setStep("success");
      toast.success("Pesanan berhasil dibuat!");
    } catch (err) {
      toast.error("Gagal membuat pesanan. Silakan coba lagi.");
      console.error("[checkout] createOrder error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/ekonomi/marketplace" className="p-2 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5 text-ink" />
          </a>
          <div>
            <p className="font-display text-base font-bold text-ink">Checkout</p>
            <p className="font-ui text-xs text-muted-foreground">
              {cart.items.length} item · {formatRupiah(cart.totalPrice())}
            </p>
          </div>
        </div>
      </div>

      <PageHero height="15vh" title="Checkout" subtitle={`Pasar Desa ${village.name}`} />

      {/* Step progress bar */}
      {step !== "success" && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-2">
            {(["alamat", "pembayaran", "review"] as const).map((s, i) => {
              const curIdx = (["alamat", "pembayaran", "review"] as const).indexOf(step as CheckoutStep);
              const done = curIdx > i;
              const active = step === s;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`h-2 flex-1 rounded-full transition ${
                    done ? "bg-primary" : active ? "bg-primary/50" : "bg-muted"
                  }`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty cart redirect */}
      {cart.items.length === 0 && step !== "success" ? (
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display text-lg font-bold text-ink">Keranjang kosong</p>
          <p className="font-ui text-sm text-muted-foreground mt-1 mb-6">
            Tambahkan produk terlebih dahulu sebelum checkout.
          </p>
          <a href="/ekonomi/marketplace">
            <Button className="rounded-full bg-primary text-primary-foreground font-ui font-semibold">
              <ArrowRight className="h-4 w-4 mr-2" />
              Ke Marketplace
            </Button>
          </a>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 pb-12">
          {step === "success" && result ? (
            <SuccessStep
              orderId={result.orderId}
              waLink={result.waLink}
              buyerName={buyer.name}
              paymentMethod={effectivePayment}
            />
          ) : step === "alamat" ? (
            <AlamatStep buyer={buyer} onChange={setBuyer} onNext={() => setStep("pembayaran")} />
          ) : step === "pembayaran" ? (
            <PembayaranStep
              paymentMethod={effectivePayment}
              onChange={setPaymentMethod}
              bankAccounts={bankAccounts}
              onBack={() => setStep("alamat")}
              onNext={() => setStep("review")}
            />
          ) : (
            <ReviewStep
              buyer={buyer}
              paymentMethod={effectivePayment}
              bankAccounts={bankAccounts}
              cart={cart}
              onBack={() => setStep("pembayaran")}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}