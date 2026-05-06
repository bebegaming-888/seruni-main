# PEDOMAN PENGEMBANGAN PROJECT

## Sistem Informasi Desa Seruni Mumbul

---

**Versi:** 1.2
**Tanggal:** 5 Mei 2026
**Status:** Pedoman Aktif — Menjadi acuan dalam setiap pengambilan keputusan dan eksekusi pengembangan
**Platform:** Web PWA → Aplikasi Mobile (Roadmap)

---

## BAGIAN 1: PRINSIP EKSEKUSI

Setiap kali mengerjakan sesuatu — baik itu fitur baru, perbaikan bug, atau tugas administratif — berlaku prinsip berikut:

```
┌─────────────────────────────────────────────────────────┐
│                 LANGKAH EKSEKUSI                         │
│                                                         │
│  1. KERJAKAN                                            │
│     → Fokus selesaikan task sampai selesai              │
│       sebelum loncat ke task lain                       │
│                                                         │
│  2. PERIKSA PROBLEM                                     │
│     → Setelah selesai, cek apakah ada yang              │
│       rusak, error, atau regressed elsewhere            │
│                                                         │
│  3. PERBAIKI JIKA DITEMUKAN                             │
│     → Langsung perbaiki sebelum lanjut                 │
│       — jangan bawa problem ke etapa berikutnya        │
│                                                         │
│  4. SETELAH SEMPURNA                                    │
│     → Baru declare selesai, commit, push               │
│       → Update checklist di dokumen ini               │
│                                                         │
│  5. NEXT STEP                                           │
│     → Tentukan langkah berikutnya,                    │
│       notasikan, lalu lanjutkan                        │
└─────────────────────────────────────────────────────────┘
```

### Detail Prinsip

**1. KERJAKAN**

- Pahami task sepenuhnya sebelum mulai coding
- Selesikan satu task sebelum memulai yang lain
- Jangan tinggalkan task setengah jadi (no half-done work)

**2. PERIKSA PROBLEM**

- Setelah task selesai, jalankan build/lint/typecheck
- Test manual alur utama di browser (minimal happy path)
- Cek apakah perubahan affect komponen lain (regression check)

**3. PERBAIKI JIKA DITEMUKAN**

- Error saat build → perbaiki sebelum lanjut
- Bug regresi ditemukan → perbaiki immediat
- Jika tidak bisa diperbaiki saat itu → catat dan tracking, jangan diabaikan

**4. SETELAH SEMPURNA**

- Task dianggap selesai HANYA jika: build passing + lint clean + no type error + manual test passed
- Update checklist terkait di dokumen ini (GOALS.md)
- Commit dengan pesan yang jelas (tidak generic)

**5. NEXT STEP**

- Setiap selesai task, tentukan next step secara eksplisit
- Catat di comment/commit message atau di task list
- Jangan diam — terus bergerak ke tahap berikutnya

---

## BAGIAN 2: GOALS — TUJUAN PROJECT

Goals ini adalah **arah strategis** yang menentukan prioritas kerja. Setiap fitur atau task yang dikerjakan harus bisa di-map ke salah satu goal di bawah.

---

### 🎯 GOAL 1: Demokratisasi Akses Pelayanan Publik

**Target:** Setiap warga Seruni Mumbul — termasuk yang di perantauan — dapat mengajukan surat dan mengakses informasi desa **kapan saja, di mana saja**, cukup dengan smartphone.

**Indikator Keberhasilan:**

- [ ] Warga dapat mengajukan 60+ jenis surat tanpa datang ke kantor desa
- [ ] Waktu rata-rata pengajuan surat ≤ 5 menit
- [ ] Status surat dapat dilacak secara real-time
- [ ] Notifikasi WA otomatis saat status surat berubah

**Relevansi Mobile-First:**
Seluruh alur pengajuan dirancang agar dapat diselesaikan di layar smartphone 4–6 inci. Formulir menggunakan input native (date picker, select, dll.) yang nyaman di sentuh jari.

