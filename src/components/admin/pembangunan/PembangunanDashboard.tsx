import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  Trash2,
  Pencil,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
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
import {
  loadPembangunan,
  loadPembangunanSummary,
  addPembangunanProject,
  updatePembangunanProject,
  deletePembangunanProject,
  formatRupiah,
  STATUS_LABELS_P,
  STATUS_COLORS_P,
  PRIORITY_LABELS,
  type PembangunanProject,
  type PembangunanSummary,
} from "@/lib/pembangunan-store";

export function PembangunanDashboard() {
  const [projects, setProjects] = useState<PembangunanProject[]>([]);
  const [summary, setSummary] = useState<PembangunanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PembangunanProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PembangunanProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: "rpjmdes" as "rpjmdes" | "rkp",
    year: new Date().getFullYear(),
    title: "",
    description: "",
    budget: "",
    location: "",
    dusun: "",
    start_year: "",
    end_year: "",
    status: "rencana",
    priority: "medium",
  });

  const fetchAll = async () => {
    setLoading(true);
    const [items, sum] = await Promise.all([
      loadPembangunan({
        search: search || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
      }),
      loadPembangunanSummary(),
    ]);
    setProjects(items);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    const payload = {
      type: formData.type,
      year: formData.year,
      title: formData.title.trim(),
      description: formData.description || undefined,
      budget: parseFloat(formData.budget) || 0,
      location: formData.location || undefined,
      dusun: formData.dusun || undefined,
      start_year: parseInt(formData.start_year) || undefined,
      end_year: parseInt(formData.end_year) || undefined,
      status: formData.status as PembangunanProject["status"],
      priority: formData.priority as PembangunanProject["priority"],
    };
    let result: PembangunanProject | null = null;
    if (editItem) result = await updatePembangunanProject(editItem.id, payload);
    else result = await addPembangunanProject(payload);
    setSaving(false);
    if (result) {
      toast.success(`Proyek "${result.title}" berhasil disimpan.`);
      setShowForm(false);
      fetchAll();
    } else toast.error("Gagal menyimpan proyek.");
  };

  const handleDelete = async (item: PembangunanProject) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deletePembangunanProject(deleteTarget.id);
    if (ok) {
      toast.success("Proyek dihapus.");
      fetchAll();
    } else toast.error("Gagal menghapus proyek.");
    setDeleteTarget(null);
  };

  const filtered = projects.filter((p) => {
    if (filterType && p.type !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pembangunan Desa</h2>
          <p className="text-sm text-muted-foreground">RPJMDes &amp; RKP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null);
              setFormData({
                type: "rpjmdes",
                year: new Date().getFullYear(),
                title: "",
                description: "",
                budget: "",
                location: "",
                dusun: "",
                start_year: "",
                end_year: "",
                status: "rencana",
                priority: "medium",
              });
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Proyek
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Proyek</p>
                <p className="text-2xl font-bold mt-1">{summary.total}</p>
              </div>
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Anggaran</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {formatRupiah(summary.total_budget)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Proyek Aktif</p>
                <p className="text-2xl font-bold mt-1 text-info">{summary.by_status?.aktif ?? 0}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-info" />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Anggaran Aktif</p>
                <p className="text-2xl font-bold mt-1 text-success">
                  {formatRupiah(summary.aktif_budget)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Tipe</option>
          <option value="rpjmdes">RPJMDes</option>
          <option value="rkp">RKP</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS_P).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Judul Proyek</th>
                <th className="text-left py-3 px-4 font-semibold">Tipe</th>
                <th className="text-left py-3 px-4 font-semibold">Tahun</th>
                <th className="text-left py-3 px-4 font-semibold">Anggaran</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada proyek pembangunan.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{p.title}</p>
                        {p.location && (
                          <p className="text-xs text-muted-foreground">{p.location}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {p.type === "rpjmdes" ? "RPJMDes" : "RKP"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{p.year}</td>
                    <td className="py-3 px-4 font-semibold text-primary">
                      {formatRupiah(p.budget)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold ${STATUS_COLORS_P[p.status]}`}>
                        {STATUS_LABELS_P[p.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditItem(p);
                            setFormData({
                              type: p.type,
                              year: p.year,
                              title: p.title,
                              description: p.description ?? "",
                              budget: String(p.budget),
                              location: p.location ?? "",
                              dusun: p.dusun ?? "",
                              start_year: String(p.start_year ?? ""),
                              end_year: String(p.end_year ?? ""),
                              status: p.status,
                              priority: p.priority,
                            });
                            setShowForm(true);
                          }}
                          aria-label={`Edit ${p.title}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Hapus ${p.title}`}
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
            <DialogTitle>{editItem ? "Edit Proyek" : "Tambah Proyek Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Tipe *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "rpjmdes" | "rkp" })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  <option value="rpjmdes">RPJMDes</option>
                  <option value="rkp">RKP</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Tahun *
                </label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Judul Proyek *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Pembangunan Jalan Desa"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
                rows={2}
                placeholder="Deskripsi singkat..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Anggaran (Rp)
                </label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Lokasi
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Dusun/Lokasi"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  {Object.entries(STATUS_LABELS_P).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Prioritas
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
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
              Hapus proyek "{deleteTarget?.title}"? Tindakan ini tidak dapat dibatalkan.
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
