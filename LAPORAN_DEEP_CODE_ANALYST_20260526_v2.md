# Deep Code Analyst Report

**Project:** Seruni Mumbul (desa website + e-surat system)
**Date:** 2026-05-26 (2nd edition, updated from previous audit)
**Tech Stack:** React 19 + TanStack Start + Express.js + Supabase + Tailwind CSS v4 + Netlify
**Stats:** 230 source files (~43k LOC) | server: 10 req/sec capacity | bundle: ~400kb initial

---

## Ringkasan Ekseklusif

Project Seruni Mumbul dalam kondisi **beroperasi dengan tech debt yang signifikan** di beberapa area. Deployment pipeline ke Netlify sudah berfungsi, auth HMAC sudah diimplementasi, namun ada **2 lubang keamanan kritis baru** (HMAC bypass di 4 endpoint), serta masalah performance serius pada 4 file yang terlalu besar tanpa lazy loading. Priority #1: fix HMAC bypass — Priority #2: split Admin.tsx.

## Statistik Masalah

| Tingkat   | Jumlah |
| --------- | ------ |
| 🔴 KRITIS | 9      |
| 🟠 TINGGI | 13     |
| 🟡 SEDANG | 23     |
| 🟢 RENDAH | 9      |
| **Total** | **54** |

---

## DETAIL MASALAH (urut prioritas)

---

### KEAMANAN (KEPENDUDUKAN BARU)

---

#### 1. HMAC Signature Bypass di 4 Endpoint Admin — 🔴 KRITIS

**Lokasi:** `server/api/download-pdf.js:88-103`, `server/api/generate-pdf.js:88-104`,
`server/api/send-wa.js:81-101`, `server/api/push-send.js:30-44`

**Deskripsi:** Cek `ADMIN_SESSION_SECRET && sig.length === 0` memasuki blok bypass di production — logging warning tetapi tetap grant akses admin. Jika `ADMIN_SESSION_SECRET` di-set tetapi request membawa `sig: ""` (string kosong, bukan field absent), 4 endpoint ini grant akses admin tanpa verify signature.

**Dampak:** Admin session token (bisa dicuri) tidak perlu HMAC signature untuk download PDF, generate PDF, kirim WhatsApp, push notification. Serangan: steal admin cookie → call 4 endpoint tanpa HMAC.

**Bukti:**

```javascript
// download-pdf.js ~line 88-103 (pola yang sama di 4 file)
if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
  const sig = session.sig ?? "";
  if (sig.length === 0) {
    if (IS_PROD) {
      console.warn("[download-pdf] No sig in prod — proceeding admin");
      // ← BUG: should return 401, not proceed!
    }
  } else { if (!hmacVerify(...)) return { valid: false }; }
}
// return { valid: true, type: "admin" }  ← semua yang di atas masuk ke sini
```

**Fix:** Ubah blok `if (IS_PROD)` → `return res.status(401).json(...)` di semua 4 file.
Endpoint `sign-surat-qr.js` dan `generate-nomor-surat.js` sudah benar (return 401).

---

#### 2. OTP Brute-Force tanpa Lockout — 🟠 TINGGI

**Lokasi:** `server/api/request-otp.js:83-97`

**Deskripsi:** Setelah 6x gagal verifikasi, OTP expire tapi attacker bisa langsung minta OTP baru. Tidak ada penalti/lockout setelah N tentativas gagal. Ruang 6-digit OTP = 1 juta kombinasi — dengan 1k req/s → ~17 menit brute force.

**Fix:** Tambahkan `failed_attempts` counter per NIK di Supabase. Setel `account_locked_until` setelah 5x gagal verifikasi gagal. Include in `/api/auth/verify-otp`.

---

#### 3. NIK Enumeration pada Endpoint Publik — 🟡 SEDANG

**Lokasi:** `server/api/request-otp.js:107-109`

**Deskripsi:** `/api/auth/request-otp` mengembalikan `notFound(res, "NIK")` untuk NIK yang tidak terdaftar. Response membedakan NIK valid vs tidak → enumeration attack.

**Dampak:** UU PDP Indonesia violation. enumeration ~1 juta NIK potensial menghasilkan voter/resident registry.

---

#### 4. Plaintext Password Fallback di Legacy Auth — 🟡 SEDANG

