import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Loader2,
} from "lucide-react";
import {
  loadAgenda,
  createAgenda,
  deleteAgenda,
  listAgenda,
  formatAgendaDate,
  type SuratAgenda,
} from "@/lib/surat-agenda-store";

export function SuratAgendaManager() {
  const [items, setItems] = useState<SuratAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"outgoing" | "incoming">("outgoing");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    direction: "outgoing" as "outgoing" | "incoming",
    tanggal: new Date().toISOString().slice(0, 10),
    nomor_surat: "",
    Perihal: "",
    kepada: "",
    asal_surat: "",
    keterangan: "",
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    await loadAgenda({ direction: tab });
    setItems(listAgenda());
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetch();
  }, [tab]);

  const handleCreate = async () => {
    if (!formData.Perihal.trim()) {
      toast.error("Perihal wajib diisi");
      return;
    }
    const result = await createAgenda({
      direction: tab,
      tanggal: formData.tanggal,
      nomor_surat: formData.nomor_surat || undefined,
      Perihal: formData.Perihal,
      kepada: formData.kepada || undefined,
      asal_surat: formData.asal_surat || undefined,
      keterangan: formData.keterangan || undefined,
    });
    if (result) {
      toast.success(`Agenda ${result.nomor_agenda} berhasil dibuat`);
      setShowForm(false);
      setFormData({
        ...formData,
        Perihal: "",
        nomor_surat: "",
        kepada: "",
        asal_surat: "",
        keterangan: "",
      });
      fetch();
    } else {
      toast.error("Gagal membuat agenda");
    }
  };

  const handleDelete = async (id: string, nomor: string) => {
    if (!confirm(`Hapus agenda ${nomor}?`)) return;
    const ok = await deleteAgenda(id);
    if (ok) {
      toast.success("Agenda dihapus");
      fetch();
    } else toast.error("Gagal menghapus agenda");
  };

  const filtered = search
    ? items.filter(
        (i) =>
          i.nomor_agenda.toLowerCase().includes(search.toLowerCase()) ||
          i.Perihal.toLowerCase().includes(search.toLowerCase()) ||
          (i.nomor_surat ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const isOut = tab === "outgoing";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Buku Agenda Surat</h2>
          <p className="text-sm text-muted-foreground">Registrasi surat keluar &amp; masuk</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Agenda
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("outgoing")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            isOut
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Surat Keluar
          <Badge variant="outline" className="ml-1">
            {items.length}
          </Badge>
        </button>
        <button
          onClick={() => setTab("incoming")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            !isOut
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Surat Masuk
          <Badge variant="outline" className="ml-1">
            {items.length}
          </Badge>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nomor agenda, surat, oderihal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Belum ada agenda surat {isOut ? "keluar" : "masuk"}
          </p>
          <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pertama
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold">No Agenda</th>
                  <th className="text-left py-3 px-4 font-semibold">Tanggal</th>
                  <th className="text-left py-3 px-4 font-semibold">No Surat</th>
                  <th className="text-left py-3 px-4 font-semibold">Perihal</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    {isOut ? "Kepada" : "Asal Surat"}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Keterangan</th>
                  <th className="text-left py-3 px-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-primary">
                      {item.nomor_agenda}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {formatAgendaDate(item.tanggal)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{item.nomor_surat ?? "—"}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{item.Perihal}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {isOut ? item.kepada : item.asal_surat}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {item.keterangan ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.nomor_agenda)}
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <h3 className="font-bold text-lg">
                Tambah Agenda {isOut ? "Surat Keluar" : "Surat Masuk"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Tanggal *
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Nomor Surat
                </label>
                <Input
                  value={formData.nomor_surat}
                  onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                  placeholder="474/001/KDS.SRMB/V/2026"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Perihal *
                </label>
                <Input
                  value={formData.Perihal}
                  onChange={(e) => setFormData({ ...formData, Perihal: e.target.value })}
                  placeholder="Surat pengantar"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  {isOut ? "Kepada" : "Asal Surat"}
                </label>
                <Input
                  value={isOut ? formData.kepada : formData.asal_surat}
                  onChange={(e) =>
                    isOut
                      ? setFormData({ ...formData, kepada: e.target.value })
                      : setFormData({ ...formData, asal_surat: e.target.value })
                  }
                  placeholder={isOut ? "Nama penerima" : "Asal surat masuk"}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                  Keterangan
                </label>
                <Input
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Opsional"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleCreate}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
