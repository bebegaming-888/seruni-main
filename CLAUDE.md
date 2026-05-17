# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Proyek:** Website Desa Seruni Mumbul — Sistem informasi pemerintahan desa dengan layanan e-surat dan CMS offline-first.

---

## Teknologi Stack

| Layer | Pilihan |
|-------|---------|
| Framework | TanStack Start (SPA, file-based routing via `src/routes/`) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| State | Zustand (module-level stores, in-memory + IndexedDB persist) |
| Data sync | IndexedDB-first → Supabase write-behind (offline-capable) |
| Auth | Custom HMAC-SHA256 session (bukan Supabase Auth) |
| DB | Supabase PostgreSQL + Supabase Storage buckets |
| Deploy | Cloudflare Pages (SSR + Edge Functions + Scheduled Cron) |
| Package Manager | Bun |
| WA Notif | Fonnte API (`src/lib/fonnte.ts`) |
| PDF generation | `jspdf` (client-side) |
| Maps | Leaflet + React-Leaflet |

---

## Perintah Umum

```bash
bun install          # Install dependencies
bun run dev          # Dev server (Vite + HMR)
bun run build        # Build (Vite + TanStack manifest + postbuild.js)
bun run build:dev    # Build development mode
bun run preview      # Preview production build
bun run lint         # ESLint
bun run format       # Prettier write
```

> **Penting:** Build pipeline menjalankan `postbuild.js` secara otomatis — ini menghasilkan `dist/client/index.html` SPA dengan hash client entry chunk dari TanStack manifest. Jangan edit output secara manual.

---

## Arsitektur Data: Offline-First Write-Behind

Setiap fitur punya **module store** di `src/lib/` dengan pola konsisten:

```
WRITE: module state (sync) → IndexedDB (async) → Supabase upsert (async, non-blocking)
READ:  module state (sync) → IndexedDB (sync fallback)
```

**Store init:** `src/lib/store-init.ts` → `initAllStores()` dipanggil di `__root.tsx` (di-await sebelum render pertama). Semua store di-init secara berurutan (settings duluan), lalu CMS stores parallel. Jika Supabase/IDB kosong pada first boot, mock data dimuat lalu store di-lock.

### Init Sequence (Urutan Kritis)

```
1. initSettingsLock()          → load lock state dari IDB (non-blocking check)
2. runLocalStorageMigration() → migrasi data lama localStorage → IndexedDB
3. initSettingsStore()         → ⭐ WAIT— getSettings() baru aman dipanggil setelah ini
4. initHeroConfig()            → ⭐ WAIT— getHeroConfig() baru aman setelah ini
5. Promise.allSettled([...])   → semua store lain, non-blocking
   └── CMS content stores: load() → jika kosong → initFromMocks() → lockSettings()
```

### Store Utama

| Store | IndexedDB | Supabase Table | Key |
|-------|----------|----------------|-----|
| `penduduk-store.ts` | `penduduk` | `warga` | `nik` |
| `esurat-store.ts` | `esurat_records` / `esurat_archive` | `surat_requests` | `no` |
| `template-store.ts` | `templates` | — (local only) | `id` |
| `content-store.ts` | `berita/pengumuman/agenda/galeri` | `cms_contents` (type-filtered) | `id` |
| `settings-store.ts` | `settings` | `app_settings` | `id` |
| `auth.ts` | `users` (IndexedDB) | `admin_users` | `id` |

**Sync lib utama:** `src/lib/useSupabaseSync.ts` — handle semua write-behind, optimistic locking (`.eq("status", prevStatus)`), merge offline records. Jika Supabase tidak configured, semua operasi tetap berhasil via IndexedDB.

---

## Settings Lock: Triple-Layer HMR Protection

Tanpa mekanisme ini, HMR akan me-reset store ke default dan overwrite data user. Sistem lock tiga lapis:

```
Layer 1: Module cache (_lockCache)     → survive HMR re-evaluation
Layer 2: localStorage (seruni_settings_locked) → survive page refresh
Layer 3: IndexedDB (settings_lock)      → persist across sessions
```

**Flow:**
- `isStoreLocked("esurat")` dipanggil SEBELUM `initFromMocks()` — cek ini **sync** (dipanggil sebelum IndexedDB ready)
- Jika store locked → init dari IndexedDB, skip Supabase pull
- User save apapun → auto re-lock semua stores

