/**
 * content-store.ts — Zustand + IndexedDB for CMS Contents
 * Covers: Berita, Pengumuman, Agenda, Galeri, Komoditas, Apbdes
 */

import { create } from "zustand";
import { idbGet, idbPut, idbDelete, idbGetAll, type IDBStoreName } from "./idb-store";
import { generateId } from "./utils";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isStoreLocked } from "./settings-lock";
import { z } from "zod";

// --- Validation Schemas ---

export const ArticleSchema = z.object({
  title: z.string().min(5, "Judul terlalu pendek"),
  content: z.string().min(20, "Konten minimal 20 karakter"),
  excerpt: z.string().optional(),
  category: z.string().min(1, "Kategori harus dipilih"),
  slug: z.string().optional(),
  cover_image: z.string().optional(),
});

export const PengumumanSchema = z.object({
  title: z.string().min(5, "Judul pengumuman wajib diisi (min. 5 karakter)"),
  excerpt: z.string().min(5, "Ringkasan wajib diisi (min. 5 karakter)"),
  priority: z.enum(["urgent", "important", "normal"]),
  date: z.string().optional(),
});

export const AgendaSchema = z.object({
  title: z.string().min(5, "Judul agenda wajib diisi"),
  day: z.string().min(1, "Tanggal harus diisi"),
  month: z.string().min(1, "Bulan harus diisi"),
  time: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
});

export const KomoditasSchema = z.object({
  name: z.string().min(2, "Nama komoditas wajib diisi"),
  price: z.number().min(0),
  unit: z.string().min(1, "Satuan wajib diisi"),
  trend: z.enum(["up", "down", "stable"]).optional().default("stable"),
  change: z.number().optional().default(0),
  icon: z.string().optional().default("Sprout"),
  color: z.string().optional().default("text-success"),
  status: z.string().optional().default("Tersedia"),
  area: z.string().optional().default("-"),
});

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
  icon?: string;
  color?: string;
  status?: string;
  area?: string;
};

// 5. Galeri
export type GaleriItem = {
  id: string;
  url: string;
  storage_path?: string; // Supabase Storage path (public-media bucket)
  title: string;
  category?: string;
  published_at?: string;
};

