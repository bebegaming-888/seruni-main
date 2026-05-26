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
// Village identity (nama_desa) dan QR verification URL selalu disisipkan.

import type { SuratRecord } from "@/lib/esurat-store";
import { sendWaNotification } from "@/lib/fonnte";
import { getSettings } from "@/lib/settings-store";

function buildMessage(
  r: SuratRecord,
  trigger: "submit" | "verify" | "forward" | "approve" | "reject" | "reminder",
  note?: string,
): string {
  const { notifications: n, village } = getSettings();
  const nama = r.pemohon ?? "Warga";
  const jenis = r.nama_surat ?? r.kode;
  const no = r.no ?? "";

  switch (trigger) {
    case "submit":
      return n.template_submit
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no)
        .replace("{nama_desa}", village.name);

    case "verify":
      return `Halo ${nama}, data pengajuan ${jenis} (${no}) telah diverifikasi oleh admin desa.\nSaat ini sedang menunggu persetujuan Kepala Desa. Mohon tunggu.`;

    case "forward":
      return `Halo ${nama}, pengajuan ${jenis} (${no}) telah diverifikasi dan sedang diajukan kepada Kepala Desa untuk persetujuan.\nMohon tunggu hasilnya. Terima kasih.`;

    case "approve":
      return n.template_approve
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no)
        .replace("{nama_desa}", village.name);

    case "reject":
      return n.template_reject
        .replace("{nama}", nama)
        .replace("{jenis_surat}", jenis)
        .replace("{no}", no)
        .replace("{alasan}", note ?? "tidak memenuhi persyaratan")
        .replace("{nama_desa}", village.name);

    case "reminder":
      return `Halo ${nama}, pengajuan ${jenis} (${no}) belum diproses.\nSilakan hubungi kantor desa untuk info lebih lanjut.`;

    default:
      return `Update status surat ${jenis} (${no}): ${r.status}`;
  }
}

/**
 * Kirim notifikasi WA pada setiap perubahan status surat.
 * Semua trigger return { ok, message }.
 *
 * GUARD: Cek wa_enabled dan per-event flags sebelum kirim.
 */
export async function notifySurat(
  r: SuratRecord,
  trigger: "submit" | "verify" | "forward" | "approve" | "reject" | "reminder",
  note?: string,
): Promise<{ ok: boolean; message: string }> {
  const settings = getSettings();

  // GUARD: Cek wa_enabled master toggle
  if (!settings.notifications.wa_enabled) {
    return { ok: false, message: "Notifikasi WA dinonaktifkan" };
  }

  // GUARD: Cek per-event flag
  const eventFlagMap: Record<string, keyof typeof settings.notifications> = {
    submit: "notify_on_submit",
    verify: "notify_on_verify",
    approve: "notify_on_approve",
    reject: "notify_on_reject",
    forward: "notify_on_verify", // forward → same as verify
    reminder: "notify_on_submit", // reminder → same as submit
  };
  const flagKey = eventFlagMap[trigger];
  if (flagKey && settings.notifications[flagKey as keyof typeof settings.notifications] === false) {
    return { ok: false, message: `Notifikasi "${trigger}" dinonaktifkan di pengaturan` };
  }

  const contact = (r.kontak ?? "").replace(/\D/g, "");
  if (!contact) {
    return { ok: false, message: "Nomor WA tidak tersedia" };
  }

  const message = buildMessage(r, trigger as Parameters<typeof buildMessage>[1], note);

  if (trigger === "approve") {
    // Untuk approved record: warga bisa verifikasi keaslian surat via QR atau link di bawah
    const dlLink = `${typeof window !== "undefined" ? window.location.origin : ""}/verifikasi/${encodeURIComponent(r.no)}`;
    return sendWaNotification(contact, `${message}\n\nCek keaslian surat: ${dlLink}`);
  }

  return sendWaNotification(contact, message);
}
