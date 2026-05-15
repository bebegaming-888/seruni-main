---
name: portal-desa-seruni-mumbul
description: >
  Skill engineering-grade untuk Portal Desa Seruni Mumbul dan pembangunan website modern
  secara umum — React/TanStack/Supabase offline-first, mobile-first, anti-error, anti-debug.
  Gunakan skill ini untuk: membangun fitur portal desa, website canggih & smart, cloning
  komponen 100% identik, eksekusi kode sehat tanpa error, debugging, audit, analisis
  arsitektur, e-surat, APBDes, penduduk, lembaga desa, IDM, pengaduan, autofill NIK,
  export PDF/CSV, offline queue, Supabase RLS, admin dashboard, compliance UU PDP +
  Permendagri. Skill ini adalah single source of truth untuk scope, pola, aturan, dan
  keputusan arsitektur proyek.
---

# Master Skill — Portal Desa Seruni Mumbul & Smart Web Engineering

> **Prinsip:** AI = arsitek senior · Tidak spekulatif · Tidak mengarang · Tidak setengah-jalan · Anti-halusinasi · Selalu tuntas

---

## 🧠 IDENTITAS & ANTI-HALUSINASI

- Tidak tahu → `"Saya tidak memiliki informasi yang cukup."`
- Tidak yakin → `"Estimasi (belum diverifikasi): ..."`
- Tidak pernah mengarang library, API, fungsi, atau dokumentasi
- Verifikasi logic sebelum menyajikan kalkulasi apapun
- Di luar kemampuan → nyatakan jelas + tawarkan alternatif konkret

---

## ⚙️ SMART EXECUTION PIPELINE — 12 LANGKAH (ANTI-ERROR · ANTI-DEBUG)

> **Filosofi:** Selesaikan dengan benar sejak pertama. Tidak ada "nanti diperbaiki."
> Setiap langkah adalah gate — tidak maju sebelum gate sebelumnya lulus.

```
╔══════════════════════════════════════════════════════════════════════╗
║                   SMART EXECUTION PIPELINE v2                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [01] PARSE INTENT          Pahami TEPAT apa yang diinginkan         ║
║       → Bedakan: apa yang diminta vs apa yang SEBENARNYA dibutuhkan  ║
║       → Jika ambigu → TANYA SATU pertanyaan paling kritis dulu       ║
║                                                                      ║
║  [02] PRE-FLIGHT CHECK      Sebelum menulis satu baris kode          ║
║       → Tools/library tersedia? · Versi kompatibel?                  ║
║       → Ada pola serupa di codebase? · Ada constraint tersembunyi?   ║
║       → Estimasi dampak: modul apa yang mungkin terpengaruh?         ║
║                                                                      ║
║  [03] DEFENSIVE DESIGN      Rancang untuk gagal dengan elegan        ║
║       → Null safety di semua input · Optional chaining               ║
║       → Default values yang masuk akal · Type guard yang ketat       ║
║       → Error boundary di setiap async operation                     ║
║                                                                      ║
║  [04] EKSEKUSI BERTAHAP     Tulis kode dalam unit yang bisa diuji    ║
║       → Satu fungsi = satu tanggung jawab (SRP)                      ║
║       → Maksimal 40 baris per fungsi · Nama menjelaskan diri sendiri ║
║       → Komentar hanya untuk WHY, bukan WHAT                        ║
║                                                                      ║
║  [05] SYNTAX & TYPE GATE    Zero error sebelum lanjut                ║
║       → TypeScript: 0 error, 0 `any` implisit                       ║
║       → Import semua terpakai · Export semua yang diperlukan         ║
║       → Zod schema cocok dengan TypeScript type                      ║
║                                                                      ║
║  [06] LOGIC GATE            Benar secara logika                      ║
║       → Trace manual: input X → proses → output Y benar?            ║
║       → Edge cases: null · undefined · empty array · 0 · negative    ║
║       → Race condition: dua request bersamaan → hasil konsisten?     ║
║       → Async: semua Promise di-await atau di-catch                  ║
║                                                                      ║
║  [07] SIDE-EFFECT GATE      Tidak merusak yang sudah ada             ║
║       → Cek semua file yang import modul ini                         ║
║       → Breaking change? → migration path atau backward-compat       ║
║       → Store/state global: apakah ada yang diubah tanpa sengaja?    ║
║                                                                      ║
║  [08] PERFORMANCE GATE      Cukup cepat untuk kondisi nyata          ║
║       → Re-render tidak perlu (memoize, selector tepat)              ║
║       → Query: tidak ada N+1 · Payload tidak >50KB tanpa reason      ║
║       → Bundle: tidak ada import besar tanpa tree-shaking            ║
║                                                                      ║
║  [09] SECURITY GATE         Tidak membuka celah                      ║
║       → Input dari user selalu divalidasi (Zod 3 lapis)              ║
║       → Tidak ada data sensitif di log/response publik               ║
║       → Auth check ada di setiap route/action yang memerlukan        ║
║                                                                      ║
║  [10] CLEANUP GATE          Kode produksi, bukan playground          ║
║       → Hapus console.log debug · TODO tanpa tiket → resolve/remove  ║
║       → Dead code → hapus · Unused import → hapus                    ║
║       → Env var baru → tambahkan ke .env.example                     ║
║                                                                      ║
║  [11] VALIDASI 100% SEHAT   Self-test sebelum serahkan               ║
║       → npx tsc --noEmit → 0 error                                   ║
║       → npm run lint → 0 warning                                     ║
║       → Happy path: jalankan mental → hasilnya benar?                ║
║       → Crash test: input terburuk → sistem tidak meledak            ║
║                                                                      ║
║  [12] HANDOFF               Serah terima yang jelas                  ║
║       → Ringkasan: apa yang dibuat · diubah · dihapus                ║
║       → Potensi dampak ke modul lain                                 ║
║       → Langkah selanjutnya yang disarankan                          ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Error Prevention Heuristics

```typescript
// SELALU lakukan ini:
const data = response?.data ?? []              // optional chain + fallback
const user = users.find(u => u.id === id)
if (!user) throw new NotFoundError(id)         // fail fast, fail loud
await Promise.all([a(), b()]).catch(handleErr) // semua Promise di-catch

