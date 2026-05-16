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
  Target,
  Users,
  HandHeart,
  Phone,
  MapPin,
  TrendingUp,
  Home,
  ClipboardList,
  CheckCircle2,
  Loader2,
  User,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/profil/lpm")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `LPM — ${v.name}` },
        {
          name: "description",
          content: `Lembaga Pemberdayaan Masyarakat Desa ${v.name}. Wadah partisipasi warga dalam pembangunan.`,
        },
      ],
    };
  },
  component: () => <LPMPage />,
});

function resolveLpmIcon(name?: string): React.ComponentType<{ className?: string }> {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Home, TrendingUp, Users, ClipboardList, HandHeart, Target,
  };
  return (name && map[name]) ? map[name] : Target;
}

export function LPMPage() {
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);
  const { items: pageItems } = usePageContentStore();

  useEffect(() => {
    getLembagaWithStruktur("lpm").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const programItems = (() => {
    const found = pageItems.find(
      (p) => p.page_key === "profil_lpm" && p.content_type === "programs",
    );
    if (found?.items.length) return found.items;
    return [
      { label: "Perbaikan Rumah Tidak Layak Huni", description: "12 unit/tahun", icon: "Home" },
      { label: "Pelatihan Kewirausahaan", description: "4x/tahun", icon: "TrendingUp" },
      { label: "Pendampingan BLT-DD", description: "40 KK", icon: "Users" },
      { label: "Verifikasi DTKS", description: "Setiap semester", icon: "ClipboardList" },
      { label: "Bantuan bencana alam", description: "Sesuai kebutuhan", icon: "HandHeart" },
      { label: "Sosialisasi program desa", description: "6x/tahun", icon: "Target" },
    ];
  })();

  const kegiatanItems = (() => {
    const found = pageItems.find(
      (p) => p.page_key === "profil_lpm" && p.content_type === "custom",
    );
    if (found?.items.length) return found.items;
    return [
      { label: "Januari", description: "Musrenbangdes RKPD 2027" },
      { label: "Februari", description: "Sosialisasi PKH & BLT-DD" },
      { label: "Maret", description: "Verifikasi data warga pra-sejahtera" },
      { label: "April", description: "Kerja bakti bulanan — bersih desa" },
      { label: "Mei", description: "Pelatihan manajemen organisasi" },
      { label: "Juni", description: "Evaluasi program semester I" },
      { label: "Juli", description: "Gotong royong perbaikan jalan dusun" },
      { label: "Agustus", description: "Sosialisasi stunting & Posyandu" },
      { label: "September", description: "Pelatihan keuangan mikro" },
      { label: "Oktober", description: "Musrenbangdes RPJMDes 2028-2033" },
      { label: "November", description: "Pendampingan petani — alsintan" },
      { label: "Desember", description: "Rapat akhir tahun & evaluasi program" },
    ];
  })();

  const logoUrl = data?.lembaga.logo_storage_path
    ? getMediaUrl(data.lembaga.logo_storage_path, "public-media")
    : data?.lembaga.logo_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="LPM"
          titleSecond="Desa"
          description="Lembaga Pemberdayaan Masyarakat — mitra strategis pemerintah desa dalam program pembangunan partisipatif."
          badge="Lembaga Pemberdayaan"
          badgeIcon={<Target className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "LPM" }]}
        />

        {/* Program */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Unggulan
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">Agenda Kerja 2026</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programItems.map((p) => {
                const Icon = resolveLpmIcon(p.icon);
                return (
                  <div
                    key={p.label}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1 leading-tight">
                      {p.label}
                    </h3>
                    <p className="font-ui text-xs text-success font-semibold mt-1">
                      Target: {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Kalender Kegiatan */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-ink mb-8">
              Kalender Kegiatan Tahunan
            </h2>
            <div className="space-y-2">
              {kegiatanItems.map((k) => (
                <div
                  key={k.label}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 transition"
                >
                  <div className="w-24 shrink-0">
                    <p className="font-ui text-xs font-semibold text-primary">{k.label}</p>
                  </div>
                  <p className="font-body text-sm text-foreground">{k.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pengurus */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-ink mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Pengurus LPM
                {data?.lembaga.periode_mulai && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground font-body">
                    — {data.lembaga.periode_mulai.slice(0, 4)}–
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "—"}
                  </span>
                )}
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : data?.allPengurus.length === 0 ? (
                <p className="font-body text-muted-foreground text-center py-8">
                  Data kepengurusan belum diisi.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data?.allPengurus.map((p) => {
                    const strukturNode = data.allStruktur.find((s) => s.id === p.struktur_id);
                    const fotoUrl = p.foto_storage_path
                      ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
                      : p.foto_url;
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3"
                      >
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={p.nama}
                            className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-display font-bold text-ink leading-tight">{p.nama}</p>
                          <p className="font-ui text-xs text-muted-foreground mt-0.5">
                            {strukturNode?.nama_jabatan ?? "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-4">
                {[
                  {
                    icon: MapPin,
                    text: data?.lembaga.kontak_info?.alamat || `Balai Desa ${v.name}, Ruang LPM`,
                  },
                  {
                    icon: Phone,
                    text: data?.lembaga.kontak_info?.telepon || "Hubungi sekretariat LPM",
                  },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-ui text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/profil/lembaga"
                className="inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline"
              >
                Lembaga Lain <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