// 6. APBDes (Anggaran Pendapatan & Belanja Desa)
export type ApbdesItem = {
  id: string;
  tahun: number;
  status: string;
  total_pendapatan: number;
  total_belanja: number;
  total_pembiayaan: number;
  sisa_cadangan: number;
  detail: Record<string, unknown>;
  realization: Record<string, unknown>;
  history: { tahun: number; pendapatan: number; belanja: number }[];
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Konten halaman statis (Profil Lembaga, Program kerja, produk hukum, dll)
// ─────────────────────────────────────────────────────────────────────────────

export type PageContentItem = {
  id: string;
  page_key: string; // e.g. "profil_bpd", "profil_lpm", "ekonomi_bumdes"
  title: string;
  description?: string;
  content_type: string; // "programs" | "documents" | "stats" | "custom"
  items: PageContentEntry[];
  extras: Record<string, string>;
};

export type PageContentEntry = {
  id: string;
  label: string; // nama program / judul dokumen
  description?: string;
  status?: string; // "Aktif" | "Selesai" | "Berjalan"
  icon?: string; // Lucide icon name
  value?: string; // untuk stats: "Rp 1.2 M" | "65%"
  unit?: string; // untuk numeric: "jiwa" | "unit"
  category?: string; // untuk dokumen: "Perdes" | "Perkades"
  year?: string; // untuk dokumen hukum
  size?: string; // untuk file size
  href?: string; // link download / detail
};

export type ProfildesaContent = {
  id: string;
  key: string; // always "profil_desa"
  sejarah: string;
  extras: Record<string, string>;
};

// --- Additional CMS content types for new pages ---

export type KwtItem = {
  id: string;
  nama: string;
  dusun: string;
  anggota: number;
  produk: string;
};

export type ProdukHukumItem = {
  id: string;
  type: string; // "Perdes" | "Perkades" | "Kepdes"
  title: string;
  year: string;
  size: string;
};

export type RealisasiItem = {
  id: string;
  tahun: number;
  total_pendapatan: number;
  total_belanja: number;
  silpa: number;
  progress_per_bidang: Record<string, number>; // kategori → percent
  kegiatan: Array<{
    name: string;
    status: string;
    date: string;
    type: "success" | "process" | "warning";
  }>;
};

export type BumdesItem = {
  id: string;
  key: string; // always "bumdes"
  produk_unggulan: Array<{
    id: string;
    nama: string;
    kategori: string;
    harga: string;
    satuan: string;
    desc: string;
    icon: string;
  }>;
  stats: Array<{ label: string; value: string; icon: string }>;
  unit_usaha: string[];
};

export type PengaduanKategoriItem = {
  id: string;
  nama: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 8b. Koprasi (Koperasi Desa)
// ─────────────────────────────────────────────────────────────────────────────

export type KoprasiItem = {
  id: string;
  key: string; // always "koperasi"
  stats: Array<{ label: string; value: string; icon: string }>;
  layanan: Array<{
    id: string;
    nama: string;
    deskripsi: string;
    icon: string;
    status: "Aktif" | "Nonaktif";
  }>;
  produk: Array<{
    id: string;
    nama: string;
    harga: string;
    satuan: string;
    desc: string;
    icon: string;
  }>;
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Marketplace (Produk UMKM Desa)
// ─────────────────────────────────────────────────────────────────────────────

export type MarketplaceItem = {
  id: string;
  name: string;
  price: number; // Rupiah, number
  unit: string; // "kg", "lembar", "pack 250g"
  category: string; // "Kerajinan" | "Makanan" | "Minuman" | "Camilan" | "Alam" | "Pertanian" | "Lainnya"
  description: string;
  image_url: string;
  stock: number; // 0 = "Habis"
  seller_name: string;
  seller_wa: string; // format "08xxxxxxxxxx"
  badge?: string; // "Best Seller" | "New" | "Pre-order"
  badgeClass?: string;
  icon?: string; // Lucide icon name
  published_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 8c. Marketplace Config (Shopee-style banner, flash deal, category icons)
// ─────────────────────────────────────────────────────────────────────────────

export type MarketplaceConfigItem = {
  id: string;
  key: string; // always "marketplace_config"
  // Flash Sale section
  flashSaleEnabled: boolean;
  flashSaleLabel: string;
  flashSaleEndTime?: string; // ISO date string
  // Banner / hero carousel
  banners: Array<{
    id: string;
    image_url: string;
    alt: string;
    href?: string;
  }>;
  // Category shortcut grid (icon grid below search, like Shopee's)
  categoryShortcuts: Array<{
    id: string;
    label: string;
    icon: string; // Lucide icon name
    category: string; // maps to MarketplaceItem.category filter
  }>;
  // Trust badges / shop info
  shopBadge: string;
  shopBadgeClass: string;
  trustNote: string;
  updated_at?: string;
};

export const MarketplaceSchema = z.object({
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  price: z.number().min(1000, "Harga minimal Rp 1.000"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  image_url: z.string().optional().default(""),
  stock: z.number().min(0).default(100),
  seller_name: z.string().min(2, "Nama penjual wajib diisi"),
  seller_wa: z.string().min(9, "Nomor WA wajib diisi"),
  badge: z.string().optional(),
  badgeClass: z.string().optional(),
  icon: z.string().optional(),
  discount: z.number().min(0).max(100).optional().default(0),
});

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

// --- Supabase Mapping Helpers ---
function getSupabaseTable(storeName: string) {
  if (storeName === "komoditas") return "komoditas";
  if (storeName === "apbdes") return "apbdes_data";
  return "cms_contents";
}

function toSupabasePayload(storeName: string, item: Record<string, unknown>) {
  if (storeName === "komoditas") return item;

  // Polymorphic map for cms_contents
  return {
    id: item.id,
    type: storeName,
    title: item.title || item.name || storeName,
    slug: item.slug || null,
    excerpt: item.excerpt || null,
    content: item.content || null,
    category: item.category || null,
    cover_image: item.cover_image || item.url || null,
    metadata: item, // Simpan seluruh objek asli untuk lossless restore
  };
}

// --- Store Generators ---

function createContentStore<T extends { id: string }>(storeName: IDBStoreName) {
  // Per-store initialization guard — prevents double-init race condition
  let _storeInitialized = false;

  return create<ContentState<T>>((set, get) => ({
    items: [],
    isLoaded: false,
    load: async () => {
      // Skip if already initialized (prevents double-load during HMR or concurrent calls)
      if (_storeInitialized) {
        return;
      }

      let data = await idbGetAll<T>(storeName);

      // ── Supabase Background Sync ──
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          try {
            const tableName = getSupabaseTable(storeName);
            let query = sb.from(tableName).select("*");
            if (tableName === "cms_contents") {
              query = query.eq("type", storeName);
            }
            const { data: remoteData, error } = await query;

            if (!error && remoteData) {
              const mappedData = remoteData.map((r) => {
                if (tableName === "cms_contents") {
                  return { ...(r.metadata || {}), id: r.id } as T;
                }
                if (tableName === "apbdes_data") {
                  // Rename 'realisasi' (Supabase) → 'realization' (local type)
                  return {
                    id: r.id,
                    tahun: r.tahun,
                    status: r.status,
                    total_pendapatan: r.total_pendapatan,
                    total_belanja: r.total_belanja,
                    total_pembiayaan: r.total_pembiayaan,
                    sisa_cadangan: r.sisa_cadangan,
                    detail: r.detail,
                    realization: r.realisasi,
                    history: r.history,
                    updated_at: r.updated_at,
                  } as unknown as T;
                }
                return r as unknown as T;
              });
              // Batch-write all remote items to IDB in parallel (was: sequential await in loop)
              await Promise.all(mappedData.map((item) => idbPut(storeName, item)));
              data = mappedData;
            }
          } catch (err) {
            console.warn(`[content-store] Supabase fetch failed for ${storeName}:`, err);
          }
        }
      }

      _storeInitialized = true;
      set({ items: data, isLoaded: true });
    },
    add: async (itemPayload) => {
      // Guard: ensure store is initialized before mutations
      if (!_storeInitialized) {
        await get().load();
      }

      // 1. Update Local (IDB + Zustand)
      // Optimistic update — use current state + new item instead of re-reading all from IDB
      const newItem = { ...itemPayload, id: generateId() } as T;
      await idbPut(storeName, newItem);
      const currentItems = get().items;
      set({ items: [...currentItems, newItem] });

      // 2. Sync to Supabase (Write-Behind)
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          const tableName = getSupabaseTable(storeName);
          const payload = toSupabasePayload(storeName, newItem);
          const { error: insertErr } = await sb.from(tableName).insert(payload);
          if (insertErr)
            console.warn(
              `[content-store] Supabase insert failed for ${storeName}:`,
              insertErr.message,
            );
        }
      }
    },
    update: async (id, updates) => {
      // Guard: ensure store is initialized before mutations
      if (!_storeInitialized) {
        await get().load();
      }

      // 1. Update Local
      const existing = await idbGet<T>(storeName, id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await idbPut(storeName, updated);
      // Optimistic update instead of re-reading all records
      const currentItems = get().items;
      set({ items: currentItems.map((item) => (item.id === id ? updated : item)) });

      // 2. Sync to Supabase
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          const tableName = getSupabaseTable(storeName);
          const payload = toSupabasePayload(storeName, updated);
          const { error: updateErr } = await sb.from(tableName).update(payload).eq("id", id);
          if (updateErr)
            console.warn(
              `[content-store] Supabase update failed for ${storeName}:`,
              updateErr.message,
            );
        }
      }
    },
    remove: async (id) => {
      // Guard: ensure store is initialized before mutations
      if (!_storeInitialized) {
        await get().load();
      }

      // 1. Update Local
      await idbDelete(storeName, id);
      // Optimistic update instead of re-reading all records
      const currentItems = get().items;
      set({ items: currentItems.filter((item) => item.id !== id) });

      // 2. Sync to Supabase
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (sb) {
          const tableName = getSupabaseTable(storeName);
          const { error: deleteErr } = await sb.from(tableName).delete().eq("id", id);
          if (deleteErr)
            console.warn(
              `[content-store] Supabase delete failed for ${storeName}:`,
              deleteErr.message,
            );
        }
      }
    },
    initFromMocks: async (mocks) => {
      // Call load() first to sync with Supabase and check for real data.
      // This prevents race condition where initFromMocks() overwrites data
      // that exists in Supabase but hasn't finished loading yet.
      await get().load();

      // After load() completes, check if still empty
      const current = await idbGetAll<T>(storeName);
      if (current.length === 0) {
        // Only load mocks if this store is NOT locked (data guard)
        if (!isStoreLocked(storeName)) {
          for (const m of mocks) {
            await idbPut(storeName, { ...m, id: String(m.id) } as T);
          }
        }
        // Mark as initialized and reload state
        _storeInitialized = false; // Reset flag to allow re-load
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

// Halaman statis content stores
export const usePageContentStore = createContentStore<PageContentItem>("page_content");
export const useKwtStore = createContentStore<KwtItem>("kwt");
export const useProdukHukumStore = createContentStore<ProdukHukumItem>("produk_hukum");
export const useRealisasiStore = createContentStore<RealisasiItem>("realisasi");
export const useBumdesStore = createContentStore<BumdesItem>("bumdes");
export const usePengaduanKategoriStore =
  createContentStore<PengaduanKategoriItem>("pengaduan_kategori");
export const useMarketplaceStore = createContentStore<MarketplaceItem>("marketplace");
export const useMarketplaceConfigStore =
  createContentStore<MarketplaceConfigItem>("marketplace_config");
export const useKoprasiStore = createContentStore<KoprasiItem>("koperasi");
