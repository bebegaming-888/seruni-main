# Settings & Store Persistence — Complete Reference

Sistem persistence menggunakan **triple-layer protection** untuk menjamin data tidak hilang saat hard refresh, HMR, atau clearing browser data.

```
IndexedDB (async, persistent)  ← PRIMARY STORE
    ↑ write-through
Zustand (in-memory + localStorage)
    ↑ persist middleware
localStorage (sync backup)
    ↑ cached at init
Module-level cache (HMR bridge)
```

---

## All Stores — Complete Audit Table

| #   | Store / Setting         | IDB Store                         | KeyPath     | Seed/Mock Fallback?              | Lock Protection | On Hard Refresh             | On Clear Site Data           |
| --- | ----------------------- | --------------------------------- | ----------- | -------------------------------- | --------------- | --------------------------- | ---------------------------- |
| 1   | **Profil Desa**         | `settings`                        | `id="main"` | ❌ (deepMerge)                   | ✅ Auto-lock    | ✅ Reload from IDB/Supabase | ⚠️ Re-sync from Supabase     |
| 2   | **Hero Slides**         | `settings`                        | subfield    | ❌ (deepMerge)                   | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 3   | **Marquee**             | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 4   | **Kop Surat**           | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 5   | **Branding**            | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 6   | **Wilayah**             | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 7   | **Nomor Surat Prefix**  | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 8   | **PDF Layout**          | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 9   | **Pages** (per-route)   | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 10  | **Signature**           | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 11  | **Notifications**       | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 12  | **Appearance**          | `settings`                        | subfield    | ❌                               | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 13  | **Berita**              | `berita`                          | `id`        | ✅ `ARTICLES` mock               | ✅ Auto-lock    | ✅ IDB → Supabase           | ⚠️ Re-sync                   |
| 14  | **Pengumuman**          | `pengumuman`                      | `id`        | ✅ `PENGUMUMAN` mock             | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 15  | **Agenda**              | `agenda`                          | `id`        | ✅ `AGENDA` mock                 | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 16  | **Galeri**              | `galeri`                          | `id`        | ✅ `GALERI` mock                 | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 17  | **Komoditas**           | `komoditas`                       | `id`        | ✅ `KOMODITAS` mock              | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 18  | **APBDes**              | `apbdes`                          | `id`        | ✅ `APBDES_DATA` mock            | ✅ Auto-lock    | ✅                          | ⚠️                           |
| 19  | **Template Surat**      | `templates`                       | `id`        | ✅ `SURAT_MASTER` seed           | ✅ Self-lock    | ✅ IDB → localStorage       | ⚠️ Re-seed from SURAT_MASTER |
| 20  | **Lembaga Desa**        | `lembaga`                         | `id`        | ❌ (empty fallback)              | ❌ Manual       | ✅ Supabase → IDB           | ⚠️ Re-sync                   |
| 21  | **Perangkat Desa**      | `perangkat`, `perangkat_struktur` | `id`        | ❌ (empty fallback)              | ❌ Manual       | ✅                          | ⚠️                           |
| 22  | **Nomor Surat Counter** | `nomor_surat`                     | `id=YYYY`   | ❌ (localStorage fallback)       | N/A             | ✅ IDB → localStorage       | ⚠️ Reset to 0                |
| 23  | **E-Surat Records**     | `esurat_records`                  | `no`        | ❌ (localStorage fallback)       | N/A             | ✅ IDB → localStorage       | ⚠️ Re-sync                   |
| 24  | **E-Surat Archive**     | `esurat_archive`                  | `no`        | ❌ (localStorage fallback)       | N/A             | ✅                          | ⚠️                           |
| 25  | **Penduduk**            | `penduduk`                        | `nik`       | ✅ `PENDUDUK_MOCK` (last resort) | N/A             | ✅ Supabase → IDB           | ⚠️ Re-sync                   |
| 26  | **Pengaduan**           | `pengaduan`                       | `ticket`    | ❌                               | N/A             | ✅ Supabase → IDB           | ⚠️ Re-sync                   |
| 27  | **Admin Users**         | `users`                           | `id`        | ❌                               | N/A             | ✅ Supabase → IDB           | ⚠️ Re-sync                   |
| 28  | **Audit Log**           | `audit_log`                       | `id`        | ❌ (max 500)                     | N/A             | ✅ IDB only                 | ❌ (not synced)              |

