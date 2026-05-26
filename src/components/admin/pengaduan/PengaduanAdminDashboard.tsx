import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ChevronRight,
  XCircle,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  loadPengaduan,
  loadStats,
  updatePengaduan,
  listPengaduanItems,
  getStats,
  type PengaduanAdminItem,
  type PengaduanStats,
  type PengaduanFilters,
} from "@/lib/pengaduan-admin-store";

// Recharts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Baru: { label: "Baru", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  Diproses: {
    label: "Diproses",
    color: "bg-info/10 text-info border-info/30",
    icon: AlertTriangle,
  },
  Selesai: {
    label: "Selesai",
    color: "bg-success/10 text-success border-success/30",
    icon: CheckCircle2,
  },
  Ditolak: {
    label: "Ditolak",
    color: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
  },
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--info))",
];

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-")}/10`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

export function PengaduanAdminDashboard() {
  const [stats, setStats] = useState<PengaduanStats | null>(null);
  const [items, setItems] = useState<PengaduanAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PengaduanAdminItem | null>(null);
  const [filter, setFilter] = useState<PengaduanFilters>({});
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadPengaduan(filter)]);
    setStats(getStats());
    setItems(listPengaduanItems());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (ticket: string, newStatus: string) => {
    setUpdating(ticket);
    const result = await updatePengaduan(ticket, {
      status: newStatus as "Baru" | "Diproses" | "Selesai" | "Ditolak",
    });
    setUpdating(null);
    if (result) {
      toast.success(`Status pengaduan ${ticket} diupdate ke "${newStatus}"`);
      setItems(listPengaduanItems());
    } else {
      toast.error("Gagal mengupdate status");
    }
  };

  const filtered = search
    ? items.filter(
        (i) =>
          i.ticket.includes(search.toUpperCase()) ||
          i.judul.toLowerCase().includes(search.toLowerCase()) ||
          i.nama.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pengaduan & Aspirasi</h2>
          <p className="text-sm text-muted-foreground">
            Kelola pengaduan warga — statistik &amp; detail
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={MessageSquare}
            color="text-foreground"
          />
          <StatCard
            label="Baru"
            value={stats.byStatus.Baru ?? 0}
            icon={Clock}
            color="text-warning"
          />
          <StatCard
            label="Diproses"
            value={stats.byStatus.Diproses ?? 0}
            icon={AlertTriangle}
            color="text-info"
          />
          <StatCard
            label="Selesai"
            value={stats.byStatus.Selesai ?? 0}
            icon={CheckCircle2}
            color="text-success"
          />
        </div>
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 30-Day Trend */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tren 30 Hari
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v) =>
                    new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Kategori Breakdown */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Kategori
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.topKategori} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="kategori" type="category" tick={{ fontSize: 9 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Stats Row 2 */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Rata-rata Waktu Penyelesaian</h3>
            <p className="text-3xl font-bold text-primary">{stats.avgResolutionDays}</p>
            <p className="text-sm text-muted-foreground">hari dari submit sampai selesai</p>
            {stats.avgResolutionDays > 7 && (
              <Badge variant="destructive" className="mt-2">
                Melebihi SLA (7 hari)
              </Badge>
            )}
          </Card>

          {/* Monthly Bar Chart */}
          <Card className="p-5 col-span-2">
            <h3 className="font-semibold mb-4">Pengaduan Bulanan {new Date().getFullYear()}</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(m) =>
                    new Date(0, m - 1).toLocaleDateString("id-ID", { month: "short" })
                  }
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ticket, judul, nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filter.status ?? ""}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Status</option>
          {Object.keys(STATUS_CONFIG).map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilter({});
            setSearch("");
          }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Tiket</th>
                <th className="text-left py-3 px-4 font-semibold">Tanggal</th>
                <th className="text-left py-3 px-4 font-semibold">Kategori</th>
                <th className="text-left py-3 px-4 font-semibold">Judul</th>
                <th className="text-left py-3 px-4 font-semibold">Pelapor</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Belum ada pengaduan
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["Baru"];
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.ticket} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-primary">
                        {item.ticket}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {item.kategori}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium max-w-[200px] truncate">{item.judul}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.nama}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}
                        >
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            aria-label="Lihat detail pengaduan"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status === "Baru" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(item.ticket, "Diproses")}
                              disabled={updating === item.ticket}
                            >
                              Proses
                            </Button>
                          )}
                          {item.status === "Diproses" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(item.ticket, "Selesai")}
                              disabled={updating === item.ticket}
                              aria-label="Tandai selesai"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <div>
                <p className="font-mono font-bold text-lg text-primary">{selectedItem.ticket}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedItem.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup detail"
              >
                ✕
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nama</span>
                  <p className="font-semibold">{selectedItem.nama}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kontak</span>
                  <p className="font-semibold">{selectedItem.kontak}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kategori</span>
                  <p className="font-semibold">{selectedItem.kategori}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioritas</span>
                  <Badge variant={selectedItem.prioritas === "Urgent" ? "destructive" : "outline"}>
                    {selectedItem.prioritas}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Judul</span>
                <p className="font-semibold text-lg">{selectedItem.judul}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Isi Pengaduan</span>
                <p className="text-sm mt-1 p-3 bg-muted/50 rounded-xl">{selectedItem.isi}</p>
              </div>
              {selectedItem.admin_catatan && (
                <div>
                  <span className="text-sm text-muted-foreground">Catatan Admin</span>
                  <p className="text-sm mt-1 p-3 bg-warning/5 rounded-xl border border-warning/20">
                    {selectedItem.admin_catatan}
                  </p>
                </div>
              )}
              {selectedItem.admin_tindak && (
                <div>
                  <span className="text-sm text-muted-foreground">Tindakan Admin</span>
                  <p className="text-sm mt-1 p-3 bg-success/5 rounded-xl border border-success/20">
                    {selectedItem.admin_tindak}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedItem.status === "Baru" && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedItem.ticket, "Diproses");
                      setSelectedItem(null);
                    }}
                  >
                    Tandai Diproses
                  </Button>
                )}
                {selectedItem.status === "Diproses" && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedItem.ticket, "Selesai");
                      setSelectedItem(null);
                    }}
                  >
                    Tandai Selesai
                  </Button>
                )}
                {selectedItem.status !== "Ditolak" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleStatusUpdate(selectedItem.ticket, "Ditolak");
                      setSelectedItem(null);
                    }}
                  >
                    Tolak
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