`unlockSettings()` **mereset ke mock data** — jangan dipanggil kecuali reset memang diinginkan.

---

## Multi-Tab Sync

`src/lib/idb-sync.ts` menangani:
1. **storage event API** — tab lain menulis ke localStorage, tab ini listen dan re-fetch
2. **Supabase Realtime broadcast** — optional cross-tab sync via channel
3. **Conflict resolution** — optimistic locking di Supabase (`eq("status", prevStatus)`); jika conflict, operasi ditolak dengan error "Status sudah berubah"

Signal keys di localStorage: `__settings_saved__`, `__templates_changed__`, `__settings_intent__`.

---

## Routing & Pages

- **Route tree:** `src/routeTree.gen.ts` (auto-generated, jangan edit manual)
- **Route config:** `src/router.tsx` + `src/routes/__root.tsx`
- **File-based routes:** `src/routes/*.tsx` → `/pelayanan/e-surat`, `/admin`, dll.
- **TanStack Search Params:** `useSearch({ from: "/path" })` untuk query params (contoh: `?kode=SKK` di e-surat)
- **Error boundary:** `DefaultErrorComponent` di `router.tsx`

---

## E-Surat: Workflow & Kontrak Kunci

**Status flow:** `Menunggu Verifikasi` → `Diverifikasi` → `Menunggu Approval` → `Disetujui | Ditolak`

**Tracking number format:** `{KODE}-{YYMMDD}-{last6ts}{rand4}` (contoh: `SKK-250515-3f2a1x4k`)

**Offline submission:** `enqueueOfflineSubmission()` → IndexedDB queue → `processOfflineQueue()` on reconnect → exponential backoff (30s → 2m → 10m → 30m → 2h → 10h max). Jika Supabase configured tapi upload attachment gagal, data_url tetap disimpan di IndexedDB (tidak hilang, hanya tidak di-offload).

**Template Surat:** `template-store.ts` → load dari IndexedDB. Templates **tidak sync ke cloud** (local only).

**Letter Engine:** `src/lib/letter-engine.ts` — render `{{placeholder}}` di `dna_clauses` dan `body`, build subject fields, format tanggal/alamat. Digunakan saat generate PDF.

---

## API Edge Functions (Cloudflare Pages)

```
functions/api/auth/admin-login.ts      → POST /api/auth/admin-login
functions/api/auth/request-otp.ts      → POST /api/auth/request-otp
functions/api/auth/verify-otp.ts       → POST /api/auth/verify-otp
functions/api/auth/refresh-warga-session.ts
functions/api/generate-nomor-surat.ts → POST /api/generate-nomor-surat
functions/api/generate-pdf.ts          → POST /api/generate-pdf
functions/api/send-wa.ts               → POST /api/send-wa
functions/api/surat/estimasi.ts        → POST /api/surat/estimasi
functions/api/verify-surat.ts          → GET  /api/verify-surat?no=...
functions/api/push/send.ts             → POST /api/push/send
functions/api/sippn/validate-nik.ts   → POST /api/sippn/validate-nik
functions/_scheduled.ts                → Cloudflare Cron (setiap 6 jam)
```

**Shared utils:** `functions/_lib/utils.ts` — `hmacSha256Hex`, `base64UrlEncode/Decode`, `hashOtp`. Admin session verify ada di `functions/_lib/admin-session.ts`.

**Env vars untuk Edge Functions** (via Cloudflare Pages Secrets):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `FONNTE_API_KEY`, `ADMIN_WA_NUMBER`
- `QR_SECRET`, `JWT_SECRET`, `ADMIN_SESSION_SECRET`

---

## Database: Schema & Migrations

ERD lengkap ada di `docs/ERD.md`. Tabel inti:

- `warga` — penduduk (NIK sebagai UQ key)
- `surat_requests` — pengajuan surat (no_surat UQ, optimistic locking via `status`)
- `surat_template` — template surat (local-managed)
- `admin_users` — akun admin (fixed superadmin dari env var)
- `audit_log` — trail semua aksi (IP + username)
- `cms_contents` — berita/pengumuman/agenda/galeri (type-filtered)
- `app_settings` — settings JSONB + history versioning
- `surat_types` — 74 jenis surat referensi
- `wilayah`, `village_subdivisions` — hierarki wilayah Kemendagri
- `perangkat_desa_struktur`, `perangkat_desa` — struktur jabatan + orang
- `lembaga_desa`, `struktur_lembaga`, `pengurus_lembaga` — lembaga desa
- `apbdes_data`, `monografi` — APBDes dan monografi
- `pengaduan` — tiket pengaduan

