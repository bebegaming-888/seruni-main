import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { getLembagaWithStruktur } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { usePageContentStore } from "@/lib/content-store";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/sections/PageHero";

import {
  Zap,
  Users,
  Phone,
  MapPin,
  Target,
  HeartHandshake,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";

export const Route = createFileRoute("/profil/karangtaruna")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Karang Taruna — ${v.name}` },
        {
          name: "description",
          content: `Karang Taruna Desa ${v.name}. Generasi muda pemberdaya masyarakat.`,
        },
      ],
    };
  },
  component: () => <KarangTarunaPage />,
});

function resolveKtIcon(name?: string): React.ComponentType<{ className?: string }> {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    HeartHandshake,
    Target,
    Zap,
    Users,
  };
  return name && map[name] ? map[name] : Zap;
}

export function KarangTarunaPage() {
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);
  const { items: pageItems } = usePageContentStore();

  useEffect(() => {
    getLembagaWithStruktur("karang-taruna").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const programItems = (() => {
    const found = pageItems.find(
      (p) => p.page_key === "profil_karangtaruna" && p.content_type === "programs",
    );
    if (found?.items.length) return found.items;
    return [
      {
        label: "Bakti Sosial",
        description: "Donor darah, pembagian bantuan, dan kepedulian terhadap warga kurang mampu.",
        icon: "HeartHandshake",
      },
      {
        label: "Pelatihan Keterampilan",
        description: "Digital marketing, desain grafis, dan manajemen usaha untuk anak muda.",
        icon: "Target",
      },
      {
        label: "Lingkungan & Kehutanan",
        description: "Penanaman 500 pohon baru, bank sampah, dan pengelolaan ruang terbuka hijau.",
        icon: "Zap",
      },
      {
        label: "Pendampingan Lansia",
        description: "Kunjungan rumah, bantuan harian, dan program kebahagiaan lansia.",
        icon: "Users",
      },
    ];
  })();

  const logoUrl = data?.lembaga.logo_storage_path
    ? getMediaUrl(data.lembaga.logo_storage_path, "public-media")
    : data?.lembaga.logo_url;

  // Count stats from data
  const aktifCount = data?.allPengurus.length ?? 0;
  const rootNodes = data?.strukturTree.filter((n) => n.level === 0).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Karang"
          titleSecond="Taruna"
          description="Organisasi pemuda-pemudi desa yang bergerak di sosial, lingkungan, dan pemberdayaan ekonomi kreatif."
          badge="Organisasi Kepemudaan"
          badgeIcon={<Zap className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "Karang Taruna" }]}
        />

        {/* Stats */}
        <section className="px-4 -mt-8 mb-14">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card shadow-card p-5 animate-pulse"
                  >
                    <div className="h-8 bg-muted rounded w-16 mb-2 mx-auto" />
                    <div className="h-4 bg-muted rounded w-24 mx-auto" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">
                    {aktifCount}
                  </p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">Anggota Aktif</p>
                </div>
                <div className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">
                    {data?.allStruktur.length ?? 0}
                  </p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">Jabatan</p>
                </div>
                <div className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">
                    {rootNodes}
                  </p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">Bidang</p>
                </div>
                <div className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">
                    {data?.lembaga.periode_mulai?.slice(0, 4) ?? "—"}
                  </p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">Periode</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Program */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Unggulan
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">
              Empat Pilar Karang Taruna
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {programItems.map((p) => {
                const Icon = resolveKtIcon(p.icon);
                return (
                  <div
                    key={p.label}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-ink mb-2">{p.label}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Kepengurusan */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Kepengurusan
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">Susunan Pengurus</h2>
                {data?.lembaga.periode_mulai && (
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Periode {data.lembaga.periode_mulai.slice(0, 4)}–
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "—"}
                  </p>
                )}
              </div>
              <Link
                to="/profil/lembaga"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lembaga Lain →
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.allPengurus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border text-center py-16 font-body text-muted-foreground">
                Data kepengurusan belum diisi.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.allPengurus.map((p) => {
                  const strukturNode = data.allStruktur.find((s) => s.id === p.struktur_id);
                  const isRoot = strukturNode?.level === 0;
                  const fotoUrl = p.foto_storage_path
                    ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
                    : p.foto_url;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-5 flex items-start gap-4 ${
                        isRoot ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={p.nama}
                          className="h-14 w-14 rounded-full object-cover border border-border shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${isRoot ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground"}`}
                          >
                            {strukturNode?.nama_jabatan ?? "—"}
                          </span>
                        </div>
                        <p className="font-display text-base font-bold text-ink leading-tight">
                          {p.nama}
                        </p>
                        {p.no_hp && (
                          <p className="font-ui text-xs text-muted-foreground mt-0.5">{p.no_hp}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap gap-6">
                {[
                  {
                    icon: MapPin,
                    text: data?.lembaga.kontak_info?.alamat || `Balai Desa ${v.name}`,
                  },
                  {
                    icon: Phone,
                    text: data?.lembaga.kontak_info?.telepon || "Hubungi sekretariat",
                  },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-ui text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
