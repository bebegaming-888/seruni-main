import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Link } from "@/components/Link";
import { getRecord, type SuratRecord } from "@/lib/esurat-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  QrCode,
  Shield,
  Loader2,
  ArrowLeft,
  Download,
  Printer,
  Share2,
  Clipboard,
  Copy,
} from "lucide-react";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { useSettings, getSettings } from "@/lib/settings-store";

import { toast } from "sonner";

export const Route = createFileRoute("/verifikasi/$no")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: "Verifikasi Surat — " + v.name },
        {
          name: "description",
          content: "Cek keabsahan dokumen surat dari Desa " + v.village,
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: VerifikasiPage,
});

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    bgClass: string;
    desc: string;
  }
> = {
  "Menunggu Verifikasi": {
    label: "Menunggu Verifikasi",
    icon: <Clock className="h-5 w-5" />,
    badgeClass: "bg-warning/15 text-warning border-warning/30",
    bgClass: "bg-warning/5 border-warning/20",
    desc: "Surat sedang dalam proses verifikasi oleh petugas desa.",
  },
  Diverifikasi: {
    label: "Diverifikasi",
    icon: <FileCheck className="h-5 w-5" />,
    badgeClass: "bg-info/15 text-info border-info/30",
    bgClass: "bg-info/5 border-info/20",
    desc: "Surat telah diverifikasi oleh Sekretaris Desa.",
  },
  "Menunggu Approval": {
    label: "Menunggu Persetujuan",
    icon: <Clock className="h-5 w-5" />,
    badgeClass: "bg-warning/15 text-warning border-warning/30",
    bgClass: "bg-warning/5 border-warning/20",
    desc: "Menunggu persetujuan dan tanda tangan Kepala Desa.",
  },
  Disetujui: {
    label: "Disetujui & Ditandatangani",
    icon: <CheckCircle2 className="h-5 w-5" />,
    badgeClass: "bg-success/15 text-success border-success/30",
    bgClass: "bg-success/5 border-success/20",
    desc: "Surat telah disetujui dan ditandatangani oleh Kepala Desa. Dokumen ini SAH dan LEGAL.",
  },
  Ditolak: {
    label: "Ditolak",
    icon: <XCircle className="h-5 w-5" />,
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    bgClass: "bg-destructive/5 border-destructive/20",
    desc: "Pengajuan surat ini ditolak. Hubungi kantor desa untuk informasi lebih lanjut.",
  },
};

const STATUS_STEPS = [
  { key: "Menunggu Verifikasi", label: "Verifikasi" },
  { key: "Diverifikasi", label: "Data Dicek" },
  { key: "Menunggu Approval", label: "Persetujuan" },
  { key: "Disetujui", label: "Disetujui" },
] as const;

