import React, { useState, useMemo, useEffect } from "react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  useBeritaStore,
  useAgendaStore,
  usePengumumanStore,
  useKomoditasStore,
  useGaleriStore,
  useApbdesStore,
  usePageContentStore,
  useKwtStore,
  useProdukHukumStore,
  useRealisasiStore,
  useBumdesStore,
  usePengaduanKategoriStore,
  useKoprasiStore,
  type Article,
  type AgendaItem,
  type PengumumanItem,
  type KomoditasItem,
  type GaleriItem,
  type ApbdesItem,
  ArticleSchema,
  PengumumanSchema,
  AgendaSchema,
  KomoditasSchema,
} from "@/lib/content-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Newspaper,
  Calendar,
  Megaphone,
  TrendingUp,
  Image as ImageIcon,
  ChevronRight,
  Save,
  X,
  Wallet,
  Upload,
  AlertTriangle,
  Loader2,
  BookOpen,
  Heart,
  Scale,
  Store,
  MessageSquare,
  Users,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/data/apbdes";
import { uploadMedia } from "@/lib/media-upload";

export function CMSManager() {
  const [activeTab, setActiveTab] = useState<
    | "berita"
    | "agenda"
    | "pengumuman"
    | "komoditas"
    | "galeri"
    | "apbdes"
    | "page_content"
    | "kwt"
    | "produk_hukum"
    | "realisasi"
    | "bumdes"
    | "pengaduan_kategori"
    | "koperasi"
  >("berita");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{
    message: string;
    action: () => void;
  } | null>(null);

  const stores = {
    berita: useBeritaStore(),
    agenda: useAgendaStore(),
    pengumuman: usePengumumanStore(),
    komoditas: useKomoditasStore(),
    galeri: useGaleriStore(),
    apbdes: useApbdesStore(),
    page_content: usePageContentStore(),
    kwt: useKwtStore(),
    produk_hukum: useProdukHukumStore(),
    realisasi: useRealisasiStore(),
    bumdes: useBumdesStore(),
    pengaduan_kategori: usePengaduanKategoriStore(),
    koprasi: useKoprasiStore(),
  };

  const currentStore = stores[activeTab];
  const items = currentStore.items;

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return items;
    return items.filter((item: CmsItemRecord) =>
      ((item.title as string) || (item.name as string) || "").toLowerCase().includes(s),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, items.length]);

  // ── Scroll to top when tab or mode changes ──────────────────────────────
  useEffect(() => {
    const el = document.getElementById("admin-content-top");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab, isAdding]);

  const handleDelete = async (id: string) => {
    const item = (items as CmsItemRecord[]).find((i) => i.id === id);
    const name = (item?.title as string) || (item?.name as string) || "item ini";
    setConfirmTarget({
      message: `Hapus "${name}"? Data yang dihapus tidak dapat dikembalikan.`,
      action: async () => {
        await currentStore.remove(id);
        toast.error("Item dihapus", { description: "Item telah dihapus dari database CMS." });
      },
    });
  };

  // Typed union for dynamic CMS items
  type CmsItem = Article | AgendaItem | PengumumanItem | KomoditasItem | GaleriItem | ApbdesItem;
  type CmsItemRecord = {
    id: string;
    [key: string]: unknown;
  };

  const handleEdit = (item: CmsItemRecord) => {
    setEditingId(item.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-2xl w-fit">
        {[
          { id: "berita", label: "Berita", icon: Newspaper },
          { id: "agenda", label: "Agenda", icon: Calendar },
          { id: "pengumuman", label: "Pengumuman", icon: Megaphone },
          { id: "komoditas", label: "Harga Komoditas", icon: TrendingUp },
          { id: "galeri", label: "Galeri", icon: ImageIcon },
          { id: "apbdes", label: "APBDes", icon: Wallet },
          { id: "page_content", label: "Konten Halaman", icon: BookOpen },
          { id: "kwt", label: "KWT", icon: Heart },
          { id: "produk_hukum", label: "Produk Hukum", icon: Scale },
          { id: "realisasi", label: "Realisasi APBDes", icon: TrendingUp },
          { id: "bumdes", label: "BUMDes", icon: Store },
          { id: "pengaduan_kategori", label: "Kategori Pengaduan", icon: MessageSquare },
          { id: "koperasi", label: "Kopi", icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as typeof activeTab);
              setIsAdding(false);
              setEditingId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-ui text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:bg-background/50"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cari ${activeTab}...`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>
        <Button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          className="rounded-full bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Button>
      </div>

      {isAdding ? (
        <CMSForm
          type={activeTab}
          editingId={editingId}
          onClose={() => {
            setIsAdding(false);
            setEditingId(null);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
              Tidak ada data ditemukan
            </div>
          ) : (
            filtered.map((item: CmsItemRecord) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border bg-card p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-ui text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
                      {(item.category as string) || (item.unit as string) || "Konten"}
                    </p>
                    <h4 className="font-display font-bold text-sm truncate">
                      {(item.title as string) || (item.name as string)}
                    </h4>
                    <p className="font-body text-[11px] text-muted-foreground line-clamp-2 mt-1">
                      {(item.excerpt as string) ||
                        (item.description as string) ||
                        (item.price ? formatRupiah(item.price as number) : "")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmTarget(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-border p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-bold">Konfirmasi Hapus</h3>
            </div>
            <p className="font-body text-sm text-muted-foreground mb-5">{confirmTarget.message}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmTarget(null)}>
                Batal
              </Button>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => {
                  const action = confirmTarget.action;
                  setConfirmTarget(null);
                  action();
                }}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CMSForm({
  type,
  editingId,
  onClose,
}: {
  type: string;
  editingId: string | null;
  onClose: () => void;
}) {
  const stores = {
    berita: useBeritaStore(),
    agenda: useAgendaStore(),
    pengumuman: usePengumumanStore(),
    komoditas: useKomoditasStore(),
    galeri: useGaleriStore(),
    apbdes: useApbdesStore(),
    page_content: usePageContentStore(),
    kwt: useKwtStore(),
    produk_hukum: useProdukHukumStore(),
    realisasi: useRealisasiStore(),
    bumdes: useBumdesStore(),
    pengaduan_kategori: usePengaduanKategoriStore(),
    kopi: useKoprasiStore(),
  };
  const store = (stores as Record<string, (typeof stores)[keyof typeof stores]>)[type];
  const existing = editingId ? store.items.find((i) => i.id === editingId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>(
    existing || {
      title: "",
      name: "",
      content: "",
      excerpt: "",
      category: "",
      price: 0,
      unit: "kg",
      day: "",
      month: "",
      time: "",
      location: "",
      url: "",
      icon: "Sprout",
      color: "text-success",
      status: "Tersedia",
      area: "-",
      published_at: new Date().toISOString(),
    },
  );

  // Image upload state (for galeri url field)
  const galeriInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [galeriUploading, setGaleriUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan", {
        description: "Gunakan format JPG, PNG, atau WebP.",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar", {
        description: "Maksimum ukuran file adalah 2MB. Kompres gambar sebelum upload.",
      });
      return;
    }
    setCoverUploading(true);
    try {
      const result = await uploadMedia(file, "berita", "public-media");
      if (result.ok) {
        setFormData((prev) => ({ ...prev, cover_image: result.publicUrl }));
        toast.success("Cover image uploaded", { description: "Gambar cover berhasil diupload." });
      } else {
        toast.error("Gagal upload cover", {
          description: result.error ?? "Coba lagi atau gunakan gambar lain.",
        });
      }
    } finally {
      setCoverUploading(false);
    }
  };

  const handleGaleriFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan", {
        description: "Gunakan format JPG, PNG, atau WebP untuk gambar.",
      });
      return;
    }
    setGaleriUploading(true);
    setImgError(false);
    try {
      const result = await uploadMedia(file, "galeri", "public-media");
      if (result.ok) {
        setFormData((prev) => ({
          ...prev,
          url: result.publicUrl,
          storage_path: result.storagePath,
        }));
      } else {
        toast.error(result.error);
      }
    } finally {
      setGaleriUploading(false);
    }
  };

  const isDataUrl = (formData.url || "").startsWith("data:");
  const previewSrc = imgError ? "" : formData.url || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schemas: Record<string, any> = {
        berita: ArticleSchema,
        pengumuman: PengumumanSchema,
        agenda: AgendaSchema,
        komoditas: KomoditasSchema,
      };

      if (schemas[type]) {
        const result = schemas[type].safeParse(formData);
        if (!result.success) {
          toast.error("Validasi gagal: " + result.error.errors[0].message, {
            description: "Perbaiki data sesuai format yang diminta.",
          });
          return;
        }
      }

      if (editingId) {
        await store.update(editingId, formData);
        toast.success("Berhasil diperbarui", {
          description: "Perubahan telah disimpan ke database.",
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await store.add(formData as any);
        toast.success("Berhasil ditambahkan", {
          description: "Item baru telah ditambahkan ke database.",
        });
      }
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan data", {
        description: "Coba simpan kembali atau hubungi administrator.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-bold">
          {editingId ? "Edit" : "Tambah"} {type.charAt(0).toUpperCase() + type.slice(1)}
        </h3>
        <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Fields based on type */}
        {(type === "berita" || type === "pengumuman" || type === "agenda") && (
          <div className="sm:col-span-2 space-y-2">
            <Label>Judul</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
        )}

        {type === "komoditas" && (
          <>
            <div className="space-y-2">
              <Label>Nama Komoditas</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Harga (Rp)</Label>
              <Input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Input
                placeholder="kg, liter, ikat, dll"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide)</Label>
              <Select
                value={formData.icon}
                onValueChange={(v) => setFormData({ ...formData, icon: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih icon" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Sprout",
                    "Droplets",
                    "Sun",
                    "Cloud",
                    "Wind",
                    "Thermometer",
                    "CloudRain",
                    "Zap",
                    "Star",
                    "Heart",
                    "Coffee",
                    "Leaf",
                    "Apple",
                    "Wheat",
                    "Egg",
                    "Milk",
                    "ShoppingCart",
                    "Bike",
                    "Ship",
                    "Plane",
                    "Car",
                    "Home",
                    "Building2",
                    "Store",
                    "MapPin",
                    "Globe",
                    "Smartphone",
                    "Tv",
                    "Laptop",
                    "Book",
                    "GraduationCap",
                    "Users",
                    "User",
                    "Award",
                    "Trophy",
                    "Medal",
                    "Gem",
                    "Coins",
                    "DollarSign",
                    "CreditCard",
                    "PiggyBank",
                    "Wallet",
                    "BarChart3",
                    "TrendingUp",
                    "TrendingDown",
                    "Activity",
                    "Target",
                    "Compass",
                    "Navigation",
                    "Anchor",
                    "Umbrella",
                    "Tent",
                    "Mountain",
                    "Trees",
                    "Flower2",
                    "PawPrint",
                    "Fish",
                    "Bug",
                    "Cherry",
                    "Grape",
                    "Banana",
                    "Carrot",
                    "Hot",
                    "Cool",
                    "Flame",
                    "Sparkles",
                    "Sparkle",
                    "Moon",
                    "Sunrise",
                    "Sunset",
                    "Clock",
                    "Timer",
                    "Hourglass",
                    "Watch",
                    "AlertTriangle",
                    "Info",
                    "CheckCircle",
                    "XCircle",
                    "Bell",
                    "Inbox",
                  ].map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <Select
                value={formData.color}
                onValueChange={(v) => setFormData({ ...formData, color: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih warna" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "text-success",
                    "text-info",
                    "text-warning",
                    "text-destructive",
                    "text-primary",
                    "text-secondary",
                    "text-muted-foreground",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {["Tersedia", "Panen", "Habis", "Pre-order", "Proses"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Luas Lahan</Label>
              <Input
                placeholder="100 Ha"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </>
        )}

        {type === "agenda" && (
          <>
            <div className="space-y-2">
              <Label>Tanggal (Hari)</Label>
              <Input
                placeholder="15"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Input
                placeholder="Mei"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Waktu</Label>
              <Input
                placeholder="09:00 - Selesai"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </>
        )}

        {type === "berita" && (
          <>
            {/* Cover Image */}
            <div className="sm:col-span-2 space-y-2">
              <Label>Gambar Cover</Label>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {formData.cover_image ? (
                  <div className="relative aspect-[16/9] bg-muted/30">
                    <img
                      src={formData.cover_image}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={() => setFormData((f) => ({ ...f, cover_image: "" }))}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, cover_image: "" }))}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 text-white flex items-center justify-center text-xs hover:bg-destructive transition-colors"
                      title="Hapus cover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="aspect-[16/9] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-ui text-xs text-muted-foreground">
                      Klik untuk upload gambar cover
                    </p>
                    <p className="font-ui text-[10px] text-muted-foreground/60">
                      JPG, PNG, WebP — maks 2MB · 1200×630px
                    </p>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Ringkasan (Excerpt)</Label>
              <Textarea
                rows={2}
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Ringkasan singkat artikel (maks 200 karakter)..."
              />
            </div>
            <div className="sm:col-span-2">
              <RichTextEditor
                value={formData.content ?? ""}
                onChange={(v) => {
                  const updated = { ...formData, content: v };
                  // Auto-calculate read time: ~200 words/min
                  const wordCount = v
                    .replace(/<[^>]*>/g, "")
                    .split(/\s+/)
                    .filter(Boolean).length;
                  updated.read_time = Math.max(1, Math.ceil(wordCount / 200));
                  setFormData(updated);
                }}
                placeholder="Ketik konten berita di sini..."
              />
            </div>

            {/* Tags */}
            <div className="sm:col-span-2 space-y-2">
              <Label>Tags</Label>
              <input
                type="text"
                value={(formData.tags as string[])?.join(", ") ?? ""}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="desa, kegiatan, pertanian (pisahkan dengan koma)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-ui text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {(formData.tags as string[])?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(formData.tags as string[]).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-ui text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Featured toggle */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, featured: !f.featured }))}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    formData.featured ? "bg-primary" : "bg-border"
                  }`}
                  role="switch"
                  aria-checked={!!formData.featured}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      formData.featured ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="font-ui text-xs text-foreground">
                  Tandai sebagai <strong>Artikel Pilihan</strong>
                </span>
              </label>
              <p className="font-body text-[11px] text-muted-foreground mt-1 ml-[52px]">
                Artikel pilihan akan tampil di bagian hero halaman berita.
              </p>
            </div>
          </>
        )}

        {type === "agenda" && (
          <>
            <div className="sm:col-span-2 space-y-2">
              <Label>Deskripsi Agenda</Label>
              <RichTextEditor
                value={formData.content ?? ""}
                onChange={(v) => setFormData((f) => ({ ...f, content: v }))}
                placeholder="Ketik deskripsi agenda di sini..."
              />
            </div>
          </>
        )}

        {(type === "berita" || type === "agenda") && (
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
        )}

        {/* Galeri image upload — perangkat only */}
        {type === "galeri" && (
          <div className="sm:col-span-2 space-y-2">
            <Label>Upload Gambar</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galeriInputRef.current?.click()}
                disabled={galeriUploading}
              >
                {galeriUploading ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5" />
                )}
                {galeriUploading ? "Mengupload…" : "Ambil dari Perangkat"}
              </Button>
              <input
                ref={galeriInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleGaleriFile(e.target.files[0])}
              />
              {formData.url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, url: "", storage_path: "" }));
                    setImgError(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
              )}
            </div>
            <p className="font-body text-[11px] text-muted-foreground">
              Format: JPG, PNG, WebP. Maksimal 5 MB.
            </p>

            {imgError && formData.url && (
              <p className="font-body text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Gagal memuat gambar.
              </p>
            )}

            {/* Preview */}
            {previewSrc && !imgError && (
              <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="h-36 w-full object-cover"
                  onError={() => setImgError(true)}
                />
                <span
                  className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${isDataUrl ? "bg-success/90" : "bg-info/90"}`}
                >
                  {isDataUrl ? "Perangkat" : "URL"}
                </span>
              </div>
            )}
          </div>
        )}

        {type === "kopi" && (
          <>
            <div className="sm:col-span-2 space-y-2">
              <Label>Nama Kopi (lembaga)</Label>
              <Input
                required
                value={formData.name || formData.label || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Kopi Sari Makmur"
              />
            </div>
            <div className="space-y-2">
              <Label>Nilai Statistik</Label>
              <Input
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Contoh: Rp 1,2 M"
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category || "stats"}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stats">Statistik (nilai utama)</SelectItem>
                  <SelectItem value="layanan">Layanan Kopi</SelectItem>
                  <SelectItem value="produk">Produk Kopi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide)</Label>
              <Select
                value={formData.icon || "Users"}
                onValueChange={(v) => setFormData({ ...formData, icon: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih icon" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Users",
                    "Wallet",
                    "TrendingUp",
                    "ShieldCheck",
                    "PiggyBank",
                    "CreditCard",
                    "BarChart3",
                    "FileText",
                    "DollarSign",
                    "Store",
                    "Package",
                  ].map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status || "Aktif"}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                rows={3}
                value={formData.description || formData.deskripsi || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi layanan atau produk kopi..."
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">
          Batal
        </Button>
        <Button type="submit" className="rounded-full bg-primary text-primary-foreground">
          <Save className="h-4 w-4 mr-2" />
          Simpan Data
        </Button>
      </div>
    </form>
  );
}
