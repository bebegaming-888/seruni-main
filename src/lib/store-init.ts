/**
 * store-init.ts — Central Store Initialization Coordinator
 *
 * Panggil initAllStores() SEKALI saat aplikasi pertama kali mount (browser only).
 *
 * Urutan init:
 *   1. initSettingsLock()   — load lock state dari IDB (tidak blocking)
 *   2. runLocalStorageMigration() — migrasi data lama → IDB
 *   3. initSettingsStore()  — load settings DARI SUPABASE → IDB → _settingsData
 *      SETELAH ini: getSettings() returning data nyata
 *   4. parallel init stores lain (non-blocking)
 *
 * Dipanggil dari __root.tsx dalam useEffect, DI-AWAIT SEBELUM render pertama.
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

export async function initAllStores(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  _initialized = true;

  try {
    // 0. Init settings lock — load dari IDB, tidak blocking
    await initSettingsLock();

    // 1. Migrasi localStorage lama → IndexedDB (sekali saja)
    await runLocalStorageMigration();

    // 2. ✅ KRITIS: init settings + hero config PARALEL (mereka independent)
    //    Setelah ini: getSettings() + getHeroConfig() → data nyata dari Supabase/IDB
    await Promise.all([initSettingsStore(), initHeroConfig()]);
    console.info(
      "[store-init] Settings + Hero config loaded — safe to read getSettings() / getHeroConfig()",
    );

    // 3. Parallel init store lain (non-blocking, non-fatal)
    await Promise.allSettled([
      initWilayahStore(),
      initPerangkatStore(),
      initLembagaStore(),
      initUsersStore(),
      initEsuratStore(),
      initTemplateStore(),
      initNomorSuratStore(),
      initPendudukStore(),
      initPengaduanStore(),
      // CMS content stores — load dari Supabase/IDB, bukan mock
      import("@/lib/content-store").then(async (m) => {
        // Load dari Supabase → IDB (bukan mock)
        await Promise.all([
          m.useBeritaStore.getState().load(),
          m.usePengumumanStore.getState().load(),
          m.useAgendaStore.getState().load(),
          m.useKomoditasStore.getState().load(),
          m.useGaleriStore.getState().load(),
          m.useApbdesStore.getState().load(),
        ]);
        // initFromMocks() HANYA dipanggil jika load() mengembalikan data kosong
        // (artinya belum ada data nyata di Supabase/IDB)

        const { ARTICLES } = await import("@/data/berita");
        const { PENGUMUMAN, AGENDA, KOMODITAS } = await import("@/data/mock-data");
        const { APBDES_DATA } = await import("@/data/apbdes");

        // Lazy-load gallery images only when actually needed (first boot, no real data)
        const [
          { default: g1 },
          { default: g2 },
          { default: g3 },
          { default: g4 },
          { default: g5 },
          { default: g6 },
        ] = await Promise.all([
          import("@/assets/galeri-1.jpg"),
          import("@/assets/galeri-2.jpg"),
          import("@/assets/galeri-3.jpg"),
          import("@/assets/wisata-pantai.jpg"),
          import("@/assets/wisata-budaya.jpg"),
          import("@/assets/news-1.jpg"),
        ]);
        const GALERI = [
          { id: "1", url: g1, title: "Gotong royong jumat bersih", category: "Kegiatan" },
          { id: "2", url: g2, title: "Kunjungan SD ke balai desa", category: "Pendidikan" },
          { id: "3", url: g3, title: "Pasar tradisional Mumbul", category: "Ekonomi" },
          { id: "4", url: g4, title: "Pesisir Pantai Mumbul", category: "Wisata" },
          { id: "5", url: g5, title: "Festival Tenun Sasak 2025", category: "Budaya" },
          { id: "6", url: g6, title: "Upacara HUT RI ke-80", category: "Kegiatan" },
        ];

        // Cek apakah ada data nyata di Supabase/IDB untuk setiap store
        // Jika ada → auto-lock agar tidak pernah di-reset oleh mock
        const initTasks = [];
        const {
          useBeritaStore,
          usePengumumanStore,
          useAgendaStore,
          useKomoditasStore,
          useGaleriStore,
          useApbdesStore,
        } = m;

        if (!useBeritaStore.getState().isLoaded) {
          initTasks.push(useBeritaStore.getState().initFromMocks(ARTICLES as never[]));
        }
        if (!usePengumumanStore.getState().isLoaded) {
          initTasks.push(usePengumumanStore.getState().initFromMocks(PENGUMUMAN as never[]));
        }
        if (!useAgendaStore.getState().isLoaded) {
          initTasks.push(useAgendaStore.getState().initFromMocks(AGENDA as never[]));
        }
        if (!useKomoditasStore.getState().isLoaded) {
          initTasks.push(useKomoditasStore.getState().initFromMocks(KOMODITAS as never[]));
        }
        if (!useGaleriStore.getState().isLoaded) {
          initTasks.push(useGaleriStore.getState().initFromMocks(GALERI as never[]));
        }
        if (!useApbdesStore.getState().isLoaded) {
          initTasks.push(
            useApbdesStore.getState().initFromMocks([
              {
                id: String(APBDES_DATA.tahun),
                year: APBDES_DATA.tahun,
                pendapatan: APBDES_DATA.pendapatan.total,
                belanja: APBDES_DATA.belanja.total,
                pembiayaan: APBDES_DATA.pembiayaan.netto,
                details: APBDES_DATA,
              },
            ] as never[]),
          );
        }

        await Promise.all(initTasks);

        // Auto-lock semua store SETELAH mock dimuat
        // Jika ada data nyata (dari Supabase), mock tidak dimuat → lock tidak berubah
        if (initTasks.length > 0) {
          await lockSettings([...BOOT_LOCKED_STORES], "system:first-boot-mock");
          console.info("[store-init] First boot — mock data loaded and locked.");
        }
      }),
    ]);

    console.info("[store-init] Semua store berhasil diinisialisasi.");
  } catch (e) {
    console.error("[store-init] Inisialisasi gagal:", e);
  }
}

/** Reset flag — hanya untuk testing. */
export function _resetInitFlag() {
  _initialized = false;
}
