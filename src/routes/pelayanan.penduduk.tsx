import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Link } from "@/components/Link";
import { ChartContainer } from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  Baby,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  TrendingUp,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

export const Route = createFileRoute("/pelayanan/penduduk")({
  head: () => ({
    meta: [
      { title: `Statistik Penduduk — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Statistik demografi dan data kependudukan ${VILLAGE.name}.`,
      },
    ],
  }),
  component: PendudukPage,
});

// ---- COMPUTED STATS ----
const TOTAL_PENDUDUK = 1847;
const TOTAL_KK = 467;
const JK = {
  laki: Math.round(TOTAL_PENDUDUK * 0.487),
  perempuan: Math.round(TOTAL_PENDUDUK * 0.513),
};
const KELOMPOK_UMUR = [
  { name: "0–4", value: 112 },
  { name: "5–9", value: 148 },
  { name: "10–14", value: 163 },
  { name: "15–19", value: 171 },
  { name: "20–24", value: 155 },
  { name: "25–29", value: 142 },
  { name: "30–34", value: 138 },
  { name: "35–39", value: 129 },
  { name: "40–44", value: 121 },
  { name: "45–49", value: 113 },
  { name: "50–54", value: 98 },
  { name: "55–59", value: 84 },
  { name: "60–64", value: 71 },
  { name: "65+", value: 102 },
];
const UMUR_PIE = [
  { name: "Anak (0–14)", value: 423, color: "#0891b2" },
  { name: "Produktif (15–64)", value: 1222, color: "#0f7a4a" },
  { name: "Lansia (65+)", value: 202, color: "#d97706" },
];
const PEKERJAAN = [
  { name: "Petani", value: 412 },
  { name: "IRT", value: 287 },
  { name: "Karyawan Swasta", value: 231 },
  { name: "Wiraswasta", value: 178 },
  { name: "PNS", value: 42 },
  { name: "Guru", value: 38 },
  { name: "Buruh", value: 112 },
  { name: "Pelajar/Mahasiswa", value: 298 },
  { name: "Lainnya", value: 249 },
];
const AGAMA = [
  { name: "Islam", value: 1831 },
  { name: "Hindu", value: 11 },
  { name: "Kristen", value: 5 },
];
const PENDIDIKAN = [
  { name: "Tidak/Belum Sekolah", value: 124 },
  { name: "SD", value: 398 },
  { name: "SMP", value: 341 },
  { name: "SMA", value: 512 },
  { name: "D1–D3", value: 142 },
  { name: "S1+", value: 330 },
];
const DUSUN = [
  { name: "Dusun Timur", value: 498, kepala: "H. M. Ali Akbar" },
  { name: "Dusun Barat", value: 412, kepala: "Lalu Gunawan" },
  { name: "Dusun Utara", value: 489, kepala: "Baiq Nurul H." },
  { name: "Dusun Selatan", value: 448, kepala: "Siti Aminah" },
];
const STATUS_KAWIN = [
  { name: "Belum Kawin", value: 731 },
  { name: "Kawin", value: 982 },
  { name: "Cerai", value: 78 },
  { name: "Duda/Janda", value: 56 },
];