---

### 🎯 GOAL 2: Efisiensi Administrasi Desa

**Target:** Mengurangi antrian di kantor desa, mempercepat waktu pemrosesan surat, dan mengeliminasi proses manual berbasis kertas (_paperless office_).

**Indikator Keberhasilan:**

- [x] Waktu pemrosesan surat terpendek: **1 hari kerja** (sebagian besar jenis surat)
- [x] Alur persetujuan 5 tahap berjalan otomatis berdasarkan role: Operator → Verifikator → Kepala Desa
- [x] Nomor surat dihasilkan secara otomatis oleh fungsi `generate_surat_number()` di Supabase
- [x] Log audit semua aksi tersimpan otomatis di tabel `audit_log` (via Edge Functions `send-wa.ts` dan `useSupabaseSync.ts`)

**Relevansi Mobile-First:**
Panel admin dirancang _responsive_ — perangkat desa (Kades, Operator, Verifikator) dapat memproses surat langsung dari smartphone saat di luar kantor.

---

### 🎯 GOAL 3: Transparansi & Akuntabilitas Publik

**Target:** Warga dapat mengakses laporan keuangan desa (APBDes), kinerja pemerintah desa, dan status pembangunan secara terbuka.

**Indikator Keberhasilan:**

- [ ] APBDes dan Realisasi Anggaran dipublikasikan secara daring
- [ ] Warga dapat melihat/memverifikasi keaslian surat secara online (via QR code)
- [ ] Berita, agenda, dan pengumuman desa tersedia secara real-time
- [ ] Data monografi desa dan IDM (Indeks Desa Membangun) terbuka untuk publik

**Relevansi Mobile-First:**
Halaman informasi dapat diakses tanpa login — warga cukup buka tautan dan scroll. Layout single-column di mobile memastikan keterbacaan optimal.

---

### 🎯 GOAL 4: Kemandirian Data & Keamanan

**Target:** Seluruh data warga dan surat dikelola secara terpusat di database Supabase dengan **Row Level Security (RLS)**, sehingga hanya pihak yang berwenang dapat mengakses data sensitif.

**Indikator Keberhasilan:**

- [x] Database Supabase (`supabase/migrations/001_core_schema.sql`) sudah berjalan di cloud
- [x] RLS policy membatasi akses berdasarkan role admin
- [x] Data penduduk aman dari akses publik (hanya NIK yang bisa di-lookup)
- [x] Service role key hanya tersedia di Edge Functions (Cloudflare Secrets), tidak pernah di-browser
- [x] Sync layer `useSupabaseSync.ts` write-behind (localStorage-first) — sudah di-wired ke komponen

**Relevansi Mobile-First:**
Aplikasi mobile native dapat terhubung ke Supabase secara aman menggunakan anon key + RLS — tidak perlu proxy server tambahan.

---

### 🎯 GOAL 5: Installability — Dari PWA Menuju Aplikasi Mobile

**Target:** Platform dapat "diinstal" di smartphone warga tanpa melalui Play Store atau App Store, serta memiliki jalur migrasi jelas menuju aplikasi mobile native (Android/iOS).

**Indikator Keberhasilan:**

| Tahap        | Status     | Target                                | Teknologi                      |
| ------------ | ---------- | ------------------------------------- | ------------------------------ |
| PWA Ready    | ✅ Sudah   | App shell installable dari browser    | manifest.json + Service Worker |
| PWA Polish   | ⏳ Planned | Push notification, offline mode penuh | Web Push API, IndexedDB        |
| Native Shell | 🔜 Planned | WebView wrapper (Capacitor)           | CapacitorJS                    |
| App Store    | 🔜 Planned | Publikasi ke Play Store & App Store   | Capacitor + env signing        |

---

## BAGIAN 3: ROADMAP PENGEMBANGAN

### Fase 1 — Fondasi ✅

