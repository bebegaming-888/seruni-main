# Frontend Full Redesign — Option C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production-grade redesign: upgrade typography from `Inter` to `Bricolage Grotesque` + `DM Sans`, fix dark mode FOUC, fix all accessibility violations, add global focus ring, remove debug logs, add sitemap.xml, enhance postbuild.js with SEO + font preconnect, upgrade 404 page, add skeleton loading states.

**Architecture:** CSS token upgrade via `src/styles.css`, inline theme script to prevent FOUC, accessibility patches on admin components, SEO enhancements in `scripts/postbuild.js`, skeleton components in admin section.

**Tech Stack:** TanStack Start, React 19, Tailwind CSS v4, Radix UI, CSS custom properties

---

## File Map

| File                                               | Responsibility                                      |
| -------------------------------------------------- | --------------------------------------------------- |
| `src/styles.css`                                   | Font tokens, dark mode vars, global focus ring      |
| `src/routes/__root.tsx`                            | FOUC inline script injection point                  |
| `scripts/postbuild.js`                             | OG meta + font preconnect in generated `index.html` |
| `public/sitemap.xml`                               | SEO sitemap                                         |
| `src/routes/$.tsx`                                 | 404 page redesign                                   |
| `src/components/admin/CMSManager.tsx`              | Fix img alt attributes                              |
| `src/components/admin/LembagaManager.tsx`          | Fix img alt attributes                              |
| `src/components/admin/PerangkatDesaManager.tsx`    | Fix img alt attributes                              |
| `src/components/admin/AlertPanel.tsx`              | Fix button aria-label missing                       |
| `src/components/admin/AuditLogManager.tsx`         | Fix button aria-label missing + console.log         |
| `src/components/admin/monitoring/PreviewModal.tsx` | Fix img alt attributes                              |
| `src/components/surat/LetterRenderer.tsx`          | Fix dangerouslySetInnerHTML + console.log           |
| `src/components/admin/SuratPreviewPanel.tsx`       | Remove console.log                                  |
| `src/pages/Admin.tsx`                              | Remove console.log                                  |
| `src/hooks/use-skeleton.ts`                        | Create: skeleton loading hook for admin             |
| `src/components/ui/skeleton-card.tsx`              | Create: reusable skeleton card component            |

---

### Task 1: Upgrade Fonts — Inter → Bricolage Grotesque + DM Sans

**Files:**

- Modify: `src/styles.css:93-97`
- Modify: `scripts/postbuild.js:133-148`

- [ ] **Step 1: Update font tokens in styles.css**

Locate lines 93-97 in `src/styles.css`:

```css
/* ── Fonts ───────────────────────────────────────────────────────── */
--font-display: "Inter", "Helvetica Neue", sans-serif;
--font-body: "Inter", "Helvetica Neue", sans-serif;
--font-ui: "Inter", "Helvetica Neue", sans-serif;
```

Replace with:

```css
/* ── Fonts ───────────────────────────────────────────────────────── */
--font-display: "Bricolage Grotesque", "Inter", "Helvetica Neue", sans-serif;
--font-body: "DM Sans", "Inter", "Helvetica Neue", sans-serif;
--font-ui: "DM Sans", "Inter", "Helvetica Neue", sans-serif;
```

> **Why keep Inter as fallback?** Bricolage Grotesque and DM Sans may not load immediately (FOUT), so Inter as final fallback prevents invisible text. We use `display=swap` in Google Fonts URL for fast FOUT→swap.

- [ ] **Step 2: Update Google Fonts URL in styles.css**

Locate line 9 in `src/styles.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
```

Replace with:

```css
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap");
```

> **font-display: swap** is implicit when using Google Fonts URL — it's the default for Google Fonts CSS API. Bricolage Grotesque has optical sizing axes (wght + opsz) which need explicit values.

- [ ] **Step 3: Add font preconnect in postbuild.js**

Locate the `<head>` block in `scripts/postbuild.js` (around lines 133-148). Find the closing `</head>` tag and add preconnect + preload before it:

In the `html` template string around line 138, add after the CSP meta tag or anywhere in `<head>`:

```js
const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content...

// Add this after <head> opening, BEFORE the existing content:
// ── Font preconnect for performance ──
const fontPreconnect = `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500; 0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" />
`;

// Inject fontPreconnect BEFORE the first meta tag inside <head>
// The current html injects inline at <head> level — we need to prepend it.
// Since the html string is one template literal, modify the template to include the preconnect.
// Find this line in the html template:    <meta charset="UTF-8" />
// And replace it with:    ${fontPreconnect}
    <meta charset="UTF-8" />
```

