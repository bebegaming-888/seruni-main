import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShieldCheck,
  FileSignature,
  CheckCircle2,
  XCircle,
  Upload,
  Archive,
  Eye,
  Search,
  FileText,
  Clock,
  Users,
  TrendingUp,
  Inbox,
  Hourglass,
  PieChart as PieIcon,
  Download,
  RefreshCw,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
  Home,
  ChevronRight,
  Files,
  Menu,
  ListChecks,
  Send,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { TemplateSuratManager } from "@/components/admin/TemplateSuratManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getSession, logout } from "@/lib/auth";
import {
  listRecords,
  setStatus,
  saveRecord,
  archiveRecord,
  listArchive,
  listPenduduk,
  savePenduduk,
  type SuratRecord,
} from "@/lib/esurat-store";
import { notifySurat } from "@/lib/esurat-notif";
import { sendWaNotification } from "@/lib/fonnte";
import { suratActionsFor, can } from "@/lib/roles";
import Papa from "papaparse";
import type { Penduduk } from "@/data/penduduk";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type StatusKey = SuratRecord["status"];
const STATUS_KEYS: StatusKey[] = [
  "Menunggu Verifikasi",
  "Diverifikasi",
  "Menunggu Approval",
  "Disetujui",
  "Ditolak",
];

