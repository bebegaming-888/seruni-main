# Frontend Audit Report — Desa Seruni Mumbul

> Generated: 2026-05-25
> Scope: d:/seruni-mumbul/src
> Version: Without Skill — Claude Sonnet 4.6

---

## Summary

| Category          | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Info | Total  |
| ----------------- | ----------- | ------- | --------- | ------- | ------ |
| Responsive Design | 2           | 3       | 4         | 3       | 12     |
| State Management  | 1           | 2       | 5         | 4       | 12     |
| CSS / Styling     | 1           | 2       | 2         | 3       | 8      |
| **Total**         | **4**       | **7**   | **11**    | **10**  | **32** |

---

## 1. RESPONSIVE DESIGN ISSUES

### 🔴 R-1: Search Input Fixed Width Breaks Mobile — Admin.tsx:1954

**Severity:** 🔴 Critical
**File:** `src/pages/Admin.tsx`, line 1954

```tsx
<Input
  placeholder="Cari no/NIK/nama…"
  value={q}
  onChange={(e) => setQ(e.target.value)}
  className="pl-9 w-64 rounded-full" // ← HARDCODED 256px
/>
```

**Problem:** Fixed `w-64` (256px) does not adapt on small screens. On 375px mobile viewport, input overflows or gets cropped in the monitoring table's flex-wrap layout.

**Impact:** On mobile monitoring view, the search box pushes action buttons below the fold or clips text.

**Recommended Fix:**

```tsx
className = "pl-9 w-full sm:w-64 rounded-full";
```

---

### 🔴 R-2: Two-column Layout Not Wrapping Properly — Admin.tsx:1632

**Severity:** 🔴 Critical
**File:** `src/pages/Admin.tsx`, line ~1632

```tsx
<div className="flex items-start justify-between gap-4 flex-wrap">
  <div className="min-w-0 flex-1">
  </div>
  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
    {/* action buttons right */}
```

**Problem:** `flex-wrap` causes button overflow on very narrow screens (320–375px). Long Indonesian button text ("Verifikasi", "Lanjut Approval", "Approve & TTD") can exceed the container width.

**Recommended Fix:** Use a `<ScrollArea>` wrapper for the button group, or add `overflow-hidden` to constrain.

---

### 🟠 R-3: Responsive Breakpoint Gap — Navbar.tsx:39

**Severity:** 🟠 High
**File:** `src/components/site/Navbar.tsx`, line 39

```tsx
<div className="hidden lg:flex items-center gap-1.5">
```

**Problem:** `hidden lg:flex` hides desktop nav at `lg` (1024px) and above. On tablet sizes (768–1024px) the mobile hamburger is also not reliably shown. Tablet users in the 768–1024px range may see no navigation.

**Recommended Fix:** Add `md:` breakpoint menu or ensure the mobile hamburger covers the gap with `md:hidden lg:block`.

---

### 🟠 R-4: Viewport Meta Inconsistency — \_\_root.tsx vs public/index.html

**Severity:** 🟠 High
**Files:** `src/routes/__root.tsx`, line 115; `public/index.html`, line 5

