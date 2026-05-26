// Kelompok Store — Community groups and members
import { getSessionToken } from "@/lib/auth";

export interface Kelompok {
  id: string;
  category: string;
  name: string;
  leader_name?: string;
  leader_phone?: string;
  member_count: number;
  established_date?: string;
  description?: string;
  notes?: string;
  is_active: boolean;
  members?: KelompokMember[];
  created_at: string;
  updated_at?: string;
}

export interface KelompokMember {
  id: string;
  kelompok_id: string;
  warga_nik?: string;
  name: string;
  position?: string;
  phone?: string;
  is_active: boolean;
  joined_at: string;
}

let _kelompok: Kelompok[] = [];
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

export async function loadKelompok(params?: {
  category?: string;
  search?: string;
}): Promise<Kelompok[]> {
  if (typeof window === "undefined") return [];
  _loading = true;
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  const data = await apiFetch<{ items: Kelompok[] }>(`/kelompok?${q}`);
  if (data?.items) _kelompok = data.items;
  else _kelompok = [];
  _loading = false;
  return _kelompok;
}

export async function addKelompok(
  k: Omit<Kelompok, "id" | "created_at" | "members" | "member_count" | "is_active">,
): Promise<Kelompok | null> {
  try {
    const token = getSessionToken();
    const res = await fetch("/api/kelompok", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...k, member_count: 0 }),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const newK = json.data.item as Kelompok;
      _kelompok = [newK, ..._kelompok];
      return newK;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateKelompok(
  id: string,
  updates: Partial<Kelompok>,
): Promise<Kelompok | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/kelompok/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const updated = json.data.item as Kelompok;
      _kelompok = _kelompok.map((k) => (k.id === id ? updated : k));
      return updated;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteKelompok(id: string): Promise<boolean> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/kelompok/${id}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      _kelompok = _kelompok.filter((k) => k.id !== id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function addKelompokMember(
  kelompokId: string,
  m: Omit<KelompokMember, "id" | "kelompok_id" | "joined_at" | "is_active">,
): Promise<KelompokMember | null> {
  try {
    const token = getSessionToken();
    const res = await fetch(`/api/kelompok/${kelompokId}/member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(m),
    });
    const json = await res.json();
    if (res.ok && json.ok) return json.data.item as KelompokMember;
    return null;
  } catch {
    return null;
  }
}

export function listKelompok(): Kelompok[] {
  return _kelompok;
}
export function isLoadingKelompok(): boolean {
  return _loading;
}
