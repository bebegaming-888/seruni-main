/**
 * Central store exports — re-export all stores from src/lib/*-store.ts
 *
 * Usage:
 *   import { useCartStore, listRecords, getSettings } from "@/stores";
 */

// Cart Store
export { useCartStore } from "@/lib/cart-store";
export type { CartItem } from "@/lib/cart-store";

// Settings Store
export {
  getSettings,
  saveSettings,
  resetSettings,
  useSettings,
  logAudit,
  listAudit,
  exportFullBackup as exportSettings,
  importFullBackup as importSettings,
} from "@/lib/settings-store";

// Hero Config Store
export {
  useHeroConfig,
  getHeroConfig,
  resetHeroConfig,
  DEFAULT_HERO_CONFIG,
} from "@/lib/hero-config-store";
export type { HeroConfig, MarqueeLine, MarqueeStyle } from "@/lib/hero-config-store";

// E-Surat Store
export {
  listRecords,
  saveRecord,
  getRecord,
  setStatus,
  archiveRecord,
  listArchive,
  getArchive,
  canVerify,
  canApproveReject,
  isFinal,
  isActive,
  invalidateStatsCache,
  statsByStatus,
  oldestPending,
  fmtEstimasi,
} from "@/lib/esurat-store";
export type {
  SuratStatus,
  SuratRecord,
  StatusHistoryEntry,
  Lampiran,
  EditHistoryEntry,
} from "@/lib/esurat-store";

// Template Store
export { listTemplates, getTemplate, saveTemplate, deleteTemplate } from "@/lib/template-store";

// Penduduk Store
export {
  listPenduduk,
  getPendudukByNik,
  addPenduduk,
  updatePenduduk,
  exportPendudukCSV,
} from "@/lib/penduduk-store";

// Perangkat Desa Store
export {
  listStruktur,
  listStrukturAktif,
  getStrukturById,
  listPerangkat,
  listPerangkatAktif,
  getPerangkatById,
  getPerangkatByNik,
  getPerangkatTreeWithPersons,
  getPerangkatByStrukturId,
  buildPerangkatTree,
  resetPerangkatCache,
} from "@/lib/perangkat-desa-store";
export type {
  PerangkatStruktur,
  PerangkatPerson,
  PerangkatDesa,
  PerangkatWithPerson,
  StrukturFormData,
  PerangkatFormData,
  AutofillResult,
} from "@/lib/perangkat-desa-store";

// Lembaga Store
export { buildStrukturTree, resetLembagaCache } from "@/lib/lembaga-store";
export type {
  KontakInfo,
  LembagaDesa,
  StrukturNode,
  StrukturMap,
  TrusteesMap,
  LembagaFormData,
  StrukturFormData as LembagaStrukturFormData,
  TrusteesFormData,
} from "@/lib/lembaga-store";

// Wilayah Store
export { wilayahActions } from "@/lib/wilayah-store";

// Content Store
export { ArticleSchema, PengumumanSchema } from "@/lib/content-store";

// Keuangan Store
export {
  getCoa,
  listCoa,
  listCoaByType,
  listEntries,
  isLoadingEntries,
  getRingkasan,
  formatRupiah,
  formatMonth,
} from "@/lib/keuangan-store";
export type { KeuanganCoa, KeuanganEntry, KeuanganRingkasan } from "@/lib/keuangan-store";

// Bantuan Store
export {
  listBantuanPrograms,
  isLoadingBantuan,
  formatRupiah as formatRupiahBantuan,
  STATUS_LABELS_B,
  STATUS_COLORS_B,
} from "@/lib/bantuan-store";
export type { BantuanProgram, BantuanRecipient } from "@/lib/bantuan-store";

// Inventaris Store
export {
  listInventarisAssets,
  listInventarisCategories,
  getInventarisSummary,
  isLoadingInventarisAssets,
  isLoadingInventarisCategories,
  formatRupiah as formatRupiahInventaris,
  CONDITION_LABELS,
  CONDITION_COLORS,
  STATUS_LABELS,
} from "@/lib/inventaris-store";
export type {
  InventarisCategory,
  InventarisAsset,
  InventarisSummary,
} from "@/lib/inventaris-store";

// Kelompok Store
export { listKelompok, isLoadingKelompok } from "@/lib/kelompok-store";
export type { Kelompok, KelompokMember } from "@/lib/kelompok-store";

// Pembangunan Store
export {
  listPembangunan,
  getPembangunanSummary,
  isLoadingPembangunan,
  STATUS_LABELS_P,
  STATUS_COLORS_P,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  formatRupiah as formatRupiahPembangunan,
} from "@/lib/pembangunan-store";
export type {
  PembangunanProject,
  PembangunanActivity,
  PembangunanSummary,
} from "@/lib/pembangunan-store";

// Pengaduan Admin Store
export {
  listPengaduanItems,
  getStats,
  isLoading as isLoadingPengaduan,
} from "@/lib/pengaduan-admin-store";
export type {
  PengaduanAdminItem,
  PengaduanStats,
  PengaduanFilters,
} from "@/lib/pengaduan-admin-store";

// Pengaduan Store (public)
export { submitPengaduan } from "@/lib/pengaduan-store";

// Surat Agenda Store
export { listAgenda } from "@/lib/surat-agenda-store";

export {
  getLayoutBySuratType,
  getAllLayoutsForType,
  getLayoutById,
  createLayout,
  updateLayout,
  activateLayout,
  deleteLayout,
  getLayoutHistory,
  duplicateLayout,
  getAllSigners,
} from "@/lib/layout-store";

// IDB Store (low-level utilities)
export { openIDB, IDB_NAME, IDB_VER, IDB_STORES } from "@/lib/idb-store";
export type { IDBValidKey, IDBStoreName } from "@/lib/idb-store";

// Store initialization
export { initAllStores, initLazyStores } from "@/lib/store-init";
