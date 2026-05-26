import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getVillage } from "@/lib/village-dynamic";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { listArchive, type SuratRecord } from "@/lib/esurat-store";
import { listTemplates } from "@/lib/template-store";
import { initEsuratStore, syncPullArchive } from "@/lib/useSupabaseSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/pelayanan/surat-terbit")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Surat Terbit — ${village.name}` },
        {
          name: "description",
          content: `Daftar surat yang telah diterbitkan oleh ${village.name}`,
        },
      ],
    };
  },
  component: () => <SuratTerbitPage />,
});

const PAGE_SIZE = 15;
const STATUS_COLORS: Record<string, string> = {
  Disetujui: "hsl(158,64%,42%)", // #10b981
  Ditolak: "hsl(4,90%,58%)", // #ef4444
};

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub: string;
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
      <p className="font-ui text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function SuratTerbitPage() {
  const { village } = useSettings();
  const [archiveLoaded, setArchiveLoaded] = useState(false);
  // RC-1 FIX: Load archive from IndexedDB + pull from Supabase before render
  useEffect(() => {
    let mounted = true;
    initEsuratStore()
      .then(() => syncPullArchive())
      .then(() => {
        if (mounted) setArchiveLoaded(true);
      })
      .catch(() => {
        if (mounted) setArchiveLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const allArchive = useMemo(() => listArchive(), []);
  const templates = useMemo(() => listTemplates(), []);

  // Filters
  const [fStatus, setFStatus] = useState("");
  const [fKode, setFKode] = useState("");
  const [fBulan, setFBulan] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const hasFilter = !!(fStatus || fKode || fBulan || q);

  function clearFilters() {
    setFStatus("");
    setFKode("");
    setFBulan("");
    setQ("");
    setPage(1);
  }

  // Stats
  const stats = useMemo(() => {
    const total = allArchive.length;
    const disetujui = allArchive.filter((r) => r.status === "Disetujui").length;
    const ditolak = allArchive.filter((r) => r.status === "Ditolak").length;

    // Group by month (last 6 months)
    const now = new Date();
    const monthlyData: Record<string, { disetujui: number; ditolak: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[key] = { disetujui: 0, ditolak: 0 };
    }

    allArchive.forEach((r) => {
      const date = new Date(r.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[key]) {
        if (r.status === "Disetujui") monthlyData[key].disetujui++;
        else if (r.status === "Ditolak") monthlyData[key].ditolak++;
      }
    });

    const chartData = Object.entries(monthlyData).map(([key, val]) => {
      const [y, m] = key.split("-");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      return {
        bulan: monthNames[parseInt(m) - 1],
        Disetujui: val.disetujui,
        Ditolak: val.ditolak,
      };
    });

    // Group by kode surat
    const byKode: Record<string, number> = {};
    allArchive.forEach((r) => {
      byKode[r.kode] = (byKode[r.kode] || 0) + 1;
    });
    const pieData = Object.entries(byKode)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kode, count]) => {
        const tmpl = templates.find((t) => t.code === kode);
        return { name: tmpl?.name || kode, value: count };
      });

    return { total, disetujui, ditolak, chartData, pieData };
  }, [allArchive, templates]);

  // Filtered data
  const filtered = useMemo(() => {
    let result = allArchive;

    if (fStatus) result = result.filter((r) => r.status === fStatus);
    if (fKode) result = result.filter((r) => r.kode === fKode);
    if (fBulan) {
      result = result.filter((r) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === fBulan;
      });
    }
    if (q) {
      const lq = q.toLowerCase();
      result = result.filter(
        (r) =>
          r.no.toLowerCase().includes(lq) ||
          r.pemohon.toLowerCase().includes(lq) ||
          r.nama_surat.toLowerCase().includes(lq),
      );
    }

    return result.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  }, [allArchive, fStatus, fKode, fBulan, q]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique kode list for filter
  const uniqueKode = useMemo(() => {
    const codes = new Set(allArchive.map((r) => r.kode));
    return Array.from(codes).sort();
  }, [allArchive]);

  // Unique month list for filter
  const uniqueMonths = useMemo(() => {
    const months = new Set(
      allArchive.map((r) => {
        const d = new Date(r.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }),
    );
    return Array.from(months).sort().reverse();
  }, [allArchive]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <PageHero
        titleFirst="Surat"
        titleSecond="Terbit"
        description={`Daftar surat yang telah diterbitkan oleh ${village.name}`}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Surat Terbit" },
        ]}
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Surat"
            value={stats.total.toLocaleString("id-ID")}
            sub="Surat yang telah diproses"
            icon={FileText}
            color="hsl(190,75%,36%)"
          />
          <StatCard
            title="Disetujui"
            value={stats.disetujui.toLocaleString("id-ID")}
            sub="Surat yang disetujui"
            icon={CheckCircle2}
            color="hsl(158,64%,42%)"
          />
          <StatCard
            title="Ditolak"
            value={stats.ditolak.toLocaleString("id-ID")}
            sub="Surat yang ditolak"
            icon={XCircle}
            color="hsl(4,90%,58%)"
          />
          <StatCard
            title="Tingkat Persetujuan"
            value={`${stats.total > 0 ? Math.round((stats.disetujui / stats.total) * 100) : 0}%`}
            sub="Rasio surat disetujui"
            icon={TrendingUp}
            color="hsl(38,93%,47%)"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart — Tren Bulanan */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold mb-4 text-foreground">
              Tren Surat (6 Bulan Terakhir)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid hsl(220,13%,91%)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Disetujui" fill="hsl(158,64%,42%)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Ditolak" fill="hsl(4,90%,58%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart — Top 5 Jenis Surat */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold mb-4 text-foreground">
              Top 5 Jenis Surat
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.value})`}
                  outerRadius={80}
                  fill="hsl(245,47%,65%)"
                  dataKey="value"
                >
                  {stats.pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [
                          "hsl(190,75%,36%)",
                          "hsl(183,50%,58%)",
                          "hsl(27,55%,71%)",
                          "hsl(27,79%,52%)",
                          "hsl(0,0%,84%)",
                        ][index % 5]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filter Surat
            </h3>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor, nama..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Status */}
            <Select
              value={fStatus}
              onValueChange={(v) => {
                setFStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Status</SelectItem>
                <SelectItem value="Disetujui">Disetujui</SelectItem>
                <SelectItem value="Ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>

            {/* Jenis Surat */}
            <Select
              value={fKode}
              onValueChange={(v) => {
                setFKode(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Jenis</SelectItem>
                {uniqueKode.map((code) => {
                  const tmpl = templates.find((t) => t.code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      {tmpl?.name || code}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Bulan */}
            <Select
              value={fBulan}
              onValueChange={(v) => {
                setFBulan(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Bulan</SelectItem>
                {uniqueMonths.map((m) => {
                  const [y, mon] = m.split("-");
                  const monthNames = [
                    "Januari",
                    "Februari",
                    "Maret",
                    "April",
                    "Mei",
                    "Juni",
                    "Juli",
                    "Agustus",
                    "September",
                    "Oktober",
                    "November",
                    "Desember",
                  ];
                  return (
                    <SelectItem key={m} value={m}>
                      {monthNames[parseInt(mon) - 1]} {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {hasFilter && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <FileCheck className="h-4 w-4" />
              Menampilkan {filtered.length} dari {allArchive.length} surat
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    No. Surat
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Jenis Surat
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pemohon
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="font-ui text-sm text-muted-foreground">
                        {hasFilter
                          ? "Tidak ada surat yang sesuai filter"
                          : "Belum ada surat terbit"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const tmpl = templates.find((t) => t.code === r.kode);
                    const date = new Date(r.created_at);
                    return (
                      <tr key={r.no} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-foreground">
                            {r.no}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-ui text-sm font-medium text-foreground">
                              {tmpl?.name || r.nama_surat}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {r.kode}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-ui text-sm text-foreground">{r.pemohon}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-ui text-sm text-foreground">
                              {date.toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={r.status === "Disetujui" ? "default" : "destructive"}
                            className="font-ui text-xs"
                          >
                            {r.status === "Disetujui" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <p className="font-ui text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} ({filtered.length} surat)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