---

## Lock System — How It Works

### Triple-Layer Lock Architecture

```
HMR / Hard Refresh / Browser Crash
        │
        ├─ Module cache: survives HMR re-evaluation (sync, fastest)
        │      └─ checked FIRST by isStoreLocked()
        │
        ├─ localStorage: survives page refresh (sync)
        │      └─ fallback if module cache empty
        │
        └─ IndexedDB: survives everything (async, primary store)
               └─ loaded by initSettingsLock() BEFORE any store init
```

### Lock Flow Diagram

```
initAllStores()
    │
    ├─ initSettingsLock()
    │      └─ Load dari IDB → cache to localStorage + module
    │
    ├─ runLocalStorageMigration()
    │
    ├─ initSettingsStore()
    │      └─ Supabase → IDB → Zustand (persist middleware)
    │
    └─ Content stores init (Promise.allSettled)
         │
         ├─ DATA GUARD: cek IDB secara langsung
         │      └─ Jika settings nyata ada → skip SEMUA mock loading
         │
         ├─ load() untuk setiap store
         │      └─ Supabase → IDB → setState
         │
         └─ initFromMocks() jika masih kosong
                │
                ├─ isStoreLocked("berita") → TRUE: skip mock loading
                └─ isStoreLocked("berita") → FALSE:
                       ├─ Load mock data
                       └─ auto-lockSettings() → lock semua stores
```

### Defense-in-Depth: Dua Lapisan Proteksi

Ada **dua cek terpisah** yang mencegah mock data overwrite data nyata:

**Lapisan 1 — DATA GUARD** (store-init.ts):

```typescript
const _hasRealSettings = await idbDataGuard("settings", "main");
if (_hasRealSettings) {
  // Ada data nyata di IDB → skip SEMUA mock loading
  await load(); // dari IDB/Supabase
  return;
}
```

**Lapisan 2 — LOCK CHECK** (content-store.ts):

```typescript
const current = await idbGetAll(storeName);
if (current.length === 0) {
  if (!isStoreLocked(storeName)) {
    // Load mock hanya jika BENAR-BENAR kosong DAN tidak di-lock
    await idbPut(storeName, ...);
  }
}
```

### Trigger Lock Automatically

`saveSettings()` di `settings-store.ts` otomatis memanggil `lockSettings()`:

```typescript
// settings-store.ts line ~922
await lockSettings([
  "settings",
  "hero",
  "berita",
  "pengumuman",
  "agenda",
  "galeri",
  "komoditas",
  "apbdes",
]);
```

### Auto-Lock After First Mock Load

Jika data mock dimuat saat fresh install, auto-lock langsung aktif:

```typescript
// store-init.ts line ~158
if (initTasks.length > 0) {
  await lockSettings(
    ["settings", "hero", "berita", "pengumuman", "agenda", "galeri", "komoditas", "apbdes"],
    "system:auto-lock",
  );
}
```

---

## Store-by-Store Init Patterns

### Pattern A: Zustand + initFromMocks (with lock)

**Stores: berita, pengumuman, agenda, galeri, komoditas, apbdes**

```
Load Order:
  1. DATA GUARD → cek settings IDB ada? → skip mock
  2. load() → Supabase → IDB → setState
  3. Jika masih kosong DAN tidak di-lock → initFromMocks() → auto-lock
```

**Lock:** ✅ Auto-lock via `saveSettings()`

**File:** `src/lib/content-store.ts` — `createContentStore()`

### Pattern B: Module-level cache + seed fallback (with lock)

**Store: templates**

```
Load Order:
  1. IDB → migrateTemplate() → _cache
  2. localStorage lama → migrate → _cache → IDB
  3. Jika kosong DAN tidak di-lock → buildSeedTemplates() → SURAT_MASTER → _cache → IDB
```

