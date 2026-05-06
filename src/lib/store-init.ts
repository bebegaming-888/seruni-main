/**
 * store-init.ts — Central Store Initialization Coordinator
 *
 * Panggil initAllStores() SEKALI saat aplikasi pertama kali mount (browser only).
 * Urutan: migration lama → settings → users → esurat → templates → nomor surat.
 *
 * Dipanggil dari komponen root (App.tsx atau router) dalam useEffect.
 */

import { runLocalStorageMigration } from "@/lib/idb-store";
import { initSettingsStore } from "@/lib/settings-store";
import { initUsersStore } from "@/lib/auth";
import { initEsuratStore } from "@/lib/useSupabaseSync";
import { initTemplateStore } from "@/lib/template-store";
import { initNomorSuratStore } from "@/lib/nomor-surat";

let _initialized = false;

export async function initAllStores(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  _initialized = true;

  try {
    // 1. Jalankan one-time migration localStorage → IndexedDB (jika belum pernah)
    await runLocalStorageMigration();

    // 2. Init semua store (paralel kecuali settings harus duluan karena lainnya pakai getSettings())
    await initSettingsStore();

    await Promise.all([
      initUsersStore(),
      initEsuratStore(),
      initTemplateStore(),
      initNomorSuratStore(),
      // Initialize CMS content stores
      import("@/lib/content-store").then(async (m) => {
        const { ARTICLES } = await import("@/data/berita");
        const { PENGUMUMAN, AGENDA, KOMODITAS } = await import("@/data/site");
        const { APBDES_DATA } = await import("@/data/apbdes");

        // Galeri mocks
        const { default: g1 } = await import("@/assets/galeri-1.jpg");
        const { default: g2 } = await import("@/assets/galeri-2.jpg");
        const { default: g3 } = await import("@/assets/galeri-3.jpg");
        const { default: g4 } = await import("@/assets/wisata-pantai.jpg");
        const { default: g5 } = await import("@/assets/wisata-budaya.jpg");
        const { default: g6 } = await import("@/assets/news-1.jpg");
        const GALERI = [
          { id: "1", url: g1, title: "Gotong royong jumat bersih", category: "Kegiatan" },
          { id: "2", url: g2, title: "Kunjungan SD ke balai desa", category: "Pendidikan" },
          { id: "3", url: g3, title: "Pasar tradisional Mumbul", category: "Ekonomi" },
          { id: "4", url: g4, title: "Pesisir Pantai Mumbul", category: "Wisata" },
          { id: "5", url: g5, title: "Festival Tenun Sasak 2025", category: "Budaya" },
          { id: "6", url: g6, title: "Upacara HUT RI ke-80", category: "Kegiatan" },
        ];

        // Ensure stores are populated
        await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.useBeritaStore.getState().initFromMocks(ARTICLES as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.usePengumumanStore.getState().initFromMocks(PENGUMUMAN as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.useAgendaStore.getState().initFromMocks(AGENDA as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.useKomoditasStore.getState().initFromMocks(KOMODITAS as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.useGaleriStore.getState().initFromMocks(GALERI as any),
          m.useApbdesStore.getState().initFromMocks([
            {
              id: String(APBDES_DATA.tahun),
              year: APBDES_DATA.tahun,
              pendapatan: APBDES_DATA.pendapatan.total,
              belanja: APBDES_DATA.belanja.total,
              pembiayaan: APBDES_DATA.pembiayaan.netto,
              details: APBDES_DATA,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ] as any),
        ]);
      }),
    ]);

    console.info("[store-init] Semua store berhasil diinisialisasi.");
  } catch (e) {
    console.error("[store-init] Inisialisasi gagal (non-fatal):", e);
  }
}

/** Reset flag — hanya untuk keperluan testing. */
export function _resetInitFlag() {
  _initialized = false;
}