// JANGAN lakukan ini:
const data = response.data                     // crash jika response null
users[0].name                                  // array bisa kosong
fetch(url)                                     // tanpa await, tanpa catch
setState(prev => ({...prev, ...newData}))      // merge blind tanpa type guard
```

### Anti-Debug Checklist (sebelum push)

```
□ TypeScript 0 error (npx tsc --noEmit)
□ ESLint 0 warning (npm run lint)
□ Tidak ada console.log yang tertinggal
□ Tidak ada hardcoded value (URL, ID, string literal ajaib)
□ Semua async function di-await atau di-catch
□ Semua conditional render punya fallback (loading / empty state)
□ Semua form punya error state yang tampil ke user
□ Semua API call: loading + error + success state
□ Tidak ada `any` implisit · Tidak ada `!` tanpa alasan
□ Env var baru → .env.example
```

---

## 🌐 SKILL UMUM — MEMBANGUN WEBSITE CANGGIH & SMART

### Filosofi Stack

```
Gratis → Ringan → Performan → Future-Proof → Composable
```

| Layer | Pilihan Utama | Alternatif |
|-------|-------------|------------|
| Framework | Next.js 15 / SvelteKit | TanStack Start |
| Router | TanStack Router | React Router v7 |
| State | Zustand / Jotai | Nanostores |
| Form | React Hook Form + Zod | Conform |
| Styling | Tailwind v4 + shadcn/ui | Radix UI |
| Charts | Recharts / Chart.js | Nivo |
| DB SQL | Supabase / Turso | PlanetScale |
| ORM | Drizzle / Prisma | TypeORM |
| Auth | Better Auth / Lucia | Supabase Auth |
| Storage | Supabase Storage / MinIO | Cloudflare R2 |
| API | Hono / FastAPI | Express, Elysia |
| Cache | Redis OSS | Upstash Redis |
| Queue | BullMQ | Inngest |
| PWA | Workbox + IndexedDB | — |
| Email | Resend (100/hari) | Brevo |

**Larangan:** ❌ Berbayar tanpa free tier · ❌ Bundle >500KB · ❌ Deprecated >2 tahun · ❌ Vendor lock-in

### Arsitektur Layered (Smart Website)

```
┌─────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                  │
│  Pages → Components → UI Primitives                 │
│  Mobile-first · WCAG 2.1 AA · Skeleton states       │
├─────────────────────────────────────────────────────┤
│  STATE LAYER                                         │
│  Zustand (global) · React Query (server state)      │
│  _data pattern (offline single source of truth)     │
├─────────────────────────────────────────────────────┤
│  SERVICE LAYER                                       │
│  API routes / Edge functions · Zod validation       │
│  Circuit breaker · Rate limiting · Auth middleware  │
├─────────────────────────────────────────────────────┤
│  DATA LAYER                                          │
│  Cloud (Supabase) · Local (IndexedDB) · Cache       │
│  RLS policies · Soft delete · Audit trail           │
└─────────────────────────────────────────────────────┘
```

### Prinsip Universal Build

| # | Prinsip | Implementasi |
|---|---------|--------------|
| 1 | **MOBILE FIRST** ⭐ | Default `<640px`; touch ≥44px; breakpoint naik |
| 2 | **OFFLINE-FIRST** ⭐ | L1 state → L2 Zustand → L3 IDB → L4 cloud |
| 3 | **ZERO HARDCODE** | Semua nilai → env / config / DB / CSS-var |
| 4 | **DEFENSIVE UI** | Loading · Empty+CTA · Error · Konfirmasi destruktif |
| 5 | **ADMIN-CONTROLLED** | Setiap fitur toggle-able dari admin panel |
| 6 | **ACCESSIBLE** | Kontras ≥4.5:1 · tab order · aria-label · alt text |
| 7 | **TEST 3G** | 400kbps + 5% packet loss; core fungsi tetap jalan |
| 8 | **PROGRESSIVE** | Fungsi dasar jalan tanpa JS; enhance bertahap |
| 9 | **MEASURABLE** | Structured log · Prometheus metrics · /health |

### Frontend Mobile-First Standard

```css
/* Breakpoints: default <640 · sm:640 · md:768 · lg:1024 · xl:1280 */
.interactive { min-height:44px; min-width:44px; touch-action:manipulation; }
/* Font: ≥16px mobile · line-height ≥1.5 · truncate panjang = ellipsis */
/* Animation: opacity+translateY+blur 0.4s ease · skeleton shimmer 1.5s */
```

**UI States WAJIB ada di setiap komponen async:**
```
Loading  → skeleton / spinner proporsional
Empty    → ilustrasi + CTA ("Belum ada data. Tambahkan sekarang.")
Error    → pesan ramah + retry ("Gagal memuat. Coba lagi?")
Success  → konfirmasi visual (toast / badge / transisi halus)
```

### API Standard

```
REST: GET/POST/PUT/PATCH/DELETE
OK:   { data, meta: { page, total, timestamp } }
Err:  { error: { code, message, details, traceId } }
HTTP: 200/201/204 | 400/401/403/404/422 | 429/500/503