const STATUS_COLORS: Record<StatusKey, string> = {
  "Menunggu Verifikasi": "hsl(var(--warning))",
  Diverifikasi: "hsl(var(--info))",
  "Menunggu Approval": "hsl(var(--primary))",
  Disetujui: "hsl(var(--success))",
  Ditolak: "hsl(var(--destructive))",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<
    "dashboard" | "monitoring" | "archive" | "templates" | "settings"
  >("dashboard");
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [archive, setArchive] = useState<SuratRecord[]>([]);
  const [preview, setPreview] = useState<SuratRecord | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [pendCount, setPendCount] = useState(0);
  const [tab, setTab] = useState<"all" | StatusKey>("all");
  const [q, setQ] = useState("");

  // Guard: jika belum login, alihkan ke /login
  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  const session = getSession();

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar");
    navigate({ to: "/login" });
  };

  const refresh = () => {
    setRecords(listRecords());
    setArchive(listArchive());
    setPendCount(listPenduduk().length);
  };
  useEffect(refresh, []);

  useEffect(() => {
    if (!preview) {
      setQrUrl("");
      return;
    }
    const payload = `SURAT|${preview.no}|${preview.nik}|${preview.kode}|${preview.signed_at ?? ""}`;
    QRCode.toDataURL(payload, { width: 220, margin: 1 }).then(setQrUrl);
  }, [preview]);

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const counts: Record<StatusKey, number> = {
      "Menunggu Verifikasi": 0,
      Diverifikasi: 0,
      "Menunggu Approval": 0,
      Disetujui: 0,
      Ditolak: 0,
    };
    records.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    archive.forEach((r) => {
      if (r.status === "Disetujui") counts["Disetujui"] += 1;
    });
    const total = records.length + archive.length;
    const pending =
      counts["Menunggu Verifikasi"] + counts["Diverifikasi"] + counts["Menunggu Approval"];
    const approvalRate = total > 0 ? Math.round((counts["Disetujui"] / total) * 100) : 0;
    return { counts, total, pending, approvalRate };
  }, [records, archive]);

  const chartStatus = STATUS_KEYS.map((k) => ({ name: k, value: stats.counts[k] }));

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: d.toLocaleDateString("id-ID", { weekday: "short" }),
        masuk: 0,
        selesai: 0,
      };
    });
    [...records, ...archive].forEach((r) => {
      const k = (r.created_at ?? "").slice(0, 10);
      const row = days.find((d) => d.key === k);
      if (row) row.masuk += 1;
      if (r.status === "Disetujui") {
        const ks = (r.signed_at ?? r.updated_at ?? "").slice(0, 10);
        const rs = days.find((d) => d.key === ks);
        if (rs) rs.selesai += 1;
      }
    });
    return days;
  }, [records, archive]);

  /* ---------- Filtering ---------- */
  const filtered = useMemo(() => {
    let list = records;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((r) =>
        [r.no, r.nama_surat, r.pemohon, r.nik, r.kontak].some((v) =>
          (v ?? "").toLowerCase().includes(s),
        ),
      );
    }
    return list;
  }, [records, tab, q]);

  /* ---------- Actions ---------- */
  const verify = async (r: SuratRecord) => {
    setStatus(r.no, "Diverifikasi");
    refresh();
    const result = await notifySurat(r, "verify");
    if (result.ok) toast.success("Diverifikasi & notifikasi WA dikirim", { description: r.no });
    else toast.warning("Diverifikasi OK, WA gagal", { description: result.message });
  };
  const reject = async (r: SuratRecord) => {
    const note = window.prompt("Alasan penolakan?") ?? "";
    if (!note) return;
    setStatus(r.no, "Ditolak", note);
    const updated = { ...r, status: "Ditolak" as const, catatan: note };
    await notifySurat(updated, "reject", note);
    refresh();
    toast.error("Ditolak", { description: r.no });
  };
  const lanjutApproval = (r: SuratRecord) => {
    setStatus(r.no, "Menunggu Approval");
    refresh();
    setPreview({ ...r, status: "Menunggu Approval" });
  };
  const approve = async (r: SuratRecord) => {
    const signed_at = new Date().toISOString();
    const updated: SuratRecord = {
      ...r,
      status: "Disetujui",
      signed_at,
      signed_by: "Kepala Desa",
      qr_payload: `SURAT|${r.no}|${r.nik}|${r.kode}|${signed_at}`,
    };
    saveRecord(updated);
    archiveRecord(r.no);
    const result = await notifySurat(updated, "approve");
    refresh();
    setPreview(updated);
    if (result.ok) toast.success("Disetujui & notifikasi WA dikirim");
    else toast.warning("Disetujui, WA gagal", { description: result.message });
  };

  const onCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows: Penduduk[] = res.data
          .map((r) => ({
            nik: r.nik ?? "",
            nama: r.nama ?? "",
            tempat_lahir: r.tempat_lahir ?? "",
            tanggal_lahir: r.tanggal_lahir ?? "",
            jenis_kelamin: (r.jenis_kelamin as Penduduk["jenis_kelamin"]) ?? "Laki-laki",
            agama: r.agama ?? "Islam",
            status_perkawinan:
              (r.status_perkawinan as Penduduk["status_perkawinan"]) ?? "Belum Kawin",
            pekerjaan: r.pekerjaan ?? "-",
            kewarganegaraan: r.kewarganegaraan ?? "WNI",
            alamat: r.alamat ?? "",
            rt: r.rt ?? "",
            rw: r.rw ?? "",
            dusun: r.dusun ?? "",
            desa: r.desa ?? "Seruni Mumbul",
            kecamatan: r.kecamatan ?? "Pringgabaya",
            kabupaten: r.kabupaten ?? "Lombok Timur",
            provinsi: r.provinsi ?? "Nusa Tenggara Barat",
            no_kk: r.no_kk ?? "",
            no_hp: r.no_hp ?? "",
          }))
          .filter((p) => /^\d{16}$/.test(p.nik));
        savePenduduk(rows);
        refresh();
        toast.success(`Imported ${rows.length} penduduk`);
      },
    });
  };

  const exportArchive = () => {
    const csv = Papa.unparse(
      archive.map((r) => ({
        no: r.no,
        kode: r.kode,
        nama_surat: r.nama_surat,
        pemohon: r.pemohon,
        nik: r.nik,
        kontak: r.kontak,
        status: r.status,
        signed_by: r.signed_by ?? "",
        signed_at: r.signed_at ?? "",
        created_at: r.created_at,
      })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `arsip-surat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arsip diunduh");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Header */}
      <section className="pt-8 pb-8 px-4 sm:px-8 bg-gradient-to-br from-ink via-ink to-ink/85 text-background">
        <div className="mx-auto max-w-7xl space-y-5">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-ui text-background/70 flex-wrap"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-1 hover:text-background transition"
            >
              <Home className="h-3.5 w-3.5" /> Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-background/90">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-primary font-semibold">
              {view === "dashboard"
                ? "Dashboard E-Surat"
                : view === "monitoring"
                  ? "Monitoring Pengajuan"
                  : view === "archive"
                    ? "Arsip Surat Keluar"
                    : view === "templates"
                      ? "Template Surat"
                      : "Pengaturan"}
            </span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-primary mb-2">
                Admin Panel{" "}
                {session && (
                  <span className="opacity-70">
                    · {session.name} ({session.role})
                  </span>
                )}
              </p>
              <h1 className="hero-title text-background">
                {view === "dashboard" && (
                  <>
                    Dashboard <em className="not-italic text-primary">E-Surat</em>
                  </>
                )}
                {view === "monitoring" && (
                  <>
                    Monitoring <em className="not-italic text-primary">Pengajuan</em>
                  </>
                )}
                {view === "archive" && (
                  <>
                    Arsip <em className="not-italic text-primary">Surat Keluar</em>
                  </>
                )}
                {view === "templates" && (
                  <>
                    Template <em className="not-italic text-primary">Surat</em>
                  </>
                )}
                {view === "settings" && (
                  <>
                    Pengaturan <em className="not-italic text-primary">Sistem</em>
                  </>
                )}
              </h1>
              <p className="font-body text-background/70 mt-2 max-w-xl text-sm sm:text-base">
                {view === "dashboard" &&
                  "Pantau pengajuan, verifikasi, tandatangan digital, dan kirim notifikasi WhatsApp dalam satu tempat."}
                {view === "monitoring" &&
                  "Tabel pengajuan surat dari warga: verifikasi, approval, dan kirim sesuai role Anda."}
                {view === "archive" &&
                  "Inventaris surat keluar yang telah disetujui dan ditandatangani digital."}
                {view === "templates" &&
                  "Kelola katalog template surat: CRUD, import/export, preview, alur verifikasi & approval, hingga pengiriman dokumen."}
                {view === "settings" &&
                  "Atur konfigurasi sistem, branding, integrasi WhatsApp, dan preferensi admin."}
              </p>
            </div>

            {/* Compact action bar */}
            <div className="flex items-center gap-2 shrink-0">
              {view === "dashboard" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refresh}
                    className="hidden sm:inline-flex border-background/30 bg-background/10 text-background hover:bg-background/20"
                  >
                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">Muat Ulang</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportArchive}
                    className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">Export Arsip</span>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-background/30 bg-background/10 text-background hover:bg-background/20"
                  >
                    <Menu className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {view === "dashboard" && (
                    <>
                      <DropdownMenuItem onClick={refresh} className="sm:hidden">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Muat Ulang
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportArchive} className="sm:hidden">
                        <Download className="h-4 w-4 mr-2" />
                        Export Arsip
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="sm:hidden" />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
                    <Home className="h-4 w-4 mr-2" />
                    Beranda
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Section tabs */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex rounded-full bg-background/10 border border-background/20 p-1 gap-1">
              <SectionTab
                active={view === "dashboard"}
                onClick={() => setView("dashboard")}
                icon={LayoutDashboard}
                label="Dashboard"
              />
              <SectionTab
                active={view === "templates"}
                onClick={() => setView("templates")}
                icon={Files}
                label="Template Surat"
              />
              <SectionTab
                active={view === "monitoring"}
                onClick={() => setView("monitoring")}
                icon={ListChecks}
                label="Monitoring"
              />
              <SectionTab
                active={view === "archive"}
                onClick={() => setView("archive")}
                icon={Archive}
                label="Arsip"
              />
              <SectionTab
                active={view === "settings"}
                onClick={() => setView("settings")}
                icon={SettingsIcon}
                label="Pengaturan"
              />
            </div>
          </div>
        </div>
      </section>

      {view === "settings" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <SettingsPanel />
          </div>
        </section>
      ) : view === "templates" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <TemplateSuratManager />
          </div>
        </section>
      ) : view === "monitoring" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <MonitoringTable
              records={records}
              onPreview={setPreview}
              onVerify={verify}
              onReject={reject}
              onLanjut={lanjutApproval}
              onApprove={approve}
              onSend={(r) =>
                sendWaNotification(
                  r.kontak,
                  `Dokumen ${r.nama_surat} (${r.no}) telah dikirim.`,
                ).then(() => toast.success("Dikirim via WA"))
              }
            />
          </div>
        </section>
      ) : view === "archive" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <ArchiveTable archive={archive} onPreview={setPreview} onExport={exportArchive} />
          </div>
        </section>
      ) : (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Inbox}
                label="Total Pengajuan"
                value={stats.total}
                hint="Sepanjang waktu"
                tone="primary"
              />
              <StatCard
                icon={Hourglass}
                label="Sedang Diproses"
                value={stats.pending}
                hint="Verifikasi & approval"
                tone="warning"
              />
              <StatCard
                icon={CheckCircle2}
                label="Disetujui"
                value={stats.counts["Disetujui"]}
                hint={`${stats.approvalRate}% approval rate`}
                tone="success"
              />
              <StatCard
                icon={Users}
                label="Database Penduduk"
                value={pendCount}
                hint="Entri NIK aktif"
                tone="info"
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" /> Aktivitas 7 Hari Terakhir
                    </h3>
                    <p className="font-body text-xs text-muted-foreground">
                      Pengajuan masuk vs surat selesai
                    </p>
                  </div>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last7} barGap={6}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="masuk"
                        name="Masuk"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="selesai"
                        name="Selesai"
                        fill="hsl(var(--success))"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
                  <PieIcon className="h-5 w-5 text-primary" /> Distribusi Status
                </h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartStatus.filter((c) => c.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {chartStatus.map((c) => (
                          <Cell key={c.name} fill={STATUS_COLORS[c.name as StatusKey]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* CSV Import */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card flex flex-wrap items-center gap-4 justify-between">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" /> Database Penduduk
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1 max-w-2xl">
                  {pendCount} entri aktif. Import CSV dengan kolom: nik, nama, tempat_lahir,
                  tanggal_lahir, jenis_kelamin, agama, status_perkawinan, pekerjaan, alamat, rt, rw,
                  dusun, no_kk, no_hp.
                </p>
              </div>
              <Label className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer">
                <Upload className="h-4 w-4" /> Import CSV
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
                />
              </Label>
            </div>

            {/* Antrian + Preview */}
            <div className="grid lg:grid-cols-[1fr_380px] gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" /> Antrian Pengajuan
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari no/NIK/nama…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-9 w-64 rounded-full"
                    />
                  </div>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                  <TabsList className="flex flex-wrap h-auto rounded-full bg-muted p-1">
                    <TabsTrigger value="all" className="rounded-full">
                      Semua <span className="ml-1.5 text-xs opacity-70">{records.length}</span>
                    </TabsTrigger>
                    {STATUS_KEYS.map((k) => (
                      <TabsTrigger key={k} value={k} className="rounded-full text-xs">
                        {k} <span className="ml-1.5 opacity-70">{stats.counts[k]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                    <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="font-body text-muted-foreground">
                      {records.length === 0
                        ? "Belum ada pengajuan masuk."
                        : "Tidak ada hasil sesuai filter."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((r) => (
                      <article
                        key={r.no}
                        onClick={() => setPreview(r)}
                        className={`rounded-2xl border bg-card p-5 shadow-card cursor-pointer transition hover:border-primary/40 hover:shadow-elevated ${
                          preview?.no === r.no
                            ? "border-primary ring-1 ring-primary/30"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-ui text-[11px] font-bold text-primary tracking-widest">
                                {r.kode}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                #{r.no}
                              </span>
                              <StatusPill status={r.status} />
                              <span className="font-ui text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {fmtRelative(r.created_at)}
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold mt-1.5">
                              {r.nama_surat}
                            </h3>
                            <p className="font-body text-sm text-muted-foreground">
                              {r.pemohon} · NIK {r.nik} · {r.kontak}
                            </p>
                          </div>
                          <div
                            className="flex flex-wrap gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {suratActionsFor(r.status).map((a) => {
                              if (a === "surat.verify")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    onClick={() => verify(r)}
                                    className="bg-info hover:bg-info/90 text-background"
                                  >
                                    <ShieldCheck className="h-4 w-4 mr-1" /> Verifikasi
                                  </Button>
                                );
                              if (a === "surat.toApproval")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    onClick={() => lanjutApproval(r)}
                                    className="bg-primary hover:bg-primary-hover"
                                  >
                                    <Eye className="h-4 w-4 mr-1" /> Lanjut Approval
                                  </Button>
                                );
                              if (a === "surat.approve")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    onClick={() => approve(r)}
                                    className="bg-success hover:bg-success/90 text-background"
                                  >
                                    <FileSignature className="h-4 w-4 mr-1" /> Approve & TTD
                                  </Button>
                                );
                              if (a === "surat.reject")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => reject(r)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Tolak
                                  </Button>
                                );
                              if (a === "surat.send")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    onClick={() =>
                                      sendWaNotification(
                                        r.kontak,
                                        `Dokumen ${r.nama_surat} (${r.no}) telah dikirim.`,
                                      ).then(() => toast.success("Dikirim via WA"))
                                    }
                                    className="bg-primary hover:bg-primary-hover"
                                  >
                                    <Send className="h-4 w-4 mr-1" /> Kirim
                                  </Button>
                                );
                              return null;
                            })}
                            {r.status === "Disetujui" && (
                              <Button size="sm" variant="outline" onClick={() => setPreview(r)}>
                                <Archive className="h-4 w-4 mr-1" /> Lihat Arsip
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              <aside className="lg:sticky lg:top-24 h-fit">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold">Preview Blanko</h3>
                    {preview && <StatusPill status={preview.status} />}
                  </div>
                  {!preview ? (
                    <div className="text-center py-10">
                      <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-body text-sm text-muted-foreground">
                        Pilih pengajuan untuk melihat preview surat.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-background p-5 text-sm font-body space-y-2">
                      <div className="text-center pb-3 border-b border-border">
                        <p className="font-display text-base font-bold">
                          PEMERINTAH DESA SERUNI MUMBUL
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Kec. Pringgabaya · Kab. Lombok Timur
                        </p>
                      </div>
                      <p className="text-center font-display font-bold uppercase mt-2">
                        {preview.nama_surat}
                      </p>
                      <p className="text-center text-xs text-muted-foreground">No: {preview.no}</p>
                      <div className="pt-3 space-y-1">
                        <p>Yang bertanda tangan menerangkan bahwa:</p>
                        <p>
                          <strong>Nama:</strong> {preview.pemohon}
                        </p>
                        <p>
                          <strong>NIK:</strong> {preview.nik}
                        </p>
                        {Object.entries(preview.data).map(([k, v]) => (
                          <p key={k}>
                            <strong className="capitalize">{k.replace(/_/g, " ")}:</strong> {v}
                          </p>
                        ))}
                      </div>
                      {preview.status === "Disetujui" && qrUrl ? (
                        <div className="flex flex-col items-center pt-4 border-t border-border mt-4">
                          <img src={qrUrl} alt="QR e-signature" className="w-32 h-32" />
                          <p className="text-xs text-muted-foreground mt-1">Tertanda digital</p>
                          <p className="font-display font-bold">{preview.signed_by}</p>
                        </div>
                      ) : (
                        <div className="pt-4 mt-4 border-t border-dashed border-border text-center text-xs text-muted-foreground">
                          Belum ditandatangani
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

function SectionTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-9 rounded-full text-xs font-ui font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-background/80 hover:text-background hover:bg-background/10"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/10 text-info",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold mt-4">{value}</p>
      <p className="font-ui text-sm font-semibold text-foreground mt-0.5">{label}</p>
      {hint && <p className="font-body text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: SuratRecord["status"] }) {
  const map: Record<SuratRecord["status"], string> = {
    "Menunggu Verifikasi": "bg-warning/15 text-warning border-warning/30",
    Diverifikasi: "bg-info/15 text-info border-info/30",
    "Menunggu Approval": "bg-primary/15 text-primary border-primary/30",
    Disetujui: "bg-success/15 text-success border-success/30",
    Ditolak: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span
      className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${map[status]}`}
    >
      {status}
    </span>
  );
}

function fmtRelative(iso?: string) {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

/* ---------- Monitoring Table (pengajuan dari user) ---------- */
function MonitoringTable({
  records,
  onPreview,
  onVerify,
  onReject,
  onLanjut,
  onApprove,
  onSend,
}: {
  records: SuratRecord[];
  onPreview: (r: SuratRecord) => void;
  onVerify: (r: SuratRecord) => void;
  onReject: (r: SuratRecord) => void;
  onLanjut: (r: SuratRecord) => void;
  onApprove: (r: SuratRecord) => void;
  onSend: (r: SuratRecord) => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | StatusKey>("all");
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = {
      "Menunggu Verifikasi": 0,
      Diverifikasi: 0,
      "Menunggu Approval": 0,
      Disetujui: 0,
      Ditolak: 0,
    };
    records.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [records]);
  const filtered = useMemo(() => {
    let list = records;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    const s = q.trim().toLowerCase();
    if (s)
      list = list.filter((r) =>
        [r.no, r.nama_surat, r.pemohon, r.nik, r.kontak].some((v) =>
          (v ?? "").toLowerCase().includes(s),
        ),
      );
    return list;
  }, [records, tab, q]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Monitoring Pengajuan
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {records.length} pengajuan · aksi disesuaikan dengan role login Anda
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari no/NIK/nama…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 w-64 rounded-full"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex flex-wrap h-auto rounded-full bg-muted p-1">
          <TabsTrigger value="all" className="rounded-full text-xs">
            Semua <span className="ml-1.5 opacity-70">{records.length}</span>
          </TabsTrigger>
          {STATUS_KEYS.map((k) => (
            <TabsTrigger key={k} value={k} className="rounded-full text-xs">
              {k} <span className="ml-1.5 opacity-70">{counts[k]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-ui uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">No / Kode</th>
                <th className="text-left px-4 py-3">Pemohon</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Nama Surat</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Diajukan</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Belum ada pengajuan.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const acts = suratActionsFor(r.status);
                  return (
                    <tr key={r.no} className="border-t border-border hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-muted-foreground">#{r.no}</div>
                        <div className="text-[11px] font-bold text-primary">{r.kode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-ui font-semibold">{r.pemohon}</div>
                        <div className="text-xs text-muted-foreground">NIK {r.nik}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">{r.nama_surat}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {fmtRelative(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => onPreview(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {acts.map((a) => {
                            if (a === "surat.verify")
                              return (
                                <Button
                                  key={a}
                                  size="sm"
                                  onClick={() => onVerify(r)}
                                  className="bg-info hover:bg-info/90 text-background"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verifikasi
                                </Button>
                              );
                            if (a === "surat.toApproval")
                              return (
                                <Button
                                  key={a}
                                  size="sm"
                                  onClick={() => onLanjut(r)}
                                  className="bg-primary hover:bg-primary-hover"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Approval
                                </Button>
                              );
                            if (a === "surat.approve")
                              return (
                                <Button
                                  key={a}
                                  size="sm"
                                  onClick={() => onApprove(r)}
                                  className="bg-success hover:bg-success/90 text-background"
                                >
                                  <FileSignature className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                              );
                            if (a === "surat.reject")
                              return (
                                <Button
                                  key={a}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onReject(r)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              );
                            if (a === "surat.send")
                              return (
                                <Button
                                  key={a}
                                  size="sm"
                                  onClick={() => onSend(r)}
                                  className="bg-primary hover:bg-primary-hover"
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" /> Kirim
                                </Button>
                              );
                            return null;
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Archive Table (surat keluar) ---------- */
function ArchiveTable({
  archive,
  onPreview,
  onExport,
}: {
  archive: SuratRecord[];
  onPreview: (r: SuratRecord) => void;
  onExport: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return archive;
    return archive.filter((r) =>
      [r.no, r.nama_surat, r.pemohon, r.nik].some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [archive, q]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" /> Arsip Surat Keluar
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {archive.length} dokumen terkirim · ditandatangani digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari arsip…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-56 rounded-full"
            />
          </div>
          <Button size="sm" onClick={onExport} className="bg-primary hover:bg-primary-hover">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-ui uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">No Surat</th>
                <th className="text-left px-4 py-3">Nama Surat</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Pemohon</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Ditandatangani</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Tanggal</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Belum ada surat keluar.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.no} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-mono text-xs">#{r.no}</td>
                    <td className="px-4 py-3">
                      <div className="font-ui font-semibold">{r.nama_surat}</div>
                      <div className="text-[11px] font-bold text-primary">{r.kode}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      {r.pemohon} <span className="text-muted-foreground">· {r.nik}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">{r.signed_by ?? "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {r.signed_at ? new Date(r.signed_at).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => onPreview(r)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
