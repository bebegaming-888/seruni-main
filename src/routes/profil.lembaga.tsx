import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { listLembagaAktif } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { Link } from "@/components/Link";
import { useEffect, useState } from "react";
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

/** Gradient per jenis */
const JENIS_GRADIENT: Record<string, string> = {
  BPD: "from-blue-50 to-blue-100",
  LPM: "from-green-50 to-green-100",
  PKK: "from-pink-50 to-pink-100",
  KARANG_TARUNA: "from-purple-50 to-purple-100",
  BUMDES: "from-amber-50 to-amber-100",
  POSYANDU: "from-red-50 to-red-100",
  LINMAS: "from-gray-50 to-gray-100",
  FORUM_ANAK: "from-orange-50 to-orange-100",
  POKDARWIS: "from-teal-50 to-teal-100",
  KOPERASI: "from-indigo-50 to-indigo-100",
  LEMBAGA_ADAT: "from-yellow-50 to-yellow-100",
  POSBANKUM: "from-cyan-50 to-cyan-100",
  TSBD: "from-red-50 to-red-100",
  LEMBAGA_PEREMPUAN: "from-pink-50 to-pink-100",
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
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Building2 className="h-3.5 w-3.5" />
              Tata Kelola Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              Lembaga Desa
              <br />
              <span className="text-primary">{v.name}</span>
            </h1>

            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Beberapa lembaga desa yang bekerja sama menjalankan pemerintahan dan pemberdayaan
              masyarakat. Setiap lembaga memiliki peran spesifik dalam tata kelola pemerintahan desa
              yang transparan dan partisipatif.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {loading ? "Memuat…" : `${lembagaList.length} Lembaga aktif`}
            </div>
          </div>
        </section>

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
