/**
 * PengajuanSaya — "Pengajuan Saya" page for logged-in warga.
 *
 * Shows ONLY records belonging to the currently logged-in warga,
 * filtered by warga_id from the warga session.
 * Accessible at /masuk/pengajuan-saya — requires warga login.
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
import { getSettings, useSettings } from "@/lib/settings-store";
import {
  ArrowLeft,
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
} from "lucide-react";
import { toast } from "sonner";

type TabFilter = "aktif" | "arsip";

const STATUSES = [
  {
    key: "Menunggu Verifikasi",
    icon: Clock,
    color: "text-warning bg-warning/10 border-warning/30",
  },
  { key: "Diverifikasi", icon: ShieldCheck, color: "text-info bg-info/10 border-info/30" },
  {
    key: "Menunggu Approval",
    icon: FileSignature,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  { key: "Disetujui", icon: CheckCircle2, color: "text-success bg-success/10 border-success/30" },
  {
    key: "Ditolak",
    icon: XCircle,
    color: "text-destructive bg-destructive/10 border-destructive/30",
  },
];

export default function PengajuanSaya() {
  const { village } = useSettings();
  const navigate = useNavigate();
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [archive, setArchive] = useState<SuratRecord[]>([]);
  const [tab, setTab] = useState<TabFilter>("aktif");
  const [refreshing, setRefreshing] = useState(false);

  // Guard: harus login warga
  useEffect(() => {
    if (!isWargaLoggedIn()) {
      navigate({ to: "/masuk/warga" });
    }
  }, [navigate]);

  const session = getWargaSession();
  const wargaId = session?.warga?.id;
  const wargaName = session?.warga?.nama ?? "Warga";

  const load = () => {
    setRecords(listRecords());
    setArchive(listArchive());
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWargaSession();
    load();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logoutWarga();
    toast.success("Berhasil keluar");
    navigate({ to: "/masuk/warga" });
  };

  // Filter records to only those belonging to this warga
  const myRecords = useMemo(
    () => records.filter((r) => r.warga_id === wargaId),
    [records, wargaId],
  );

  const myArchive = useMemo(
    () => archive.filter((r) => r.warga_id === wargaId),
    [archive, wargaId],
  );

  const activeRecords = useMemo(
    () => myRecords.filter((r) => r.status !== "Disetujui"),
    [myRecords],
  );

  const approvedRecords = useMemo(
    () => [...myRecords.filter((r) => r.status === "Disetujui"), ...myArchive],
    [myRecords, myArchive],
  );

  const displayRecords = tab === "aktif" ? activeRecords : approvedRecords;

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUSES.find((s) => s.key === status) ?? STATUSES[0];
    const Icon = cfg.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-ui font-semibold border ${cfg.color}`}
      >
        <Icon className="h-3 w-3" /> {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-base font-bold">
              {village.name[0]}
            </div>
            <div>
              <div className="font-display text-sm font-bold leading-tight">{village.name}</div>
              <div className="font-ui text-[10px] text-muted-foreground">Sistem Informasi Desa</div>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Beranda
          </Link>
        </div>
      </header>

      {/* Warga identity bar */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ui text-[10px] text-muted-foreground uppercase tracking-wider">
              Pengajuan Saya
            </p>
            <p className="font-display text-base font-bold truncate">{wargaName}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              NIK {session?.warga?.nik ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive font-ui text-xs font-semibold hover:bg-destructive/10 transition flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Quick action */}
        <Link
          to="/pelayanan/e-surat"
          className="flex items-center justify-between h-14 px-5 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary-hover transition shadow-card"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajukan Surat Baru
          </span>
          <span>→</span>
        </Link>

        {/* Tab: Aktif / Selesai */}
        <div className="flex items-center gap-1.5">
          {(["aktif", "arsip"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center h-9 px-4 rounded-full text-xs font-ui font-semibold transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "aktif" ? "Aktif" : "Selesai"}
              <span
                className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  tab === t
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {t === "aktif" ? activeRecords.length : approvedRecords.length}
              </span>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {displayRecords.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-display text-xl font-bold mt-4">
              {tab === "aktif" ? "Tidak ada pengajuan aktif" : "Belum ada surat disetujui"}
            </h3>
            <p className="font-body text-muted-foreground mt-2 max-w-sm mx-auto">
              {tab === "aktif"
                ? "Ajukan surat pertama Anda — prosesnya hanya 5 menit."
                : "Surat yang sudah disetujui akan muncul di sini."}
            </p>
            {tab === "aktif" && (
              <Link
                to="/pelayanan/e-surat"
                className="inline-flex mt-6 btn-pill bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Ajukan Sekarang
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayRecords.map((r) => (
              <div
                key={r.no}
                className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elev transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-ui text-[11px] font-bold text-primary tracking-widest">
                        {r.kode}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">#{r.no}</span>
                    </div>
                    <h3 className="font-display text-base font-bold">{r.nama_surat}</h3>
                    <p className="font-body text-sm text-muted-foreground mt-0.5">{r.pemohon}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Progress timeline */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {STATUSES.slice(0, 4).map((s, i) => {
                      const currentIdx = STATUSES.findIndex((x) => x.key === r.status);
                      const done = i <= currentIdx && r.status !== "Ditolak";
                      const Icon = s.icon;
                      return (
                        <div key={s.key} className="flex items-center gap-1 shrink-0">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? "bg-success text-background" : "bg-muted text-muted-foreground"}`}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <span
                            className={`font-ui text-[10px] hidden sm:inline ${done ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                          >
                            {s.key}
                          </span>
                          {i < 3 && (
                            <div
                              className={`h-px w-3 sm:w-6 ${done ? "bg-success" : "bg-border"}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-ui text-[11px] text-muted-foreground">
                    Diajukan:{" "}
                    {new Date(r.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {r.no && (
                    <Link
                      to="/verifikasi/$no"
                      params={{ no: r.no }}
                      className="font-ui text-[11px] text-primary font-semibold hover:underline"
                    >
                      Lihat & Verifikasi →
                    </Link>
                  )}
                </div>

                {/* Catatan dari admin */}
                {r.catatan && (
                  <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="font-ui text-[11px] text-muted-foreground mb-1">Catatan:</p>
                    <p className="font-ui text-xs">{r.catatan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-2">
          <Link to="/pelayanan/e-surat" className="btn-pill bg-ink text-background hover:bg-ink/90">
            + Ajukan Surat Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