CRUD:
findAll: pagination (page/limit/sort/search) → { data, meta }
create:  validate(dto) → repo.save → return created
update:  findById (throw 404) → repo.update → return updated
delete:  findById → repo.softDelete (preserve audit)
```

### Performance Patterns

```
N+1        → eager loading / DataLoader / JOIN tepat
Pagination → cursor-based untuk dataset besar
Cache      → cache-aside (Redis) + TTL sesuai volatilitas
Bundle     → code split per route · dynamic import komponen besar
Images     → WebP/AVIF · lazy load · dimensi eksplisit · CDN
Payload    → >50KB → paginasi / sparse fields / compress
Jobs       → operasi >500ms → background queue (BullMQ)
```

### Testing & Observability

```
Unit 70%        → Vitest: fungsi murni, transformasi
Integration 20% → Supertest: API contract, DB ops
E2E 10%         → Playwright: critical user flows

Log: { level, timestamp, service, traceId, userId, action, duration_ms }
Health: GET /health → { status: "healthy"|"degraded", uptime, checks:{db,cache} }
```

### Deployment Stack Gratis

```yaml
Frontend: Vercel / Cloudflare Pages
Backend:  Railway / Render / Fly.io
DB:       Supabase / Turso
Monitor:  Sentry + Grafana Cloud (free)
Email:    Resend / Brevo
Docker:   multi-stage (deps→runner node:20-alpine) · USER node · EXPOSE 3000
```

---

## 🪞 CLONE 100% IDENTIK — PRECISION CLONING PROTOCOL

> Aktifkan saat: `@clone`, duplikat komponen/sistem, migrasi, tiru persis.
> **PRINSIP MUTLAK:** Zero bias · Zero improvement · Zero assumption · Target diff = 0

```
╔══════════════════════════════════════════════════════════════════════╗
║                 PRECISION CLONING — 7 LANGKAH                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  STEP 1 — FULL SOURCE SCAN (baca semuanya, catat semuanya)           ║
║  → Struktur folder · naming · extension · urutan import              ║
║  → Dependency: eksplisit DAN implisit (transitive)                   ║
║  → State: semua field, type, default value                           ║
║  → Styling: className · CSS vars · inline · breakpoint               ║
║  → Behavior: event · keyboard · gesture · debounce timing            ║
║  → API: endpoint · method · payload · response · status              ║
║  → Lifecycle: mount · update · unmount · error boundary              ║
║  ⛔ STOP jika tidak jelas → TANYA, jangan berasumsi                  ║
║                                                                      ║
║  STEP 2 — DEPENDENCY MAPPING                                         ║
║  → Daftar semua dep; mana sudah ada di target; mana perlu tambah     ║
║  → Verifikasi versi: major version HARUS sama                        ║
║  → Dep hilang → REPORT ke user, jangan improvise                     ║
║                                                                      ║
║  STEP 3 — CLONE MANIFEST (sebelum satu baris kode)                   ║
║  → Tulis: [FILE] → [FUNGSI] → [STATE] → [EVENT] → [OUTPUT]          ║
║  → Checklist wajib di Step 6 — setiap item harus bisa di-centang    ║
║                                                                      ║
║  STEP 4 — REPLICA EXECUTION (tulis, jangan kreatif)                  ║
║  → Naming: IDENTIK — jangan rename "karena lebih baik"               ║
║  → Struktur: IDENTIK — jangan reorganisasi                           ║
║  → CSS: class · nilai · urutan property — IDENTIK                    ║
║  → Logic: alur · kondisi · error handling — IDENTIK                  ║
║  ⛔ STOP jika logika ambigu → konfirmasi dulu                         ║
║                                                                      ║
║  DILARANG KERAS:                                                     ║
║  ❌ "Saya improve sedikit"       ❌ Tambah fitur tidak ada di source  ║
║  ❌ Ubah struktur "lebih rapi"   ❌ Rename "lebih semantik"           ║
║  ❌ Hapus console.log/komentar   ❌ Ganti library "lebih baru"        ║
║  ❌ Tambah TS type yang tidak ada di source                           ║
║                                                                      ║
║  STEP 5 — FUNCTIONAL VERIFICATION                                    ║
║  → Happy path · edge cases (empty/null/max/error) · side effects     ║
║  → Lifecycle timing · debounce/throttle durasi — identik?            ║
║                                                                      ║
║  STEP 6 — DIFF VERIFICATION (WAJIB)                                  ║
║  → Manifest Step 3 vs hasil Step 4: semua ter-centang?               ║
║  → UI · logic · API shape · timing — identik?                        ║
║  → TARGET: 0 perbedaan fungsional                                    ║
║  → Setiap delta HARUS didokumentasikan dengan alasan jelas            ║
║                                                                      ║
║  STEP 7 — DELTA REPORT (output wajib)                                ║
║  ✅ IDENTIK : daftar komponen/fungsi 1:1                             ║
║  ⚠️ DELTA  : perbedaan → alasan → disetujui user? (Y/N)             ║
║  ❓ UNKNOWN : perlu konfirmasi                                        ║
║  📊 DIFF SCORE: persentase keberhasilan clone                        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Tipe Mutasi (setelah clone — dengan persetujuan eksplisit)

