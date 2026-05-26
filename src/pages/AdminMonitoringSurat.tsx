import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
  XCircle,
  FileSignature,
  Eye,
  CheckSquare,
  X as XIcon,
  Loader2,
  Download,
  Send,
  ChevronUp,
} from "lucide-react";

import { initEsuratStore, syncPullAllRecords } from "@/lib/useSupabaseSync";
import { listRecords, type SuratRecord } from "@/lib/esurat-store";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";

// Modals
import { PreviewModal } from "@/components/admin/monitoring/PreviewModal";
import { VerifikasiModal } from "@/components/admin/monitoring/VerifikasiModal";
import { ApproveModal } from "@/components/admin/monitoring/ApproveModal";

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

export default function AdminMonitoringSurat() {
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<SuratRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SuratRecord | null>(null);
  const [modalMode, setModalMode] = useState<"preview" | "verifikasi" | "approve" | null>(null);

  const session = getSession();
  const canVerify = session ? can("verify_surat") : false;
  const canApprove = session ? can("approve_surat") : false;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    initEsuratStore()
      .then(() => syncPullAllRecords())
      .then(() => {
        if (mounted) {
          setRecords(listRecords());
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[AdminMonitoringSurat] Gagal load records:", err);
        if (mounted) {
          setRecords(listRecords());
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
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

  const handlePreview = (r: SuratRecord) => {
    setSelectedRecord(r);
    setModalMode("preview");
  };

  const handleVerifikasi = (r: SuratRecord) => {
    setSelectedRecord(r);
    setModalMode("verifikasi");
  };

  const handleLanjutApproval = async (r: SuratRecord) => {
    try {
      const timestamp = new Date().toISOString();
      const actor = session?.username ?? session?.userId ?? "System";
      const history = r.status_history ? [...r.status_history] : [];
      history.push({ status: "Menunggu Approval", timestamp, actor });

      const updated: SuratRecord = {
        ...r,
        status: "Menunggu Approval",
        status_history: history,
        updated_at: timestamp,
      };

      import("@/lib/esurat-store").then(({ saveRecord }) => saveRecord(updated));
      import("@/lib/useSupabaseSync").then(({ syncSaveRecord }) => syncSaveRecord(updated, actor));
      import("@/lib/esurat-notif").then(({ notifySurat }) => notifySurat(updated, "forward"));

      import("sonner").then(({ toast }) => toast.success("Surat diteruskan untuk approval"));

      // Update local state immediately
      setRecords((prev) => prev.map((x) => (x.no === r.no ? updated : x)));
    } catch (err) {
      console.error("[Lanjut Approval] Error:", err);
    }
  };

  const handleApprove = (r: SuratRecord) => {
    setSelectedRecord(r);
    setModalMode("approve");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    // Refresh records
    syncPullAllRecords().then(() => setRecords(listRecords()));
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">Akses Ditolak</h2>
          <p className="font-body text-muted-foreground mt-2">
            Anda harus login sebagai admin untuk mengakses halaman ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHero
        titleFirst="Monitoring"
        titleSecond="Surat"
        description="Kelola dan proses semua pengajuan surat dari warga."
        badge="Admin"
        badgeIcon={<FileText className="h-3.5 w-3.5" />}
      />

      <div className="py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari no. tracking, NIK, atau nama pemohon..."
              className="pl-12 h-14 text-base rounded-2xl"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      No. Tracking
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      Jenis Surat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      Pemohon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="font-display text-lg font-bold mt-4">Tidak ada data</p>
                        <p className="font-body text-sm text-muted-foreground mt-1">
                          {q
                            ? "Tidak ada hasil yang cocok dengan pencarian Anda."
                            : "Belum ada pengajuan surat."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.no} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-ui text-xs font-bold text-primary tracking-widest">
                              {r.kode}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">#{r.no}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-display text-sm font-semibold">{r.nama_surat}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-body text-sm">{r.pemohon}</p>
                          <p className="font-mono text-xs text-muted-foreground">{r.nik}</p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-ui text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Preview Button - Always Available */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(r)}
                              className="h-8 px-3"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </Button>

                            {/* Verifikasi Button - Only for "Menunggu Verifikasi" */}
                            {r.status === "Menunggu Verifikasi" && canVerify && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleVerifikasi(r)}
                                className="h-8 px-3 bg-info hover:bg-info/90"
                              >
                                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                Verifikasi
                              </Button>
                            )}

                            {/* Lanjut Approval Button - Only for "Diverifikasi" */}
                            {r.status === "Diverifikasi" && canVerify && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleLanjutApproval(r)}
                                className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                                Lanjut Approval
                              </Button>
                            )}

                            {/* Approve Button - Only for "Menunggu Approval" */}
                            {r.status === "Menunggu Approval" && canApprove && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(r)}
                                className="h-8 px-3 bg-success hover:bg-success/90"
                              >
                                <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                                Approve
                              </Button>
                            )}

                            {/* Download PDF - Only for "Disetujui" */}
                            {r.status === "Disetujui" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/verifikasi/${r.no}`, "_blank");
                                }}
                                className="h-8 px-3"
                              >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                PDF
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Menampilkan {filtered.length} dari {records.length} pengajuan
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalMode === "preview" && selectedRecord && (
        <PreviewModal record={selectedRecord} onClose={handleCloseModal} />
      )}
      {modalMode === "verifikasi" && selectedRecord && (
        <VerifikasiModal record={selectedRecord} onClose={handleCloseModal} />
      )}
      {modalMode === "approve" && selectedRecord && (
        <ApproveModal record={selectedRecord} onClose={handleCloseModal} />
      )}

      <Footer />
    </div>
  );
}
