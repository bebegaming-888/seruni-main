import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Heart, Plus, RefreshCw, Search, Loader2, Trash2, Pencil, Users } from "lucide-react";
import {
  loadBantuan,
  addBantuanProgram,
  updateBantuanProgram,
  deleteBantuanProgram,
  addBantuanRecipient,
  formatRupiah,
  STATUS_LABELS_B,
  STATUS_COLORS_B,
  type BantuanProgram,
  type BantuanRecipient,
} from "@/lib/bantuan-store";
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

export function BantuanDashboard() {
  const [programs, setPrograms] = useState<BantuanProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BantuanProgram | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BantuanProgram | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    source: "",
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    total_budget: "",
    description: "",
    status: "planning",
  });

  const fetchAll = async () => {
    setLoading(true);
    const items = await loadBantuan({
      search: search || undefined,
      status: filterStatus || undefined,
    });
    setPrograms(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama program wajib diisi.");
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      source: formData.source || undefined,
      year: formData.year,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      total_budget: parseFloat(formData.total_budget) || 0,
      description: formData.description || undefined,
      status: formData.status as BantuanProgram["status"],
    };
    let result: BantuanProgram | null = null;
    if (editItem) result = await updateBantuanProgram(editItem.id, payload);
    else result = await addBantuanProgram(payload);
    setSaving(false);
    if (result) {
      toast.success(`Program "${result.name}" berhasil disimpan.`);
      setShowForm(false);
      fetchAll();
    } else toast.error("Gagal menyimpan program.");
  };

  const handleDelete = async (item: BantuanProgram) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteBantuanProgram(deleteTarget.id);
    if (ok) {
      toast.success("Program dihapus.");
      fetchAll();
    } else toast.error("Gagal menghapus program.");
    setDeleteTarget(null);
  };

  const filtered = programs.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const activeCount = programs.filter((p) => p.status === "active").length;
  const totalBudget = programs.reduce((s, p) => s + Number(p.total_budget || 0), 0);

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
          <h2 className="text-xl font-bold">Bantuan Sosial</h2>
          <p className="text-sm text-muted-foreground">Program &amp; penerima bantuan</p>
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
                name: "",
                source: "",
                year: new Date().getFullYear(),
                start_date: "",
                end_date: "",
                total_budget: "",
                description: "",
                status: "planning",
              });
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Program
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Program</p>
              <p className="text-2xl font-bold mt-1">{programs.length}</p>
            </div>
            <Heart className="h-6 w-6 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Program Aktif</p>
              <p className="text-2xl font-bold mt-1 text-info">{activeCount}</p>
            </div>
            <Users className="h-6 w-6 text-info" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Anggaran</p>
              <p className="text-2xl font-bold mt-1 text-primary">{formatRupiah(totalBudget)}</p>
            </div>
            <Heart className="h-6 w-6 text-primary" />
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS_B).map(([k, v]) => (
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
                <th className="text-left py-3 px-4 font-semibold">Nama Program</th>
                <th className="text-left py-3 px-4 font-semibold">Sumber</th>
                <th className="text-left py-3 px-4 font-semibold">Tahun</th>
                <th className="text-right py-3 px-4 font-semibold">Anggaran</th>
                <th className="text-left py-3 px-4 font-semibold">Penerima</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada program bantuan.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.source && (
                          <p className="text-xs text-muted-foreground">Sumber: {p.source}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{p.source ?? "—"}</td>
                    <td className="py-3 px-4">{p.year}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">
                      {formatRupiah(p.total_budget)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {p.recipient_count ?? 0} orang
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold ${STATUS_COLORS_B[p.status]}`}>
                        {STATUS_LABELS_B[p.status]}
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
                              name: p.name,
                              source: p.source ?? "",
                              year: p.year,
                              start_date: p.start_date?.slice(0, 10) ?? "",
                              end_date: p.end_date?.slice(0, 10) ?? "",
                              total_budget: String(p.total_budget),
                              description: p.description ?? "",
                              status: p.status,
                            });
                            setShowForm(true);
                          }}
                          aria-label={`Edit ${p.name}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Hapus ${p.name}`}
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
        <DialogContent className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Program" : "Tambah Program Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Nama Program *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: BLT-DD 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Sumber Dana
                </label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="APBN/APBD"
                />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Total Anggaran
                </label>
                <Input
                  type="number"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="0"
                />
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
                  {Object.entries(STATUS_LABELS_B).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
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
              Hapus program "{deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.
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
