/**
 * LembagaManager.tsx — Admin panel for Lembaga Desa
 *
 * Tab 1: List Lembaga     — CRUD lembaga (nama, jenis, deskripsi, periode, kontak)
 * Tab 2: Struktur+Jabatan — Tree builder per lembaga + assign pengurus
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
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  UserCheck,
  UserX,
  X,
  Loader2,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Camera,
  Trash,
  RefreshCw,
  GitBranch,
  Users,
  Upload,
} from "lucide-react";
import {
  initLembagaStore,
  listLembaga,
  listLembagaAktif,
  addLembaga,
  updateLembaga,
  deleteLembaga,
  buildStrukturTree,
  loadLembagaDetail,
  addStruktur,
  updateStruktur,
  deleteStruktur,
  addPengurus,
  updatePengurus,
  deletePengurus,
  autofillFromNik,
  type LembagaDesa,
  type LembagaFormData,
  type StrukturNode,
  type StrukturFormData,
  type TrusteesLembaga,
  type TrusteesFormData,
} from "@/lib/lembaga-store";
import { uploadMedia, getMediaUrl } from "@/lib/media-upload";

const JENIS_OPTIONS = [
  { value: "BPD", label: "Badan Permusyawaratan Desa (BPD)" },
  { value: "LPM", label: "Lembaga Pemberdayaan Masyarakat (LPM)" },
  { value: "PKK", label: "TP-PKK & KWT" },
  { value: "KARANG_TARUNA", label: "Karang Taruna" },
  { value: "BUMDES", label: "BUMDes" },
  { value: "POSYANDU", label: "Posyandu" },
  { value: "LINMAS", label: "Linmas" },
  { value: "RT", label: "RT" },
  { value: "FORUM_ANAK", label: "Forum Anak Desa" },
  { value: "POKDARWIS", label: "Pokdarwis" },
  { value: "KOPERASI", label: "Koperasi Desa" },
  { value: "LEMBAGA_ADAT", label: "Lembaga Adat" },
  { value: "POSBANKUM", label: "Posbankum" },
  { value: "TSBD", label: "TSBD" },
  { value: "LEMBAGA_PEREMPUAN", label: "Lembaga Pemberdayaan Perempuan" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "periode_sebelumnya", label: "Periode Sebelumnya" },
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
type PengurusModalMode = "add" | "edit" | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyLembagaForm(): LembagaFormData {
  return {
    slug: "",
    nama: "",
    jenis: "BPD",
    deskripsi: "",
    logo_url: "",
    logo_storage_path: "",
    periode_mulai: "",
    periode_selesai: "",
    kontak_info: { alamat: "", telepon: "", email: "", jam_layanan: "" },
    enabled: true,
    urutan: 99,
  };
}

function buildEmptyStrukturForm(parentId: number | null, lembagaId: number): StrukturFormData {
  return {
    lembaga_id: lembagaId,
    parent_id: parentId,
    nama_jabatan: "",
    level: parentId == null ? 0 : 1,
    urutan: 99,
  };
}

function buildEmptyPengurusForm(strukturId: number): TrusteesFormData {
  return {
    struktur_id: strukturId,
    nama: "",
    nik: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "Laki-Laki",
    pendidikan: "",
    alamat: "",
    no_hp: "",
    foto_url: "",
    foto_storage_path: "",
    status: "aktif",
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Logo Upload Field ──────────────────────────────────────────────────────

function LembagaLogoField({
  value,
  storagePath,
  onChange,
}: {
  value: string;
  storagePath: string;
  onChange: (logo_url: string, logo_storage_path: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    if (storagePath) {
      setPreviewUrl(getMediaUrl(storagePath, "public-media"));
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
      const result = await uploadMedia(file, "lembaga", "public-media");
      if (result.ok) {
        onChange(result.publicUrl, result.storagePath);
        toast.success("Logo berhasil diupload");
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
      await deleteMedia(storagePath, "public-media");
    }
    onChange("", "");
    setPreviewUrl("");
    setImgError(false);
  };

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">Logo Lembaga</Label>
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
      {previewUrl && !imgError && (
        <img
          src={previewUrl}
          alt={name || "Logo Lembaga"}
          className="h-16 w-16 rounded-xl object-contain border border-border bg-muted/30"
          onError={() => setImgError(true)}
        />
      )}
      {imgError && (value || storagePath) && (
        <p className="font-body text-[11px] text-destructive">Gagal memuat gambar.</p>
      )}
    </div>
  );
}

// ── Tab 1: List Lembaga ────────────────────────────────────────────────────

function LembagaListTab({
  onEdit,
  onRefresh,
}: {
  onEdit: (l: LembagaDesa) => void;
  onRefresh: () => void;
}) {
  const [allData, setAllData] = useState<LembagaDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "enabled" | "disabled">("enabled");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<LembagaDesa | null>(null);
  const [form, setForm] = useState<LembagaFormData>(buildEmptyLembagaForm());
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LembagaDesa | null>(null);

  const refresh = useCallback(() => setAllData(listLembaga()), []);

  useEffect(() => {
    const init = async () => {
      await initLembagaStore();
      refresh();
      setLoading(false);
    };
    init();
  }, [refresh]);

  const filtered = allData.filter((l) => {
    const enabledMatch =
      filterEnabled === "all" ? true : filterEnabled === "enabled" ? l.enabled : !l.enabled;
    if (!enabledMatch) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return l.nama.toLowerCase().includes(s) || l.jenis.toLowerCase().includes(s);
  });

  function openAdd() {
    setForm(buildEmptyLembagaForm());
    setFormErr("");
    setEditing(null);
    setModal("add");
  }

  function openEdit(l: LembagaDesa) {
    setForm({
      slug: l.slug,
      nama: l.nama,
      jenis: l.jenis,
      deskripsi: l.deskripsi ?? "",
      logo_url: l.logo_url,
      logo_storage_path: l.logo_storage_path ?? "",
      periode_mulai: l.periode_mulai ?? "",
      periode_selesai: l.periode_selesai ?? "",
      kontak_info: {
        alamat: l.kontak_info?.alamat ?? "",
        telepon: l.kontak_info?.telepon ?? "",
        email: l.kontak_info?.email ?? "",
        jam_layanan: l.kontak_info?.jam_layanan ?? "",
      },
      enabled: l.enabled,
      urutan: l.urutan ?? 99,
    });
    setFormErr("");
    setEditing(l);
    setModal("edit");
  }

  async function handleSave() {
    if (!form.nama.trim()) {
      setFormErr("Nama lembaga tidak boleh kosong");
      return;
    }
    const slug = form.slug.trim() || slugify(form.nama);
    setSaving(true);
    try {
      let result;
      if (modal === "add") {
        result = await addLembaga({ ...form, slug });
      } else if (modal === "edit" && editing) {
        result = await updateLembaga(editing.id, { ...form, slug });
      } else {
        return;
      }
      toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
      if (result.ok) {
        setModal(null);
        refresh();
        onRefresh();
      } else {
        setFormErr(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(l: LembagaDesa) {
    const result = await deleteLembaga(l.id);
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    if (result.ok) {
      refresh();
      onRefresh();
    }
    setConfirmDelete(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari lembaga…"
            className="pl-9 rounded-xl"
          />
        </div>
        <Select
          value={filterEnabled}
          onValueChange={(v) => setFilterEnabled(v as typeof filterEnabled)}
        >
          <SelectTrigger className="w-36 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">Aktif</SelectItem>
            <SelectItem value="disabled">Nonaktif</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={openAdd}
          className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Tambah Lembaga
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Nama
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  Jenis
                </th>
                <th className="text-left font-ui font-semibold px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                  Periode
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
                  <td colSpan={5} className="text-center py-12 text-muted-foreground font-body">
                    {q || filterEnabled !== "all"
                      ? "Tidak ada lembaga yang cocok."
                      : "Belum ada data lembaga desa."}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {l.logo_url || l.logo_storage_path ? (
                          <img
                            src={
                              l.logo_storage_path
                                ? getMediaUrl(l.logo_storage_path, "public-media")
                                : l.logo_url
                            }
                            alt={l.nama}
                            className="h-8 w-8 rounded-lg object-contain border border-border bg-muted/30 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-ui font-semibold text-sm">{l.nama}</p>
                          <p className="font-body text-xs text-muted-foreground sm:hidden">
                            {l.jenis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-ui font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {JENIS_OPTIONS.find((j) => j.value === l.jenis)?.label.split(" ")[0] ??
                          l.jenis}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-muted-foreground hidden lg:table-cell">
                      {l.periode_mulai ? `${l.periode_mulai} — ${l.periode_selesai || "—"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {l.enabled ? (
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
                          onClick={() => openEdit(l)}
                          title="Edit"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(l)}
                          title="Struktur & Pengurus"
                          className="h-8 w-8 rounded-lg hover:bg-info/10 flex items-center justify-center text-info transition-colors"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(l)}
                          title="Hapus"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <p className="font-body text-xs text-muted-foreground">
            {filtered.length} dari {allData.length} lembaga ·{" "}
            {allData.filter((l) => l.enabled).length} aktif
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">
                {modal === "add" ? "Tambah Lembaga Desa" : "Edit Lembaga Desa"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
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

              {/* Logo */}
              <LembagaLogoField
                value={form.logo_url}
                storagePath={form.logo_storage_path ?? ""}
                onChange={(logo_url, logo_storage_path) =>
                  setForm((f) => ({ ...f, logo_url, logo_storage_path }))
                }
              />

              {/* Nama + Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama">Nama Lembaga</Label>
                  <Input
                    id="nama"
                    value={form.nama}
                    onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                    placeholder="cth: Badan Permusyawaratan Desa"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug URL</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                    placeholder="auto-generate dari nama"
                    className="rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Jenis */}
              <div className="space-y-1.5">
                <Label htmlFor="jenis">Jenis Lembaga</Label>
                <Select
                  value={form.jenis}
                  onValueChange={(v) => setForm((f) => ({ ...f, jenis: v }))}
                >
                  <SelectTrigger id="jenis" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_OPTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Input
                  id="deskripsi"
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Deskripsi singkat lembaga…"
                  className="rounded-xl"
                />
              </div>

              {/* Periode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="periode_mulai">Periode Mulai</Label>
                  <Input
                    id="periode_mulai"
                    type="date"
                    value={form.periode_mulai}
                    onChange={(e) => setForm((f) => ({ ...f, periode_mulai: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="periode_selesai">Periode Selesai</Label>
                  <Input
                    id="periode_selesai"
                    type="date"
                    value={form.periode_selesai}
                    onChange={(e) => setForm((f) => ({ ...f, periode_selesai: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Kontak */}
              <div className="space-y-3">
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary">
                  Informasi Kontak
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="alamat">Alamat</Label>
                    <Input
                      id="alamat"
                      value={form.kontak_info?.alamat ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kontak_info: { ...f.kontak_info, alamat: e.target.value },
                        }))
                      }
                      placeholder="Alamat kantor/balai…"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telepon">Telepon</Label>
                    <Input
                      id="telepon"
                      value={form.kontak_info?.telepon ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kontak_info: { ...f.kontak_info, telepon: e.target.value },
                        }))
                      }
                      placeholder="08xxxxxxxxxx"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.kontak_info?.email ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kontak_info: { ...f.kontak_info, email: e.target.value },
                        }))
                      }
                      placeholder="email@contoh.com"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jam_layanan">Jam Layanan</Label>
                    <Input
                      id="jam_layanan"
                      value={form.kontak_info?.jam_layanan ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kontak_info: { ...f.kontak_info, jam_layanan: e.target.value },
                        }))
                      }
                      placeholder="Senin-Jumat, 08.00-15.00"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Urutan + Enabled */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="urutan">Urutan Tampil</Label>
                  <Input
                    id="urutan"
                    type="number"
                    min={1}
                    value={form.urutan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, urutan: parseInt(e.target.value) || 99 }))
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                  <input
                    id="enabled"
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <Label htmlFor="enabled" className="cursor-pointer font-ui font-medium">
                    Lembaga aktif
                  </Label>
                </div>
              </div>
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
                <h3 className="font-display font-bold">Hapus Lembaga?</h3>
                <p className="font-body text-sm text-muted-foreground">{confirmDelete.nama}</p>
              </div>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Struktur dan pengurus lembaga ini juga akan ikut dihapus. Tindakan ini tidak dapat
              dibatalkan.
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
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Struktur + Pengurus ──────────────────────────────────────────────

