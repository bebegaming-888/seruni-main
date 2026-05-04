/**
 * Nomor Surat Generator — Format Resmi Desa
 *
 * Pola: [kodeKlasifikasi]/[noUrut]/[inisialJabatan].[inisialDesa]/[bulanRomawi]/[tahun]
 * Contoh: 474/001/KDS.SRMB/V/2026
 *
 * Sumber kodeKlasifikasi: daftar_surat.csv (kolom KODE)
 * Counter per tahun disimpan di localStorage.
 */

import { getSettings } from "@/lib/settings-store";
import { getSuratMaster } from "@/data/surat-master";

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export interface FormatNomorSurat {
  kodeKlasifikasi: string; // "474"
  noUrut: number; // 1, 2, 3, ...
  tahun: number; // 2026
}

function toRomawi(month: number): string {
  return ROMAWI[month] ?? "";
}

/**
 * Konversi angka ke Romawi (untuk nomor surat).
 */
export function toRomawiNumber(n: number): string {
  return toRomawi(n);
}

/**
 * Format nomor surat sesuai pola resmi.
 * [kodeKlasifikasi]/[noUrut]/[inisialJabatan].[inisialDesa]/[bulanRomawi]/[tahun]
 *
 * Contoh: 474/001/KDS.SRMB/V/2026
 */
export function formatNomorSurat(params: FormatNomorSurat): string {
  const { kodeKlasifikasi, noUrut, tahun } = params;
  const settings = getSettings();
  const cfg = settings.nomor ?? { inisialJabatan: "KDS", inisialDesa: "SRMB" };

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const blnRomawi = toRomawi(bulan);
  const no = String(noUrut).padStart(3, "0");

  return `${kodeKlasifikasi}/${no}/${cfg.inisialJabatan}.${cfg.inisialDesa}/${blnRomawi}/${tahun}`;
}

/**
 * Ambil kodeKlasifikasi dari kode surat (misal "SKD" → "474")
 */
export function getKodeKlasifikasi(kodeSurat: string): string {
  const entry = getSuratMaster(kodeSurat);
  if (!entry) {
    console.warn(
      `[nomor-surat] Kode "${kodeSurat}" tidak ditemukan di SURAT_MASTER. Default "474".`,
    );
    return "474";
  }
  return entry.kodeKlasifikasi;
}

/**
 * Generate nomor surat baru untuk sebuah pengajuan.
 * Otomatis increment counter per tahun.
 */
export function generateNomorSurat(kodeSurat: string, tahun?: number): string {
  const kodeKlasifikasi = getKodeKlasifikasi(kodeSurat);
  const tahunDipakai = tahun ?? new Date().getFullYear();
  const noUrut = generateNextNoUrut(tahunDipakai);

  return formatNomorSurat({ kodeKlasifikasi, noUrut, tahun: tahunDipakai });
}

/* ==================== COUNTER STORAGE ==================== */

function getCounterKey(tahun: number): string {
  return `nomor_surat_no_urut_${tahun}`;
}

function getCounterKeyPrev(tahun: number): string {
  // previous year key (for migration)
  return `no_urut_${tahun}`;
}

/**
 * Baca dan increment counter nomor urut surat per tahun.
 * Bersih dari localStorage — aman untuk multi-instance.
 */
export function generateNextNoUrut(tahun: number): number {
  const key = getCounterKey(tahun);
  const prevKey = getCounterKeyPrev(tahun);

  // Check if old key exists, migrate if needed
  const oldVal = localStorage.getItem(prevKey);
  const currentRaw = localStorage.getItem(key);
  let current = parseInt(currentRaw ?? "0", 10);

  // Migrate from old key
  if (oldVal && current === 0) {
    current = parseInt(oldVal, 10);
    localStorage.setItem(key, String(current));
    localStorage.removeItem(prevKey);
  }

  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

/**
 * Reset counter nomor urut surat per tahun (untuk testing/reset).
 */
export function resetNoUrut(tahun: number): void {
  localStorage.removeItem(getCounterKey(tahun));
}

/**
 * Baca counter saat ini tanpa increment.
 */
export function getCurrentNoUrut(tahun: number): number {
  return parseInt(localStorage.getItem(getCounterKey(tahun)) ?? "0", 10);
}