Actually, the simpler approach is to insert `fontPreconnect` variable and use it in the template. In `scripts/postbuild.js`, after the `nonce` and `buildTime` definitions (around line 131), add:

```js
const fontPreconnect = `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" />
`;
```

Then in the `html` template string, change:

```
<html lang="id">
  <head>
    <meta charset="UTF-8" />
```

To:

```
<html lang="id">
  <head>
    ${fontPreconnect}
    <meta charset="UTF-8" />
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes, index.html contains `Bricolage` and `DM+Sans` strings

---

### Task 2: Fix Dark Mode FOUC

**Files:**

- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Read \_\_root.tsx to understand current head structure**

Find where `<HeadContent>` is used in `src/routes/__root.tsx`. Need to add an inline `<script>` BEFORE any React render that:

1. Reads `localStorage.getItem('theme')`
2. Falls back to `prefers-color-scheme`
3. Toggles `dark` class on `<html>`

The script must be INSIDE the `<head>` content, before any CSS loads, to prevent FOUC.

Locate the existing `<HeadContent>` section in `__root.tsx`. A typical pattern for TanStack Start is to add a `<title>` or meta tag, but to inject a raw script tag, you need to use a `<script dangerouslySetInnerHTML>` inside `<HeadContent>` OR add it as a static string in a `<link>` or another pattern.

Actually the cleanest approach for TanStack Start is to add this inline script directly in the `<html>` or using a `<script>` inside `<HeadContent>` with `suppressHydrationWarning` on `<html>`. But the most reliable fix is to add it as a blocking inline script at the top of `scripts/postbuild.js` — but that means it's baked in at build time.

**The correct approach for this codebase:** Add a `<script>` tag at the very top of `__root.tsx`'s `<HeadContent>` export, containing the theme initialization. This script runs synchronously during React hydration before any component renders, preventing FOUC.

In `src/routes/__root.tsx`, after the existing imports, find the `HeadContent` function or component. Add this inside the returned JSX or as a sibling:

```tsx
// Right at the top of the HeadContent export, BEFORE any other content
function RootHead() {
  return (
    <>
      {/* Theme init: must be inline script to prevent FOUC */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{
            var t=localStorage.getItem('theme')||('matchMedia' in window&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
            if(t==='dark')document.documentElement.classList.add('dark');
          }catch(e){}})()`,
        }}
      />
    </>
  );
}
```

Then add `<RootHead />` inside the `<HeadContent>` component, as the first child.

**Verification:** After the fix, hard-reload the page (empty cache) — the dark background should appear instantly without flash.

---

### Task 3: Fix 10+ img Alt Attributes in Admin Components

**Files:**

- Modify: `src/components/admin/CMSManager.tsx` (lines 815, 1027)
- Modify: `src/components/admin/LembagaManager.tsx` (lines 256, 460, 1109)
- Modify: `src/components/admin/PerangkatDesaManager.tsx` (line 194)
- Modify: `src/components/admin/monitoring/PreviewModal.tsx` (lines 148, 154, 160, 187)

- [ ] **Step 1: Fix CMSManager.tsx img alt at line 815**

Read the exact line context. Search for the img at line 815:

```bash
grep -n "img" src/components/admin/CMSManager.tsx | head -20
```

For each `<img>` tag, add a descriptive `alt` attribute. Common patterns in this codebase:

- Images from Supabase storage: use the filename or a descriptive label
- Static images: describe what's in the image

If the img has no alt and isn't decorative, add `alt="Gambar"` or a more descriptive name:

```tsx
<img src={imageUrl} alt={`Gambar ${title}`} className="..." />
```

- [ ] **Step 2: Fix CMSManager.tsx img alt at line 1027** — same approach

- [ ] **Step 3: Fix LembagaManager.tsx img alt at lines 256, 460, 1109**

Read each context:

```bash
sed -n '250,265p' src/components/admin/LembagaManager.tsx
sed -n '455,465p' src/components/admin/LembagaManager.tsx
sed -n '1105,1115p' src/components/admin/LembagaManager.tsx
```

Add descriptive alt text for each — examples:

- Profil lembaga: `alt="Logo {namaLembaga}"`
- Perangkat foto: `alt={`Foto ${nama}`}`

- [ ] **Step 4: Fix PerangkatDesaManager.tsx img alt at line 194**

- [ ] **Step 5: Fix PreviewModal.tsx img alt at lines 148, 154, 160, 187**

Read each context to determine if decorative or meaningful:

```bash
sed -n '145,165p' src/components/admin/monitoring/PreviewModal.tsx
sed -n '184,192p' src/components/admin/monitoring/PreviewModal.tsx
```

For decorative stamps/logos: `alt=""` (empty string)
For meaningful images: descriptive alt text

---

### Task 4: Fix 4+ Button aria-label Missing in Admin Components

**Files:**

- Modify: `src/components/admin/AlertPanel.tsx:148`
- Modify: `src/components/admin/AuditLogManager.tsx:58`

- [ ] **Step 1: Fix AlertPanel.tsx button at line 148**

Read the context:

```bash
sed -n '143,160p' src/components/admin/AlertPanel.tsx
```

The button likely has only an icon with no text label. Add:

```tsx
<button aria-label="Close alert" ...>
```

Or a more descriptive label like "Tutup notifikasi" or "Hapus alert"

- [ ] **Step 2: Fix AuditLogManager.tsx button at line 58**

Read the context:

```bash
sed -n '55,70p' src/components/admin/AuditLogManager.tsx
```

Add appropriate `aria-label` based on what the button does.

---

### Task 5: Add Global focus-visible Ring CSS

**Files:**

- Modify: `src/styles.css`

- [ ] **Step 1: Find insertion point**

Read `src/styles.css` around lines 200-220 to find a good insertion spot (after `:root` block, before dark mode or at the end of the file after all variables).

- [ ] **Step 2: Add global focus ring CSS**

Add after the `--z-toast: 200;` line (around line 121) or at the end of the `@theme inline` block:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   ACCESSIBILITY — Focus Visible Ring
   ═══════════════════════════════════════════════════════════════════════════ */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Ensure :focus (not :focus-visible) is also visible for older browsers */
*:focus:not(:focus-visible) {
  outline: 2px solid hsl(var(--muted-foreground) / 0.5);
  outline-offset: 2px;
}

/* Skip link for keyboard navigation */
.skip-link {
  position: fixed;
  top: -100%;
  left: 1rem;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 1rem;
}
```

Also add the skip link to `src/routes/__root.tsx` as the first element inside the `<body>`:

```tsx
<a href="#main-content" className="skip-link">
  Lewati navigasi
</a>
```

And add `id="main-content"` to the main layout container (usually the `<main>` or first `<div>` after navbar).

---

### Task 6: Remove console.log Debug Statements

**Files:**

- Modify: `src/components/admin/AuditLogManager.tsx`
- Modify: `src/components/surat/LetterRenderer.tsx`
- Modify: `src/components/admin/SuratPreviewPanel.tsx`
- Modify: `src/pages/Admin.tsx`

- [ ] **Step 1: Find all console.log usages**

```bash
grep -rn "console\.log" src --include="*.tsx" | head -10
```

- [ ] **Step 2: Remove or replace with console.debug for each file**

Found locations (verify with exact grep):

1. `src/components/admin/AuditLogManager.tsx` — find line with console.log
2. `src/components/surat/LetterRenderer.tsx` — find line with console.log
3. `src/components/admin/SuratPreviewPanel.tsx` — find line with console.log
4. `src/pages/Admin.tsx` — find line with console.log

For each: either delete the line entirely OR replace `console.log` with `console.debug` if it's a useful diagnostic that shouldn't appear in production console by default.

---

### Task 7: Add sitemap.xml for SEO

**Files:**

- Create: `public/sitemap.xml`

- [ ] **Step 1: Create public/sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://desaserunimumbul.id/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://desaserunimumbul.id/profil</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://desaserunimumbul.id/informasi/berita</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://desaserunimumbul.id/layanan/surat</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://desaserunimumbul.id/wisata</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

> **Note:** Adjust the domain from `desaserunimumbul.id` to the actual production domain. In dev, the sitemap can be simple. For a production sitemap that includes dynamic blog posts, you'd generate this programmatically, but a static file with main routes is sufficient for this upgrade.

Run: `npm run build` and verify `dist/client/sitemap.xml` is copied (if not, check `includeAssets` or public copy config).

---

### Task 8: Enhance postbuild.js with OG Meta Tags + Font Preconnect

**Files:**

- Modify: `scripts/postbuild.js`

- [ ] **Step 1: Add Open Graph meta tags in generated HTML**

Read `scripts/postbuild.js` fully to understand the current html template structure, then modify the `<head>` section (around lines 133-148).

Add these additional meta tags BEFORE the closing `</head>` in the html template:

```js
// Add to the html template, after <meta name="description"... />
// OG tags for social sharing
<meta property="og:title" content="Desa Seruni Mumbul — Website Resmi Pemerintah Desa" />
<meta property="og:description" content="Website resmi Pemerintah Desa Seruni Mumbul, Pringgabaya, Lombok Timur, NTB. Layanan e-surat, informasi publik, dan pemerintahan desa." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://desaserunimumbul.id" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Desa Seruni Mumbul" />
<meta name="twitter:description" content="Website resmi Pemerintah Desa Seruni Mumbul" />
```

- [ ] **Step 2: Add font preconnect and preload**

Already covered in Task 1, Step 3 — but ensure it's properly inserted. The font preconnect should appear BEFORE all other stylesheets in `<head>`.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: `dist/client/index.html` contains all og: meta tags

---

### Task 9: Upgrade 404 Page in $.tsx

**Files:**

- Modify: `src/routes/$.tsx`

- [ ] **Step 1: Read $.tsx to understand current structure**

```bash
cat src/routes/$.tsx
```

- [ ] **Step 2: Replace with enhanced 404 page**

The current page has a large decorative `<h1>` with `text-foreground/10`. Replace with a more useful 404 page:

```tsx
import { Link, createFileRoute } from "@tanstack/react-router";
import { Home, ArrowLeft, Search } from "lucide-react";

export const Route = createFileRoute("/$")({
  component: NotFoundPage,
  meta: {
    title: "Halaman Tidak Ditemukan",
  },
});

export function NotFoundPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-background">
      {/* Large decorative background text */}
      <div className="absolute pointer-events-none select-none" aria-hidden="true">
        <h1 className="font-display text-[120px] sm:text-[160px] font-bold leading-none text-foreground/5">
          404
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Search className="w-8 h-8 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Halaman Tidak Ditemukan
          </h1>
          <p className="font-body text-muted-foreground text-base sm:text-lg">
            Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold font-ui text-sm hover:bg-primary-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          <Link
            viewTransition
            href="/informasi/berita"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border text-foreground font-ui text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Baca Berita
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | grep -E "error|warning|404" | head -10`
Expected: No errors related to $.tsx

---

### Task 10: Add Skeleton Loading States to Admin Pages

**Files:**

- Create: `src/hooks/use-skeleton.ts`
- Create: `src/components/ui/skeleton-card.tsx`
- Modify: `src/components/admin/TemplateSuratManager.tsx` (choose one representative admin page)

- [ ] **Step 1: Create use-skeleton.ts**

```ts
// src/hooks/use-skeleton.ts
import { useState, useEffect } from "react";

interface UseSkeletonOptions {
  delay?: number;
  minDuration?: number;
}

export function useSkeleton<T>(loader: () => Promise<T>, options: UseSkeletonOptions = {}) {
  const { delay = 0, minDuration = 300 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await new Promise((r) => setTimeout(r, delay));
        const result = await loader();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loader, delay]);

  return { data, loading, error };
}
```

- [ ] **Step 2: Create skeleton-card.tsx**

```tsx
// src/components/ui/skeleton-card.tsx
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  lines?: number;
  avatar?: boolean;
  action?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 3,
  avatar = false,
  action = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse",
        className,
      )}
      aria-hidden="true"
    >
      {avatar && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-1/3" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted rounded"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
      {action && (
        <div className="flex gap-2 pt-2">
          <div className="h-8 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded w-16" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Integrate into TemplateSuratManager.tsx**

Read `src/components/admin/TemplateSuratManager.tsx` to find where data is fetched. Replace loading state with `<SkeletonCard>` components.

Find the loading state pattern:

```bash
grep -n "isLoading\|loading" src/components/admin/TemplateSuratManager.tsx | head -15
```

Replace any inline spinner with:

```tsx
<div className="space-y-4">
  <SkeletonCard avatar />
  <SkeletonCard lines={2} action />
  <SkeletonCard avatar lines={3} />
</div>
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes

---

## Self-Review Checklist

- [ ] Font tokens updated in styles.css
- [ ] Google Fonts URL updated with Bricolage Grotesque + DM Sans
- [ ] Font preconnect added in postbuild.js html template
- [ ] Dark mode FOUC inline script added in \_\_root.tsx
- [ ] All 10+ img alt attributes fixed with descriptive text
- [ ] All 4+ button aria-label attributes added
- [ ] Global focus-visible ring CSS added to styles.css
- [ ] Skip link added to \_\_root.tsx + id="main-content" anchor added
- [ ] All console.log statements removed/replaced
- [ ] sitemap.xml created in public/
- [ ] OG meta tags added in postbuild.js
- [ ] 404 page upgraded with navigation links
- [ ] SkeletonCard and use-skeleton created
- [ ] One admin page integrated with skeleton loading
- [ ] **`npm run build` passes with no errors**

---

## Execution Options

**"Plan complete and saved to `docs/superpowers/plans/2026-05-27-frontend-full-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** - Execute tasks in this session using executing-plans skill

**Which approach?**
