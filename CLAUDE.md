# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Proyek:** Website Desa Seruni Mumbul — Sistem informasi pemerintahan desa dengan layanan e-surat dan CMS offline-first.

---

## Teknologi Stack

| Layer      | Pilihan                                                      |
| ---------- | ------------------------------------------------------------ |
| Framework  | TanStack Start (SPA, file-based routing via `src/routes/`)   |
| UI         | React 19 + Tailwind CSS v4 + shadcn/ui (Radix primitives)    |
| State      | Zustand (module-level stores, in-memory + IndexedDB persist) |
| Data sync  | IndexedDB-first → Supabase write-behind (offline-capable)    |
| Auth       | Custom HMAC-SHA256 session signing                           |
| DB         | Supabase PostgreSQL + Supabase Storage                       |
| API Server | Express.js (`server/index.js`) — Railway                     |
| Deploy     | Frontend: Netlify · API: Railway                             |
| PDF        | `jspdf` + `pdf-lib` (client-side)                            |
| Maps       | Leaflet + React-Leaflet                                      |

---

## Perintah Umum

```bash
npm install          # Install dependencies
npm run dev          # Dev server (Vite, port 5173, proxy /api/* → 3001)
npm run server       # Local API server (WAJIB --env-file=.dev.vars)
npm run dev:all      # Both servers concurrently
npm run build        # Build + postbuild.js (SPA bootstrap)
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier write
npm run typecheck    # TypeScript type check (tsc --noEmit)
```

---

## Arsitektur Data: Offline-First Write-Behind

```

WRITE: module state (sync) → IndexedDB (async) → Supabase upsert (non-blocking)
READ: module state (sync) → IndexedDB (sync fallback)

```

**Store init:** `src/lib/store-init.ts` → `initAllStores()` di `__root.tsx` (di-await sebelum render pertama). Tiga fase:

- **Phase 1** (blocking): initSettingsStore() + initHeroConfig()
- **Phase 2** (fire-and-forget): initEsuratStore() + initTemplateStore() + initNomorSuratStore()
- **Phase 3** (lazy): initLazyStores() dipanggil manual dari route component

**Penting:** Jika Supabase/IDB kosong → mock data dimuat → store di-lock. Phase 3 stores perlu di-trigger manual via `initLazyStores()`.

---

## Local API Server

**Server-side endpoints** di `server/api/` — `QR_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASS` tidak pernah masuk browser bundle.

**Start server (WAJIB `--env-file` flag):**

```bash
npm run server
# atau: node --env-file=.dev.vars server/index.js
```

**Vite proxy:** `/api/*` → `http://localhost:3001` saat development (via `vite.config.ts`).

### API Endpoints Utama

| Method | Path                        | Auth                     |
| ------ | --------------------------- | ------------------------ |
| POST   | `/api/auth/admin-login`     | rate-limited             |
| POST   | `/api/auth/request-otp`     | public                   |
| POST   | `/api/auth/verify-otp`      | public                   |
| POST   | `/api/auth/refresh`         | warga session            |
| POST   | `/api/generate-nomor-surat` | admin HMAC               |
| POST   | `/api/sign-surat-qr`        | admin HMAC               |
| POST   | `/api/generate-pdf`         | admin HMAC               |
| POST   | `/api/download-pdf`         | admin/warga session      |
| POST   | `/api/verify-surat`         | public (tracking lookup) |
| POST   | `/api/send-wa`              | public/service key       |
| POST   | `/api/submit-surat`         | captcha + rate limit     |
| POST   | `/api/push/send`            | admin HMAC               |

---

## Session & Auth Architecture

### Dual System

1. **Admin auth** (`src/lib/auth.ts`): Login via `/api/auth/admin-login` → session signed dengan HMAC-SHA256 → disimpan di `localStorage`/`sessionStorage`
2. **Warga auth** (`src/lib/warga-auth.ts`): OTP via WhatsApp (Fonnte), PBKDF2 hash, session via Supabase

### HMAC Session Flow (Critical)

**Server `/api/auth/admin-login`** mengembalikan session dalam format server:

```typescript
{
  (id, username, name, role, loginAt, expiresAt);
} // NO sig field
```

**Client `loginHybrid()`** menormalisasi session:

```typescript
{ userId: serverSession.id, loggedAt: serverSession.loginAt, sig: "" }
// ↓ then HMAC-signed:
{ ...sig: await hmacSign(buildSignPayload(userId, role, expiresAt), secret) }
```

**Semua API call ke endpoint yang dilindungi harus menyertakan `Authorization` header:**

