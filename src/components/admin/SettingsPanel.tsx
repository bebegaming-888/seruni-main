import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Palette,
  BellRing,
  FileSignature,
  FileText,
  ShieldCheck,
  MonitorCog,
  DatabaseBackup,
  Users2,
  ScrollText,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  KeyRound,
  AlertTriangle,
  Image,
  LayoutTemplate,
  BookOpen,
  Globe,
  Share2,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Megaphone,
  BarChart3,
  Heart,
  Star,
  MapPin,
  Map,
  Home,
  Trophy,
  X,
  Bell,
  BellOff,
  CheckCircle2,
  Wand2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getSettings,
  useSettings,
  saveSettings,
  resetSettings,
  exportFullBackup,
  importFullBackup,
  clearAllData,
  listAudit,
  clearAudit,
  logAudit,
  DEFAULT_SETTINGS,
  type SystemSettings,
  type PageConfig,
} from "@/lib/settings-store";
import { WilayahSettings } from "@/components/admin/WilayahSettings";
import { PerangkatDesaManager } from "@/components/admin/PerangkatDesaManager";
import { LembagaManager } from "@/components/admin/LembagaManager";
import { sendWaNotification } from "@/lib/fonnte";
import {
  initPerangkatStore,
  listStrukturAktif,
  getPerangkatByStrukturId,
  type PerangkatStruktur,
  type PerangkatPerson,
} from "@/lib/perangkat-desa-store";
import {
  listUsers,
  saveUser,
  deleteUser,
  changePassword,
  getSession,
  type AdminUser,
  type AdminRole,
  FIXED_ADMIN,
} from "@/lib/auth";
import { HeroSettings } from "@/components/admin/HeroSettings";
import {
  Section,
  Grid2,
  Field,
  ToggleRow,
  VideoUploadField,
  ImageUploadField,
} from "@/components/admin/settings-ui";
import {
  PagesCMS,
  CMSContentSettings,
  SocialMediaSettings,
  PushNotificationPanel,
} from "@/components/admin/settings-sections";
import { KopDanBlankoSettings } from "@/components/admin/KopDanBlankoSettings";
import { useAutoFillVillage, useAutoFillSignature } from "@/components/admin/settings-autofill";

