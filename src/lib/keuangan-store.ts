// Keuangan Store — APBDes ledger (IndexedDB-backed)
// Module-level state: entries, COA, plans, reports.
// Priority: Supabase (cloud) → IndexedDB (local) → empty.

import { idbGetAll, idbPut, idbDelete, idbReplaceAll } from "@/lib/idb-store";
import { getSessionToken } from "@/lib/auth";

// ── Types ───────────────────────────────────────────────────────────────────

export interface KeuanganCoa {
  id: string;
  code: string;
  type: "income" | "expense" | "asset" | "liability";
  name: string;
  parent_code: string | null;
  position: number;
  is_active: boolean;
  children?: KeuanganCoa[];
}

export interface KeuanganEntry {
  id: string;
  year: number;
  month: number;
  coa_code: string;
  type: "income" | "expense";
  amount: string; // stored as string to handle BigInt
  description: string | null;
  reference: string | null;
  is_realisasi: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface KeuanganRingkasan {
  year: number;
  months: Array<{
    month: number;
    income: number;
    expense: number;
    saldo: number;
  }>;
  totals: {
    total_income: number;
    total_expense: number;
    saldo_akhir: number;
  };
}

// ── Module State ─────────────────────────────────────────────────────────────

let _initialized = false;
let _entries: KeuanganEntry[] = [];
let _coa: Map<string, KeuanganCoa> = new Map();
let _ringkasan: KeuanganRingkasan | null = null;
let _loadingEntries = false;
const _loadingCoa = false;

// ── IndexedDB ────────────────────────────────────────────────────────────────

const DB_ENTRIES = "keuangan_entries";
const DB_COA = "keuangan_coa";

async function idbGetEntries(): Promise<KeuanganEntry[]> {
  try {
    const data = await idbGetAll<KeuanganEntry>(DB_ENTRIES as any);
    return data ?? [];
  } catch {
    return [];
  }
}

async function idbPutEntry(entry: KeuanganEntry): Promise<void> {
  await idbPut(DB_ENTRIES as any, entry);
}

async function idbReplaceAllEntries(entries: KeuanganEntry[]): Promise<void> {
  await idbReplaceAll(DB_ENTRIES as any, entries);
}

// ── API Helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const sessionToken = getSessionToken();
    const headers = {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    };
    const res = await fetch(`/api${path}`, { headers, ...options });
    const json = await res.json();
    if (res.ok && json.ok) return json.data as T;
    console.warn(`[keuangan] API ${path} failed:`, json.error ?? res.status);
    return null;
  } catch (err) {
    console.error(`[keuangan] API ${path} error:`, err);
    return null;
  }
}

// ── COA ──────────────────────────────────────────────────────────────────────

export async function initKeuanganCoaStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  try {
    const data = await apiFetch<{ items: KeuanganCoa[] }>("/keuangan/coa");
    if (data?.items) {
      _coa = new Map(data.items.map((c) => [c.code, c]));
      // Persist to IndexedDB
      for (const coa of data.items) {
        await idbPut(DB_COA as any, coa);
      }
    }
  } catch {
    /* ignore */
  }
  _initialized = true;
}

export function getCoa(code?: string): KeuanganCoa | undefined {
  return code ? _coa.get(code) : undefined;
}

export function listCoa(): KeuanganCoa[] {
  return Array.from(_coa.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export function listCoaByType(type: "income" | "expense"): KeuanganCoa[] {
  return listCoa().filter((c) => c.type === type);
}

// ── Entries ──────────────────────────────────────────────────────────────────

export async function loadEntries(year?: number): Promise<KeuanganEntry[]> {
  if (typeof window === "undefined") return [];
  _loadingEntries = true;

  try {
    const y = year ?? new Date().getFullYear();
    const data = await apiFetch<{ entries: KeuanganEntry[] }>(`/keuangan/entries?year=${y}`);
    if (data?.entries) {
      _entries = data.entries;
      await idbReplaceAllEntries(_entries);
    }
  } catch {
    const local = await idbGetEntries();
    _entries = local;
  }

  _loadingEntries = false;
  return _entries;
}

export async function addEntry(
  entry: Omit<KeuanganEntry, "id" | "created_at">,
): Promise<KeuanganEntry | null> {
  try {
    const sessionToken = getSessionToken();
    const res = await fetch("/api/keuangan/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify(entry),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const newEntry = json.data.entry as KeuanganEntry;
      _entries = [newEntry, ..._entries];
      await idbPutEntry(newEntry);
      return newEntry;
    }
    console.warn("[keuangan] addEntry failed:", json.error);
    return null;
  } catch (err) {
    console.error("[keuangan] addEntry error:", err);
    return null;
  }
}

export function listEntries(): KeuanganEntry[] {
  return _entries;
}

export function isLoadingEntries(): boolean {
  return _loadingEntries;
}

// ── Ringkasan Kas ─────────────────────────────────────────────────────────────

export async function loadRingkasan(year?: number): Promise<KeuanganRingkasan | null> {
  if (typeof window === "undefined") return null;

  const y = year ?? new Date().getFullYear();
  const data = await apiFetch<KeuanganRingkasan>(`/keuangan/ringkasan?year=${y}`);
  if (data) {
    _ringkasan = data;
    return data;
  }
  return null;
}

export function getRingkasan(): KeuanganRingkasan | null {
  return _ringkasan;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatRupiah(amount: number | bigint | string): string {
  const num = typeof amount === "string" ? parseInt(amount, 10) : Number(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatMonth(month: number): string {
  const BULAN = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return BULAN[month - 1] ?? "";
}
