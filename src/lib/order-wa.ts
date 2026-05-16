/**
 * order-wa.ts — WhatsApp message builders for marketplace orders
 * All messages use Fonnte-compatible plain text format.
 */

import type { Order, OrderItem } from "@/stores/orders-store";

// ── Helpers ────────────────────────────────────────────────────────────────

export function normalizeWANumber(wa: string): string {
  // "081234567890" → "6281234567890"
  const cleaned = wa.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) return cleaned;
  return cleaned;
}

export function buildWALink(wa: string, message: string): string {
  const num = normalizeWANumber(wa);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

// ── Status labels ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  awaiting_confirmation: "Menunggu Konfirmasi Pembayaran",
  confirmed: "Pesanan Dikonfirmasi",
  processing: "Sedang Diproses",
  shipped: "Telah Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Transfer Bank",
  cod: "COD (Bayar Saat Terima)",
};

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Message: New Order (to seller) ──────────────────────────────────────────

export function buildNewOrderMessage(order: Order): string {
  const items = order.items
    .map(
      (i) =>
        `• ${i.productName} ×${i.quantity} ${i.unitPrice > 0 ? `= ${formatRupiah(i.subtotal)}` : ""}`,
    )
    .join("\n");

  return (
    `📦 *Pesanan Baru — Pasar Desa Seruni Mumbul*\n` +
    `─────────────────────────────────\n` +
    `ID Pesanan : *${order.orderId}*\n` +
    `Tanggal    : ${formatDate(order.createdAt)}\n` +
    `─────────────────────────────────\n` +
    `*Pembeli:*\n` +
    `${order.buyerName}\n` +
    `WA: ${order.buyerWa}\n` +
    `Alamat: ${order.buyerAddress}\n` +
    `─────────────────────────────────\n` +
    `*Barang:*\n${items}\n` +
    `─────────────────────────────────\n` +
    `*Total: ${formatRupiah(order.totalAmount)}*\n` +
    `Metode  : ${PAYMENT_METHOD_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "-"}\n` +
    `─────────────────────────────────\n` +
    `Mohon segera diproses. Terima kasih! 🙏`
  );
}

// ── Message: New Order (to buyer — confirmation) ──────────────────────────────

export function buildOrderConfirmationMessage(order: Order, bankAccounts?: BankAccount[]): string {
  let bankInfo = "";
  if (order.paymentMethod === "bank_transfer" && bankAccounts && bankAccounts.length > 0) {
    bankInfo =
      `\n*Transfer ke salah satu rekening:*\n` +
      bankAccounts
        .map((b) => `${b.bank_name}\nNo. Rek: *${b.account_number}*\na.n. ${b.account_name}`)
        .join("\n\n") +
      `\n\nMohon transfer tepat hingga *${formatRupiah(order.totalAmount)}* ` +
      `dan upload bukti transfer di halaman pesanan Anda.`;
  }

  return (
    `✅ *Pesanan Diterima — ${order.orderId}*\n` +
    `─────────────────────────────────\n` +
    `Halo *${order.buyerName}*,\n` +
    `pesanan Anda telah kami terima.\n\n` +
    `Total Pembayaran: *${formatRupiah(order.totalAmount)}*${bankInfo}\n` +
    `Metode: ${PAYMENT_METHOD_LABELS[order.paymentMethod ?? ""] ?? "-"}\n` +
    `─────────────────────────────────\n` +
    `Pesanan akan diproses setelah pembayaran dikonfirmasi.\n` +
    `Kami akan memberi tahu Anda via WA saat status berubah.\n` +
    `Terima kasih! 🙏`
  );
}

// ── Message: Status Update (to buyer) ──────────────────────────────────────

export function buildStatusUpdateMessage(order: Order, newStatus: string): string {
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  const additionalInfo: Record<string, string> = {
    awaiting_confirmation:
      "Silakan upload bukti transfer di halaman pesanan Anda.",
    confirmed:
      "Pembayaran Anda telah dikonfirmasi. Pesanan sedang disiapkan.",
    processing: "Pesanan sedang disiapkan oleh penjual.",
    shipped:
      "Pesanan telah dikirim! Silakan tunggu delivery.",
    completed:
      "Pesanan telah selesai. Terima kasih atas kepercayaan Anda! 🎉",
    cancelled:
      "Pesanan telah dibatalkan. Stok telah dikembalikan.",
  };

  const extra = additionalInfo[newStatus] ?? "";

  return (
    `📋 *Update Pesanan — ${order.orderId}*\n` +
    `─────────────────────────────────\n` +
    `Status: *${label}*\n` +
    (extra ? `\n${extra}` : "") +
    `\n─────────────────────────────────\n` +
    `Total: ${formatRupiah(order.totalAmount)}\n` +
    `Tanggal: ${formatDate(order.updatedAt)}`
  );
}

// ── Types for bank accounts (used by checkout + message builders) ─────────────

export type BankAccount = {
  bank_name: string;
  account_number: string;
  account_name: string;
};