```typescript
const sessionToken = getSessionToken(); // JSON.stringify(session)
headers["Authorization"] = `Bearer ${sessionToken}`;
```

### Field Name Mapping (Server ↔ Client)

| Server session | Client session | Notes           |
| -------------- | -------------- | --------------- |
| `id`           | `userId`       | User ID         |
| `loginAt`      | `loggedAt`     | Login timestamp |
| `expiresAt`    | `expiresAt`    | Session expiry  |
| `sig`          | `sig`          | HMAC signature  |

### HMAC Secret: `ADMIN_SESSION_SECRET` / `VITE_ADMIN_SESSION_SECRET`

**Hanya SATU secret** digunakan untuk:

1. Client-side signing: `VITE_ADMIN_SESSION_SECRET` (browser, via `hmacSign()`)
2. Server-side verification: `ADMIN_SESSION_SECRET` (Express, identical value)

**File `.dev.vars` WAJIB berisi:**

```
VITE_ADMIN_SESSION_SECRET=your-64-char-secret
ADMIN_SESSION_SECRET=your-64-char-secret  # harus SAMA
```

### Helper Functions

- `getSessionToken()` → returns `JSON.stringify(session)` untuk Authorization header
- `getSessionSecret()` → returns secret string, atau `null` di dev mode (graceful)
- `getSessionAsync()` → async HMAC verification, reject tampered sessions

### Role Permissions

`can(role, action)` di `src/lib/roles.ts` — satu-satunya entrypoint untuk pengecekan akses.

Roles: `Super Admin | Operator | Verifikator | Kepala Desa | Sekretaris Desa`

---

## E-Surat Workflow

```
Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak
```

**Tracking number:** `{KODE}-{YYMMDD}-{last6ts}{rand4}` (contoh: `SKK-260522-3f2a1x4k`)

**Nomor surat resmi:** `{klasifikasi}/{noUrut:3digit}/{inisial}.{desa}/{bulanRomawi}/{tahun}` (contoh: `474/001/KDS.SRMB/V/2026`)

**Nomor surat generation:** Atomic via Supabase RPC `increment_nomor_surat_counter`. Jika RPC gagal → error 503 (TIDAK ada fallback).

**Offline submission:** `enqueueOfflineSubmission()` → IndexedDB queue → `processOfflineQueue()` on reconnect. Exponential backoff.

---

## Routing

- **Route tree:** `src/routeTree.gen.ts` — **auto-generated**. Edit routes di `src/routes/`, restart dev server.
- **Route config:** `src/router.tsx` + `src/routes/__root.tsx`
- **TanStack Search Params:** `useSearch({ from: "/path" })`

---

## Database Notes

- `app_settings` table: primary key adalah `key` (bukan `id`) — query dengan `select("key")`
- `warga` table: primary key adalah `nik` (16 digit)
- `surat_requests`: `no` adalah tracking number (UQ), `tracking_no` untuk lookup setelah approve
- Storage buckets: `surat-attachments`, `public-media`, `perangkat-fotos` (semua public)

---

## Data Masking (UU PDP Indonesia)

- NIK: selalu tampil sebagai `"3273****1234"` via `maskNik()` — tidak pernah plaintext di UI
- Nama: `maskNama()` di `penduduk-store.ts`
- Phone: `maskPhone()` — tampil first 3 digits + last 4

---

## Custom Build Pipeline

`vite.config.ts` menggunakan `@lovable.dev/vite-tanstack-config` — **extend via `defineConfig({ vite: { plugins: [...] } })`**, jangan override.

`scripts/postbuild.js` menghasilkan `dist/client/index.html` dengan `window.$_TSR` bootstrap inline. **Jangan edit output secara manual.**

---

## Admin Page View Structure

`src/pages/Admin.tsx` uses a single `view` state to switch between Dashboard/Monitoring/Archive/other sections. **Every view that needs the preview panel must render `<SuratPreviewPanel>` explicitly** — it is NOT globally mounted.

| view           | Preview Panel                   | Components                                  |
| -------------- | ------------------------------- | ------------------------------------------- |
| `"dashboard"`  | ✅ Rendered in sticky `<aside>` | Dashboard cards + Antrian + Preview sidebar |
| `"monitoring"` | ✅ Rendered (fixed Mei 2026)    | MonitoringTable + Preview sidebar           |
| `"archive"`    | ✅ Rendered                     | ArchiveTable + Preview sidebar              |
| `"templates"`  | ❌ No sidebar                   | TemplateSuratManager                        |
| `"penduduk"`   | ❌ No sidebar                   | PendudukManager                             |
| `"konten"`     | ❌ No sidebar                   | CMSManager                                  |

