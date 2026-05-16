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

**Init saat app mount** (`src/lib/store-init.ts`): semua store di-async init satu per satu sebelum app render.

### Store Utama

| Store | IndexedDB | Supabase Table | Key |
|-------|----------|----------------|-----|
| `penduduk-store.ts` | `penduduk` | `warga` | `nik` |
| `esurat-store.ts` | `esurat_records` / `esurat_archive` | `surat_requests` | `no` |
| `template-store.ts` | `templates` | — (local only) | `id` |
| `content-store.ts` | `berita/pengumuman/agenda/galeri` | `cms_contents` (type-filtered) | `id` |
| `settings-store.ts` | `settings` | `app_settings` | `id` |
| `auth.ts` | `users` (IndexedDB) | `admin_users` | `id` |

**Sync lib utama:** `src/lib/useSupabaseSync.ts` — handle semua write-behind, optimistic locking, merge offline records.

**Store init:** `src/lib/store-init.ts` → `initAllStores()` dipanggil di `__root.tsx`.

---

## Routing & Pages

- **Route tree:** `src/routeTree.gen.ts` (auto-generated, jangan edit manual)
- **Route config:** `src/router.tsx` + `src/routes/__root.tsx`
- **File-based routes:** `src/routes/*.tsx` → `/pelayanan/e-surat`, `/admin`, dll.
- **TanStack Search Params:** `useSearch({ from: "/path" })` untuk query params (contoh: `?kode=SKK` di e-surat)
- **Error boundary:** `DefaultErrorComponent` di `router.tsx` → render saat error

### Halaman Utama
- `src/pages/ESurat.tsx` — 5-step wizard (Pilih Surat → NIK → Identitas → Detail → Review)
- `src/pages/admin.tsx` — Admin dashboard container
- `src/pages/MonitoringSurat.tsx` — Lacak status surat
- `src/pages/PengajuanSaya.tsx` — Riwayat pengajuan warga

---

## E-Surat: Workflow & Kontrak Kunci

**Status flow:** `Menunggu Verifikasi` → `Diverifikasi` → `Menunggu Approval` → `Disetujui | Ditolak`

**Tracking number format:** `{KODE}-{YYMMDD}-{last6ts}{rand4}` (contoh: `SKK-250515-3f2a1x4k`)

**NIK Lookup cascade:**
```
lookupPenduduk(nik) → penduduk-store.getPendudukByNik(nik)
  → _mem (in-memory) → IndexedDB → Supabase warga (fire-and-forget)
```

**Offline submission:** `enqueueOfflineSubmission()` (offline-queue.ts) → queue → auto-sync on reconnect.

**Template Surat:** `template-store.ts` → `initTemplateStore()` → load dari IndexedDB. Templates **tidak sync ke cloud** (local only).

**Estimasi processing time:** fetch dari edge function `/api/surat/estimasi` (di-cache 5 menit).

---

## API Edge Functions (Cloudflare Pages)

Semua di `functions/`:

```
functions/api/auth/admin-login.ts      → POST /api/auth/admin-login
functions/api/auth/refresh-warga-session.ts
functions/api/auth/request-otp.ts      → POST /api/auth/request-otp
functions/api/auth/verify-otp.ts       → POST /api/auth/verify-otp
functions/api/generate-nomor-surat.ts → POST /api/generate-nomor-surat
functions/api/generate-pdf.ts          → POST /api/generate-pdf
functions/api/send-wa.ts               → POST /api/send-wa
functions/api/surat/estimasi.ts        → POST /api/surat/estimasi
functions/api/verify-surat.ts          → GET  /api/verify-surat?no=...
functions/_scheduled.ts                → Cloudflare Cron (setiap 6 jam)
```

**Shared utils:** `functions/_lib/utils.ts` — `hmacSha256Hex`, `base64UrlEncode/Decode`, `hashOtp`.

**Env vars untuk Edge Functions** (via Cloudflare Pages Secrets):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `FONNTE_API_KEY`, `ADMIN_WA_NUMBER`
- `QR_SECRET` (HMAC signing secret)
- `JWT_SECRET` (admin session signing — used by verifyAdminSession)
- `ADMIN_SESSION_SECRET` (same HMAC key; required by /api/push/send edge function)
- `VAPID_PRIVATE_KEY` (web push — not used for admin auth)