**Migrations:** `supabase/migrations/` (31 file, numbered 001–031).
**Storage buckets:** `surat-attachments` (public), `public-media` (public), `perangkat-fotos` (public).

---

## Auth: Dual-System

1. **Admin auth** (`src/lib/auth.ts`): Fixed account dari `VITE_ADMIN_USER`/`VITE_ADMIN_PASS`. Additional users di IndexedDB + `admin_users` table. Session di `localStorage`/`sessionStorage` (7 hari). Hybrid login: edge function → fallback local.
2. **Warga auth** (`src/lib/warga-auth.ts`): OTP via WhatsApp (Fonnte). OTP di-hash SHA-256. Session token HMAC-signed.

**Role admin:** `Super Admin | Operator | Verifikator | Kepala Desa` (dari `src/lib/roles.ts`).

---

## Variabel Lingkungan Kritis

```
# Browser (VITE_*) — aman di browser, dilindungi RLS
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
VITE_ADMIN_USER, VITE_ADMIN_PASS
VITE_FONNTE_KEY
VITE_QR_SECRET
VITE_TURNSTILE_SITE_KEY
VITE_VAPID_PUBLIC_KEY
VITE_ADMIN_DB_TOKEN  ← bearer token untuk admin API calls dari browser

# Cloudflare Secrets (Edge Functions only)
SUPABASE_SERVICE_ROLE_KEY
FONNTE_API_KEY, ADMIN_WA_NUMBER
QR_SECRET, JWT_SECRET
```

---

## Custom Build Pipeline

`vite.config.ts` menggunakan `@lovable.dev/vite-tanstack-config` — **jangan tambah plugin secara manual**, hanya lewat `defineConfig({ vite: { ... } })`. Plugin yang sudah include: tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only), componentTagger (dev-only).

`buildHashPlugin()`: inject `VITE_BUILD_HASH` (git commit hash) untuk service worker cache busting.

`scripts/postbuild.js` (setelah build): baca TanStack manifest → extract `clientEntry` → generate `dist/client/index.html` SPA dengan `window.$_TSR` bootstrap inline. TanStack Start SPA tanpa server memerlukan bootstrap manual ini agar `Sj()` tidak crash.

---

## CSS & Theme

- Tailwind v4 + CSS custom properties (`src/styles.css`)
- shadcn/ui components dari `src/components/ui/` (Radix primitives)
- Mobile-first: default breakpoint <640px, `sm:`, `md:`, `lg:`, `xl:`

---

## Data Masking (UU PDP Indonesia)

- NIK publik: selalu tampil sebagai `"3273****1234"` (4 digit awal + 4 akhir)
- Data penduduk: `maskNama()` di `penduduk-store.ts`
- Audit log: `logAudit()` mencatat IP + username untuk every mutation

---

## Skill System: Quick Reference

Prompt → skill auto-mapping via `skill/project-skills/scripts/skill_matcher.py` (no dependencies).

| Prompt Pattern | Skill Terpilih | Confidence |
|---|---|---|
| "e-surat", "pengajuan surat", "tracking" | esurat-master | HIGH |
| "penduduk", "import csv", "statistik" | penduduk-manager | HIGH |
| "offline", "sync", "indexeddb" | offline-first | HIGH |
| "template surat", "dna", "form fields" | template-designer | HIGH |
| "auth", "login", "otp", "session" | auth-hardener | HIGH |
| "supabase", "migrations", "rls" | supabase-architect | HIGH |
| "admin", "dashboard", "settings" | admin-dashboard | HIGH |
| "whatsapp", "notifikasi", "wa" | wa-notification | HIGH |
| "cms", "berita", "pengumuman" | cms-admin | HIGH |
| "security", "audit", "owasp" | security-audit | HIGH |
| "schema database", "tabel", "erd" | database-designer | HIGH |
| "audit API", "endpoint", "review" | api-design-reviewer | HIGH |

```bash
# Test skill matching
python3 skill/project-skills/scripts/skill_matcher.py "audit keamanan API endpoint"

# List all loaded skills
python3 skill/project-skills/scripts/skill_matcher.py --list-all
```