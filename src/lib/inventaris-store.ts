// Inventaris Store — Village Asset Inventory
// Module-level state, offline-first with Supabase sync

import { getSessionToken } from "@/lib/auth";

export interface InventarisCategory {
  id: string;
  code: string;
  name: string;
  depreciation_rate: number;
  description?: string;
  position: number;
  is_active: boolean;
}

export interface InventarisAsset {
  id: string;
  category_id?: string;
  code?: string;
  name: string;
  description?: string;
  condition: "baik" | "rusak_ringan" | "rusak_berat" | "hilang" | "dijual";
  acquisition_date?: string;
  acquisition_value: number;
  current_value: number;
  location?: string;
  responsible?: string;
  dusun?: string;
  year_acquired?: number;
  photos?: string[];
  notes?: string;
  is_active: boolean;
  status: "owned" | "rented" | "leased" | "disposed";
  category?: InventarisCategory | null;
  created_at: string;
  updated_at?: string;
}

export interface InventarisSummary {
  total_assets: number;
  total_acquisition_value: number;
  total_current_value: number;
}

let _assets: InventarisAsset[] = [];
let _categories: InventarisCategory[] = [];
let _summary: InventarisSummary | null = null;
let _loadingAssets = false;
let _loadingCategories = false;

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

export async function loadInventarisCategories(): Promise<InventarisCategory[]> {
  if (typeof window === "undefined") return [];
  _loadingCategories = true;
  const data = await apiFetch<{ items: InventarisCategory[] }>("/inventaris/categories");
  if (data?.items) _categories = data.items;
  _loadingCategories = false;
  return _categories;
}

export async function loadInventaris(params?: {
  category?: string;
  condition?: string;
  search?: string;
}): Promise<InventarisAsset[]> {
  if (typeof window === "undefined") return [];
  _loadingAssets = true;
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.condition) q.set("condition", params.condition);
  if (params?.search) q.set("search", params.search);
  const data = await apiFetch<{ items: InventarisAsset[] }>(`/inventaris?${q}`);
  if (data?.items) _assets = data.items;
  else _assets = [];
  _loadingAssets = false;
  return _assets;
}

export async function loadInventarisSummary(year?: number): Promise<InventarisSummary | null> {
  if (typeof window === "undefined") return null;
  const q = year ? `?year=${year}` : "";
  const data = await apiFetch<InventarisSummary>(`/inventaris/report/summary${q}`);
  if (data) _summary = data;
  return _summary;
}

export async function addInventarisAsset(
  asset: Omit<InventarisAsset, "id" | "created_at" | "is_active" | "current_value">,
): Promise<InventarisAsset | null> {
  try {
    const token = getSessionToken();
    const res = await fetch("/api/inventaris", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(asset),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const newAsset = json.data.item as InventarisAsset;
      _assets = [newAsset, ..._assets];
      return newAsset;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateInventarisAsset(
  id: string,
  updates: Partial<InventarisAsset>,
): Promise<InventarisAsset | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/inventaris/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const updated = json.data.item as InventarisAsset;
      _assets = _assets.map((a) => (a.id === id ? updated : a));
      return updated;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteInventarisAsset(id: string): Promise<boolean> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/inventaris/${id}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      _assets = _assets.filter((a) => a.id !== id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function listInventarisAssets(): InventarisAsset[] {
  return _assets;
}
export function listInventarisCategories(): InventarisCategory[] {
  return _categories;
}
export function getInventarisSummary(): InventarisSummary | null {
  return _summary;
}
export function isLoadingInventarisAssets(): boolean {
  return _loadingAssets;
}
export function isLoadingInventarisCategories(): boolean {
  return _loadingCategories;
}

export function formatRupiah(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

export const CONDITION_LABELS: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  hilang: "Hilang",
  dijual: "Dijual",
};

export const CONDITION_COLORS: Record<string, string> = {
  baik: "text-success",
  rusak_ringan: "text-warning",
  rusak_berat: "text-destructive",
  hilang: "text-muted-foreground",
  dijual: "text-info",
};

export const STATUS_LABELS: Record<string, string> = {
  owned: "Milik Desa",
  rented: "Sewa",
  leased: "Sewa Beli",
  disposed: "Dihibahkan",
};