**Lokasi:** `src/lib/auth.ts:287`, `src/lib/auth.ts:519-521`

**Deskripsi:** Jika stored password tidak mulai dengan `pbkdf2_sha512$`, fallback ke `storedPwd === oldPwd` (plaintext compare). Akun legacy yang tersimpan dengan password plaintext akan match di sini.

**Fix:** Hapus plaintext fallback. Force migrate semua akun ke PBKDF2.

---

#### 5. Test Token di Submit-Surat — 🟡 SEDANG

**Lokasi:** `server/api/submit-surat.js:90`

```javascript
const TEST_TOKENS = new Set(["XXXX.DUMMY.TOKEN.XXXX", "1x0000000..."]);
```

**Dampak:** Jika token ini ada di production traffic, bisa bypass validation.

---

#### 6. Audit Log Failure Non-Fatal — 🟡 SEDANG

**Lokasi:** `server/api/pengaduan/admin.js:229-247`

Audit log insert gagal tetapi operasi tetap lanjut. Di konteks pemerintah (Permendagri 18/2018), audit trail mandatory.

---

#### 7. Unbounded In-Memory Rate Map — 🟡 SEDANG

**Lokasi:** `server/api/verify-surat.js:27-37`

`Map()` module-level tidak pernah di-GC. Setiap IP menambah entry permanen. Under attack → RAM growth unbounded.

---

#### 8. Fonnte Token Injection in Body — 🟢 RENDAH

**Lokasi:** `server/api/send-wa.js:121-161`

`reqToken || ENV_FONNTE_KEY` — client bisa supply token. risk rendah tapi vector potensial.

---

---

### FRONTEND & PERFORMANCE

---

#### 9. Admin.tsx 2322 baris – Monolith, Tidak Ada Code Splitting — 🔴 KRITIS

**Lokasi:** `src/pages/Admin.tsx`

**Dampak:** 40+ static import (recharts ~150kb) dimuat di PADA SEMUA page admin, bahkan page Settings/Penduduk yang tidak pakai chart. Setiap state change trigger full re-render 2322-line component.

**Fix:** `React.lazy()` per view panel:

```tsx
const DashboardView = React.lazy(() => import("@/components/admin/DashboardView"));
const MonitoringTable = React.lazy(() => import("@/components/admin/MonitoringTable"));
const KeuanganView = React.lazy(() => import("@/components/admin/keuangan/KeuanganMainView"));
// ...etc
```

---

#### 10. recharts Static Import di Shared Component — 🔴 KRITIS

**Lokasi:** `src/components/admin/DashboardCharts.tsx:20`, `src/pages/Admin.tsx:111`

Seluruh library (~150kb gzipped) di-import di Admin.tsx yang dimuat di semua admin page.

**Fix:** Gunakan named imports scoped atau dynamic import.

---

#### 11. PENDUDUK_MOCK Bundled ke Production — 🔴 KRITIS

**Lokasi:** `src/pages/ESurat.tsx:80`, `src/data/penduduk.ts`

`import { PENDUDUK_MOCK }` statically bundles ~200 baris mock data ke production bundle. Hanya type yang perlu diimpor.

---

#### 12. Sync getSettings() During Render — 🔴 KRITIS

**Lokasi:** `src/components/surat/LetterRenderer.tsx:47-50`

```tsx
const settings = getSettings(); // ← dipanggil saat render, bukan di useEffect
// Jika store belum init → undefined → crash/nan di PDF render
```

**Fix:** Gunakan Zustand selector hook dengan loading state.

---

#### 13. Phase 2 Promise Orphaned — 🔴 KRITIS

**Lokasi:** `src/lib/store-init.ts:95-102`

`Promise.allSettled()` tidak di-track, tidak ada `.catch()`, tidak ada retry. Jika `initTemplateStore` gagal → silently fail, e-surat page error tanpa jelas kenapa.

**Fix:** Export `isEsuratReady()` promise-based check; tampilkan loading state jika Phase 2 belum selesai.

---

#### 14. LetterLayoutEditor.tsx 1970 baris — 🟠 TINGGI

**Lokasi:** `src/components/admin/LetterLayoutEditor.tsx`

Single-file form editor untuk semua letter layout config. Tidak ada lazy sub-components.