| Tipe | Scope | Risk | Approach |
|------|-------|------|----------|
| Surgical | 1 fungsi/baris | Sangat rendah | str_replace tepat |
| Ripple | 1 modul + consumers | Sedang | Update core → semua import |
| Architectural | Pola/layer/kontrak | Tinggi | Staged migration + konfirmasi |
| Cosmetic | Style/naming | Sangat rendah | Automated rename/prettier |

---

## 🔬 ANALISIS KOMPREHENSIF — 7 LAPIS

> Aktifkan saat: `@analisis`, review menyeluruh, evaluasi sistem/kode/arsitektur.

```
L1 SURFACE SCAN  → baca semua; peta komponen + dependency graph
L2 INTENT        → tujuan sebenarnya; gap requirement; asumsi tersembunyi
L3 DEPENDENCY    → siapa bergantung apa; circular; tight coupling; hidden dep
L4 RISK & EDGE   → failure modes; null/empty/max/concurrent/offline/race
L5 QUALITY       → naming konsisten; DRY; dead code; orphan file; type safety
L6 STRATEGIC     → scalable 10×? tech debt kapan meledak? arsitektur alternatif?
L7 SYNTHESIS     → CRITICAL→HIGH→MEDIUM→LOW; quick wins <1j; roadmap + effort
```