const JK_COLORS = ["#0f7a4a", "#dc2626"];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-foreground mb-1">{value}</p>
      <p className="font-ui text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function PendudukPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Data Kependudukan
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Statistik Demografi
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Data dan statistik kependudukan {VILLAGE.name}. Informasi agregat ini bersumber dari
              data penduduk yang terintegrasi dengan sistem desa.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-3 py-1 font-ui text-xs font-semibold text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Sumber: Data Simulasi — update Mei 2026
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="px-4 -mt-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="Total Penduduk"
                value={TOTAL_PENDUDUK.toLocaleString("id-ID")}
                subtitle="Jiwa"
                icon={Users}
                color="#0f7a4a"
              />
              <StatCard
                title="Total KK"
                value={TOTAL_KK.toLocaleString("id-ID")}
                subtitle="Kartu Keluarga"
                icon={UserCheck}
                color="#0891b2"
              />
              <StatCard
                title="Perbandingan JK"
                value={`${JK.laki} : ${JK.perempuan}`}
                subtitle="Laki-laki : Perempuan"
                icon={Baby}
                color="#7c3aed"
              />
              <StatCard
                title="Rasio Dependency"
                value="51%"
                subtitle="Penduduk tidak produktif per 100 produktif"
                icon={HeartHandshake}
                color="#d97706"
              />
            </div>
          </div>
        </section>

        {/* Gender & Age Charts */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Gender Pie */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Komposisi Jenis Kelamin
                </h3>
                <ChartContainer
                  config={{
                    laki: { label: "Laki-laki", color: JK_COLORS[0] },
                    perempuan: { label: "Perempuan", color: JK_COLORS[1] },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Laki-laki", value: JK.laki },
                          { name: "Perempuan", value: JK.perempuan },
                        ]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={88}
                      >
                        {JK_COLORS.map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => v.toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Legend
                        content={({ payload }) => (
                          <div className="flex justify-center gap-4 pt-2">
                            {(payload ?? []).map((e) => (
                              <div
                                key={e.value}
                                className="flex items-center gap-1.5 font-ui text-xs"
                              >
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: e.color as string }}
                                />
                                {e.value} (
                                {Math.round(
                                  (JK[e.value as keyof typeof JK] / TOTAL_PENDUDUK) * 100,
                                )}
                                %)
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Age Groups Bar */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Kelompok Umur
                </h3>
                <ChartContainer
                  config={{ value: { label: "Jumlah", color: "#0891b2" } }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer>
                    <BarChart
                      data={KELOMPOK_UMUR}
                      margin={{ top: 0, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip
                        formatter={(v) => v.toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="value" fill="#0891b2" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Three-column charts */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pekerjaan */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Briefcase className="inline h-3.5 w-3.5 mr-1" />
                  Pekerjaan
                </h3>
                <ChartContainer
                  config={{ value: { label: "Orang", color: "#0f7a4a" } }}
                  className="h-[180px]"
                >
                  <ResponsiveContainer>
                    <BarChart
                      data={PEKERJAAN.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis dataKey="name" tick={{ fontSize: 9 }} width={40} />
                      <Tooltip
                        formatter={(v) => (v as number).toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="value" fill="#0f7a4a" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Pendidikan */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <GraduationCap className="inline h-3.5 w-3.5 mr-1" />
                  Pendidikan
                </h3>
                <ChartContainer
                  config={{ value: { label: "Orang", color: "#7c3aed" } }}
                  className="h-[180px]"
                >
                  <ResponsiveContainer>
                    <BarChart
                      data={PENDIDIKAN}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 60, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis dataKey="name" tick={{ fontSize: 9 }} width={60} />
                      <Tooltip
                        formatter={(v) => (v as number).toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="value" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Status Kawin */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <HeartHandshake className="inline h-3.5 w-3.5 mr-1" />
                  Status Perkawinan
                </h3>
                <ChartContainer config={{}} className="h-[180px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={STATUS_KAWIN}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={78}
                      >
                        {STATUS_KAWIN.map((_, i) => (
                          <Cell key={i} fill={["#0891b2", "#0f7a4a", "#d97706", "#6b7280"][i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => (v as number).toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Legend
                        content={({ payload }) => (
                          <div className="flex flex-col gap-1 pt-2">
                            {(payload ?? []).map((e, i) => (
                              <div
                                key={e.value}
                                className="flex items-center gap-1.5 font-ui text-[10px]"
                              >
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: ["#0891b2", "#0f7a4a", "#d97706", "#6b7280"][
                                      i
                                    ],
                                  }}
                                />
                                <span className="truncate">{e.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Agama & Produktif */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Agama */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Users className="inline h-3.5 w-3.5 mr-1" />
                  Komposisi Agama
                </h3>
                <div className="space-y-3">
                  {AGAMA.map((a) => (
                    <div key={a.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-ui text-xs font-medium text-foreground">
                          {a.name}
                        </span>
                        <span className="font-ui text-xs font-bold text-foreground">
                          {a.value.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${Math.round((a.value / TOTAL_PENDUDUK) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usia Produktif */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
                  Rasio Usia Produktif
                </h3>
                <ChartContainer config={{}} className="h-[180px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={UMUR_PIE}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {UMUR_PIE.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => (v as number).toLocaleString("id-ID")}
                        labelStyle={{ fontSize: 11 }}
                      />
                      <Legend
                        content={({ payload }) => (
                          <div className="flex flex-col gap-1 pt-2">
                            {(payload ?? []).map((e, i) => (
                              <div
                                key={e.value}
                                className="flex items-center gap-1.5 font-ui text-[10px]"
                              >
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: UMUR_PIE[i].color }}
                                />
                                <span className="truncate">{e.value}</span>
                                <span className="ml-auto font-semibold">
                                  {Math.round((UMUR_PIE[i].value / TOTAL_PENDUDUK) * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Per-Dusun */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-ink mb-4">Statistik per-Dusun</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DUSUN.map((d, i) => (
                <div key={d.name} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center text-white font-display text-sm font-bold ${["bg-primary", "bg-info", "bg-warning", "bg-success"][i]}`}
                    >
                      {d.name[0]}
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-ink">{d.name}</p>
                      <p className="font-ui text-[10px] text-muted-foreground">Dusun</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-ui text-xs text-muted-foreground">Penduduk</span>
                      <span className="font-ui text-xs font-bold text-foreground">
                        {d.value.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-ui text-xs text-muted-foreground">Kepala DTS</span>
                      <span className="font-ui text-[10px] text-foreground truncate max-w-[120px]">
                        {d.kepala}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
