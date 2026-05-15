import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/Link";

import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
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
} from "lucide-react";

import { initEsuratStore, searchSuratRequests } from "@/lib/useSupabaseSync";
import { listRecords, type SuratRecord, fetchEstimasi, fmtEstimasi } from "@/lib/esurat-store";
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

  useEffect(() => {
    let mounted = true;
    initEsuratStore().then(() => {
      if (mounted) {
        setRecords(listRecords());
      }
    });
    hasOfflineQueueItems().then((has) => setOfflineCount(has ? 1 : 0));
    getOfflineQueue().then((items) => {
      if (mounted) {
        setOfflineItems(items);
        setOfflineCount(items.length);
      }
    });
    // Fetch estimasi durasi pemrosesan
    fetchEstimasi().then((data) => {
      if (mounted) setEstimasi(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    // Gabungkan lokal + cloud, unik by no
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

  /** Badge estimasi pemrosesan per jenis surat */
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

  // Debounced cloud search
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

  /** Dot indicator: green=synced cloud, yellow=stored local, grey=unknown */
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
    { key: "lokal", label: "Lokal", icon: HardDrive },
    { key: "server", label: "Server", icon: Cloud },
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
      <section className="pt-28 pb-10 px-4 sm:px-8 bg-gradient-to-br from-ink to-ink/90 text-background">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-background/70 hover:text-background mb-6 font-ui text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
          <p className="eyebrow text-primary mb-3">Monitoring</p>
          <h1 className="hero-title text-background">
            Lacak <em className="not-italic text-primary">pengajuan</em> Anda.
          </h1>
          <p className="font-body text-background/70 mt-4 max-w-xl">
            Pantau status setiap permohonan surat secara real-time. Masukkan nomor tracking, NIK,
            atau nama untuk mencari.
          </p>
        </div>
      </section>

      <section className="py-10 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
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
          <div className="flex items-center gap-1.5 flex-wrap">
            {TABS.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-ui font-semibold transition-colors ${
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
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Offline queue panel */}
          {tab === "offline" ? (
            <OfflineQueuePanel items={filteredOffline} q={q} />
          ) : filteredByTab.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
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
                  className="inline-flex mt-6 btn-pill bg-primary text-primary-foreground hover:bg-primary-hover"
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
                          <div key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
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

          <div className="text-center pt-4">
            <Link
              to="/pelayanan/e-surat"
              className="btn-pill bg-ink text-background hover:bg-ink/90"
            >
              + Ajukan Surat Baru
            </Link>
          </div>
        </div>
      </section>

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
