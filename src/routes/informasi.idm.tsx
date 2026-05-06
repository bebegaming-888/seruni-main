import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import {
  Award,
  TrendingUp,
  BarChart,
  ShieldCheck,
  Zap,
  Heart,
  Info,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/informasi/idm")({
  head: () => ({
    meta: [
      { title: `Indeks Desa Membangun (IDM) — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Status kemandirian desa ${VILLAGE.name} berdasarkan Indeks Desa Membangun (IDM) Kementerian Desa PDT.`,
      },
    ],
  }),
  component: () => <IDMPage />,
});

function IDMCard({
  title,
  score,
  icon: Icon,
  color = "text-primary",
}: {
  title: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className={`h-12 w-12 rounded-2xl bg-muted flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="font-display text-2xl font-bold text-ink">{score.toFixed(4)}</div>
      </div>
      <h3 className="font-display text-lg font-bold text-ink mb-2">{title}</h3>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-4">
        <div
          className={`h-full bg-current ${color} opacity-80`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}

export function IDMPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden text-center">
          <div className="max-w-4xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-6">
              <Award className="h-3.5 w-3.5" />
              Status Kemandirian
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink mb-6">
              Indeks Desa Membangun
            </h1>
            <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
              {VILLAGE.name} saat ini berstatus sebagai <strong>Desa Mandiri</strong>, tingkat
              tertinggi dalam klasifikasi IDM Kementerian Desa.
            </p>
          </div>
        </section>

        {/* Score Overview */}
        <section className="px-4 -mt-10 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 p-8 rounded-[2rem] bg-primary text-primary-foreground shadow-xl flex flex-col justify-center items-center text-center">
                <div className="font-ui text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
                  Skor Akhir
                </div>
                <div className="font-display text-5xl font-bold mb-4">0.8942</div>
                <div className="px-4 py-1 rounded-full bg-white/20 font-ui text-sm font-bold">
                  MANDIRI
                </div>
              </div>

              <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
                <IDMCard
                  title="Indeks Ketahanan Sosial"
                  score={0.9124}
                  icon={Heart}
                  color="text-info"
                />
                <IDMCard
                  title="Indeks Ketahanan Ekonomi"
                  score={0.8421}
                  icon={TrendingUp}
                  color="text-primary"
                />
                <IDMCard
                  title="Indeks Ketahanan Ekologi"
                  score={0.9281}
                  icon={ShieldCheck}
                  color="text-success"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Analysis */}
        <section className="px-4 mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="font-display text-3xl font-bold text-ink mb-4">
                Analisis Tahun Berjalan
              </h2>
              <p className="font-body text-muted-foreground">
                Perbandingan skor IDM {VILLAGE.name} dalam 3 tahun terakhir menunjukkan tren positif
                yang stabil.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { year: "2025", status: "Mandiri", score: "0.8942", change: "+0.0210" },
                { year: "2024", status: "Mandiri", score: "0.8732", change: "+0.0345" },
                { year: "2023", status: "Maju", score: "0.8387", change: "+0.0120" },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-6 rounded-3xl border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className="font-display text-2xl font-bold text-primary/30">
                      {row.year}
                    </div>
                    <div>
                      <div className="font-display text-lg font-bold text-ink">{row.status}</div>
                      <div className="font-ui text-xs text-muted-foreground">Skor: {row.score}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-ui text-sm font-bold text-info">
                    <TrendingUp className="h-4 w-4" />
                    {row.change}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 p-8 rounded-3xl bg-muted/50 border border-border/50 flex flex-col sm:flex-row items-center gap-6">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shrink-0 border border-border">
                <Info className="h-8 w-8 text-primary/30" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="font-display text-lg font-bold text-ink">Apa itu IDM?</h4>
                <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">
                  Indeks Desa Membangun (IDM) adalah indeks komposit yang dibentuk dari Indeks
                  Ketahanan Sosial, Indeks Ketahanan Ekonomi dan Indeks Ketahanan Ekologi Desa.
                </p>
                <a
                  href="https://idm.kemendesa.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 font-ui text-xs font-bold text-primary hover:underline"
                >
                  Pelajari selengkapnya di situs Kemendesa
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