**Lock:** ✅ Self-lock (isStoreLocked check inside initTemplateStore)

**File:** `src/lib/template-store.ts` — `initTemplateStore()`

### Pattern C: Supabase → IDB → empty fallback (no mock)

**Stores: lembaga, perangkat_desa**

```
Load Order:
  1. Supabase → _cache → IDB
  2. IDB → _cache
  3. Empty array fallback
```

**Lock:** ❌ Tidak ada mock, tidak perlu lock. Jika Supabase gagal, IDB fallback sudah cukup.

**File:** `src/lib/lembaga-store.ts`, `src/lib/perangkat-desa-store.ts`

### Pattern D: Zustand persist + IDB + Supabase

**Store: settings (Profil Desa)**

```
Load Order:
  1. Zustand persist (localStorage) → sinkron, langsung tersedia
  2. IDB → deepMerge → Zustand (overwrite)
  3. Supabase → IDB → Zustand (overwrite)
  4. DEFAULT_SETTINGS fallback
```

**Lock:** ✅ Auto-lock via `saveSettings()` + Zustand persist sudah berisi data user saat mount

**File:** `src/lib/settings-store.ts` — Zustand dengan `persist` middleware

### Pattern E: IDB → localStorage fallback (no external source)

**Stores: esurat_records, esurat_archive, nomor_surat**

```
Load Order:
  1. IDB → in-memory cache
  2. localStorage lama → migrate ke IDB
  3. Empty/0 fallback
```

**Lock:** ❌ Tidak ada mock, data berasal dari user actions (bukan konfigurasi)

**File:** `src/lib/useSupabaseSync.ts`, `src/lib/nomor-surat.ts`

### Pattern F: Supabase → IDB → PENDUDUK_MOCK fallback

**Store: penduduk**

```
Load Order:
  1. Supabase → IDB → _mem
  2. IDB → _mem
  3. PENDUDUK_MOCK (LAST RESORT — hanya jika keduanya gagal)
```

**Lock:** ❌ Tidak di-lock karena mock hanya jalan jika Supabase GAGAL total (bukan karena belum di-configure). Jika warga data ada di Supabase, tidak akan pernah menggunakan mock.

**Catatan:** `_isActive` flag di localStorage memastikan mock hanya jalan sekali (first-time setup).

**File:** `src/lib/penduduk-store.ts`

---

## Hard Refresh & Edge Cases

### Scenario: Normal Refresh (Ctrl+R)

```
Zustand persist (localStorage) → data langsung tersedia
+ IDB backup → semua aman
+ Supabase write-behind → cloud sync
```

### Scenario: Hard Refresh (Ctrl+Shift+R / Cmd+Shift+R)

```
1. Zustand di-reset ke localStorage snapshot (persist middleware)
2. Semua module di-re-evaluate
3. initAllStores() dipanggil ulang
4. DATA GUARD: settings IDB ada? → skip mock
5. Lock: isSettingsLocked() → TRUE → skip mock
6. Semua store reload dari IDB/Supabase
```

### Scenario: Clear Site Data (Chrome DevTools → Application → Clear site data)

```
⚠️ localStorage + IndexedDB DIHAPUS

Yang TERKENA:
- Zustand persist → kosong (re-hydrate dari IDB → gagal)
- settings-lock → unlocked (perlu re-lock dari Supabase)
- IDB stores → kosong (kecuali yang di-sync dari Supabase)

Yang TIDAK TERKENA:
- Supabase Cloud (data tetap ada)
- Service Worker cache (jika offline-first configured)

Pemulihan:
1. App mount → initAllStores()
2. Settings: reload dari Supabase → saveSettings() → auto-lock
3. CMS content: reload dari Supabase → IDB
4. E-Surat: reload dari Supabase → IDB
5. Penduduk: reload dari Supabase → IDB
```

### Scenario: HMR (Hot Module Replacement — Development)

