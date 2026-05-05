import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
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
} from "lucide-react";

export const Route = createFileRoute("/profil/lpm")({
  head: () => ({
    meta: [
      { title: `LPM — ${VILLAGE.name}` },
      {
        name: "description",
        content:
          "Lembaga Pemberdayaan Masyarakat Desa Seruni Mumbul. Wadah partisipasi warga dalam pembangunan.",
      },
    ],
  }),
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

const PENGURUS = [
  { nama: "H. M. Tohir", jabatan: "Ketua" },
  { nama: "Siti Halimah", jabatan: "Sekretaris" },
  { nama: "Lalu Sumarno", jabatan: "Bendahara" },
  { nama: "Baiq Hasanah", jabatan: "Bid. Ekonomi" },
  { nama: "M. Fikri", jabatan: "Bid. Sosial" },
  { nama: "Siti Amin", jabatan: "Bid. Pembangunan" },
];

export function LPMPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Target className="h-3.5 w-3.5" />
              Lembaga Pemberdayaan Masyarakat
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              LPM
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              LPM adalah mitra strategis pemerintah desa dalam merencanakan, melaksanakan, dan
              mengevaluasi program pembangunan partisipatif. Wadah ini memastikan suara masyarakat
              terwakili dalam setiap keputusan pembangunan.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              15 Program kerja aktif · Periode 2022–2027
            </div>
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
              <h3 className="font-display text-xl font-bold text-ink mb-6">Pengurus LPM</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PENGURUS.map((p) => (
                  <div key={p.nama} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="font-display font-bold text-ink">{p.nama}</p>
                    <p className="font-ui text-xs text-muted-foreground mt-0.5">{p.jabatan}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-4">
                {[
                  { icon: MapPin, text: "Balai Desa Seruni Mumbul, Ruang LPM" },
                  { icon: Phone, text: "+62 812-3456-7890 (Sekretaris)" },
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