**Output:**
```
📊 SKOR [0-100]: kode / arsitektur / keamanan / performa / maintainability
🔴 CRITICAL: fix SEKARANG    🟠 HIGH: sprint ini
🟡 MEDIUM: backlog           🟢 LOW: nice-to-fix
⚡ QUICK WINS: [<1 jam, dampak langsung]
🗺️ ROADMAP: [urutan perbaikan dengan dependency yang benar]
```

---

## 🔍 DEEP SCAN AUDIT — 9 FASE

> Aktifkan saat: `@audit`, security review, pre-launch, post-incident.
> ATURAN: tidak ada fase yang dilewati.

**Severity:**
```
💀 CRITICAL → Fix sekarang, block deploy
🔴 HIGH     → Fix dalam 24 jam
🟠 MEDIUM   → Fix dalam sprint
🟡 LOW      → Fix saat menyentuh file
⚪ INFO     → Backlog
```

**Fase 1 Static Code:** Dead code · circular dep · duplicate >5 baris · magic number · function >50 baris · naming inkonsisten · `any` implisit

**Fase 2 Dependency:** CVE scan · outdated major · ghost dep · bundle weight · license · .env.example

**Fase 3 Security (OWASP Top 10):**
```
A01 Broken Access Control → auth + authz setiap endpoint?
A02 Crypto Failures       → encrypt at rest + TLS in transit?
A03 Injection             → parameterized query + Zod semua input?
A04 Insecure Design       → threat model + rate limiting?
A05 Misconfiguration      → debug off? error detail tidak ke client?
A07 Auth Failures         → brute force protection?
A08 Integrity             → HMAC webhook + QR payload?
A10 SSRF                  → URL dari user → whitelist dulu?
+ Hardcoded secrets · JWT · MIME upload · XSS/CSP · CSRF · IDOR · RLS
```

**Fase 4 Performance:** N+1 · EXPLAIN ANALYZE · missing index · bundle split · cache · memory leak · payload >50KB · CDN

**Fase 5 Logic:** Rules sesuai requirement · edge cases · concurrent conflict · transaction rollback · stub lolos · timezone UTC

**Fase 6 Offline & Resilience:** SW cache strategy · IDB migration · sync queue · conflict resolution · error boundary · circuit breaker

**Fase 7 Compatibility:** Browser (Chrome/FF/Safari/Edge) · viewport 320px–1920px · touch ≥44px · keyboard · screen reader · contrast ≥4.5:1 · test 3G

**Fase 8 Regulatory (Indonesia):**
```
UU PDP No.27/2022  → NIK/KK/WA/email encrypt + TLS
Permendagri 20/2018 → format surat + SLA pelayanan
Data minimization  → hanya kumpul yang dibutuhkan
Audit log          → immutable; tidak bisa dihapus user
NIK publik         → mask "3273****1234"
Right to erasure   → mekanisme hapus atas permintaan
```

**Fase 9 Architecture:** Coupling · API versioning · schema deprecated · ADR up-to-date · TODO/FIXME inventory · bottleneck 10× · observability <5 menit

**Output:**
```
══════════════════════════════════════════════════════
  DEEP SCAN — [Proyek] · [Tanggal] · Fase: 9/9
══════════════════════════════════════════════════════
  💀[N] 🔴[N] 🟠[N] 🟡[N] ⚪[N]
  [Per temuan]: ID | Severity | Lokasi | Masalah | Bukti | Fix | Verify
══════════════════════════════════════════════════════
  SKOR: [0-100] | ✅ SEHAT / ⚠️ PERHATIAN / 🚨 BAHAYA
```

---

## 🎯 KLASIFIKASI FITUR (PORTAL DESA)

```
🔴 ESSENTIAL  — Wajib ada; tanpa ini portal TIDAK layak
🟡 IMPORTANT  — Penting tapi sistem masih jalan tanpanya
🟢 NICE-TO-HAVE — Tidak fatal jika dihapus
⚫ REMOVE     — Hardcoded/stub/tidak ada backend → HAPUS, tidak ada halfway
```

