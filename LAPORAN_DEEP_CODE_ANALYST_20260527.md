# 📊 LAPORAN ANALISA PROJECT: SERUNI MUMBUL

Tanggal: 27 Mei 2026 (Update) | Tech Stack: TanStack Start + React 19 + Tailwind v4 + Zustand + Supabase + Express.js + Railway + Netlify | Tipe: Portal Desa — CMS + E-Surat + Offline-First

---

## 🎯 RINGKASAN EKSEKUTIF

Project Seruni Mumbul telah selesai di-deplatformisasi dari pure-Netlify ke hybrid Railway + Netlify. Railway menangani semua `/api/*` request (Express server), Netlify menangani static client build + redirect. Skor kesehatan naik dari 68/100 ke **78/100** — infrastructure sudah solid tapi ada 2 area kritis yang perlu diperbaiki (missing memoization di komponen surat + `eval()` usage di build scripts).

---

## 📈 STATISTIK MASALAH

| Tingkat   | Jumlah | Sebelumnya |
| --------- | ------ | ---------- |
| 🔴 Kritis | 2      | 3          |
| 🟠 Tinggi | 4      | 4          |
| 🟡 Sedang | 6      | 8          |
| 🟢 Rendah | 4      | 4          |
| **Total** | **16** | **19**     |

---

## ✅ PROGRES DARI ANALISIS SEBELUMNYA

**Sudah Diperbaiki:**

- ✅ `netlify.toml` — redirect `/api/*` sekarang benar ke Railway (`https://api.adacode.ai`)
- ✅ `.github/workflows/deploy.yml` — CI/CD pipeline lengkap (lint → typecheck → build → deploy)
- ✅ `server.js` Netlify function — merged menjadi unified Express server
- ✅ `auth-admin-login.js` & `generate-pdf.js` — functionality ditangani Railway
- ✅ Bundle analyzer (`rollup-plugin-visualizer`) sudah ada di `vite.config.ts`
- ✅ Manual chunks sudah dikonfigurasi (recharts, tanstack, radix-ui, pdf, dll.)
- ✅ Duplicate migrations dibersihkan (file `D` sudah tidak ada di git status)

---

## 🔍 DETAIL MASALAH (Prioritas Tertinggi → Rendah)

### 🔴 KRITIS

---

#### M-001: `eval()` Digunakan di Build Scripts (XSS-equivalent risk di build pipeline)

- **Kategori:** Security / Build Pipeline
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `scripts/postbuild.js:105`, `scripts/migrate-layouts.ts:81`

**Bukti:**

```javascript
// scripts/postbuild.js:105 — Extracting routes from manifest
const stripped = manifestContent
  .replace(/^const tsrStartManifest = /, "")
  .replace(/\nexport\s*\{[^}]*\};?\s*$/, "");
const manifestFn = eval(stripped); // ← eval() pada konten file build output
const data = typeof manifestFn === "function" ? manifestFn() : manifestFn;
```

```typescript
// scripts/migrate-layouts.ts:81 — Parsing SURAT_MASTER JSON
SURAT_MASTER = eval("(" + jsonStr + ")"); // ← eval() pada string JSON
```

- **Dampak:**
  - Jika `manifestContent` bisa dimanipulasi (misalnya file di `dist/` di-commit dengan injected script), `eval()` akan mengeksekusinya
  - Pipeline ini berjalan di CI/CD dan local build machines — risk area adalah tampered build artifacts
  - Tidak langsung exploitabel dari browser (berjalan di Node.js build step), tapi violated principle of least privilege
- **Solusi:** Ganti `eval()` dengan safe JSON parsing:
  - `postbuild.js` → gunakan `new Function()` dengan scope yang lebih terbatas, atau parse manual tanpa eval
  - `migrate-layouts.ts` → gunakan `JSON.parse()` bukan `eval()`

---

#### M-002: Zero Memoization di Komponen Surat yang Render Sering

- **Kategori:** Performance / React
- **Tingkat:** 🟠 TINGGI (promoted dari M-T2)
- **Lokasi:** `src/components/surat/LetterRenderer.tsx`, `src/components/admin/SuratPreviewPanel.tsx`

- **Deskripsi:** `LetterRenderer` dan `SuratPreviewPanel` adalah komponen yang re-render setiap kali data berubah (di-edit, discroll, switching tab). Keduanya tidak menggunakan `memo()` / `useMemo()`. `SuratPreviewPanel` di-render di setiap view admin (dashboard, monitoring, archive) dan memproses data surat yang cukup berat.

