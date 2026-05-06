/**
 * Nomor Surat Generator — Format Resmi Desa
 *
 * Counter per tahun kini disimpan di IndexedDB (store: "nomor_surat").
 * In-memory cache digunakan untuk pembacaan sinkron — aman dan cepat.
 * Fallback ke localStorage untuk backward compat jika IDB belum diinit.
 */

import { getSettings } from "@/lib/settings-store";
import { getSuratMaster } from "@/data/surat-master";
import { isSupabaseConfigured } from "./supabase";
import { idbGet, idbPut } from "@/lib/idb-store";

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export interface FormatNomorSurat {
  kodeKlasifikasi: string;
  noUrut: number;
  tahun: number;
}

// ── In-Memory Counter Cache ───────────────────────────────────────────────────
const _counter: Record<number, number> = {};

/** Async init — baca semua counter tahun dari IndexedDB ke cache. */
export async function initNomorSuratStore(): Promise<void> {
  if (typeof window === "undefined") return;
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    try {
      const rec = await idbGet<{ id: string; counter: number }>("nomor_surat", String(y));
      if (rec) {
        _counter[y] = rec.counter;
        continue;
      }
      // Fallback: coba localStorage lama
      const lsVal = localStorage.getItem(`nomor_surat_no_urut_${y}`);
      if (lsVal) {
        _counter[y] = parseInt(lsVal, 10);
        await idbPut("nomor_surat", { id: String(y), counter: _counter[y] });
      }
    } catch (e) {
      console.warn(`[nomor-surat] init tahun ${y}:`, e);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function toRomawiNumber(n: number): string {
  return ROMAWI[n] ?? "";
}

export function formatNomorSurat(params: FormatNomorSurat): string {
  const { kodeKlasifikasi, noUrut, tahun } = params;
  const settings = getSettings();
  const cfg = settings.nomor ?? { inisialJabatan: "KDS", inisialDesa: "SRMB" };
  const bulanRomawi = ROMAWI[new Date().getMonth() + 1];
  return `${kodeKlasifikasi}/${String(noUrut).padStart(3, "0")}/${cfg.inisialJabatan}.${cfg.inisialDesa}/${bulanRomawi}/${tahun}`;
}

export function getKodeKlasifikasi(kodeSurat: string): string {
  const entry = getSuratMaster(kodeSurat);
  if (!entry) {
    console.warn(`[nomor-surat] Kode "${kodeSurat}" tidak ada di SURAT_MASTER. Default "474".`);
    return "474";
  }
  return entry.kodeKlasifikasi;
}

export async function generateNomorSurat(kodeSurat: string, tahun?: number): Promise<string> {
  const tahunDipakai = tahun ?? new Date().getFullYear();
  if (isSupabaseConfigured) {
    try {
      const res = await fetch("/api/generate-nomor-surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: kodeSurat }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; nomor?: string };
        if (data.ok && data.nomor) return data.nomor;
      }
    } catch {
      /* fallback */
    }
  }
  const kodeKlasifikasi = getKodeKlasifikasi(kodeSurat);
  const noUrut = await generateNextNoUrut(tahunDipakai);
  return formatNomorSurat({ kodeKlasifikasi, noUrut, tahun: tahunDipakai });
}

// ── Counter Storage ───────────────────────────────────────────────────────────

/** Increment counter per tahun — tulis ke cache + IndexedDB. */
export async function generateNextNoUrut(tahun: number): Promise<number> {
  if (typeof window === "undefined") return 1;
  const current = _counter[tahun] ?? 0;
  const next = current + 1;
  _counter[tahun] = next;
  // Write-behind ke IndexedDB (non-blocking)
  idbPut("nomor_surat", { id: String(tahun), counter: next }).catch(console.warn);
  return next;
}

/** Reset counter (untuk testing/tahun baru). */
export async function resetNoUrut(tahun: number): Promise<void> {
  _counter[tahun] = 0;
  await idbPut("nomor_surat", { id: String(tahun), counter: 0 });
}

/** Baca counter saat ini tanpa increment. */
export function getCurrentNoUrut(tahun: number): number {
  return _counter[tahun] ?? 0;
}