---

## Database: 24 Tabel Supabase

ERD lengkap ada di `docs/ERD.md`. Tabel inti:

- `warga` — penduduk (NIK sebagai UQ key)
- `surat_requests` — pengajuan surat (no_surat UQ)
- `surat_template` — template surat (local-managed)
- `admin_users` — akun admin (fixed superadmin dari env var)
- `audit_log` — trail semua aksi
- `cms_contents` — berita/pengumuman/agenda/galeri
- `app_settings` — settings JSONB + history versioning
- `surat_types` — 74 jenis surat referensi (migrasi 015)
- `wilayah`, `village_subdivisions` — hierarki wilayah
- `perangkat_desa_struktur`, `perangkat_desa` — struktur jabatan + orang
- `lembaga_desa`, `struktur_lembaga`, `pengurus_lembaga` — lembaga desa
- `apbdes_data`, `monografi` — APBDes dan monografi
- `pengaduan` — tiket pengaduan

**Storage buckets:** `surat-attachments` (public), `public-media` (public), `perangkat-fotos` (public).

**Migrations:** `supabase/migrations/` (31 file, numbered 001–031).

---

## Auth: Dual-System

1. **Admin auth** (`src/lib/auth.ts`): Fixed account dari `VITE_ADMIN_USER`/`VITE_ADMIN_PASS`. Additional users di IndexedDB + `admin_users` table. Session di `localStorage`/`sessionStorage` (7 hari). Hybrid login: edge function → fallback local.
2. **Warga auth** (`src/lib/warga-auth.ts`): OTP via WhatsApp (Fonnte). OTP di-hash SHA-256. Session token HMAC-signed.

**Role admin:** `Super Admin | Operator | Verifikator | Kepala Desa` (dari `src/lib/roles.ts`).

---

## Admin CMS

Semua panel admin di `src/components/admin/`:
- `PendudukManager` — CRUD + CSV import/export
- `TemplateSuratManager` — manage template surat
- `CMSManager` — berita/pengumuman/agenda/galeri
- `SettingsPanel` — app settings (key-value JSONB)
- `LembagaManager`, `PerangkatDesaManager`, `WilayahSettings`, `HeroSettings`
- `AuditLogManager` — lihat trail aksi
- `SuratPreviewPanel` — preview surat + update status workflow

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

---

## CSS & Theme

- Tailwind v4 + CSS custom properties (`src/styles.css`)
- shadcn/ui components dari `src/components/ui/` (Radix primitives)
- Custom section components di `src/components/sections/`
- Letter renderer components di `src/components/surat/` (PDF output)
- Mobile-first: default breakpoint <640px, `sm:`, `md:`, `lg:`, `xl:`

---

## Data Masking (UU PDP Indonesia)

- NIK publik: selalu tampil sebagai `"3273****1234"` (4 digit awal + 4 akhir)
- Data penduduk: `maskNama()` di `penduduk-store.ts`
- Audit log: `logAudit()` mencatat IP + username untuk every mutation

---

## 🧠 Skill System: Auto-Mapping Prompt → Skill

### Arsitektur Skill Engine

```
[User Prompt]
    ↓
[Skill Matcher Engine]  ← python skill_matcher.py (no dependencies)
    ↓
[Confidence Scoring]  ← keyword match + domain boost + action weight
    ↓
[Top-N Skills Ranked]  ← local Seruni skills FIRST (×1.3), then global catalog
    ↓
[Auto-Select or Suggest]
    conf ≥ 0.80 → auto-load SKILL.md → execute
    conf 0.60–0.79 → suggest + confirm
    conf < 0.60 → general mode
```

### Skill Catalog

**Local (Seruni-specific) — 10 project skills:**