---

#### 15. useSupabaseSync.ts 1192 baris, 35+ exports — 🟠 TINGGI

**Lokasi:** `src/lib/useSupabaseSync.ts`

Seluruh logic sync (CRUD, archive, audit, realtime, template) dalam 1 file → 1 chunk besar.

**Fix:** Split by domain: `sync/surat-sync.ts`, `sync/surat-audit.ts`, `sync/surat-realtime.ts`.

---

#### 16. ESurat.tsx 1767 baris tanpa lazy sub-components — 🟠 TINGGI

**Lokasi:** `src/pages/ESurat.tsx`

Multi-step form wizard (category selection + DNA form) dalam 1 file.

---

#### 17. CMSManager.tsx 1147 baris — 🟠 TINGGI

**Lokasi:** `src/components/admin/CMSManager.tsx`

Semua content type (berita, pengumuman, agenda, galeri) re-render saat switch tab.

---

#### 18. pend、断Store Race Condition — 🟡 SEDANG

**Lokasi:** `src/lib/penduduk-store.ts:52-100`

Dua komponen yang call `initPendudukStore()` concurrently → kedua fetch Supabase → potensi data overwrite.

**Fix:** Singleton promise pattern:

```ts
let _initPromise: Promise<void> | null = null;
export async function initPendudukStore(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = doInit();
  return _initPromise;
}
```

---

#### 19. Module-Level Cache Tanpa TTL — 🟡 SEDANG

**Lokasi:** `src/components/admin/SuratPreviewPanel.tsx:52-90`

Signers dan rejection reasons cached tanpa timestamp-based invalidation → stale data sampai page reload.

---

#### 20. Inline Style Objects Break Tailwind JIT — 🟡 SEDANG

**Lokasi:** `src/components/surat/LetterRenderer.tsx:60-76, 105-122`

Large inline `style={{}}` objects → Tailwind tidak bisa purge unused styles di area tersebut.

---

#### 21. surat-master.ts 1980 baris di Main Bundle — 🟡 SEDANG

**Lokasi:** `src/data/surat-master.ts`

1980-line static data file → setiap change force full bundle reload.

---

#### 22. File Input tanpa Accessible Label — 🟢 RENDAH

**Lokasi:** `src/components/admin/PendudukManager.tsx:1088`

---

#### 23. No Global Error Boundary — 🟢 RENDAH

Crash component → white screen entire app. Root ErrorBoundary sudah ada (Sentry), tapi halaman lain tidak ada graceful degradation.

---

#### 24. Hero Images Missing fetchpriority — 🟢 RENDAH

LCP penalized karena hero images dimuat eager tanpa priority hint.

---

---

### CODE QUALITY

---

#### 25. `@typescript-eslint/no-explicit-any` Globally Disabled — 🟠 TINGGI

ESLint config globally off, baru re-enabled selectively. Type safety lemah di 56+ tempat (`as any` di routeTree.gen.ts) plus search params, Excel parsing, DB constants.

**Dampak:** Bugs di zona-zona tersebut tidak tertangkap TypeScript compiler.

---

#### 26. Inconsistent Error Handling (3 patterns coexistence) — 🟠 TINGGI

- Pattern A: Silent log-and-continue: `catch { return []; }`
- Pattern B: Throw: `throw new Error(...)`
- Pattern C: Return `{ ok: false, message }` (Result type)

Tidak ada strategi unified → caller harus nebak pola mana yang dipakai → bugs.

---

#### 27. DashboardCharts Inline Heavy Functions — 🟠 TINGGI

`fuzzyScore()` dan stats recomputation inline tanpa `useCallback`/`useMemo` — re-compute on every keystroke.

---

#### 28. Duplicate STATUS_KEYS Array — 🟡 SEDANG

defined di `Admin.tsx:115` dan `MonitoringTable:1909`.

---

#### 29. Magic Numbers Tidak Didokumentasi — 🟡 SEDANG

RGB colors (7350, 2470), pixel values, timeout values, score weights — tanpa konstanta bernama.

---

#### 30. ESLint Configuration Gaps — 🟡 SEDANG

- Global `no-console` rule OFF → `console.log` production code tidak ter-flag
- `react/no-array-index-key` OFF → array indices sebagai key di chart loops