`MonitoringTable` is defined inline within `Admin.tsx` (lines ~1650-1890), NOT a separate component file.

---

## Troubleshooting

### Preview Blanko Surat tidak tampil (Mei 2026 — FIXED)

**Cause:** `SuratPreviewPanel` tidak di-render di view Monitoring dan Archive — hanya ada di Dashboard.
**Fix:** View Monitoring dan Archive sekarang memiliki layout grid 2-kolom dengan preview sidebar. Jika hilang lagi, cek apakah `aside` dengan `<SuratPreviewPanel>` ada dalam blok `view === "monitoring"` dan `view === "archive"`.

### 401 Unauthorized dari `/api/generate-nomor-surat` (MAYO 2026 — FIXED)

1. Dev mode: unsigned sessions sekarang diizinkan otomatis
2. Jika tetap 401: cek apakah server sudah di-restart setelah perubahan kode
3. Jika production: pastikan `ADMIN_SESSION_SECRET` >= 32 chars di `.dev.vars`

### Old server process blocking port 3001

Jika API test hasilnya tidak berubah setelah edit: server lama masih berjalan.

```bash
# Cek process di port:
netstat -ano | findstr ":3001"
# Kill by PID:
taskkill //F //PID <PID>
```

### `app_settings` query returns 400

Cek kolom yang di-select — primary key adalah `key`, bukan `id`:

```typescript
.select("key") // ✅ benar
.select("id")  // ❌ salah
```

### Rate limiter "Terlalu banyak percobaan login"

Rate limiter in-memory — restart server untuk reset.

---

## Dokumentasi

`docs/ERD.md` — Entity Relationship Diagram lengkap
`docs/debugging.md` — Troubleshooting detail
`docs/SURAT_SYSTEM_AUDIT_20260522.md` — Security audit report
`FINAL_FIX_SUMMARY.md` — Fix history untuk auth dan nomor surat

---

---

## Skill Management

Beberapa skill kustom tersedia di `.claude/skills/`:

| Skill                         | Path                                          | Fungsi                                                 |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `monitoring-workflow-builder` | `.claude/skills/monitoring-workflow-builder/` | Bangun monitoring workflow (verifikasi/approve/blanko) |
| `monitoring-verifier`         | `.claude/skills/monitoring-verifier/`         | Runtime verification untuk monitoring flow             |
| `auth-security-fixer`         | `.claude/skills/auth-security-fixer/`         | Fix OTP rate limit, dev bypass, password hashing       |
| `login-system-audit`          | `.claude/skills/login-system-audit/`          | Audit menyeluruh sistem login                          |

---

## Critical Fix (Mei 2026)

### Auth 401 Fix — Unsigned Sessions

**Masalah:** Server endpoints menolak session tanpa HMAC `sig` field, padahal server login tidak mengembalikan `sig`.

**Solusi:** Dev mode bypass — unsigned sessions diizinkan saat `NODE_ENV !== "production"`:

```javascript
// Pattern yang BENAR (generate-nomor-surat.js, generate-pdf.js, sign-surat-qr.js):
if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
  const sig = session.sig ?? "";
  if (sig.length > 0) {
    // Verify HMAC signature
    if (!hmacVerify(payload, sig, ADMIN_SESSION_SECRET)) return 401;
  } else if (process.env.NODE_ENV === "production") {
    return 401; // Production: reject unsigned
  }
  // Dev mode: allow unsigned sessions
}
```

**Dokumentasi lengkap:** `AUTH_FIX_COMPLETE.md`

---

## Deployment

### Frontend (Netlify)

Netlify auto-deploys from `dist/client/` on every push to main.

- Redirects `/api/*` → Railway API via proxy
- Build: `npm run build`

### API Server (Railway)

Express.js API deployable ke Railway:

```bash
railway login
railway init --service seruni-api
railway up --service seruni-api
```

**Required env vars di Railway:**

```
NODE_ENV=production
PORT=8080
ALLOWED_ORIGIN=https://seruni-mumbul.netlify.app
SUPABASE_URL=https://wrfraskmawmciiutwcpx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
ADMIN_SESSION_SECRET=<min-32-chars>
ADMIN_USER=<admin>
ADMIN_PASS=<password>
QR_SECRET=<min-32-chars>
FONNTE_KEY=<fonnte-api-key>
VITE_SUPABASE_URL=https://wrfraskmawmciiutwcpx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_FONNTE_KEY=<fonnte-api-key>
VITE_QR_SECRET=<min-32-chars>
```

**Railway health check:** `GET /health` — cek `server/api/health-check.js`

---

_Versi: 4.1 · 27 Mei 2026_
