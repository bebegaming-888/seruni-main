// Pengaduan Admin Store — server-side API integration
// Loads pengaduan data from /api/pengaduan/admin endpoint

import { getSessionToken } from "@/lib/auth";

export interface PengaduanAdminItem {
  ticket: string;
  nama: string;
  nik?: string;
  kontak: string;
  kategori: string;
  judul: string;
  isi: string;
  status: "Baru" | "Diproses" | "Selesai" | "Ditolak";
  prioritas: "Rendah" | "Normal" | "Tinggi" | "Urgent";
  admin_catatan?: string;
  admin_tindak?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface PengaduanStats {
  year: number;
  total: number;
  byStatus: Record<string, number>;
  byPrioritas: Record<string, number>;
  topKategori: Array<{ kategori: string; count: number }>;
  avgResolutionDays: number;
  trend: Array<{ date: string; count: number }>;
  monthly: Array<{ month: number; count: number }>;
  openCount: number;
}

export interface PengaduanFilters {
  status?: string;
  kategori?: string;
  prioritas?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

let _items: PengaduanAdminItem[] = [];
let _stats: PengaduanStats | null = null;
let _loading = false;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api${path}`, { headers, ...options });
    const json = await res.json();
    if (res.ok && json.ok) return json.data as T;
    console.warn(`[pengaduan-admin] API ${path} failed:`, json.error);
    return null;
  } catch (err) {
    console.error(`[pengaduan-admin] API ${path} error:`, err);
    return null;
  }
}

export async function loadPengaduan(filters?: PengaduanFilters): Promise<PengaduanAdminItem[]> {
  if (typeof window === "undefined") return [];
  _loading = true;
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.kategori) params.set("kategori", filters.kategori);
    if (filters?.prioritas) params.set("prioritas", filters.prioritas);
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    if (filters?.q) params.set("q", filters.q);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch<{ items: PengaduanAdminItem[] }>(`/pengaduan/admin${query}`);
    if (data?.items) _items = data.items;
  } catch {
    /* use cached */
  }
  _loading = false;
  return _items;
}

export async function loadStats(year?: number): Promise<PengaduanStats | null> {
  if (typeof window === "undefined") return null;
  const data = await apiFetch<PengaduanStats>(
    `/pengaduan/admin/stats?year=${year ?? new Date().getFullYear()}`,
  );
  if (data) _stats = data;
  return _stats;
}

export async function updatePengaduan(
  ticket: string,
  updates: { status?: string; admin_catatan?: string; admin_tindak?: string },
): Promise<PengaduanAdminItem | null> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api/pengaduan/admin/${encodeURIComponent(ticket)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const updated = json.data.item as PengaduanAdminItem;
      const idx = _items.findIndex((i) => i.ticket === ticket);
      if (idx >= 0) _items[idx] = updated;
      return updated;
    }
    return null;
  } catch {
    return null;
  }
}

export function listPengaduanItems(): PengaduanAdminItem[] {
  return _items;
}
export function getStats(): PengaduanStats | null {
  return _stats;
}
export function isLoading(): boolean {
  return _loading;
}
