/**
 * LacakPage — Redesigned 2025
 *
 * Public tracking page — CEK STATUS PENGAJUAN SURAT.
 * Tidak perlu login. Cukup masukkan nomor tracking atau NIK.
 *
 * Fitur:
 * - Smart search: nomor tracking atau NIK
 * - Progress timeline visual
 * - Detail lengkap pengajuan
 * - Quick actions setelah cek
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "@/components/Link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Input } from "@/components/ui/input";
import { maskNik } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileSignature,
  ShieldCheck,
  FileCheck,
  Search,
  Loader2,
  FileText,
  AlertCircle,
  ArrowLeft,
  Info,
  Smartphone,
  Calendar,
  User,
  Hash,
  ChevronRight,
  Share2,
  Copy,
  RefreshCw,
  WifiOff,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    label: string;
    bg: string;
    border: string;
    description: string;
  }
> = {
  "Menunggu Verifikasi": {
    icon: <Clock className="h-5 w-5" />,
    color: "text-warning",
    label: "Menunggu Verifikasi",
    bg: "bg-warning/10",
    border: "border-warning/30",
    description: "Pengajuan Anda sedang dalam antrean verifikasi data oleh admin desa.",
  },
  Diverifikasi: {
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "text-info",
    label: "Diverifikasi",
    bg: "bg-info/10",
    border: "border-info/30",
    description: "Data telah diverifikasi admin. Saat ini menunggu persetujuan Kepala Desa.",
  },
  "Menunggu Approval": {
    icon: <FileSignature className="h-5 w-5" />,
    color: "text-primary",
    label: "Menunggu Approval",
    bg: "bg-primary/10",
    border: "border-primary/30",
    description: "Pengajuan sedang dalam proses persetujuan oleh Kepala Desa.",
  },
  Disetujui: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-success",
    label: "Disetujui",
    bg: "bg-success/10",
    border: "border-success/30",
    description: "Surat telah ditandatangani dan siap diunduh! Selamat!",
  },
  Ditolak: {
    icon: <XCircle className="h-5 w-5" />,
    color: "text-destructive",
    label: "Ditolak",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    description: "Pengajuan ditolak. Silakan hubungi kantor desa untuk informasi lebih lanjut.",
  },
};

const STATUS_STEPS = [
  { key: "Menunggu Verifikasi", label: "Verifikasi" },
  { key: "Diverifikasi", label: "Dicek" },
  { key: "Menunggu Approval", label: "Approval" },
  { key: "Disetujui", label: "Disetujui" },
];

type ResultRecord = {
  no: string;
  kode: string;
  nama_surat: string;
  pemohon: string;
  nik: string;
  status: string;
  kontak?: string;
  catatan?: string;
  signed_at?: string;
  signed_by?: string;
  created_at: string;
  status_history?: { status: string; timestamp: string; actor: string; catatan?: string }[];
};

export default function LacakPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") ?? "";
    }
    return "";
  });
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.length >= 4) performSearch(q);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function performSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);

    try {
      const res = await fetch("/api/verify-surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          setResults(data.records as ResultRecord[]);
        } else if (data.record) {
          setResults([data.record as ResultRecord]);
        } else {
          setResults([]);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error: ${res.status}`);
        setResults([]);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function copyNo(no: string) {
    navigator.clipboard.writeText(no).then(() => {
      setCopied(no);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function resetSearch() {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
    inputRef.current?.focus();
  }

  const STATUSES_ORDER = [
    "Menunggu Verifikasi",
    "Diverifikasi",
    "Menunggu Approval",
    "Disetujui",
    "Ditolak",
  ];

  function getStepIndex(status: string) {
    return STATUSES_ORDER.indexOf(status);
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar hanya tampil di halaman pencarian awal (publik) */}
      {!searched && <Navbar />}

      {/* ── OFFLINE BANNER ── */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/15 border-b border-warning/30 text-warning text-xs font-ui font-semibold">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Anda sedang offline. Lacak menggunakan data tersimpan lokal.</span>
        </div>
      )}

      {/* ── BACK BUTTON (result view) ── */}
      {searched && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={resetSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors font-ui font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <p className="font-display text-sm font-bold text-foreground">
              {results.length > 0 ? `${results.length} hasil ditemukan` : "Tidak ditemukan"}
            </p>
          </div>
        </div>
      )}

      {!searched ? (
        <>
          <PageHero
            titleFirst="Cek Status"
            titleSecond="Pengajuan"
            description="Masukkan nomor tracking atau NIK untuk melihat status surat Anda."
            badge="Tanpa Login"
            badgeIcon={<Search className="h-3.5 w-3.5" />}
          />

          <div className="mx-auto max-w-4xl px-4 sm:px-8 mt-6">
            <div className="bg-muted p-1.5 rounded-2xl flex relative max-w-sm mx-auto shadow-inner">
              <Link
                to="/pelayanan/e-surat"
                className="flex-1 py-3 text-sm font-ui font-bold rounded-xl z-10 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
              >
                Buat Surat
              </Link>
              <button className="flex-1 py-3 text-sm font-ui font-bold rounded-xl z-10 transition-colors bg-background text-foreground shadow">
                Cek Status
              </button>
            </div>
          </div>
        </>
      ) : null}

      <section className="py-6 px-4 sm:py-8 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* ── SEARCH FORM ── */}
          <form onSubmit={handleSearch} className="space-y-3">
            {/* Info banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-info/20 bg-info/5">
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="font-ui text-xs text-muted-foreground leading-relaxed">
                Ketik <strong>nomor tracking</strong> (contoh: SKTM-260521-3f2a1x4k) atau{" "}
                <strong>NIK</strong> Anda untuk melihat status pengajuan.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nomor tracking atau NIK..."
                className="w-full h-16 rounded-2xl border-2 border-border bg-card pl-14 pr-14 text-lg text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all font-mono tracking-wide"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-spin" />
              )}
              {!loading && query && (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || query.trim().length < 4}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-ui text-base font-bold hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Lacak Pengajuan
                </>
              )}
            </button>
          </form>

          {/* ── ERROR ── */}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 flex gap-3">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <p className="font-ui font-bold text-destructive text-sm">{error}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Pastikan nomor tracking atau NIK yang Anda masukkan benar.
                </p>
              </div>
            </div>
          )}

          {/* ── NOT FOUND ── */}
          {searched && !loading && results.length === 0 && !error && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Search className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Pengajuan Tidak Ditemukan</h3>
                <p className="font-body text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  Tidak ada pengajuan dengan <strong>"{query}"</strong>. Periksa kembali nomor Anda.
                </p>
              </div>

              <div className="inline-block text-left bg-muted/50 rounded-xl p-4">
                <p className="font-ui text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  💡 Tips pencarian:
                </p>
                <ul className="space-y-1.5 font-body text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Nomor tracking:{" "}
                      <span className="font-mono font-semibold">SKTM-260521-3f2a1x4k</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>NIK: 16 digit angka di KTP Anda</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Nomor tracking lebih akurat dari NIK</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={resetSearch}
                  className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-ui font-semibold hover:bg-primary transition shadow-md inline-flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" /> Cari Lagi
                </button>
                <Link
                  to="/pelayanan/e-surat"
                  className="h-12 px-6 rounded-xl border border-border bg-card text-foreground font-ui font-semibold hover:bg-muted transition inline-flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" /> Ajukan Surat Baru
                </Link>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {results.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["Menunggu Verifikasi"];
            const currentIdx = getStepIndex(r.status);

            return (
              <div key={r.no} className="space-y-4 animate-fade-in">
                {/* Status Hero Card */}
                <div
                  className={`rounded-3xl border-2 ${cfg.bg} ${cfg.border} p-6 sm:p-8 text-center space-y-4`}
                >
                  <div
                    className={`inline-flex h-16 w-16 rounded-2xl items-center justify-center ${cfg.bg} border-2 ${cfg.border}`}
                  >
                    <span className={cfg.color}>{cfg.icon}</span>
                  </div>
                  <div>
                    <p className={`font-display text-2xl sm:text-3xl font-bold ${cfg.color}`}>
                      {cfg.label}
                    </p>
                    <p className="font-body text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                      {cfg.description}
                    </p>
                  </div>
                  {/* Tracking number */}
                  <div className="inline-flex items-center gap-3 bg-ink text-background px-6 py-3 rounded-2xl">
                    <p className="font-mono text-xl sm:text-2xl font-bold tracking-wider">{r.no}</p>
                    <button
                      onClick={() => copyNo(r.no)}
                      className="h-9 w-9 rounded-xl bg-background/20 flex items-center justify-center hover:bg-background/30 transition"
                      title="Salin nomor tracking"
                    >
                      {copied === r.no ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Copy className="h-5 w-5 text-background" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="font-ui text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">
                    Progress Pengajuan
                  </p>

                  {/* Desktop Timeline (Horizontal) */}
                  <div className="hidden sm:flex items-center justify-center gap-2">
                    {STATUS_STEPS.map((s, i) => {
                      const idx = STATUSES_ORDER.indexOf(s.key);
                      const done = idx <= currentIdx && r.status !== "Ditolak";
                      const isRejected = r.status === "Ditolak" && i === currentIdx;
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`h-12 w-12 rounded-2xl flex items-center justify-center font-ui text-xs font-bold transition-all ${
                                done
                                  ? "bg-success text-background shadow-md"
                                  : isRejected
                                    ? "bg-destructive text-background"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isRejected ? (
                                <XCircle className="h-5 w-5" />
                              ) : (
                                <span>{i + 1}</span>
                              )}
                            </div>
                            <span
                              className={`font-ui text-[10px] font-semibold text-center max-w-[60px] ${done ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div
                              className={`h-1 w-8 sm:w-12 rounded-full ${done ? "bg-success" : "bg-border"}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Timeline (Vertical) */}
                  <div className="flex sm:hidden flex-col gap-6 pl-2 relative">
                    {STATUS_STEPS.map((s, i) => {
                      const idx = STATUSES_ORDER.indexOf(s.key);
                      const done = idx <= currentIdx && r.status !== "Ditolak";
                      const isRejected = r.status === "Ditolak" && i === currentIdx;
                      return (
                        <div key={s.key} className="flex items-start gap-4 relative">
                          {/* Connector Line */}
                          {i < STATUS_STEPS.length - 1 && (
                            <div
                              className={`absolute left-6 top-12 bottom-[-24px] w-0.5 ${done && STATUSES_ORDER.indexOf(STATUS_STEPS[i + 1].key) <= currentIdx ? "bg-success" : "bg-border"}`}
                            />
                          )}

                          {/* Circle Icon */}
                          <div
                            className={`h-12 w-12 rounded-2xl flex items-center justify-center font-ui text-xs font-bold transition-all shrink-0 z-10 ${
                              done
                                ? "bg-success text-background shadow-md"
                                : isRejected
                                  ? "bg-destructive text-background"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : isRejected ? (
                              <XCircle className="h-5 w-5" />
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </div>

                          {/* Label and Info */}
                          <div className="flex flex-col justify-center pt-1.5 min-w-0">
                            <span
                              className={`font-ui text-sm font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              {s.label}
                            </span>
                            <span className="font-body text-xs text-muted-foreground">
                              {s.key === "Menunggu Verifikasi" && "Pengajuan dikirim oleh warga"}
                              {s.key === "Diverifikasi" && "Verifikasi kelengkapan berkas"}
                              {s.key === "Menunggu Approval" && "Menunggu tanda tangan digital"}
                              {s.key === "Disetujui" && "Surat siap diunduh"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detail Card */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
                    <p className="font-ui text-xs font-bold uppercase tracking-wider text-primary">
                      Detail Pengajuan
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    <DetailRow
                      icon={<FileText className="h-4 w-4 text-primary" />}
                      label="Jenis Surat"
                      value={r.nama_surat}
                    />
                    <DetailRow
                      icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                      label="Kode"
                      value={r.kode}
                      mono
                    />
                    <DetailRow
                      icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                      label="Nomor Tracking"
                      value={r.no}
                      mono
                      copyable
                      onCopy={() => copyNo(r.no)}
                    />
                    <DetailRow
                      icon={<User className="h-4 w-4 text-muted-foreground" />}
                      label="Nama Pemohon"
                      value={r.pemohon}
                    />
                    <DetailRow
                      icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                      label="NIK"
                      value={maskNik(r.nik)}
                      mono
                    />
                    <DetailRow
                      icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                      label="Tanggal Ajuan"
                      value={formatDate(r.created_at)}
                    />
                    {r.signed_by && (
                      <DetailRow
                        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                        label="Ditandatangani oleh"
                        value={r.signed_by}
                      />
                    )}
                    {r.signed_at && (
                      <DetailRow
                        icon={<Calendar className="h-4 w-4 text-success" />}
                        label="Tgl. Penandatanganan"
                        value={formatDate(r.signed_at)}
                      />
                    )}
                    {r.catatan && (
                      <div className="px-5 py-3.5 bg-warning/5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p className="font-ui text-[10px] font-bold text-warning uppercase tracking-wider mb-1">
                              Catatan
                            </p>
                            <p className="font-body text-sm text-foreground">{r.catatan}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Riwayat Status */}
                {r.status_history && r.status_history.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-info/5 to-transparent border-b border-border">
                      <p className="font-ui text-xs font-bold uppercase tracking-wider text-info">
                        Riwayat Proses
                      </p>
                    </div>
                    <div className="p-5">
                      <div className="space-y-4">
                        {r.status_history.map((hist, index) => (
                          <div key={index} className="flex items-start gap-4 relative">
                            {index < r.status_history!.length - 1 && (
                              <div className="absolute left-2.5 top-6 bottom-[-16px] w-0.5 bg-border" />
                            )}
                            <div className="h-5 w-5 rounded-full bg-info/20 flex items-center justify-center shrink-0 z-10 mt-0.5 border border-info/30">
                              <div className="h-2 w-2 rounded-full bg-info" />
                            </div>
                            <div>
                              <p className="font-ui text-sm font-bold text-foreground">
                                {hist.status}
                              </p>
                              <p className="font-body text-xs text-muted-foreground mt-0.5">
                                {new Date(hist.timestamp).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                — {hist.actor}
                              </p>
                              {hist.catatan && (
                                <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
                                  <p className="font-body text-xs text-muted-foreground italic">
                                    "{hist.catatan}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {r.status === "Disetujui" ? (
                    <Link
                      to="/verifikasi/$no"
                      params={{ no: r.no }}
                      className="flex-1 h-14 rounded-2xl bg-success text-background font-ui text-base font-bold hover:bg-success/90 transition-all shadow-lg shadow-success/25 flex items-center justify-center gap-2"
                    >
                      <FileCheck className="h-5 w-5" />
                      Lihat & Unduh Surat
                    </Link>
                  ) : (
                    <Link
                      to="/pelayanan/e-surat"
                      className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-ui text-base font-bold hover:bg-primary transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <FileText className="h-5 w-5" />
                      Ajukan Surat Lain
                    </Link>
                  )}
                  <button
                    onClick={resetSearch}
                    className="flex-1 h-14 rounded-2xl border-2 border-border bg-card text-foreground font-ui text-base font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="h-5 w-5" />
                    Lacak Lainnya
                  </button>
                </div>
              </div>
            );
          })}

          {/* ── HELP SECTION ── */}
          {!searched && (
            <div className="space-y-4">
              {/* Quick help */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Butuh bantuan?
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-ui text-sm font-semibold text-foreground">
                        Tidak punya nomor tracking?
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        Nomor tracking diberikan setelah Anda mengajukan surat via WhatsApp.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                      <Info className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-ui text-sm font-semibold text-foreground">
                        Data tidak ditemukan?
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        Silakan hubungi kantor desa untuk konfirmasi manual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/pelayanan/e-surat"
                  className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-ui font-bold hover:bg-primary transition-all shadow-md flex items-center justify-center gap-2 text-base"
                >
                  <FileText className="h-5 w-5" />
                  Ajukan Surat
                </Link>
                <Link
                  to="/masuk/warga"
                  className="flex-1 h-14 rounded-2xl border-2 border-border bg-card text-foreground font-ui font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <Smartphone className="h-5 w-5" />
                  Login Warga
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
  copyable,
  onCopy,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5 shrink-0">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="font-ui text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`font-body text-sm text-foreground text-right ${mono ? "font-mono font-medium" : "font-medium"}`}
        >
          {value || "—"}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Salin"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
