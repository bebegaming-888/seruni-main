// Statistik Store — Population statistics from warga table
// Module-level state, loads from /api/statistik/penduduk

import { getSessionToken } from "@/lib/auth";

export interface StatistikPenduduk {
  total: number;
  gender: Record<string, number>;
  ageGroups: Array<{ label: string; count: number }>;
  pekerjaan: Array<{ name: string; count: number }>;
  agama: Array<{ name: string; count: number }>;
  pendidikan: Array<{ name: string; count: number }>;
  perkawinan: Array<{ name: string; count: number }>;
  wilayah: Array<{ name: string; count: number }>;
  genderRatio: string | null;
  avgAge: number;
  recordCount: number;
}

export interface ChartData {
  type: string;
  data: Array<{ name: string; value: number }>;
}

let _statistik: StatistikPenduduk | null = null;
const _chartCache: Map<string, ChartData["data"]> = new Map();
let _loading = false;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api${path}`, { headers, ...options });
    const json = await res.json();
    if (res.ok && json.ok) return json.data as T;
    return null;
  } catch {
    return null;
  }
}

export async function loadStatistik(year?: number): Promise<StatistikPenduduk | null> {
  if (typeof window === "undefined") return null;
  _loading = true;
  const data = await apiFetch<StatistikPenduduk>(
    `/statistik/penduduk?year=${year ?? new Date().getFullYear()}`,
  );
  if (data) _statistik = data;
  _loading = false;
  return _statistik;
}

export async function loadChart(
  type: "jk" | "usia" | "pekerjaan" | "agama" | "pendidikan" | "wilayah",
): Promise<ChartData["data"]> {
  if (_chartCache.has(type)) return _chartCache.get(type)!;
  const data = await apiFetch<ChartData>(`/statistik/penduduk/chart?type=${type}`);
  if (data?.data) {
    _chartCache.set(type, data.data);
    return data.data;
  }
  return [];
}

export function getStatistik(): StatistikPenduduk | null {
  return _statistik;
}
export function isLoadingStatistik(): boolean {
  return _loading;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}
