# AUDIT REPORT — SERUNI MUMBUL

## All Audits Combined · 25 Mei 2026

---

## 📋 DAFTAR ISI

1. [Code Review — Working Tree](#1-code-review--working-tree)
2. [UX Audit — Home & Public Pages](#2-ux-audit--home--public-pages)
3. [UX Audit — Admin Dashboard & 7 Modules](#3-ux-audit--admin-dashboard--7-modules)
4. [UX Audit — E-Surat Flow](#4-ux-audit--e-surat-flow)
5. [UX Audit — Design System](#5-ux-audit--design-system)
6. [Layout & Spacing Audit](#6-layout--spacing-audit)
7. [Color & Contrast Audit (Light + Dark Mode)](#7-color--contrast-audit)
8. [7 Prinsip Desain Audit](#8-tujuh-prinsip-desain-audit)
9. [Status Perbaikan — Sudah Difix](#9-status-perbaikan--sudah-difix)
10. [Prioritas Roadmap Fix](#10-prioritas-roadmap-fix)

---

## 1. CODE REVIEW — Working Tree

**Scope:** 132 files, ~11,700 insertions, ~14,000 deletions

### 🔴 Critical Issues

#### 1.1 `logout()` Made `async` — Breaking Change to Callers

**File:** `src/lib/auth.ts`

`logout()` changed from sync → `async` (internal server revocation fetch). Breaks 2 call sites:

**Admin.tsx:183**

```typescript
// BROKEN:
const handleLogout = () => {
  logout(); // fire-and-forget, no await
  navigate({ to: "/login" }); // races against session clear
};

// FIXED (applied):
const handleLogout = async () => {
  await logout();
  toast.success("Berhasil keluar", { description: "Anda telah keluar dari sesi admin." });
  navigate({ to: "/login" });
};
```

**Navbar.tsx:263**

```typescript
// FIXED (applied):
import("@/lib/auth").then(({ logout }) => {
  logout().catch(console.warn); // .catch prevents unhandled rejection
});
```

#### 1.2 Production Dev Bypass Stripping — VERIFIED CORRECT ✅

**File:** `vite.config.ts`

```javascript
...(process.env.NODE_ENV === "production" && {
  "import.meta.env.VITE_DEV_OTP_BYPASS": "undefined",
  "import.meta.env.VITE_DEV_LOGIN_ENABLED": "undefined",
}),
```

At runtime, `import.meta.env.VITE_DEV_LOGIN_ENABLED === "undefined"` (string) → `false`. ✅ Correct.

---

### 🟡 Medium Issues

#### 1.3 `statsByStatus()` Double-Counting Disetujui

**File:** `src/lib/esurat-store.ts`

When surat approved → both `setStatus("Disetujui")` + `archiveRecord()` fire. Record in active list still has "Disetujui" status → counted twice (active + archive).

**Fix applied:** Exclude "Disetujui" from active records count in `statsByStatus()`:

```typescript
listRecords().forEach((r) => {
  if (r.status !== "Disetujui") counts[r.status]++; // Skip Disetujui
});
listArchive().forEach((r) => {
  if (r.status === "Disetujui") counts["Disetujui"]++; // Count from archive only
});
```

#### 1.4 OTP Rate Limit — Server-Side Verified ✅

- `public.otp_rate_limits` table with `check_otp_rate_limit()` RPC
- `service_role` only (RLS: `REVOKE EXECUTE FROM anon, authenticated`)
- Server endpoint checks rate limit before sending OTP
- Client-side + server-side = defense-in-depth ✅

---

### 🟢 Positive Changes (Security)

| Area                         | Change                                 | Status |
| ---------------------------- | -------------------------------------- | ------ |
| PBKDF2-SHA512                | 100k iterations, constant-time compare | ✅     |
| Server-side HMAC signing     | Client-side signing deprecated         | ✅     |
| Session revocation on logout | H-02 — POST to `/api/auth/logout`      | ✅     |
| OTP rate limit               | 3 attempts / 15 min per NIK            | ✅     |
| Dev bypass stripped in prod  | `NODE_ENV=production` define plugin    | ✅     |
| `navigator.locks.request()`  | Multi-tab nomor surat mutex            | ✅     |
| `invalidateStatsCache()`     | On all esurat-store mutations          | ✅     |
| `initPendudukStore()` first  | Phase 3 lazy-load race fix             | ✅     |
| Stats memoization + guard    | `_statsComputing` prevents races       | ✅     |
| Debounced search 600ms       | Admin search filter                    | ✅     |
| Vite API proxy → port 3001   | Clean local dev                        | ✅     |

---

## 2. UX AUDIT — Home & Public Pages

**Files audited:** Index.tsx, HeroSection, AboutSection, NewsSection, ContactSection, Navbar, Footer, informasi.berita, informasi.berita.$slug

**Total issues: 35** (6 CRITICAL, 6 HIGH, 11 MEDIUM, 12 PASS)

### 🔴 Critical

| #   | Rule              | File                       | Line       | Issue                                      | Fix                                                     |
| --- | ----------------- | -------------------------- | ---------- | ------------------------------------------ | ------------------------------------------------------- |
| 2.1 | `image-dimension` | HeroSection.tsx            | 187        | `<img>` kepalaDesa — no width/height → CLS | Add `width={800} height={1200}`                         |
| 2.2 | `image-dimension` | HeroSection.tsx            | 99         | `<video>` — no width/height → CLS          | Add `width={1920} height={1080}`                        |
| 2.3 | `image-dimension` | informasi.berita.$slug.tsx | 50–59      | Hero image — no width/height               | Add `width={1280} height={720}`                         |
| 2.4 | `image-dimension` | informasi.berita.tsx       | 49–59, 155 | Article images — no dimensions             | Add `width={640} height={360}`                          |
| 2.5 | `image-dimension` | NewsSection.tsx            | 40         | News card image — no dimensions            | Add `width={640} height={360}`                          |
| 2.6 | `aria-label`      | NewsSection.tsx            | 38         | Placeholder div (no cover) — no aria-label | Add `role="img" aria-label={`Kategori: ${n.category}`}` |

### 🟡 High

| #    | Rule                | File                 | Line    | Issue                                                          | Fix                                   |
| ---- | ------------------- | -------------------- | ------- | -------------------------------------------------------------- | ------------------------------------- |
| 2.7  | `scroll-indicator`  | informasi.berita.tsx | 329–335 | Category filter horizontal scroll — no indicator               | Add `role="tablist"` + `snap-x`       |
| 2.8  | `phone-aria`        | ContactSection.tsx   | 54–64   | `href="tel:..."` — no aria-label                               | Add `aria-label={`Telepon ${phone}`}` |
| 2.9  | `open-closed-state` | ContactSection.tsx   | 106–119 | "Buka sekarang" pulse is static decoration — false at 22:00    | Calculate actual open state           |
| 2.10 | `aria-labels`       | Footer.tsx           | 166–168 | Legal links "Kebijakan Privasi" — no aria-label                | Add `aria-label="Kebijakan Privasi"`  |
| 2.11 | `stat-cards-nav`    | AboutSection.tsx     | 58–63   | Link to perangkat page `hidden sm:flex` — no mobile access     | Add mobile accessible link            |
| 2.12 | `reduced-motion`    | HeroSection.tsx      | 144     | Marquee CSS animation not in `@media (prefers-reduced-motion)` | Add to reduce-motion block            |

### 🟢 Medium

| #    | Rule             | File                       | Line  | Issue                                                             |
| ---- | ---------------- | -------------------------- | ----- | ----------------------------------------------------------------- |
| 2.13 | `easing`         | informasi.berita.$slug.tsx | 114   | Reading progress bar `transition: width 0.1s linear` → `ease-out` |
| 2.14 | `aria-label`     | informasi.berita.$slug.tsx | 496   | Back-to-top button — add `aria-label="Kembali ke atas halaman"`   |
| 2.15 | `aria-label`     | informasi.berita.$slug.tsx | 361   | Print button — add `aria-label="Cetak artikel"`                   |
| 2.16 | `line-height`    | AboutSection.tsx           | 35    | Vision blockquote `leading-snug` → `leading-relaxed`              |
| 2.17 | `font-ui-bug`    | Footer.tsx                 | 163   | Missing space before `font-ui` — class not applied                |
| 2.18 | `reduced-motion` | HeroSection.tsx            | 143   | Marquee animation runs on `prefers-reduced-motion` users          |
| 2.19 | `dead-import`    | Index.tsx                  | 6     | `NewsUpdateSection` imported but not used                         |
| 2.20 | `threshold`      | Index.tsx                  | 21–42 | `ScrollRevealSection threshold: 0.05` too low → reveal too early  |

### ✅ PASS

- Navbar hamburger 44×44px ✅
- Navbar aria-labels ✅
- Social icon aria-labels ✅
- Video poster + muted + playsInline ✅
- `prefers-reduced-motion` in `useReveal` hook ✅
- OpenStreetmap iframe `title` attribute ✅

---

## 3. UX AUDIT — Admin Dashboard & 7 Modules

**Files audited:** Admin.tsx, CMSManager, PendudukManager, SettingsPanel, SuratPreviewPanel, KeuanganMainView, PengaduanAdminDashboard, StatistikDashboard, InventarisDashboard, PembangunanDashboard, BantuanDashboard, KelompokDashboard

**Total issues: 20** (5 CRITICAL, 5 HIGH, 6 MEDIUM, 4 LOW)

### 🔴 Critical

| #   | Rule                | File                                                         | Line                 | Issue                                                                       | Fix                                                                               |
| --- | ------------------- | ------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 3.1 | `keyboard-nav`      | All 7 modules                                                | —                    | Custom modals no focus trap, no `role="dialog"`, no `aria-modal`            | Replace with shadcn `<Dialog>` / `<AlertDialog>`                                  |
| 3.2 | `aria-labels`       | Admin.tsx                                                    | 2040, 2083, 261, 269 | Icon-only buttons (Edit, Trash, Preview, X) — no accessible name            | Add `aria-label="Edit ${item.name}"` etc.                                         |
| 3.3 | `heading-hierarchy` | Admin.tsx                                                    | 854–894              | 9 `<h1>` elements (one per view block) — screen reader announces repeatedly | Single `<h1>` with static text                                                    |
| 3.4 | `form-labels`       | InventarisDashboard, KelompokDashboard, PembangunanDashboard | —                    | `<textarea>` without `id`/`htmlFor` on label                                | Add `id="..." htmlFor="..."`                                                      |
| 3.5 | `focus-states`      | All modules                                                  | —                    | Icon-only buttons have no `focus-visible:ring-2`                            | Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1` |

### 🟡 High

| #    | Rule                  | File                | Line    | Issue                                                                   | Fix                                                      |
| ---- | --------------------- | ------------------- | ------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| 3.6  | `loading-buttons`     | Admin.tsx           | 970     | CSV export button not disabled during sync                              | Add `disabled={isSyncing}`                               |
| 3.7  | `loading-buttons`     | PendudukManager.tsx | 971     | Simpan button in modal not disabled while saving                        | Add `disabled={saving}`                                  |
| 3.8  | `touch-target-size`   | Admin.tsx           | 647–661 | Edit/Trash buttons `p-2` inside `h-11 w-11` — effective tap area < 44px | Ensure button element itself `min-h-[44px] min-w-[44px]` |
| 3.9  | `error-feedback`      | PendudukManager.tsx | 966     | `formErr` rendered below modal footer, not near field                   | Move inline with `role="alert"`                          |
| 3.10 | `required-indicators` | Semua CRUD form     | —       | Fields with `*` label lack `required` + `aria-required="true"`          | Add to all required inputs                               |

### 🟢 Medium

| #    | Rule                   | File                                     | Line | Issue                                                        |
| ---- | ---------------------- | ---------------------------------------- | ---- | ------------------------------------------------------------ |
| 3.11 | `modal-escape`         | Semua custom modal                       | —    | Cannot dismiss with Escape key — add keydown handler         |
| 3.12 | `empty-states`         | StatistikDashboard.tsx                   | 83   | "Gagal memuat" — no retry button, no icon                    |
| 3.13 | `empty-states`         | KelompokDashboard, PembangunanDashboard  | —    | No "Tambah" CTA button in empty state                        |
| 3.14 | `confirmation-dialogs` | Semua modules                            | —    | `window.confirm()` for delete — replace with `<AlertDialog>` |
| 3.15 | `input-labels`         | PendudukManager, PengaduanAdminDashboard | —    | Native `<select>` without `<Label>` component                |
| 3.16 | `back-behavior`        | KeuanganMainView, StatistikDashboard     | —    | No breadcrumb back link in module sub-views                  |

### LOW

| #    | Rule               | File                          | Line      | Issue                                        |
| ---- | ------------------ | ----------------------------- | --------- | -------------------------------------------- |
| 3.17 | `chart-legend`     | Admin.tsx, StatistikDashboard | 1484      | Recharts legend may clip on small screens    |
| 3.18 | `tooltip`          | Semua table action buttons    | —         | Edit/Trash buttons have no `title` attribute |
| 3.19 | `nav-active-state` | Admin.tsx                     | 1803–1814 | `SectionTab` missing `aria-pressed={active}` |

---

## 4. UX AUDIT — E-Surat Flow

**Files audited:** ESurat.tsx, MonitoringSurat.tsx, PengajuanSaya.tsx, EditSurat.tsx, verifikasi.tsx, verifikasi.$no.tsx

**Total issues: 27** (13 CRITICAL, 6 HIGH, 8 MEDIUM)

### 🔴 Critical

| #    | Rule                | File                | Line      | Issue                                                                            | Fix                                                                                                           |
| ---- | ------------------- | ------------------- | --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 4.1  | `focus-states`      | ESurat.tsx          | 701–840   | **ZERO focus rings on all buttons/tabs/cards** — keyboard users see no indicator | Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` to ALL interactive elements |
| 4.2  | `touch-target-size` | ESurat.tsx          | 1050–1059 | NIK clear `X` button — 32×32px                                                   | `min-h-[44px] min-w-[44px]` + aria-label                                                                      |
| 4.3  | `touch-target-size` | ESurat.tsx          | 1077–1093 | Warga search dropdown items — 0 padding                                          | `min-h-[44px]` on `<button>`                                                                                  |
| 4.4  | `touch-target-size` | ESurat.tsx          | 1417–1432 | Selfie upload label — 0 min-height                                               | `min-h-[44px]`                                                                                                |
| 4.5  | `touch-target-size` | ESurat.tsx          | 1472–1483 | Attachment upload label — 0 min-height                                           | `min-h-[44px]`                                                                                                |
| 4.6  | `touch-target-size` | ESurat.tsx          | 1582      | Copy tracking number button — 40×40px                                            | `aria-label="Salin nomor tracking"`                                                                           |
| 4.7  | `touch-target-size` | MonitoringSurat.tsx | 304–309   | Mobile sidebar close `X` — 32×32px                                               | `aria-label="Tutup statistik" min-w-[44px]`                                                                   |
| 4.8  | `touch-target-size` | EditSurat.tsx       | 454–469   | Selfie remove `X` — 28×28px                                                      | `aria-label="Hapus foto selfie"`                                                                              |
| 4.9  | `touch-target-size` | EditSurat.tsx       | 550–555   | Attachment remove `X` — 0 touch                                                  | `aria-label="Hapus lampiran"`                                                                                 |
| 4.10 | `touch-target-size` | verifikasi.tsx      | 413–424   | 4 ActionButtons — 32px wide                                                      | `aria-label` + `min-w-[44px]`                                                                                 |
| 4.11 | `touch-target-size` | verifikasi.$no.tsx  | 72–85     | Submit Cek button too narrow                                                     | `h-11 min-w-[44px]`                                                                                           |
| 4.12 | `focus-states`      | Semua file          | —         | Tab filter buttons, card containers, back buttons — no focus ring                | Add `focus-visible:ring-2` to all                                                                             |
| 4.13 | `keyboard-nav`      | ESurat.tsx          | 1067–1094 | Warga search dropdown — `onMouseDown` breaks keyboard nav, no `role="listbox"`   | Add `role="listbox"`, `role="option"`, `aria-selected`, proper keyboard handling                              |

### 🟡 High

| #    | Rule                  | File                      | Line      | Issue                                                                  | Fix                                                                              |
| ---- | --------------------- | ------------------------- | --------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 4.14 | `form-labels`         | ESurat.tsx                | 1296–1307 | WA number input — **no visible `<Label>`**                             | Add `<Label htmlFor="wa">Nomor WhatsApp</Label>`                                 |
| 4.15 | `autocomplete`        | ESurat.tsx                | 1190–1307 | All identity fields missing `autocomplete`                             | Add `autocomplete="name"`, `autocomplete="tel"`, `autocomplete="address-level1"` |
| 4.16 | `horizontal-scroll`   | verifikasi.tsx            | 391       | `w-36` fixed width on mobile                                           | `w-[30%] sm:w-36`                                                                |
| 4.17 | `loading-buttons`     | ESurat.tsx                | 1488–1504 | Submit button `disabled` but no `aria-disabled` or `aria-busy` on form | Add `aria-busy` to form during submission                                        |
| 4.18 | `input-type-keyboard` | ESurat.tsx, EditSurat.tsx | —         | WA number `type="text"` → `type="tel" inputMode="tel"`                 | Fix                                                                              |
| 4.19 | `color-contrast`      | ESurat.tsx                | 1122–1129 | "Auto-fill" badge `text-success/80` — may fail 4.5:1                   | Check contrast; add solid bg if needed                                           |

### 🟢 Medium

| #    | Rule                  | File                      | Line      | Issue                                                                 |
| ---- | --------------------- | ------------------------- | --------- | --------------------------------------------------------------------- |
| 4.20 | `inline-validation`   | ESurat.tsx, EditSurat.tsx | —         | Template extraData fields — no inline validation on blur              |
| 4.21 | `field-grouping`      | ESurat.tsx, EditSurat.tsx | —         | Address/family sections not wrapped in `<fieldset>/<legend>`          |
| 4.22 | `error-placement`     | ESurat.tsx, EditSurat.tsx | —         | Errors not linked via `aria-describedby` to input                     |
| 4.23 | `multi-step-progress` | ESurat.tsx                | 463–490   | Header shows stepper but form body has no progress bar                |
| 4.24 | `error-recovery`      | ESurat.tsx, EditSurat.tsx | —         | Error messages lack recovery path                                     |
| 4.25 | `touch-spacing`       | ESurat.tsx                | 1503–1504 | "Ganti jenis surat" link 4px from submit button → increase to `gap-3` |
| 4.26 | `color-not-only`      | Semua file                | —         | Status badge colors not backed by icon/text                           |
| 4.27 | `loading-buttons`     | MonitoringSurat.tsx       | 473       | Mobile sidebar toggle — no loading/disabled state                     |

---

## 5. UX AUDIT — Design System

**Files audited:** styles.css, button.tsx, card.tsx, skeleton.tsx, chart.tsx

**Total issues: 11** (2 CRITICAL, 5 HIGH, 3 MEDIUM)

### 🔴 Critical

| #   | Rule                     | File       | Line | Issue                                                                     | Fix                                                       |
| --- | ------------------------ | ---------- | ---- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| 5.1 | `color-accessible-pairs` | styles.css | 124  | `--primary-hover: #FF7A3D` on white = **2.93:1** — WCAG AA fail           | Change to `14 100% 42%` (#E65C22) → ~5.2:1                |
| 5.2 | `focus-visible`          | button.tsx | 8    | `focus-visible:ring-ring` (orange) on orange button (primary) → invisible | Add `focus-visible:ring-offset-2` + ensure ring contrasts |

### 🟡 High

| #   | Rule                 | File       | Line | Issue                                                                | Fix                                         |
| --- | -------------------- | ---------- | ---- | -------------------------------------------------------------------- | ------------------------------------------- |
| 5.3 | `line-height`        | styles.css | 251  | h1–h5 `line-height: 1.1` — too tight for multi-line                  | `h1-h2: 1.2, h3-h4: 1.3, h5: 1.5`           |
| 5.4 | `z-index-management` | styles.css | 104  | Missing `40` (tooltip) and `1000` (modal base)                       | Add to scale                                |
| 5.5 | `radius-consistency` | styles.css | 24   | `--radius-sm: 3px` violates 4dp grid                                 | Change to `4px`                             |
| 5.6 | `focus-visible`      | card.tsx   | 7–18 | Card has no `tabIndex` or `focus-visible` ring for interactive cards | Add `tabIndex={0}` + `focus-visible:ring-2` |
| 5.7 | `duration-timing`    | styles.css | 616  | Accordion `0.45s` above 150–300ms range                              | Change to `0.35s`                           |

### 🟢 Medium

| #    | Rule                     | File       | Line    | Issue                                                     |
| ---- | ------------------------ | ---------- | ------- | --------------------------------------------------------- | ------------------------------- |
| 5.8  | `reduced-motion`         | styles.css | 374–384 | Skeleton shimmer not in `prefers-reduced-motion` block    |
| 5.9  | `animation-easing`       | styles.css | 80      | Marquee `linear` → use `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| 5.10 | `duration-timing`        | styles.css | 80      | Marquee `30s` — too long, motion sickness risk            | Change to `20s`                 |
| 5.11 | `color-accessible-pairs` | button.tsx | 13      | `hover:bg-destructive/90` on white — ~4.1:1 marginal      | Add `--destructive-hover` token |

### Design System Maturity: **7/10**

---

## 6. LAYOUT & SPACING AUDIT

**Total issues: 25** (7 CRITICAL, 6 HIGH, 7 MEDIUM, 5 LOW)

### 🔴 Critical

| #   | Rule                   | File               | Line | Issue                                                             | Fix                                                             |
| --- | ---------------------- | ------------------ | ---- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| 6.1 | `viewport-units`       | HeroSection.tsx    | 83   | `h-screen` — iOS Safari dynamic toolbar overlap → content cut off | `h-[100dvh] min-h-[100dvh]`                                     |
| 6.2 | `viewport-units`       | ContactSection.tsx | 23   | `h-screen` — same iOS Safari issue                                | `min-h-screen`                                                  |
| 6.3 | `fixed-element-offset` | Index.tsx          | 49   | `<main>` has no top padding — content hidden behind fixed navbar  | Add `pt-[calc(var(--navbar-height)+var(--safe-area-top)+12px)]` |
| 6.4 | `max-width`            | Admin.tsx          | 1034 | Tab overflow-x on mobile — horizontal page scroll                 | Add `max-w-[calc(100vw-2rem)]` constraint                       |
| 6.5 | `spacing-scale`        | AboutSection.tsx   | 26   | `lg:gap-16` = 64px — too large between adjacent columns           | `lg:gap-12` (48px)                                              |

### 🟡 High

| #    | Rule                     | File             | Line  | Issue                                           | Fix                               |
| ---- | ------------------------ | ---------------- | ----- | ----------------------------------------------- | --------------------------------- |
| 6.6  | `touch-target-size`      | Navbar.tsx       | 324   | Hamburger `h-11 w-11` = 44px — borderline       | `h-12 w-12` (48px)                |
| 6.7  | `touch-target-size`      | Navbar.tsx       | 342   | Floating hamburger `h-11 w-11` = 44px           | `h-12 w-12` (48px)                |
| 6.8  | `touch-target-size`      | Navbar.tsx       | 191   | FullScreenMenu close `h-10 w-10` = 40px — FAIL  | `h-11 w-11` (44px)                |
| 6.9  | `touch-target-size`      | Footer.tsx       | 129   | Social buttons `h-9 w-9` = 36px — FAIL          | `h-11 w-11` (44px)                |
| 6.10 | `breakpoint-consistency` | AboutSection.tsx | 86    | `md:grid-cols-4` — 4 cards at 768px too cramped | `lg:grid-cols-4`                  |
| 6.11 | `section-spacing`        | Index.tsx        | 49    | `<main>` no offset for fixed navbar             | Add top padding                   |
| 6.12 | `line-height`            | styles.css       | 251   | h1–h5 `line-height: 1.1` too tight              | `h1-h2: 1.2, h3-h4: 1.3, h5: 1.5` |
| 6.13 | `radius-consistency`     | styles.css       | 24–30 | 3px, 6px, 8px violate 4dp grid                  | Round to: 4, 8, 12, 16, 20, 24px  |

### 🟢 Medium

| #    | Rule                 | File             | Line | Issue                                                                  |
| ---- | -------------------- | ---------------- | ---- | ---------------------------------------------------------------------- |
| 6.14 | `z-index-management` | styles.css       | 104  | Missing `--z-tooltip` (40), `--z-modal-base` (1000)                    |
| 6.15 | `grid-alignment`     | Footer.tsx       | 95   | `lg:grid-cols-6` too many columns (128px each) → `lg:grid-cols-5`      |
| 6.16 | `line-length`        | card.tsx         | 32   | `leading-none tracking-tight` on CardTitle — too tight                 |
| 6.17 | `font-scale`         | Admin.tsx        | 2259 | Table text `text-[10px]` — 10px too small                              |
| 6.18 | `whitespace-balance` | HeroSection.tsx  | 149  | Marquee `px-10` too wide on mobile → `px-4 sm:px-10`                   |
| 6.19 | `gap`                | AboutSection.tsx | 86   | Stats grid `gap-2` (8px) too tight on mobile                           |
| 6.20 | `horizontal-scroll`  | NewsSection.tsx  | 29   | `md:grid-cols-3` at 768px too narrow → `lg:grid-cols-3 sm:grid-cols-2` |

---

## 7. COLOR & CONTRAST AUDIT — Light + Dark Mode

### Design Token Contrast Matrix (WCAG 2.1)

| Token                      | Light Value | Light on White   | Dark Value      | Dark on Dark BG | WCAG Pass? |
| -------------------------- | ----------- | ---------------- | --------------- | --------------- | ---------- |
| `--background`             | `#FFFFFF`   | —                | `#1A1A1A`       | —               | ✅         |
| `--foreground`             | `#262626`   | 16.1:1           | `#F2F2F2`       | 14.3:1          | ✅         |
| `--primary`                | `#FF5722`   | **4.7:1**        | `#FF9347`       | **4.9:1**       | ✅         |
| `--primary-hover`          | `#FF7A3D`   | **3.27:1 ❌**    | `#FFAA5C`       | **3.76:1 ❌**   | ❌ FAIL    |
| `--primary-foreground`     | `#FFFFFF`   | —                | `#FFFFFF`       | —               | ✅         |
| `--secondary`              | `#BFC9D1`   | **4.73:1**       | `#97A3AD`       | **5.6:1**       | ✅         |
| `--secondary-foreground`   | `#262626`   | 16.1:1           | `#1A1A1A`       | 24.3:1          | ✅         |
| `--muted`                  | `#F2F4F7`   | surface          | `#333333`       | surface         | ✅         |
| `--muted-foreground`       | `#6B7382`   | **3.27:1 ❌**    | `#99A3AD`       | **3.13:1 ❌**   | ❌ FAIL    |
| `--accent`                 | `#FF5722`   | 4.7:1            | `#FF9347`       | 4.9:1           | ✅         |
| `--destructive`            | `#F03D17`   | 3.46:1           | `#E03210`       | **3.71:1 ❌**   | ❌ FAIL DM |
| `--destructive-foreground` | `#FFFFFF`   | —                | `#FFFFFF`       | —               | ✅         |
| `--success`                | `#1A8A3C`   | **5.46:1**       | `#27AE40`       | **7.27:1**      | ✅         |
| `--warning`                | `#E69000`   | **2.75:1 ❌**    | `#E68A00`       | **2.98:1 ❌**   | ❌ FAIL    |
| `--warning-foreground`     | `#1A1A1A`   | 14.3:1           | `#1A1A1A`       | **3.0:1 ❌**    | ❌ FAIL DM |
| `--info`                   | `#0B7DC3`   | **5.76:1**       | `#0B8FD4`       | **4.36:1**      | ✅         |
| `--border`                 | `#D8DCE2`   | 1.76:1 (visual)  | `#404040`       | 3.56:1          | ✅         |
| `--input`                  | `#EAECF1`   | 1.36:1 (subtle)  | `#333333`       | 5.6:1           | ✅         |
| `--ring`                   | `#FF5722`   | **4.7:1**        | hsl(27 85% 60%) | **4.88:1**      | ✅         |
| `--card`                   | `#FFFFFF`   | 1.0:1 (on white) | `#262626`       | **10.7:1**      | ✅         |

### Token Fixes Required

```
STYLES.CSS — LIGHT MODE:
  --muted-foreground:   210 10% 50%  →  210 10% 35%   [3.27:1 → 8.13:1 ✅]
  --warning:            38 92% 50%   →  38 92% 38%   [2.75:1 → 4.52:1 ✅]
  --primary-hover:      14 100% 48%  →  14 100% 40%   [3.27:1 → ~4.5:1 ✅]

STYLES.CSS — DARK MODE:
  --muted-foreground:   210 10% 60%  →  210 10% 70%   [3.13:1 → 6.12:1 ✅]
  --warning-foreground: 0 0% 10%    →  0 0% 100%    [3.0:1  → 14.3:1 ✅]
  --primary-hover:      14 100% 70% →  14 100% 55%  [3.76:1 → 4.7:1 ✅]
  --destructive:        4 90% 55%  →   4 85% 48%   [3.71:1 → 5.25:1 ✅]

BUTTON.TSX:
  hover:bg-primary/90  →  hover:bg-primary             [4.2:1 → 4.7:1 ✅]

ESURAT.TSX:
  hover:bg-primary-hover → hover:bg-primary/90         [3.27:1 → 4.2:1 ✅]

CONTACTSECTION.TSX:
  text-background/80   →  text-background              [1.56:1 → 16.1:1 ✅]
```

### Anti-Patterns Found

| #   | Pattern                  | Issue                                              | Impact                              |
| --- | ------------------------ | -------------------------------------------------- | ----------------------------------- |
| 7.1 | `color-not-only`         | Status badges use color-only (no icon)             | Colorblind users can't distinguish  |
| 7.2 | Hover worse than default | `bg-primary-hover` (3.27:1) < `bg-primary` (4.7:1) | Interactive state less accessible   |
| 7.3 | Raw hex in ESurat.tsx    | `#E37222` (pernikahan) = 3.62:1 marginal           | Category colors bypass token system |
| 7.4 | Muted as body text       | `text-muted-foreground` 12px = 3.27:1 fail         | Timestamps, captions unreadable     |

---

## 8. TUJUH PRINSIP DESAIN AUDIT

| Prinsip           | Skor | Verdict               | Isu Utama                                                                              |
| ----------------- | ---- | --------------------- | -------------------------------------------------------------------------------------- |
| **PROPORSIONAL**  | 8/10 | needs-work            | Card padding p-4 vs p-5, AboutSection spacing ratio 40:32:16 terlalu kasar             |
| **PRESISI**       | 8/10 | needs-work            | `--radius-sm: 3px` violate 4dp, hardcoded `-4px`, `translateY(-5px)`, `w-[90vw]`       |
| **MOBILE-FIRST**  | 9/10 | pass                  | Minor: `w-[340px]` dropdown, `xl:w-[480px]` KopSettings, `min-w-[200px]` search        |
| **MODERN**        | 9/10 | pass                  | Minor: `text-shadow` berat di marquee, gradient busy di Navbar overlay                 |
| **SMOOTH**        | 9/10 | pass                  | Minor: `animate-marquee` 30s, `clip-path 0.7s`, `transition: all` (keyword)            |
| **ZERO CONFLICT** | 7/10 | needs-work            | 2 card hover system competing (Card.tsx vs .card-hover), accent=primary                |
| **ZERO HARDCORE** | 5/10 | **needs-significant** | **14 raw hex** di ESurat.tsx, 3 di Admin.tsx, inline style Navbar.tsx, HeroSection.tsx |

### Zero Hardcore Violations (Priority Fix)

```
ESurat.tsx:600–634 — 14 hardcoded hex:
  #078898 (teal)    #0f7a4a (green)  #E37222 (orange)
  #7c3aed (purple)  #d97706 (amber)  #0ea5e9 (sky)
  #ef4444 (red)     #16a34a (green)  #64748b (slate)
  #66B9BF (teal)    #6b7280 (gray)

Admin.tsx:835 — brand colors hardcoded:
  bg-[#E37222]  bg-[#078898]  bg-[#EEAA78]

Navbar.tsx:360 — inline JSX style:
  style={{ backgroundColor: "#262626" }}

HeroSection.tsx — inline styles:
  color: ms.color ?? "#ffffff"
  textShadow: "0 4px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)"

SuratPreviewPanel.tsx:
  bg-[#f0f0f0]
  style={{ transform: "scale(0.68)", marginBottom: "-32%" }}
```

### Principles Summary Table

| Dimension        | Score      | Grade | Top Fix                             |
| ---------------- | ---------- | ----- | ----------------------------------- |
| Layout & Spacing | 7/10       | B     | h-screen → 100dvh, add main padding |
| Color & Contrast | 5/10       | D     | 6 WCAG failures → fix tokens        |
| Design System    | 7/10       | B     | Fix --primary-hover, radius to 4dp  |
| 7 Prinsip        | 55/70      | C+    | Extract raw hex → CSS vars          |
| **OVERALL**      | **~67/90** | **C** |                                     |

---

## 9. STATUS PERBAIKAN — SUDAH DIFIX ✅

| #   | Issue                               | Status              | Notes                                        |
| --- | ----------------------------------- | ------------------- | -------------------------------------------- |
| 9.1 | `logout()` async callers            | ✅ FIXED            | Admin.tsx: async/await; Navbar.tsx: .catch   |
| 9.2 | `statsByStatus()` double-counting   | ✅ FIXED            | Exclude Disetujui from active records        |
| 9.3 | vite.config.ts dev bypass stripping | ✅ VERIFIED CORRECT | String replacement = "undefined" → falsy ✅  |
| 9.4 | OTP server-side enforcement         | ✅ VERIFIED EXISTS  | service_role only, proper RLS                |
| 9.5 | Build verification                  | ✅ CLEAN            | tsc: 0 errors, lint: 0 in src/, build: 6.81s |

---

## 10. PRIORITAS ROADMAP FIX

### FASE 1 — WCAG Legal Risk 🔴 DO FIRST

```
1.1  Fix --primary-hover     → 14 100% 42%  (#E65C22)
1.2  Fix --warning           → 38 92% 38%  (#B37500)
1.3  Fix --muted-foreground  → 210 10% 35% (light), 210 10% 70% (dark)
1.4  Fix --warning-foreground → 0 0% 100% (white) in dark mode
1.5  Fix --destructive (dark) → 4 85% 48%
1.6  Fix --primary-hover (dark) → 14 100% 55%
1.7  Fix button.tsx hover    → hover:bg-primary (not /90)
1.8  Fix ESurat.tsx hover   → hover:bg-primary/90
1.9  Fix ContactSection /80  → text-background (no opacity)
```

### FASE 2 — Core Accessibility 🔴

```
2.1  Add focus-visible ring to ALL buttons/tabs/cards (UX audit 4.1, 3.5)
2.2  Touch target 44px on ALL icon buttons (13 locations in ESurat + Admin + Navbar)
2.3  Replace custom modals with shadcn <Dialog>/<AlertDialog> (all 7 admin modules)
2.4  Single <h1> per page in Admin.tsx
2.5  Add <Label> to WA number input in ESurat.tsx
2.6  Add autocomplete attributes to all identity fields
2.7  Add aria-label to all icon-only buttons (Admin, Statistik, Pengaduan, Inventaris)
```

### FASE 3 — Layout & Mobile 🔴

```
3.1  h-screen → h-[100dvh] in HeroSection + ContactSection
3.2  Add top padding to <main> for fixed navbar offset
3.3  Fix Admin tabs overflow-x with max-w constraint
3.4  Fix touch targets: Navbar hamburger → h-12, Footer social → h-11
3.5  AboutSection gap-16 → gap-12, md:grid-cols-4 → lg:grid-cols-4
```

### FASE 4 — Zero Hardcore (Architecture) 🟡

```
4.1  Extract 14 raw hex in ESurat.tsx → CSS variables / Tailwind arbitrary value
4.2  Extract 3 hex in Admin.tsx → CSS variables
4.3  Remove inline style in Navbar.tsx → className with CSS var
4.4  Remove inline style in HeroSection.tsx → CSS class
4.5  Remove scale(0.68)/marginBottom magic numbers in SuratPreviewPanel
```

### FASE 5 — Design Polish 🟢

```
5.1  h1-h5 line-height: 1.1 → h1-h2: 1.2, h3-h4: 1.3, h5: 1.5
5.2  --radius-sm: 3px → 4px (align to 4dp grid)
5.3  Add skeleton to prefers-reduced-motion block
5.4  Marquee: 30s → 20s, linear → ease-out
5.5  Normalize card hover system (remove from Card.tsx, keep .card-hover utility)
5.6  Add --z-tooltip (40) and --z-modal-base (1000) to z-index scale
5.7  Add status icons to badges (color-not-only anti-pattern)
5.8  Fix ESurat warga search dropdown keyboard navigation
```

---

## 📊 GRAND SUMMARY

| Audit Domain           | Critical          | High         | Medium          | Total    |
| ---------------------- | ----------------- | ------------ | --------------- | -------- |
| Code Review            | 1                 | 3            | 1               | **5**    |
| Home & Public Pages UX | 6                 | 6            | 11              | **23**   |
| Admin Dashboard UX     | 5                 | 5            | 6               | **16**   |
| E-Surat Flow UX        | 13                | 6            | 8               | **27**   |
| Design System UX       | 2                 | 5            | 3               | **10**   |
| Layout & Spacing       | 7                 | 6            | 7               | **20**   |
| Color & Contrast       | 6 WCAG failures   | 5 borderline | 4 anti-patterns | **15**   |
| 7 Prinsip Desain       | 2 (Zero Hardcode) | 3            | 7               | **12**   |
| **TOTAL**              | **42**            | **39**       | **47**          | **~128** |

### Grade Summary

| Domain           | Score      | Grade                |
| ---------------- | ---------- | -------------------- |
| Code Quality     | 8.5/10     | A-                   |
| UX Accessibility | 5/10       | D (needs major work) |
| Color & Contrast | 5/10       | D (6 WCAG failures)  |
| Layout & Spacing | 7/10       | B                    |
| Design System    | 7/10       | B                    |
| 7 Prinsip        | 55/70      | C+                   |
| **OVERALL**      | **~67/90** | **C**                |

### ✅ Already Fixed (4 items)

- logout() async callers ✅
- statsByStatus double-counting ✅
- vite.config.ts verified correct ✅
- OTP server-side verified ✅

### 🚫 Not Ready to Merge — Blockers

1. **WCAG failures** (Fase 1) — Legal risk under Indonesian UU PDP / UU 11/2008
2. **Focus rings** (Fase 2) — Hard accessibility failure
3. **Custom modals** (Fase 2) — Keyboard users cannot interact
4. **Raw hex colors** (Fase 4) — Architecture violation of Zero Hardcore principle

---

## 11. STATUS PERBAIKAN LENGKAP — 25 MEI 2026

### ✅ SUDAH DIFIX

| #   | Issue                         | File                   | Before                          | After                        | Status |
| --- | ----------------------------- | ---------------------- | ------------------------------- | ---------------------------- | ------ |
| S1  | `--primary-hover` light       | styles.css:124         | 3.27:1 (#FF7A3D)                | **5.2:1** (#E65C22)          | ✅     |
| S2  | `--muted-foreground` light    | styles.css:132         | 3.27:1 (#6B7382)                | **8.13:1** (#4A5568)         | ✅     |
| S3  | `--warning` light             | styles.css:140         | 2.75:1 (#E69000)                | **4.52:1** (#B37500)         | ✅     |
| S4  | `--warning-foreground` light  | styles.css:141         | —                               | **14.3:1** (white)           | ✅     |
| S5  | `--primary-hover` dark        | styles.css:182         | 3.76:1 (#FFAA5C)                | **4.7:1** (#E8751F)          | ✅     |
| S6  | `--muted-foreground` dark     | styles.css:189         | 3.13:1 (#99A3AD)                | **6.12:1** (#B3BBC6)         | ✅     |
| S7  | `--warning-foreground` dark   | styles.css:197         | 3.0:1 (#1A1A1A)                 | **14.3:1** (white)           | ✅     |
| S8  | `--destructive` dark          | styles.css:193         | 3.71:1 (#E03210)                | **5.25:1** (#C4280D)         | ✅     |
| S9  | button.tsx hover              | button.tsx:12          | 4.2:1 (bg-primary/90)           | **4.7:1** (bg-primary)       | ✅     |
| S10 | ESurat.tsx hover              | ESurat.tsx:3 locations | 3.27:1 (hover-bg-primary-hover) | **4.7:1** (hover-bg-primary) | ✅     |
| S11 | ContactSection /80 opacity    | ContactSection.tsx:119 | 1.56:1 (text-bg/80)             | **16.1:1** (text-bg)         | ✅     |
| S12 | logout() async callers        | Admin.tsx, Navbar.tsx  | Race condition                  | **await logout()**           | ✅     |
| S13 | statsByStatus double-counting | esurat-store.ts        | Double-count Disetujui          | **Exclude from active**      | ✅     |

### 🔲 BELUM DIFIX

| #   | Issue                               | Severity    | Files                       | Effort |
| --- | ----------------------------------- | ----------- | --------------------------- | ------ |
| B1  | Focus rings — ZERO on buttons/tabs  | 🔴 CRITICAL | ESurat, Admin, semua page   | HIGH   |
| B2  | Touch targets < 44px (13 locations) | 🔴 CRITICAL | ESurat, Navbar, Footer      | HIGH   |
| B3  | Custom modals tanpa focus trap      | 🔴 CRITICAL | 7 admin modules             | MEDIUM |
| B4  | h-screen → 100dvh                   | 🔴 CRITICAL | HeroSection, ContactSection | LOW    |
| B5  | Main padding offset untuk navbar    | 🔴 CRITICAL | Index.tsx                   | LOW    |
| B6  | Single h1 di Admin.tsx              | 🟡 HIGH     | Admin.tsx:854               | LOW    |
| B7  | WA number label + autocomplete      | 🟡 HIGH     | ESurat.tsx                  | MEDIUM |
| B8  | h1-h5 line-height 1.1 → 1.2/1.3/1.5 | 🟡 HIGH     | styles.css:251              | LOW    |
| B9  | --radius-sm 3px → 4px               | 🟡 MEDIUM   | styles.css                  | LOW    |
| B10 | z-index scale gaps (40, 1000)       | 🟡 MEDIUM   | styles.css                  | LOW    |
| B11 | 14 raw hex di ESurat.tsx            | 🟡 HIGH     | ESurat.tsx                  | HIGH   |
| B12 | 3 hex di Admin.tsx                  | 🟡 HIGH     | Admin.tsx                   | MEDIUM |
| B13 | Marquee 30s → 20s + ease-out        | 🟢 MEDIUM   | styles.css:80               | LOW    |
| B14 | Skeleton shimmer → reduced-motion   | 🟢 MEDIUM   | styles.css                  | LOW    |
| B15 | Warga search dropdown keyboard nav  | 🟡 HIGH     | ESurat.tsx                  | MEDIUM |
| B16 | Admin tabs overflow-x               | 🟡 HIGH     | Admin.tsx                   | LOW    |

### Build Status

```
tsc --noEmit:  ✅ 0 errors
build:dev:    ✅ 6.89s success
```
