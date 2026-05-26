/**
 * AlertPanel — Dashboard Peringatan Dini
 *
 * Menampilkan alert untuk kondisi yang perlu perhatian segera:
 *   1. Surat aged 3+ hari di "Menunggu Verifikasi" (dari esurat-store)
 *   2. Warga belum divalidasi NIK via SIPPN (dari penduduk-store)
 *   3. (Placeholder) APBDes: anggaran mendekati plafon
 *
 * Data di-fetch per komponen agar tidak memblock render dashboard utama.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, UserCheck, TrendingUp, X, ChevronRight } from "lucide-react";
import { oldestPending, type SuratRecord } from "@/lib/esurat-store";
import { listPenduduk } from "@/lib/penduduk-store";

interface AgedSuratAlert {
  count: number;
  oldest: SuratRecord | null;
  oldestDays: number;
}

interface UnvalidatedWargaAlert {
  count: number;
  total: number;
}

export function AlertPanel() {
  const [suratAged, setSuratAged] = useState<AgedSuratAlert | null>(null);
  const [wargaUnvalidated, setWargaUnvalidated] = useState<UnvalidatedWargaAlert | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Cek surat aged 3+ hari
    const pending = oldestPending();
    if (pending.length > 0) {
      const oldest = pending[0];
      const days = Math.floor(
        (Date.now() - new Date(oldest.updated_at ?? oldest.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days >= 3) {
        setSuratAged({ count: pending.length, oldest, oldestDays: days });
      }
    }

    // Cek warga belum divalidasi NIK
    const warga = listPenduduk();
    const unvalidated = warga.filter((w) => !(w as { is_valid?: boolean }).is_valid);
    if (unvalidated.length > 0) {
      setWargaUnvalidated({ count: unvalidated.length, total: warga.length });
    }
  }, []);

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const alerts = [
    suratAged &&
      !dismissed.has("surat-aged") && {
        key: "surat-aged",
        tone: "warning" as const,
        icon: Clock,
        title: "Surat Menunggu Verifikasi",
        body: `${suratAged.count} surat${suratAged.count > 1 ? "s" : ""} belum diproses lebih dari ${suratAged.oldestDays} hari.`,
        detail: suratAged.oldest
          ? `Paling lama: ${suratAged.oldest.nama_surat} oleh ${suratAged.oldest.pemohon}`
          : null,
        cta: "Tinjau Sekarang",
        ctaTo: "/admin?view=monitoring",
      },
    wargaUnvalidated &&
      !dismissed.has("warga-unvalidated") && {
        key: "warga-unvalidated",
        tone: "info" as const,
        icon: UserCheck,
        title: "Warga Belum Divalidasi",
        body: `${wargaUnvalidated.count} dari ${wargaUnvalidated.total} warga belum divalidasi NIK-nya.`,
        detail: "Validasi NIK meningkatkan akurasi data dan mencegah duplikat.",
        cta: "Validasi Sekarang",
        ctaTo: "/admin/penduduk",
      },
  ].filter(Boolean) as AlertItem[];

  if (alerts.length === 0) return null;

  const toneMap = {
    warning: {
      container: "bg-warning/10 border-warning/30",
      icon: "text-warning bg-warning/20",
      badge: "bg-warning text-warning-foreground",
      cta: "bg-warning text-warning-foreground hover:bg-warning/90",
    },
    danger: {
      container: "bg-destructive/10 border-destructive/30",
      icon: "text-destructive bg-destructive/20",
      badge: "bg-destructive text-destructive-foreground",
      cta: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    info: {
      container: "bg-info/10 border-info/30",
      icon: "text-info bg-info/20",
      badge: "bg-info text-info-foreground",
      cta: "bg-info text-info-foreground hover:bg-info/90",
    },
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const styles = toneMap[alert.tone];
        const Icon = alert.icon;
        return (
          <div
            key={alert.key}
            className={`rounded-2xl border bg-card p-4 sm:p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ${styles.container}`}
          >
            <div
              className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${styles.icon}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${styles.badge}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5" /> {alert.title}
                </span>
              </div>
              <p className="font-body text-sm text-foreground">{alert.body}</p>
              {alert.detail && (
                <p className="font-ui text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={alert.ctaTo}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold font-ui transition-colors ${styles.cta}`}
              >
                {alert.cta} <ChevronRight className="h-3 w-3" />
              </a>
              <button
                onClick={() => dismiss(alert.key)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Abaikan"
                aria-label="Abaikan notifikasi ini"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AlertItem {
  key: string;
  tone: "warning" | "danger" | "info";
  icon: React.ElementType;
  title: string;
  body: string;
  detail: string | null;
  cta: string;
  ctaTo: string;
}