- [x] Platform web PWA dengan E-Surat (60+ jenis surat)
- [x] Autentikasi admin berbasis role (Super Admin, Operator, Verifikator, Kepala Desa)
- [x] Alur persetujuan 5 tahap
- [x] WhatsApp notification via Edge Function (Fonnte)
- [x] PDF generation dengan QR code verifikasi
- [x] Konfigurasi Supabase + migrasi database
- [x] PWA manifest + Service Worker (offline-first)

### Fase 2 — Penguatan (2026 Q2)

- [x] Sinkronisasi localStorage ↔ Supabase — write-behind sync layer `useSupabaseSync.ts` sudah di-wired ke `Admin.tsx` dan `ESurat.tsx`
- [x] Wire Supabase Auth untuk login warga (NIK + OTP WA)
  - Edge functions: `/api/auth/request-otp` + `/api/auth/verify-otp`
  - Frontend: `src/lib/warga-auth.ts` + halaman `/masuk/warga`
  - Dev mode fallback: OTP "123456" tanpa Supabase
- [x] Push notification Web Push API (`src/lib/push-notif.ts` + Edge Function `/api/push/send`)
  - Service Worker handlers sudah ada di `public/sw.js`
  - DB table `push_subscriptions` (migration `004_push_subscriptions.sql`)
  - VAPID keys perlu di-set untuk production
- [x] Role-adaptive UI — menu item di admin panel disesuaikan berdasarkan role (`can()`)
  - `template.view`, `settings.manage` permissions ditambahkan ke `roles.ts`
  - Tab Template & Pengaturan disembunyikan untuk role yang tidak punya akses
- [x] Migrasi data penduduk mock ke Supabase tabel `warga`
  - Migration `005_migrate_warga.sql` (5 warga demo)
  - `lookupPenduduk()` sekarang coba Supabase dulu, fallback ke localStorage
  - `syncPendudukToSupabase()` untuk sinkronisasi dari settings
- [x] Endpoint verifikasi surat publik (berdasarkan nomor surat)
  - Edge Function `/api/verify-surat` → cek `surat_requests` di Supabase
  - Masking NIK & telepon di response publik
  - Fallback ke localStorage jika Supabase tidak configured
- [x] File attachment upload (lampiran KK, KTP, dll.) saat pengajuan surat
  - DB column `attachments` (migration `003_attachments.sql`)
  - UI upload di Step 4 E-Surat (maks 10 file, 5MB/file, base64 storage)
  - Sync ke Supabase via `useSupabaseSync.ts`
  - Review di Step 5 menampilkan daftar lampiran

### Fase 3 — Mobile App (2026 Q3)

- [ ] **Capacitor integration** — wrapping web app ke Android APK / iOS IPA
- [ ] Konfigurasi signing certificate (Keystore Google / Apple Developer)
- [ ] Push notification native (FCM untuk Android, APNs untuk iOS)
- [ ] SQLite local storage untuk offline-first di mobile
- [ ] Sensor native (kamera QR scanner, geolocation)
- [ ] Deep linking dari App Store / Play Store

### Fase 4 — Perluasan (2026 Q4+)

- [ ] Modul pengaduan dengan eskalasi otomatis
- [ ] Modul voting / rapat warga (e-democracy)
- [ ] Integrasi SID (Sistem Informasi Desa)省级/国家
- [ ] Laporan keuangan RW dan posyandu
- [ ] Marketplace BUMDes
- [ ] Multi-bahasa (Indonesia + Bahasa Sasak)

---

## BAGIAN 4: ARSITEKTUR TEKNIS

### Stack Teknologi

