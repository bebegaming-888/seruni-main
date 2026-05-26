import { useState } from "react";
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Trash2,
  Plus,
  Wand2,
  Bell,
  BellOff,
  CheckCircle2,
} from "lucide-react";
import { Section, Grid2, Field, ToggleRow, ImageUploadField } from "./settings-ui";
import { PAGE_GROUPS } from "./page-groups";
import { DEFAULT_SETTINGS, type SystemSettings, type PageConfig } from "@/lib/settings-store";
import { toast } from "sonner";

// ── PAGE_GROUPS (shared across SettingsPanel + PagesCMS) ───────────────────────
export { PAGE_GROUPS } from "./page-groups";

// ── Pages CMS ──────────────────────────────────────────────────────────────────

export function PagesCMS({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const [selectedPage, setSelectedPage] = useState<string>("/profil/desa");

  const allPages = s.pages ?? DEFAULT_SETTINGS.pages;

  const pageConfig = allPages[selectedPage] ?? allPages["/profil/desa"];

  const updatePage = (patch: Partial<PageConfig>) => {
    update("pages", {
      [selectedPage]: { ...pageConfig, ...patch },
    });
  };

  return (
    <Section
      title="Konten Halaman"
      desc="Kelola judul, deskripsi, gambar cover, dan konten kustom untuk setiap halaman."
    >
      <div className="flex gap-4 flex-col sm:flex-row">
        {/* Sidebar daftar halaman */}
        <div className="sm:w-48 shrink-0 space-y-1">
          {PAGE_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="font-ui text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                {g.group}
              </p>
              {g.pages.map((p) => {
                const cfg = allPages[p.path];
                return (
                  <button
                    key={p.path}
                    onClick={() => setSelectedPage(p.path)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-ui text-xs transition-colors ${
                      selectedPage === p.path
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted"
                    }`}
                  >
                    {p.label}
                    {!cfg?.enabled && (
                      <span className="ml-1 text-[10px] opacity-60">(nonaktif)</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Editor panel */}
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold">{selectedPage}</h4>
              <ToggleRow
                compact
                label="Halaman Aktif"
                checked={pageConfig.enabled}
                onChange={(v) => updatePage({ enabled: v })}
              />
            </div>
            <Grid2>
              <Field label="Judul Halaman">
                <Input
                  value={pageConfig.title}
                  onChange={(e) => updatePage({ title: e.target.value })}
                />
              </Field>
              <Field label="Gambar Cover">
                <ImageUploadField
                  label=""
                  hint="Gambar utama halaman (disarankan 1200×630px)"
                  value={pageConfig.image_url || ""}
                  storagePath={(pageConfig as { image_storage_path?: string }).image_storage_path}
                  onChange={(v) => updatePage({ image_url: v })}
                  onStoragePathChange={(path) =>
                    updatePage({ image_storage_path: path } as unknown as Partial<PageConfig>)
                  }
                />
              </Field>
            </Grid2>
            <Field label="Deskripsi Singkat">
              <Textarea
                rows={2}
                value={pageConfig.description}
                onChange={(e) => updatePage({ description: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <Label className="font-ui text-xs font-semibold">Konten Kustom</Label>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                Teks atau konten tambahan yang akan ditampilkan di halaman. Gunakan | untuk
                memisahkan paragraf.
              </p>
            </div>
            <Textarea
              rows={6}
              value={pageConfig.custom_content}
              onChange={(e) => updatePage({ custom_content: e.target.value })}
              placeholder="Masukkan konten tambahan di sini…&#10;Gunakan | sebagai pemisah paragraf."
            />
          </div>

          {selectedPage === "/profil/desa" && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-ui text-sm font-semibold">Konten Profil Desa</p>
              <Field label="Sejarah Singkat">
                <Textarea
                  rows={4}
                  value={pageConfig.extras.sejarah ?? ""}
                  onChange={(e) =>
                    updatePage({ extras: { ...pageConfig.extras, sejarah: e.target.value } })
                  }
                  placeholder="Tulis sejarah singkat desa…"
                />
              </Field>
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-2">
                <p className="font-ui text-xs font-semibold text-warning">
                  Visi & Misi ada di bagian "Profil Publik (CMS)"
                </p>
                <p className="font-ui text-[11px] text-muted-foreground">
                  Visi dan Misi desa dikelola di tab <strong>Profil Publik (CMS)</strong> agar
                  konsisten di landing page dan halaman profil. Tidak perlu mengisi di sini.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── CMS Content Settings ────────────────────────────────────────────────────────

export function CMSContentSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const content = s.content || DEFAULT_SETTINGS.content;

  const updateContent = (patch: Partial<SystemSettings["content"]>) => {
    update("content", { ...content, ...patch });
  };

  const addMission = () => {
    updateContent({ mission: [...(content.mission || []), ""] });
  };

  const updateMission = (idx: number, val: string) => {
    const arr = [...(content.mission || [])];
    arr[idx] = val;
    updateContent({ mission: arr });
  };

  const removeMission = (idx: number) => {
    updateContent({ mission: (content.mission || []).filter((_, i) => i !== idx) });
  };

  const updateStat = (idx: number, patch: Partial<SystemSettings["content"]["stats"][0]>) => {
    const arr = [...(content.stats || [])];
    arr[idx] = { ...arr[idx], ...patch };
    updateContent({ stats: arr });
  };

  return (
    <>
      <Section
        title="Visi & Misi"
        desc="Visi dan misi desa yang ditampilkan di halaman profil dan landing page."
      >
        <Field label="Visi Desa" hint="Satu kalimat besar yang menjadi cita-cita desa.">
          <Textarea
            rows={2}
            value={content.vision}
            onChange={(e) => updateContent({ vision: e.target.value })}
            placeholder="Terwujudnya desa yang..."
          />
        </Field>
        <div className="space-y-2">
          <Label className="font-ui text-xs font-semibold">Misi Desa</Label>
          <div className="space-y-2">
            {(content.mission || []).map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={m}
                  onChange={(e) => updateMission(i, e.target.value)}
                  placeholder={`Misi ke-${i + 1}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMission(i)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addMission}>
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Misi
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Tentang Desa" desc="Teks pengantar desa yang muncul di landing page.">
        <Field label="Teks 'Tentang Desa'">
          <Textarea
            rows={5}
            value={content.about_text}
            onChange={(e) => updateContent({ about_text: e.target.value })}
            placeholder="Deskripsi desa..."
          />
        </Field>
      </Section>

      <Section title="Statistik Desa" desc="Pencapaian atau data cepat desa (Landing Page).">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(content.stats || []).map((st, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-bold">Statistik {i + 1}</span>
                <Select value={st.icon} onValueChange={(v) => updateStat(i, { icon: v })}>
                  <SelectTrigger className="h-7 w-24">
                    <SelectValue placeholder="Icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">Warga</SelectItem>
                    <SelectItem value="map">Wilayah</SelectItem>
                    <SelectItem value="palmtree">Wisata</SelectItem>
                    <SelectItem value="trophy">Prestasi</SelectItem>
                    <SelectItem value="home">Rumah</SelectItem>
                    <SelectItem value="star">Bintang</SelectItem>
                    <SelectItem value="heart">Sosial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Grid2>
                <Field label="Label">
                  <Input
                    value={st.label}
                    onChange={(e) => updateStat(i, { label: e.target.value })}
                  />
                </Field>
                <Field label="Nilai (Value)">
                  <Input
                    value={st.value}
                    onChange={(e) => updateStat(i, { value: e.target.value })}
                  />
                </Field>
              </Grid2>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── Social Media Settings ───────────────────────────────────────────────────────

export function SocialMediaSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const social = s.social || DEFAULT_SETTINGS.social;

  return (
    <Section title="Media Sosial" desc="Tautan ke akun media sosial resmi pemerintah desa.">
      <div className="space-y-4">
        <Field label="Facebook URL">
          <div className="flex gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Facebook className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={social.facebook}
              onChange={(e) => update("social", { facebook: e.target.value })}
              placeholder="https://facebook.com/..."
            />
          </div>
        </Field>
        <Field label="Instagram URL">
          <div className="flex gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Instagram className="h-4 w-4 text-destructive" />
            </div>
            <Input
              value={social.instagram}
              onChange={(e) => update("social", { instagram: e.target.value })}
              placeholder="https://instagram.com/..."
            />
          </div>
        </Field>
        <Field label="YouTube URL">
          <div className="flex gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Youtube className="h-4 w-4 text-destructive" />
            </div>
            <Input
              value={social.youtube}
              onChange={(e) => update("social", { youtube: e.target.value })}
              placeholder="https://youtube.com/@..."
            />
          </div>
        </Field>
        <Field label="Twitter / X URL">
          <div className="flex gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Twitter className="h-4 w-4 text-foreground" />
            </div>
            <Input
              value={social.twitter}
              onChange={(e) => update("social", { twitter: e.target.value })}
              placeholder="https://twitter.com/..."
            />
          </div>
        </Field>
        <Field label="Website Resmi" className="sm:col-span-2">
          <div className="flex gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={social.website ?? ""}
              onChange={(e) => update("social", { website: e.target.value })}
              placeholder="https://nama-desa.desa.id"
            />
          </div>
        </Field>
      </div>
    </Section>
  );
}

// ── Push Notification Panel ───────────────────────────────────────────────────

export function PushNotificationPanel() {
  const [status, setStatus] = useState<"unsupported" | "denied" | "granted" | "default">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("@/lib/push-notif").then(({ getNotificationPermission, isPushSubscribed }) => {
      setStatus(getNotificationPermission());
      isPushSubscribed().then(setSubscribed);
    });
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { subscribePush, isPushSupported, requestNotificationPermission } =
        await import("@/lib/push-notif");
      if (!isPushSupported()) {
        toast.error("Browser tidak mendukung push notification");
        return;
      }
      const perm = await requestNotificationPermission();
      if (!perm) {
        toast.error("Izin notifikasi ditolak");
        setStatus("denied");
        return;
      }
      const sub = await subscribePush();
      if (sub) {
        setSubscribed(true);
        setStatus("granted");
        toast.success("Notifikasi browser aktif!");
      } else {
        toast.error("Gagal mengaktifkan. Pastikan VITE_VAPID_PUBLIC_KEY sudah diset.");
      }
    } catch (e) {
      toast.error("Gagal mengaktifkan notifikasi");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const { unsubscribePush } = await import("@/lib/push-notif");
      await unsubscribePush();
      setSubscribed(false);
      toast.success("Notifikasi browser dinonaktifkan");
    } catch {
      toast.error("Gagal menonaktifkan");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unsupported") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-ui text-sm font-semibold">Tidak Didukung</p>
          <p className="font-ui text-xs text-muted-foreground mt-0.5">
            Browser Anda tidak mendukung Web Push Notification.
          </p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
        <BellOff className="h-5 w-5 text-destructive mt-0.5" />
        <div>
          <p className="font-ui text-sm font-semibold text-destructive">Izin Ditolak</p>
          <p className="font-ui text-xs text-muted-foreground mt-0.5">
            Untuk mengaktifkan notifikasi, ubah izin di pengaturan browser Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {subscribed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-ui text-sm font-semibold text-success">Notifikasi Aktif</p>
              <p className="font-ui text-xs text-muted-foreground">
                Anda akan menerima pemberitahuan saat status surat berubah.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-ui text-sm font-semibold">Belum Aktif</p>
              <p className="font-ui text-xs text-muted-foreground">
                Aktifkan untuk menerima notifikasi real-time di browser.
              </p>
            </div>
          </div>
        )}
      </div>

      {subscribed ? (
        <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={loading}>
          {loading ? "Memproses…" : "Nonaktifkan Notifikasi"}
        </Button>
      ) : (
        <Button variant="default" size="sm" onClick={handleActivate} disabled={loading}>
          {loading ? "Mengaktifkan…" : "Aktifkan Notifikasi"}
        </Button>
      )}

      <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 space-y-1.5">
        <p className="font-ui text-xs font-semibold text-warning">
          Notifikasi browser berbeda dari Notifikasi WhatsApp
        </p>
        <p className="font-ui text-[11px] text-muted-foreground">
          Notifikasi browser bekerja even saat tab ditutup. Konfirmasi tanda tangan persetujuan
          kepala desa memerlukan notifikasi WhatsApp (diatur di tab "Notifikasi WA").
        </p>
      </div>
    </div>
  );
}
