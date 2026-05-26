import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, PieChart as PieIcon, BarChart3, Download, RefreshCw, Loader2 } from "lucide-react";
import {
  loadStatistik,
  loadChart,
  getStatistik,
  formatPercentage,
  type StatistikPenduduk,
} from "@/lib/statistik-store";
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

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
];

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">{title}</h3>
      {children}
    </Card>
  );
}

export function StatistikDashboard() {
  const [data, setData] = useState<StatistikPenduduk | null>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const fetch = useCallback(async () => {
    setLoading(true);
    const result = await loadStatistik(year);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data)
    return (
      <div role="alert" className="text-center py-12 space-y-4">
        <p className="text-muted-foreground font-ui text-sm">Gagal memuat data statistik.</p>
        <button
          onClick={fetch}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    );

  const genderPie = [
    { name: "Laki-Laki", value: data.gender["Laki-Laki"] ?? 0 },
    { name: "Perempuan", value: data.gender["Perempuan"] ?? 0 },
  ];

  const ageBar = data.ageGroups.map((g) => ({ name: g.label, jumlah: g.count }));
  const pekerjaanBar = data.pekerjaan.slice(0, 8).map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
    jumlah: p.count,
  }));
  const agamaPie = data.agama.map((a) => ({ name: a.name, value: a.count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Statistik Kependudukan</h2>
          <p className="text-sm text-muted-foreground">Data demografi warga — Tahun {year}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch} aria-label="Refresh data statistik">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" aria-label="Export data ke CSV">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Penduduk"
          value={data.total.toLocaleString("id-ID")}
          sub={`Rata-rata usia: ${data.avgAge} tahun`}
          icon={Users}
        />
        <StatCard
          label="Rasio Gender (L/P)"
          value={data.genderRatio ? `${data.genderRatio}` : "N/A"}
          sub={`L: ${data.gender["Laki-Laki"] ?? 0} | P: ${data.gender["Perempuan"] ?? 0}`}
          icon={PieIcon}
        />
        <StatCard
          label="Pekerjaan Terbanyak"
          value={data.pekerjaan[0]?.name ?? "-"}
          sub={`${data.pekerjaan[0]?.count ?? 0} orang`}
          icon={BarChart3}
        />
        <StatCard
          label="Agama Terbanyak"
          value={data.agama[0]?.name ?? "-"}
          sub={`${data.agama[0]?.count ?? 0} orang`}
          icon={Users}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gender Pie */}
        <ChartCard title="Distribusi Jenis Kelamin">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={genderPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                >
                  {genderPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {genderPie.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{d.value.toLocaleString("id-ID")}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatPercentage(d.value, data.total)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Age Group Bar */}
        <ChartCard title="Distribusi Kelompok Umur">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageBar} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v} orang`, "Jumlah"]} />
              <Bar dataKey="jumlah" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pekerjaan */}
        <ChartCard title="Top 8 Pekerjaan">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pekerjaanBar} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
              <Tooltip formatter={(v) => [`${v} orang`, "Pekerjaan"]} />
              <Bar dataKey="jumlah" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Agama */}
        <ChartCard title="Distribusi Agama">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={agamaPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {agamaPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {agamaPie.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate">{d.name}</span>
                  </div>
                  <span className="font-medium text-right">{d.value.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Tabel Pendidikan & Perkawinan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Tingkat Pendidikan</h3>
          <div className="space-y-2">
            {data.pendidikan.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-sm">{p.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: formatPercentage(p.count, data.total) }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">
                    {p.count.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Status Perkawinan</h3>
          <div className="space-y-2">
            {data.perkawinan.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-sm">{p.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-info rounded-full"
                      style={{ width: formatPercentage(p.count, data.total) }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">
                    {p.count.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Wilayah Table */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Distribusi per Wilayah (Dusun/RT/RW)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold">Wilayah</th>
                <th className="text-right py-2 px-3 font-semibold">Jumlah</th>
                <th className="text-right py-2 px-3 font-semibold">Persentase</th>
              </tr>
            </thead>
            <tbody>
              {data.wilayah.map((w) => (
                <tr key={w.name} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3">{w.name}</td>
                  <td className="py-2 px-3 text-right font-semibold">
                    {w.count.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {formatPercentage(w.count, data.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
