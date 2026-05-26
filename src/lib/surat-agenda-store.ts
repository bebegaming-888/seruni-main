// Surat Agenda Store — buku agenda surat keluar & masuk

import { getSessionToken } from "@/lib/auth";

export interface SuratAgenda {
  id: string;
  direction: "outgoing" | "incoming";
  nomor_agenda: string;
  tanggal: string;
  kode_surat?: string;
  nomor_surat?: string;
  Perihal: string;
  kepada?: string;
  asal_surat?: string;
  related_surat_id?: string;
  lampiran_url?: string;
  keterangan?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

let _items: SuratAgenda[] = [];
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

export async function loadAgenda(filters?: {
  direction?: "outgoing" | "incoming";
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}): Promise<SuratAgenda[]> {
  if (typeof window === "undefined") return [];
  _loading = true;
  const params = new URLSearchParams();
  if (filters?.direction) params.set("direction", filters.direction);
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  if (filters?.page) params.set("page", String(filters.page));
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch<{ items: SuratAgenda[] }>(`/surat-agenda${query}`);
  if (data?.items) _items = data.items;
  _loading = false;
  return _items;
}

export async function createAgenda(
  entry: Omit<SuratAgenda, "id" | "nomor_agenda" | "created_at">,
): Promise<SuratAgenda | null> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/surat-agenda", {
      method: "POST",
      headers,
      body: JSON.stringify(entry),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      const item = json.data.item as SuratAgenda;
      _items = [item, ..._items];
      return item;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteAgenda(id: string): Promise<boolean> {
  try {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api/surat-agenda/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      _items = _items.filter((i) => i.id !== id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function listAgenda(): SuratAgenda[] {
  return _items;
}
export function isLoadingAgenda(): boolean {
  return _loading;
}

export function formatAgendaDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
