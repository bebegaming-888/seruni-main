import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Warehouse,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  Download,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import {
  loadInventaris,
  loadInventarisCategories,
  loadInventarisSummary,
  addInventarisAsset,
  updateInventarisAsset,
  deleteInventarisAsset,
  formatRupiah,
  CONDITION_LABELS,
  CONDITION_COLORS,
  STATUS_LABELS,
  type InventarisAsset,
  type InventarisCategory,
  type InventarisSummary,
} from "@/lib/inventaris-store";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const COND_CHART_COLORS = [
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--info))",
];

const STATUS_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${accent ?? "text-foreground"}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}

interface AssetFormData {
  name: string;
  category_id: string;
  code: string;
  description: string;
  condition: string;
  acquisition_date: string;
  acquisition_value: string;
  location: string;
  responsible: string;
  dusun: string;
  year_acquired: string;
  status: string;
  notes: string;
}

const EMPTY_FORM: AssetFormData = {
  name: "",
  category_id: "",
  code: "",
  description: "",
  condition: "baik",
  acquisition_date: "",
  acquisition_value: "",
  location: "",
  responsible: "",
  dusun: "",
  year_acquired: "",
  status: "owned",
  notes: "",
};

export function InventarisDashboard() {
  const [assets, setAssets] = useState<InventarisAsset[]>([]);
  const [categories, setCategories] = useState<InventarisCategory[]>([]);
  const [summary, setSummary] = useState<InventarisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventarisAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventarisAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<AssetFormData>(EMPTY_FORM);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadInventarisCategories(),
      loadInventaris({ search: search || undefined, condition: filterCondition || undefined }),
      loadInventarisSummary(),
    ]);
    setCategories(loadInventarisCategories as unknown as InventarisCategory[]);
    setAssets(
      loadInventaris({
        search: search || undefined,
        condition: filterCondition || undefined,
      }) as unknown as InventarisAsset[],
    );
    const s = await loadInventarisSummary();
    setSummary(s);
    const [cats, items] = await Promise.all([
      loadInventarisCategories(),
      loadInventaris({ search: search || undefined, condition: filterCondition || undefined }),
    ]);
    setCategories(cats);
    setAssets(items);
    setLoading(false);
  }, [search, filterCondition]);

  useEffect(() => {
    fetchAll();
  }, []);

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (item: InventarisAsset) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id ?? "",
      code: item.code ?? "",
      description: item.description ?? "",
      condition: item.condition,
      acquisition_date: item.acquisition_date?.slice(0, 10) ?? "",
      acquisition_value: String(item.acquisition_value ?? ""),
      location: item.location ?? "",
      responsible: item.responsible ?? "",
      dusun: item.dusun ?? "",
      year_acquired: String(item.year_acquired ?? ""),
      status: item.status,
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama asset wajib diisi.");
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      category_id: formData.category_id || undefined,
      code: formData.code || undefined,
      description: formData.description || undefined,
      condition: formData.condition as InventarisAsset["condition"],
      acquisition_date: formData.acquisition_date || undefined,
      acquisition_value: parseFloat(formData.acquisition_value) || 0,
      location: formData.location || undefined,
      responsible: formData.responsible || undefined,
      dusun: formData.dusun || undefined,
      year_acquired: parseInt(formData.year_acquired) || undefined,
      status: formData.status as InventarisAsset["status"],
      notes: formData.notes || undefined,
    };
    let result: InventarisAsset | null = null;
    if (editItem) {
      result = await updateInventarisAsset(editItem.id, payload);
    } else {
      result = await addInventarisAsset(payload);
    }
    setSaving(false);
    if (result) {
      toast.success(`Asset "${result.name}" berhasil disimpan.`);
      setShowForm(false);
      fetchAll();
    } else {
      toast.error("Gagal menyimpan asset.");
    }
  };

  const handleDelete = async (item: InventarisAsset) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteInventarisAsset(deleteTarget.id);
    if (ok) {
      toast.success("Asset dihapus.");
      fetchAll();
    } else toast.error("Gagal menghapus asset.");
    setDeleteTarget(null);
  };

  const filtered = assets.filter((a) => {
    if (filterCategory && a.category_id !== filterCategory) return false;
    return true;
  });

  const conditionData = summary
    ? Object.entries(
        assets.reduce(
          (acc, a) => {
            const c = a.condition ?? "unknown";
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      ).map(([key, count]) => ({ name: CONDITION_LABELS[key] ?? key, count }))
    : [];

  const statusData = summary
    ? Object.entries(
        assets.reduce(
          (acc, a) => {
            const s = a.status ?? "unknown";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      ).map(([key, count]) => ({ name: STATUS_LABELS[key] ?? key, count }))
    : [];

  const categoryValueData = categories
    .map((cat) => {
      const items = assets.filter((a) => a.category_id === cat.id);
      return {
        name: cat.name,
        jumlah: items.length,
        nilai: items.reduce((s, a) => s + Number(a.current_value || 0), 0),
      };
    })
    .filter((c) => c.jumlah > 0);

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
          <h2 className="text-xl font-bold">Inventaris Desa</h2>
          <p className="text-sm text-muted-foreground">
            Pengelolaan asset &amp; inventaris village
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Asset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Asset"
            value={String(summary.total_assets)}
            sub={`${categoryValueData.length} kategori`}
            icon={Warehouse}
          />
          <StatCard
            label="Nilai Perolehan"
            value={formatRupiah(summary.total_acquisition_value)}
            sub="Total akuisisi"
            icon={BarChart3}
            accent="text-primary"
          />
          <StatCard
            label="Nilai Saat Ini"
            value={formatRupiah(summary.total_current_value)}
            sub="Setelah depresiasi"
            icon={PieIcon}
            accent="text-info"
          />
          <StatCard
            label="Kondisi Baik"
            value={String(assets.filter((a) => a.condition === "baik").length)}
            sub={`${assets.length > 0 ? ((assets.filter((a) => a.condition === "baik").length / assets.length) * 100).toFixed(0) : 0}% dalam kondisi baik`}
            icon={Building2}
            accent="text-success"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Condition Pie */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PieIcon className="h-4 w-4" /> Kondisi Asset
          </h3>
          {conditionData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    dataKey="count"
                    paddingAngle={2}
                  >
                    {conditionData.map((_, i) => (
                      <Cell key={i} fill={COND_CHART_COLORS[i % COND_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {conditionData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COND_CHART_COLORS[i] }}
                      />
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span className="font-semibold">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data</p>
          )}
        </Card>

        {/* Status Pie */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Status Kepemilikan
          </h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    dataKey="count"
                    paddingAngle={2}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[i] }}
                      />
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span className="font-semibold">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data</p>
          )}
        </Card>

        {/* Top Categories by count */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Per Kategori
          </h3>
          {categoryValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={categoryValueData.slice(0, 5)} layout="vertical" margin={{ left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={80} />
                <Tooltip formatter={(v) => [`${v} asset`, "Jumlah"]} />
                <Bar dataKey="jumlah" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data</p>
          )}
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kode, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Kondisi</option>
          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Asset Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Nama Asset</th>
                <th className="text-left py-3 px-4 font-semibold">Kategori</th>
                <th className="text-left py-3 px-4 font-semibold">Kondisi</th>
                <th className="text-left py-3 px-4 font-semibold">Lokasi</th>
                <th className="text-right py-3 px-4 font-semibold">Nilai Saat Ini</th>
                <th className="text-left py-3 px-4 font-semibold">Tahun</th>
                <th className="text-left py-3 px-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada asset inventaris.</p>
                    <Button className="mt-3" size="sm" onClick={handleOpenAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Asset Pertama
                    </Button>
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{asset.name}</p>
                        {asset.code && (
                          <p className="text-xs text-muted-foreground font-mono">{asset.code}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {asset.category?.name ?? "—"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${CONDITION_COLORS[asset.condition] ?? ""}`}
                      >
                        {CONDITION_LABELS[asset.condition] ?? asset.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {asset.location ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatRupiah(asset.current_value)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {asset.year_acquired ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(asset)}
                          aria-label={`Edit ${asset.name}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(asset)}
                          aria-label={`Hapus ${asset.name}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Asset" : "Tambah Asset Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Nama Asset *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Tanah Kas Desa"
              />
            </div>
            {/* Category + Code */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Kategori
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  <option value="">— Pilih —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Kode Asset
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
            </div>
            {/* Condition + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Kondisi
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Value + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Nilai Perolehan (Rp)
                </label>
                <Input
                  type="number"
                  value={formData.acquisition_value}
                  onChange={(e) => setFormData({ ...formData, acquisition_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Tahun Pengadaan
                </label>
                <Input
                  type="number"
                  value={formData.year_acquired}
                  onChange={(e) => setFormData({ ...formData, year_acquired: e.target.value })}
                  placeholder="2026"
                />
              </div>
            </div>
            {/* Location + Responsible */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Lokasi
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Dusun/Bangunan"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Penanggung Jawab
                </label>
                <Input
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="Nama perangkat"
                />
              </div>
            </div>
            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
                rows={2}
                placeholder="Deskripsi singkat asset..."
              />
            </div>
            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Catatan
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
                rows={2}
                placeholder="Catatan tambahan..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editItem ? "Update" : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus asset "{deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
