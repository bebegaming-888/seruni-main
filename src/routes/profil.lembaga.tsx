import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { listLembagaAktif } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { Link } from "@/components/Link";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/sections/PageHero";
import {
  Users,
  Store,
  Target,
  Heart,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/profil/lembaga")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Lembaga Desa — ${v.name}` },
        {
          name: "description",
          content: `Profil Lembaga Desa ${v.name}: BPD, LPM, PKK, Karang Taruna, BUMDes.`,
        },
      ],
    };
  },
  component: () => <LembagaPage />,
});

/** Ikon per jenis lembaga */
const JENIS_ICON: Record<string, React.ElementType> = {
  BPD: Users,
  LPM: Target,
  PKK: Heart,
  KARANG_TARUNA: Users,
  BUMDES: Store,
  POSYANDU: Heart,
  LINMAS: Users,
  FORUM_ANAK: Users,
  POKDARWIS: Target,
  KOPERASI: Store,
  LEMBAGA_ADAT: Users,
  POSBANKUM: Target,
  TSBD: Target,
  LEMBAGA_PEREMPUAN: Heart,
  LAINNYA: Building2,
};

/** Gradient per jenis — brand palette: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5 */
const JENIS_GRADIENT: Record<string, string> = {
  BPD: "from-[#078898]/10 to-[#078898]/20",
  LPM: "from-[#66B9BF]/10 to-[#66B9BF]/20",
  PKK: "from-[#E37222]/10 to-[#E37222]/20",
  KARANG_TARUNA: "from-[#078898]/10 to-[#66B9BF]/20",
  BUMDES: "from-[#EEAA78]/10 to-[#EEAA78]/20",
  POSYANDU: "from-[#E37222]/10 to-[#E37222]/20",
  LINMAS: "from-[#D5D5D5]/10 to-[#D5D5D5]/20",
  FORUM_ANAK: "from-[#EEAA78]/10 to-[#EEAA78]/20",
  POKDARWIS: "from-[#66B9BF]/10 to-[#66B9BF]/20",
  KOPERASI: "from-[#078898]/10 to-[#078898]/20",
  LEMBAGA_ADAT: "from-[#EEAA78]/10 to-[#EEAA78]/20",
  POSBANKUM: "from-[#66B9BF]/10 to-[#66B9BF]/20",
  TSBD: "from-[#E37222]/10 to-[#E37222]/20",
  LEMBAGA_PEREMPUAN: "from-[#E37222]/10 to-[#E37222]/20",
  LAINNYA: "from-muted to-muted",
};

export function LembagaPage() {
  const v = useVillage();
  const [lembagaList, setLembagaList] = useState<Awaited<ReturnType<typeof listLembagaAktif>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/lembaga-store")
      .then(({ initLembagaStore, listLembagaAktif }) => {
        initLembagaStore()
          .then(() => {
            setLembagaList(listLembagaAktif());
            setLoading(false);
          })
          .catch((e) => {
            console.error("[profil.lembaga] initLembagaStore failed:", e);
            setLoading(false);
          });
      })
      .catch((e) => console.error("[profil.lembaga] dynamic import failed:", e));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Lembaga"
          titleSecond="Desa"
          description="Berbagai lembaga yang bekerja sama dalam tata kelola pemerintahan desa yang transparan dan partisipatif."
          badge="Tata Kelola"
          badgeIcon={<Building2 className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "Lembaga" }]}
        />

        {/* Lembaga Cards */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : lembagaList.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border font-body text-muted-foreground">
                Belum ada data lembaga. Admin dapat menambahkan melalui panel admin.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {lembagaList.map((l) => {
                  const Icon = JENIS_ICON[l.jenis] ?? Building2;
                  const gradient = JENIS_GRADIENT[l.jenis] ?? "from-muted to-muted";
                  const logoUrl = l.logo_storage_path
                    ? getMediaUrl(l.logo_storage_path, "public-media")
                    : l.logo_url;

                  return (
                    <Link
                      key={l.id}
                      to={`/profil/${l.slug}`}
                      className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition block"
                    >
                      <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={l.nama}
                              className="h-12 w-12 rounded-2xl object-contain border border-border bg-white shrink-0 group-hover:scale-110 transition"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {l.jenis.replace("_", " ")}
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-ink leading-tight mb-1.5">
                              {l.nama}
                            </h3>
                            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
                              {l.deskripsi || "Lihat detail lembaga ini."}
                            </p>
                            <span className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-primary">
                              Lihat Profil{" "}
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
