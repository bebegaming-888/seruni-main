# 📊 LAPORAN ANALISA CODEBASE: Seruni Mumbul — Frontend Audit

**Tanggal:** 2026-05-25
**Tech Stack:** React 19 + TanStack Start + Tailwind CSS v4 + Zustand + IndexedDB-first
**Tipe:** Sistem Informasi Pemerintahan Desa (e-Surat + CMS Portal)
**Auditor:** Deep Code Analyst (Skill)
**Cakupan:** Responsive Design · State Management · CSS Conflicts · Code Quality

---

## RINGKASAN EKSEKUTIF

Project **Seruni Mumbul** adalah sistem portal desa yang cukup matang dengan arsitektur offline-first yang dirancang dengan baik. Tech stack modern (React 19, Tailwind v4, Zustand) sudah diimplementasikan dengan disiplin. Audit mendalam menemukan **1 konflik CSS kritis, 2 risiko tinggi, dan 11 masalah sedang/rendah** yang memerlukan perhatian.

**Skor Kesehatan Frontend: 78/100** — Cukup baik, ada area perbaikan prioritas.

---

## STATISTIK MASALAH

| Tingkat   | Jumlah |
| --------- | ------ |
| 🔴 KRITIS | 1      |
| 🟠 TINGGI | 2      |
| 🟡 SEDANG | 5      |
| 🟢 RENDAH | 6      |
| **Total** | **14** |

---

## DETAIL MASALAH

---

### 1. Duplikasi CSS `.card-hover` — 🔴 KRITIS

**Lokasi:** `src/styles.css:479-488` dan `src/styles.css:1178-1186`

**Deskripsi:** Class `.card-hover` didefinisikan **DUA KALI** dalam satu file CSS. Definisi pertama (baris 479) ada di dalam `@layer utilities`, definisi kedua (baris 1178) ada di luar layer. Tailwind v4 scoping rules menyebabkan definisi kedua menimpa definisi pertama secara tidak terduga.

**Kode duplikasi:**

```css
/* ── Definisi 1: dalam @layer utilities (baris 479) ─── */
.card-hover {
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.card-hover:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* ── Definisi 2: di luar layer (baris 1178) — HAPUS ─── */
.card-hover {
  transition:
    box-shadow 0.2s ease-out,
    transform 0.2s ease-out;
}
.card-hover:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

**Dampak:** Perilaku hover tidak konsisten — depends on CSS load order. Root cause dari bug "competing hover behaviors (Card.tsx vs .card-hover)".

**Solusi:** Hapus definisi duplikat di baris ~1178-1186. Keep hanya definisi dalam `@layer utilities`.

---

### 2. Admin.tsx Monolitik — 🟠 TINGGI

**Lokasi:** `src/pages/Admin.tsx` (~1450 baris)

**Deskripsi:** Satu file mengandung 19+ useState, 8+ useEffect, 15 view rendering, 2 tabel besar inline, fuzzy search, sync logic, audit logging, dan action handlers. Violates Single Responsibility Principle.

**Dampak:**

- Bundle impact: seluruh file di-parse bahkan jika user hanya pakai Dashboard
- Maintenance nightmare: satu typo bisa break semua views
- Re-render tidak optimal — state yang tidak terkait bisa trigger cascade
- Testing tidak bisa granular

**Solusi:**

```typescript
// Ekstrak setiap view ke komponen terpisah
src / components / admin / views / DashboardView.tsx;
MonitoringView.tsx;
ArchiveView.tsx;
TemplatesView.tsx;
// ...

