/**
 * PerangkatDesaManager.tsx — Admin panel for Perangkat Desa (Tree Structure)
 *
 * Tab 1: Daftar Perangkat  — table with struktur_id selector (tree-based)
 * Tab 2: Struktur         — tree builder (add/edit/delete jabatan nodes)
 */

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  UserCheck,
  UserX,
  X,
  Loader2,
  BadgeCheck,
  IdCard,
  Camera,
  Trash,
  GitBranch,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  User,
} from "lucide-react";
import {
  initPerangkatStore,
  listStrukturAktif,
  listPerangkat,
  listPerangkatAktif,
  buildPerangkatTree,
  getPerangkatByStrukturId,
  addStruktur,
  updateStruktur,
  deleteStruktur,
  addPerangkat,
  updatePerangkat,
  deletePerangkat,
  autofillFromNik,
  getStrukturById,
  type PerangkatStruktur,
  type PerangkatPerson,
  type PerangkatFormData,
  type AutofillResult,
} from "@/lib/perangkat-desa-store";
import { uploadMedia, getMediaUrl } from "@/lib/media-upload";

const KATEGORI_OPTIONS = [
  { value: "Pimpinan", label: "Pimpinan" },
  { value: "Kesekretariatan", label: "Kesekretariatan" },
  { value: "Pelaksana Teknis", label: "Pelaksana Teknis" },
  { value: "Pelaksana Kewilayahan", label: "Pelaksana Kewilayahan" },
  { value: "Staf/Operator", label: "Staf/Operator" },
];

const PENDIDIKAN_OPTIONS = [
  "Tidak Sekolah",
  "SD / Sederajat",
  "SMP / Sederajat",
  "SMA / Sederajat",
  "D1",
  "D2",
  "D3",
  "D4",
  "S1",
  "S2",
  "S3",
];

type ModalMode = "add" | "edit" | null;
type TreeModalMode = "addRoot" | "addChild" | "editNode" | null;

const KATEGORI_BADGE: Record<string, string> = {
  Pimpinan: "bg-primary/15 text-primary border-primary/30",
  Kesekretariatan: "bg-info/15 text-info border-info/30",
  "Pelaksana Teknis": "bg-warning/15 text-warning border-warning/30",
  "Pelaksana Kewilayahan": "bg-success/15 text-success border-success/30",
  "Staf/Operator": "bg-muted text-muted-foreground border-muted-foreground/30",
};

// ── Foto Field ───────────────────────────────────────────────────────────────

function PerangkatFotoField({
  value,
  storagePath,
  onChange,
}: {
  value: string;
  storagePath: string;
  onChange: (foto_url: string, foto_storage_path: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    if (storagePath) {
      setPreviewUrl(getMediaUrl(storagePath, "perangkat-fotos"));
    } else if (value) {
      setPreviewUrl(value);
    } else {
      setPreviewUrl("");
    }
    setImgError(false);
  }, [storagePath, value]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan");
      return;
    }
    setUploading(true);
    setImgError(false);
    try {
      const result = await uploadMedia(file, "perangkat", "perangkat-fotos");
      if (result.ok) {
        onChange(result.publicUrl, result.storagePath);
        toast.success("Foto berhasil diupload");
      } else {
        toast.error(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (storagePath) {
      const { deleteMedia } = await import("@/lib/media-upload");
      await deleteMedia(storagePath, "perangkat-fotos");
    }
    onChange("", "");
    setPreviewUrl("");
    setImgError(false);
  };

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">Foto (opsional)</Label>
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-1.5" />
          )}
          {uploading ? "Mengupload…" : "Ambil dari Perangkat"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {(value || storagePath) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="rounded-xl text-destructive hover:text-destructive"
          >
            <Trash className="h-4 w-4 mr-1" /> Hapus
          </Button>
        )}
      </div>
      <p className="font-body text-[11px] text-muted-foreground">
        Format: JPG, PNG, WebP. Maksimal 5 MB.
      </p>
      {previewUrl && !imgError && (
        <img
          src={previewUrl}
          alt="Foto Perangkat Desa"
          className="h-20 w-20 rounded-xl object-cover border border-border"
          onError={() => setImgError(true)}
        />
      )}
      {imgError && (value || storagePath) && (
        <p className="font-body text-[11px] text-destructive flex items-center gap-1">
          <span>Gagal memuat gambar.</span>
        </p>
      )}
    </div>
  );
}