const SECTIONS = [
  { key: "wilayah", label: "Wilayah", icon: MapPin },
  { key: "village", label: "Profil Desa", icon: Building2 },
  { key: "hero", label: "Hero Landing", icon: Image },
  { key: "perangkat", label: "Perangkat Desa", icon: Users2 },
  { key: "lembaga", label: "Lembaga Desa", icon: Building2 },
  { key: "branding", label: "Tampilan & Brand", icon: Palette },
  { key: "cms", label: "Profil Publik (CMS)", icon: Megaphone },
  { key: "social", label: "Media Sosial", icon: Share2 },
  { key: "kopSurat", label: "Kop & Blanko Surat", icon: LayoutTemplate },
  { key: "pages", label: "Konten Halaman", icon: BookOpen },
  { key: "notifications", label: "Notifikasi WA", icon: BellRing },
  { key: "push", label: "Notifikasi Browser", icon: Bell },
  { key: "signature", label: "E-Signature", icon: FileSignature },
  { key: "surat", label: "Konfigurasi Surat", icon: FileText },
  { key: "security", label: "Keamanan", icon: ShieldCheck },
  { key: "users", label: "Manajemen Pengguna", icon: Users2 },
  { key: "appearance", label: "Antarmuka", icon: MonitorCog },
  { key: "backup", label: "Backup & Restore", icon: DatabaseBackup },
  { key: "audit", label: "Audit Log", icon: ScrollText },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ConflictStatus = "none" | "external_change" | "resolving";

export function SettingsPanel() {
  const [section, setSection] = useState<SectionKey>("village");
  // Ambil data DARI ZUSTAND STORE secara reaktif — bukan dari getSettings() sekali jalan.
  // useSettings() akan re-render component saat store di-update oleh initSettingsStore().
  const storeSettings = useSettings();
  const [s, setS] = useState<SystemSettings>(storeSettings);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [conflictStatus, setConflictStatus] = useState<ConflictStatus>("none");
  const [resetOpen, setResetOpen] = useState(false);
  // Track versi data saat pertama load dari store — untuk deteksi perubahan external
  const storeVersionRef = useRef<string>("");
  // Track apakah sync sedang aktif ( cegah re-render loop )
  const isSyncingRef = useRef(false);
  // C-1 fix: track timer IDs to prevent memory leaks
  const saveStatusTimerRef = useRef<number | null>(null);

  // update function — declared before useAutoFill hooks so hooks can use it
  const update = <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => {
    setS((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
    setDirty(true);
    setSaveStatus("idle");
  };

  // Autofill — use shared hooks (H-1 fix: remove duplicate inline implementations)
  const { autofilling, handleAutoFillVillage } = useAutoFillVillage(
    update as <K extends string>(k: K, patch: Record<string, unknown>) => void,
  );
  const { autofilling: sigAutofilling, handleAutoFillSignature } = useAutoFillSignature(
    update as <K extends string>(k: K, patch: Record<string, unknown>) => void,
  );

  // Sinkronisasi state saat store selesai di-init dari IndexedDB / Supabase.
  // Hanya update jika: (a) user tidak punya perubahan, atau (b) versi store berubah setelah save.
  useEffect(() => {
    if (isSyncingRef.current) return;
    const currentVersion = JSON.stringify(storeSettings);
    // Jika versi sama, tidak perlu update (avoid overwriting user changes)
    if (currentVersion === storeVersionRef.current) return;
    // Jika user punya perubahan DAN versi sama, skip (user sedang editing)
    if (dirty && storeVersionRef.current !== "") {
      setConflictStatus("external_change");
      return;
    }
    // Update local state dengan data dari store
    isSyncingRef.current = true;
    setS(storeSettings);
    storeVersionRef.current = currentVersion;
    setConflictStatus("none");
    // Reset flag after render
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- H-2 fix: dirty removed intentionally — effect syncs store→local state, dirty only prevents overwriting user edits (guarded by the if(dirty) check above)
  }, [storeSettings]);

  // Multi-tab sync listener — re-fetch saat tab lain menyimpan
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("@/lib/idb-sync").then(({ addSyncListener, syncFromRemote }) => {
      cleanup = addSyncListener(async (event) => {
        if (event.source === "tab" && event.key === "main") {
          // Tab lain menyimpan — cek apakah user sedang edit
          if (dirty) {
            setConflictStatus("external_change");
            toast.warning("Data berubah di tab lain. Pilih aksi di bawah.", {
              action: {
                label: "Gunakan Data Tab Lain",
                onClick: () => {
                  const updated = useSettings.getState();
                  setS(updated);
                  storeVersionRef.current = JSON.stringify(updated);
                  setDirty(false);
                  setConflictStatus("none");
                  toast.info("Data disinkronisasi dari tab lain");
                },
              },
              duration: 10000,
            });
          } else {
            // Tidak ada local changes — auto sync
            await syncFromRemote();
            const updated = useSettings.getState();
            setS(updated);
            storeVersionRef.current = JSON.stringify(updated);
            toast.info("Data disinkronisasi dari tab lain");
          }
        }
      });
    });
    return () => {
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- H-4 fix: listener registers once on mount, dirty not needed in deps
  }, []);

  // Accept external change dan keep local edits
  const handleKeepLocal = () => {
    setConflictStatus("none");
    toast.info("Perubahan lokal disimpan — konflik diabaikan");
  };

  // Accept external change dan discard local edits
  const handleAcceptExternal = () => {
    const updated = useSettings.getState();
    setS(updated);
    storeVersionRef.current = JSON.stringify(updated);
    setDirty(false);
    setConflictStatus("none");
    toast.info("Data disinkronisasi dari tab lain");
  };

  const session = getSession();
  type PdfLayoutMargin = { top: string; bottom: string; left: string; right: string };
  type PdfLayoutFont = { family: string; size: string; lineHeight: string };
  type PdfLayoutSig = { qrWidth: string; marginY: string };
  type PdfLayoutPatch = {
    margin?: PdfLayoutMargin;
    font?: PdfLayoutFont;
    signaturePos?: PdfLayoutSig;
    body_font?: string;
    body_font_size?: number;
  };

  const handleSave = async () => {
    if (saveStatus === "saving") return; // Cegah double-save
    setSaveStatus("saving");
    try {
      await saveSettings(s, session?.username ?? "admin");
      await logAudit(session?.username ?? "system", "Update Settings", section);
      setDirty(false);
      setSaveStatus("saved");
      toast.success("Pengaturan disimpan", {
        description: `Bagian "${SECTIONS.find((s) => s.key === section)?.label ?? section}" telah diperbarui.`,
      });
      // Reset status after 3s (C-1 fix: clear previous timer)
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("[SettingsPanel] Gagal menyimpan:", err);
      setSaveStatus("error");
      toast.error("Gagal menyimpan pengaturan", {
        description:
          "Pastikan koneksi internet stabil dan coba lagi. Hubungi administrator jika masalah berlanjut.",
      });
      // Reset status after 5s (C-1 fix: clear previous timer)
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 5000);
    }
  };

  const handleReset = () => {
    setResetOpen(true);
  };

  const confirmReset = () => {
    resetSettings();
    setS(getSettings());
    setDirty(false);
    setResetOpen(false);
    toast.success("Pengaturan direset ke default");
  };

  // ── Conflict resolution banner ──
  if (conflictStatus === "external_change") {
    return (
      <div className="rounded-2xl border-2 border-[hsl(var(--brand-sand))] bg-[hsl(var(--brand-sand))] dark:border-[hsl(var(--brand-sand))] dark:bg-[hsl(var(--brand-sand))]/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(var(--brand-orange))] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Data berubah di tab lain
            </h3>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Ada perubahan settings dari tab browser lain. Perubahan lokal Anda tidak hilang —
              pilih aksi yang ingin dilakukan.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 ml-9">
          <Button
            size="sm"
            variant="outline"
            className="border-[hsl(var(--brand-sand))] text-foreground hover:bg-[hsl(var(--brand-sand))]/20"
            onClick={handleKeepLocal}
          >
            Simpan Perubahan Lokal Saya
          </Button>
          <Button
            size="sm"
            className="bg-[hsl(var(--brand-teal))] hover:bg-[hsl(var(--brand-teal))]/80 text-white"
            onClick={handleAcceptExternal}
          >
            Gunakan Data Tab Lain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <MonitorCog className="h-5 w-5 text-primary" /> Pengaturan Sistem
          </h2>
          <p className="font-body text-xs text-muted-foreground">
            Kelola seluruh konfigurasi: profil desa, akun, notifikasi, keamanan, backup, dan
            lainnya.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Default
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saveStatus === "saving"}
            className="bg-primary text-primary-foreground hover:bg-primary min-w-[140px]"
          >
            {saveStatus === "saving" ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-1.5" />
                Menyimpan...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Tersimpan
              </>
            ) : dirty ? (
              <>
                <Save className="h-4 w-4 mr-1.5" /> Simpan Perubahan
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5 opacity-50" /> Tersimpan
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs
        value={section}
        onValueChange={(v) => setSection(v as SectionKey)}
        className="flex flex-col lg:flex-row"
      >
        <TabsList className="h-auto flex-wrap lg:flex-col lg:w-64 lg:rounded-none lg:bg-muted/20 lg:border-r lg:border-border p-2 gap-1 justify-start overflow-y-auto max-h-[80vh]">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            return (
              <TabsTrigger
                key={sec.key}
                value={sec.key}
                className="justify-start gap-2 w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Icon className="h-4 w-4" /> {sec.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 p-5 sm:p-6 space-y-6 max-w-3xl">
          <TabsContent value="wilayah" className="m-0">
            <div className="rounded-xl border border-info/20 bg-info/5 p-3 mb-4 flex items-start gap-3">
              <div>
                <p className="font-ui text-xs font-semibold text-info">
                  Pengaturan wilayah & profil terintegrasi
                </p>
                <p className="font-ui text-[11px] text-muted-foreground mt-0.5">
                  Data Nama Desa, alamat, dan wilayah dicatat di <strong>tab "Profil Desa"</strong>.
                  Tab ini mengelola kode desa dan daftar dusun saja.
                </p>
              </div>
            </div>
            <WilayahSettings
              villageName={s.village.name}
              onVillageNameChange={(v) => update("village", { name: v })}
            />
          </TabsContent>

          <TabsContent value="hero" className="m-0">
            <HeroSettings />
          </TabsContent>

          <TabsContent value="village" className="m-0 space-y-4">
            <Section
              title="Identitas Pemerintah Desa"
              desc="Data resmi yang muncul di kop surat, footer website, dan QR e-signature."
            >
              <Grid2>
                <Field label="Nama Desa">
                  <Input
                    value={s.village.name}
                    onChange={(e) => update("village", { name: e.target.value })}
                  />
                </Field>
                <Field label="Kode Desa">
                  <Input
                    value={s.village.code}
                    onChange={(e) => update("village", { code: e.target.value })}
                  />
                </Field>
                <Field label="Kepala Desa">
                  <div className="flex items-center gap-2">
                    <Input
                      value={s.village.head}
                      onChange={(e) => update("village", { head: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleAutoFillVillage}
                      disabled={autofilling}
                      title="Autofill dari Perangkat Desa"
                      className="shrink-0 h-9 px-3 rounded-xl bg-primary/10 text-primary text-xs font-ui font-semibold hover:bg-primary/20 disabled:opacity-50 transition inline-flex items-center gap-1.5 border border-primary/20"
                    >
                      {autofilling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      Isi Otomatis
                    </button>
                  </div>
                </Field>
                <Field label="Sekretaris Desa">
                  <div className="flex items-center gap-2">
                    <Input
                      value={s.village.secretary}
                      onChange={(e) => update("village", { secretary: e.target.value })}
                    />
                  </div>
                </Field>
                <Field label="Telepon">
                  <Input
                    value={s.village.phone}
                    onChange={(e) => update("village", { phone: e.target.value })}
                  />
                </Field>
                <Field label="WhatsApp (62…)">
                  <Input
                    value={s.village.whatsapp}
                    onChange={(e) => update("village", { whatsapp: e.target.value })}
                  />
                </Field>
                <Field label="Email Resmi">
                  <Input
                    type="email"
                    value={s.village.email}
                    onChange={(e) => update("village", { email: e.target.value })}
                  />
                </Field>
                <Field label="Kode Pos">
                  <Input
                    value={s.village.postal_code}
                    onChange={(e) => update("village", { postal_code: e.target.value })}
                  />
                </Field>
              </Grid2>
              <Field label="Alamat Lengkap">
                <Textarea
                  rows={2}
                  value={s.village.address}
                  onChange={(e) => update("village", { address: e.target.value })}
                />
              </Field>
              <Grid2>
                <Field label="Kecamatan">
                  <Input
                    value={s.village.district}
                    onChange={(e) => update("village", { district: e.target.value })}
                  />
                </Field>
                <Field label="Kabupaten">
                  <Input
                    value={s.village.regency}
                    onChange={(e) => update("village", { regency: e.target.value })}
                  />
                </Field>
                <Field label="Provinsi">
                  <Input
                    value={s.village.province}
                    onChange={(e) => update("village", { province: e.target.value })}
                  />
                </Field>
                <Field label="URL Logo Desa">
                  <ImageUploadField
                    label="Logo Desa"
                    hint="PNG atau JPG, maks 500KB"
                    value={s.village.logo_url}
                    storagePath={s.village.logo_storage_path}
                    onChange={(v) => update("village", { logo_url: v })}
                    onStoragePathChange={(path) => update("village", { logo_storage_path: path })}
                  />
                </Field>
              </Grid2>
            </Section>
          </TabsContent>

          <TabsContent value="perangkat" className="m-0">
            <PerangkatDesaManager username={getSession()?.username ?? "admin"} />
          </TabsContent>

          <TabsContent value="lembaga" className="m-0">
            <LembagaManager />
          </TabsContent>

          <TabsContent value="branding" className="m-0 space-y-4">
            <Section title="Tampilan & Branding" desc="Identitas visual website desa.">
              <Grid2>
                <Field label="Judul Situs">
                  <Input
                    value={s.branding.site_title}
                    onChange={(e) => update("branding", { site_title: e.target.value })}
                  />
                </Field>
                <Field label="Favicon">
                  <ImageUploadField
                    label="Favicon"
                    hint="ICO atau PNG, 32×32 atau 48×48 px"
                    value={s.branding.favicon_url}
                    storagePath={s.branding.favicon_storage_path}
                    onChange={(v) => update("branding", { favicon_url: v })}
                    onStoragePathChange={(path) =>
                      update("branding", { favicon_storage_path: path })
                    }
                  />
                </Field>
                <Field label="Warna Primer">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={s.branding.primary_color}
                      onChange={(e) => update("branding", { primary_color: e.target.value })}
                      className="h-10 w-14 rounded border border-border bg-card cursor-pointer"
                    />
                    <Input
                      value={s.branding.primary_color}
                      onChange={(e) => update("branding", { primary_color: e.target.value })}
                    />
                  </div>
                </Field>
                <Field label="Warna Aksen">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={s.branding.accent_color}
                      onChange={(e) => update("branding", { accent_color: e.target.value })}
                      className="h-10 w-14 rounded border border-border bg-card cursor-pointer"
                    />
                    <Input
                      value={s.branding.accent_color}
                      onChange={(e) => update("branding", { accent_color: e.target.value })}
                    />
                  </div>
                </Field>
              </Grid2>
              <Field label="Tagline / Motto">
                <Textarea
                  rows={2}
                  value={s.branding.tagline}
                  onChange={(e) => update("branding", { tagline: e.target.value })}
                />
              </Field>
            </Section>
          </TabsContent>

          <TabsContent value="cms" className="m-0 space-y-4">
            <CMSContentSettings s={s} update={update} />
          </TabsContent>

          <TabsContent value="social" className="m-0 space-y-4">
            <SocialMediaSettings s={s} update={update} />
          </TabsContent>

          <TabsContent value="kopSurat" className="m-0">
            <KopDanBlankoSettings s={s} update={update} />
          </TabsContent>

          <TabsContent value="pages" className="m-0 space-y-4">
            <PagesCMS s={s} update={update} />
          </TabsContent>

          <TabsContent value="notifications" className="m-0 space-y-4">
            <Section
              title="Notifikasi WhatsApp (Fonnte)"
              desc="Atur token API Fonnte dan template pesan otomatis untuk warga."
            >
              <ToggleRow
                label="Aktifkan Notifikasi WA"
                desc="Mengirim pesan otomatis untuk setiap perubahan status surat."
                checked={s.notifications.wa_enabled}
                onChange={(v) => update("notifications", { wa_enabled: v })}
              />
              <Grid2>
                <Field label="Fonnte API Token">
                  <Input
                    type="password"
                    value={s.notifications.fonnte_token}
                    onChange={(e) => update("notifications", { fonnte_token: e.target.value })}
                  />
                </Field>
              </Grid2>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <ToggleRow
                  compact
                  label="Saat Pengajuan Masuk"
                  checked={s.notifications.notify_on_submit}
                  onChange={(v) => update("notifications", { notify_on_submit: v })}
                />
                <ToggleRow
                  compact
                  label="Saat Diverifikasi"
                  checked={s.notifications.notify_on_verify}
                  onChange={(v) => update("notifications", { notify_on_verify: v })}
                />
                <ToggleRow
                  compact
                  label="Saat Disetujui"
                  checked={s.notifications.notify_on_approve}
                  onChange={(v) => update("notifications", { notify_on_approve: v })}
                />
                <ToggleRow
                  compact
                  label="Saat Ditolak"
                  checked={s.notifications.notify_on_reject}
                  onChange={(v) => update("notifications", { notify_on_reject: v })}
                />
              </div>

              <Field
                label="Template — Pengajuan Diterima"
                hint="Variabel: {nama}, {jenis_surat}, {no}"
              >
                <Textarea
                  rows={2}
                  value={s.notifications.template_submit}
                  onChange={(e) => update("notifications", { template_submit: e.target.value })}
                />
              </Field>
              <Field label="Template — Disetujui">
                <Textarea
                  rows={2}
                  value={s.notifications.template_approve}
                  onChange={(e) => update("notifications", { template_approve: e.target.value })}
                />
              </Field>
              <Field label="Template — Ditolak" hint="Variabel tambahan: {alasan}">
                <Textarea
                  rows={2}
                  value={s.notifications.template_reject}
                  onChange={(e) => update("notifications", { template_reject: e.target.value })}
                />
              </Field>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!s.notifications.wa_enabled) {
                    toast.error("Aktifkan toggle 'Aktifkan Notifikasi WA' dulu di pengaturan.");
                    return;
                  }
                  if (!s.notifications.fonnte_token) {
                    toast.error("Isi Fonnte API Token dulu di pengaturan.");
                    return;
                  }
                  if (!s.village.whatsapp || s.village.whatsapp === "-") {
                    toast.error("Isi nomor WhatsApp di tab Profil Desa dulu.");
                    return;
                  }
                  const result = await sendWaNotification(
                    s.village.whatsapp.replace(/\D/g, ""),
                    `✅ Test Notifikasi WA — ${s.village.name}\n\nIni adalah pesan tes dari sistem. Jika Anda menerima ini, berarti notifikasi WA aktif dan berfungsi.`,
                  );
                  if (result.ok) {
                    toast.success("Pesan tes terkirim! Cek WhatsApp.");
                  } else {
                    toast.error("Gagal kirim: " + result.message);
                  }
                }}
              >
                <BellRing className="h-4 w-4 mr-1.5" /> Kirim Tes Pesan
              </Button>
            </Section>
          </TabsContent>

          <TabsContent value="push" className="m-0 space-y-4">
            <Section
              title="Notifikasi Browser (Push)"
              desc="Aktifkan notifikasi push di browser agar warga menerima pemberitahuan status surat secara real-time."
            >
              <PushNotificationPanel />
            </Section>
          </TabsContent>

          <TabsContent value="signature" className="m-0 space-y-4">
            <Section
              title="E-Signature & QR Code"
              desc="Identitas pejabat penandatangan dan keamanan QR pada surat digital."
            >
              <Grid2>
                <Field label="Nama Penandatangan">
                  <div className="flex items-center gap-2">
                    <Input
                      value={s.signature.signer_name}
                      onChange={(e) => update("signature", { signer_name: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleAutoFillSignature}
                      disabled={sigAutofilling}
                      title="Autofill dari Perangkat Desa"
                      className="shrink-0 h-9 px-3 rounded-xl bg-primary/10 text-primary text-xs font-ui font-semibold hover:bg-primary/20 disabled:opacity-50 transition inline-flex items-center gap-1.5 border border-primary/20"
                    >
                      {sigAutofilling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      Isi Otomatis
                    </button>
                  </div>
                </Field>
                <Field label="Jabatan">
                  <Input
                    value={s.signature.signer_title}
                    onChange={(e) => update("signature", { signer_title: e.target.value })}
                  />
                </Field>
                <Field label="QR Secret (untuk verifikasi)">
                  <Input
                    type="password"
                    value={s.signature.qr_secret}
                    onChange={(e) => update("signature", { qr_secret: e.target.value })}
                  />
                </Field>
              </Grid2>
              <ToggleRow
                label="Wajib Sertakan QR Code"
                desc="Setiap surat yang disetujui akan disisipi QR untuk verifikasi keaslian."
                checked={s.signature.require_qr}
                onChange={(v) => update("signature", { require_qr: v })}
              />
            </Section>
          </TabsContent>

          <TabsContent value="surat" className="m-0 space-y-4">
            <Section
              title="Konfigurasi E-Surat"
              desc="Aturan penomoran, lampiran, dan arsip otomatis."
            >
              <Grid2>
                <Field label="Prefix Nomor Surat">
                  <Input
                    value={s.surat.prefix_no}
                    onChange={(e) => update("surat", { prefix_no: e.target.value })}
                  />
                </Field>
                <Field label="Nomor Urut Terakhir">
                  <Input
                    type="number"
                    min={0}
                    value={s.nomor.lastUrut ?? 0}
                    onChange={(e) => update("nomor", { lastUrut: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Maks. Ukuran Lampiran (MB)">
                  <Input
                    type="number"
                    min={1}
                    value={s.surat.max_file_mb}
                    onChange={(e) => update("surat", { max_file_mb: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Tahun Counter Berjalan">
                  <Input
                    type="number"
                    value={s.nomor.lastYear ?? new Date().getFullYear()}
                    onChange={(e) => update("nomor", { lastYear: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Auto-arsip setelah (hari)">
                  <Input
                    type="number"
                    min={1}
                    value={s.surat.auto_archive_days}
                    onChange={(e) => update("surat", { auto_archive_days: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Tipe File Diizinkan (pisah koma)">
                  <Input
                    value={s.surat.allowed_types.join(",")}
                    onChange={(e) =>
                      update("surat", {
                        allowed_types: e.target.value
                          .split(",")
                          .map((x) => x.trim().toLowerCase())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </Grid2>
              <ToggleRow
                label="Reset Penomoran Tiap Tahun"
                checked={s.surat.use_yearly_reset}
                onChange={(v) => update("surat", { use_yearly_reset: v })}
              />
              <ToggleRow
                label="Wajib Lampiran (KTP / KK)"
                checked={s.surat.require_attachment}
                onChange={(v) => update("surat", { require_attachment: v })}
              />
              <ToggleRow
                label="Auto-Arsip Surat Selesai"
                checked={s.surat.auto_archive}
                onChange={(v) => update("surat", { auto_archive: v })}
              />
            </Section>
          </TabsContent>

          <TabsContent value="security" className="m-0 space-y-4">
            <Section title="Keamanan Sistem" desc="Kebijakan login, sesi, dan audit.">
              <Grid2>
                <Field label="Timeout Sesi (menit)">
                  <Input
                    type="number"
                    min={5}
                    value={s.security.session_timeout_min}
                    onChange={(e) =>
                      update("security", { session_timeout_min: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Maks. Percobaan Login">
                  <Input
                    type="number"
                    min={3}
                    value={s.security.login_attempts}
                    onChange={(e) => update("security", { login_attempts: Number(e.target.value) })}
                  />
                </Field>
              </Grid2>
              <ToggleRow
                label="Wajib Password Kuat (≥8 karakter, huruf+angka)"
                checked={s.security.require_strong_password}
                onChange={(v) => update("security", { require_strong_password: v })}
              />
              <ToggleRow
                label="Aktifkan 2FA (Authenticator)"
                desc="Verifikasi dua langkah untuk semua akun admin."
                checked={s.security.enable_2fa}
                onChange={(v) => update("security", { enable_2fa: v })}
              />
              <ToggleRow
                label="Aktifkan Audit Log"
                checked={s.security.audit_log}
                onChange={(v) => update("security", { audit_log: v })}
              />

              <ChangePasswordCard />
            </Section>
          </TabsContent>

          <TabsContent value="users" className="m-0 space-y-4">
            <UsersPanel />
          </TabsContent>

          <TabsContent value="appearance" className="m-0 space-y-4">
            <Section title="Antarmuka Dashboard" desc="Tema dan tampilan dashboard admin.">
              <Field label="Tema">
                <Select
                  value={s.appearance.theme}
                  onValueChange={(v) =>
                    update("appearance", { theme: v as SystemSettings["appearance"]["theme"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Terang</SelectItem>
                    <SelectItem value="dark">Gelap</SelectItem>
                    <SelectItem value="system">Mengikuti Sistem</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <ToggleRow
                label="Sidebar Compact"
                checked={s.appearance.sidebar_compact}
                onChange={(v) => update("appearance", { sidebar_compact: v })}
              />
              <ToggleRow
                label="Tampilkan Banner Pengumuman di Beranda"
                checked={s.appearance.show_announcement_bar}
                onChange={(v) => update("appearance", { show_announcement_bar: v })}
              />
              <Field label="Teks Pengumuman">
                <Textarea
                  rows={2}
                  value={s.appearance.announcement_text}
                  onChange={(e) => update("appearance", { announcement_text: e.target.value })}
                />
              </Field>
            </Section>
          </TabsContent>

          <TabsContent value="backup" className="m-0 space-y-4">
            <BackupPanel />
          </TabsContent>

          <TabsContent value="audit" className="m-0 space-y-4">
            <AuditPanel />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Reset Confirmation Dialog ── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reset Semua Pengaturan
            </DialogTitle>
            <DialogDescription>
              Semua pengaturan sistem akan dikembalikan ke nilai default. Perubahan yang belum
              disimpan akan hilang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Reset Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Sub-panels ---------- */

function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState<AdminUser>({
    id: "",
    username: "",
    password: "",
    name: "",
    email: "",
    role: "Operator",
  });
  const [confirmTarget, setConfirmTarget] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const refresh = () => setUsers(listUsers());
  useEffect(refresh, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.name) {
      toast.error("Username, nama, dan password wajib diisi");
      return;
    }
    if (form.username.toLowerCase() === FIXED_ADMIN.username) {
      toast.error("Username 'admindesa' dicadangkan untuk akun tetap");
      return;
    }
    const id = form.id || `u_${Date.now()}`;
    saveUser({ ...form, id });
    logAudit(
      getSession()?.username ?? "system",
      form.id ? "Update User" : "Create User",
      form.username,
    );
    toast.success(form.id ? "Pengguna diperbarui" : "Pengguna ditambahkan");
    setForm({ id: "", username: "", password: "", name: "", email: "", role: "Operator" });
    refresh();
  };

  const edit = (u: AdminUser) => {
    if (u.fixed) {
      toast.info("Akun tetap tidak dapat diedit");
      return;
    }
    setForm(u);
  };
  const remove = (u: AdminUser) => {
    if (u.fixed) {
      toast.error("Akun tetap tidak dapat dihapus");
      return;
    }
    setConfirmTarget({
      message: `Hapus pengguna "${u.username}"? Tindakan ini tidak dapat dibatalkan.`,
      action: () => {
        deleteUser(u.id);
        refresh();
        logAudit(getSession()?.username ?? "system", "Delete User", u.username);
        toast.success("Pengguna dihapus");
      },
    });
  };

  return (
    <Section
      title="Manajemen Pengguna Admin"
      desc="Kelola operator desa, verifikator, dan kepala desa. Akun 'admindesa' adalah akun tetap dan tidak dapat dihapus."
    >
      <form onSubmit={submit} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="font-ui text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> {form.id ? "Edit Pengguna" : "Tambah Pengguna Baru"}
        </p>
        <Grid2>
          <Field label="Nama Lengkap">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!form.id}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as AdminRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Verifikator">Verifikator</SelectItem>
                <SelectItem value="Kepala Desa">Kepala Desa</SelectItem>
                <SelectItem value="Super Admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
        </Grid2>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary"
          >
            <Save className="h-4 w-4 mr-1.5" /> {form.id ? "Simpan Perubahan" : "Tambah Pengguna"}
          </Button>
          {form.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm({
                  id: "",
                  username: "",
                  password: "",
                  name: "",
                  email: "",
                  role: "Operator",
                })
              }
            >
              Batal
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-ui font-semibold">Username</th>
              <th className="px-3 py-2 font-ui font-semibold">Nama</th>
              <th className="px-3 py-2 font-ui font-semibold">Role</th>
              <th className="px-3 py-2 font-ui font-semibold">Status</th>
              <th className="px-3 py-2 font-ui font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {u.fixed ? (
                    <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                      Akun Tetap
                    </span>
                  ) : (
                    <span className="text-[11px] font-ui text-muted-foreground">Aktif</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => edit(u)} disabled={!!u.fixed}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(u)}
                    disabled={!!u.fixed}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Confirm Delete User ── */}
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
    </Section>
  );
}

function ChangePasswordCard() {
  const [oldPwd, setOld] = useState("");
  const [newPwd, setNew] = useState("");
  const [conf, setConf] = useState("");
  const session = getSession();
  const isFixed = session?.username === FIXED_ADMIN.username;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== conf) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    const r = await changePassword(oldPwd, newPwd);
    if (r.ok) {
      toast.success(r.message);
    } else {
      toast.error(r.message);
    }
    if (r.ok) {
      setOld("");
      setNew("");
      setConf("");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <p className="font-ui text-sm font-semibold flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> Ubah Password Akun Anda
      </p>
      {isFixed ? (
        <p className="font-body text-xs text-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          Akun <strong>admindesa</strong> adalah akun tetap — password tidak dapat diubah melalui
          panel ini.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Grid2>
            <Field label="Password Lama">
              <Input type="password" value={oldPwd} onChange={(e) => setOld(e.target.value)} />
            </Field>
            <Field label="Password Baru">
              <Input type="password" value={newPwd} onChange={(e) => setNew(e.target.value)} />
            </Field>
          </Grid2>
          <Field label="Konfirmasi Password Baru">
            <Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} />
          </Field>
          <Button type="submit" size="sm">
            Update Password
          </Button>
        </form>
      )}
    </div>
  );
}

function BackupPanel() {
  const [confirmTarget, setConfirmTarget] = useState<{
    message: string;
    action: () => void;
  } | null>(null);

  const doExport = async () => {
    const json = await exportFullBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-desa-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup diunduh");
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await importFullBackup(String(reader.result));
      if (r.ok) {
        toast.success(r.message);
      } else {
        toast.error(r.message);
      }
      if (r.ok) setTimeout(() => window.location.reload(), 800);
    };
    reader.readAsText(file);
  };

  const doClear = () => {
    setConfirmTarget({
      message:
        "Hapus SEMUA data surat, arsip, dan penduduk? Tindakan ini tidak dapat dibatalkan dan akan memerlukan reload halaman.",
      action: () => {
        clearAllData();
        toast.success("Data dibersihkan");
        setTimeout(() => window.location.reload(), 600);
      },
    });
  };

  return (
    <Section
      title="Backup & Restore"
      desc="Cadangkan seluruh data sistem (surat, arsip, penduduk, pengguna, pengaturan) atau pulihkan dari file backup."
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={doExport}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:shadow-card transition"
        >
          <Download className="h-6 w-6 text-primary mb-2" />
          <p className="font-display font-bold">Export Backup</p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Unduh seluruh data sebagai file JSON.
          </p>
        </button>

        <label className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:shadow-card transition cursor-pointer">
          <Upload className="h-6 w-6 text-info mb-2" />
          <p className="font-display font-bold">Import Backup</p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Pulihkan data dari file backup JSON.
          </p>
          <input
            type="file"
            accept=".json"
            hidden
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </label>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="font-display font-bold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Zona Berbahaya
        </p>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Hapus semua data surat, arsip, dan penduduk. Akun pengguna dan pengaturan tetap
          dipertahankan.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={doClear}>
          <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Semua Data
        </Button>
      </div>

      {/* ── Confirm Clear All Data ── */}
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
                Ya, Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function AuditPanel() {
  type AuditItem = Awaited<ReturnType<typeof listAudit>>[number];
  const [items, setItems] = useState<AuditItem[]>([]);
  const refresh = () => {
    listAudit().then(setItems).catch(console.warn);
  };
  useEffect(refresh, []);
  const recent = useMemo(() => items.slice(0, 100), [items]);

  return (
    <Section title="Audit Log" desc="Riwayat aktivitas admin (100 entri terbaru).">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={refresh}>
          Muat Ulang
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearAudit();
            refresh();
            toast.success("Log dibersihkan");
          }}
        >
          <Trash2 className="h-4 w-4 mr-1.5" /> Bersihkan
        </Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left sticky top-0">
            <tr>
              <th className="px-3 py-2 font-ui font-semibold">Waktu</th>
              <th className="px-3 py-2 font-ui font-semibold">Pengguna</th>
              <th className="px-3 py-2 font-ui font-semibold">Aksi</th>
              <th className="px-3 py-2 font-ui font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada log.
                </td>
              </tr>
            ) : (
              recent.map(
                (a: { ts: string; user: string; action: string; detail?: string }, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.ts).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{a.user}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.detail ?? "-"}</td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