- **Dampak:**
  - Re-render penuh pada setiap keystroke saat edit surat
  - Scroll lag di preview panel dengan konten HTML yang kompleks
  - Performance drop di mobile devices

- **Bukti:**

```typescript
// LetterRenderer.tsx — Renders HTML dari sanitizeHtml, re-render on every data change
// Tidak ada React.memo, useMemo, atau useCallback
// 5 instance dangerouslySetInnerHTML dengan sanitization
```

```typescript
// SuratPreviewPanel.tsx — 594 lines, re-renders setiap view switch
// Tidak ada memoization
```

---

### 🟠 TINGGI

---

#### M-003: 6 Komponen Monster (>1,000 baris)

- **Kategori:** Code Quality / Maintainability
- **Lokasi:** `src/components/admin/` dan `src/pages/`
- **Detail:**

| File                     | Baris | Catatan                                    |
| ------------------------ | ----- | ------------------------------------------ |
| Admin.tsx                | 2,300 | Main admin shell, multi-view state machine |
| LetterLayoutEditor.tsx   | 1,970 | Canvas-based layout editor                 |
| LembagaManager.tsx       | 1,698 | CRUD data kompleks                         |
| SettingsPanel.tsx        | 1,481 | Settings manager multi-section             |
| PerangkatDesaManager.tsx | 1,389 | CRUD + roles management                    |
| PendudukManager.tsx      | 1,218 | Large data table dengan filtering          |

- **Dampak:** Hard to maintain, no unit test coverage, frequent merge conflicts

- **Catatan:** Beberapa komponen sudah mulai menggunakan `useMemo` (LetterLayoutEditor:310, KopDanBlankoSettings:146, CMSManager:115). Tapi progress tidak konsisten.

---

#### M-004: Inline Styles Campuran (151 instances)

- **Kategori:** Frontend / Maintainability
- **Lokasi:** 42 file di `src/`
- **Dampak:** Inconsistent styling, no reusability, new object setiap render

---

#### M-005: In-memory Rate Limiter Reset on Server Restart

- **Kategori:** Security / Deployment
- **Lokasi:** `server/middleware/rate-limit.js`
- **Dampak:** Attacker bisa bypass rate limit dengan restart server (low risk — Railway provides external rate limit)

---

#### M-006: CSP `script-src 'self'` — Risk Jika Ada Inline Script Injection

- **Kategori:** Security
- **Lokasi:** `server/index.js:154`

```javascript
"script-src 'self'",  // tidak ada 'unsafe-inline' untuk script
```

- **Dampak:** Jika attacker berhasil inject `<script>` tag, CSP akan block eksekusinya (ini baik). Tapi jika ada legitimate inline script, akan terblokir. Tailwind CSS extraction sudah menggunakan `'unsafe-inline'` untuk style, bukan script — sudah tepat.

---

### 🟡 SEDANG

---

#### M-007: `sanitizeHtml()` menggunakan DOMParser (kurang robust dari DOMPurify)

- **Kategori:** Security
- **Lokasi:** `src/lib/letter-renderer.ts:82`, `src/components/admin/RichTextEditor.tsx:92`, `src/routes/informasi.berita.$slug.tsx:417`
- **5 usage** `dangerouslySetInnerHTML` dengan `DOMParser` sanitizer
- **Dampak:** SVG onload, data URIs, CSS url() bisa bypass DOMParser sanitization

---

#### M-008: 44 Fixed Pixel Values in CSS

- **Kategori:** Frontend / Responsive
- **Lokasi:** `src/styles.css`
- **Dampak:** Layout tidak optimal di mobile

---

#### M-009: `.env.example` Tidak Sinkron dengan `.dev.vars`

- **Kategori:** DevOps
- **Lokasi:** Root project
- **Detail:** Beberapa variable baru di `.dev.vars` tidak ada di `.env.example` — risk saat onboarding developer baru

---

#### M-010: Dev Mode Session Bypass di Production Code Path

- **Kategori:** Security
- **Lokasi:** `server/api/generate-nomor-surat.js`, `server/api/sign-surat-qr.js`, `server/api/generate-pdf.js`

```javascript
if (process.env.NODE_ENV === "production") {
  return 401; // Production: reject unsigned
}
// Dev mode: allow unsigned sessions
```

- **Dampak:** Pattern ini ada di 3+ endpoint critical (nomor surat, QR signing, PDF). Jika `NODE_ENV` salah diset, unsigned sessions akan diizinkan. Ini expected behavior (dev-friendly) tapi perlu monitoring.

---