### Status Route Aktual

```
✅ FUNCTIONAL:
  PUBLIC : / · /informasi/* · /laporan/apbdes · /pelayanan/* · /verifikasi/$no
           /profil/desa · /profil/perangkat · /lainnya/* · /masuk/*
  ADMIN  : Dashboard · Template Surat · Monitoring · Arsip · Penduduk
           Konten · Hero Settings · Audit Log · Pengaturan

⚫ REMOVE: /laporan/realisasi · /ekonomi/bumdes · /wisatas/* · /lainnya/peta

🟡 UPGRADE: /profil/bpd · /profil/lpm · /profil/karangtaruna · /profil/pkkrw
  → lembaga_desa + struktur_lembaga + pengurus_lembaga

🆕 TAMBAHKAN:
  /laporan/realisasi     → APBDes Realisasi (migration 017 sudah ada)
  /satu-data             → Dashboard Transparansi (composite store yang ada)
  /profil/surat-keputusan → SK Desa (tabel baru surat_keputusan)
  api/export/{type}      → Export PDF + CSV
```

### Decision Tree

```
Tambah? → Tabel ada? → Offline? → Public/private? → Auth? → Ada pola mirip?
Hapus?  → Stub/hardcoded? → HAPUS | Berguna nanti? → Buat tabel+store dulu

Debug?
  Hero tidak tampil  → getHeroConfig() → bg_type → video/image
  Marquee kosong     → marquee_lines[] → enabled + text.trim()
  Setting reset      → isStoreLocked() → Supabase table ada?
  Video gagal upload → bucket MIME types → migration 030
```

---

## 🗄️ POLA DATA WAJIB — OFFLINE-FIRST (4 LAPISAN)

```typescript
// WRITE (berurutan, semua lapisan):
_data = {..._data, ...patch}       // L1: module state (instant)
_sync(_data)                       // L2: Zustand → re-render
await idbPut("key", _data)         // L3: IndexedDB (persist lokal)
supabase.upsert(...).catch(log)    // L4: cloud (async, non-blocking)

// READ: getXxxConfig() → _data.xxx      (sync, instant)
// REACT: useStore((s) => s.xxx)         (Zustand selector, reactive)
// RULES: 1 store per tabel · _data = SSOT · sync on reconnect
```

**IDB Key:** `hero_config = UUID "00000000-…-000000000001"` — bukan string `"hero_config"`

**RLS:** Semua `TO public` · anon key di browser · service role HANYA di Edge Functions

**Auth:** `can("surat.verify")` dari roles.ts — TIDAK BOLEH hardcode role string

**DNA Clause:** `{{nama_desa}}` bukan `{{desa}}` · `{{nama_kecamatan}}` bukan `{{kecamatan}}`

---

## 🔒 KEAMANAN & TRANSPARANSI

```
VALIDASI 3 LAPIS: Client (Zod+RHF) → Edge Function (Zod) → PostgreSQL (CHECK/NOT NULL)
ERROR: "NIK tidak ditemukan" ✅ | "column nik does not exist" ❌ (expose SQL)

PUBLIK: Berita · Pengumuman · APBDes · Statistik (NIK dimask) · Tracking surat
        Komoditas · IDM · Profil lembaga · SK Desa
PRIVAT: NIK/KK/alamat · Surat detail · Draft · Audit log · Pengaduan+pemohon

SECURITY: JWT 15m+refresh · HMAC QR payload · MIME validate server-side
          DOMPurify+CSP · Rate limiting · Soft delete · CORS whitelist
```

---

## 🚀 FITUR PRIORITAS — GAP KRITIKAL

**P1 APBDes Realisasi** → `apbdes_realisasi` (migration 017) + store + public rencana vs realisasi + download PDF/CSV

**P2 Satu Data Dashboard** `/satu-data` → aggregate store yang ada (penduduk/APBDes/IDM/surat/pengaduan/komoditas) + export PDF

**P3 SK Desa** → tabel `surat_keputusan` + store + admin upload PDF + public daftar + download

**P4 Export** → `api/export/{type}` · pakai `api/generate-pdf.ts` yang ada · CSV = plain string + Content-Disposition

**P5 Lembaga Data-Driven** → `lembaga-store.ts` yang ada · dynamic `/profil/{slug}` · LembagaManager yang ada

---

## 🔌 AUTOFILL ENGINE & SMART AUTOMATION

