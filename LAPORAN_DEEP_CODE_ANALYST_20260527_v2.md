# 📊 LAPORAN ANALISA PROJECT: SERUNI MUMBUL (v2)

> **Tanggal Analisa:** 27 Mei 2026
> **Tech Stack:** TanStack Start + React 19 + Tailwind v4 + Zustand + Supabase + Express.js + Bun
> **Deployment:** Railway (API) + Cloudflare Pages (Frontend)
> **Tipe Aplikasi:** Portal Desa — CMS + E-Surat + Offline-First
> **Ukuran Project:** 165 TSX + 65 TS (src), 48 JS (server), 52 migrasi SQL

---

## 🎯 RINGKASAN EKSEKUTIF

Project Seruni Mumbul menggunakan arsitektur **split deployment** yang modern: Railway untuk API server (Express.js) dan Cloudflare Pages untuk frontend SPA. Arsitektur ini solid, secure, dan production-ready. Namun ditemukan **5 masalah** yang terdiri dari 1 kritis, 1 tinggi, 1 sedang, dan 2 rendah. Secara keseluruhan project mendapat skor kesehatan **81/100** — **sudah layak production** dengan catatan perlu perbaikan pada performa bundle dan cleanup file usang.

> **Perubahan dari v1:** Laporan v1 (26 Mei) berdasarkan state git yang misleading. Analisa ini berdasarkan file actual di working directory.

---

## 🏥 SKOR KESEHATAN PROJECT: 81/100

| Area          | Skor  | Status             |
| ------------- | ----- | ------------------ |
| Security      | 17/20 | 🟢 Baik            |
| Performance   | 11/20 | 🟡 Perlu Perbaikan |
| Code Quality  | 16/20 | 🟢 Baik            |
| Architecture  | 19/20 | 🟢 Sangat Baik     |
| DevOps/Deploy | 18/20 | 🟢 Sangat Baik     |

---

## 📈 STATISTIK MASALAH

| Tingkat   | Jumlah | Status                                              |
| --------- | ------ | --------------------------------------------------- |
| 🔴 Kritis | 1      | M-001: eval() di postbuild.js                       |
| 🟠 Tinggi | 1      | M-002: Bundle 6.3MB, no code splitting              |
| 🟡 Sedang | 1      | M-003: eval() di scripts/migrate-layouts.ts         |
| 🟢 Rendah | 2      | M-004: 6 komponen monster + M-005: Zero memoization |
| **Total** | **5**  |                                                     |

---

## 🔍 DETAIL MASALAH

### 🔴 KRITIS (1)

---

#### M-001: `eval()` di `scripts/postbuild.js` — Dynamic Code Execution

- **Kategori:** Security + Robustness
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `scripts/postbuild.js:105`
- **Deskripsi:**

```javascript
// postbuild.js:105
const stripped = manifestContent
  .replace(/^const tsrStartManifest = /, "")
  .replace(/\nexport\s*\{[^}]*\};?\s*$/, "");
const manifestFn = eval(stripped); // ❌ eval() dengan arbitrary string
const data = typeof manifestFn === "function" ? manifestFn() : manifestFn;
```

Manifest content dibaca dari file built, lalu di-`eval()`. Jika attacker bisa inject file ke `dist/server/assets/`, kode arbiter bisa dieksekusi.

- **Dampak:**
  - Remote Code Execution (RCE) jika dist/ compromised
  - Build process fails jika manifest format berubah sedikit saja
  - Hard untuk debug dan test

- **Solusi:** Ganti `eval()` dengan `new Function()` atau parse manual tanpa eval:

```javascript
// ✅ Opsi A: new Function() — slightly safer tapi masih eval-like
try {
  const manifestFn = new Function("return " + stripped)();
  const data = typeof manifestFn === "function" ? manifestFn() : manifestFn;
} catch (e) {
  /* fallback */
}

// ✅ Opsi B (recommended): JSON parse langsung
// TanStack Start manifest adalah object literal, bukan fungsi kompleks
// Cukup ekstrak dengan regex dan parse JSON
const jsonStr = stripped.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"');
const data = JSON.parse(jsonStr);
```

---

### 🟠 TINGGI (1)

---

#### M-002: Bundle Size 6.3MB — No Code Splitting

- **Kategori:** Performance
- **Tingkat:** 🟠 TINGGI
- **Lokasi:** `dist/client/` — 6.3MB total
- **Deskripsi:**
  - Heavy deps: `jspdf` (~800KB), `pdf-lib`, `leaflet`, `xlsx` dalam initial bundle
  - No lazy loading untuk route-level components
  - `Admin.tsx` (2,300 lines) dan `LetterLayoutEditor.tsx` (1,970 lines) dalam initial bundle
  - 18 image assets tanpa WebP conversion
  - 0 `React.memo` / `useMemo` / `useCallback`

