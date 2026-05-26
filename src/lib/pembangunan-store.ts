// Pembangunan Store — RPJMDes/RKP project tracking
// Module-level state, offline-first

import { getSessionToken } from "@/lib/auth";

export interface PembangunanProject {
  id: string;
  type: "rpjmdes" | "rkp";
  year: number;
  title: string;
  description?: string;
  budget: number;
  location?: string;
  dusun?: string;
  start_year?: number;
  end_year?: number;
  status: "rencana" | "aktif" | "selesai" | "batal";
  priority: "low" | "medium" | "high" | "urgent";
  activities?: PembangunanActivity[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface PembangunanActivity {
  id: string;
  pembangunan_id: string;
  year: number;
  month?: number;
  activity: string;
  target?: string;
  realization: number;
  output?: string;
  notes?: string;
  created_at: string;
}

export interface PembangunanSummary {
  total: number;
  total_budget: number;
  aktif_budget: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

let _projects: PembangunanProject[] = [];
let _summary: PembangunanSummary | null = null;
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

export async function loadPembangunan(params?: {
  type?: string;
  year?: number;
  status?: string;
  search?: string;
}): Promise<PembangunanProject[]> {
  if (typeof window === "undefined") return [];
  _loading = true;
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.year) q.set("year", String(params.year));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const data = await apiFetch<{ items: PembangunanProject[] }>(`/pembangunan?${q}`);
  if (data?.items) _projects = data.items;
  else _projects = [];
  _loading = false;
  return _projects;
}

export async function loadPembangunanSummary(year?: number): Promise<PembangunanSummary | null> {
  if (typeof window === "undefined") return null;
  const q = year ? `?year=${year}` : "";
  const data = await apiFetch<PembangunanSummary>(`/pembangunan/report/summary${q}`);
  if (data) _summary = data;
  return _summary;
}

export async function addPembangunanProject(
  p: Omit<PembangunanProject, "id" | "created_at" | "activities">,
): Promise<PembangunanProject | null> {
  try {
    const token = getSessionToken();
    const res = await fetch("/api/pembangunan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(p),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const newProj = json.data.item as PembangunanProject;
      _projects = [newProj, ..._projects];
      return newProj;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updatePembangunanProject(
  id: string,
  updates: Partial<PembangunanProject>,
): Promise<PembangunanProject | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/pembangunan/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const updated = json.data.item as PembangunanProject;
      _projects = _projects.map((p) => (p.id === id ? updated : p));
      return updated;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deletePembangunanProject(id: string): Promise<boolean> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/pembangunan/${id}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      _projects = _projects.filter((p) => p.id !== id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function addPembangunanActivity(
  projectId: string,
  activity: Omit<PembangunanActivity, "id" | "pembangunan_id" | "created_at">,
): Promise<PembangunanActivity | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/pembangunan/${projectId}/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(activity),
    });
    const json = await res.json();
    if (res.ok && json.ok) return json.data.item as PembangunanActivity;
    return null;
  } catch {
    return null;
  }
}

export function listPembangunan(): PembangunanProject[] {
  return _projects;
}
export function getPembangunanSummary(): PembangunanSummary | null {
  return _summary;
}
export function isLoadingPembangunan(): boolean {
  return _loading;
}

export const STATUS_LABELS_P: Record<string, string> = {
  rencana: "Rencana",
  aktif: "Aktif",
  selesai: "Selesai",
  batal: "Dibatalkan",
};
export const STATUS_COLORS_P: Record<string, string> = {
  rencana: "text-muted-foreground",
  aktif: "text-primary",
  selesai: "text-success",
  batal: "text-destructive",
};
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Urgent",
};
export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-info",
  high: "text-warning",
  urgent: "text-destructive",
};

export function formatRupiah(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}
