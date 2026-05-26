import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  Trash2,
  Pencil,
  UserCheck,
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
  loadKelompok,
  addKelompok,
  updateKelompok,
  deleteKelompok,
  type Kelompok,
} from "@/lib/kelompok-store";

const KATEGORI_OPTIONS = [
  "Karang Taruna",
  "LKMD/LPM",
  "KTPTS",
  "Kelompok Tani",
  "Kelompok Wanita",
  "RT/RW",
  "PKK",
  "BPD",
  "RT",
  "RW",
  "Lainnya",
];

const KATEGORI_COLORS: Record<string, string> = {
  "Karang Taruna": "bg-violet/10 text-violet border-violet/30",
  "LKMD/LPM": "bg-primary/10 text-primary border-primary/30",
  PKK: "bg-pink-500/10 text-pink-600 border-pink-500/30",
  "Kelompok Tani": "bg-green-500/10 text-green-600 border-green-500/30",
  "Kelompok Wanita": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  default: "bg-muted/10 text-muted-foreground border-muted/30",
};

export function KelompokDashboard() {
  const [groups, setGroups] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Kelompok | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kelompok | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    leader_name: "",
    leader_phone: "",
    established_date: "",
    description: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    const items = await loadKelompok({
      search: search || undefined,
      category: filterCategory || undefined,
    });
    setGroups(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSave = async () => {
    if (!formData.category.trim() || !formData.name.trim()) {
      toast.error("Kategori dan nama kelompok wajib diisi.");
      return;
    }
    setSaving(true);
    const payload = {
      category: formData.category.trim(),
      name: formData.name.trim(),
      leader_name: formData.leader_name || undefined,
      leader_phone: formData.leader_phone || undefined,
      established_date: formData.established_date || undefined,
      description: formData.description || undefined,
    };
    let result: Kelompok | null = null;
    if (editItem) result = await updateKelompok(editItem.id, payload);
    else result = await addKelompok(payload);
    setSaving(false);
    if (result) {
      toast.success(`Kelompok "${result.name}" berhasil disimpan.`);
      setShowForm(false);
      fetchAll();
    } else toast.error("Gagal menyimpan kelompok.");
  };

  const handleDelete = async (item: Kelompok) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteKelompok(deleteTarget.id);
    if (ok) {
      toast.success("Kelompok dihapus.");
      fetchAll();
    } else toast.error("Gagal menghapus kelompok.");
    setDeleteTarget(null);
  };

  const filtered = groups.filter((g) => {
    if (filterCategory && g.category !== filterCategory) return false;
    return true;
  });

  const byCategory = groups.reduce(
    (acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const getBadgeColor = (cat: string) => KATEGORI_COLORS[cat] ?? KATEGORI_COLORS["default"];

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
          <h2 className="text-xl font-bold">Kelompok Masyarakat</h2>
          <p className="text-sm text-muted-foreground">Lembaga &amp; organisasi desa</p>
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
                category: "",
                name: "",
                leader_name: "",
                leader_phone: "",
                established_date: "",
                description: "",
              });
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kelompok
          </Button>
        </div>
      </div>

      {/* Summary by category */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(byCategory).map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${getBadgeColor(cat)} ${filterCategory === cat ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
          >
            {cat} <span className="font-bold">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau Ketua..."
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
          {KATEGORI_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Nama Kelompok</th>
                <th className="text-left py-3 px-4 font-semibold">Kategori</th>
                <th className="text-left py-3 px-4 font-semibold">Ketua</th>
                <th className="text-left py-3 px-4 font-semibold">Kontak</th>
                <th className="text-center py-3 px-4 font-semibold">Anggota</th>
                <th className="text-left py-3 px-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada kelompok masyarakat.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{g.name}</p>
                        {g.established_date && (
                          <p className="text-xs text-muted-foreground">
                            Berdiri: {new Date(g.established_date).toLocaleDateString("id-ID")}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getBadgeColor(g.category)}`}
                      >
                        {g.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {g.leader_name ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {g.leader_phone ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-primary">{g.member_count}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditItem(g);
                            setFormData({
                              category: g.category,
                              name: g.name,
                              leader_name: g.leader_name ?? "",
                              leader_phone: g.leader_phone ?? "",
                              established_date: g.established_date?.slice(0, 10) ?? "",
                              description: g.description ?? "",
                            });
                            setShowForm(true);
                          }}
                          aria-label={`Edit ${g.name}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(g)}
                          aria-label={`Hapus ${g.name}`}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus kelompok "{deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.
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

      {/* Add/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Kelompok" : "Tambah Kelompok Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
              >
                <option value="">— Pilih Kategori —</option>
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Nama Kelompok *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Karang Taruna Mekar"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Nama Ketua
                </label>
                <Input
                  value={formData.leader_name}
                  onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })}
                  placeholder="Nama Ketua"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  No. HP Ketua
                </label>
                <Input
                  value={formData.leader_phone}
                  onChange={(e) => setFormData({ ...formData, leader_phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                Tanggal Berdiri
              </label>
              <input
                type="date"
                value={formData.established_date}
                onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
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
    </div>
  );
}