```
Zustand module di-re-evaluate → kembali ke DEFAULT_SETTINGS
    │
    ├─ persist middleware → baca localStorage snapshot → restore state
    │      └─ TIDAK ADA FLASH (sinkron!)
    │
    ├─ _cache (settings-store) → bridge selama re-init
    │
    ├─ initAllStores() → DATA GUARD → settings IDB ada?
    │      └─ Ada → skip mock, load dari IDB
    │
    └─ Lock protection → mock tidak overwrite data nyata
```

### Scenario: Incognito / Private Browsing

```
⚠️ IndexedDB tersedia tapi ephemeral (hilang saat window ditutup)
⚠️ localStorage juga ephemeral

Pemulihan (saat reopen):
1. initAllStores() → Supabase sync → IDB + Zustand
2. Lock: isSettingsLocked() → FALSE (IDB kosong)
3. Mock data dimuat → auto-lock aktif
4. Jika Supabase configured → data cloud di-sync

Rekomendasi untuk Incognito:
- Jangan gunakan untuk admin workflow
- Gunakan untuk preview/test saja
```

### Scenario: No Network (Offline)

```
1. App mount → initAllStores()
2. Supabase calls → timeout/fail
3. Semua store fallback ke IDB
4. Offline queue → simpan operasi
5. Saat online kembali → offline queue diproses
```

---

## IndexedDB Schema

| Store Name           | KeyPath   | Records                                              | Sync to Supabase        |
| -------------------- | --------- | ---------------------------------------------------- | ----------------------- |
| `settings`           | `id`      | Single: `"main"`, `"settings_lock"`, `"backup_<ts>"` | ✅ Write-behind         |
| `penduduk`           | `nik`     | All warga                                            | ✅ Full sync            |
| `berita`             | `id`      | CMS articles                                         | ✅ Write-behind         |
| `pengumuman`         | `id`      | Announcements                                        | ✅ Write-behind         |
| `agenda`             | `id`      | Events                                               | ✅ Write-behind         |
| `galeri`             | `id`      | Photos                                               | ✅ Write-behind         |
| `komoditas`          | `id`      | Prices                                               | ✅ Write-behind         |
| `apbdes`             | `id`      | APBDes data                                          | ✅ Write-behind         |
| `esurat_records`     | `no`      | Active letters                                       | ✅ Write-behind         |
| `esurat_archive`     | `no`      | Archived letters                                     | ✅ Write-behind         |
| `templates`          | `id`      | Surat templates                                      | ❌ Manual only          |
| `lembaga`            | `id`      | Lembaga + struktur                                   | ❌ Manual only          |
| `perangkat_struktur` | `id`      | Tree jabatan                                         | ❌ Manual only          |
| `perangkat`          | `id`      | Personnel                                            | ❌ Manual only          |
| `nomor_surat`        | `id=YYYY` | Counter per tahun                                    | ❌ IDB only             |
| `audit_log`          | `id`      | Max 500 entries                                      | ✅ Write-behind         |
| `users`              | `id`      | Admin users                                          | ❌ Manual only          |
| `offline_queue`      | `id`      | Pending ops                                          | ✅ Process on reconnect |
| `pengaduan`          | `ticket`  | Complaints                                           | ✅ Write-behind         |

---

## Settings Lock State

```typescript
type SettingsLockState = {
  locked: boolean;
  locked_at?: string; // ISO timestamp
  locked_by?: string; // username or "system:auto-lock"
  locked_stores: string[]; // ["settings", "berita", "pengumuman", ...]
};
```

### Locked Stores

Saat ini **9 store** yang dilindungi lock (auto-lock via `saveSettings()`):

| Store Key    | Description                                     |
| ------------ | ----------------------------------------------- |
| `settings`   | Semua settings profil desa                      |
| `hero`       | Hero slides, marquee, video (subfield settings) |
| `berita`     | Berita/artikel CMS                              |
| `pengumuman` | Pengumuman                                      |
| `agenda`     | Agenda kegiatan                                 |
| `galeri`     | Galeri foto                                     |
| `komoditas`  | Komoditas/harga pasar                           |
| `apbdes`     | APBDes                                          |
| `templates`  | Template surat (self-lock)                      |