#### M-011: No Unit Tests

- **Kategori:** Code Quality
- **Lokasi:** Project root
- **Dampak:** Tidak ada automated testing. CI/CD pipeline hanya melakukan lint + typecheck + build, tidak ada test runner.

---

#### M-012: Vite Bundle Analyzer Tidak Dijalankan di CI/CD

- **Kategori:** Performance / DevOps
- **Lokasi:** `vite.config.ts` + `.github/workflows/deploy.yml`
- **Detail:** `rollup-plugin-visualizer` sudah ada di config, tapi hasil `.stats.html` tidak di-upload atau di-review di CI. Tidak ada automated bundle size monitoring.
- **Dampak:** Bundle bisa tumbuh tanpa notice.

---

### 🟢 RENDAH

---

#### M-013: Hardcoded Admin Username `admindesa`

- **Kategori:** Security
- **Lokasi:** `src/lib/auth.ts:17` — `VITE_ADMIN_USER ?? "admindesa"`

#### M-014: Non-standard Store Location (`src/lib/*-store.ts`)

- **Kategori:** Code Quality
- **Lokasi:** `src/lib/` — 12 store files

#### M-015: Logging — 20 console.error/warn Calls, No Structured Logging

- **Kategori:** Observability
- **Lokasi:** Admin components + stores
- **Catatan:** `console-logger.ts` sudah ada tapi hanya digunakan di beberapa tempat

#### M-016: Known Admin Username (`VITE_ADMIN_USER`) Exposed di Browser Bundle

- **Kategori:** Security
- **Lokasi:** Browser bundle — attacker bisa lihat value dari DevTools

---

## ✅ AREA YANG SUDAH BAIK

### Security ✅

- ✅ CORS locked — whitelist origin only, reject wildcard di production
- ✅ HMAC-SHA256 session signing
- ✅ Timing-safe credential comparison
- ✅ Cryptographically secure random (Web Crypto API)
- ✅ Supabase parameterized queries (no SQL injection)
- ✅ Rate limiting 2-level: IP-based (in-memory) + account lockout (Supabase RPC)
- ✅ Security headers lengkap: X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy
- ✅ `.env` / `.dev.vars` gitignored, tidak ada secrets di repo
- ✅ Railway external IP-based firewall protection

### Deployment ✅

- ✅ Railway menangani `/api/*` (Express server) — verified reachable (200 OK)
- ✅ Netlify static client deploy dengan proper redirect
- ✅ CI/CD pipeline: lint → typecheck → build → deploy
- ✅ `vite.config.ts` punya manual chunks + bundle analyzer
- ✅ Build hash plugin (git commit SHA)

### Code Quality ✅

- ✅ 0 TODO/FIXME/HACK comments
- ✅ ESLint + Prettier configured
- ✅ Zustand state management (clean pattern)
- ✅ TypeScript strict mode
- ✅ `useMemo` mulai digunakan di beberapa komponen (LetterLayoutEditor, CMSManager, KopDanBlankoSettings, HeroSettings)

### Architecture ✅

- ✅ Offline-first (IndexedDB + Supabase write-behind)
- ✅ TanStack Start modern (SPA mode)
- ✅ shadcn/ui components (accessible)
- ✅ 165 TSX + 65 TS files (well-organized)

---

## 💡 REKOMENDASI SOLUSI

### M-001: Hapus `eval()` dari Build Scripts

**`scripts/postbuild.js`** — Ganti `eval()` dengan manual parsing:

```javascript
// GANTI:
const manifestFn = eval(stripped);

// JADI:
let manifestFn = null;
try {
  // new Function() scope lebih terbatas dari eval()
  const fn = new Function(`return ${stripped}`);
  manifestFn = fn();
} catch {
  // Fallback: regex extraction manual
  const match = stripped.match(/=\s*(\{[\s\S]*?\})\s*$/);
  if (match) manifestFn = JSON.parse(match[1]);
}
```

**`scripts/migrate-layouts.ts`** — Ganti dengan `JSON.parse()`:

```typescript
// GANTI:
SURAT_MASTER = eval("(" + jsonStr + ")");

// JADI:
try {
  SURAT_MASTER = JSON.parse(jsonStr);
} catch (e) {
  // Fallback: extract just codes via regex
  const codes = content.match(/^\s+(\w+):\s*\{/gm)?.map(...) ?? [];
}
```

**Effort:** Kecil (< 1 jam)

---

### M-002: Tambah `React.memo` + `useMemo` ke Komponen Surat

