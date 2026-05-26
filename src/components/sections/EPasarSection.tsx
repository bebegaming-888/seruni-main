import { ArrowUpRight, ShoppingBag, Package, Truck } from "lucide-react";
import { Link } from "@/components/Link";
import { SectionTitle } from "@/components/site/SectionTitle";
import { TextReveal } from "@/components/ui/TextReveal";

const products = [
  { name: "Kopi Arabika Lokal", price: "Rp 45.000", unit: "/250g" },
  { name: "Madu Murni Hutan", price: "Rp 85.000", unit: "/500ml" },
  { name: "Keripik Singkong", price: "Rp 25.000", unit: "/bungkus" },
  { name: "Pandan Wangi", price: "Rp 15.000", unit: "/ikat" },
];

const features = [
  { icon: ShoppingBag, label: "Pasar Online", desc: "Jual-beli produk lokal" },
  { icon: Package, label: "Produk Unggulan", desc: "Olahan desa terbaik" },
  { icon: Truck, label: "Pengiriman", desc: "Cepat ke seluruh Indonesia" },
];

export function EPasarSection() {
  return (
    <section className="min-h-screen bg-muted py-20 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: title + description */}
          <div>
            <p className="eyebrow text-primary mb-3">Pasar Digital Desa</p>
            <SectionTitle first="E-Pasar" second="Desa" className="text-foreground mb-4" />
            <p className="font-body text-muted-foreground mb-8 leading-relaxed">
              Dukung ekonomi kreatif warga. Beli produk lokal berkualitas langsung dari produsen.
              Setiap pembelian mendukung ekonomi desa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="rounded-lg bg-card border border-border p-4 hover:bg-accent transition-colors"
                >
                  <f.icon className="h-6 w-6 text-primary mb-2" />
                  <div className="font-ui text-sm font-semibold text-foreground leading-tight">
                    {f.label}
                  </div>
                  <div className="font-body text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>

            <Link
              to="/e-pasar"
              className="mt-8 btn-pill bg-primary text-primary-foreground hover:bg-primary inline-flex group"
            >
              <TextReveal mode="hover">Kunjungi E-Pasar</TextReveal>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Right: product preview */}
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-lg bg-card border border-border px-5 py-4 hover:bg-accent transition-colors group cursor-pointer"
              >
                <div>
                  <div className="font-display font-bold text-foreground text-base">
                    <TextReveal mode="hover">{p.name}</TextReveal>
                  </div>
                  <div className="font-ui text-xs text-muted-foreground mt-0.5">{p.unit}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-ui font-bold text-primary text-base">{p.price}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
            <p className="font-ui text-xs text-muted-foreground text-center pt-2">
              + 24 produk lainnya di E-Pasar
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
