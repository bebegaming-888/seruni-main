import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/Link";

import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Clock,
  CheckCircle2,
  FileText,
  ArrowLeft,
  ShieldCheck,
  XCircle,
  Loader2,
  FileSignature,
} from "lucide-react";

type Record = {
  no: string;
  kode: string;
  nama_surat: string;
  pemohon: string;
  nik: string;
  kontak: string;
  status: string;
  created_at: string;
};

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
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    const r = JSON.parse(localStorage.getItem("e_surat_records") ?? "[]");
    setRecords(r);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return records;
    const s = q.toLowerCase();
    return records.filter((r) =>
      [r.no, r.nama_surat, r.pemohon, r.nik].some((v) => (v ?? "").toLowerCase().includes(s)),
    );
  }, [q, records]);

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
              placeholder="Cari no. tracking, NIK, atau nama..."
              className="pl-12 h-14 text-base rounded-2xl"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="font-display text-xl font-bold mt-4">Belum ada pengajuan</h3>
              <p className="font-body text-muted-foreground mt-2 max-w-sm mx-auto">
                Mulai ajukan surat pertama Anda — prosesnya hanya 5 menit.
              </p>
              <Link
                to="/pelayanan/e-surat"
                className="inline-flex mt-6 btn-pill bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Ajukan Surat
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <div
                  key={r.no}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card hover:shadow-elev transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-ui text-[11px] font-bold text-primary tracking-widest">
                          {r.kode}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">#{r.no}</span>
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
                    <StatusBadge status={r.status} />
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