```tsx
// __root.tsx
{ name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" }
// public/index.html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Problem:** `maximum-scale=5` in `__root.tsx` restricts user zoom and conflicts with WCAG accessibility guidelines. The static HTML uses `initial-scale=1.0` without `maximum-scale`, causing different zoom behavior in dev vs production.

**Recommended Fix:** Standardize to `maximum-scale=1` or remove the viewport override from `__root.tsx` and rely only on the static HTML meta tag.

---

### 🟡 R-5: Safe Area Inline Styles — BottomTabBar.tsx:243–246

**Severity:** 🟡 Medium
**File:** `src/components/site/BottomTabBar.tsx`, lines 243–246

```tsx
style={{
  height: "calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px))",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
}}
```

**Problem:** Safe area insets via `style` attribute work on modern devices but should be CSS class-based. The fallback value `0px` for `env()` may not work correctly on older browsers.

**Recommended Fix:** Use `className="pb-[env(safe-area-inset-bottom)]"` for padding, keep only height in inline style.

---

### 🟡 R-6: MonitoringTable Search Layout — Admin.tsx:1948

**Severity:** 🟡 Medium
**File:** `src/pages/Admin.tsx`, lines ~1948–1956

**Problem:** Title and search box stack on small screens via `flex flex-wrap`. The fixed `w-64` compounds issue R-1. Behavior may be inconsistent depending on parent context.

**Recommended Fix:** Use `flex-col sm:flex-row` for proper stacking at `sm` breakpoint.

---

### 🟡 R-7: Nav Overlay Font Size — BottomTabBar.tsx:120

**Severity:** 🟡 Medium
**File:** `src/components/site/BottomTabBar.tsx`, line ~120

```tsx
<span className="nav-overlay-link nav-overlay-link-text font-display text-2xl font-bold ...">
```

**Problem:** `text-2xl` (1.5rem = 24px) on nav links may cause layout shift on 320px screens, contributing to CLS score.

**Recommended Fix:** Use `text-xl sm:text-2xl` to reduce layout shift on small screens.

---

### 🟢 R-8: Missing Responsive Breakpoints in MonitoringTable

**Severity:** 🟢 Info
**File:** `src/pages/Admin.tsx`, line ~1890

The `flex flex-wrap` could benefit from explicit `sm:`, `md:` overrides for tighter layouts.

---

### 🟢 R-9: Font Size Scaling — styles.css

**Severity:** 🟢 Info
**File:** `src/styles.css`

Font sizing is properly rem-based throughout. No px-based font sizing found.

---

### 🟢 R-10: HeroSection Responsive — HeroSection.tsx

**Severity:** 🟢 Info
**File:** `src/components/sections/HeroSection.tsx`

Hero section handles video fallback images correctly. No major responsive issues found.

---

## 2. STATE MANAGEMENT ISSUES

### 🔴 S-1: Admin.tsx — 2,319 Lines Monolithic Component

**Severity:** 🔴 Critical
**File:** `src/pages/Admin.tsx` (2,319 lines)

**Problem:** Single 2,319-line monolithic file with no sub-components extracted. Contains:

- 10+ state variables (`records`, `archive`, `preview`, `tab`, `q`, `searchQuery`, `isSyncing`, `connectionStatus`, `pendingActions`)
- 4 inline sub-components (`StatusPill`, `fmtRelative`, `MonitoringTable`, dashboard/monitoring/archive filters)
- Fuzzy search logic, async action handlers (`verify`, `reject`, `approve`, `handleCloudSync`)
- CSV import logic (150+ lines)
- JSX layout for 7+ distinct views

**Why Critical:** Every developer must read all 2,319 lines to make changes. React cannot skip re-rendering unchanged sub-trees. No code splitting. Merge conflicts are nearly guaranteed in collaborative work.

**Recommended Fix:** Extract into `src/components/admin/`:

- `DashboardView.tsx` — stat cards + chart + queue
- `MonitoringView.tsx` — extracted MonitoringTable
- `ArchiveView.tsx` — archive cards
- `AdminTableRow.tsx` — single record card with actions
- `AdminStatsBar.tsx` — counts + tabs filter
- `hooks/admin/useAdminFilters.ts` — fuzzy search + tab filtering
- `hooks/admin/useAdminActions.ts` — verify/reject/approve handlers

---

### 🟠 S-2: useEffect Missing Dependency + Race Condition — ESurat.tsx:153–167

**Severity:** 🟠 High
**File:** `src/pages/ESurat.tsx`, lines 153–167

```tsx
useEffect(() => {
  const session = getWargaSession();
  if (session?.warga?.nik) {
    setNik(session.warga.nik);
    setTimeout(async () => {
      const found = await lookupPenduduk(session.warga.nik);
      if (found) {
        setPenduduk(found);
        setContactWa(found.no_hp ?? "");
        setSelectedWarga(found);
      }
    }, 150);
  }
}, []); // ← Empty deps, reads session.warga.nik
```

**Problem:** Empty dependency array reads `session.warga.nik` which can change. If a user logs out and a different user logs in, the form won't update. The 150ms setTimeout is a race condition — if the component unmounts before it resolves, state updates on an unmounted component.

**Recommended Fix:**

```tsx
useEffect(() => {
  const session = getWargaSession();
  if (!session?.warga?.nik) return;
  let cancelled = false;
  setNik(session.warga.nik);
  lookupPenduduk(session.warga.nik).then((found) => {
    if (cancelled) return;
    if (found) {
      setPenduduk(found);
      setContactWa(found.no_hp ?? "");
      setSelectedWarga(found);
    }
  });
  return () => {
    cancelled = true;
  };
}, []);
```

---

### 🟠 S-3: SettingsPanel — Duplicate State (Zustand + useState) Without Merge Strategy

**Severity:** 🟠 High
**File:** `src/components/admin/SettingsPanel.tsx`, lines 154–203

```tsx
const [s, setS] = useState<SystemSettings>(storeSettings);
const [dirty, setDirty] = useState(false);
const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
const [conflictStatus, setConflictStatus] = useState<ConflictStatus>("none");
const storeVersionRef = useRef<string>("");
const isSyncingRef = useRef(false);
const saveStatusTimerRef = useRef<number | null>(null);
```

**Problem:** SettingsPanel manages a local copy of Zustand state AND the global Zustand store. If the store updates externally (multi-tab sync), the user may lose unsaved local changes — resolved only by a 10-second toast action button that users may miss.

**Recommended Fix:** Implement a three-way diff for conflicting fields, auto-merge non-conflicting fields, and add per-field "Keep Mine / Use Theirs / Merge" choices.

---

### 🟡 S-4: Timer Not Cleared on SettingsPanel Unmount — SettingsPanel.tsx:286

**Severity:** 🟡 Medium
**File:** `src/components/admin/SettingsPanel.tsx`, line 286

```tsx
saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
```

**Problem:** When `saveStatusTimerRef.current` is reassigned without clearing the old timer, multiple saves create multiple timers. Old timers fire and reset the save status to "idle" prematurely while the user is still seeing a success message.

**Recommended Fix:**

```tsx
if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
useEffect(() => {
  return () => {
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
  };
}, []);
```

---

### 🟡 S-5: ESurat.tsx — 7 State Setters in Single Callback

**Severity:** 🟡 Medium
**File:** `src/pages/ESurat.tsx`, lines 191–243

```tsx
const handleNikChange = useCallback((val: string) => {
  setNik(digits);
  setNikError(null);
  setSelectedWarga(null);
  setPenduduk(null);
  setWargaResults([]);
  setShowDropdown(false);
  // ... 7 state setters, no abstraction
}, []);
```

**Problem:** Manipulates 7 state variables with no intermediate abstraction. Testing requires mocking 7 state variables.

**Recommended Fix:** Extract a `useNikForm` custom hook.

---

### 🟡 S-6: Admin.tsx — Two Independent useEffect([], fn) Blocks Fire on Mount

**Severity:** 🟡 Medium
**File:** `src/pages/Admin.tsx`, lines 268, 271

```tsx
useEffect(refresh, []);
useEffect(() => {
  healthCheck()
    .then((ok) => {
      setConnectionStatus(ok);
    })
    .catch(() => {
      setConnectionStatus(false);
    });
}, []);
```

**Problem:** Two independent mount effects with no coordination. `healthCheck` may resolve before `refresh`, showing "connected" while data is not yet ready.

**Recommended Fix:** Combine into a single init effect with coordinated loading states.

---

### 🟡 S-7: Zustand Direct .getState() in Event Handlers

**Severity:** 🟡 Medium
**Files:** `src/lib/settings-store.ts` lines 218, 231; `src/lib/hero-config-store.ts` line 171

```tsx
const updated = useSettings.getState();
setS(updated);
```

**Problem:** `useSettings.getState()` bypasses the React rendering cycle — it updates Zustand state without triggering a React re-render. The result is manually synced back via `setS(updated)`. This breaks unidirectional data flow.

**Recommended Fix:** Use a Zustand action instead of direct `getState()` in event callbacks.

---

### 🟢 S-8: Zustand Store — Good Offline-first Pattern

**Severity:** 🟢 Info
**Files:** `src/lib/esurat-store.ts`, `src/lib/penduduk-store.ts`

Zustand stores correctly implement IndexedDB-first, Supabase-write-behind pattern. No issues found.

---

### 🟢 S-9: HeroSection — Clean Selector Pattern

**Severity:** 🟢 Info
**File:** `src/components/sections/HeroSection.tsx`, line 35

```tsx
const config = useHeroConfig((s) => s.config);
```

Good use of selector function to prevent unnecessary re-renders via shallow equality.

---

### 🟢 S-10: BottomTabBar — Correct Hooks Order Before Early Return

**Severity:** 🟢 Info
**File:** `src/components/site/BottomTabBar.tsx`, lines 210–218

Hooks are called BEFORE the early return — follows Rules of Hooks correctly. Well done.

---

### 🟢 S-11: useMemo Used Correctly

**Severity:** 🟢 Info
**Files:** `Admin.tsx` lines 296, 319, 345; `ESurat.tsx` lines 255–258

All `useMemo` calls for filtered/sorted data have correct dependency arrays.

---

## 3. CSS CONFLICTS & STYLING ISSUES

### 🔴 C-1: Global CSS !important Override for Reduced Motion — styles.css:1018–1055

**Severity:** 🔴 Critical
**File:** `src/styles.css`, lines 1018–1055

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none !important;
  }
  .animate-shimmer {
    animation: none !important;
  }
  .reveal,
  .reveal-scale {
    transition: none !important;
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  /* ... 10+ !important blocks */
}
```