function StrukturTab({ refreshList }: { refreshList: () => void }) {
  const [lembagaList, setLembagaList] = useState<LembagaDesa[]>([]);
  const [selectedLembaga, setSelectedLembaga] = useState<LembagaDesa | null>(null);
  const [struktur, setStruktur] = useState<StrukturNode[]>([]);
  const [urus, setUrus] = useState<TrusteesLembaga[]>([]);
  const [loading, setLoading] = useState(true);

  // Tree state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [treeModal, setTreeModal] = useState<TreeModalMode>(null);
  const [editingNode, setEditingNode] = useState<StrukturNode | null>(null);
  const [parentForChild, setParentForChild] = useState<StrukturNode | null>(null);
  const [nodeForm, setNodeForm] = useState<StrukturFormData>(buildEmptyStrukturForm(null, 0));
  const [nodeErr, setNodeErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteNode, setConfirmDeleteNode] = useState<StrukturNode | null>(null);

  // Pengurus state
  const [pengurusModal, setPengurusModal] = useState<PengurusModalMode>(null);
  const [editingPengurus, setEditingPengurus] = useState<TrusteesLembaga | null>(null);
  const [selectedStruktur, setSelectedStruktur] = useState<StrukturNode | null>(null);
  const [pForm, setPForm] = useState<TrusteesFormData>(buildEmptyPengurusForm(0));
  const [pErr, setPErr] = useState("");
  const [autofilling, setAutofilling] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initLembagaStore();
      setLembagaList(listLembagaAktif());
      setLoading(false);
    };
    init();
  }, []);

  async function selectLembaga(l: LembagaDesa) {
    setSelectedLembaga(l);
    setLoading(true);
    setExpandedIds(new Set());
    const { struktur: s, urus: u } = await loadLembagaDetail(l.id);
    setStruktur(s);
    setUrus(u);
    setLoading(false);
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Struktur CRUD ─────────────────────────────────────────────────────────

  function openAddRoot() {
    if (!selectedLembaga) return;
    setNodeForm(buildEmptyStrukturForm(null, selectedLembaga.id));
    setNodeErr("");
    setEditingNode(null);
    setTreeModal("addRoot");
  }

  function openAddChild(parent: StrukturNode) {
    if (!selectedLembaga) return;
    setParentForChild(parent);
    setNodeForm(buildEmptyStrukturForm(parent.id, selectedLembaga.id));
    setNodeErr("");
    setEditingNode(null);
    setTreeModal("addChild");
  }

  function openEditNode(node: StrukturNode) {
    setNodeForm({
      lembaga_id: node.lembaga_id,
      parent_id: node.parent_id,
      nama_jabatan: node.nama_jabatan,
      level: node.level,
      urutan: node.urutan,
    });
    setNodeErr("");
    setEditingNode(node);
    setTreeModal("editNode");
  }

  async function handleSaveNode() {
    if (!nodeForm.nama_jabatan.trim()) {
      setNodeErr("Nama jabatan tidak boleh kosong");
      return;
    }
    setSaving(true);
    try {
      let result;
      if (treeModal === "addRoot" || treeModal === "addChild") {
        result = await addStruktur(nodeForm);
        if (result.ok) toast.success(`Jabatan "${nodeForm.nama_jabatan}" ditambahkan`);
      } else if (treeModal === "editNode" && editingNode) {
        result = await updateStruktur(editingNode.id, nodeForm, editingNode.lembaga_id);
        if (result.ok) toast.success("Jabatan diperbarui");
      } else {
        return;
      }
      toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
      if (result.ok) {
        setTreeModal(null);
        await reloadStruktur();
      } else {
        setNodeErr(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNode(node: StrukturNode) {
    const result = await deleteStruktur(node.id, node.lembaga_id);
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    setConfirmDeleteNode(null);
    if (result.ok) await reloadStruktur();
  }

  async function reloadStruktur() {
    if (!selectedLembaga) return;
    const { struktur: s, urus: u } = await loadLembagaDetail(selectedLembaga.id);
    setStruktur(s);
    setUrus(u);
  }

  // ── Pengurus CRUD ───────────────────────────────────────────────────────────

  function openAddPengurus(node: StrukturNode) {
    setSelectedStruktur(node);
    setPForm(buildEmptyPengurusForm(node.id));
    setPErr("");
    setEditingPengurus(null);
    setPengurusModal("add");
  }

  function openEditPengurus(p: TrusteesLembaga) {
    setPForm({
      struktur_id: p.struktur_id,
      nama: p.nama,
      nik: p.nik,
      tempat_lahir: p.tempat_lahir ?? "",
      tanggal_lahir: p.tanggal_lahir ?? "",
      jenis_kelamin: p.jenis_kelamin ?? "Laki-Laki",
      pendidikan: p.pendidikan ?? "",
      alamat: p.alamat ?? "",
      no_hp: p.no_hp ?? "",
      foto_url: p.foto_url,
      foto_storage_path: p.foto_storage_path ?? "",
      status: p.status,
    });
    setPErr("");
    setEditingPengurus(p);
    setPengurusModal("edit");
  }

  async function handleAutofill() {
    const nik = pForm.nik.trim();
    if (!nik || nik.replace(/\D/g, "").length < 14) {
      toast.warning("Ketik NIK lengkap (16 digit) terlebih dahulu.");
      return;
    }
    setAutofilling(true);
    try {
      const result = await autofillFromNik(nik);
      if (result) {
        setPForm((f) => ({
          ...f,
          nik: nik,
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

  async function handleSavePengurus() {
    if (!pForm.nama.trim()) {
      setPErr("Nama tidak boleh kosong");
      return;
    }
    setSaving(true);
    try {
      let result;
      if (pengurusModal === "add" && selectedLembaga) {
        result = await addPengurus(pForm, selectedLembaga.id);
      } else if (pengurusModal === "edit" && editingPengurus && selectedLembaga) {
        result = await updatePengurus(editingPengurus.id, pForm, selectedLembaga.id);
      } else {
        return;
      }
      toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
      if (result.ok) {
        setPengurusModal(null);
        await reloadStruktur();
        refreshList();
      } else {
        setPErr(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePengurus(p: TrusteesLembaga) {
    if (!selectedLembaga) return;
    const result = await deletePengurus(p.id, selectedLembaga.id);
    toast.message(result.message, { icon: result.ok ? "✅" : "❌" });
    if (result.ok) {
      await reloadStruktur();
      refreshList();
    }
  }

  const tree = buildStrukturTree(struktur);

  // Build a map of struktur_id →urus for quick lookup
  const urusByStrukturId = new Map<number, TrusteesLembaga[]>();
  for (const p of urus) {
    const arr = urusByStrukturId.get(p.struktur_id) ?? [];
    arr.push(p);
    urusByStrukturId.set(p.struktur_id, arr);
  }

  if (loading && !selectedLembaga) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pilih Lembaga */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5 flex-1 min-w-56">
          <Label>Pilih Lembaga</Label>
          <Select
            value={selectedLembaga?.id?.toString() ?? ""}
            onValueChange={(v) => {
              const l = lembagaList.find((x) => x.id === parseInt(v));
              if (l) selectLembaga(l);
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Pilih lembaga…" />
            </SelectTrigger>
            <SelectContent>
              {lembagaList.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedLembaga && (
          <Button
            onClick={openAddRoot}
            className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Tambah Jabatan
          </Button>
        )}
      </div>

      {!selectedLembaga && !loading && (
        <div className="text-center py-16 text-muted-foreground font-body">
          Pilih lembaga di atas untuk mengelola struktur dan pengurus.
        </div>
      )}

      {selectedLembaga && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Info lembaga */}
              <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                {selectedLembaga.logo_url || selectedLembaga.logo_storage_path ? (
                  <img
                    src={
                      selectedLembaga.logo_storage_path
                        ? getMediaUrl(selectedLembaga.logo_storage_path, "public-media")
                        : selectedLembaga.logo_url
                    }
                    alt={selectedLembaga.nama}
                    className="h-10 w-10 rounded-lg object-contain border border-border bg-muted/30"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-display font-bold">{selectedLembaga.nama}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    {tree.length} jabatan · {urus.length} pengurus aktif
                  </p>
                </div>
              </div>

              {/* Tree */}
              {tree.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border font-body text-muted-foreground">
                  Belum ada struktur. Klik{" "}
                  <span className="font-semibold text-primary">Tambah Jabatan</span> untuk
                  menambahkan.
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
                        onDeleteNode={setConfirmDeleteNode}
                        onAddPengurus={openAddPengurus}
                        onEditPengurus={openEditPengurus}
                        onDeletePengurus={handleDeletePengurus}
                        urusByStrukturId={urusByStrukturId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tree Node Modal ── */}
      {treeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">
                {treeModal === "addRoot"
                  ? "Tambah Jabatan Utama"
                  : treeModal === "addChild"
                    ? `Tambah Bawahan: ${parentForChild?.nama_jabatan}`
                    : "Edit Jabatan"}
              </h3>
              <button
                onClick={() => setTreeModal(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Tutup dialog"
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
                  placeholder="cth: Ketua, Sekretaris, Bendahara…"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Jabatan Induk</Label>
                  <select
                    value={nodeForm.parent_id ?? ""}
                    onChange={(e) =>
                      setNodeForm((f) => ({
                        ...f,
                        parent_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition"
                  >
                    <option value="">— Tanpa Induk (Akar) —</option>
                    {tree.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.nama_jabatan}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <select
                    value={nodeForm.level}
                    onChange={(e) => setNodeForm((f) => ({ ...f, level: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition"
                  >
                    <option value={1}>1 — Jabatan Utama</option>
                    <option value={2}>2 — Jabatan Bawah 1</option>
                    <option value={3}>3 — Jabatan Bawah 2</option>
                    <option value={4}>4 — Jabatan Bawah 3</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Urutan Tampil</Label>
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
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setTreeModal(null)} className="rounded-xl">
                Batal
              </Button>
              <Button
                onClick={handleSaveNode}
                disabled={saving}
                className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Node Confirm ── */}
      {confirmDeleteNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-display font-bold">Hapus Jabatan?</h3>
            <p className="font-body text-sm text-muted-foreground">
              "{confirmDeleteNode.nama_jabatan}" dan semua bawahannya akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteNode(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteNode(confirmDeleteNode)}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pengurus Modal ── */}
      {pengurusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">
                {pengurusModal === "add" ? "Tambah Pengurus" : "Edit Pengurus"}
                {selectedStruktur && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    — {selectedStruktur.nama_jabatan}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setPengurusModal(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {pErr && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body px-4 py-3">
                  {pErr}
                </div>
              )}

              {/* NIK + Autofill */}
              <div className="space-y-1.5">
                <Label>NIK</Label>
                <div className="flex gap-2">
                  <Input
                    value={pForm.nik}
                    onChange={(e) =>
                      setPForm((f) => ({
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
                    disabled={autofilling || pForm.nik.replace(/\D/g, "").length < 14}
                    className="rounded-xl gap-1.5"
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

              {/* Nama */}
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input
                  value={pForm.nama}
                  onChange={(e) => setPForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama lengkap…"
                  className="rounded-xl"
                />
              </div>

              {/* JK + TTL */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Jenis Kelamin</Label>
                  <Select
                    value={pForm.jenis_kelamin}
                    onValueChange={(v) =>
                      setPForm((f) => ({ ...f, jenis_kelamin: v as "Laki-Laki" | "Perempuan" }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-Laki">Laki-Laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tempat Lahir</Label>
                  <Input
                    value={pForm.tempat_lahir}
                    onChange={(e) => setPForm((f) => ({ ...f, tempat_lahir: e.target.value }))}
                    placeholder="cth: Lombok Timur"
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Tgl Lahir + Pendidikan */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={pForm.tanggal_lahir}
                    onChange={(e) => setPForm((f) => ({ ...f, tanggal_lahir: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pendidikan</Label>
                  <Select
                    value={pForm.pendidikan}
                    onValueChange={(v) => setPForm((f) => ({ ...f, pendidikan: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
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
              </div>

              {/* Alamat */}
              <div className="space-y-1.5">
                <Label>Alamat</Label>
                <Input
                  value={pForm.alamat}
                  onChange={(e) => setPForm((f) => ({ ...f, alamat: e.target.value }))}
                  placeholder="Alamat tinggal…"
                  className="rounded-xl"
                />
              </div>

              {/* No HP */}
              <div className="space-y-1.5">
                <Label>No. HP</Label>
                <Input
                  value={pForm.no_hp}
                  onChange={(e) => setPForm((f) => ({ ...f, no_hp: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                  className="rounded-xl"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={pForm.status}
                  onValueChange={(v) => setPForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setPengurusModal(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleSavePengurus}
                disabled={saving}
                className="rounded-xl gap-1.5 bg-primary hover:bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tree Node Row ────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  level,
  expandedIds,
  onToggle,
  onAddChild,
  onEditNode,
  onDeleteNode,
  onAddPengurus,
  onEditPengurus,
  onDeletePengurus,
  urusByStrukturId,
}: {
  node: StrukturNode;
  level: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onAddChild: (parent: StrukturNode) => void;
  onEditNode: (node: StrukturNode) => void;
  onDeleteNode: (node: StrukturNode) => void;
  onAddPengurus: (node: StrukturNode) => void;
  onEditPengurus: (p: TrusteesLembaga) => void;
  onDeletePengurus: (p: TrusteesLembaga) => void;
  urusByStrukturId: Map<number, TrusteesLembaga[]>;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const nodeUrus = urusByStrukturId.get(node.id) ?? [];

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* Expand toggle */}
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

        {/* Position name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-ui font-semibold text-sm truncate">{node.nama_jabatan}</span>
            {node.level === 0 && (
              <span className="text-[10px] font-ui font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                ROOT
              </span>
            )}
          </div>
        </div>

        {/* Trustees assigned */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {nodeUrus.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1 text-xs font-body bg-info/10 text-info rounded-full pl-2 pr-1 py-0.5 border border-info/20"
            >
              <span className="truncate max-w-[100px]">{p.nama}</span>
              <button
                onClick={() => onEditPengurus(p)}
                className="h-5 w-5 rounded hover:bg-info/20 flex items-center justify-center shrink-0"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => onDeletePengurus(p)}
                className="h-5 w-5 rounded hover:bg-destructive/20 flex items-center justify-center text-destructive shrink-0"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAddPengurus(node)}
            title="Tambah Pengurus"
            className="h-7 w-7 rounded-lg hover:bg-success/10 flex items-center justify-center text-success transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onAddChild(node)}
            title="Tambah Bawahan"
            className="h-7 w-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEditNode(node)}
            title="Edit Jabatan"
            className="h-7 w-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDeleteNode(node)}
            title="Hapus Jabatan"
            className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
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
              onAddPengurus={onAddPengurus}
              onEditPengurus={onEditPengurus}
              onDeletePengurus={onDeletePengurus}
              urusByStrukturId={urusByStrukturId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────────

import { UserPlus } from "lucide-react";

export function LembagaManager() {
  const [tab, setTab] = useState<"list" | "struktur">("list");
  const [, forceRefresh] = useState(0);

  function triggerRefresh() {
    forceRefresh((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Lembaga Desa</h2>
          <p className="font-body text-sm text-muted-foreground">
            Kelola data lembaga, struktur jabatan, dan pengurus desa secara dinamis.
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
          <Building2 className="h-4 w-4 inline-block mr-1.5 mb-0.5" />
          Daftar Lembaga
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
          Struktur &amp; Pengurus
        </button>
      </div>

      {tab === "list" ? (
        <LembagaListTab onEdit={() => setTab("struktur")} onRefresh={triggerRefresh} />
      ) : (
        <StrukturTab refreshList={triggerRefresh} />
      )}
    </div>
  );
}
