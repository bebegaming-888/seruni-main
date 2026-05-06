/**
 * content-store.ts — Zustand + IndexedDB for CMS Contents
 * Covers: Berita, Pengumuman, Agenda, Galeri, Komoditas, Apbdes
 */

import { create } from "zustand";
import { idbGet, idbPut, idbDelete, idbGetAll } from "./idb-store";
import { generateId } from "./utils";

// --- Types ---

// 1. Berita
export type ArticleCategory =
  | "Berita"
  | "Pengumuman"
  | "Agenda"
  | "Budaya"
  | "Ekonomi"
  | "Kesehatan";
export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML
  category: ArticleCategory;
  tags: string[];
  author: { nama: string; role: string };
  published_at: string; // ISO date
  updated_at: string;
  cover_image: string; // URL
  read_time: number;
  featured: boolean;
  views: number;
};

// 2. Pengumuman
export type PengumumanItem = {
  id: string;
  priority: "urgent" | "important" | "normal";
  title: string;
  excerpt: string;
  date: string;
  countdown: string | null;
};

// 3. Agenda
export type AgendaItem = {
  id: string;
  day: string;
  month: string;
  title: string;
  time: string;
  location: string;
  category: string;
};

// 4. Komoditas
export type KomoditasItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  trend: "up" | "down" | "stable";
  change: number;
};

// 5. Galeri
export type GaleriItem = {
  id: string;
  url: string;
  title: string;
  category?: string;
  published_at?: string;
};

// 6. APBDes (simplified version of apbdes.ts)
// We'll manage just the summary records for now, or the raw JSON.
export type ApbdesItem = {
  id: string;
  year: number;
  pendapatan: number;
  belanja: number;
  pembiayaan: number;
  details: unknown; // Flexible JSON structure
};

// --- Store Interface ---

type ContentState<T> = {
  items: T[];
  isLoaded: boolean;
  load: () => Promise<void>;
  add: (item: Omit<T, "id">) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  initFromMocks: (mocks: T[]) => Promise<void>;
};

// --- Store Generators ---

function createContentStore<T extends { id: string }>(storeName: string) {
  return create<ContentState<T>>((set, get) => ({
    items: [],
    isLoaded: false,
    load: async () => {
      const data = await idbGetAll<T>(storeName);
      set({ items: data, isLoaded: true });
    },
    add: async (itemPayload) => {
      const newItem = { ...itemPayload, id: generateId() } as T;
      await idbPut(storeName, newItem);
      const data = await idbGetAll<T>(storeName);
      set({ items: data });
    },
    update: async (id, updates) => {
      const existing = await idbGet<T>(storeName, id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await idbPut(storeName, updated);
      const data = await idbGetAll<T>(storeName);
      set({ items: data });
    },
    remove: async (id) => {
      await idbDelete(storeName, id);
      const data = await idbGetAll<T>(storeName);
      set({ items: data });
    },
    initFromMocks: async (mocks) => {
      const current = await idbGetAll<T>(storeName);
      if (current.length === 0) {
        for (const m of mocks) {
          await idbPut(storeName, { ...m, id: String(m.id) } as T);
        }
        await get().load();
      }
    },
  }));
}

export const useBeritaStore = createContentStore<Article>("berita");
export const usePengumumanStore = createContentStore<PengumumanItem>("pengumuman");
export const useAgendaStore = createContentStore<AgendaItem>("agenda");
export const useKomoditasStore = createContentStore<KomoditasItem>("komoditas");
export const useGaleriStore = createContentStore<GaleriItem>("galeri");
export const useApbdesStore = createContentStore<ApbdesItem>("apbdes");