**Problem:** 10+ `!important` declarations override ALL Tailwind animation utilities for `prefers-reduced-motion: reduce` users. Tailwind generates utility classes with high specificity — these `!important` blocks may unexpectedly override legitimate Tailwind animations (e.g., `animate-pulse` loading indicators in shadcn/ui components).

**Recommended Fix:** Use `@layer base` specificity instead of `!important`:

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
  .reveal,
  .reveal-scale {
    transition: none;
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

### 🟠 C-2: Duplicate Keyframe — shimmer Animation Conflict

**Severity:** 🟠 High
**File:** `src/styles.css`, lines 14, 450–455

```css
@import "tw-animate-css"; /* imports Tailwind animations */
.skeleton {
  animation: shimmer 1.5s ease-in-out infinite;
} /* custom shimmer */
```

**Problem:** `tw-animate-css` defines `@keyframes shimmer` globally. `styles.css` also defines `shimmer`. Depending on import order, one overrides the other. Risk of cascade conflicts between `.skeleton` styling in both files.

**Recommended Fix:** Move skeleton shimmer to `@layer components` with a namespaced keyframe name (e.g., `skeleton-shimmer`) and avoid importing `animate-shimmer` from tw-animate-css.

---

### 🟠 C-3: Shadow Class Override Conflict — styles.css:380–426

**Severity:** 🟠 High
**File:** `src/styles.css`, lines 380–426

```css
.shadow-card {
  box-shadow: var(--shadow-card);
}
.shadow-elevated {
  box-shadow: var(--shadow-elevated);
}
```

**Problem:** Custom `shadow-card` and `shadow-elevated` defined in `styles.css` may conflict with Tailwind's built-in `.shadow-sm`, `.shadow-md`, `.shadow-lg` classes. Cascade order may be unpredictable when both are used.

**Recommended Fix:** Ensure these are defined within `@layer components` to get proper precedence over Tailwind utilities.

---

### 🟡 C-4: Global :focus-visible Override — styles.css:312–319

**Severity:** 🟡 Medium
**File:** `src/styles.css`, lines 312–319

```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

**Problem:** Global `:focus-visible` applies to ALL focusable elements. Some shadcn/ui components use `ring-2` via Tailwind. This may create double outlines (global CSS + Tailwind `ring` class).

**Recommended Fix:** Scope to interactive elements only:

```css
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

### 🟡 C-5: Sticky Nav CSS Variables — styles.css:429–444

**Severity:** 🟡 Medium
**File:** `src/styles.css`, lines 100–101, 437–441

```css
:root {
  --navbar-height: 64px;
  --bottom-tab-height: 72px;
}
.sticky-nav {
  top: calc(var(--navbar-height) + var(--safe-area-top));
}
```

**Problem:** These variables are defined in `@theme inline` (Tailwind v4) which may not cascade to CSS variable usage outside Tailwind's processing. If undefined, the sticky position calculation breaks silently.

**Recommended Fix:** Add explicit `:root` definitions:

```css
:root {
  --navbar-height: 64px;
  --bottom-tab-height: 72px;
  --safe-area-top: 0px;
  --safe-area-bottom: 0px;
}
```

---

### 🟢 C-6: Design System Tokens Well-Defined — styles.css:22–112

**Severity:** 🟢 Info
**File:** `src/styles.css`, lines 22–112

Design tokens (colors, radius, fonts) are well-structured with `@theme inline` blocks. No conflicts with Tailwind v4.

---

### 🟢 C-7: prefers-reduced-motion Coverage — styles.css

**Severity:** 🟢 Info
**File:** `src/styles.css`

All animations have `prefers-reduced-motion` fallbacks. Good accessibility practice.

---

### 🟢 C-8: Parallax via CSS Custom Properties — styles.css:466–478

**Severity:** 🟢 Info
**File:** `src/styles.css`, lines 466–478

Parallax uses `transform: translateY(calc(var(--scroll-y) * N))` via scroll event in `__root.tsx`. Clean implementation without external libraries.

---

## 4. BONUS FINDINGS

### B-1: Module-level Cache Not Cleared on Logout — SuratPreviewPanel.tsx:47–70

**Severity:** 🟡 Medium
**File:** `src/components/admin/SuratPreviewPanel.tsx`, lines 47–70

```tsx
let _cachedSigners: SignerItem[] | null = null;
let _cachedRejectionReasons: ReasonItem[] | null = null;
let _fetchPromiseSigners: Promise<SignerItem[] | null> | null = null;
let _fetchPromiseReasons: Promise<ReasonItem[] | null> | null = null;
```

**Problem:** Module-level singleton caches persist for the entire application session. Not cleared on logout. If the signed-in user changes roles, stale signer data may be shown.

**Recommended Fix:** Clear caches on auth change via event listener.

---

### B-2: Navbar — 120ms Close Timer Without Unmount Cleanup — Navbar.tsx:63–72

**Severity:** 🟡 Medium
**File:** `src/components/site/Navbar.tsx`, lines 63–72

```tsx
const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const handleLeave = useCallback(() => {
  closeTimerRef.current = setTimeout(() => setOpenMenu(null), 120);
}, []);
```

**Problem:** `closeTimerRef` is tracked but the component doesn't clear the timer on unmount. If the Navbar unmounts while a dropdown hover is active, the timer fires after unmount.

**Recommended Fix:**

```tsx
useEffect(() => {
  return () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };
}, []);
```

---

### B-3: Debounce Timer Not Cleared on ESurat Unmount — ESurat.tsx:135, 205

**Severity:** 🟡 Medium
**File:** `src/pages/ESurat.tsx`, lines 135, 205

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
debounceRef.current = setTimeout(async () => { ... }, 400);
```

**Problem:** `debounceRef` is used in `handleNikChange` but there's no useEffect cleanup to clear the timer on unmount. If the user navigates away while a search is debouncing, the timer fires after navigation.

**Recommended Fix:**

```tsx
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, []);
```

---

### B-4: SettingsPanel Timer Reassignment Without Clear — SettingsPanel.tsx:286

**Severity:** 🟡 Medium
**File:** `src/components/admin/SettingsPanel.tsx`, line 286

Same as S-4 but emphasizing: reassigning without `clearTimeout` creates multiple concurrent timers that fire out of order, causing the save status to reset prematurely.

---

## Priority Fix Roadmap

### Immediate (Critical) — Fix Before Next Release

| #   | Issue                                                 | File                      | Fix                                                         |
| --- | ----------------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| 1   | **R-1** Search `w-64` → `w-full sm:w-64`              | `Admin.tsx:1954`          | Change className                                            |
| 2   | **S-1** Extract sub-components from Admin.tsx         | `Admin.tsx` (2,319 lines) | Split into DashboardView, MonitoringView, ArchiveView, etc. |
| 3   | **C-1** Remove `!important` from reduced-motion block | `styles.css:1018–1055`    | Use `@layer base` specificity instead                       |

### Short-term (High) — Fix Within 2 Sprints

| #   | Issue                                                   | File                                    | Fix                                                              |
| --- | ------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| 4   | **R-4** Standardize viewport meta                       | `__root.tsx:115`, `public/index.html:5` | Remove or standardize `maximum-scale`                            |
| 5   | **S-2** Fix ESurat empty deps + race condition          | `ESurat.tsx:153–167`                    | Add cancellation flag to useEffect                               |
| 6   | **S-3** Improve SettingsPanel merge conflict UX         | `SettingsPanel.tsx:183–203`             | Add field-level merge conflict resolution                        |
| 7   | **C-2** Resolve shimmer keyframe duplication            | `styles.css`                            | Move `.skeleton` to `@layer components` with namespaced keyframe |
| 8   | **B-4/S-4** Clear old timer before new in SettingsPanel | `SettingsPanel.tsx:286`                 | `clearTimeout` before `setTimeout`                               |

### Medium-term (Medium) — Fix Within 1 Month

| #   | Issue                                            | File                 | Fix                                       |
| --- | ------------------------------------------------ | -------------------- | ----------------------------------------- |
| 9   | **R-3** Add `md:` nav for tablet                 | `Navbar.tsx`         | Ensure `lg:` gap covered                  |
| 10  | **S-6** Coordinate refresh + healthCheck effects | `Admin.tsx:268,271`  | Combine into single init effect           |
| 11  | **C-4** Scope global `:focus-visible`            | `styles.css:312–319` | Add element selectors to scope rule       |
| 12  | **C-5** Ensure CSS variables in `:root`          | `styles.css`         | Add explicit `--navbar-height` etc.       |
| 13  | **B-2** Add timer cleanup on Navbar unmount      | `Navbar.tsx:63`      | Add useEffect cleanup for `closeTimerRef` |

### Long-term (Info / Good-to-have)

| #   | Issue                                                | File                          | Fix                               |
| --- | ---------------------------------------------------- | ----------------------------- | --------------------------------- |
| 14  | **S-5** Extract `useNikForm` custom hook             | `ESurat.tsx`                  | Encapsulate 7 state variables     |
| 15  | **S-7** Refactor direct `.getState()` calls          | `settings-store.ts`           | Use Zustand actions instead       |
| 16  | **C-3** Ensure shadow classes in `@layer components` | `styles.css:380–426`          | Wrap in `@layer components` block |
| 17  | **B-1** Clear module-level cache on logout           | `SuratPreviewPanel.tsx:47–70` | Add cache clearing on auth change |

---

## Files Audited

| File                                         | Lines     | Notes                         |
| -------------------------------------------- | --------- | ----------------------------- |
| `src/pages/Admin.tsx`                        | 2,319     | Primary audit target          |
| `src/pages/ESurat.tsx`                       | —         | Forms + state management      |
| `src/styles.css`                             | 1,209     | All CSS rules                 |
| `src/routes/__root.tsx`                      | —         | Viewport meta, scroll handler |
| `src/components/site/Navbar.tsx`             | —         | Responsive nav + timers       |
| `src/components/site/BottomTabBar.tsx`       | —         | Mobile nav overlay            |
| `src/components/sections/HeroSection.tsx`    | —         | Hero + marquee                |
| `src/components/admin/SettingsPanel.tsx`     | 1,481     | Settings + Zustand sync       |
| `src/components/admin/PendudukManager.tsx`   | —         | CRUD + state patterns         |
| `src/components/admin/CMSManager.tsx`        | —         | CMS + state patterns          |
| `src/components/admin/SuratPreviewPanel.tsx` | —         | Module-level cache            |
| `src/lib/settings-store.ts`                  | —         | Zustand + sync architecture   |
| `src/lib/esurat-store.ts`                    | —         | Zustand + sync architecture   |
| `src/stores/` + `src/lib/*-store.ts`         | 22 stores | Store patterns                |

---

_Report generated by Claude Sonnet 4.6 — Frontend Audit (Without Skill)_
_Audit date: 2026-05-25 | Total issues: 32 | Critical: 4_
