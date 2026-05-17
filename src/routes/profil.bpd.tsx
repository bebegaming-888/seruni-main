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
  Users,
  FileText,
  Scale,
  CalendarDays,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Loader2,
  User,
} from "lucide-react";

export const Route = createFileRoute("/profil/bpd")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `BPD â€” ${v.name}` },
        {
          name: "description",
          content: `Badan Permusyawaratan Desa ${v.name}. Suara rakyat, pengawasan tata kelola desa.`,
        },
      ],
    };
  },
  component: () => <BPDPage />,
});

const TUGAS_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scale,
  FileText,
  UserCheck,
  CalendarDays,
};

function resolveTugasIcon(name?: string) {
  return name && TUGAS_ICON_MAP[name] ? TUGAS_ICON_MAP[name] : FileText;
}

function BPDPage() {
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);
  const { items: pageItems } = usePageContentStore();

  useEffect(() => {
    getLembagaWithStruktur("bpd").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const tugasItems = (() => {
    const found = pageItems.find(
      (p) => p.page_key === "profil_bpd" && p.content_type === "programs",
    );
    if (found?.items.length) return found.items;
    return [
      {
        label: "Pembentukan Peraturan Desa",
        description:
          "Melakukan pembahasan dan memberikan persetujuan terhadap Raperdes sebelum ditetapkan Kades.",
        icon: "Scale",
      },
      {
        label: "Pembahasan APBDes",
        description:
          "Menampung dan meniscus aspirasi masyarakat dalam rancangan APBDes yang diajukan Kades.",
        icon: "FileText",
      },
      {
        label: "Pengawasan Kinerja",
        description:
          "Mengawasi kinerja pemerintah desa dan menyampaikan hasil pengawasan kepada perangkat desa.",
        icon: "UserCheck",
      },
      {
        label: "Pelaksanaan Musdes",
        description:
          "Mengumpulkan masyarakat dalam musyawarah desa untuk membahas program dan kegiatan pembangunan.",
        icon: "CalendarDays",
      },
    ];
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="BPD"
          titleSecond="Desa"
          description="Badan Permusyawaratan Desa â€” wadah representasi suara rakyat dalam pemerintahan desa."
          badge="Badan Permusyawaratan"
          badgeIcon={<Users className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "BPD" }]}
        />

        {/* Tugas Pokok */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Fungsi Utama
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">Tugas & Wewenang BPD</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {tugasItems.map((t) => {
                const Icon = resolveTugasIcon(t.icon);
                return (
                  <div
                    key={t.label}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1.5">{t.label}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Anggota â€” Kartu Nama */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Kepengurusan
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">
                  Susunan Kepengurusan BPD
                </h2>
                {data?.lembaga.periode_mulai && (
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Periode {data.lembaga.periode_mulai.slice(0, 4)} â€”{" "}
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "â€”"}
                  </p>
                )}
              </div>
              <Link
                to="/profil/lembaga"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lembaga Lain <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.allPengurus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border text-center py-16 font-body text-muted-foreground">
                Data kepengurusan belum diisi. Buka panel admin untuk mengelola.
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
                            {strukturNode?.nama_jabatan ?? "â€”"}
                          </span>
                        </div>
                        <p className="font-display text-base font-bold text-ink leading-tight">
                          {p.nama}
                        </p>
                        <p className="font-ui text-xs text-muted-foreground mt-0.5">
                          {[
                            p.tempat_lahir,
                            p.tanggal_lahir
                              ? new Date(p.tanggal_lahir).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "â€”"}
                        </p>
                        {p.pendidikan && (
                          <p className="font-ui text-xs text-muted-foreground">{p.pendidikan}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Jadwal Rapat */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Jadwal Rapat Biasa
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                    BPD melaksanakan rapat ordinary setiap bulan untuk membahas agenda desa. Rapat
                    bersifat terbuka untuk masyarakat yang ingin menyampaikan aspirasi.
                  </p>
                  <div className="space-y-2">
                    {[
                      "Rapat koordinasi bulanan â€” minggu ke-2 setiap bulan",
                      "Rapat Paristiwa â€” sesuai kebutuhan (quorum 2/3 anggota)",
                      "Musyawarah Desa â€” minimal 2x per tahun",
                    ].map((r) => (
                      <div key={r} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="font-ui text-sm text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-2xl p-5">
                  <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Informasi Kontak
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        icon: MapPin,
                        text: data?.lembaga.kontak_info?.alamat || `Balai Desa ${v.name}, Lt. 2`,
                      },
                      {
                        icon: Phone,
                        text: data?.lembaga.kontak_info?.telepon || "Hubungi sekretariat BPD",
                      },
                      {
                        icon: Users,
                        text:
                          data?.lembaga.kontak_info?.jam_layanan ||
                          "Jam layanan: Seninâ€“Jumat, 08.00â€“15.00 WITA",
                      },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="font-ui text-sm text-muted-foreground">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