```
Frontend:    React 19 + TanStack Router + TanStack Query
Styling:     Tailwind CSS v4 (CSS-based, CSS variables)
UI:          Radix UI primitives + shadcn/ui-style
Forms:       React Hook Form + Zod
Backend:     Supabase (PostgreSQL + Auth + RLS)
Edge Fns:    Cloudflare Pages Functions (7 fungsi — lihat CLAUDE.md)
Sync Layer:  src/lib/useSupabaseSync.ts (localStorage-first write-behind; belum di-wired)
             Catatan: belum terhubung ke komponen; Supabase sync perlu diintegrasikan
Deployment:  Cloudflare Pages (Edge CDN)
Database:    Supabase Cloud (jnarzbkddjdrethfkxtn)
```

### Environment Variables — Jangan Salah Pasang

| Key                                   | Lokasi                           | Akses                                     |
| ------------------------------------- | -------------------------------- | ----------------------------------------- |
| `VITE_SUPABASE_URL`                   | `.env`                           | Browser (aman — publik)                   |
| `VITE_SUPABASE_ANON_KEY`              | `.env`                           | Browser (aman — RLS)                      |
| `SUPABASE_SERVICE_ROLE_KEY`           | `.dev.vars` / Cloudflare Secrets | Edge Functions ONLY                       |
| `FONNTE_API_KEY`                      | `.dev.vars` / Cloudflare Secrets | Edge Functions ONLY                       |
| `JWT_SECRET`                          | `.dev.vars` / Cloudflare Secrets | Edge Functions ONLY (wajib di production) |
| `VITE_FONNTE_KEY`                     | `.env`                           | Browser (mock fallback)                   |
| `VITE_ADMIN_USER` / `VITE_ADMIN_PASS` | `.env`                           | Browser                                   |

---

## BAGIAN 5: PRIORITAS FITUR

### Untuk Warga (Public)

| No  | Fitur                   | Urgensi   |
| --- | ----------------------- | --------- |
| 1   | Ajukan surat online     | 🔴 Tinggi |
| 2   | Lacak status surat      | 🔴 Tinggi |
| 3   | Verifikasi surat via QR | 🔴 Tinggi |
| 4   | Notifikasi WA otomatis  | 🟡 Sedang |
| 5   | Berita & pengumuman     | 🟢 Rutin  |

### Untuk Perangkat Desa (Admin)

| No  | Fitur                      | Urgensi   |
| --- | -------------------------- | --------- |
| 1   | Review & approve surat     | 🔴 Tinggi |
| 2   | Buat & edit template surat | 🔴 Tinggi |
| 3   | Dashboard statistik        | 🟡 Sedang |
| 4   | Audit log aktivitas        | 🟡 Sedang |
| 5   | Broadcast WA ke warga      | 🟢 Utama  |

---

## BAGIAN 6: KETENTUAN TEKNIS UMUM

### Konvensi Kode

- Gunakan `cn()` dari `src/lib/utils.ts` untuk menggabungkan kelas Tailwind (clsx + tailwind-merge) — **jangan gunakan** template literal untuk conditional classes
- shadcn/ui components di `src/components/ui/` — tambahkan via `npx shadcn@latest add`
- Style shadcn: `"new-york"` (dari `components.json`)
- Tailwind v4: design tokens di `@theme inline {}` di `src/styles.css` — **jangan buat** `tailwind.config.js`
- Route tree auto-generated: **jangan edit** `routeTree.gen.ts` secara manual

### Auth & Role

- Selalu gunakan `can("action")` dan `suratActionsFor()` / `templateActionsFor()` dari `src/lib/roles.ts` — **jangan hardcode** cek role
- Fixed admin account dari `VITE_ADMIN_USER`/`VITE_ADMIN_PASS` — tidak dapat dihapus atau direname
- Supabase client: cek `isSupabaseConfigured` sebelum digunakan — **jangan assume** client selalu ada

### Git & Commit

- Jangan commit `.env`, `.dev.vars`, atau file yang mengandung secrets
- Setiap commit harus mencerminkan satu logical change
- Pesan commit yang jelas: `[Goal-X] short description`

---

_Dokumen ini adalah pedoman aktif. Setiap selesai menyelesikan task, perbarui checklist yang relevan di dokumen ini._
