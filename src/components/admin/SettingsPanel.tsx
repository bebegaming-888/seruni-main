import React, { useEffect, useMemo, useRef, useState } from "react";
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

const SECTIONS = [
  { key: "wilayah", label: "Wilayah", icon: MapPin },
  { key: "village", label: "Profil Desa", icon: Building2 },
  { key: "hero", label: "Hero Landing", icon: Image },
  { key: "perangkat", label: "Perangkat Desa", icon: Users2 },
  { key: "lembaga", label: "Lembaga Desa", icon: Building2 },
  { key: "branding", label: "Tampilan & Brand", icon: Palette },
  { key: "cms", label: "Profil Publik (CMS)", icon: Megaphone },
  { key: "social", label: "Media Sosial", icon: Share2 },
  { key: "kopSurat", label: "Kop Surat", icon: LayoutTemplate },
  { key: "pdfLayout", label: "Blanko Surat (PDF)", icon: FileText },
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

  // Autofill state
  const [autofilling, setAutofilling] = useState(false);

  // Autofill village identity from perangkat_desa aktif
  const handleAutoFillVillage = async () => {
    setAutofilling(true);
    try {
      await initPerangkatStore();
      const strukturs = listStrukturAktif();

      const kepalaDesa = strukturs.find((st) => st.nama_jabatan.toLowerCase().includes("kepala"));
      const sekdes = strukturs.find((st) => st.nama_jabatan.toLowerCase().includes("sekretaris"));

      let filled = false;

      if (kepalaDesa) {
        const person = getPerangkatByStrukturId(kepalaDesa.id).find((p) => p.status_aktif);
        if (person) {
          update("village", { head: person.nama });
          filled = true;
        }
      }

      if (sekdes) {
        const person = getPerangkatByStrukturId(sekdes.id).find((p) => p.status_aktif);
        if (person) {
          update("village", { secretary: person.nama });
          filled = true;
        }
      }

      if (filled) {
        toast.success("Profil Desa autofill berhasil", {
          description: "Nama Kepala Desa dan Sekretaris Desa telah diisi dari data Perangkat Desa.",
        });
      } else {
        toast.warning("Tidak ada Perangkat Desa aktif", {
          description:
            "Pastikan struktur jabatan Kepala Desa dan Sekretaris Desa sudah diisi di menu Perangkat Desa.",
        });
      }
    } finally {
      setAutofilling(false);
    }
  };

  // Autofill signature signer from aktif pemimpin
  const handleAutoFillSignature = async () => {
    setAutofilling(true);
    try {
      await initPerangkatStore();
      const strukturs = listStrukturAktif();

      // Cari struktur dengan kategori Pimpinan yang aktif
      const pimpinan = strukturs.find((st) => st.kategori === "Pimpinan" && st.status === "Aktif");

      if (pimpinan) {
        const person = getPerangkatByStrukturId(pimpinan.id).find((p) => p.status_aktif);
        if (person) {
          update("signature", {
            signer_name: person.nama,
            signer_title: pimpinan.nama_jabatan,
          });
          toast.success("Penandatangan autofill berhasil", {
            description: `Nama: ${person.nama}, Jabatan: ${pimpinan.nama_jabatan}`,
          });
          return;
        }
      }

      toast.warning("Tidak ada Pimpinan aktif", {
        description:
          "Pastikan jabatan dengan kategori 'Pimpinan' sudah terisi di menu Perangkat Desa.",
      });
    } finally {
      setAutofilling(false);
    }
  };

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
  }, [storeSettings, dirty]);

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
  }, [dirty]);

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
  const update = <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => {
    setS((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
    setDirty(true);
    setSaveStatus("idle");
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
      // Reset status after 3s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("[SettingsPanel] Gagal menyimpan:", err);
      setSaveStatus("error");
      toast.error("Gagal menyimpan pengaturan", {
        description:
          "Pastikan koneksi internet stabil dan coba lagi. Hubungi administrator jika masalah berlanjut.",
      });
      setTimeout(() => setSaveStatus("idle"), 5000);
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
      <div className="rounded-2xl border-2 border-[#EEAA78] bg-[#EEAA78]/10 dark:bg-[#EEAA78]/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-[#E37222] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-base font-bold text-[#1a1918] dark:text-[#f0efe9]">
              Data berubah di tab lain
            </h3>
            <p className="font-body text-sm text-[#5c5a56] dark:text-[#a8a49c] mt-1">
              Ada perubahan settings dari tab browser lain. Perubahan lokal Anda tidak hilang —
              pilih aksi yang ingin dilakukan.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 ml-9">
          <Button
            size="sm"
            variant="outline"
            className="border-[#EEAA78] text-[#1a1918] hover:bg-[#EEAA78]/20"
            onClick={handleKeepLocal}
          >
            Simpan Perubahan Lokal Saya
          </Button>
          <Button
            size="sm"
            className="bg-[#078898] hover:bg-[#078898]/80 text-white"
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
            className="bg-primary text-primary-foreground hover:bg-primary-hover min-w-[140px]"
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

          <TabsContent value="kopSurat" className="m-0 space-y-4">
            <KopSuratSettings s={s} update={update} />
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
                <Field label="Nama Pengirim">
                  <Input
                    value={s.notifications.sender_name}
                    onChange={(e) => update("notifications", { sender_name: e.target.value })}
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
                onClick={() => toast.success("Tes pesan terkirim (mock). Cek konsol browser.")}
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
                <Field label="Inisial Jabatan">
                  <Input
                    placeholder="KDS"
                    value={s.nomor.inisialJabatan}
                    onChange={(e) => update("nomor", { inisialJabatan: e.target.value })}
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
                <Field label="Inisial Desa">
                  <Input
                    placeholder="SRMB"
                    value={s.nomor.inisialDesa}
                    onChange={(e) => update("nomor", { inisialDesa: e.target.value })}
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

          <TabsContent value="pdfLayout" className="m-0 space-y-4">
            <Section
              title="Pengaturan Blanko Surat (PDF)"
              desc="Atur margin kertas, font (Arial), ukuran teks, dan posisi tanda tangan. Semua bagian BODY menggunakan Arial 11pt."
            >
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="font-ui text-xs font-bold text-foreground uppercase tracking-wider">
                  📐 Margin Kertas
                </p>
                <Grid2>
                  <Field label="Margin Atas">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.margin.top || "20mm"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          margin: {
                            ...(s.pdfLayout?.margin || {}),
                            top: e.target.value,
                          } as PdfLayoutMargin,
                        })
                      }
                    >
                      {["15mm", "18mm", "20mm", "22mm", "25mm", "28mm", "30mm"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Margin Bawah">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.margin.bottom || "20mm"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          margin: {
                            ...(s.pdfLayout?.margin || {}),
                            bottom: e.target.value,
                          } as PdfLayoutMargin,
                        })
                      }
                    >
                      {["15mm", "18mm", "20mm", "22mm", "25mm", "28mm", "30mm"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Margin Kiri">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.margin.left || "25mm"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          margin: {
                            ...(s.pdfLayout?.margin || {}),
                            left: e.target.value,
                          } as PdfLayoutMargin,
                        })
                      }
                    >
                      {["15mm", "18mm", "20mm", "22mm", "25mm", "28mm", "30mm"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Margin Kanan">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.margin.right || "20mm"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          margin: {
                            ...(s.pdfLayout?.margin || {}),
                            right: e.target.value,
                          } as PdfLayoutMargin,
                        })
                      }
                    >
                      {["15mm", "18mm", "20mm", "22mm", "25mm", "28mm", "30mm"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </Grid2>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="font-ui text-xs font-bold text-foreground uppercase tracking-wider">
                  🔤 Font & Ukuran (Body — Arial 11pt)
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-info/10 border border-info/20 px-3 py-2">
                  <svg
                    className="h-4 w-4 text-info shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="font-body text-xs text-info">
                    <strong>Font body terkunci ke Arial.</strong> Ukuran font untuk Kop Surat diatur
                    di bagian "Kop Surat" di atas.
                  </p>
                </div>
                <Grid2>
                  <Field label="Font Family (Body)">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.font.family || "Arial, sans-serif"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          font: {
                            ...(s.pdfLayout?.font || {}),
                            family: e.target.value,
                          } as PdfLayoutFont,
                        })
                      }
                    >
                      <option value="Arial, sans-serif">Arial (Sans-Serif) — Default</option>
                    </select>
                  </Field>
                  <Field label="Ukuran Font Body">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.font.size || "11pt"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          font: {
                            ...(s.pdfLayout?.font || {}),
                            size: e.target.value,
                          } as PdfLayoutFont,
                        })
                      }
                    >
                      <option value="10pt">10pt (Kecil)</option>
                      <option value="11pt">11pt (Normal) — Default</option>
                      <option value="12pt">12pt (Sedang)</option>
                      <option value="13pt">13pt (Besar)</option>
                      <option value="14pt">14pt (Sangat Besar)</option>
                    </select>
                  </Field>
                  <Field label="Line Height">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.font.lineHeight || "1.5"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          font: {
                            ...(s.pdfLayout?.font || {}),
                            lineHeight: e.target.value,
                          } as PdfLayoutFont,
                        })
                      }
                    >
                      <option value="1.0">1.0 (Padat)</option>
                      <option value="1.2">1.2 (Normal)</option>
                      <option value="1.5">1.5 (Sedang) — Default</option>
                      <option value="1.8">1.8 (Luas)</option>
                      <option value="2.0">2.0 (Sangat Luas)</option>
                    </select>
                  </Field>
                  <Field label="Font Body (Sistem)">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.body_font || "Arial, sans-serif"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          body_font: e.target.value,
                          body_font_size: s.pdfLayout?.body_font_size ?? 11,
                        } as PdfLayoutPatch)
                      }
                    >
                      <option value="Arial, sans-serif">Arial — Default</option>
                    </select>
                  </Field>
                </Grid2>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="font-ui text-xs font-bold text-foreground uppercase tracking-wider">
                  🔳 QR Code & Tanda Tangan
                </p>
                <Grid2>
                  <Field label="Lebar QR Code">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.signaturePos.qrWidth || "80px"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          signaturePos: {
                            ...(s.pdfLayout?.signaturePos || {}),
                            qrWidth: e.target.value,
                          } as PdfLayoutSig,
                        })
                      }
                    >
                      {["50px", "60px", "70px", "80px", "90px", "100px", "120px"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Jarak Vertikal TTD">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={s.pdfLayout?.signaturePos.marginY || "1rem"}
                      onChange={(e) =>
                        update("pdfLayout", {
                          signaturePos: {
                            ...(s.pdfLayout?.signaturePos || {}),
                            marginY: e.target.value,
                          } as PdfLayoutSig,
                        })
                      }
                    >
                      {["0.5rem", "1rem", "1.5rem", "2rem", "2.5rem", "3rem"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </Grid2>
              </div>

              <div className="mt-4 p-4 border border-border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MonitorCog className="h-4 w-4" /> Preview Live (Konfigurasi CSS)
                </p>
                <pre className="text-xs text-muted-foreground p-3 bg-card rounded border overflow-x-auto whitespace-pre-wrap">
                  {`@media print {
  @page {
    margin: ${s.pdfLayout?.margin.top || "20mm"} ${s.pdfLayout?.margin.right || "20mm"} ${s.pdfLayout?.margin.bottom || "20mm"} ${s.pdfLayout?.margin.left || "25mm"};
  }
}

.pdf-print-container {
  font-family: ${s.pdfLayout?.font.family || "Arial, sans-serif"};
  font-size: ${s.pdfLayout?.font.size || "11pt"};
  line-height: ${s.pdfLayout?.font.lineHeight || "1.5"};
}

.signature-qr {
  width: ${s.pdfLayout?.signaturePos.qrWidth || "80px"};
  margin-top: ${s.pdfLayout?.signaturePos.marginY || "1rem"};
  margin-bottom: ${s.pdfLayout?.signaturePos.marginY || "1rem"};
}`}
                </pre>
              </div>
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
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
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

/* ---------- Tiny UI helpers ---------- */
function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {desc && <p className="font-body text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  compact,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
    >
      <div>
        <p className="font-ui text-sm font-semibold">{label}</p>
        {desc && <p className="font-body text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ---------- Video upload helper (Perangkat + URL) ---------- */
function VideoUploadField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Hanya file video yang diizinkan");
      return;
    }
    // Check max size 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Ukuran video maksimal 50MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setVideoError(false);
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Masukkan URL video terlebih dahulu");
      return;
    }
    setVideoError(false);
    onChange(trimmed);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const handleUrlBlur = () => {
    if (urlInput.trim()) handleUrlSubmit();
  };

  const isDataUrl = value.startsWith("data:");
  const videoSrc = videoError ? "" : value;

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <svg
            className="h-4 w-4 mr-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Perangkat
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.webm,.mov,.avi"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          variant={showUrlInput ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowUrlInput((v) => !v);
            if (!showUrlInput && value && value.startsWith("http")) {
              setUrlInput(value);
            }
          }}
        >
          <svg
            className="h-4 w-4 mr-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          URL
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setVideoError(false);
              setUrlInput("");
            }}
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        )}
      </div>

      {/* URL input panel */}
      {showUrlInput && (
        <div className="flex gap-2 items-center">
          <Input
            placeholder="https://example.com/video.mp4"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            onBlur={handleUrlBlur}
            className="flex-1"
          />
          <Button type="button" size="sm" variant="default" onClick={handleUrlSubmit}>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}

      {/* Error state */}
      {videoError && value && (
        <p className="font-body text-[11px] text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gagal memuat video dari URL ini. Coba URL lain atau upload dari perangkat.
        </p>
      )}

      {/* Preview */}
      {videoSrc && !videoError && (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
          <video
            src={videoSrc}
            className="w-full h-36 object-cover"
            controls
            onError={() => setVideoError(true)}
          />
          <span
            className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${isDataUrl ? "bg-success/90" : "bg-info/90"}`}
          >
            {isDataUrl ? "Perangkat" : "URL"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Image upload helper — Supabase Storage + optional storage_path ---------- */
function ImageUploadField({
  label,
  hint,
  value,
  storagePath,
  onChange,
  onStoragePathChange,
}: {
  label: string;
  hint?: string;
  value: string;
  storagePath?: string;
  onChange: (v: string) => void;
  onStoragePathChange?: (path: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan");
      return;
    }
    setUploading(true);
    setImgError(false);
    try {
      const { uploadMedia } = await import("@/lib/media-upload");
      const folder = label.toLowerCase().includes("logo")
        ? "logos"
        : label.toLowerCase().includes("slide")
          ? "hero"
          : label.toLowerCase().includes("cover")
            ? "covers"
            : "media";
      const result = await uploadMedia(file, folder, "public-media");
      if (result.ok) {
        onChange(result.publicUrl);
        if (onStoragePathChange && result.storagePath) {
          onStoragePathChange(result.storagePath);
        }
        toast.success("Gambar berhasil diupload");
      } else {
        toast.error(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const isDataUrl = value.startsWith("data:");

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
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
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
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
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setImgError(false);
            }}
            className="rounded-xl"
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        )}
      </div>

      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}

      {/* Error state */}
      {imgError && value && (
        <p className="font-body text-[11px] text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gagal memuat gambar. Coba upload ulang.
        </p>
      )}

      {/* Preview */}
      {value && !imgError && (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
          <img
            src={value}
            alt={label}
            className="h-36 w-full object-cover"
            onError={() => setImgError(true)}
          />
          <span className="absolute top-1 right-1 bg-success/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {isDataUrl ? "Lokal" : "Storage"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Hero Settings ---------- */

/* ---------- Kop Surat Settings ---------- */
function KopSuratSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const kopLines = s.kopSurat.kop_lines ?? [];

  const updateKopLine = (id: string, patch: Partial<(typeof kopLines)[0]>) => {
    update("kopSurat", {
      kop_lines: kopLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addKopLine = () => {
    update("kopSurat", {
      kop_lines: [
        ...kopLines,
        {
          id: `k${Date.now()}`,
          label: `Baris ${kopLines.length + 1}`,
          text: "",
          font_size: 11,
          bold: false,
          italic: false,
        },
      ],
    });
  };

  return (
    <>
      {/* Dual Logo Upload */}
      <Section title="Logo Kop Surat" desc="Logo Kabupaten (kiri) dan Logo Desa (kanan).">
        <div className="grid sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="Logo Kabupaten (Kiri)"
            hint="PNG transparan, maks 500KB"
            value={s.kopSurat.logo_kab_url}
            storagePath={s.kopSurat.logo_kab_storage_path}
            onChange={(v) => update("kopSurat", { logo_kab_url: v })}
            onStoragePathChange={(path) => update("kopSurat", { logo_kab_storage_path: path })}
          />
          <ImageUploadField
            label="Logo Desa (Kanan)"
            hint="PNG transparan, maks 500KB"
            value={s.kopSurat.logo_desa_url}
            storagePath={s.kopSurat.logo_desa_storage_path}
            onChange={(v) => update("kopSurat", { logo_desa_url: v })}
            onStoragePathChange={(path) => update("kopSurat", { logo_desa_storage_path: path })}
          />
        </div>
        <Field label="Tata Letak Logo">
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={s.kopSurat.logo_position}
            onChange={(e) =>
              update("kopSurat", {
                logo_position: e.target.value as SystemSettings["kopSurat"]["logo_position"],
              })
            }
          >
            <option value="separate">Terpisah (Kabupaten Kiri · Desa Kanan)</option>
            <option value="left">Logo Kabupaten Saja (Kiri)</option>
            <option value="center">Logo Desa Saja (Tengah)</option>
            <option value="right">Logo Desa Saja (Kanan)</option>
          </select>
        </Field>
      </Section>

      {/* Per-Line Font Settings */}
      <Section
        title="Baris Teks Kop Surat"
        desc="Atur teks, ukuran font, bold, dan italic untuk setiap baris."
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-ui text-[11px] text-muted-foreground">
            5 baris default: Nama Desa, Alamat, Telepon, Website, Email.
          </p>
          <button
            type="button"
            onClick={async () => {
              await initPerangkatStore();
              const strukturs = listStrukturAktif();
              const villageData = s.village;
              const existing = kopLines.length;
              const autoLines = [
                { label: "Nama Desa", text: villageData.name },
                {
                  label: "Alamat",
                  text: [villageData.address, villageData.district, villageData.regency]
                    .filter(Boolean)
                    .join(", "),
                },
                {
                  label: "Telepon / WhatsApp",
                  text: villageData.phone
                    ? `Telp. ${villageData.phone}${villageData.whatsapp ? ` / WA ${villageData.whatsapp}` : ""}`
                    : "",
                },
                { label: "Website", text: s.social?.website ?? "" },
                { label: "Email Resmi", text: villageData.email },
              ];
              if (existing === 0) {
                update("kopSurat", {
                  kop_lines: autoLines.map((l, i) => ({
                    id: `k${Date.now() + i}`,
                    label: l.label,
                    text: l.text,
                    font_size: l.label === "Nama Desa" ? 13 : 10,
                    bold: l.label === "Nama Desa",
                    italic: false,
                  })),
                });
                toast.success("Kop Surat autofill berhasil", {
                  description: "5 baris kop surat telah diisi otomatis dari data Profil Desa.",
                });
              } else {
                toast.info("Kop Surat sudah terisi", {
                  description: "Hapus baris yang ada terlebih dahulu sebelum autofill.",
                });
              }
            }}
            className="shrink-0 h-8 px-3 rounded-lg bg-info/10 text-info text-xs font-ui font-semibold hover:bg-info/20 transition inline-flex items-center gap-1.5 border border-info/20"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Isi Otomatis
          </button>
        </div>
        <div className="space-y-3">
          {kopLines.map((line, i) => (
            <div
              key={line.id}
              className="rounded-xl border border-border bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-bold text-foreground">{line.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    update("kopSurat", {
                      kop_lines: kopLines.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-destructive hover:bg-destructive/10 h-7 w-7 rounded-md flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={line.text}
                onChange={(e) => updateKopLine(line.id, { text: e.target.value })}
                placeholder={`Teks untuk ${line.label}…`}
                className="text-sm"
              />
              <div className="grid grid-cols-4 gap-2">
                <Field label="Ukuran">
                  <select
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none"
                    value={line.font_size}
                    onChange={(e) => updateKopLine(line.id, { font_size: Number(e.target.value) })}
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}pt
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Bold">
                  <select
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none"
                    value={line.bold ? "true" : "false"}
                    onChange={(e) => updateKopLine(line.id, { bold: e.target.value === "true" })}
                  >
                    <option value="true">Ya — Bold</option>
                    <option value="false">Tidak — Normal</option>
                  </select>
                </Field>
                <Field label="Italic">
                  <select
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none"
                    value={line.italic ? "true" : "false"}
                    onChange={(e) => updateKopLine(line.id, { italic: e.target.value === "true" })}
                  >
                    <option value="true">Ya — Italic</option>
                    <option value="false">Tidak — Normal</option>
                  </select>
                </Field>
                <Field label="Label Baris">
                  <Input
                    value={line.label}
                    onChange={(e) => updateKopLine(line.id, { label: e.target.value })}
                    placeholder="Nama baris…"
                    className="text-xs h-8"
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addKopLine}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
          </Button>
        </div>
      </Section>

      {/* Warna & Footer */}
      <Section title="Warna & Footer" desc="Pengaturan visual dan footer kop surat.">
        <Field label="Warna Bar Header">
          <div className="flex gap-2">
            <input
              type="color"
              value={s.kopSurat.header_bar_color}
              onChange={(e) => update("kopSurat", { header_bar_color: e.target.value })}
              className="h-10 w-14 rounded border border-border bg-card cursor-pointer"
            />
            <Input
              value={s.kopSurat.header_bar_color}
              onChange={(e) => update("kopSurat", { header_bar_color: e.target.value })}
            />
          </div>
        </Field>
        <ToggleRow
          label="Aktifkan Footer"
          checked={s.kopSurat.footer_enabled}
          onChange={(v) => update("kopSurat", { footer_enabled: v })}
        />
        <Field label="Teks Footer" hint="Muncul di bagian bawah setiap surat">
          <Textarea
            rows={2}
            value={s.kopSurat.footer_text}
            onChange={(e) => update("kopSurat", { footer_text: e.target.value })}
          />
        </Field>
        <Field label="Style Tanda Tangan">
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={s.kopSurat.signature_style}
            onChange={(e) =>
              update("kopSurat", {
                signature_style: e.target.value as SystemSettings["kopSurat"]["signature_style"],
              })
            }
          >
            <option value="text">Teks (Nama + Jabatan)</option>
            <option value="image">Gambar Spesimen TTD</option>
          </select>
        </Field>
        <ImageUploadField
          label="Gambar Spesimen TTD"
          hint="Jika style TTD = Gambar, gambar ini dipakai"
          value={s.signature.sign_image_url}
          storagePath={s.signature.sign_image_storage_path}
          onChange={(v) => update("signature", { sign_image_url: v })}
          onStoragePathChange={(path) => update("signature", { sign_image_storage_path: path })}
        />
      </Section>

      {/* Preview Kop Surat */}
      <Section title="Preview Kop Surat" desc="Pratinjau kop surat sesuai pengaturan.">
        <div className="rounded-xl border border-border overflow-hidden bg-white font-ui">
          {/* Bar header */}
          <div className="h-2 w-full" style={{ backgroundColor: s.kopSurat.header_bar_color }} />
          <div className="flex items-center gap-3 p-4">
            {/* Logo Kabupaten (kiri) */}
            {s.kopSurat.logo_kab_url &&
              (s.kopSurat.logo_position === "separate" || s.kopSurat.logo_position === "left") && (
                <img
                  src={s.kopSurat.logo_kab_url}
                  alt="Logo Kabupaten"
                  className="h-16 w-auto object-contain"
                />
              )}
            {/* Logo Desa (kanan) */}
            {s.kopSurat.logo_desa_url &&
              (s.kopSurat.logo_position === "separate" ||
                s.kopSurat.logo_position === "right" ||
                s.kopSurat.logo_position === "center") && (
                <img
                  src={s.kopSurat.logo_desa_url}
                  alt="Logo Desa"
                  className={`h-16 w-auto object-contain ${
                    s.kopSurat.logo_position === "right"
                      ? "ml-auto"
                      : s.kopSurat.logo_position === "center"
                        ? "mx-auto"
                        : ""
                  }`}
                />
              )}
            {/* Teks baris kop */}
            <div className="flex-1 text-center space-y-0.5">
              {kopLines.map((line) => (
                <p
                  key={line.id}
                  style={{
                    fontSize: `${line.font_size}pt`,
                    fontWeight: line.bold ? "bold" : "normal",
                    fontStyle: line.italic ? "italic" : "normal",
                    fontFamily: "Arial, sans-serif",
                    lineHeight: 1.3,
                  }}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
          <div className="border-t border-border mt-1" />
        </div>
      </Section>
    </>
  );
}

/* ---------- Pages CMS ---------- */
const PAGE_GROUPS = [
  {
    group: "Profil",
    pages: [
      { path: "/profil/desa", label: "Profil Desa" },
      { path: "/profil/perangkat", label: "Perangkat Desa" },
      { path: "/profil/lembaga", label: "Lembaga Desa" },
      { path: "/profil/bpd", label: "BPD" },
      { path: "/profil/lpm", label: "LPM" },
      { path: "/profil/karangtaruna", label: "Karang Taruna" },
      { path: "/profil/pkkrw", label: "PKK & KWT" },
    ],
  },
  {
    group: "Informasi",
    pages: [
      { path: "/informasi/berita", label: "Berita" },
      { path: "/informasi/agenda", label: "Agenda" },
      { path: "/informasi/galeri", label: "Galeri" },
      { path: "/informasi/idm", label: "IDM" },
      { path: "/informasi/pengumuman", label: "Pengumuman" },
    ],
  },
  {
    group: "Pelayanan",
    pages: [
      { path: "/pelayanan/pengaduan", label: "Pengaduan" },
      { path: "/pelayanan/konsultasi", label: "Konsultasi" },
      { path: "/pelayanan/penduduk", label: "Statistik Penduduk" },
    ],
  },
  {
    group: "Laporan",
    pages: [
      { path: "/laporan/apbdes", label: "APBDes" },
      { path: "/laporan/realisasi", label: "Realisasi" },
    ],
  },
  {
    group: "Ekonomi",
    pages: [{ path: "/ekonomi/bumdes", label: "BUMDes" }],
  },
  {
    group: "Lainnya",
    pages: [
      { path: "/lainnya/peta", label: "Peta Interaktif" },
      { path: "/lainnya/produk-hukum", label: "Produk Hukum" },
      { path: "/lainnya/monografi", label: "Monografi" },
      { path: "/lainnya/komoditas", label: "Komoditas" },
    ],
  },
];

function PagesCMS({
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
                  value={pageConfig.image_url}
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

/* ---------- CMS Content Settings ---------- */
function CMSContentSettings({
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

/* ---------- Social Media Settings ---------- */
function SocialMediaSettings({
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
              <Facebook className="h-4 w-4 text-[#1877F2]" />
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
              <Instagram className="h-4 w-4 text-[#E4405F]" />
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
              <Youtube className="h-4 w-4 text-[#FF0000]" />
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
              <Twitter className="h-4 w-4 text-[#1a1918]" />
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

// ── Push Notification Panel ─────────────────────────────────────────────────

function PushNotificationPanel() {
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
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          disabled={loading}
          onClick={handleDeactivate}
        >
          <BellOff className="h-4 w-4 mr-1.5" />
          Nonaktifkan Notifikasi
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary/10"
          disabled={loading}
          onClick={handleActivate}
        >
          <Bell className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Mengaktifkan..." : "Aktifkan Notifikasi Browser"}
        </Button>
      )}

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="font-ui text-xs font-semibold text-foreground mb-1.5">Setup VAPID Key</p>
        <p className="font-ui text-xs text-muted-foreground leading-relaxed">
          Untuk mengaktifkan push notification, Anda perlu:
        </p>
        <ol className="mt-2 space-y-1 pl-4 font-ui text-[11px] text-muted-foreground list-decimal list-inside">
          <li>
            Generate VAPID keys:
            <code className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              npx web-push generate-vapid-keys
            </code>
          </li>
          <li>
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              VITE_VAPID_PUBLIC_KEY
            </code>{" "}
            di file <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env</code>
          </li>
          <li>
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              VAPID_PRIVATE_KEY
            </code>{" "}
            sebagai secret di Netlify (Site → Environment Variables → Production)
          </li>
        </ol>
      </div>

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

      {/* ── VAPID Key Instructions Panel ── */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="font-ui text-xs font-semibold text-foreground mb-1.5">Setup VAPID Key</p>
        <p className="font-ui text-xs text-muted-foreground leading-relaxed">
          Untuk mengaktifkan push notification, Anda perlu:
        </p>
        <ol className="mt-2 space-y-1 pl-4 font-ui text-[11px] text-muted-foreground list-decimal list-inside">
          <li>
            Generate VAPID keys:
            <code className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              npx web-push generate-vapid-keys
            </code>
          </li>
          <li>
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              VITE_VAPID_PUBLIC_KEY
            </code>{" "}
            di file <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env</code>
          </li>
          <li>
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              VAPID_PRIVATE_KEY
            </code>{" "}
            sebagai secret di Netlify (Site → Environment Variables → Production)
          </li>
        </ol>
      </div>
    </div>
  );
}