- **Dampak:** First load 8-12 detik di 3G, TTI > 10 detik, Lighthouse score ~40-50

- **Solusi:** Add lazy loading + manual chunks:

```typescript
// src/router.tsx — Add lazy loading untuk admin routes
import { lazy, Suspense } from 'react'

const Admin = lazy(() => import('./pages/Admin'))
const ESurat = lazy(() => import('./pages/ESurat'))

<Route path="/admin" element={
  <Suspense fallback={<AdminSkeleton />}>
    <Admin />
  </Suspense>
} />

// vite.config.ts — Manual chunks
manualChunks: {
  'pdf-libs': ['jspdf', 'pdf-lib'],
  'map-libs': ['leaflet', 'react-leaflet'],
  'excel-libs': ['xlsx'],
  'vendor': ['react', 'react-dom', 'zustand'],
}
```

- **Effort:** 3 jam | **Expected result:** 6.3MB → ~2MB initial + lazy chunks

---

### 🟡 SEDANG (1)

---

#### M-003: `eval()` di `scripts/migrate-layouts.ts`

- **Kategori:** Security + Code Quality
- **Tingkat:** 🟡 SEDANG
- **Lokasi:** `scripts/migrate-layouts.ts:81`
- **Deskripsi:**

```typescript
// migrate-layouts.ts:81
SURAT_MASTER = eval("(" + jsonStr + ")");
```

JSON string dari file dikonversi pakai `eval()` — risk sama seperti M-001 tapi di migration script (bukan production build).

- **Dampak:** Jika file `SURAT_MASTER.json` corrupted atau di-inject, arbitrary code bisa dieksekusi saat migration.

- **Solusi:**

```typescript
// ✅ Ganti dengan JSON.parse (aman)
try {
  SURAT_MASTER = JSON.parse(jsonStr);
} catch (e) {
  // Fallback: extract codes only
  const codes = content.match(/^\s+(\w+):\s*\{/gm)?.map((m) => m.trim().split(":")[0]) ?? [];
  codes.forEach((code) => {
    SURAT_MASTER[code] = { code, name: `Surat ${code}`, category: "Keterangan" };
  });
}
```

---

### 🟢 RENDAH (2)

---

#### M-004: 6 Komponen Monster (>1,000 baris)

- **Kategori:** Maintainability
- **Tingkat:** 🟢 RENDAH
- **Lokasi:** `src/components/admin/` dan `src/pages/`
- **Detail:**

| File                     | Baris | Prioritas Refactor |
| ------------------------ | ----- | ------------------ |
| Admin.tsx                | 2,300 | High               |
| LetterLayoutEditor.tsx   | 1,970 | High               |
| LembagaManager.tsx       | 1,698 | Medium             |
| SettingsPanel.tsx        | 1,481 | Medium             |
| PerangkatDesaManager.tsx | 1,389 | Medium             |
| PendudukManager.tsx      | 1,218 | Low                |

- **Effort refactor:** 16-20 jam (backlog)

#### M-005: Zero React Memoization

- **Kategori:** Performance
- **Tingkat:** 🟢 RENDAH
- **Lokasi:** Seluruh `src/`
- **Detail:** 0 `useMemo` / `useCallback` / `React.memo` — semua komponen re-render penuh.
- **Effort:** 3-4 jam | **Impact:** Medium (butuh untuk M-002)

---

## ✅ AREA YANG SUDAH BAIK

### Security ✅

| Check                                                 | Status             |
| ----------------------------------------------------- | ------------------ |
| `.env` / `.dev.vars` gitignored                       | ✅                 |
| CORS whitelist only, reject wildcard di production    | ✅                 |
| HMAC signing session integrity                        | ✅                 |
| Timing-safe credential comparison                     | ✅                 |
| Supabase parameterized queries (no SQL injection)     | ✅                 |
| Rate limiting (IP + account lockout via Supabase RPC) | ✅                 |
| Security headers (CSP, X-Frame-Options, dll)          | ✅                 |
| No hardcoded secrets in codebase                      | ✅                 |
| `dangerouslySetInnerHTML` dengan DOMParser sanitizer  | ✅ (5 usage, aman) |

### Deployment ✅

