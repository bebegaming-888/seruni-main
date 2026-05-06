import React, { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Plus,
  KeyRound,
  AlertTriangle,
  Image,
  LayoutTemplate,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSettings,
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

const SECTIONS = [
  { key: "village", label: "Profil Desa", icon: Building2 },
  { key: "branding", label: "Tampilan & Brand", icon: Palette },
  { key: "hero", label: "Hero Landing", icon: Image },
  { key: "kopSurat", label: "Kop Surat", icon: LayoutTemplate },
  { key: "pages", label: "Konten Halaman", icon: BookOpen },
  { key: "notifications", label: "Notifikasi WA", icon: BellRing },
  { key: "signature", label: "E-Signature", icon: FileSignature },
  { key: "surat", label: "Konfigurasi Surat", icon: FileText },
  { key: "security", label: "Keamanan", icon: ShieldCheck },
  { key: "users", label: "Manajemen Pengguna", icon: Users2 },
  { key: "appearance", label: "Antarmuka", icon: MonitorCog },
  { key: "backup", label: "Backup & Restore", icon: DatabaseBackup },
  { key: "audit", label: "Audit Log", icon: ScrollText },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function SettingsPanel() {
  const [section, setSection] = useState<SectionKey>("village");
  const [s, setS] = useState<SystemSettings>(getSettings());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setS(getSettings());
  }, []);

  const session = getSession();
  const update = <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => {
    setS((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
    setDirty(true);
  };

  const handleSave = () => {
    saveSettings(s);
    setDirty(false);
    logAudit(session?.username ?? "system", "Update Settings", section);
    toast.success("Pengaturan disimpan");
  };

  const handleReset = () => {
    if (!confirm("Reset semua pengaturan ke default?")) return;
    resetSettings();
    setS(getSettings());
    setDirty(false);
    toast.success("Pengaturan direset ke default");
  };

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
            disabled={!dirty}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Save className="h-4 w-4 mr-1.5" /> Simpan Perubahan
          </Button>
        </div>
      </div>

      <Tabs
        value={section}
        onValueChange={(v) => setSection(v as SectionKey)}
        className="flex flex-col lg:flex-row"
      >
        <TabsList className="h-auto flex-wrap lg:flex-col lg:w-64 lg:rounded-none lg:bg-muted/20 lg:border-r lg:border-border p-2 gap-1 justify-start">
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
                  <Input
                    value={s.village.head}
                    onChange={(e) => update("village", { head: e.target.value })}
                  />
                </Field>
                <Field label="Sekretaris Desa">
                  <Input
                    value={s.village.secretary}
                    onChange={(e) => update("village", { secretary: e.target.value })}
                  />
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
                    onChange={(v) => update("village", { logo_url: v })}
                  />
                </Field>
              </Grid2>
            </Section>
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
                <Field label="URL Favicon">
                  <Input
                    value={s.branding.favicon_url}
                    onChange={(e) => update("branding", { favicon_url: e.target.value })}
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

          <TabsContent value="hero" className="m-0 space-y-4">
            <HeroSettings s={s} update={update} />
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

          <TabsContent value="signature" className="m-0 space-y-4">
            <Section
              title="E-Signature & QR Code"
              desc="Identitas pejabat penandatangan dan keamanan QR pada surat digital."
            >
              <Grid2>
                <Field label="Nama Penandatangan">
                  <Input
                    value={s.signature.signer_name}
                    onChange={(e) => update("signature", { signer_name: e.target.value })}
                  />
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
                <Field label="URL Spesimen TTD (opsional)">
                  <Input
                    placeholder="https://…/ttd.png"
                    value={s.signature.sign_image_url}
                    onChange={(e) => update("signature", { sign_image_url: e.target.value })}
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
    if (!confirm(`Hapus pengguna ${u.username}?`)) return;
    deleteUser(u.id);
    refresh();
    logAudit(getSession()?.username ?? "system", "Delete User", u.username);
    toast.success("Pengguna dihapus");
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
    if (
      !confirm("Hapus SEMUA data surat, arsip, dan penduduk? Tindakan ini tidak dapat dibatalkan.")
    )
      return;
    clearAllData();
    toast.success("Data dibersihkan");
    setTimeout(() => window.location.reload(), 600);
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

/* ---------- Image upload helper ---------- */
function ImageUploadField({
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1.5" /> Pilih Gambar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        )}
      </div>
      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
          <img src={value} alt={label} className="h-36 w-full object-cover" />
        </div>
      )}
    </div>
  );
}

/* ---------- Hero Settings ---------- */
function HeroSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  const slides = s.hero.slides;

  const updateSlide = (id: string, patch: Partial<(typeof slides)[0]>) => {
    update("hero", {
      slides: slides.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
    });
  };

  const addSlide = () => {
    const newSlide = {
      id: `s${Date.now()}`,
      image_url: "",
      alt: `Slide ${slides.length + 1}`,
      enabled: true,
    };
    update("hero", { slides: [...slides, newSlide] });
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) {
      toast.error("Minimal harus ada 1 slide");
      return;
    }
    update("hero", { slides: slides.filter((sl) => sl.id !== id) });
  };

  const moveSlide = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((sl) => sl.id === id);
    const next = idx + dir;
    if (next < 0 || next >= slides.length) return;
    const arr = [...slides];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    update("hero", { slides: arr });
  };

  return (
    <>
      {/* Teks Marquee */}
      <Section title="Teks Marquee" desc="Teks berjalan di tengah hero.">
        <ToggleRow
          label="Aktifkan Marquee"
          checked={s.hero.marquee_enabled}
          onChange={(v) => update("hero", { marquee_enabled: v })}
        />
        <Field label="Teks Marquee" hint="Gunakan · sebagai pemisah antar baris">
          <Textarea
            rows={2}
            value={s.hero.marquee_text}
            onChange={(e) => update("hero", { marquee_text: e.target.value })}
          />
        </Field>
      </Section>

      {/* Image Slider */}
      <Section title="Image Slider" desc="Kelola slide gambar hero.">
        <ToggleRow
          label="Aktifkan Slider"
          checked={s.hero.slider_enabled}
          onChange={(v) => update("hero", { slider_enabled: v })}
        />

        <div className="space-y-2">
          {slides.map((sl, i) => (
            <div key={sl.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-semibold">Slide {i + 1}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveSlide(sl.id, -1)}
                    disabled={i === 0}
                  >
                    ←
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveSlide(sl.id, 1)}
                    disabled={i === slides.length - 1}
                  >
                    →
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlide(sl.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <Field label="Alt / Caption">
                <Input
                  value={sl.alt}
                  onChange={(e) => updateSlide(sl.id, { alt: e.target.value })}
                />
              </Field>
              <ImageUploadField
                label="Gambar Slide"
                hint="Disarankan rasio 16:9, maks 2MB"
                value={sl.image_url}
                onChange={(v) => updateSlide(sl.id, { image_url: v })}
              />
              <ToggleRow
                compact
                label="Aktifkan slide ini"
                checked={sl.enabled}
                onChange={(v) => updateSlide(sl.id, { enabled: v })}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSlide}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Slide
          </Button>
        </div>
      </Section>

      {/* Video Background */}
      <Section
        title="Video Background"
        desc="Video diputar otomatis代替 image slider. Fallback image digunakan saat video tidak tersedia."
      >
        <ToggleRow
          label="Aktifkan Video"
          desc="Video akan diputar di belakang hero. Jika kosong, image slider tetap digunakan."
          checked={s.hero.video_enabled}
          onChange={(v) => update("hero", { video_enabled: v })}
        />
        <Field label="URL Video" hint="Link langsung ke file video (.mp4) atau YouTube embed">
          <Input
            placeholder="https://…/video.mp4"
            value={s.hero.video_url}
            onChange={(e) => update("hero", { video_url: e.target.value })}
          />
        </Field>
        <ImageUploadField
          label="Gambar Fallback Video"
          hint="Ditampilkan saat video gagal dimuat atau dinonaktifkan"
          value={s.hero.video_fallback_image}
          onChange={(v) => update("hero", { video_fallback_image: v })}
        />
      </Section>

      {/* Weather Badge */}
      <Section title="Badge Cuaca" desc="Badge cuaca di pojok kanan atas hero.">
        <ToggleRow
          label="Aktifkan Badge Cuaca"
          checked={s.hero.weather_enabled}
          onChange={(v) => update("hero", { weather_enabled: v })}
        />
        <Field label="Teks Badge" hint="Contoh: Pringgabaya · 28°C · Cerah">
          <Input
            value={s.hero.weather_label}
            onChange={(e) => update("hero", { weather_label: e.target.value })}
          />
        </Field>
      </Section>
    </>
  );
}

/* ---------- Kop Surat Settings ---------- */
function KopSuratSettings({
  s,
  update,
}: {
  s: SystemSettings;
  update: <K extends keyof SystemSettings>(k: K, patch: Partial<SystemSettings[K]>) => void;
}) {
  return (
    <>
      <Section title="Logo Kop Surat" desc="Logo muncul di header surat.">
        <ImageUploadField
          label="URL / Upload Logo"
          hint="Disarankan PNG transparan, maks 500KB"
          value={s.kopSurat.logo_url}
          onChange={(v) => update("kopSurat", { logo_url: v })}
        />
        <Field label="Posisi Logo">
          <Select
            value={s.kopSurat.logo_position}
            onValueChange={(v) =>
              update("kopSurat", {
                logo_position: v as SystemSettings["kopSurat"]["logo_position"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Kiri</SelectItem>
              <SelectItem value="center">Tengah</SelectItem>
              <SelectItem value="right">Kanan</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Isi Kop Surat" desc="Teks header yang tercetak di bagian atas setiap surat.">
        <Grid2>
          <Field label="Baris Institusi">
            <Input
              value={s.kopSurat.kop_line}
              onChange={(e) => update("kopSurat", { kop_line: e.target.value })}
            />
          </Field>
          <Field label="Sub-Institusi">
            <Textarea
              rows={2}
              value={s.kopSurat.kop_sub}
              onChange={(e) => update("kopSurat", { kop_sub: e.target.value })}
            />
          </Field>
        </Grid2>
        <Field label="Alamat Lengkap">
          <Textarea
            rows={2}
            value={s.kopSurat.kop_address}
            onChange={(e) => update("kopSurat", { kop_address: e.target.value })}
          />
        </Field>
        <Grid2>
          <Field label="Telepon">
            <Input
              value={s.kopSurat.kop_phone}
              onChange={(e) => update("kopSurat", { kop_phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              value={s.kopSurat.kop_email}
              onChange={(e) => update("kopSurat", { kop_email: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <Input
              value={s.kopSurat.kop_website}
              onChange={(e) => update("kopSurat", { kop_website: e.target.value })}
            />
          </Field>
        </Grid2>
      </Section>

      <Section title="Warna & Style" desc="Pengaturan visual kop surat.">
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
        <Field label="Style Tanda Tangan">
          <Select
            value={s.kopSurat.signature_style}
            onValueChange={(v) =>
              update("kopSurat", {
                signature_style: v as SystemSettings["kopSurat"]["signature_style"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Teks (Nama + Jabatan)</SelectItem>
              <SelectItem value="image">Gambar Spesimen TTD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ImageUploadField
          label="Gambar Spesimen TTD"
          hint="Jika style TTD = Gambar, gambar ini dipakai"
          value={s.signature.sign_image_url}
          onChange={(v) => update("signature", { sign_image_url: v })}
        />
      </Section>

      <Section title="Footer Surat" desc="Teks di bagian bawah setiap surat.">
        <ToggleRow
          label="Aktifkan Footer"
          checked={s.kopSurat.footer_enabled}
          onChange={(v) => update("kopSurat", { footer_enabled: v })}
        />
        <Field label="Teks Footer" hint="Muncul di setiap surat">
          <Textarea
            rows={2}
            value={s.kopSurat.footer_text}
            onChange={(e) => update("kopSurat", { footer_text: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Preview Kop Surat" desc="Pratinjau kop surat sesuai pengaturan.">
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          {/* Bar header */}
          <div className="h-2 w-full" style={{ backgroundColor: s.kopSurat.header_bar_color }} />
          <div className="flex items-center gap-4 p-4">
            {s.kopSurat.logo_url && (
              <img
                src={s.kopSurat.logo_url}
                alt="logo"
                className={`h-16 w-auto object-contain ${
                  s.kopSurat.logo_position === "right"
                    ? "order-2 ml-auto"
                    : s.kopSurat.logo_position === "center"
                      ? "order-1 mx-auto"
                      : "order-1"
                }`}
              />
            )}
            <div className="flex-1 text-center">
              <p className="font-bold text-sm">{s.kopSurat.kop_line}</p>
              <p className="text-xs font-semibold whitespace-pre-line">{s.kopSurat.kop_sub}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.kopSurat.kop_address}</p>
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
    group: "Laporan",
    pages: [
      { path: "/laporan/rpjmdes", label: "RPJMDes" },
      { path: "/laporan/rkpdes", label: "RKPDes" },
      { path: "/laporan/apbdes", label: "APBDes" },
      { path: "/laporan/realisasi", label: "Realisasi" },
      { path: "/laporan/pbb", label: "PBB-P2" },
    ],
  },
  {
    group: "Wisata & Ekonomi",
    pages: [
      { path: "/ekonomi/bumdes", label: "BUMDes" },
      { path: "/lainnya/monografi", label: "Monografi" },
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
                  onChange={(v) => updatePage({ image_url: v })}
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
              <Field label="Visi">
                <Textarea
                  rows={2}
                  value={pageConfig.extras.visi ?? ""}
                  onChange={(e) =>
                    updatePage({ extras: { ...pageConfig.extras, visi: e.target.value } })
                  }
                  placeholder="Visi pembangunan desa…"
                />
              </Field>
              <Field label="Misi">
                <Textarea
                  rows={3}
                  value={pageConfig.extras.misi ?? ""}
                  onChange={(e) =>
                    updatePage({ extras: { ...pageConfig.extras, misi: e.target.value } })
                  }
                  placeholder="1. …&#10;2. …&#10;3. …"
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
