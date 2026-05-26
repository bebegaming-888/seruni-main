/**
 * src/lib/wilayah-store.ts
 * Zustand store for WILAYAH (administrative area) CRUD.
 *
 * Admin-only operations via /api/wilayah endpoint.
 * Source of truth: public.wilayah table.
 *
 * Level hierarchy: provinsi → kabupaten → kecamatan → desa
 */

// Re-export initWilayahStore for backward compatibility with store-init.ts
// The old function loaded from Supabase directly; kept as no-op since
// admin CRUD now uses /api/wilayah endpoint.
export async function initWilayahStore(): Promise<void> {
  // No-op: store-init.ts calls this at app startup but admin CRUD
  // fetches data on-demand via /api/wilayah. For read-only village data
  // needed elsewhere, use the Zustand store's init() in the admin UI.
}

import { create } from "zustand";
import type {
  WilayahRecord,
  WilayahLevel,
  CreateWilayahInput,
  UpdateWilayahInput,
  WilayahData,
} from "../types/wilayah";

// ── State ───────────────────────────────────────────────────────────────────

interface WilayahState {
  records: WilayahRecord[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface WilayahActions {
  init: () => Promise<void>;
  getAll: () => WilayahRecord[];
  getByLevel: (level: WilayahLevel) => WilayahRecord[];
  getByKode: (kode: string) => WilayahRecord | undefined;
  getChild: (parentKode: string) => WilayahRecord[];
  create: (input: CreateWilayahInput) => Promise<WilayahRecord>;
  update: (id: string, input: UpdateWilayahInput) => Promise<WilayahRecord>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

type WilayahStore = WilayahState & { actions: WilayahActions };

// ── Store ───────────────────────────────────────────────────────────────────

export const useWilayahStore = create<WilayahStore>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  initialized: false,

  actions: {
    init: async () => {
      if (get().initialized && get().records.length > 0) return;
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/wilayah", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        set({ records: json.data ?? [], loading: false, initialized: true });
      } catch (e: unknown) {
        set({ error: (e as Error).message, loading: false });
      }
    },

    getAll: () => get().records,

    getByLevel: (level: WilayahLevel) =>
      get().records.filter((w) => w.level === level && w.is_active),

    getByKode: (kode: string) => get().records.find((w) => w.kode === kode && w.is_active),

    getChild: (parentKode: string) =>
      get().records.filter((w) => w.parent_kode === parentKode && w.is_active),

    create: async (input: CreateWilayahInput) => {
      set({ loading: true, error: null });
      try {
        const session = localStorage.getItem("session") ?? "";
        const res = await fetch("/api/wilayah", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session}` },
          credentials: "include",
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const record = json.data as WilayahRecord;
        set((state) => ({ records: [...state.records, record], loading: false }));
        return record;
      } catch (e: unknown) {
        set({ error: (e as Error).message, loading: false });
        throw e;
      }
    },

    update: async (id: string, input: UpdateWilayahInput) => {
      set({ loading: true, error: null });
      try {
        const session = localStorage.getItem("session") ?? "";
        const res = await fetch(`/api/wilayah/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session}` },
          credentials: "include",
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const record = json.data as WilayahRecord;
        set((state) => ({
          records: state.records.map((w) => (w.id === id ? record : w)),
          loading: false,
        }));
        return record;
      } catch (e: unknown) {
        set({ error: (e as Error).message, loading: false });
        throw e;
      }
    },

    remove: async (id: string) => {
      set({ loading: true, error: null });
      try {
        const session = localStorage.getItem("session") ?? "";
        const res = await fetch(`/api/wilayah/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session}` },
          credentials: "include",
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        set((state) => ({
          records: state.records.filter((w) => w.id !== id),
          loading: false,
        }));
      } catch (e: unknown) {
        set({ error: (e as Error).message, loading: false });
        throw e;
      }
    },

    reset: () => set({ records: [], loading: false, error: null, initialized: false }),
  },
}));

export const wilayahActions = () => useWilayahStore.getState().actions;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function parseWilayahData(raw: WilayahData | string | null | undefined): WilayahData {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

export function getVillageHierarchy(records: WilayahRecord[]) {
  const map: Record<string, WilayahRecord> = {};
  records.forEach((w) => {
    if (w.is_active) map[w.level] = w;
  });
  return {
    provinsi: map["provinsi"] ?? null,
    kabupaten: map["kabupaten"] ?? null,
    kecamatan: map["kecamatan"] ?? null,
    desa: map["desa"] ?? null,
  };
}
