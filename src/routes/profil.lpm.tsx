import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { getLembagaWithStruktur } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { useEffect, useState } from "react";

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

const PROGRAM = [
  { icon: Home, title: "Perbaikan Rumah Tidak Layak Huni", target: "12 unit/tahun" },
  { icon: TrendingUp, title: "Pelatihan Kewirausahaan", target: "4x/tahun" },
  { icon: Users, title: "Pendampingan BLT-DD", target: "40 KK" },
  { icon: ClipboardList, title: "Verifikasi DTKS", target: "Setiap semester" },
  { icon: HandHeart, title: "Bantuan bencana alam", target: "Sesuai kebutuhan" },
  { icon: Target, title: "Sosialisasi program desa", target: "6x/tahun" },
];

const KEGIATAN = [
  { bulan: "Januari", agenda: "Musrenbangdes RKPD 2027" },
  { bulan: "Februari", agenda: "Sosialisasi PKH & BLT-DD" },
  { bulan: "Maret", agenda: "Verifikasi data warga pra-sejahtera" },
  { bulan: "April", agenda: "Kerja bakti bulanan — bersih desa" },
  { bulan: "Mei", agenda: "Pelatihan manajemen organisasi" },
  { bulan: "Juni", agenda: "Evaluasi program semester I" },
  { bulan: "Juli", agenda: "Gotong royong perbaikan jalan dusun" },
  { bulan: "Agustus", agenda: "Sosialisasi stunting & Posyandu" },
  { bulan: "September", agenda: "Pelatihan keuangan mikro" },
  { bulan: "Oktober", agenda: "Musrenbangdes RPJMDes 2028-2033" },
  { bulan: "November", agenda: "Pendampingan petani — alsintan" },
  { bulan: "Desember", agenda: "Rapat akhir tahun & evaluasi program" },
];

export function LPMPage() {
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLembagaWithStruktur("lpm").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const logoUrl = data?.lembaga.logo_storage_path
    ? getMediaUrl(data.lembaga.logo_storage_path, "public-media")
    : data?.lembaga.logo_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo LPM"
                className="h-20 w-20 rounded-2xl object-contain border border-border bg-white/50 mb-6"
              />
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Target className="h-3.5 w-3.5" />
              Lembaga Pemberdayaan Masyarakat
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              LPM
              <br />
              <span className="text-primary">{v.name}</span>
            </h1>

            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              {data?.lembaga.deskripsi ||
                "LPM adalah mitra strategis pemerintah desa dalam merencanakan, melaksanakan, dan mengevaluasi program pembangunan partisipatif."}
            </p>
            {loading ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-muted text-muted-foreground px-3 py-1 font-ui text-xs font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat…
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data?.allPengurus.length ?? 0} pengurus aktif
                </div>
                {data?.lembaga.periode_mulai && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                    {data.lembaga.periode_mulai.slice(0, 4)}–
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "—"}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Program */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Unggulan
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">Agenda Kerja 2026</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROGRAM.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1 leading-tight">
                      {p.title}
                    </h3>
                    <p className="font-ui text-xs text-success font-semibold mt-1">
                      Target: {p.target}
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
              {KEGIATAN.map((k) => (
                <div
                  key={k.bulan}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 transition"
                >
                  <div className="w-24 shrink-0">
                    <p className="font-ui text-xs font-semibold text-primary">{k.bulan}</p>
                  </div>
                  <p className="font-body text-sm text-foreground">{k.agenda}</p>
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
