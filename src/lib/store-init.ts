/**
 * store-init.ts — Central Store Initialization Coordinator
 *
 * PHASE-BASED INIT (performance optimization):
 *   Phase 1 (blocking):  initSettingsStore + initHeroConfig — must complete before first render
 *   Phase 2 (fire-forget): esurat, template, nomor_surat, users — needed for e-surat page
 *   Phase 3 (lazy):       CMS stores + non-critical stores — loaded on-demand on first page visit
 *
 * Gallery images: loaded lazily inside useGaleriStore, NOT at startup
 */

import { runLocalStorageMigration } from "@/lib/idb-store";
import { initSettingsStore } from "@/lib/settings-store";
import { initHeroConfig } from "@/lib/hero-config-store";
import { initUsersStore } from "@/lib/auth";
import { initEsuratStore } from "@/lib/useSupabaseSync";
import { initTemplateStore } from "@/lib/template-store";
import { initNomorSuratStore } from "@/lib/nomor-surat";
import { initWilayahStore } from "@/lib/wilayah-store";
import { initPerangkatStore } from "@/lib/perangkat-desa-store";
import { initPendudukStore } from "@/lib/penduduk-store";
import { initPengaduanStore } from "@/lib/pengaduan-store";
import { initLembagaStore } from "@/lib/lembaga-store";
import { initSettingsLock, lockSettings } from "@/lib/settings-lock";

let _initialized = false;

/** Semua store yang di-lock saat first boot mock. Dipakai juga di settings-lock.ts. */
const BOOT_LOCKED_STORES = [
  "settings",
  "berita",
  "pengumuman",
  "agenda",
  "galeri",
  "komoditas",
  "apbdes",
  "templates",
  "lembaga",
  "perangkat_desa",
  "pengaduan",
  "esurat",
  "wilayah",
  "penduduk",
] as const;

/**
 * Phase-based store initialization.
 * Split into phases to avoid IndexedDB contention at startup.
 * Non-critical stores (gallery images etc.) are loaded lazily, not at startup.
 */
export async function initAllStores(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  _initialized = true;

  try {
    // ── Phase 0: Init settings lock + migrate localStorage ──
    console.info("[store-init] Phase 0: initSettingsLock + migrate");
    await initSettingsLock();
    await runLocalStorageMigration();

    // ── Phase 1: CRITICAL (blocking) ───────────────────────────────────────────
    // getSettings() + getHeroConfig() baru aman dipanggil SETELAH ini selesai.
    // Settings drive village name, logo, contact info — block until ready.
    console.info("[store-init] Phase 1: initSettingsStore + initHeroConfig");

    const [settingsResult, heroResult] = await Promise.allSettled([
      initSettingsStore(),
      initHeroConfig(),
    ]);

    if (settingsResult?.status === "rejected") {
      console.error("[store-init] Phase 1 — settings FAILED:", settingsResult.reason);
    }
    if (heroResult?.status === "rejected") {
      console.error("[store-init] Phase 1 — hero config FAILED:", heroResult.reason);
    }

    // CRITICAL: If Phase 1 fails, throw — do not continue to Phase 2/3
    // This prevents the app from rendering with incomplete/broken stores
    if (settingsResult?.status === "rejected" && heroResult?.status === "rejected") {
      console.error("[store-init] Phase 1: BOTH critical stores failed. Throwing.");
      throw new Error(
        `Critical store init failed: settings=${settingsResult.reason?.message}, hero=${heroResult.reason?.message}`,
      );
    }

    console.info("[store-init] Phase 1 done — Settings + Hero loaded");

    // ── Phase 2: E-SURAT core (fire-and-forget, non-blocking) ─────────────────
    // Needed by /pelayanan/e-surat — start loading ASAP but don't block UI.
    // initPendudukStore() intentionally REMOVED from Phase 2:
    // Loads 1000+ records from Supabase → blocks for 20+ seconds.
    // Lazy-load when needed instead.
    Promise.allSettled([
      initEsuratStore(),
      initTemplateStore(),
      initNomorSuratStore(),
      initUsersStore(),
    ]).then(() => {
      console.info("[store-init] Phase 2 done — E-surat core loaded");
    });

    // ── Phase 3: LAZY (triggered by route components) ─────────────────────────
    // CMS stores (berita, pengumuman, agenda, galeri, komoditas, apbdes),
    // penduduk, wilayah, perangkat, lembaga, pengaduan
    // → Load LAZILY when their pages are first visited.
    // Call initLazyStores() from route-level components on mount.
    // Gallery images loaded from Supabase Storage/CDN via URL paths, not inline imports.
    console.info("[store-init] Phase 3 deferred — lazy stores on-demand");
  } catch (e) {
    console.error("[store-init] FATAL: Inisialisasi gagal total:", e);
    throw e; // Re-throw so RootComponent can catch and handle
  }
}