// ── Tab 1: Daftar Perangkat ─────────────────────────────────────────────────

function buildEmptyForm(): PerangkatFormData {
  return {
    struktur_id: 0,
    nik: "",
    nama: "",
    jenis_kelamin: "Laki-Laki",
    tempat_lahir: "",
    tanggal_lahir: "",
    pendidikan: "",
    alamat: "",
    no_hp: "",
    email: "",
    foto_url: "",
    foto_storage_path: "",
    nomor_sk: "",
    tanggal_terbit_sk: "",
    tanggal_berakhir: "",
    status_aktif: true,
  };
}

function PerangkatListTab({ strukturList }: { strukturList: PerangkatStruktur[] }) {
  const [allPerangkat, setAllPerangkat] = useState<PerangkatPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterAktif, setFilterAktif] = useState<"all" | "aktif" | "nonaktif">("aktif");
  const [filterStruktur, setFilterStruktur] = useState<string>("all");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingPerson, setEditingPerson] = useState<PerangkatPerson | null>(null);
  const [form, setForm] = useState<PerangkatFormData>(buildEmptyForm());
  const [formErr, setFormErr] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PerangkatPerson | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => setAllPerangkat(listPerangkat()), []);

  useEffect(() => {
    const init = async () => {
      await initPerangkatStore();
      refresh();
      setLoading(false);
    };
    init();
  }, [refresh]);

  const filtered = allPerangkat.filter((p) => {
    const aktifMatch =
      filterAktif === "all" ? true : filterAktif === "aktif" ? p.status_aktif : !p.status_aktif;
    if (!aktifMatch) return false;
    if (filterStruktur !== "all" && p.struktur_id !== parseInt(filterStruktur)) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.nik.includes(s) || p.nama.toLowerCase().includes(s);
  });

  async function handleAutofill() {
    const nik = form.nik.trim();
    if (!nik || nik.replace(/\D/g, "").length < 14) {
      toast.warning("Ketik NIK lengkap (16 digit) terlebih dahulu.");
      return;
    }
    setAutofilling(true);
    try {
      const result = await autofillFromNik(nik);
      if (result) {
        setForm((f) => ({
          ...f,
          nik: result.nik,
          nama: result.nama,
          jenis_kelamin: result.jenis_kelamin,
          tempat_lahir: result.tempat_lahir,
          tanggal_lahir: result.tanggal_lahir,
          pendidikan: result.pendidikan,
        }));
        toast.success(`Autofill berhasil — ${result.nama}`);
      } else {
        toast.warning(`NIK ${nik} tidak ditemukan di database warga.`);
      }
    } finally {
      setAutofilling(false);
    }
  }

  function openAdd() {
    setForm(buildEmptyForm());
    setFormErr("");
    setEditingPerson(null);
    setModal("add");
  }

  function openEdit(p: PerangkatPerson) {
    setForm({
      struktur_id: p.struktur_id,
      nik: p.nik,
      nama: p.nama,
      jenis_kelamin: p.jenis_kelamin as "Laki-Laki" | "Perempuan",
      tempat_lahir: p.tempat_lahir,
      tanggal_lahir: p.tanggal_lahir,
      pendidikan: p.pendidikan,
      alamat: p.alamat,
      no_hp: p.no_hp,
      email: p.email,
      foto_url: p.foto_url,
      foto_storage_path: p.foto_storage_path ?? "",
      nomor_sk: p.nomor_sk,
      tanggal_terbit_sk: p.tanggal_terbit_sk,
      tanggal_berakhir: p.tanggal_berakhir,
      status_aktif: p.status_aktif,
    });
    setFormErr("");
    setEditingPerson(p);
    setModal("edit");
  }

  async function handleSave() {
    if (!form.nama.trim()) {
      setFormErr("Nama lengkap tidak boleh kosong");
      return;
    }
    if (!form.struktur_id) {
      setFormErr("Jabatan harus dipilih");
      return;
    }
    setSaving(true);
    try {
      let result;
      if (modal === "add") {
        result = await addPerangkat(form);
      } else if (modal === "edit" && editingPerson) {
        result = await updatePerangkat(editingPerson.id, form);
      } else {
        return;
      }
      toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
      if (result.ok) {
        setModal(null);
        refresh();
      } else {
        setFormErr(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: PerangkatPerson) {
    const result = await deletePerangkat(p.id);
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    if (result.ok) refresh();
    setConfirmDelete(null);
  }

  async function handleNonaktifkan(p: PerangkatPerson) {
    const today = new Date().toISOString().slice(0, 10);
    const result = await updatePerangkat(p.id, { status_aktif: false, tanggal_berakhir: today });
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    if (result.ok) refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build flat struktur options for dropdown (with indent for tree)
  function strukturLabel(s: PerangkatStruktur, level = 0): string {
    return "  ".repeat(level) + s.nama_jabatan;
  }
  function flattenStruktur(
    nodes: PerangkatStruktur[],
    level = 0,
  ): Array<{ id: number; label: string }> {
    const result: Array<{ id: number; label: string }> = [];
    for (const n of nodes) {
      result.push({ id: n.id, label: strukturLabel(n, level) });
      if (n.children?.length) {
        result.push(...flattenStruktur(n.children, level + 1));
      }
    }
    return result;
  }
  const flatStrukturOptions = flattenStruktur(buildPerangkatTree(strukturList));

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, NIK…"
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={filterAktif} onValueChange={(v) => setFilterAktif(v as typeof filterAktif)}>
          <SelectTrigger className="w-32 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStruktur} onValueChange={(v) => setFilterStruktur(v)}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Semua Jabatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jabatan</SelectItem>
            {flatStrukturOptions.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={openAdd}
          className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Perangkat
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Foto
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Nama
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  NIK
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                  Jabatan
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                  SK
                </th>
                <th className="text-center font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="text-right font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground font-body">
                    {q || filterStruktur !== "all" || filterAktif !== "all"
                      ? "Tidak ada perangkat yang cocok."
                      : "Belum ada data perangkat desa."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const strukt = getStrukturById(p.struktur_id);
                  const fotoUrl = p.foto_storage_path
                    ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
                    : p.foto_url;
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt={p.nama}
                            className="h-10 w-10 rounded-full object-cover border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-ui font-semibold text-sm">{p.nama}</p>
                          {strukt && (
                            <span
                              className={`text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-full border ${strukt.warna_label ?? KATEGORI_BADGE[strukt.kategori] ?? ""}`}
                            >
                              {strukt.nama_jabatan}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {p.nik || "-"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {strukt ? (
                          <span
                            className={`text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full border ${strukt.warna_label ?? KATEGORI_BADGE[strukt.kategori] ?? ""}`}
                          >
                            {strukt.nama_jabatan}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground hidden lg:table-cell font-mono">
                        {p.nomor_sk || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status_aktif ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-ui font-semibold">
                            <BadgeCheck className="h-3 w-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-ui font-semibold">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {p.status_aktif && (
                            <button
                              onClick={() => handleNonaktifkan(p)}
                              title="Nonaktifkan"
                              className="h-8 w-8 rounded-lg hover:bg-warning/10 flex items-center justify-center text-warning transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(p)}
                            title="Hapus"
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <p className="font-body text-xs text-muted-foreground">
            {filtered.length} dari {allPerangkat.length} perangkat ·{" "}
            {allPerangkat.filter((p) => p.status_aktif).length} aktif
          </p>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">
                {modal === "add" ? "Tambah Perangkat" : "Edit Perangkat"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {formErr && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body px-4 py-3">
                  {formErr}
                </div>
              )}

              {/* Jabatan */}
              <div className="space-y-1.5">
                <Label htmlFor="struktur_id">Jabatan / Posisi</Label>
                <Select
                  value={form.struktur_id ? String(form.struktur_id) : ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, struktur_id: parseInt(v) }))}
                >
                  <SelectTrigger id="struktur_id" className="rounded-xl">
                    <SelectValue placeholder="Pilih jabatan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {flatStrukturOptions.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.struktur_id &&
                  (() => {
                    const strukt = getStrukturById(form.struktur_id);
                    return strukt?.is_single_position ? (
                      <p className="font-body text-[11px] text-warning">
                        ⚠ Posisi ini hanya untuk 1 orang (is_single_position)
                      </p>
                    ) : null;
                  })()}
              </div>

              {/* NIK + Autofill */}
              <div className="space-y-1.5">
                <Label htmlFor="nik">NIK</Label>
                <div className="flex gap-2">
                  <Input
                    id="nik"
                    value={form.nik}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nik: e.target.value.replace(/\D/g, "").slice(0, 16),
                      }))
                    }
                    placeholder="16 digit NIK…"
                    maxLength={16}
                    className="flex-1 rounded-xl font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutofill}
                    disabled={autofilling || form.nik.replace(/\D/g, "").length < 14}
                    className="rounded-xl gap-1.5 shrink-0"
                  >
                    {autofilling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Autofill
                  </Button>
                </div>
              </div>

              {/* Nama + JK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input
                    id="nama"
                    value={form.nama}
                    onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                    placeholder="Nama lengkap…"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jk">Jenis Kelamin</Label>
                  <Select
                    value={form.jenis_kelamin}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, jenis_kelamin: v as "Laki-Laki" | "Perempuan" }))
                    }
                  >
                    <SelectTrigger id="jk" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-Laki">Laki-Laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TTL + Pendidikan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ttl">Tempat Lahir</Label>
                  <Input
                    id="ttl"
                    value={form.tempat_lahir}
                    onChange={(e) => setForm((f) => ({ ...f, tempat_lahir: e.target.value }))}
                    placeholder="cth: Lombok Timur"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tgl_lahir">Tanggal Lahir</Label>
                  <Input
                    id="tgl_lahir"
                    type="date"
                    value={form.tanggal_lahir}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal_lahir: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Pendidikan */}
              <div className="space-y-1.5">
                <Label htmlFor="pendidikan">Pendidikan</Label>
                <Select
                  value={form.pendidikan}
                  onValueChange={(v) => setForm((f) => ({ ...f, pendidikan: v }))}
                >
                  <SelectTrigger id="pendidikan" className="rounded-xl">
                    <SelectValue placeholder="Pilih…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PENDIDIKAN_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alamat + No HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input
                    id="alamat"
                    value={form.alamat}
                    onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                    placeholder="Alamat tinggal…"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="no_hp">No. HP</Label>
                  <Input
                    id="no_hp"
                    value={form.no_hp}
                    onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* No. SK + Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="no_sk">Nomor SK</Label>
                  <Input
                    id="no_sk"
                    value={form.nomor_sk}
                    onChange={(e) => setForm((f) => ({ ...f, nomor_sk: e.target.value }))}
                    placeholder="470/001/KEP/DES/2021"
                    className="rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tgl_sk">Tanggal Terbit SK</Label>
                  <Input
                    id="tgl_sk"
                    type="date"
                    value={form.tanggal_terbit_sk}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal_terbit_sk: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <input
                  id="status_aktif"
                  type="checkbox"
                  checked={form.status_aktif}
                  onChange={(e) => setForm((f) => ({ ...f, status_aktif: e.target.checked }))}
                  className="h-4 w-4 rounded accent-primary"
                />
                <Label htmlFor="status_aktif" className="cursor-pointer font-ui font-medium">
                  Perangkat aktif saat ini
                </Label>
              </div>

              {/* Foto */}
              <PerangkatFotoField
                value={form.foto_url}
                storagePath={form.foto_storage_path ?? ""}
                onChange={(foto_url, foto_storage_path) =>
                  setForm((f) => ({ ...f, foto_url, foto_storage_path }))
                }
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)} className="rounded-xl">
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {modal === "add" ? "Simpan" : "Perbarui"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-display font-bold">Hapus Perangkat?</h3>
                <p className="font-body text-sm text-muted-foreground">{confirmDelete.nama}</p>
              </div>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Data ini akan dihapus permanen.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Struktur Tree ───────────────────────────────────────────────────────

function StrukurTab({ onRefreshList }: { onRefreshList: () => void }) {
  const [allStruktur, setAllStruktur] = useState<PerangkatStruktur[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<TreeModalMode>(null);
  const [editingNode, setEditingNode] = useState<PerangkatStruktur | null>(null);
  const [parentForChild, setParentForChild] = useState<PerangkatStruktur | null>(null);
  const [nodeForm, setNodeForm] = useState<{
    nama_jabatan: string;
    kategori: string;
    urutan: number;
    warna_label: string;
    is_single_position: boolean;
  }>({
    nama_jabatan: "",
    kategori: "Pelaksana Teknis",
    urutan: 99,
    warna_label: "",
    is_single_position: false,
  });
  const [nodeErr, setNodeErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PerangkatStruktur | null>(null);

  useEffect(() => {
    const init = async () => {
      await initPerangkatStore();
      setAllStruktur(listStrukturAktif());
      setLoading(false);
    };
    init();
  }, []);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddRoot() {
    setNodeForm({
      nama_jabatan: "",
      kategori: "Pimpinan",
      urutan: 99,
      warna_label: "",
      is_single_position: false,
    });
    setNodeErr("");
    setEditingNode(null);
    setModal("addRoot");
  }

  function openAddChild(parent: PerangkatStruktur) {
    setParentForChild(parent);
    setNodeForm({
      nama_jabatan: "",
      kategori: parent.kategori,
      urutan: 99,
      warna_label: "",
      is_single_position: false,
    });
    setNodeErr("");
    setEditingNode(null);
    setModal("addChild");
  }

  function openEditNode(node: PerangkatStruktur) {
    setNodeForm({
      nama_jabatan: node.nama_jabatan,
      kategori: node.kategori,
      urutan: node.urutan,
      warna_label: node.warna_label ?? "",
      is_single_position: node.is_single_position,
    });
    setNodeErr("");
    setEditingNode(node);
    setModal("editNode");
  }

  async function handleSaveNode() {
    if (!nodeForm.nama_jabatan.trim()) {
      setNodeErr("Nama jabatan tidak boleh kosong");
      return;
    }
    setSaving(true);
    try {
      let result;
      const parentId = parentForChild?.id ?? editingNode?.parent_id ?? null;
      const level = parentId
        ? (editingNode?.level_hierarchy ?? (parentForChild?.level_hierarchy ?? 0) + 1)
        : 1;
      if (modal === "addRoot") {
        result = await addStruktur({
          parent_id: null,
          nama_jabatan: nodeForm.nama_jabatan,
          kategori: nodeForm.kategori,
          level_hierarchy: 1,
          urutan: nodeForm.urutan,
          warna_label: nodeForm.warna_label || null,
          is_single_position: nodeForm.is_single_position,
          status_aktif: true,
        });
      } else if (modal === "addChild") {
        result = await addStruktur({
          parent_id: parentId!,
          nama_jabatan: nodeForm.nama_jabatan,
          kategori: nodeForm.kategori,
          level_hierarchy: level,
          urutan: nodeForm.urutan,
          warna_label: nodeForm.warna_label || null,
          is_single_position: nodeForm.is_single_position,
          status_aktif: true,
        });
      } else if (modal === "editNode" && editingNode) {
        result = await updateStruktur(editingNode.id, nodeForm);
      } else {
        return;
      }
      toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
      if (result.ok) {
        setModal(null);
        setAllStruktur(listStrukturAktif());
        onRefreshList();
      } else {
        setNodeErr(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNode(node: PerangkatStruktur) {
    const result = await deleteStruktur(node.id);
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    setConfirmDelete(null);
    if (result.ok) {
      setAllStruktur(listStrukturAktif());
      onRefreshList();
    }
  }

  const tree = buildPerangkatTree(allStruktur);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <Button
          onClick={openAddRoot}
          className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Tambah Jabatan Utama
        </Button>
      </div>

      {tree.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border font-body text-muted-foreground">
          Belum ada struktur. Klik{" "}
          <span className="font-semibold text-primary">Tambah Jabatan Utama</span> untuk memulai.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {tree.map((node) => (
              <TreeNodeRow
                key={node.id}
                node={node}
                level={0}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                onAddChild={openAddChild}
                onEditNode={openEditNode}
                onDeleteNode={setConfirmDelete}
                allStruktur={allStruktur}
              />
            ))}
          </div>
        </div>
      )}

      {/* Node Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">
                {modal === "addRoot"
                  ? "Tambah Jabatan Utama"
                  : modal === "addChild"
                    ? `Bawahan: ${parentForChild?.nama_jabatan}`
                    : "Edit Jabatan"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {nodeErr && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body px-4 py-3">
                  {nodeErr}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nama Jabatan</Label>
                <Input
                  value={nodeForm.nama_jabatan}
                  onChange={(e) => setNodeForm((f) => ({ ...f, nama_jabatan: e.target.value }))}
                  placeholder="cth: Kasi Pemerintahan"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select
                    value={nodeForm.kategori}
                    onValueChange={(v) => setNodeForm((f) => ({ ...f, kategori: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KATEGORI_OPTIONS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Urutan</Label>
                  <Input
                    type="number"
                    min={1}
                    value={nodeForm.urutan}
                    onChange={(e) =>
                      setNodeForm((f) => ({ ...f, urutan: parseInt(e.target.value) || 99 }))
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <input
                  id="is_single"
                  type="checkbox"
                  checked={nodeForm.is_single_position}
                  onChange={(e) =>
                    setNodeForm((f) => ({ ...f, is_single_position: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
                <Label htmlFor="is_single" className="cursor-pointer font-ui font-medium">
                  Posisi tunggal (hanya 1 orang)
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)} className="rounded-xl">
                Batal
              </Button>
              <Button
                onClick={handleSaveNode}
                disabled={saving}
                className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Node Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-display font-bold">Hapus Jabatan?</h3>
            <p className="font-body text-sm text-muted-foreground">
              "{confirmDelete.nama_jabatan}" dan semua bawahan akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteNode(confirmDelete)}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tree Node Row ─────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  level,
  expandedIds,
  onToggle,
  onAddChild,
  onEditNode,
  onDeleteNode,
  allStruktur,
}: {
  node: PerangkatStruktur;
  level: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onAddChild: (parent: PerangkatStruktur) => void;
  onEditNode: (node: PerangkatStruktur) => void;
  onDeleteNode: (node: PerangkatStruktur) => void;
  allStruktur: PerangkatStruktur[];
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const persons = getPerangkatByStrukturId(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-primary/10 text-primary shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="h-6 w-6 shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-ui font-semibold text-sm truncate">{node.nama_jabatan}</span>
          {node.level_hierarchy === 1 && (
            <span className="text-[10px] font-ui font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              ROOT
            </span>
          )}
          {node.is_single_position && (
            <span className="text-[10px] font-ui font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning">
              SINGLE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {persons.map((p) => {
            const fotoUrl = p.foto_storage_path
              ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
              : p.foto_url;
            return (
              <div
                key={p.id}
                className="flex items-center gap-1 text-xs font-body bg-info/10 text-info rounded-full pl-2 pr-1 py-0.5 border border-info/20"
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt={p.nama} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
                <span className="truncate max-w-[80px]">{p.nama}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAddChild(node)}
            title="Tambah Bawahan"
            className="h-7 w-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEditNode(node)}
            title="Edit"
            className="h-7 w-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDeleteNode(node)}
            title="Hapus"
            className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              allStruktur={allStruktur}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────

export function PerangkatDesaManager({ username = "Admin" }: { username?: string }) {
  const [tab, setTab] = useState<"list" | "struktur">("list");
  const [strukturList, setStrukturList] = useState<PerangkatStruktur[]>([]);
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    import("@/lib/perangkat-desa-store").then(({ initPerangkatStore, listStrukturAktif }) => {
      initPerangkatStore()
        .then(() => setStrukturList(listStrukturAktif()))
        .catch((e) => console.error("[PerangkatDesaManager] initPerangkatStore failed:", e));
    });
  }, []);

  function triggerRefresh() {
    forceRefresh((n) => n + 1);
    import("@/lib/perangkat-desa-store")
      .then(({ listStrukturAktif }) => setStrukturList(listStrukturAktif()))
      .catch((e) => console.error("[PerangkatDesaManager] refresh failed:", e));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Perangkat Desa</h2>
          <p className="font-body text-sm text-muted-foreground">
            Kelola personel dan struktur organisasi perangkat desa secara dinamis.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2.5 font-ui text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
            tab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline-block mr-1.5 mb-0.5" />
          Daftar Perangkat
        </button>
        <button
          onClick={() => setTab("struktur")}
          className={`px-4 py-2.5 font-ui text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
            tab === "struktur"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitBranch className="h-4 w-4 inline-block mr-1.5 mb-0.5" />
          Struktur Organisasi
        </button>
      </div>

      {tab === "list" ? (
        <PerangkatListTab strukturList={strukturList} />
      ) : (
        <StrukurTab onRefreshList={triggerRefresh} />
      )}
    </div>
  );
}
