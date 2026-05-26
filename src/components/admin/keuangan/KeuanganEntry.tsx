import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  addEntry,
  loadEntries,
  listEntries,
  listCoaByType,
  initKeuanganCoaStore,
  formatRupiah,
  formatMonth,
  type KeuanganEntry,
} from "@/lib/keuangan-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeuanganEntryProps {
  year?: number;
}

export function KeuanganEntry({ year }: KeuanganEntryProps) {
  const [entries, setEntries] = useState<KeuanganEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    year: year ?? new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    coa_code: "",
    type: "income" as "income" | "expense",
    amount: "",
    description: "",
    reference: "",
    is_realisasi: false,
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function init() {
      await initKeuanganCoaStore();
      await loadEntries(year);
      setEntries(listEntries());
      setLoading(false);
    }
    init();
  }, [year]);

  const coaOptions = listCoaByType(formData.type);

  const handleSubmit = async () => {
    if (!formData.coa_code || !formData.amount) {
      toast.error("Kode COA dan jumlah wajib diisi");
      return;
    }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    const result = await addEntry({
      year: formData.year,
      month: formData.month,
      coa_code: formData.coa_code,
      type: formData.type,
      amount: String(Math.round(amountNum)),
      description: formData.description || null,
      reference: formData.reference || null,
      is_realisasi: formData.is_realisasi,
      created_by: null,
      updated_at: null,
    });

    if (result) {
      setEntries([result, ...entries]);
      setShowForm(false);
      setFormData({
        year: year ?? new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        coa_code: "",
        type: "income",
        amount: "",
        description: "",
        reference: "",
        is_realisasi: false,
      });
      toast.success("Transaksi berhasil ditambahkan");
    } else {
      toast.error("Gagal menyimpan transaksi");
    }
  };

  const filtered = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.coa_code.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.reference?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Memuat data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Transaksi
        </Button>
      </div>

      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Tanggal</th>
                <th className="text-left py-2 px-3">Kode COA</th>
                <th className="text-left py-2 px-3">Tipe</th>
                <th className="text-right py-2 px-3">Jumlah</th>
                <th className="text-left py-2 px-3">Keterangan</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada transaksi
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      {formatMonth(entry.month)} {entry.year}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{entry.coa_code}</td>
                    <td className="py-2 px-3">
                      <Badge variant={entry.type === "income" ? "default" : "destructive"}>
                        {entry.type === "income" ? "Pendapatan" : "Belanja"}
                      </Badge>
                    </td>
                    <td
                      className={`text-right py-2 px-3 font-semibold ${entry.type === "income" ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatRupiah(entry.amount)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{entry.description || "-"}</td>
                    <td className="text-center py-2 px-3">
                      {entry.is_realisasi ? (
                        <Badge variant="outline">Realisasi</Badge>
                      ) : (
                        <Badge variant="secondary">Rencana</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tahun</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Bulan</Label>
                <Select
                  value={String(formData.month)}
                  onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {formatMonth(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tipe</Label>
              <Select
                value={formData.type}
                onValueChange={(v: "income" | "expense") =>
                  setFormData({ ...formData, type: v, coa_code: "" })
                }
              >
                {" "}
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pendapatan</SelectItem>
                  <SelectItem value="expense">Belanja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kode COA</Label>
              <Select
                value={formData.coa_code}
                onValueChange={(v) => setFormData({ ...formData, coa_code: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun..." />
                </SelectTrigger>
                <SelectContent>
                  {coaOptions.map((coa) => (
                    <SelectItem key={coa.code} value={coa.code}>
                      {coa.code} - {coa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label>Keterangan</Label>
              <Textarea
                placeholder="Deskripsi transaksi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Referensi</Label>
              <Input
                placeholder="Nomor bukti/referensi"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
