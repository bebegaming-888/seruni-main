import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/Link";

import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  CheckCircle2,
  FileText,
  ArrowLeft,
  ShieldCheck,
  XCircle,
  FileSignature,
  WifiOff,
  Cloud,
  HardDrive,
  ListFilter,
  Timer,
  TrendingUp,
  Users,
  FileCheck,
  X,
  Inbox,
  Zap,
  BarChart3,
  Activity,
  RefreshCw,
} from "lucide-react";

import { initEsuratStore, searchSuratRequests, syncPullAllRecords } from "@/lib/useSupabaseSync";
import {
  listRecords,
  listArchive,
  statsByStatus,
  oldestPending,
  type SuratRecord,
  fetchEstimasi,
  fmtEstimasi,
} from "@/lib/esurat-store";
import { getOfflineQueue, hasOfflineQueueItems, type OfflineSubmission } from "@/lib/offline-queue";
import { Loader2 } from "lucide-react";

type TabFilter = "semua" | "lokal" | "server" | "offline";

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

export default function MonitoringSurat() {
  const initialNo =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("no") ?? "")
      : "";
  const [q, setQ] = useState(initialNo);
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloudRecords, setCloudRecords] = useState<SuratRecord[]>([]);
  const [tab, setTab] = useState<TabFilter>("semua");
  const [offlineItems, setOfflineItems] = useState<OfflineSubmission[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [estimasi, setEstimasi] = useState<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    initEsuratStore()
      .then(() => syncPullAllRecords())
      .then(() => {
        if (mounted) setRecords(listRecords());
      })
      .catch((err) => {
        console.warn("[MonitoringSurat] Gagal load records:", err);
        if (mounted) setRecords(listRecords());
      });
    hasOfflineQueueItems().then((has) => setOfflineCount(has ? 1 : 0));
    getOfflineQueue().then((items) => {
      if (mounted) {
        setOfflineItems(items);
        setOfflineCount(items.length);
      }
    });
    fetchEstimasi().then((data) => {
      if (mounted) setEstimasi(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time stats from esurat-store
  // Note: statsByStatus() and oldestPending() have internal caching, no need to memoize
  const stats = useMemo(() => statsByStatus(), []);
  const pending = useMemo(() => oldestPending(), []);
  const totalActive = records.length;
  const totalArchive = listArchive().length;
  const totalAll = totalActive + totalArchive;
  const pendingCount = (stats["Menunggu Verifikasi"] ?? 0) + (stats["Menunggu Approval"] ?? 0);

  // Quick stats for sidebar
  const StatCard = ({
    label,
    value,
    color,
    icon: Icon,
  }: {
    label: string;
    value: number;
    color: string;
    icon: React.ElementType;
  }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-ui text-2xl font-bold">{value}</p>
        <p className="font-ui text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  // Oldest pending items
  const OldestCard = ({ r, idx }: { r: SuratRecord; idx: number }) => (
    <Link
      key={r.no}
      to={`/lacak?no=${r.no}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors group"
    >
      <div className="h-8 w-8 rounded-full bg-warning/20 text-warning flex items-center justify-center shrink-0 text-xs font-bold">
        {idx + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-ui text-xs font-semibold truncate">{r.nama_surat}</p>
        <p className="font-ui text-[10px] text-muted-foreground">
          {r.pemohon} · {r.status}
        </p>
      </div>
      <div className="text-[10px] font-ui text-muted-foreground shrink-0">
        {Math.round((Date.now() - new Date(r.created_at).getTime()) / 86400000)}d
      </div>
    </Link>
  );

  // Sync status summary
  const syncedCount = records.filter((r) => r.cloudSynced === true).length;
  const localCount = records.filter((r) => r.cloudSynced !== true).length;

  const filtered = useMemo(() => {
    const all = [...records];
    cloudRecords.forEach((cr) => {
      if (!all.find((r) => r.no === cr.no)) all.push(cr);
    });

    if (!q.trim()) return all;
    const s = q.toLowerCase();
    return all.filter((r) =>
      [r.no, r.nama_surat, r.pemohon, r.nik].some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [q, records, cloudRecords]);

  const filteredByTab = useMemo(() => {
    if (tab === "lokal") return filtered.filter((r) => r.cloudSynced !== true);
    if (tab === "server") return filtered.filter((r) => r.cloudSynced === true);
    return filtered;
  }, [filtered, tab]);

  const EstimasiBadge = ({ kode }: { kode: string }) => {
    const jam = estimasi[kode];
    if (!jam) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-ui font-medium text-muted-foreground">
        <Timer className="h-3 w-3" />
        {fmtEstimasi(jam)}
      </span>
    );
  };

  const filteredOffline = useMemo(() => {
    if (!q.trim()) return offlineItems;
    const s = q.toLowerCase();
    return offlineItems.filter((item) => {
      const data = item.data as Record<string, unknown>;
      return [data.no, data.nama_surat, data.pemohon, data.nik].some((v) =>
        ((v as string) ?? "").toLowerCase().includes(s),
      );
    });
  }, [q, offlineItems]);

  useEffect(() => {
    if (q.length < 4) {
      setCloudRecords([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchSuratRequests(q);
      setCloudRecords(res);
      setLoading(false);
    }, 800);

    return () => clearTimeout(t);
  }, [q]);

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

  const SyncDot = ({ synced }: { synced?: boolean }) => {
    if (synced === true)
      return (
        <span
          title="Tersimpan di server"
          className="inline-block h-2 w-2 rounded-full bg-success shrink-0"
        />
      );
    if (synced === false)
      return (
        <span
          title="Simpan lokal — belum tersinkron ke server"
          className="inline-block h-2 w-2 rounded-full bg-warning shrink-0"
        />
      );
    return (
      <span
        title="Status sinkronisasi belum diketahui"
        className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0"
      />
    );
  };

  const TABS: { key: TabFilter; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "semua", label: "Semua", icon: ListFilter },
    { key: "lokal", label: "Lokal", icon: HardDrive, count: localCount || undefined },
    { key: "server", label: "Server", icon: Cloud, count: syncedCount || undefined },
    {
      key: "offline",
      label: "Offline",
      icon: WifiOff,
      count: offlineCount > 0 ? offlineCount : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHero
        titleFirst="Lacak"
        titleSecond="Pengajuan"
        description="Pantau status setiap permohonan surat secara real-time."
        badge="Monitoring"
        badgeIcon={<Search className="h-3.5 w-3.5" />}
      />

      {/* Mobile sidebar toggle */}
      <div className="py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex gap-6">
          {/* Sidebar */}
          <aside
            className={`
              fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border shadow-xl
              transform transition-transform duration-300 ease-in-out
              flex flex-col
              ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
              sm:relative sm:translate-x-0 sm:z-auto sm:shadow-none sm:border-l sm:border-border
              sm:w-64 sm:shrink-0
              hidden sm:flex flex-col
              top-0
            `}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-bold">Statistik</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Tutup statistik"
                className="min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Total summary */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span className="font-ui text-[10px] font-semibold text-primary tracking-widest uppercase">
                    Ringkasan
                  </span>
                </div>
                <p className="font-display text-4xl font-bold text-foreground">{totalAll}</p>
                <p className="font-ui text-xs text-muted-foreground mt-0.5">Total pengajuan</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="text-center">
                    <p className="font-ui text-lg font-bold">{totalActive}</p>
                    <p className="font-ui text-[10px] text-muted-foreground">Aktif</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="font-ui text-lg font-bold">{totalArchive}</p>
                    <p className="font-ui text-[10px] text-muted-foreground">Arsip</p>
                  </div>
                </div>
              </div>

              {/* Per-status breakdown */}
              <div>
                <p className="font-ui text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                  Per Status
                </p>
                <div className="space-y-1.5">
                  {STATUSES.map((s) => {
                    const Icon = s.icon;
                    const count = stats[s.key as keyof typeof stats] ?? 0;
                    const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
                    return (
                      <div
                        key={s.key}
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition"
                      >
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-ui text-xs truncate">{s.key}</span>
                            <span className="font-ui text-xs font-bold shrink-0 ml-1">{count}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending alert */}
              {pendingCount > 0 && (
                <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 text-warning" />
                    <span className="font-ui text-[10px] font-bold text-warning tracking-widest uppercase">
                      Butuh Tindakan
                    </span>
                  </div>
                  <p className="font-display text-2xl font-bold">{pendingCount}</p>
                  <p className="font-ui text-[10px] text-muted-foreground">menunggu diproses</p>
                </div>
              )}

              {/* Oldest pending */}
              {pending.length > 0 && (
                <div>
                  <p className="font-ui text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Paling Lama
                  </p>
                  <div className="space-y-1.5">
                    {pending.slice(0, 5).map((r, i) => (
                      <OldestCard key={r.no} r={r} idx={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sync status */}
              <div className="rounded-2xl border border-border p-3">
                <p className="font-ui text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                  Sinkronisasi
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="font-ui text-xs">{syncedCount} server</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <span className="font-ui text-xs">{localCount} lokal</span>
                  </div>
                </div>
                {offlineCount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-warning">
                    <WifiOff className="h-3 w-3" />
                    <span className="font-ui text-[10px]">{offlineCount} antri offline</span>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 sm:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile stats bar */}
            <div className="sm:hidden mb-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-ui text-sm font-bold">{totalAll}</span>
                  <span className="font-ui text-xs text-muted-foreground">total</span>
                </div>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="font-ui text-sm font-bold">{pendingCount}</span>
                  <span className="font-ui text-xs text-muted-foreground">pending</span>
                </div>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-ui text-sm font-bold">{stats["Disetujui"] ?? 0}</span>
                  <span className="font-ui text-xs text-muted-foreground">selesai</span>
                </div>
              </div>
            </div>

            {/* Mobile sidebar toggle button */}
            <div className="flex items-center justify-between mb-4 sm:hidden">
              <p className="font-ui text-xs text-muted-foreground">
                {filteredByTab.length} pengajuan
              </p>
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Buka statistik"
                className="min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-ui font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <BarChart3 className="h-4 w-4" />
                Statistik
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari no. tracking atau NIK..."
                className="pl-12 h-14 text-base rounded-2xl"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Tab filter */}
            <div className="flex items-center gap-1.5 flex-wrap mt-4">
              {TABS.map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-ui font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    tab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                        tab === key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="mt-6">
              {tab === "offline" ? (
                <OfflineQueuePanel items={filteredOffline} q={q} />
              ) : filteredByTab.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h3 className="font-display text-xl font-bold mt-4">
                    {tab === "lokal"
                      ? "Tidak ada pengajuan lokal"
                      : tab === "server"
                        ? "Tidak ada pengajuan di server"
                        : "Belum ada pengajuan"}
                  </h3>
                  <p className="font-body text-muted-foreground mt-2 max-w-sm mx-auto">
                    {tab === "lokal"
                      ? "Semua pengajuan sudah tersinkron ke server."
                      : tab === "server"
                        ? "Pastikan Supabase sudah dikonfigurasi untuk mencari di server."
                        : "Mulai ajukan surat pertama Anda — prosesnya hanya 5 menit."}
                  </p>
                  {tab === "semua" && (
                    <Link
                      to="/pelayanan/e-surat"
                      className="inline-flex mt-6 btn-pill bg-primary text-primary-foreground hover:bg-primary"
                    >
                      Ajukan Surat
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredByTab.map((r) => (
                    <div
                      key={r.no}
                      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card hover:shadow-elev transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <SyncDot synced={r.cloudSynced} />
                            <span className="font-ui text-[11px] font-bold text-primary tracking-widest">
                              {r.kode}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">#{r.no}</span>
                            <EstimasiBadge kode={r.kode} />
                          </div>
                          <h3 className="font-display text-lg font-bold">{r.nama_surat}</h3>
                          <p className="font-body text-sm text-muted-foreground mt-1">
                            {r.pemohon} · {r.nik}
                          </p>
                          <p className="font-ui text-xs text-muted-foreground mt-1">
                            Diajukan:{" "}
                            {new Date(r.created_at).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          {r.status === "Disetujui" && r.no && (
                            <Link
                              to="/verifikasi/$no"
                              params={{ no: r.no }}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-ui font-semibold hover:bg-success/20 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Lihat & Verifikasi Surat
                            </Link>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <SyncDot synced={r.cloudSynced} />
                          <StatusBadge status={r.status} />
                        </div>
                      </div>

                      {/* Progress timeline */}
                      <div className="mt-5 pt-5 border-t border-border">
                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                          {STATUSES.slice(0, 4).map((s, i) => {
                            const currentIdx = STATUSES.findIndex((x) => x.key === r.status);
                            const done = i <= currentIdx && r.status !== "Ditolak";
                            const Icon = s.icon;
                            return (
                              <div
                                key={s.key}
                                className="flex items-center gap-1 sm:gap-2 shrink-0"
                              >
                                <div
                                  className={`h-7 w-7 rounded-full flex items-center justify-center ${done ? "bg-success text-background" : "bg-muted text-muted-foreground"}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span
                                  className={`font-ui text-[11px] hidden sm:inline ${done ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                                >
                                  {s.key}
                                </span>
                                {i < 3 && (
                                  <div
                                    className={`h-px w-4 sm:w-8 ${done ? "bg-success" : "bg-border"}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center pt-8">
              <Link
                to="/pelayanan/e-surat"
                className="btn-pill bg-ink text-background hover:bg-ink/90"
              >
                + Ajukan Surat Baru
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function OfflineQueuePanel({ items, q }: { items: OfflineSubmission[]; q: string }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
        <WifiOff className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="font-display text-xl font-bold mt-4">Tidak ada antrian offline</h3>
        <p className="font-body text-muted-foreground mt-2 max-w-sm mx-auto">
          {q
            ? "Tidak ada hasil yang cocok dengan pencarian Anda."
            : "Semua pengajuan sudah terkirim ke server."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
        <WifiOff className="h-4 w-4 text-warning shrink-0" />
        <p className="font-ui text-xs text-foreground">
          <strong>{items.length}</strong> pengajuan menunggu koneksi — akan dikirim otomatis saat
          online.
        </p>
      </div>
      {items.map((item) => {
        const data = item.data as Record<string, unknown>;
        return (
          <div
            key={item.id}
            className="rounded-2xl border border-warning/20 bg-warning/5 p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-warning shrink-0" />
                  <span className="font-ui text-[11px] font-bold text-warning tracking-widest">
                    {String(data.kode ?? "SURAT")}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    #{String(data.no ?? item.id)}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold">
                  {String(data.nama_surat ?? "Surat")}
                </h3>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {String(data.pemohon ?? "-")} · {String(data.nik ?? "-")}
                </p>
                <p className="font-ui text-xs text-muted-foreground mt-1">
                  Diantre:{" "}
                  {new Date(item.created_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {item.retries > 0 && (
                    <span className="ml-2 text-warning">· {item.retries}x percobaan gagal</span>
                  )}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-ui font-semibold border border-warning/30 bg-warning/10 text-warning">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
