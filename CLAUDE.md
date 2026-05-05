# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework**: TanStack Start (TanStack Router + React Start) with Vite
- **UI**: React 19, Tailwind CSS v4 (CSS-based), Radix UI primitives, shadcn/ui-style components
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF**: pdf-lib + qrcode (server-side edge generation)
- **Backend**: Supabase (Auth + PostgreSQL + RLS), Cloudflare Pages Functions (Edge)
- **Deployment**: Cloudflare Pages

> **Vite config is managed by `@lovable.dev/vite-tanstack-config` — do NOT add plugins manually or the app will break.** See `vite.config.ts` for details.

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run build:dev    # Build with development settings
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier write
```

## Architecture

### Routing

TanStack Router with file-based routes in `src/routes/`. Route tree is auto-generated to `routeTree.gen.ts` — never edit directly. TanStack Query is wired in for async state management.

`src/router.tsx` exports `getRouter()` with a custom `DefaultErrorComponent` — the app's global error/404 page. Dev mode shows error details; production shows a clean fallback.

### Auth: Two Systems

- **Admin auth** (`src/lib/auth.ts`): localStorage/sessionStorage-based. A fixed superadmin account comes from `VITE_ADMIN_USER`/`VITE_ADMIN_PASS` env vars and **cannot be deleted or renamed**. Additional users are stored in localStorage and manageable via the Settings panel.
- **Supabase auth**: Set up in the DB migration but not yet wired in the frontend. Supabase RLS uses the `admin_users` table, not its own built-in auth.

> `src/lib/supabase.ts` returns `null` when env vars are missing. Always check `isSupabaseConfigured` or null-check the client — never assume it is present.

### Letter Workflow (E-Surat)

Records move through a 5-status pipeline: `Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak`. Use `can("surat.verify")` / `can("surat.approve")` etc. from `src/lib/roles.ts` — never hardcode role checks. The `suratActionsFor(status)` helper returns the correct action buttons for a given status.

### Data Layer

Three layers exist in parallel:
- **localStorage** (`src/lib/esurat-store.ts`): manages live records, archive, and imported penduduk data. Currently the primary production data store.
- **Sync Layer** (`src/lib/useSupabaseSync.ts`): write-through sync — every mutation (save, setStatus, archive) writes to localStorage first, then attempts Supabase. Falls back gracefully when Supabase is not configured. Provides `syncSaveRecord()`, `syncSetStatus()`, `syncArchive()`, `logAudit()`, `healthCheck()`.
- **Supabase** (migration `supabase/migrations/001_core_schema.sql`): defines the full relational schema (warga, surat_requests, audit_log, notifications) with RLS. Edge Functions use service role key (via Cloudflare Secrets) to query DB. The DB `generate_surat_number()` function produces sequential numbers in format `0001/S-SKD/470/2026`.

> **Use `isSupabaseConfigured` from `src/lib/supabase.ts` before calling any Supabase operation.** The sync layer handles this internally. Never assume the client is present — always null-check.

### Schema Definitions

`src/data/surat-fields.ts` defines field schemas for each letter type (SKD, SKU, SKTM, etc.). Template bodies use `{{placeholder}}` syntax — rendered via `renderTemplate()` in `template-store.ts`.

### Penduduk Data

`src/data/penduduk.ts` contains mock residents. Migrate to Supabase `warga` table (see the migration file above).

### Database Migration

Run `supabase/migrations/001_core_schema.sql` in the Supabase SQL Editor. It creates: `admin_users`, `warga`, `surat_requests`, `audit_log`, `notifications` tables, plus RLS policies, triggers (auto `updated_at`), and the `generate_surat_number()` helper function.

### Roles & Permissions

`src/lib/roles.ts` defines a role matrix (Super Admin, Operator, Verifikator, Kepala Desa). Always use `can("action")` and `suratActionsFor()` / `templateActionsFor()`.

### Fixed Admin Credentials

```
Username: admindesa  (VITE_ADMIN_USER env var)
Password: admin123   (VITE_ADMIN_PASS env var)
```

Credentials come from env vars — never hardcoded.

### Edge Functions (`functions/api/`)

- `functions/api/send-wa.ts` — WhatsApp via Fonnte. Logs audit entries and notifications to Supabase `audit_log` and `notifications` tables via service role key. Token from Cloudflare Secrets (never browser).
- `functions/api/generate-pdf.ts` — PDF generator with QR code. Fetches record data from Supabase using service role key; falls back to mock data if Supabase not configured. Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars.

Set secrets in Cloudflare Pages:

```bash
wrangler secret put FONNTE_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## PWA

- `public/manifest.json` — PWA manifest with shortcuts
- `public/sw.js` — Service Worker (offline-first, network-first for API)
- SVG icons in `public/icons/`
- Registered via `useServiceWorker()` hook inside `src/routes/__root.tsx` — **runs only in production**, not dev mode
- SVG favicon at `public/favicon.svg`

## Design System

Tailwind CSS v4 with **CSS-based theming** — there is no `tailwind.config.js`. All design tokens (colors, fonts, radii, etc.) are defined via `@theme inline {}` in `src/styles.css`. To add new colors or tokens, edit `styles.css` directly.

## Component Utilities

- `cn()` in `src/lib/utils.ts` — standard clsx + tailwind-merge helper. Always use this instead of template literals for conditional classes on shadcn/ui components.
- Add new shadcn/ui components with:
  ```bash
  npx shadcn@latest add Button
  ```
  Style is `"new-york"` (configured in `components.json`). All UI components live under `src/components/ui/` with the `@/components/ui` alias.

## Goals & Pedoman Eksekusi

Semua keputusan pengembangan merujuk ke **`docs/GOALS.md`** — dokumen yang berisi:
- **Goals** — 5 tujuan strategis platform (pelayanan online, efisiensi, transparansi, keamanan, mobile-first)
- **Prinsip Eksekusi** — Kerjakan → Periksa Problem → Perbaiki → Selesai → Next Step
- **Roadmap** — Fase 1 (fondasi) → Fase 2 (penguatan) → Fase 3 (mobile app) → Fase 4 (perluasan)
- **Prioritas Fitur** — Warga (public) vs Perangkat Desa (admin)

Setiap selesai task, update checklist terkait di `docs/GOALS.md`.

## SEO

- `public/schema-org.json` — Structured data (LocalGovernmentOffice schema)
- `src/routes/__root.tsx` — Canonical meta tags, og:_, twitter:_, apple-mobile-web-app tags
