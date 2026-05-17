import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import { useRealisasiStore } from "@/lib/content-store";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/laporan/realisasi")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Realisasi Anggaran — ${village.name}` },
        {
          name: "description",
          content: `Laporan realisasi penggunaan Anggaran Pendapatan dan Belanja Desa (APBDes) ${village.name}.`,
        },
      ],
    };
  },
  component: () => <RealisasiPage />,
});

function ProgressBar({
  value,
  label,
  color = "bg-primary",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-ui font-bold text-ink">{label}</span>
        <span className="font-ui text-muted-foreground">{value}%</span>
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50">
        <div
          className={`h-full ${color} transition-all duration-1000 shadow-sm`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  amount,
  percentage,
  icon: Icon,
  trend,
}: {
  title: string;
  amount: string;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down";
}) {
  return (
    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${trend === "up" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}
        >
          {percentage}% Target
        </div>
      </div>
      <div className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        {title}
      </div>
      <div className="font-display text-2xl font-bold text-ink">{amount}</div>
    </div>
  );
}

function formatRupiah(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function RealisasiPage() {
  const { village } = useSettings();
  const { items: realizeItems } = useRealisasiStore();

  const latestRealisasi = realizeItems.length
    ? [...realizeItems].sort((a, b) => b.tahun - a.tahun)[0]
    : null;

  const summaryCards = latestRealisasi
    ? [
        {
          title: "Total Pendapatan",
          amount: formatRupiah(latestRealisasi.total_pendapatan),
          percentage: latestRealisasi.total_pendapatan
            ? Math.round(
                (latestRealisasi.total_pendapatan / latestRealisasi.total_pendapatan) * 100,
              )
            : 0,
          icon: PieChart,
          trend: "up" as const,
        },
        {
          title: "Total Belanja",
          amount: formatRupiah(latestRealisasi.total_belanja),
          percentage: latestRealisasi.total_pendapatan
            ? Math.round((latestRealisasi.total_belanja / latestRealisasi.total_pendapatan) * 100)
            : 0,
          icon: BarChart3,
          trend: "up" as const,
        },
        {
          title: "Silpa Berjalan",
          amount: formatRupiah(latestRealisasi.silpa),
          percentage: latestRealisasi.total_pendapatan
            ? Math.round((latestRealisasi.silpa / latestRealisasi.total_pendapatan) * 100)
            : 0,
          icon: Clock,
          trend: latestRealisasi.silpa >= 0 ? ("down" as const) : ("up" as const),
        },
      ]
    : [
        {
          title: "Total Pendapatan",
          amount: "Rp 1.450.000.000",
          percentage: 85,
          icon: PieChart,
          trend: "up" as const,
        },
        {
          title: "Total Belanja",
          amount: "Rp 920.000.000",
          percentage: 62,
          icon: BarChart3,
          trend: "up" as const,
        },
        {
          title: "Silpa Berjalan",
          amount: "Rp 530.000.000",
          percentage: 100,
          icon: Clock,
          trend: "down" as const,
        },
      ];

  const progressBars = [
    { key: "Penyelenggaraan Pemerintah", value: 78, color: "bg-primary" },
    { key: "Pembangunan Desa", value: 45, color: "bg-info" },
    { key: "Pembinaan Masyarakat", value: 92, color: "bg-primary" },
    { key: "Pemberdayaan Masyarakat", value: 30, color: "bg-warning" },
    { key: "Penanggulangan Bencana", value: 10, color: "bg-muted-foreground" },
  ];

  const kegiatanList = latestRealisasi?.kegiatan?.length
    ? latestRealisasi.kegiatan
    : [
        {
          name: "Pembangunan Jalan usat",
          status: "Selesai",
          date: "Mei 2025",
          type: "success" as const,
        },
        {
          name: "Rehabilitasi Balai usat",
          status: "Dalam Proses",
          date: "Juni 2025",
          type: "process" as const,
        },
        {
          name: "Program Ketahanan Pangan",
          status: "Berjalan",
          date: "Mei 2025",
          type: "process" as const,
        },
        {
          name: "Pengadaan Mobil Siaga",
          status: "Tahap Lelang",
          date: "Juli 2025",
          type: "warning" as const,
        },
        {
          name: "Bantuan Langsung Tunai (BLT)",
          status: "Penyaluran",
          date: "Rutin",
          type: "success" as const,
        },
      ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Realisasi"
          titleSecond="APBDes"
          description={
            "Laporan berkala penggunaan dana desa untuk pembangunan dan pelayanan masyarakat."
          }
          badge="Transparansi Anggaran"
          badgeIcon={<TrendingUp className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Laporan" }, { label: "Realisasi" }]}
        />

        {/* Overview Stats */}
        <section className="px-4 -mt-8 mb-16">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaryCards.map((card) => (
              <SummaryCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* Detailed Progress */}
        <section className="px-4 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Belanja per Bidang */}
              <div className="space-y-8">
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink mb-2">
                    Progres per Bidang
                  </h3>
                  <p className="font-body text-sm text-muted-foreground">
                    Persentase penyerapan anggaran berdasarkan kategori utama.
                  </p>
                </div>
                <div className="space-y-6">
                  {progressBars.map((bar) => (
                    <ProgressBar
                      key={bar.key}
                      label={bar.key}
                      value={bar.value}
                      color={bar.color}
                    />
                  ))}
                </div>
              </div>

              {/* Status Kegiatan Utama */}
              <div className="bg-card border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-sm">
                <h3 className="font-display text-xl font-bold text-ink mb-6 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Status Kegiatan Strategis
                </h3>
                <div className="space-y-6">
                  {kegiatanList.map((task, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex gap-3">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            task.type === "success"
                              ? "bg-info"
                              : task.type === "process"
                                ? "bg-primary"
                                : "bg-warning"
                          }`}
                        />
                        <div>
                          <div className="font-ui text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                            {task.name}
                          </div>
                          <div className="font-body text-[11px] text-muted-foreground">
                            {task.date}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-ui text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          task.type === "success"
                            ? "bg-info/10 text-info"
                            : task.type === "process"
                              ? "bg-primary/10 text-primary"
                              : "bg-warning/10 text-warning"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-8 py-3 rounded-2xl border border-border font-ui text-sm font-bold text-ink hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  Unduh Laporan Lengkap (PDF)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Note */}
        <section className="px-4 mb-20">
          <div className="max-w-5xl mx-auto p-8 rounded-3xl bg-muted/50 border border-border/50 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border border-border">
              <AlertCircle className="h-8 w-8 text-primary/40" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-ink">
                Butuh Penjelasan Lebih Lanjut?
              </h4>
              <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">
                Pemerintah Desa {village.name} menjunjung tinggi keterbukaan informasi. Jika Anda
                memiliki pertanyaan mengenai penggunaan dana desa, silakan datang ke Kantor Desa
                atau hubungi kami melalui kanal pengaduan.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
