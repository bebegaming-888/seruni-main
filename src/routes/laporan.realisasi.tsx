import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
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
  head: () => ({
    meta: [
      { title: `Realisasi Anggaran — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Laporan realisasi penggunaan Anggaran Pendapatan dan Belanja Desa (APBDes) ${VILLAGE.name}.`,
      },
    ],
  }),
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

export function RealisasiPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <TrendingUp className="h-3.5 w-3.5" />
              Transparansi Anggaran
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Realisasi APBDes 2025
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed">
              Laporan berkala mengenai penggunaan dana desa untuk pembangunan, pemberdayaan, dan
              pelayanan masyarakat {VILLAGE.name}.
            </p>
          </div>
        </section>

        {/* Overview Stats */}
        <section className="px-4 -mt-8 mb-16">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SummaryCard
              title="Total Pendapatan"
              amount="Rp 1.450.000.000"
              percentage={85}
              icon={PieChart}
              trend="up"
            />
            <SummaryCard
              title="Total Belanja"
              amount="Rp 920.000.000"
              percentage={62}
              icon={BarChart3}
              trend="up"
            />
            <SummaryCard
              title="Silpa Berjalan"
              amount="Rp 530.000.000"
              percentage={100}
              icon={Clock}
              trend="down"
            />
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
                  <ProgressBar label="Penyelenggaraan Pemerintah" value={78} />
                  <ProgressBar label="Pembangunan Desa" value={45} color="bg-info" />
                  <ProgressBar label="Pembinaan Masyarakat" value={92} color="bg-primary" />
                  <ProgressBar label="Pemberdayaan Masyarakat" value={30} color="bg-warning" />
                  <ProgressBar
                    label="Penanggulangan Bencana"
                    value={10}
                    color="bg-muted-foreground"
                  />
                </div>
              </div>

              {/* Status Kegiatan Utama */}
              <div className="bg-card border border-border rounded-[2.5rem] p-8 sm:p-10 shadow-sm">
                <h3 className="font-display text-xl font-bold text-ink mb-6 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Status Kegiatan Strategis
                </h3>
                <div className="space-y-6">
                  {[
                    {
                      name: "Pembangunan Jalan Dusun Timur",
                      status: "Selesai",
                      date: "Mei 2025",
                      type: "success",
                    },
                    {
                      name: "Rehabilitasi Balai Desa",
                      status: "Dalam Proses",
                      date: "Juni 2025",
                      type: "process",
                    },
                    {
                      name: "Program Ketahanan Pangan",
                      status: "Berjalan",
                      date: "Mei 2025",
                      type: "process",
                    },
                    {
                      name: "Pengadaan Mobil Siaga",
                      status: "Tahap Lelang",
                      date: "Juli 2025",
                      type: "warning",
                    },
                    {
                      name: "Bantuan Langsung Tunai (BLT)",
                      status: "Penyaluran",
                      date: "Rutin",
                      type: "success",
                    },
                  ].map((task, i) => (
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
                Pemerintah Desa Seruni Mumbul menjunjung tinggi keterbukaan informasi. Jika Anda
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
