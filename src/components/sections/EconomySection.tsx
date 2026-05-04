import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, TrendingUp, TrendingDown, Building2, Users } from "lucide-react";
import { KOMODITAS } from "@/data/site";
import { CountUp } from "@/components/site/CountUp";
import bumdesImg from "@/assets/ekonomi-bumdes.jpg";

export function EconomySection() {
  return (
    <section id="ekonomi" className="py-20 sm:py-28 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="eyebrow text-primary mb-3">Ekonomi Desa</p>
          <SectionTitle first="Denyut" second="ekonomi" className="text-ink max-w-2xl" />
        </div>

        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          {/* BUMDes card */}
          <div className="lg:col-span-3 rounded-3xl overflow-hidden bg-card border border-border grid sm:grid-cols-5">
            <div className="sm:col-span-2 aspect-[4/3] sm:aspect-auto">
              <img
                src={bumdesImg}
                alt="Aktivitas BUMDes Seruni Mandiri"
                className="w-full h-full object-cover"
                loading="lazy"
                width={1280}
                height={960}
              />
            </div>
            <div className="sm:col-span-3 p-7 flex flex-col">
              <span className="eyebrow text-primary">BUMDes</span>
              <h3 className="font-display text-2xl font-bold text-ink mt-2">
                BUMDes Seruni Mandiri
              </h3>
              <p className="font-body text-sm text-muted-foreground mt-2">
                Bidang usaha: simpan pinjam, agribisnis, dan jasa wisata desa. Berdiri sejak 2018.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-cream p-3">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="font-display text-2xl font-bold text-ink mt-2">
                    <CountUp end={342} />
                  </div>
                  <div className="font-ui text-[11px] text-muted-foreground">Anggota aktif</div>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <div className="font-display text-2xl font-bold text-ink mt-2">
                    Rp <CountUp end={1240} /> jt
                  </div>
                  <div className="font-ui text-[11px] text-muted-foreground">Omzet 2025</div>
                </div>
              </div>
              <Link
                to="/ekonomi/bumdes"
                className="btn-pill bg-ink text-background hover:bg-primary mt-5 self-start group"
              >
                Profil BUMDes
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* KDMP card */}
          <div className="lg:col-span-2 rounded-3xl bg-ink text-background p-7 flex flex-col">
            <span className="eyebrow text-primary">Koperasi Desa</span>
            <h3 className="font-display text-2xl font-bold mt-2">KDMP Merah Putih</h3>
            <p className="font-body text-sm text-background/70 mt-2">
              Koperasi Desa Merah Putih melayani simpan pinjam dan distribusi komoditas pokok untuk
              warga.
            </p>
            <div className="rounded-2xl bg-background/10 p-4 mt-5">
              <Building2 className="h-4 w-4 text-primary" />
              <div className="font-display text-3xl font-bold mt-2">
                <CountUp end={8742} />
              </div>
              <div className="font-ui text-xs text-background/70">Transaksi Mei 2026</div>
            </div>
            <Link
              to="/ekonomi/kdmp"
              className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover mt-auto self-start group"
            >
              Profil KDMP
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Ticker komoditas */}
        <div className="rounded-full bg-cream overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-ui text-xs font-bold uppercase tracking-wider">
              Harga Hari Ini
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-8 animate-marquee whitespace-nowrap font-ui text-sm text-ink">
                {[...KOMODITAS, ...KOMODITAS].map((k, i) => (
                  <span key={i} className="inline-flex items-center gap-2">
                    <span className="font-semibold">{k.name}</span>
                    <span>
                      Rp {k.price.toLocaleString("id-ID")}/{k.unit}
                    </span>
                    {k.trend === "up" ? (
                      <span className="inline-flex items-center text-success font-semibold">
                        <TrendingUp className="h-3 w-3" /> {k.change}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-primary font-semibold">
                        <TrendingDown className="h-3 w-3" /> {k.change}%
                      </span>
                    )}
                    <span className="text-muted-foreground">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