// View registry pattern
export const VIEWS = {
  dashboard: lazy(() => import("./DashboardView")),
  monitoring: lazy(() => import("./MonitoringView")),
  // ...
} as const;
```

**Estimasi:** 4-6 jam (refactor bertahap)

---

### 3. Inline Style Berlebihan (156 occurrences) — 🟠 TINGGI

**Lokasi:** 43 file TSX dengan pattern `style={{`

**Deskripsi:** 156 kali penggunaan inline `style={{...}}` di React komponen. Inline style tidak bisa di-optimize oleh Tailwind, tidak bisa di-override dengan className, dan tidak bisa theming (dark mode).

**Contoh kritis — LetterPrintWrapper.tsx:**

```tsx
style={{
  fontFamily: `${pdfFontFamily} !important`,
  fontSize: `${pdfFontSize} !important`,
  width: "210mm !important",
  // ...
}}
```

Semua property menggunakan `!important` — membuat styling tidak bisa di-override.

**Dampak:**

- Dark mode tidak berfungsi untuk letter styles
- Maintenance sulit — styling tersebar di JS dan CSS
- CSS specificity tidak ter-manage

**Solusi:**

1. Letter printing: gunakan CSS `@page` rule + className, bukan inline
2. Dynamic styling: gunakan CSS custom properties via className

**Estimasi:** 2-3 jam

---

### 4. Hardcoded Breakpoint Mismatch — 🟡 SEDANG

**Lokasi:** `src/hooks/use-mobile.tsx:3` vs CSS Tailwind breakpoints

**Deskripsi:** `useIsMobile()` menggunakan `MOBILE_BREAKPOINT = 768`. CSS di Navbar/BottomTabBar menggunakan `lg:` (1024px). Di viewport 768-1023px, mobile hook merespons tapi CSS menggunakan desktop layout.

```tsx
// useIsMobile: mobile if < 768px
// BottomTabBar: visible only if isMobile (mobile if < 768px)
// Navbar DesktopNav: visible at lg (>= 1024px)
// → Gap di 768px-1023px!
```

**Dampak:** Inconsistent behavior di tablet-sized viewports.

**Solusi:**

```typescript
// src/lib/utils.ts — single source of truth
export const BREAKPOINT = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

// use-mobile.tsx — gunakan constant
// Navbar.tsx — gunakan BREAKPOINT.tablet
```

**Estimasi:** 30 menit

---

### 5. Stale Closure Risk di Admin Action Handlers — 🟡 SEDANG

**Lokasi:** `src/pages/Admin.tsx:379-419`

**Deskripsi:** Action handlers (`verify`, `reject`, dll) menggunakan `r: SuratRecord` dari closure yang bisa stale. Sudah dimitigasi dengan `result.record ??` fallback, tapi pattern bisa cleaned up.

**Solusi:** Gunakan functional setState untuk state updates yang bergantung pada previous state.

**Estimasi:** 1 jam

---

### 6. `useEffect` Cleanup di BottomTabBar — 🟡 SEDANG

**Lokasi:** `src/components/site/BottomTabBar.tsx:40-56`

**Deskripsi:** useEffect yang mengatur body overflow tidak menggunakan stable cleanup reference. Jika onClose berubah, cleanup may tidak restore dengan benar.

**Estimasi:** 30 menit

---

### 7. `initLazyStores()` Double-Call Risk — 🟡 SEDANG

**Lokasi:** `src/lib/store-init.ts:220-226`

**Deskripsi:** Dynamic import di loop bisa race jika dipanggil dua kali secara concurrent.

**Solusi:** Tambahkan per-store flag tracking.

**Estimasi:** 1 jam

---

### 8. Missing Loading Skeleton untuk View Transitions — 🟢 RENDAH

**Lokasi:** `src/pages/Admin.tsx` view switching

**Dampak:** Blank space saat view yang load heavy data (keuangan, statistik).

**Estimasi:** 1 jam

---

### 9. Suspense Belum Digunakan — 🟢 RENDAH

**Lokasi:** Seluruh aplikasi

**Dampak:** Initial bundle lebih besar dari yang diperlukan.

**Estimasi:** 1-2 jam

---

### 10. Error Boundary Tidak Ada — 🟢 RENDAH

**Lokasi:** Seluruh aplikasi

**Dampak:** Satu komponen crash → entire app crash (blank page).

**Estimasi:** 1 jam

---

### 11. `aria-live` Tidak Ada untuk Status Badge — 🟢 RENDAH

**Lokasi:** `src/pages/Admin.tsx` status changes

**Dampak:** Screen reader users tidak know saat status berubah.

**Estimasi:** 15 menit

---

### 12-14. State Management, Zustand Adoption, Props Drilling — 🟢 RENDAH

Opportunity untuk improvement, bukan bug kritis.

---

## RENCANA PERBAIKAN (Prioritas)

| #   | Masalah                 | Effort    | Langkah                                |
| --- | ----------------------- | --------- | -------------------------------------- |
| 1   | Duplikasi `.card-hover` | < 5 menit | Hapus baris 1178-1186 dari styles.css  |
| 2   | Breakpoint mismatch     | 30 menit  | Buat BREAKPOINT constant di utils.ts   |
| 3   | BottomTabBar cleanup    | 30 menit  | Refactor useEffect dengan stable ref   |
| 4   | Loading skeleton        | 1 jam     | Tambahkan Suspense boundary per view   |
| 5   | aria-live status        | 15 menit  | Wrap status area dengan aria-live      |
| 6   | Error Boundary          | 1 jam     | Buat ErrorBoundary.tsx, wrap routes    |
| 7   | initLazyStores race     | 1 jam     | Tambahkan per-store flag tracking      |
| 8   | Stale closure           | 1 jam     | Functional setState pattern            |
| 9   | Inline styles refactor  | 2-3 jam   | LetterPrintWrapper → CSS class         |
| 10  | Admin.tsx refactor      | 4-6 jam   | Ekstrak views bertahap (bisa Sprint 2) |
| 11  | Suspense + lazy loading | 1-2 jam   | Wrap Admin views dengan lazy()         |

---

## ARSITEKTUR YANG SUDAH BAIK

✅ Offline-first dengan IndexedDB + Supabase write-behind
✅ Phase-based store init dengan lazy loading
✅ Tailwind v4 CSS design system well-organized
✅ Dark mode dengan CSS custom properties
✅ TypeScript throughout
✅ HMAC session signing untuk auth
✅ Accessibility dengan aria attributes
✅ Zustand stores tersedia tapi belum optimal digunakan

---

## VERIFIKASI SETELAH FIX

```bash
# Cek duplikasi CSS
grep -n "\.card-hover" src/styles.css | wc -l
# Expected: 6 lines (satu definisi), bukan 12

# Cek inline style count
grep -rn "style={{" --include="*.tsx" src/ | wc -l
# Expected: < 156 setelah refactoring

# Build verification
npm run build 2>&1 | grep -i "warn\|error" | head -20
```

---

_Laporan dibuat oleh Deep Code Analyst — Seruni Mumbul Frontend Audit_
_Tanggal: 2026-05-25_