/**
 * Lazy-init CMS + non-critical stores.
 * Called by route-level components on first mount (e.g., informasi.berita.tsx).
 * Safe to call multiple times — idempotent.
 */
export async function initLazyStores(): Promise<void> {
  try {
    // Load ALL CMS content stores from Supabase → IDB
    const [
      {
        useBeritaStore,
        usePengumumanStore,
        useAgendaStore,
        useKomoditasStore,
        useGaleriStore,
        useApbdesStore,
        useDestinasiStore,
        usePageContentStore,
        useKwtStore,
        useProdukHukumStore,
        useRealisasiStore,
        useBumdesStore,
        usePengaduanKategoriStore,
        useKoprasiStore,
      },
    ] = await Promise.all([import("@/lib/content-store")]);

    // Load real data from Supabase/IDB first
    await Promise.all([
      useBeritaStore.getState().load(),
      usePengumumanStore.getState().load(),
      useAgendaStore.getState().load(),
      useKomoditasStore.getState().load(),
      useGaleriStore.getState().load(),
      useApbdesStore.getState().load(),
      useDestinasiStore.getState().load(),
      usePageContentStore.getState().load(),
      useKwtStore.getState().load(),
      useProdukHukumStore.getState().load(),
      useRealisasiStore.getState().load(),
      useBumdesStore.getState().load(),
      usePengaduanKategoriStore.getState().load(),
      useKoprasiStore.getState().load(),
    ]);

    // Fallback to mock data only if real data is empty
    const { ARTICLES } = await import("@/data/berita");
    const { PENGUMUMAN, AGENDA, KOMODITAS } = await import("@/data/mock-data");
    const { APBDES_DATA } = await import("@/data/apbdes");

    // Use URL paths instead of inline image imports
    // Images served from Supabase Storage or /dist/assets — not bundled
    const GALERI_MOCK = [
      {
        id: "1",
        url: "/assets/galeri-1.jpg",
        title: "Gotong royong jumat bersih",
        category: "Kegiatan",
      },
      {
        id: "2",
        url: "/assets/galeri-2.jpg",
        title: "Kunjungan SD ke balai desa",
        category: "Pendidikan",
      },
      {
        id: "3",
        url: "/assets/galeri-3.jpg",
        title: "Pasar tradisional Mumbul",
        category: "Ekonomi",
      },
    ];

    const mockMap: Record<string, unknown[]> = {
      ARTICLES,
      PENGUMUMAN,
      AGENDA,
      KOMODITAS,
      GALERI: GALERI_MOCK,
    };

    const initTasks = [];
    const stores = [
      { store: useBeritaStore, mock: ARTICLES },
      { store: usePengumumanStore, mock: PENGUMUMAN },
      { store: useAgendaStore, mock: AGENDA },
      { store: useKomoditasStore, mock: KOMODITAS },
      { store: useGaleriStore, mock: GALERI_MOCK },
      {
        store: useApbdesStore,
        mock: [
          {
            id: String(APBDES_DATA.tahun),
            year: APBDES_DATA.tahun,
            pendapatan: APBDES_DATA.pendapatan.total,
            belanja: APBDES_DATA.belanja.total,
            pembiayaan: APBDES_DATA.pembiayaan.netto,
            details: APBDES_DATA,
          },
        ],
      },
    ];

    for (const { store, mock } of stores) {
      if (!store.getState().isLoaded && mock.length > 0) {
        initTasks.push(store.getState().initFromMocks(mock as never[]));
      }
    }

    await Promise.all(initTasks);

    if (initTasks.length > 0) {
      await lockSettings([...BOOT_LOCKED_STORES], "system:first-boot-mock");
      console.info("[store-init] First boot mock data loaded and locked");
    }

    // Init non-CMS lazy stores (penduduk, wilayah, perangkat, lembaga, pengaduan)
    await Promise.allSettled([
      initWilayahStore(),
      initPerangkatStore(),
      initLembagaStore(),
      initPendudukStore(),
      initPengaduanStore(),
    ]);

    console.info("[store-init] Lazy stores initialized");
  } catch (e) {
    console.error("[store-init] Lazy store init failed:", e);
  }
}

/** Reset flag — hanya untuk testing. */
export function _resetInitFlag() {
  _initialized = false;
}