```typescript
// Prioritas autofill cascade:
// 1. User history (top-5, debounce 300ms)
// 2. Master data (fuzzy search, limit 10)
// 3. Cascade fill: satu field → isi terkait otomatis
// 4. NIK Cascade: [0..5]=wilayah · [6]>3=Perempuan · [6..11]=tglLahir(+40 jika P)
// 5. AI suggestion (Ollama lokal / free tier)
// UI: ↑↓Enter·Esc · aria-autocomplete · touch-friendly
```

**Smart Automation:**
```
Trigger: event | cron | condition | webhook
Action:  email · whatsapp · update_field · call_api · generate_pdf · delay
Templates: laporan mingguan · notif surat >24j · backup 02:00 · OTP WA · cleanup log
UI: no-code builder · dry-run · execution log · pause/resume
```

---

## 🎛️ QUICK REFERENCE

```
╔══════════════════════════════════════════════════════╗
║            AI QUICK REFERENCE CARD                  ║
╠══════════════════════════════════════════════════════╣
║  WRITE:  _data → _sync → idbPut → supabase          ║
║  READ:   getXxx() → _data (instant)                 ║
║  REACT:  useStore((s) => s.xxx) selector             ║
║  IDB:    UUID key bukan string "hero_config"         ║
║  RLS:    TO public · anon key · service role=EF only ║
║  AUTH:   can("action") dari roles.ts                 ║
║  DNA:    {{nama_desa}} bukan {{desa}}                ║
║  INIT:   await initAllStores() di __root.tsx         ║
║  VIDEO:  resolveVideoUrl() bukan resolveImageUrl()   ║
║  ROUTE:  edit src/routes/*.tsx BUKAN routeTree.gen   ║
║  STORE:  satu store per Supabase table               ║
╚══════════════════════════════════════════════════════╝
```

| Command | Aksi |
|---------|------|
| `@build [fitur]` | Smart execution 12 langkah anti-error |
| `@clone [source]` | Precision clone 7-step · diff score 0 |
| `@audit [project]` | Deep scan 9 fase + severity matrix |
| `@analisis [target]` | Analisis komprehensif 7 lapis |
| `@fix [error]` | Root cause + prevent + verifikasi |
| `@crud [entity]` | Full CRUD + API + validasi 3 lapis |
| `@offline [fitur]` | Offline-first checklist |
| `@classify [fitur]` | Essential/Important/Nice/Remove |
| `@export [entity]` | Export CSV/PDF handler |
| `@autofill [form]` | Autofill + NIK cascade |
| `@adr [keputusan]` | Architecture Decision Record |
| `@stack [domain]` | Tech stack gratis + future-proof |

---

## 📚 DEBUG & CONSOLE LOG

```bash
# Log patterns: [hero] [esurat-store] [store-init] [settings-lock]
#               [idb] [media-upload] [wf] [satu-data]

# TypeScript 0 error:
npx tsc --noEmit

# ESLint 0 warning:
npm run lint

# Cek tabel:
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

# Cek hero config:
SELECT bg_type, marquee_enabled FROM public.hero_config;

# Cek bucket:
SELECT id, allowed_mime_types FROM storage.buckets WHERE id='public-media';

# IndexedDB (browser console):
indexedDB.databases().then(d => console.log(d))

# Settings lock:
JSON.parse(localStorage.getItem('seruni_settings_locked'))
```

---

## 📋 ADR — RIWAYAT KEPUTUSAN ARSITEKTUR

```
Format: [YYYY-XXX] Judul → Mengapa → Solusi → Trade-off
Kapan: hapus fitur · ganti pola · keputusan >1 modul · trade-off tidak obvious

2024-025: Penghapusan solid background → fokus image slider + video (migration 029)
2024-026: Settings lock triple-layer → fix HMR reset hero config ke mock
2024-027: Signal pattern (_data SSOT) → fix race condition blank screen
2024-028: resolveVideoUrl terpisah → logika video storage berbeda dari image
2024-029: Fitur STUB dihapus → tidak ada backend; buat proper jika dibutuhkan
2024-030: Priority gap kritikal → APBDes realisasi + satu data = compliance wajib
```

---

*Single source of truth untuk Portal Desa Seruni Mumbul dan Smart Web Engineering.*
*Setiap fitur baru → declare di bagian yang sesuai. Setiap fitur dihapus → declare + alasan.*