| Skill | Fungsi |
|-------|--------|
| `esurat-master` | E-surat lifecycle, tracking, status, offline submit |
| `penduduk-manager` | CRUD penduduk, NIK validation, CSV import/export, statistik |
| `offline-first` | IndexedDB, write-behind sync, offline queue, conflict resolution |
| `template-designer` | DNA clauses, form fields, OpenSID format, autofill mapping |
| `auth-hardener` | HMAC session, OTP WA, role permissions, Turnstile CAPTCHA |
| `supabase-architect` | Schema migrations, RLS policies, upsert, realtime subscriptions |
| `admin-dashboard` | Admin panels, role-based access, settings, audit log |
| `wa-notification` | Fonnte API, status WA templates, Cloudflare Cron reminders |
| `cms-admin` | Berita, pengumuman, agenda, galeri, komoditas, APBDes |
| `security-audit` | OWASP Top 10, RLS audit, XSS/CSRF, UU PDP compliance |

**Global (666-skill catalog) — relevant subset:**

| Skill | Relevance |
|-------|-----------|
| `database-designer` | Supabase schema design |
| `api-design-reviewer` | Edge function API review |
| `dependency-auditor` | CVE scan, package audit |
| `karpathy-coder` | Code quality, surgical changes |
| `release-manager` | Changelog, semver |
| `changelog-generator` | Conventional commits → changelog |
| `sentry-pro` | Error tracking setup |
| `tech-debt-tracker` | Code smell inventory |
| `docker-development` | Dockerfile optimization |
| `env-secrets-manager` | .env hygiene, leak detection |

### Skill Matcher CLI

```bash
# Prompt ke skill (mode default)
python3 skill/project-skills/scripts/skill_matcher.py "audit keamanan API endpoint"

# Interactive mode
python3 skill/project-skills/scripts/skill_matcher.py --interactive

# List semua skill yang ter-load
python3 skill/project-skills/scripts/skill_matcher.py --list-all

# Domain mapping
python3 skill/project-skills/scripts/skill_matcher.py --domains
```

### Cara Kerja Prompt → Skill Auto-Selection

```
STEP 1 — PARSE
  Input: "audit keamanan auth login warga"
  ↓ tokenize + stop word removal
  ↓ domain keywords: [audit, keamanan, auth, login, warga]
  ↓ action verbs: [audit] → weight ×3.0

STEP 2 — SCORE (per skill dalam catalog)
  exact keyword match in name → +4.0
  keyword match in description → +2.0
  domain boost: "auth" in query + "auth" in skill → +5.0
  action boost: "audit" in query + "audit" in skill → +3.0
  local skill bonus → ×1.3

STEP 3 — RANK
  auth-hardener:    score = (5.0 + 3.0 + 5.0 + 3.0) × 1.3 = 20.8 → HIGH
  security-audit:   score = (3.0 + 4.0 + 2.0) × 1.3 = 11.7 → MED
  esurat-master:    score = (2.0 + 2.0) = 4.0 → LOW

STEP 4 — OUTPUT
  ✅ auth-hardener [HIGH 21] — auto-load SKILL.md
  ✅ security-audit [MED 12]
  ✅ esurat-master [LOW 4]
```

### Quick Trigger Reference

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
| "npm audit", "cve", "dependency" | dependency-auditor | MED |
| "changelog", "release", "version" | changelog-generator | MED |
| "error tracking", "sentry" | sentry-pro | MED |

### Adding New Local Skills

```bash
# 1. Create skill folder
mkdir -p skill/project-skills/skills/my-new-skill/scripts

# 2. Write SKILL.md (required fields)
# ---
# name: "my-new-skill"
# description: "Use when ... triggers ..."
# ---

# 3. Add to DOMAIN_MAP in skill_matcher.py
DOMAIN_MAP = {
    "my-keyword": "my-new-skill",  # keyword → folder mapping
    ...
}

# 4. Test
python3 skill/project-skills/scripts/skill_matcher.py "my keyword query"
```

### Skill Matcher Architecture (No Dependencies)

```
skill_matcher.py
├── SkillRegistry._load()      — reads all SKILL.md from disk
├── SkillRegistry._tokenize() — stop word removal + tokenization
├── SkillRegistry._score()    — weighted scoring algorithm
│   ├── Keyword exact match   — name: ×4.0, desc: ×2.0
│   ├── Domain boost          — 30 domain keywords × boost weight
│   ├── Action verb boost     — 20 action verbs × verb weight
│   ├── Exact phrase bonus    — 2-word phrase ×5.0
│   └── Local source bonus    — local skills ×1.3
└── format_result()           — colored terminal output
```