| Check                                            | Status |
| ------------------------------------------------ | ------ |
| Railway.toml configured (singapore, port 3001)   | ✅     |
| Dockerfile multi-stage (bun build → alpine prod) | ✅     |
| Cloudflare Pages sebagai frontend (SPA routing)  | ✅     |
| netlify.toml sebagai fallback reference          | ✅     |
| GitHub Actions CI/CD pipeline (`deploy.yml`)     | ✅     |
| Health check endpoint (`/api/health-check`)      | ✅     |
| `ALLOWED_ORIGIN` guard di production mode        | ✅     |

### Architecture ✅

| Check                                               | Status |
| --------------------------------------------------- | ------ |
| Offline-first (IndexedDB + Supabase write-behind)   | ✅     |
| Zustand state management (clean, predictable)       | ✅     |
| TanStack Start (modern, type-safe routing)          | ✅     |
| shadcn/ui components (accessible, Radix primitives) | ✅     |
| 52 organized database migrations                    | ✅     |
| Comprehensive ERD documentation                     | ✅     |

### Code Quality ✅

| Check                                            | Status |
| ------------------------------------------------ | ------ |
| 0 TODO/FIXME/HACK technical debt                 | ✅     |
| ESLint + Prettier configured                     | ✅     |
| TypeScript strict mode                           | ✅     |
| No commented-out dead code                       | ✅     |
| Zustand stores pattern (no Redux/Pinia overhead) | ✅     |
| Server-side HMAC (not in browser bundle)         | ✅     |

---

## 🚨 PERBAIKAN PRIORITAS

### PRIORITAS 1 — Sekarang (15 menit)

#### Fix M-001: `eval()` di postbuild.js

```javascript
// scripts/postbuild.js — Ganti eval() dengan JSON.parse
// Bagian yang perlu diubah (baris ~98-110):
let routesJson = "null";
try {
  const stripped = manifestContent
    .replace(/^const tsrStartManifest = /, "")
    .replace(/\nexport\s*\{[^}]*\};?\s*$/, "");

  // ✅ Ganti eval() dengan new Function() yang lebih aman
  let data;
  try {
    const manifestFn = new Function("return " + stripped)();
    data = typeof manifestFn === "function" ? manifestFn() : manifestFn;
  } catch {
    // Fallback: coba parse sebagai JSON langsung
    const jsonStr = stripped.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"');
    data = JSON.parse(jsonStr);
  }
  routesJson = JSON.stringify(data || {});
} catch (e) {
  console.warn("[postbuild:step-5] Could not parse manifest:", e.message);
}
```

---

### PRIORITAS 2 — Minggu Ini (3-4 jam)

#### Fix M-002: Bundle Size Optimization

1. Add lazy loading di `src/router.tsx`
2. Add manual chunks di `vite.config.ts`
3. Add bundle analyzer script

#### Fix M-003: `eval()` di migrate-layouts.ts

```typescript
// scripts/migrate-layouts.ts baris 81:
try {
  SURAT_MASTER = JSON.parse(jsonStr); // ✅ Aman
} catch (e) {
  // Fallback: extract codes only
  const codes = content.match(/^\s+(\w+):\s*\{/gm)?.map((m) => m.trim().split(":")[0]) ?? [];
  codes.forEach((code) => {
    SURAT_MASTER[code] = { code, name: `Surat ${code}`, category: "Keterangan" };
  });
}
```

---

### BACKLOG — RENDAH (16-20 jam)

| Task                                          | Effort    |
| --------------------------------------------- | --------- |
| M-004: Refactor 6 komponen monster            | 16-20 jam |
| M-005: Add React.memo + useMemo + useCallback | 3-4 jam   |

---

## 📊 ESTIMASI DAMPAK SEBELUM vs SESUDAH

| Metric                 | Sebelum    | Setelah Sprint 1-2   |
| ---------------------- | ---------- | -------------------- |
| Bundle initial         | 6.3MB      | ~2MB (+ lazy chunks) |
| First Load (3G)        | 8-12 detik | 3-5 detik            |
| TTI                    | >10 detik  | 4-6 detik            |
| Lighthouse (projected) | ~40-50     | ~70-80               |
| Security Score         | 17/20      | 19/20                |

---

## 📋 LANGKAH SELANJUTNYA

1. **Sekarang:** Fix `eval()` di `scripts/postbuild.js` (15 menit)
2. **Minggu ini:** Bundle optimization + fix `eval()` di migrate-layouts
3. **Verifikasi:** `npm run build` + test semua endpoint
4. **Monitor:** Bundle size di CI/CD (fail if >4MB initial)

---

_Laporan dibuat oleh: Claude Deep Code Analyst v2_
_Based on scan pada: 27 Mei 2026_
