import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { useSettings, getSettings } from "@/lib/settings-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, PieChart as PieIcon, BarChart3, Download, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  loadStatistik,
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
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
];

export const Route = createFileRoute("/informasi/statistik")({
  head: () => ({
    meta: [
      { title: "Statistik Kependudukan — Seruni Mumbul" },
      { name: "description", content: "Data statistik kependudukan Desa Seruni Mumbul." },
    ],
  }),
  component: () => <StatistikPage />,
});

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
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </Card>
  );
}

function StatistikPage() {
  const { village } = useSettings();
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Statistik"
          titleSecond="Kependudukan"
          description={`Data demografi dan statistik warga ${village.name}.`}
          badge="Data Desa"
          badgeIcon={<Users className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Informasi" }, { label: "Statistik" }]}
        />

        <section className="px-4 py-12">
          <div className="max-w-7xl mx-auto space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !data ? (
              <div className="text-center py-12 text-muted-foreground">
                Gagal memuat data statistik. Pastikan Anda terhubung ke internet.
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Total Penduduk"
                    value={data.total.toLocaleString("id-ID")}
                    sub={`Rata-rata usia: ${data.avgAge} th`}
                    icon={Users}
                  />
                  <StatCard
                    label="Laki-Laki"
                    value={(data.gender["Laki-Laki"] ?? 0).toLocaleString("id-ID")}
                    sub={formatPercentage(data.gender["Laki-Laki"] ?? 0, data.total)}
                    icon={Users}
                  />
                  <StatCard
                    label="Perempuan"
                    value={(data.gender["Perempuan"] ?? 0).toLocaleString("id-ID")}
                    sub={formatPercentage(data.gender["Perempuan"] ?? 0, data.total)}
                    icon={Users}
                  />
                  <StatCard
                    label="Rasio Gender (L/P)"
                    value={data.genderRatio ?? "N/A"}
                    sub={`${(data.gender["Laki-Laki"] ?? 0) + (data.gender["Perempuan"] ?? 0)} terdata`}
                    icon={PieIcon}
                  />
                </div>

                {/* Charts Row 1 */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Gender Pie */}
                  <ChartCard title="Distribusi Jenis Kelamin">
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Laki-Laki", value: data.gender["Laki-Laki"] ?? 0 },
                              { name: "Perempuan", value: data.gender["Perempuan"] ?? 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            dataKey="value"
                          >
                            {[{ name: "Laki-Laki" }, { name: "Perempuan" }].map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 flex-1">
                        {[
                          { name: "Laki-Laki", val: data.gender["Laki-Laki"] ?? 0 },
                          { name: "Perempuan", val: data.gender["Perempuan"] ?? 0 },
                        ].map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[i] }}
                              />
                              <span className="text-sm">{d.name}</span>
                            </div>
                            <span className="font-bold">{d.val.toLocaleString("id-ID")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>

                  {/* Age Group Bar */}
                  <ChartCard title="Distribusi Kelompok Umur">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={data.ageGroups.map((g) => ({ name: g.label, jumlah: g.count }))}
                      >
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
                  {/* Top Pekerjaan */}
                  <ChartCard title="10 Besar Pekerjaan">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={data.pekerjaan.slice(0, 10).map((p) => ({
                          name: p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name,
                          jumlah: p.count,
                        }))}
                        layout="vertical"
                        margin={{ left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={110} />
                        <Tooltip formatter={(v) => [`${v} orang`, "Pekerjaan"]} />
                        <Bar dataKey="jumlah" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Agama */}
                  <ChartCard title="Distribusi Agama">
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie
                            data={data.agama.map((a) => ({ name: a.name, value: a.count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {data.agama.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {data.agama.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              />
                              <span className="truncate">{d.name}</span>
                            </div>
                            <span className="font-semibold">{d.count.toLocaleString("id-ID")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                </div>

                {/* Wilayah Distribution */}
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Distribusi per Wilayah</h3>
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

                {/* Footer note */}
                <div className="text-center text-xs text-muted-foreground">
                  Sumber data: Database warga {village.name} · Tahun {year} · Update:{" "}
                  {new Date().toLocaleDateString("id-ID")}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