---

---

### DEPLOYMENT & BUILDS

---

#### 31. Empty .github/workflows/ Directory — 🔴 KRITIS

Pipeline: **manual**. Tidak ada automated testing, linting, atau build verification sebelum deploy.

**Fix:** Buat `.github/workflows/deploy.yml`:

```yaml
name: CI/CD
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: sudo npm install -g bun # atau pakai nvm
      - run: bun run build
      - run: bun run lint
      - run: bun run preview &
        env:
          ADMIN_SESSION_SECRET: ${{ secrets.ADMIN_SESSION_SECRET }}
```

---

#### 32. CSP Header Conflict: netlify.toml vs postbuild.js — 🟠 TINGGI

netlify.toml sets hardcoded CSP saat build. postbuild.js generates different CSP dengan nonce dinámico. Keduanya diterapkan → potential conflict/blocking.

**Fix:** Pilih satu authoritative source — kalau CSP via netlify.toml, hapus meta tag CSP dari postbuild.js.

---

#### 33. VITE_ADMIN_SESSION_SECRET Exposed to Browser — 🟠 TINGGI

`.dev.vars` ada `VITE_ADMIN_SESSION_SECRET` — prefix `VITE_` = masuk browser bundle. Padahal docs menyatakan "never exposed to browser". `.dev.vars` memang untuk local dev, tetapi risk jika developer accidentally pakai di .env production.

**Fix:** Pastikan `.env` production TIDAK punya `VITE_ADMIN_SESSION_SECRET`. Vite config stripping sudah ada untuk `VITE_DEV_OTP_BYPASS` dan `VITE_DEV_LOGIN_ENABLED` — tambah `VITE_ADMIN_SESSION_SECRET` ke list.

---

#### 34. Build menggunakan `bun` — 🟡 SEDANG

netlify.toml specifies `command = "bun run build"` tetapi Netlify build environment default tidak punya `bun`. Perlu install bun atau pakai `npm run`.

**Fix:** Atau tambahkan install step di netlify.toml build settings, atau ganti ke `npm run build`.

---

#### 35. postbuild.js eval() for Manifest Parsing — 🟡 SEDANG

```javascript
const manifestFn = eval(stripped); // security risk jika manifest tampered
```

**Fix:** Gunakan `new Function()` atau JSON.parse alternatively.

---

#### 36. Nonce Static until Next Deploy — 🟡 SEDANG

postbuild.js generates nonce dengan `Math.random()` once at build time (bukan per request). Tidak efektif untuk mitigate XSS — nonce harus request-specific untuk meaningful protection.

---

#### 37. manifest.json Exposes Build Info + CSP Nonce — 🟢 RENDAH

`dist/client/manifest.json` served publicly — expose internal build structure + nonce.

---

---

### BACKEND & API

---

#### 38. No Supabase Connection Pool Reuse — 🟠 TINGGI

Setiap endpoint call `createClient()` independently. Tanpa module-level singleton, pool connections accumulate per request.

```javascript
// Di semua endpoint:
const sb = createClient(SUPABASE_URL, SERVICE_KEY);
// Tidak ada: const sb = getSharedSupabaseClient();
```

---

#### 39. No 404 Catch-All Middleware — 🟡 SEDANG

`server/index.js` — Express tidak punya catch-all `app.use((req, res) => notFound(res))`. Unmatched routes → raw Node.js error response, inconsistent with API format.

---

#### 40. No Env Var Validation on Startup — 🟡 SEDANG

Server starts meskipun `SUPABASE_URL` / `SERVICE_KEY` kosong → runtime failures yang tidak terdeteksi saat startup.

**Fix:** Tambah startup checks:

```javascript
if (!process.env.SUPABASE_URL) {
  console.error("FATAL: SUPABASE_URL not set");
  process.exit(1);
}
```

---

#### 41. BigInt Amount Decimal Truncation in Keuangan — 🟡 SEDANG

`Number("1000000.50")` → `1000000.5` → `.replace(/\..*/)` → `1000000` — 50 sen hilang silently. Indonesia menggunakan whole-rupiah tetapi pattern fragile.

---

#### 42. SQL-like Interpolation in inventaris/index.js — 🟡 SEDANG

