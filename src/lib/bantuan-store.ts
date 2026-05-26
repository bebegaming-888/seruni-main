// Bantuan Store — Social assistance programs
import { getSessionToken } from "@/lib/auth";

export interface BantuanProgram {
  id: string;
  name: string;
  source?: string;
  year: number;
  start_date?: string;
  end_date?: string;
  total_budget: number;
  recipient_count: number;
  description?: string;
  status: "planning" | "active" | "completed" | "cancelled";
  recipients?: BantuanRecipient[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface BantuanRecipient {
  id: string;
  bantuan_id: string;
  warga_nik: string;
  warga_name: string;
  warga_address?: string;
  amount: number;
  distribution_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

let _programs: BantuanProgram[] = [];
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

export async function loadBantuan(params?: {
  year?: number;
  status?: string;
  search?: string;
}): Promise<BantuanProgram[]> {
  if (typeof window === "undefined") return [];
  _loading = true;
  const q = new URLSearchParams();
  if (params?.year) q.set("year", String(params.year));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const data = await apiFetch<{ items: BantuanProgram[] }>(`/bantuan?${q}`);
  if (data?.items) _programs = data.items;
  else _programs = [];
  _loading = false;
  return _programs;
}

export async function addBantuanProgram(
  p: Omit<BantuanProgram, "id" | "created_at" | "recipients" | "recipient_count">,
): Promise<BantuanProgram | null> {
  try {
    const token = getSessionToken();
    const res = await fetch("/api/bantuan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...p, recipient_count: 0 }),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const newProg = json.data.item as BantuanProgram;
      _programs = [newProg, ..._programs];
      return newProg;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateBantuanProgram(
  id: string,
  updates: Partial<BantuanProgram>,
): Promise<BantuanProgram | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/bantuan/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const updated = json.data.item as BantuanProgram;
      _programs = _programs.map((p) => (p.id === id ? updated : p));
      return updated;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteBantuanProgram(id: string): Promise<boolean> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/bantuan/${id}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      _programs = _programs.filter((p) => p.id !== id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function addBantuanRecipient(
  programId: string,
  r: Omit<BantuanRecipient, "id" | "bantuan_id" | "created_at" | "is_active">,
): Promise<BantuanRecipient | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/bantuan/${programId}/recipient`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(r),
    });
    const json = await res.json();
    if (res.ok && json.ok) return json.data.item as BantuanRecipient;
    return null;
  } catch {
    return null;
  }
}

export function listBantuanPrograms(): BantuanProgram[] {
  return _programs;
}
export function isLoadingBantuan(): boolean {
  return _loading;
}

export function formatRupiah(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

export const STATUS_LABELS_B: Record<string, string> = {
  planning: "Rencana",
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};
export const STATUS_COLORS_B: Record<string, string> = {
  planning: "text-muted-foreground",
  active: "text-primary",
  completed: "text-success",
  cancelled: "text-destructive",
};
