import { useEffect, useMemo, useState, useRef } from "react";
import { generateSuratPdf } from "@/lib/pdf-generator";
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
  Cloud,
  CloudDownload,
  Loader2,
  AlertCircle,
  Building2,
  Paperclip,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { TemplateSuratManager } from "@/components/admin/TemplateSuratManager";
import { PendudukManager } from "@/components/admin/PendudukManager";
import { CMSManager } from "@/components/admin/CMSManager";
import { Newspaper, History } from "lucide-react";
import { AuditLogManager } from "@/components/admin/AuditLogManager";
import { AlertPanel } from "@/components/admin/AlertPanel";
import { SuratPreviewPanel, RejectionModal } from "@/components/admin/SuratPreviewPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getSession, logout } from "@/lib/auth";
import { listRecords, listArchive, lookupPenduduk, type SuratRecord } from "@/lib/esurat-store";
import { listPenduduk, savePendudukBatch, isUsingMock } from "@/lib/penduduk-store";
import { notifySurat } from "@/lib/esurat-notif";
import {
  syncSetStatus,
  syncSaveRecord,
  syncArchive,
  syncDeleteRecord,
  syncPullAllRecords,
  logAudit,
  healthCheck,
} from "@/lib/useSupabaseSync";
import { generateNomorSurat } from "@/lib/nomor-surat";
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
    | "dashboard"
    | "monitoring"
    | "archive"
    | "templates"
    | "penduduk"
    | "settings"
    | "konten"
    | "audit"
  >("dashboard");
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [archive, setArchive] = useState<SuratRecord[]>([]);
  const [preview, setPreview] = useState<SuratRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SuratRecord | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [pendCount, setPendCount] = useState(0);
  const [pendIsMock, setPendIsMock] = useState(false);
  const [tab, setTab] = useState<"all" | StatusKey>("all");
  const [q, setQ] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  // null = checking, true = connected, false = offline/error
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  // Track records with pending actions to prevent duplicate triggers (double-click)
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Guard: jika belum login, alihkan ke /login
  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  // ── Scroll to top when view changes ─────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const session = getSession();
  const username = session?.name ?? "Admin";

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar", { description: "Anda telah keluar dari sesi admin." });
    navigate({ to: "/login" });
  };

  const refresh = () => {
    setRecords(listRecords());
    setArchive(listArchive());
    setPendCount(listPenduduk().length);
    setPendIsMock(isUsingMock());
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncPullAllRecords();
      if (res.ok) {
        logAudit({
          action: "cloud.sync_pull",
          detail: "Tarik data terbaru dari Supabase ke lokal",
          username,
        });
        toast.success("Sinkronisasi Cloud Berhasil", {
          description: "Data lokal telah diperbarui dengan data terbaru dari cloud.",
        });
      } else {
        toast.error("Gagal Sinkronisasi Cloud", {
          description: res.error || "Terjadi kesalahan saat menarik data.",
        });
      }
    } catch (err) {
      toast.error("Sync Error", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      // Refresh UI after sync completes — data is now in local store
      refresh();
      setIsSyncing(false);
    }
  };

  useEffect(refresh, []);

  // Run healthCheck once on mount to surface connection status
  useEffect(() => {
    healthCheck()
      .then((ok) => {
        (window as unknown as { __SUPABASE_OK__?: boolean }).__SUPABASE_OK__ = ok;
        setConnectionStatus(ok);
      })
      .catch(() => {
        (window as unknown as { __SUPABASE_OK__?: boolean }).__SUPABASE_OK__ = false;
        setConnectionStatus(false);
      });
  }, []);

  useEffect(() => {
    if (!preview) {
      setQrUrl("");
      return;
    }
    const payload = `SURAT|${preview.no}|${preview.nik}|${preview.kode}|${preview.signed_at ?? ""}`;
    // Lazy-load qrcode only when QR preview is needed
    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(payload, { width: 220, margin: 1 }).then(setQrUrl);
    });
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

  /* ---------- Actions (via sync layer) ---------- */
  const verify = async (r: SuratRecord) => {
    if (pendingActions.has(r.no)) return; // Debounce double-click
    setPendingActions((s) => new Set(s).add(r.no));
    const result = await syncSetStatus(r.no, "Diverifikasi", undefined, username);
    refresh();
    if (result.ok) {
      // ⚠️ Gunakan result.record, BUKAN r — r masih punya status lama "Menunggu Verifikasi".
      // notifySurat butuh status terkini agar pesan WA akurat.
      const verified = result.record ?? { ...r, status: "Diverifikasi" as const };
      await logAudit({
        action: "surat.verify",
        detail: `Verifikasi: ${r.no} oleh ${username}`,
        username,
      });
      const notify = await notifySurat(verified, "verify");
      if (notify.ok) toast.success("Diverifikasi & notifikasi WA dikirim", { description: r.no });
      else toast.warning("Diverifikasi OK, WA gagal", { description: notify.message });
    } else {
      toast.error("Gagal menyimpan", { description: result.error });
    }
    setPendingActions((s) => {
      const n = new Set(s);
      n.delete(r.no);
      return n;
    });
  };
  const reject = async (r: SuratRecord, alasan: string) => {
    if (!alasan.trim()) return;
    if (pendingActions.has(r.no)) return;
    setPendingActions((s) => new Set(s).add(r.no));
    const result = await syncSetStatus(r.no, "Ditolak", alasan.trim(), username);
    const updated = { ...r, status: "Ditolak" as const, catatan: alasan.trim() };
    await logAudit({
      action: "surat.reject",
      detail: `Tolak: ${r.no} alasan "${alasan}" oleh ${username}`,
      username,
    });
    await notifySurat(updated, "reject", alasan);
    refresh();
    if (result.ok) toast.success("Pengajuan ditolak", { description: r.no });
    else toast.error("Gagal menolak", { description: result.error });
    setPendingActions((s) => {
      const n = new Set(s);
      n.delete(r.no);
      return n;
    });
  };
  const lanjutApproval = async (r: SuratRecord) => {
    if (pendingActions.has(r.no)) return;
    setPendingActions((s) => new Set(s).add(r.no));
    const result = await syncSetStatus(r.no, "Menunggu Approval", undefined, username);
    refresh();
    if (result.ok) {
      await logAudit({
        action: "surat.forward",
        detail: `Lanjut approval: ${r.no} oleh ${username}`,
        username,
      });
      const updated = { ...r, status: "Menunggu Approval" as const };
      await notifySurat(updated, "forward");
      setPreview(updated);
    } else {
      toast.error("Gagal menyimpan", { description: result.error });
    }
    setPendingActions((s) => {
      const n = new Set(s);
      n.delete(r.no);
      return n;
    });
  };
  const approve = async (r: SuratRecord, signerTitle: string) => {
    if (pendingActions.has(r.no)) return;
    setPendingActions((s) => new Set(s).add(r.no));
    try {
      const tahun = new Date().getFullYear();
      const noSurat = await generateNomorSurat(r.kode, tahun);
      const signed_at = new Date().toISOString();
      const signerName = signerTitle === "Sekretaris Desa"
        ? getSettings().signature.sekdes_name ?? "Sekretaris Desa"
        : getSettings().signature.signer_name;

      // QR signing via Netlify Function — QR_SECRET stays server-side.
      // Falls back to unsigned if the function is unreachable (degraded mode).
      let qrPayload = "";
      try {
        const res = await fetch("/api/sign-surat-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ no: noSurat, nik: r.nik, kode: r.kode, signer: signerTitle }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; raw: string };
          qrPayload = data.raw ?? "";
        }
      } catch {
        // Degraded mode: QR tidak ditandatangani. Verifikasi akan mengembalikan qr_verified=null.
        console.warn("[approve] QR signing failed — using unsigned payload");
      }

      const updated: SuratRecord = {
        ...r,
        tracking_no: r.no,
        no: noSurat,
        status: "Disetujui",
        signed_at,
        signed_by: signerName,
        qr_payload: qrPayload,
        signer_title: signerTitle,
      };
      // Save the official record FIRST — prevents data loss if upsert fails.
      // If save fails, nothing is deleted and the system stays consistent.
      const saveResult = await syncSaveRecord(updated, username);
      if (!saveResult.ok) throw new Error("Gagal simpan surat resmi");
      // Archive the old tracking record only after the official record is confirmed.
      const deleteResult = await syncDeleteRecord(r.no, username);
      if (!deleteResult.ok) {
        console.warn("[approve] Tracking record orphaned:", r.no);
      }
      const archiveResult = await syncArchive(noSurat, username);
      if (!archiveResult.ok) throw new Error("Gagal arsipkan surat");
      await logAudit({
        action: "surat.approve",
        detail: `Approve: ${noSurat} oleh ${username}`,
        username,
      });
      const notify = await notifySurat(updated, "approve");
      refresh();
      setPreview(updated);
      if (notify.ok)
        toast.success("Disetujui & notifikasi WA dikirim", {
          description: "Surat telah ditandatangani dan warga akan menerima notifikasi WhatsApp.",
        });
      else toast.warning("Disetujui, WA gagal", { description: notify.message });
    } catch (e) {
      toast.error("Gagal approve", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setPendingActions((s) => {
        const n = new Set(s);
        n.delete(r.no);
        return n;
      });
    }
  };

  const onCsv = async (file: File) => {
    // Lazy-load papaparse only when CSV import is triggered
    const Papa = await import("papaparse");
    const village = (() => {
      try {
        return getSettings().wilayah;
      } catch {
        return null;
      }
    })();

    const villageFallback = (() => {
      try {
        return getSettings().village;
      } catch {
        return null;
      }
    })();

    Papa.default.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows: Penduduk[] = res.data
          .map((r) => ({
            // ── lokasi
            provinsi: r.provinsi || village?.province || "Nusa Tenggara Barat",
            kabupaten: r.kabupaten || village?.regency || "Lombok Timur",
            kecamatan: r.kecamatan || village?.district || "Pringgabaya",
            desa: r.desa || village?.village || villageFallback?.name || "Desa",
            dusun: r.dusun || "",
            rt: r.rt || "",
            rw: r.rw || "",
            // ── identitas
            nama: r.nama || "",
            jenis_kelamin: (r.jenis_kelamin as Penduduk["jenis_kelamin"]) || "Laki-Laki",
            status_dalam_kk: r.status_dalam_kk || "Anggota",
            no_kk: r.no_kk || "",
            nik: r.nik || "",
            status_perkawinan:
              (r.status_perkawinan as Penduduk["status_perkawinan"]) || "Belum Kawin",
            tempat_lahir: r.tempat_lahir || "",
            tanggal_lahir: r.tanggal_lahir || "",
            pendidikan: r.pendidikan || "",
            pekerjaan: r.pekerjaan || "Tidak Bekerja",
            pendapatan_bulan: r.pendapatan_bulan || "0",
            kewarganegaraan: r.kewarganegaraan || "Indonesia",
            agama: r.agama || "Islam",
            suku: r.suku || "",
            // ── perumahan
            kepemilikan_rumah: r.kepemilikan_rumah || "-",
            luas_rumah: r.luas_rumah || "-",
            jumlah_lantai: r.jumlah_lantai || "-",
            jenis_lantai: r.jenis_lantai || "-",
            jenis_dinding: r.jenis_dinding || "-",
            jenis_atap: r.jenis_atap || "-",
            kepemilikan_tanah: r.kepemilikan_tanah || "-",
            luas_tanah: r.luas_tanah || "-",
            // ── fasilitas
            penerangan: r.penerangan || "-",
            sumber_energi_masak: r.sumber_energi_masak || "-",
            mck: r.mck || "-",
            sumber_air: r.sumber_air || "-",
            // ── sosial
            bantuan_sosial: r.bantuan_sosial || "Tidak",
            bantuan_extra: r.bantuan_extra || "Tidak",
            bpjs_kesehatan: r.bpjs_kesehatan || "Tidak",
            bpjs_ketenagakerjaan: r.bpjs_ketenagakerjaan || "Tidak",
            kepemilikan_aset: r.kepemilikan_aset || "Tidak",
            kondisi_fisik: r.kondisi_fisik || "Normal",
            // ── keluarga
            nama_ibu: r.nama_ibu || "",
            nama_bapak: r.nama_bapak || "",
            golongan_darah: r.golongan_darah || "-",
            // ── opsional
            no_hp: r.no_hp || "",
            alamat: r.alamat || "",
          }))
          .filter((p) => /^\d{16}$/.test(p.nik));
        savePendudukBatch(rows, username).then(({ added, updated, syncOk, syncMessage }) => {
          refresh();
          if (syncOk)
            toast.success(`Imported: +${added} new, ~${updated} updated`, {
              description: syncMessage,
            });
          else
            toast.warning(`Imported: +${added} new, ~${updated} updated`, {
              description: syncMessage,
            });
        });
      },
    });
  };

  const exportArchive = async () => {
    const Papa = await import("papaparse");
    const csv = Papa.default.unparse(
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
    logAudit({
      action: "archive.export",
      detail: `Export arsip surat (${archive.length} record) ke CSV`,
      username,
    });
    toast.success("Arsip diunduh", {
      description: `File CSV arsip dengan ${archive.length} record telah diunduh.`,
    });
  };

  /** Export arsip ke Excel (.xlsx) — lazy-load xlsx only when triggered */
  const exportArchiveExcel = async () => {
    if (archive.length === 0) {
      toast.error("Tidak ada arsip untuk diekspor", {
        description: "Ekspor tidak dapat dilakukan karena belum ada arsip surat.",
      });
      return;
    }
    const { utils, writeFile } = await import("xlsx");
    const rows = archive.map((r) => ({
      "No. Tracking": r.no,
      Kode: r.kode,
      "Jenis Surat": r.nama_surat,
      Pemohon: r.pemohon,
      NIK: r.nik,
      Kontak: r.kontak,
      Status: r.status,
      "Ditandatangani Oleh": r.signed_by ?? "-",
      "Tanggal Ditandatangani": r.signed_at ? new Date(r.signed_at).toLocaleString("id-ID") : "-",
      "Diajukan Pada": new Date(r.created_at).toLocaleString("id-ID"),
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Arsip Surat");
    // Column widths
    ws["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 28 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
    ];
    writeFile(wb, `arsip-surat-${new Date().toISOString().slice(0, 10)}.xlsx`);
    logAudit({
      action: "archive.export_excel",
      detail: `Export ${archive.length} record ke XLSX`,
      username,
    });
    toast.success("Arsip diekspor (.xlsx)", {
      description: `File Excel dengan ${archive.length} record arsip telah diunduh.`,
    });
  };

  /** Export daftar surat (aktif) ke PDF — lazy-load jspdf only when triggered */
  const exportSuratPdf = async () => {
    if (records.length === 0) {
      toast.error("Tidak ada surat untuk diekspor", {
        description: "Ekspor tidak dapat dilakukan karena belum ada surat aktif.",
      });
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DAFTAR PENGAJUAN SURAT", 10, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Dicetak: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })} — Total: ${records.length} surat`,
      10,
      18,
    );
    const headers = [
      "No",
      "No.Tracking",
      "Kode",
      "Jenis Surat",
      "Pemohon",
      "NIK",
      "Status",
      "Diajukan",
    ];
    const colW = [6, 28, 18, 48, 38, 22, 24, 30];
    const rowH = 7;
    let y = 24;
    // Header row
    doc.setFillColor(15, 122, 74);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.rect(
      10,
      y,
      colW.reduce((a, b) => a + b, 0),
      rowH,
      "F",
    );
    let x = 10;
    headers.forEach((h, i) => {
      doc.text(h, x + 2, y + 5);
      x += colW[i];
    });
    y += rowH;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    records.slice(0, 50).forEach((r, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(
          10,
          y,
          colW.reduce((a, b) => a + b, 0),
          rowH,
          "F",
        );
      }
      x = 10;
      const row = [
        String(idx + 1),
        r.no,
        r.kode,
        r.nama_surat,
        r.pemohon,
        r.nik,
        r.status,
        new Date(r.created_at).toLocaleDateString("id-ID"),
      ];
      row.forEach((cell, i) => {
        doc.text(cell.slice(0, colW[i] / 2.5), x + 2, y + 5);
        x += colW[i];
      });
      y += rowH;
    });
    doc.save(`daftar-surat-${new Date().toISOString().slice(0, 10)}.pdf`);
    logAudit({
      action: "surat.export_pdf",
      detail: `Export ${Math.min(records.length, 50)} record ke PDF`,
      username,
    });
    toast.success("PDF diunduh", {
      description: `Daftar ${Math.min(records.length, 50)} surat telah diunduh sebagai PDF.`,
    });
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
                      : view === "penduduk"
                        ? "Data Penduduk"
                        : view === "konten"
                          ? "Konten Website"
                          : view === "audit"
                            ? "Audit Log Aktivitas"
                            : view === "settings"
                              ? "Pengaturan Sistem"
                              : "Pengaturan"}
            </span>
          </nav>

          <div id="admin-content-top" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Cloud connection indicator */}
              {(() => {
                const ok = connectionStatus;
                return (
                  <p className="eyebrow mb-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        ok === false ? "bg-[#E37222]" : ok ? "bg-[#078898]" : "bg-[#EEAA78]"
                      }`}
                      title={
                        ok === false
                          ? "Supabase offline"
                          : ok
                            ? "Cloud sync aktif"
                            : "Memeriksa koneksi..."
                      }
                    />
                    Admin Panel
                  </p>
                );
              })()}
              {session && (
                <span className="opacity-70">
                  · {session.name} ({session.role})
                </span>
              )}
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
                {view === "penduduk" && (
                  <>
                    Data <em className="not-italic text-primary">Penduduk</em>
                  </>
                )}
                {view === "konten" && (
                  <>
                    Konten <em className="not-italic text-primary">Website</em>
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
                {view === "penduduk" &&
                  "Kelola database kependudukan: CRUD, import CSV massal, export data, dan filter multi-kriteria."}
                {view === "konten" &&
                  "Kelola Berita, Agenda, Pengumuman, APBDes, dan Galeri Desa untuk transparansi publik."}
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
                    <RefreshCw className={`h-4 w-4 sm:mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    <span className="hidden md:inline">Muat Ulang</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="hidden sm:inline-flex border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <CloudDownload
                      className={`h-4 w-4 sm:mr-2 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    <span className="hidden md:inline">
                      {isSyncing ? "Syncing..." : "Cloud Sync"}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportSuratPdf}
                    className="hidden sm:inline-flex border-info/30 bg-info/10 text-info hover:bg-info/20"
                    title="Export daftar surat aktif ke PDF"
                  >
                    <FileText className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">PDF Surat</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportArchiveExcel}
                    className="hidden sm:inline-flex border-success/30 bg-success/10 text-success hover:bg-success/20"
                    title="Export arsip surat ke Excel"
                  >
                    <TrendingUp className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">Excel Arsip</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportArchive}
                    className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">CSV Arsip</span>
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
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                        Muat Ulang
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleCloudSync}
                        disabled={isSyncing}
                        className="sm:hidden"
                      >
                        <CloudDownload
                          className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
                        />
                        Cloud Sync
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportSuratPdf} className="sm:hidden">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF Surat Aktif
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportArchiveExcel} className="sm:hidden">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Excel Arsip
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportArchive} className="sm:hidden">
                        <Download className="h-4 w-4 mr-2" />
                        CSV Arsip
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

          {/* Section tabs — role-adaptive */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex rounded-full bg-background/10 border border-background/20 p-1 gap-1">
              <SectionTab
                active={view === "dashboard"}
                onClick={() => setView("dashboard")}
                icon={LayoutDashboard}
                label="Dashboard"
              />
              {can("template.view") && (
                <SectionTab
                  active={view === "templates"}
                  onClick={() => setView("templates")}
                  icon={Files}
                  label="Template Surat"
                />
              )}
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
                active={view === "penduduk"}
                onClick={() => setView("penduduk")}
                icon={Users}
                label="Penduduk"
              />
              <SectionTab
                active={view === "konten"}
                onClick={() => setView("konten")}
                icon={Newspaper}
                label="Konten"
              />
              {can("settings.manage") && (
                <SectionTab
                  active={view === "audit"}
                  onClick={() => setView("audit")}
                  icon={History}
                  label="Audit Log"
                />
              )}
              {can("settings.manage") && (
                <SectionTab
                  active={view === "settings"}
                  onClick={() => setView("settings")}
                  icon={SettingsIcon}
                  label="Pengaturan"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {view === "konten" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <CMSManager />
          </div>
        </section>
      ) : view === "settings" && can("settings.manage") ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <SettingsPanel />
          </div>
        </section>
      ) : view === "audit" && can("settings.manage") ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <AuditLogManager />
          </div>
        </section>
      ) : view === "penduduk" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <PendudukManager username={username} />
          </div>
        </section>
      ) : view === "templates" && can("template.view") ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <TemplateSuratManager username={username} />
          </div>
        </section>
      ) : view === "monitoring" ? (
        <>
          <section className="py-8 px-4 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <MonitoringTable
                records={records}
                onPreview={setPreview}
                onVerify={verify}
                onReject={(r) => setRejectTarget(r)}
                onLanjut={lanjutApproval}
                onApprove={approve}
                onSend={(r) =>
                  sendWaNotification(
                    r.kontak,
                    `Dokumen ${r.nama_surat} (${r.no}) telah dikirim.`,
                  ).then(() => {
                    logAudit({
                      action: "surat.send_wa",
                      detail: `Kirim notifikasi WA ke ${r.pemohon} (${r.kontak}) untuk surat ${r.no}`,
                      username,
                    });
                    toast.success("Dikirim via WA", {
                      description: `Notifikasi WA untuk ${r.pemohon} (${r.no}) telah dikirim.`,
                    });
                  })
                }
              />
            </div>
          </section>
        </>
      ) : view === "archive" ? (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <ArchiveTable
              archive={archive}
              onPreview={setPreview}
              onExport={exportArchive}
              onExportExcel={exportArchiveExcel}
            />
          </div>
        </section>
      ) : (
        <section className="py-8 px-4 sm:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Peringatan Dini */}
            <AlertPanel />

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
                hint={pendIsMock ? "Data Simulasi — Import CSV untuk data asli" : "Entri NIK aktif"}
                tone={pendIsMock ? "warning" : "info"}
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
                  {pendIsMock && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-xs font-semibold">
                      <AlertCircle className="h-3 w-3" /> Data Simulasi
                    </span>
                  )}
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1 max-w-2xl">
                  {pendCount} entri{pendIsMock ? " simulasi" : " aktif"}. Import CSV dengan kolom:
                  nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, status_perkawinan,
                  pekerjaan, alamat, rt, rw, dusun, no_kk, no_hp.
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
              <div className="space-y-5" id="monitoring-top">
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
                              {r.pemohon} · NIK {maskNik(r.nik)} · {maskPhone(r.kontak)}
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
                                    onClick={() => setRejectTarget(r)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Tolak
                                  </Button>
                                );
                              if (a === "surat.send")
                                return (
                                  <Button
                                    key={a}
                                    size="sm"
                                    onClick={() => {
                                      sendWaNotification(
                                        r.kontak,
                                        `Dokumen ${r.nama_surat} (${r.no}) telah dikirim.`,
                                      ).then(() => {
                                        logAudit({
                                          action: "surat.send_wa",
                                          detail: `Kirim notifikasi WA ke ${r.pemohon} (${r.kontak}) untuk surat ${r.no}`,
                                          username,
                                        });
                                        toast.success("Dikirim via WA", {
                                          description: `Notifikasi WA untuk ${r.pemohon} (${r.no}) telah dikirim.`,
                                        });
                                      });
                                    }}
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
                    <h3 className="font-display text-lg font-bold">Preview Surat</h3>
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
                    <div className="space-y-3">
                      <SuratPreviewPanel
                        preview={preview}
                        onVerify={verify}
                        onReject={reject}
                        onLanjut={lanjutApproval}
                        onApprove={(r, signerTitle) => approve(r, signerTitle)}
                      />
                      {preview.status === "Disetujui" && qrUrl && (
                        <div className="flex flex-col items-center mt-4">
                          <img
                            src={qrUrl}
                            alt="QR"
                            className="w-14 h-14 border border-border rounded"
                          />
                          <p className="text-[10px] text-muted-foreground mt-0.5">QR e-sign</p>
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

      {/* Rejection modal — triggered by both dashboard inline buttons and MonitoringTable */}
      <RejectionModal
        open={!!rejectTarget}
        record={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(alasan: string) => {
          if (rejectTarget) reject(rejectTarget, alasan);
          setRejectTarget(null);
        }}
      />

      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

/** Mask NIK — 4 digit awal + ●● + 4 digit akhir (UU PDP compliance) */
function maskNik(nik: string): string {
  if (!nik || nik.length < 8) return nik ?? "";
  return nik.slice(0, 4) + "●".repeat(nik.length - 8) + nik.slice(-4);
}

/** Mask phone number — 4 digit akhir only */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone ?? "";
  return "●●●●" + phone.slice(-4);
}

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
                <th className="text-left px-4 py-3">Sync</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Belum ada pengajuan.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const acts = suratActionsFor(r.status);
                  return (
                    <tr
                      key={r.no}
                      className="border-t border-border hover:bg-muted/30 transition cursor-pointer"
                      onClick={() => onPreview(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-muted-foreground">#{r.no}</div>
                        <div className="text-[11px] font-bold text-primary">{r.kode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-ui font-semibold">{r.pemohon}</div>
                        <div className="text-xs text-muted-foreground">NIK {maskNik(r.nik)}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">{r.nama_surat}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {fmtRelative(r.created_at)}
                      </td>
                      {/* Sync status — dot indicator */}
                      <td className="px-4 py-3">
                        {r.cloudSynced === true ? (
                          <div
                            title="Tersimpan di server"
                            className="flex items-center justify-center"
                          >
                            <div className="h-2 w-2 rounded-full bg-success" />
                          </div>
                        ) : r.cloudSynced === false ? (
                          <div
                            title="Hanya tersimpan lokal"
                            className="flex items-center justify-center"
                          >
                            <div className="h-2 w-2 rounded-full bg-warning" />
                          </div>
                        ) : (
                          <div
                            title="Status sync belum diketahui"
                            className="flex items-center justify-center"
                          >
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreview(r);
                            }}
                          >
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
                                  onClick={() => { setPreview(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                  className="bg-success hover:bg-success/90 text-background"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Approve
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
  onExportExcel,
}: {
  archive: SuratRecord[];
  onPreview: (r: SuratRecord) => void;
  onExport: () => void;
  onExportExcel: () => void;
}) {
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = archive.filter((r) => {
      if (!r.signed_at) return false;
      const d = new Date(r.signed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisYear = archive.filter((r) => {
      if (!r.signed_at) return false;
      return new Date(r.signed_at).getFullYear() === now.getFullYear();
    });
    return {
      total: archive.length,
      bulanIni: thisMonth.length,
      tahunIni: thisYear.length,
    };
  }, [archive]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return archive;
    return archive.filter((r) =>
      [r.no, r.tracking_no, r.nama_surat, r.pemohon, r.nik].some((v) =>
        (v ?? "").toLowerCase().includes(s),
      ),
    );
  }, [archive, q]);

  const downloadLink = async (r: SuratRecord) => {
    // Generate PDF: edge function returns JSON → client generates PDF via jsPDF
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no: r.no }),
      });
      if (!res.ok) throw new Error("Gagal fetch data surat");
      const { surat, warga, settings } = await res.json();
      const pdfBytes = await generateSuratPdf({ surat, warga, settings, includeQr: false });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.kode}_${r.no}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mengunduh PDF", {
        description: "Tidak dapat mengunduh PDF arsip. Coba lagi nanti.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" /> Arsip Surat Keluar
          </h2>
          <div className="flex flex-wrap gap-4 mt-1">
            <p className="font-body text-sm text-muted-foreground">{stats.total} total arsip</p>
            <p className="font-body text-sm text-muted-foreground">· {stats.bulanIni} bulan ini</p>
            <p className="font-body text-sm text-muted-foreground">
              · {stats.tahunIni} tahun {new Date().getFullYear()}
            </p>
          </div>
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
          <Button
            size="sm"
            onClick={onExportExcel}
            className="bg-success hover:bg-success/90 text-background hidden sm:inline-flex"
          >
            <TrendingUp className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button size="sm" onClick={onExport} className="bg-primary hover:bg-primary-hover">
            <Download className="h-4 w-4 mr-1.5" /> CSV
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
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Belum ada surat keluar.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.no}
                    className="border-t border-border hover:bg-muted/30 transition cursor-pointer"
                    onClick={() => onPreview(r)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{r.no}</td>
                    <td className="px-4 py-3">
                      <div className="font-ui font-semibold">{r.nama_surat}</div>
                      <div className="text-[11px] font-bold text-primary">{r.kode}</div>
                      {r.attachments && r.attachments.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {r.attachments.length} lampiran
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      {r.pemohon} <span className="text-muted-foreground">· {maskNik(r.nik)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">{r.signed_by ?? "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {r.signed_at ? new Date(r.signed_at).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(r);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => downloadLink(r)}
                          className="bg-primary hover:bg-primary-hover"
                          title="Unduh PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
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
