// E-Surat notification system — 5 trigger points
//
// Trigger:
//   "submit"    → Pengajuan berhasil diterima
//   "verify"    → Data berhasil diverifikasi
//   "approve"   → Surat ditandatangani & siap diunduh
//   "reject"    → Pengajuan ditolak (dengan alasan)
//   "reminder"  → Reminder: belum diproses setelah 3 hari
//
// Template pesan diambil dari settings-store (notifications.*)

import type { SuratRecord } from "@/lib/esurat-store";
import { sendWaNotification } from "@/lib/fonnte";
import { getSettings } from "@/lib/settings-store";

function buildMessage(
  r: SuratRecord,
  trigger: "submit" | "verify" | "approve" | "reject" | "reminder",
  note?: string,
): string {
  const { notifications: n } = getSettings();
  const nama = r.pemohon ?? "Warga";
  const jenis = r.nama_surat ?? r.kode;
  const no = r.no ?? "";

  switch (trigger) {
    case "submit":
      return n.template_submit
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no);

    case "verify":
      return `Halo ${nama}, data pengajuan ${jenis} (${no}) telah diverifikasi oleh admin desa.\nSaat ini sedang menunggu persetujuan Kepala Desa. Mohon tunggu.`;

    case "approve":
      return n.template_approve
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no);

    case "reject":
      return n.template_reject
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no)
        .replace("{alasan}", note ?? "tidak memenuhi persyaratan");

    case "reminder":
      return `Halo ${nama}, pengajuan ${jenis} (${no}) belum diproses.\nSilakan hubungi kantor desa untuk info lebih lanjut.`;

    default:
      return `Update status surat ${jenis} (${no}): ${r.status}`;
  }
}

/**
 * Kirim notifikasi WA pada setiap perubahan status surat.
 * Semua trigger return { ok, message }.
 */
export async function notifySurat(
  r: SuratRecord,
  trigger: "submit" | "verify" | "approve" | "reject" | "reminder",
  note?: string,
): Promise<{ ok: boolean; message: string }> {
  const contact = (r.kontak ?? "").replace(/\D/g, "");
  if (!contact) {
    return { ok: false, message: "Nomor WA tidak tersedia" };
  }

  const message = buildMessage(r, trigger, note);

  if (trigger === "approve") {
    // Sisipkan link download hanya saat disetujui
    const noPart = (r.no ?? "").split("-").slice(1).join("-");
    const dlLink = `${typeof window !== "undefined" ? window.location.origin : ""}/verifikasi/${noPart}`;
    return sendWaNotification(contact, `${message}\n\nDownload dokumen: ${dlLink}`);
  }

  return sendWaNotification(contact, message);
}