function VerifikasiPage() {
  const v = useVillage();

  const { no } = Route.useParams();
  const [record, setRecord] = useState<SuratRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotFound(false);
      setRecord(null);

      if (isSupabaseConfigured) {
        try {
          const res = await fetch("/api/verify-surat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ no }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              ok: boolean;
              record?: Record<string, unknown>;
              error?: string;
            };
            if (data.ok && data.record) {
              setRecord(data.record as unknown as SuratRecord);
              setLoading(false);
              return;
            }
          }
          // fallback to localStorage if API fails
        } catch {
          // fallback to localStorage
        }
      }

      // Fallback: localStorage lookup
      const found = getRecord(no);
      if (!found) setNotFound(true);
      else setRecord(found);
      setLoading(false);
    }

    load();
  }, [no]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-base font-bold">
              {v.village[0]}
            </div>
            <div>
              <div className="font-display text-sm font-bold leading-tight">{v.name}</div>

              <div className="font-ui text-[10px] text-muted-foreground">Sistem Informasi Desa</div>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Verifikasi Dokumen Surat</h1>
            <p className="font-body text-sm text-muted-foreground">
              Pengecekan keabsahan dokumen dari {v.village}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
            <p className="font-ui text-sm text-muted-foreground">Memuat data dokumen...</p>
          </div>
        )}

        {/* Not found */}
        {notFound && !loading && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <div className="flex h-14 w-14 mx-auto mb-4 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Dokumen Tidak Ditemukan</h2>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Nomor surat <span className="font-mono font-semibold text-foreground">{no}</span>{" "}
              tidak ditemukan dalam sistem kami.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 text-left max-w-sm mx-auto">
              <p className="font-ui text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                Kemungkinan penyebab:
              </p>
              <ul className="space-y-1 font-body text-xs text-muted-foreground">
                <li>• Nomor surat salah atau belum terdaftar</li>
                <li>• Dokumen belum diproses oleh admin desa</li>
                <li>• Dokumen telah diarsipkan</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/"
                className="h-9 px-4 inline-flex items-center justify-center rounded-xl border border-border bg-card font-ui text-sm hover:bg-muted transition"
              >
                Kembali ke Beranda
              </Link>
              <Link
                to="/pelayanan/e-surat"
                className="h-9 px-4 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-ui text-sm hover:bg-primary-hover transition"
              >
                Ajukan Surat
              </Link>
            </div>
          </div>
        )}

        {/* Record found */}
        {record && !loading && (
          <div className="space-y-4">
            {/* Status card */}
            <div
              className={`rounded-2xl border p-6 ${STATUS_CONFIG[record.status]?.bgClass ?? "bg-muted/50 border-border"}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${STATUS_CONFIG[record.status]?.badgeClass ?? "bg-muted text-muted-foreground"}`}
                >
                  {STATUS_CONFIG[record.status]?.icon ?? <Clock className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-ui font-semibold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[record.status]?.badgeClass ?? "bg-muted text-muted-foreground"}`}
                    >
                      {STATUS_CONFIG[record.status]?.label ?? record.status}
                    </span>
                  </div>
                  <p className="mt-2 font-body text-sm text-foreground">
                    {STATUS_CONFIG[record.status]?.desc ?? ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons for approved documents */}
            {record.status === "Disetujui" && (
              <div className="rounded-2xl border border-success/20 bg-success/5 p-5 space-y-3">
                <p className="font-ui text-xs font-semibold text-success uppercase tracking-wider mb-3">
                  Aksi Dokumen
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    icon={<Download className="h-4 w-4" />}
                    label="Unduh PDF"
                    onClick={() => handleDownload(record)}
                    primary
                  />
                  <ActionButton
                    icon={<Printer className="h-4 w-4" />}
                    label="Cetak"
                    onClick={() => window.print()}
                  />
                  <ActionButton
                    icon={<Share2 className="h-4 w-4" />}
                    label="Bagikan"
                    onClick={() => handleShare(record)}
                  />
                  <ActionButton
                    icon={<Copy className="h-4 w-4" />}
                    label="Salin Nomor"
                    onClick={() => handleCopyNo(record.no)}
                  />
                </div>
              </div>
            )}

            {/* Quick share for non-approved documents */}
            {record.status !== "Disetujui" && (
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <p className="font-ui text-xs text-muted-foreground">
                  Bagikan tautan verifikasi ini:
                </p>
                <ActionButton
                  icon={<Clipboard className="h-4 w-4" />}
                  label="Salin Link"
                  onClick={() => handleCopyLink(record.no)}
                />
              </div>
            )}

            {/* Document info */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-muted/50 px-5 py-3 border-b border-border">
                <h3 className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detail Dokumen
                </h3>
              </div>
              <div className="divide-y divide-border">
                <DetailRow label="Nomor Surat" value={record.no} mono />
                <DetailRow label="Kode" value={record.kode} mono />
                <DetailRow label="Jenis Surat" value={record.nama_surat} />
                <DetailRow label="Nama Pemohon" value={record.pemohon} />
                <DetailRow label="NIK" value={maskNik(record.nik)} mono />
                <DetailRow label="Kontak" value={maskPhone(record.kontak)} />
                {record.signed_by && (
                  <DetailRow label="Ditandatangani oleh" value={record.signed_by} />
                )}
                {record.signed_at && (
                  <DetailRow
                    label="Tgl. Penandatanganan"
                    value={new Date(record.signed_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                )}
                <DetailRow
                  label="Diajukan pada"
                  value={new Date(record.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
                {record.updated_at && record.updated_at !== record.created_at && (
                  <DetailRow
                    label="Terakhir diupdate"
                    value={new Date(record.updated_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                )}
              </div>
            </div>

            {/* Notes if rejected */}
            {record.catatan && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-destructive mb-2">
                  Catatan / Alasan
                </h4>
                <p className="font-body text-sm text-foreground">{record.catatan}</p>
              </div>
            )}

            {/* QR payload info */}
            {record.qr_payload && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-ui text-xs font-semibold text-success mb-0.5">
                      Data Terverifikasi
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground break-all">
                      {record.qr_payload}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer info */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
              <p className="font-ui text-xs text-muted-foreground">
                Dokumen ini diterbitkan oleh <strong className="text-foreground">{v.name}</strong>.
                Untuk konfirmasi lanjutan, hubungi kami di{" "}
                <strong className="text-foreground">{v.phone}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function maskNik(nik: string): string {
  if (nik.length <= 6) return nik;
  return nik.slice(0, 6).replace(/\d/g, "●") + nik.slice(-6);
}

function maskPhone(phone: string): string {
  // Show country code + last 4 digits only
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 4) return phone;
  if (cleaned.startsWith("62")) {
    return "+62 " + "●".repeat(cleaned.length - 6) + cleaned.slice(-6);
  }
  return phone.slice(0, 4) + "●".repeat(Math.max(0, phone.length - 8)) + phone.slice(-4);
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <span className="font-ui text-xs text-muted-foreground shrink-0 w-36">{label}</span>
      <span
        className={`font-ui text-sm text-foreground text-right ${mono ? "font-mono font-medium" : "font-medium"}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-ui text-xs font-semibold transition ${
        primary
          ? "bg-success text-background border-success hover:bg-success/90"
          : "bg-card text-foreground border-border hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

async function handleDownload(record: SuratRecord) {
  try {
    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ no: record.no }),
    });
    if (res.status === 404) {
      toast.error("Surat tidak ditemukan", { description: "Dokumen belum tersedia di server." });
      return;
    }
    if (res.status === 403) {
      toast.error("Akses ditolak", {
        description: "Anda tidak memiliki izin mengunduh dokumen ini.",
      });
      return;
    }
    if (res.status === 503) {
      toast.error("Server belum dikonfigurasi", {
        description: "Fitur PDF belum aktif. Hubungi admin desa.",
      });
      return;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      toast.error("Gagal mengunduh PDF", { description: body || `Server error (${res.status})` });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.no}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF diunduh");
  } catch {
    toast.error("Gagal mengunduh PDF", { description: "Tidak dapat terhubung ke server." });
  }
}

async function handleShare(record: SuratRecord) {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title: `Surat ${record.nama_surat}`, url });
  } else {
    await navigator.clipboard.writeText(url);
    toast.success("Link berhasil disalin");
  }
}

async function handleCopyNo(no: string) {
  await navigator.clipboard.writeText(no);
  toast.success("Nomor surat disalin");
}

async function handleCopyLink(no: string) {
  const url = `${window.location.origin}/verifikasi/${no}`;
  await navigator.clipboard.writeText(url);
  toast.success("Link verifikasi disalin");
}