```javascript
query = query.or(`name.ilike.%${search}%`); // $:search sebagai value — aman
// tapi pattern: column.ilike.%${param}% bisa risky jika underlying lib change
```

---

---

## REKOMENDASI SOLUSI

### 🔴 Priority 1 — HMAC Bypass Fix (Effort: < 1 jam)

**Opsi tunggal — langsung fix:**

1. `server/api/download-pdf.js:92` → ubah dari `console.warn + proceed` ke `return unauthorized`
2. `server/api/generate-pdf.js` → sama pattern, search & fix
3. `server/api/push-send.js` → sama
4. `server/api/send-wa.js` → sama

Verifikasi: `sign-surat-qr.js` — pattern yang benar:

```javascript
if (sig.length === 0) {
  return res.status(401).json({ error: "..." });
}
```

---

### 🔴 Priority 2 — Admin.tsx Code Splitting (Effort: 4-8 jam)

**Opsi A (recommended):** `React.lazy()` per view.
Effort: 4-8 jam. Highest impact bundle reduction.

**Opsi B:** Ekstrak semua view components ke file terpisah.
Effort: 8-16 jam. Cleaner long-term.

---

### 🟠 Priority 3 — CI/CD Pipeline (Effort: 2-4 jam)

Buat `.github/workflows/deploy.yml`. Include: install → lint → build → (optional: Playwright smoke test) → deploy.

---

### 🟠 Priority 4 — VITE_ADMIN_SESSION_SECRET Strip (Effort: 5 menit)

Tambah ke vite.config.ts strip list sama seperti `VITE_DEV_OTP_BYPASS`.

---

### 🟠 Priority 5 — OTP Lockout + NIK Enumeration Fix (Effort: 2-3 jam)

Tambah `failed_attempts` column ke `warga` table. Rate-limit OTP request berdasarkan NIK + IP.

---

### 🟡 Priority 6 — Error Handling Unification

Definisikan Result type pattern, convert Pattern A (silent) → Pattern C (Result).

---

### 🟡 Priority 7 — LetterRenderer sync getSettings fix

Ganti `getSettings()` sync call → Zustand selector dengan loading state.

---

## RENCANA PERBAIKAN (Urut Pengerjaan)

```
Phase 1 — Security (Minggu ini, < 1 hari)
├── Fix HMAC bypass di 4 endpoint          [0.5 jam]
├── Add VITE_ADMIN_SESSION_SECRET strip     [5 menit]
├── Add OTP lockout + enumeration fix       [2 jam]
└── Verify sign-surat-qr.js pattern        [audit]

Phase 2 — Performance (Minggu ini, 1-2 hari)
├── Admin.tsx React.lazy per view           [4-8 jam]
├── Fix LetterRenderer sync call            [1 jam]
├── Fix penduduk-store race condition       [1 jam]
└── Add TTL ke SuratPreviewPanel cache      [1 jam]

Phase 3 — Deployment (1-2 hari)
├── Buat .github/workflows/deploy.yml      [2-4 jam]
├── Resolve CSP header conflict             [1 jam]
└── Fix bun vs npm ambiguity di netlify.toml [30 menit]

Phase 4 — Code Quality (Minggu depan, 2-3 hari)
├── Split useSupabaseSync.ts                [4-6 jam]
├── Extract LetterLayoutEditor sub-components [3-4 jam]
└── Unify error handling pattern            [2-3 jam]

Phase 5 — Long-term (Backlog)
├── Empty GitHub workflows directory        [ongoing]
├── Split ESurat.tsx form wizard           [3-4 jam]
└── Split CMSManager by content type       [2-3 jam]
```

---

## Kesehatan Score Sebelum vs Sesudah

| Metrik                 | Sebelum                    | Target Sesudah     |
| ---------------------- | -------------------------- | ------------------ |
| Security KRITIS        | 2                          | 0                  |
| Bundle Splitting       | 2322-line monolith         | 5 lazy chunks      |
| CI/CD                  | Manual deploy              | Automated pipeline |
| HMAC Endpoint Coverage | 2 of 6 endpoints protected | 6 of 6             |

---

_Report generated by Deep Code Analyst skill — 2026-05-26_
_Scan tools: security-auditor + backend-developer + frontend-developer + Explore agents_
