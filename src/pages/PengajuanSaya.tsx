/**
 * PengajuanSaya — Redesigned 2025
 *
 * Dashboard warga yang login: pantau semua pengajuan surat.
 * Fitur: stats ringkasan, progress timeline, notifikasi WA timeline, quick actions.
 *
 * Tidak perlu login manual — warga OTOMATIS ter-login via OTP session.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  isWargaLoggedIn,
  getWargaSession,
  logoutWarga,
  refreshWargaSession,
} from "@/lib/warga-auth";
import { listRecords, listArchive, type SuratRecord } from "@/lib/esurat-store";
import { initEsuratStore, syncPullAllRecords } from "@/lib/useSupabaseSync";
import { maskNik, maskPhone } from "@/lib/utils";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import {
  CheckCircle2,
  Clock,
  FileSignature,
  ShieldCheck,
  XCircle,
  LogOut,
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Bell,
  MessageSquare,
  FileCheck,
  Search,
  ChevronRight,
  WifiOff,
  User,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type TabFilter = "aktif" | "selesai";

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
  }
> = {
  "Menunggu Verifikasi": {
    icon: <Clock className="h-4 w-4" />,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  Diverifikasi: {
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
  },
  "Menunggu Approval": {
    icon: <FileSignature className="h-4 w-4" />,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  Disetujui: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  Ditolak: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
};

const STATUS_STEPS = ["Menunggu Verifikasi", "Diverifikasi", "Menunggu Approval", "Disetujui"];

export default function PengajuanSaya() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [archive, setArchive] = useState<SuratRecord[]>([]);
  const [tab, setTab] = useState<TabFilter>("aktif");
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Guard: harus login warga
  useEffect(() => {
    if (!isWargaLoggedIn()) {
      navigate({ to: "/masuk/warga" });
    }
  }, [navigate]);

  const session = getWargaSession();
  const wargaId = session?.warga?.id;
  const wargaNik = session?.warga?.nik ?? "—";
  const wargaName = session?.warga?.nama ?? "Warga";

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const load = () => {
    setRecords(listRecords());
    setArchive(listArchive());
  };

  useEffect(() => {
    let mounted = true;
    initEsuratStore()
      .then(() => syncPullAllRecords())
      .then(() => {
        if (mounted) load();
      })
      .catch((err) => {
        if (mounted) load();
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWargaSession();
    load();
    setRefreshing(false);
    toast.success("Data diperbarui");
  };

  const handleLogout = () => {
    logoutWarga();
    toast.success("Berhasil keluar dari sesi warga");
    navigate({ to: "/masuk/warga" });
  };

  const myRecords = useMemo(
    () => records.filter((r) => r.warga_id === wargaId),
    [records, wargaId],
  );
  const myArchive = useMemo(
    () => archive.filter((r) => r.warga_id === wargaId),
    [archive, wargaId],
  );
  const activeRecords = useMemo(
    () => myRecords.filter((r) => r.status !== "Disetujui" && r.status !== "Ditolak"),
    [myRecords],
  );
  const prosesRecords = useMemo(
    () => myRecords.filter((r) => r.status !== "Disetujui" && r.status !== "Ditolak"),
    [myRecords],
  );
  const selesaiRecords = useMemo(
    () => [...myRecords.filter((r) => r.status === "Disetujui"), ...myArchive],
    [myRecords, myArchive],
  );
  const displayRecords = tab === "aktif" ? prosesRecords : selesaiRecords;

  const stats = useMemo(
    () => ({
      total: myRecords.length + myArchive.length,
      aktif: prosesRecords.length,
      selesai: selesaiRecords.length,
      menunggu: myRecords.filter((r) => r.status === "Menunggu Verifikasi").length,
      diverifikasi: myRecords.filter((r) => r.status === "Diverifikasi").length,
      approval: myRecords.filter((r) => r.status === "Menunggu Approval").length,
    }),
    [myRecords, myArchive, prosesRecords, selesaiRecords],
  );

  function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Menunggu Verifikasi"];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
      >
        {cfg.icon}
        {status}
      </span>
    );
  }

  function ProgressTimeline({ status }: { status: string }) {
    const currentIdx = STATUS_STEPS.indexOf(status);
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {STATUS_STEPS.map((s, i) => {
          const done = i <= currentIdx && status !== "Ditolak";
          const rejected = status === "Ditolak" && i === currentIdx;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center font-ui text-xs font-bold transition-all ${
                  done
                    ? "bg-success text-background shadow-sm"
                    : rejected
                      ? "bg-destructive text-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : rejected ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`h-1 w-6 rounded-full shrink-0 ${done ? "bg-success" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function NotifTimeline({ record }: { record: SuratRecord }) {
    const steps = [
      {
        label: "Pengajuan dikirim",
        ts: record.created_at,
        sent: true,
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        color: "text-info",
      },
      {
        label: "Diverifikasi",
        ts: record.verified_at,
        sent: !!record.verified_at,
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        color: "text-info",
      },
      {
        label: "Disetujui",
        ts: record.approved_at,
        sent: !!record.approved_at,
        icon: <FileCheck className="h-3.5 w-3.5" />,
        color: "text-success",
      },
      {
        label: "Ditolak",
        ts: record.updated_at,
        sent: record.status === "Ditolak",
        icon: <XCircle className="h-3.5 w-3.5" />,
        color: "text-destructive",
      },
    ];

    const relevant = steps.filter((s) => {
      if (s.label === "Diverifikasi") return record.status !== "Menunggu Verifikasi";
      if (s.label === "Disetujui") return record.status === "Disetujui";
      if (s.label === "Ditolak") return record.status === "Ditolak";
      return true;
    });

    return (
      <div className="mt-4 pt-4 border-t border-border">
        <p className="font-ui text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Riwayat Notifikasi WA
        </p>
        <div className="space-y-2">
          {relevant.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${s.sent ? s.color : "text-muted-foreground bg-muted"}`}
              >
                {s.icon}
              </div>
              <div className="flex-1">
                <p
                  className={`font-ui text-xs font-semibold ${s.sent ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </p>
                {s.ts && s.sent && (
                  <p className="font-ui text-[10px] text-muted-foreground">
                    {new Date(s.ts).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              {s.sent ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── OFFLINE BANNER ── */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/15 border-b border-warning/30 text-warning text-xs font-ui font-semibold">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Offline — menggunakan data tersimpan lokal.</span>
        </div>
      )}

      {/* ── WARGA HEADER ── */}
      <div className="bg-gradient-to-r from-primary/8 via-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                <User className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="font-ui text-[10px] text-primary font-bold uppercase tracking-wider">
                  Dashboard Warga
                </p>
                <p className="font-display text-xl font-bold text-foreground truncate">
                  {wargaName}
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  NIK {maskNik(wargaNik)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleLogout}
                className="h-10 px-3.5 rounded-xl border border-destructive/30 text-destructive font-ui text-xs font-bold hover:bg-destructive/10 transition flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center">
            <p className="font-ui text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Total
            </p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {stats.total}
            </p>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3 sm:p-4 text-center">
            <p className="font-ui text-[10px] text-warning uppercase tracking-wider mb-1">Aktif</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-warning">
              {stats.aktif}
            </p>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-3 sm:p-4 text-center">
            <p className="font-ui text-[10px] text-success uppercase tracking-wider mb-1">
              Selesai
            </p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-success">
              {stats.selesai}
            </p>
          </div>
          <div className="rounded-2xl border border-info/30 bg-info/5 p-3 sm:p-4 text-center">
            <p className="font-ui text-[10px] text-info uppercase tracking-wider mb-1">Proses</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-info">
              {stats.approval}
            </p>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/pelayanan/e-surat"
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-bold hover:bg-primary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Ajukan Surat Baru
          </Link>
          <Link
            to="/pelayanan/lacak"
            className="flex-1 h-14 rounded-2xl border-2 border-border bg-card text-foreground font-ui text-sm font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            Lacak Pengajuan
          </Link>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-2">
          {(["aktif", "selesai"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center h-10 px-5 rounded-xl text-sm font-ui font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                tab === t
                  ? "bg-ink text-background shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "aktif" ? "📋 Aktif" : "✅ Selesai"}
              <span
                className={`ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold ${
                  tab === t ? "bg-background/20 text-background" : "bg-ink text-background"
                }`}
              >
                {t === "aktif" ? prosesRecords.length : selesaiRecords.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── EMPTY STATE ── */}
        {displayRecords.length === 0 ? (
          <div className="text-center py-14 rounded-3xl border border-dashed border-border bg-card space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileText className="h-10 w-10 text-primary/50" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">
                {tab === "aktif" ? "Belum ada pengajuan aktif" : "Belum ada surat selesai"}
              </h3>
              <p className="font-body text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                {tab === "aktif"
                  ? "Ajukan surat pertama Anda — cukup 2 menit dengan NIK saja!"
                  : "Surat yang sudah disetujui akan muncul di sini."}
              </p>
            </div>
            {tab === "aktif" && (
              <Link
                to="/pelayanan/e-surat"
                className="inline-flex h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-ui font-bold hover:bg-primary transition-all shadow-md items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Plus className="h-5 w-5" />
                Ajukan Sekarang
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayRecords.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["Menunggu Verifikasi"];
              return (
                <div
                  key={r.no}
                  className="rounded-2xl border-2 border-border bg-card shadow-card overflow-hidden hover:shadow-elev transition-all"
                >
                  {/* Card header */}
                  <div
                    className={`px-5 py-3.5 bg-gradient-to-r ${cfg.bg} border-b border-border flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cfg.color}>{cfg.icon}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{r.no.slice(0, 18)}
                      </span>
                      {r.status === "Disetujui" && (
                        <Link
                          to="/verifikasi/$no"
                          params={{ no: r.no }}
                          className="h-8 px-3 rounded-lg bg-success text-background font-ui text-xs font-bold hover:bg-success/90 transition flex items-center gap-1"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Unduh</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Surat info */}
                    <div>
                      <p className="font-ui text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
                        {r.kode}
                      </p>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {r.nama_surat}
                      </h3>
                      <p className="font-body text-sm text-muted-foreground mt-0.5">{r.pemohon}</p>
                    </div>

                    {/* Progress */}
                    <div>
                      <p className="font-ui text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
                        Progress
                      </p>
                      <ProgressTimeline status={r.status} />
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                      <p className="font-ui text-[11px] text-muted-foreground">
                        Diajukan:{" "}
                        {new Date(r.created_at).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <Link
                        to="/pelayanan/lacak"
                        search={{ q: r.no }}
                        className="font-ui text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        Lacak <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Edit button */}
                    {["Menunggu Verifikasi", "Diverifikasi"].includes(r.status) && (
                      <div className="pt-2 border-t border-border">
                        <button
                          onClick={() =>
                            navigate({ to: "/masuk/edit-surat", search: { no: r.no } })
                          }
                          className="w-full h-11 rounded-xl bg-info/10 text-info font-ui text-sm font-bold hover:bg-info/20 transition border border-info/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Koreksi / Edit Pengajuan
                        </button>
                      </div>
                    )}

                    {/* Catatan admin */}
                    {r.catatan && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20">
                        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="font-ui text-[10px] font-bold text-warning uppercase tracking-wider mb-1">
                            Catatan Admin
                          </p>
                          <p className="font-body text-sm text-foreground">{r.catatan}</p>
                        </div>
                      </div>
                    )}

                    {/* Notifikasi timeline */}
                    <NotifTimeline record={r} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        <div className="text-center pt-2">
          <Link
            to="/pelayanan/e-surat"
            className="inline-flex h-12 px-8 rounded-2xl bg-ink text-background font-ui font-bold hover:bg-ink/90 transition-all shadow-md items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" />
            Ajukan Surat Baru
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