### Manual Lock (Stores Without Auto-Lock)

Store berikut tidak auto-lock karena tidak dianggap "landing page config":

```typescript
// Jika perlu proteksi manual:
import { lockSettings } from "@/lib/settings-lock";

// Lock setelah save lembaga
await lockSettings(["lembaga"]);

// Lock setelah save perangkat
await lockSettings(["perangkat"]);

// Lock semua CMS + settings
await lockSettings([
  "settings",
  "hero",
  "berita",
  "pengumuman",
  "agenda",
  "galeri",
  "komoditas",
  "apbdes",
  "templates",
]);
```

---

## Unlock & Reset

### Unlock (aktifkan mock lagi — untuk development)

```typescript
import { unlockSettings } from "@/lib/settings-lock";
await unlockSettings();
// ⚠️ Akan load mock data saat refresh berikutnya
```

### Reset Lock (hapus semua lock + data)

```typescript
import { resetLock } from "@/lib/settings-lock";
await resetLock();
// ⚠️ Semua konfigurasi akan di-reset
```

### Reset Settings ke Default

```typescript
import { resetSettings } from "@/lib/settings-store";
resetSettings();
```

### Backup & Restore

```typescript
import { exportFullBackup, importFullBackup, restoreBackup } from "@/lib/settings-store";

// Export semua data
const json = await exportFullBackup();
// Simpan ke file

// Import dari backup
await importFullBackup(json);

// Restore settings dari timestamp tertentu
await restoreBackup("backup_1747000000000");
```

---

## Emergency Recovery

Jika data hilang karena "Clear site data":

```
1. DevTools → Application → IndexedDB → seruni_mumbul_db
2. Cek store "settings" untuk entries dengan id = "backup_<timestamp>"
3. Jika ada:
   - Buka console browser
   - import { restoreBackup } from "@/lib/settings-store"
   - restoreBackup("backup_1747000000000")
4. Jika tidak ada backup:
   - Buka Admin Panel → Settings
   - Re-konfigurasi manual
   - saveSettings() akan auto-lock
```

---

## Write-Behind Sync Pattern

Semua operasi tulis mengikuti pola "write-behind":

```
User Action
    │
    ├─ Zustand store (immediate UI update)
    │
    ├─ IndexedDB (sync, write-through)
    │      └─ Data persisten, langsung tersedia setelah page reload
    │
    └─ Supabase (async, write-behind)
           └─ Source of truth, non-blocking
```

**Keuntungan:**

- UI langsung update (tidak nunggu network)
- Offline-first: works tanpa koneksi
- Restore dari IDB jika Supabase sync gagal

---

## API Reference

### settings-lock.ts

```typescript
// Cek apakah settings keseluruhan di-lock
isSettingsLocked(): boolean

// Cek apakah store tertentu di-lock
isStoreLocked(storeName: string): boolean

// Load lock state dari IDB (panggil di initAllStores)
await initSettingsLock(): Promise<void>

// Lock semua stores (auto-dipanggil oleh saveSettings)
await lockSettings(stores?: string[], username?: string): Promise<void>

// Unlock semua stores
await unlockSettings(): Promise<void>

// Hapus semua lock + backup
await resetLock(): Promise<void>

// Get full lock state (untuk debugging/UI)
getLockState(): SettingsLockState
```

### settings-store.ts

```typescript
// Sync read (SSR-safe)
getSettings(): SystemSettings
getWilayah(): WilayahConfig

// Async init (panggil di initAllStores)
await initSettingsStore(): Promise<void>

// Save + auto-lock
await saveSettings(s: SystemSettings): Promise<void>

// Reset ke default
resetSettings(): void

// Backup & restore
await getBackupList(): Promise<{key: string; timestamp: number}[]>
await restoreBackup(backupKey: string): Promise<void>
await exportFullBackup(): Promise<string>
await importFullBackup(json: string): Promise<{ok: boolean; message: string}>
```
