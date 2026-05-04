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
npm run preview       # Preview production build
npm run lint          # ESLint
npm run format        # Prettier write
```

## Architecture

### Routing

TanStack Router with file-based routes in `src/routes/`. Route tree is auto-generated to `routeTree.gen.ts` — never edit directly.

### Data Layer (Backend in Progress)

| File                        | Purpose                          | Status           |
| --------------------------- | -------------------------------- | ---------------- |
| `src/lib/supabase.ts`       | Supabase client singleton        | Setup ready      |
| `src/lib/supabase-admin.ts` | Admin client for Edge Functions  | Setup ready      |
| `src/lib/esurat-store.ts`   | E-Surat records (localStorage)   | Production-ready |
| `src/lib/template-store.ts` | Letter templates (localStorage)  | Production-ready |
| `src/lib/settings-store.ts` | System settings                  | Production-ready |
| `src/lib/auth.ts`           | Admin auth (env var credentials) | Secured          |
| `src/lib/fonnte.ts`         | WhatsApp notifications           | Token in env var |

### Schema Definitions

`src/data/surat-fields.ts` defines field schemas for each letter type (SKD, SKU, SKTM, etc.). Template bodies use `{{placeholder}}` syntax — rendered via `renderTemplate()` in `template-store.ts`.

### Penduduk Data

`src/data/penduduk.ts` contains mock residents. Migrate to Supabase `warga` table (see `supabase/migrations/001_core_schema.sql`).

### Database Migration

Run `supabase/migrations/001_core_schema.sql` in the Supabase SQL Editor to create:

- `admin_users` — with bcrypt-hashed fixed admin
- `warga` — resident data table
- `surat_requests` — letter request records
- `audit_log` — admin action audit trail
- `notifications` — WA notification queue
- RLS policies on all tables

### Roles & Permissions

`src/lib/roles.ts` defines a role matrix (Super Admin, Operator, Verifikator, Kepala Desa). Always use `can("action")` and `suratActionsFor()` / `templateActionsFor()`.

### Fixed Admin Credentials

```
Username: admindesa  (VITE_ADMIN_USER env var)
Password: admin123   (VITE_ADMIN_PASS env var)
```

Credentials come from env vars — never hardcoded.

### Edge Functions (`functions/api/`)

- `functions/api/send-wa.ts` — WhatsApp via Fonnte (token from Cloudflare Secrets, not browser)
- `functions/api/generate-pdf.ts` — PDF generator with QR code

Set secrets in Cloudflare Pages:

```bash
wrangler secret put FONNTE_API_KEY
```

## PWA

- `public/manifest.json` — PWA manifest with shortcuts
- `public/sw.js` — Service Worker (offline-first, network-first for API)
- SVG icons in `public/icons/`
- Register in `src/routes/__root.tsx` (only in production, not dev)
- SVG favicon at `public/favicon.svg`

## SEO

- `public/schema-org.json` — Structured data (LocalGovernmentOffice schema)
- `src/routes/__root.tsx` — Canonical meta tags, og:_, twitter:_, apple-mobile-web-app tags

## New Files to Know

| File                                      | Purpose                                |
| ----------------------------------------- | -------------------------------------- |
| `src/lib/pdf-generator.ts`                | PDF letter generator (Edge-compatible) |
| `src/lib/supabase.ts`                     | Supabase client                        |
| `src/lib/supabase-admin.ts`               | Server-side admin client               |
| `src/lib/fonnte.ts`                       | WA notifications (env var token)       |
| `src/routes/verifikasi.$no.tsx`           | Public letter verification page        |
| `src/routes/profil.bpd.tsx`               | BPD page                               |
| `src/routes/profil.lpm.tsx`               | LPM page                               |
| `src/routes/profil.pkkrw.tsx`             | PKK page                               |
| `src/routes/profil.karangtaruna.tsx`      | Karang Taruna page                     |
| `src/routes/profil.lembaga.tsx`           | All lembaga hub page                   |
| `src/routes/ekonomi.bumdes.tsx`           | BUMDes page                            |
| `supabase/migrations/001_core_schema.sql` | DB schema + RLS policies               |
| `functions/api/send-wa.ts`                | Fonnte Edge Function                   |
| `functions/api/generate-pdf.ts`           | PDF generator Edge Function            |
| `public/sw.js`                            | Service Worker                         |
| `public/manifest.json`                    | PWA manifest                           |
| `.env.example`                            | Env var template                       |
| `.dev.vars`                               | Local dev secrets (excluded from git)  |
