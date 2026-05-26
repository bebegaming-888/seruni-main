/**
 * Admin Monitoring Surat — Route
 * /admin/monitoring-surat
 *
 * Tabel monitoring semua pengajuan surat dengan aksi:
 * - Preview: Blanko + Selfie + Dokumen
 * - Verifikasi: Terima / Tolak (+ WA)
 * - Approve: Terima (+ nomor surat, QR, PDF, WA) / Tolak (+ WA)
 */

import { createFileRoute } from "@tanstack/react-router";
import AdminMonitoringSurat from "@/pages/AdminMonitoringSurat";

export const Route = createFileRoute("/admin/monitoring-surat")({
  component: AdminMonitoringSurat,
});