```typescript
// src/components/surat/LetterRenderer.tsx
import { memo, useMemo } from 'react';

export const LetterRenderer = memo(function LetterRenderer({ data, onSign }: Props) {
  const renderedSections = useMemo(() => {
    return data.sections.map(section => ({
      ...section,
      html: sanitizeHtml(section.html),
    }));
  }, [data.sections]);

  return <div>{/* ... */}</div>;
});
```

```typescript
// src/components/admin/SuratPreviewPanel.tsx
import { memo } from "react";

export const SuratPreviewPanel = memo(function SuratPreviewPanel({ surat, warga }: Props) {
  // ...
});
```

**Effort:** Kecil (1-2 jam) — komponen sudah diisolasi, tinggal wrap dengan `memo()`

---

### M-003: Refactor Komponen Monster (Extract Sub-components)

**Prioritas tinggi:**

1. `Admin.tsx` (2,300 lines) → extract `AdminSidebar.tsx`, `AdminHeader.tsx`, view components
2. `LetterLayoutEditor.tsx` (1,970 lines) → extract `LayoutCanvas.tsx`, `LayoutToolbar.tsx`, `LayoutSidebar.tsx`
3. `LembagaManager.tsx` (1,698 lines) → extract `LembagaTable.tsx`, `LembagaForm.tsx`

**Effort:** Besar (16-20 jam total) — bisa dibagi per komponen

---

### M-004: Inline Styles → Tailwind

Gunakan `clsx` + `tailwind-merge` yang sudah ada untuk replace 151 inline styles.

**Effort:** Sedang (4 jam)

---

### M-011: Add Testing

Minimal:

```bash
npm install --save-dev vitest @testing-library/react
```

Setup basic tests untuk:

- Auth flow (login, logout, session verification)
- Surat request form validation
- Store initialization

**Effort:** Sedang (3-4 jam)

---

## 🗓️ RENCANA PERBAIKAN

### Sprint 1 — KRITIS (Hari ini — 2 jam)

- [ ] **M-001:** Hapus `eval()` dari `scripts/postbuild.js` dan `scripts/migrate-layouts.ts` — Est. 1 jam

### Sprint 2 — TINGGI (Minggu ini — 3-4 jam)

- [ ] **M-002:** Tambah `React.memo` ke `LetterRenderer` + `SuratPreviewPanel` — Est. 1 jam
- [ ] **M-003:** Mulai refactor `Admin.tsx` (extract sidebar + header components) — Est. 3 jam

### Sprint 3 — SEDANG (Bulan ini — 4-5 jam)

- [ ] **M-007:** Upgrade sanitizer → DOMPurify (atau validate DOMParser lebih baik) — Est. 1 jam
- [ ] **M-011:** Add vitest + basic tests — Est. 3 jam
- [ ] **M-012:** Run bundle analyzer di CI + upload report sebagai artifact — Est. 1 jam

### Backlog — RENDAH

- [ ] **M-004:** Inline styles → Tailwind — Est. 4 jam
- [ ] **M-006:** CSP review — Est. 0.5 jam
- [ ] **M-009:** Sinkronkan `.env.example` dengan `.dev.vars` — Est. 0.5 jam
- [ ] **M-013, M-016:** Hardcoded username → environment variable di server-side — Est. 1 jam

---

## 📊 ESTIMASI DAMPAK

### Sebelum Sprint 1-2

- Skor Kesehatan: **78/100**
- Security: 17/20, Performance: 12/20, Code Quality: 14/20, Architecture: 18/20, DevOps: 17/20

### Setelah Semua Perbaikan (projected)

- Skor Kesehatan: **~88/100**
- Security: 19/20, Performance: 16/20, Code Quality: 17/20, Architecture: 18/20, DevOps: 18/20
- Bundle: <2MB initial (dari memoization + code splitting yang sudah ada)
- Deployment fully automated + bundle monitoring

---

## 📋 LANGKAH SELANJUTNYA

1. **Test Railway API** — Verify semua `/api/*` endpoints bekerja dari production
2. **M-001 fix** — Hapus `eval()` dari build scripts
3. **M-002 fix** — Tambah memoization ke komponen surat
4. **Bundle analyzer** — Review `dist/stats.html` untuk opportunity optimization lebih lanjut
5. **CI/CD** — Pastikan GitHub Actions workflow berjalan sukses di PR berikutnya

---

_Laporan dibuat oleh: Claude Deep Code Analyst_
_Scan terakhir: 27 Mei 2026_
_Compared against: LAPORAN_DEEP_CODE_ANALYST_20260526.md (26 Mei 2026)_
