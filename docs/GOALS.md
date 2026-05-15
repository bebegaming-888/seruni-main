# PEDOMAN PENGEMBANGAN — Sistem Informasi Desa Seruni Mumbul

**Versi:** 1.6 | **Tanggal:** 11 Mei 2026 | **Status:** Pedoman Aktif  
**Platform:** Web PWA → Aplikasi Mobile | **Karakter:** Smart System · 100% Online · Zero Duplikasi

> **Panduan teknis lengkap** (stack, arsitektur, stores, migrations, keamanan, persistensi) ada di `CLAUDE.md`.  
> Dokumen ini fokus pada: Goals strategis, Roadmap, Prioritas fitur, dan Next step aktif.

---

**Changelog:**

- `v1.6` (11 Mei 2026) — Sinkronisasi dengan CLAUDE.md v1.9; update status sprint Mei + Juni 2026 (semua selesai); tambah aturan persistensi pengaturan admin; hapus duplikasi teknis (Bagian 0, 4, 8, 13) yang sudah ada di CLAUDE.md
- `v1.5` (10 Mei 2026) — AI Builder Protocol & Data Integration Standard; Smart System 100% Online
- `v1.4` (10 Mei 2026) — Goal 6 & 7; Monitoring; Aksesibilitas & SEO
- `v1.3` (10 Mei 2026) — APBDes & Monografi (mig. 017); halaman verifikasi publik; DNA engine fix
- `v1.2` — Lembaga Desa + Struktur Organisasi Dinamis (mig. 020–021); Warga Auth NIK+OTP
- `v1.1` — Sync layer `useSupabaseSync.ts`; push notification; role-adaptive UI
- `v1.0` — Fondasi: E-Surat 60+ jenis, auth, alur 5 tahap, WA notifikasi, PDF+QR

---

## BAGIAN 1: PRINSIP EKSEKUSI

**Urutan wajib setiap task:** KERJAKAN → PERIKSA → PERBAIKI → SEMPURNA → NEXT STEP

Task **selesai** HANYA jika: build passing + lint clean + no type error + manual test passed.  
Setelah selesai → update checklist di dokumen ini.

> Protokol lengkap AI Builder (anti-halusinasi, impact analysis, kategorisasi perintah) → `CLAUDE.md Bagian 0`.

---

## BAGIAN 2: GOALS — TUJUAN STRATEGIS

### 🎯 GOAL 1: Demokratisasi Akses Pelayanan Publik

Setiap warga Seruni Mumbul — termasuk yang di perantauan — dapat mengajukan surat dan mengakses informasi desa kapan saja, cukup dengan smartphone.

- [x] Warga dapat mengajukan 60+ jenis surat tanpa datang ke kantor desa
- [x] Waktu rata-rata pengajuan surat ≤ 5 menit
- [x] Status surat dapat dilacak secara real-time + notifikasi WA otomatis
- [x] DNA engine generic clause fix — 68+ jenis surat render tanpa `{{placeholder}}` rusak
- [x] Halaman verifikasi surat publik (`/verifikasi`, `/verifikasi/:no`) — cek keabsahan via nomor/QR
- [x] DB schema APBDes & Monografi (migration 017)
- [x] Estimasi waktu pemrosesan per jenis surat (`/api/surat/estimasi`, badge di `/pelayanan/monitoring`)
- [x] Modul pengaduan warga (`/pelayanan/pengaduan`, ticket MD-XXXX, eskalasi WA otomatis)

### 🎯 GOAL 2: Efisiensi Administrasi Desa

Mengurangi antrian kantor desa, mempercepat pemrosesan surat, dan eliminasi proses manual berbasis kertas.

- [x] Waktu pemrosesan terpendek: 1 hari kerja (sebagian besar jenis surat)
- [x] Alur persetujuan 5 tahap otomatis berdasarkan role: Operator → Verifikator → Kepala Desa
- [x] Nomor surat otomatis via `generate_surat_number()` — format `474/0001/KDS.SRMB/V/2026`
- [x] Log audit semua aksi tersimpan otomatis di `audit_log`
- [x] Cloud sync feedback (`cloudSynced: boolean`) di semua operasi sync
- [x] Smart decision engine — estimasi durasi pemrosesan dari data historis (✅ Mei 2026)
- [x] Export laporan — PDF (jsPDF) + Excel (xlsx): surat aktif, arsip, log audit (✅ Juni 2026)
- [x] Dashboard peringatan dini — `AlertPanel`: surat aged 3+ hari, NIK belum validasi (✅ Juni 2026)

### 🎯 GOAL 3: Transparansi & Akuntabilitas Publik

Warga dapat mengakses laporan keuangan desa, kinerja pemerintah, dan status pembangunan secara terbuka.

- [x] APBDes dan Realisasi Anggaran dipublikasikan daring (`/laporan/apbdes`)
- [x] Verifikasi keabsahan surat online via QR code (`/verifikasi`)
- [x] Berita, agenda, dan pengumuman desa real-time
- [x] Monografi desa dan IDM terbuka publik (`/lainnya/monografi`, `/informasi/idm`)
- [x] Modul pengaduan warga aktif — submit + lacak status (✅ Juni 2026)
- [ ] Voting warga / e-Democracy (Q4 2026)

### 🎯 GOAL 4: Kemandirian Data & Keamanan

Seluruh data warga dan surat dikelola terpusat di Supabase dengan RLS — hanya pihak berwenang yang dapat akses.

- [x] Supabase Cloud aktif + RLS policy per role di semua tabel
- [x] Data penduduk aman dari akses publik (hanya NIK yang bisa di-lookup)
- [x] Service role key hanya di Edge Functions (deployment secrets)
- [x] Single source of truth penduduk via `penduduk-store.getPendudukByNik()`
- [x] Rate limiting di semua edge functions — HTTP 429 + Retry-After (✅ Mei 2026)
- [x] Integrasi SIPPN/Kemendagri — validasi NIK online, cache 5 menit, fallback lokal (✅ Mei 2026)
- [x] **Persistensi pengaturan admin** — settings tidak kembali ke default saat refresh/HMR/deploy baru (✅ Mei 2026)
- [ ] CSP header di hosting provider (⚠️ belum dikonfigurasi)
- [ ] Backup terjadwal + Disaster Recovery Plan (Q3 2026)

### 🎯 GOAL 5: Installability — PWA Menuju Mobile

Platform dapat "diinstal" di smartphone warga tanpa Play Store, dengan jalur migrasi jelas ke native app.

| Tahap                 | Status     | Target                             | Teknologi                      |
| --------------------- | ---------- | ---------------------------------- | ------------------------------ |
| PWA Ready             | ✅ Selesai | App shell installable dari browser | manifest.json + Service Worker |
| Push Notification Web | ✅ Selesai | WA reminder proaktif via cron      | Fonnte + `_scheduled.ts`       |
| Native Shell          | 🔜 Q3 2026 | WebView wrapper Android/iOS        | CapacitorJS                    |
| App Store             | 🔜 Q3 2026 | Publikasi Play Store               | Capacitor + signing            |

### 🎯 GOAL 6: Pemberdayaan Ekonomi & Komunitas Digital

Platform menjadi ekosistem digital yang tidak hanya melayani administrasi, tapi menggerakkan perekonomian warga.

- [ ] Marketplace BUMDes — katalog produk UMKM + QRIS payment (Q4 2026)
- [ ] Modul e-Democracy — voting agenda desa, polling kebutuhan pembangunan (Q4 2026)
- [ ] Laporan keuangan RW & Posyandu — pelaporan mandiri per lembaga (Q4 2026)
- [ ] Multi-bahasa — Indonesia + Bahasa Sasak via `i18next` (Q4 2026)
- [ ] Direktori UMKM desa — profil usaha warga, akses publik tanpa login

### 🎯 GOAL 7: Keberlanjutan & Ketahanan Sistem

Sistem tetap berjalan, terawat, dan dapat dikembangkan jangka panjang — oleh tim yang berganti sekalipun.

- [ ] Uptime monitoring — UptimeRobot untuk domain produksi (⚠️ pending)
- [ ] Error tracking — integrasi Sentry free tier (⚠️ pending)
- [ ] Backup terjadwal — Supabase PITR aktif; backup mingguan ke cold storage
- [ ] Disaster recovery plan — prosedur pemulihan Supabase down (RTO < 4 jam)
- [ ] Dokumentasi pengguna — panduan singkat PDF/web untuk warga & perangkat desa
- [ ] Runbook operasional — prosedur deploy, rollback, reset password admin
- [ ] Onboarding developer baru — README + CONTRIBUTING.md, setup lokal < 30 menit

---

## BAGIAN 3: ROADMAP

### Fase 1 — Fondasi ✅

- [x] Platform web PWA + E-Surat 60+ jenis + alur persetujuan 5 tahap
- [x] Auth admin berbasis role (Super Admin, Operator, Verifikator, Kepala Desa)
- [x] WhatsApp notification via Edge Function (Fonnte) + PDF + QR code verifikasi
- [x] Supabase Cloud + migrations + PWA manifest + Service Worker

### Fase 2 — Penguatan (Q2 2026) ✅ Selesai

- [x] Sync layer `useSupabaseSync.ts` — write-behind + `cloudSynced` feedback
- [x] Warga Auth NIK + OTP WhatsApp (`request-otp` + `verify-otp` edge fn)
- [x] Push notification Web Push API + `push_subscriptions` table
- [x] Role-adaptive UI — menu berdasarkan `can()` dari `roles.ts`
- [x] Penduduk di Supabase tabel `warga` (migration 005, 79 batch warga real)
- [x] Lembaga Desa + Perangkat Desa dinamis dari DB (migrations 020–021)
- [x] Rate limiting semua edge functions (✅ Mei 2026)
- [x] Smart decision engine — estimasi durasi per jenis surat (✅ Mei 2026)
- [x] Push notification proaktif — WA reminder surat aged 3+ hari via cron (✅ Mei 2026)
- [x] Integrasi SIPPN/Kemendagri — validasi NIK online (✅ Mei 2026)
- [x] Dashboard peringatan dini `AlertPanel` (✅ Juni 2026)
- [x] Export laporan PDF + Excel (✅ Juni 2026)
- [x] Modul pengaduan warga — form + DB + eskalasi WA (✅ Juni 2026)
- [x] Dark mode full support — semua warna via CSS variables (✅ Juni 2026)
- [x] **Settings Lock System** — persistensi pengaturan admin survive refresh/HMR/deploy (✅ Mei 2026)

### Fase 3 — Mobile App (Q3 2026)

- [ ] Capacitor integration — Android APK, target Android 8.0+
- [ ] SQLite offline-first via Capacitor SQLite plugin
- [ ] Push notification native (FCM Android, APNs iOS)
- [ ] Deep linking dari Play Store
- [ ] Aksesibilitas audit — axe-core / Lighthouse ≥ 90

### Fase 4 — Perluasan (Q4 2026+)

- [ ] Marketplace BUMDes + QRIS payment
- [ ] Multi-bahasa Indonesia + Bahasa Sasak (`i18next`)
- [ ] Modul e-Democracy (voting agenda desa)
- [ ] Integrasi SID nasional
- [ ] Laporan keuangan RW & Posyandu
- [ ] Analytics dashboard — Umami self-hosted

---

## BAGIAN 4: PRIORITAS FITUR

### Untuk Warga (Publik)

| No  | Fitur                        | Urgensi     | Status     |
| --- | ---------------------------- | ----------- | ---------- |
| 1   | Ajukan surat online          | 🔴 Tinggi   | ✅ Selesai |
| 2   | Lacak status surat real-time | 🔴 Tinggi   | ✅ Selesai |
| 3   | Verifikasi surat via QR      | 🔴 Tinggi   | ✅ Selesai |
| 4   | Notifikasi WA otomatis       | 🟡 Sedang   | ✅ Selesai |
| 5   | Berita & pengumuman desa     | 🟢 Rutin    | ✅ Selesai |
| 6   | Pengaduan warga (MD-XXXX)    | 🟡 Sedang   | ✅ Selesai |
| 7   | Estimasi waktu selesai surat | 🟢 Tambahan | ✅ Selesai |
| 8   | Direktori UMKM desa          | 🟢 Tambahan | ⏳ Q4 2026 |

### Untuk Perangkat Desa (Admin)

| No  | Fitur                         | Urgensi        | Status     |
| --- | ----------------------------- | -------------- | ---------- |
| 1   | Review & approve surat        | 🔴 Tinggi      | ✅ Selesai |
| 2   | Buat & edit template surat    | 🔴 Tinggi      | ✅ Selesai |
| 3   | Dashboard statistik real-time | 🟡 Sedang      | ✅ Selesai |
| 4   | Audit log aktivitas           | 🟡 Sedang      | ✅ Selesai |
| 5   | Broadcast WA ke warga         | 🟢 Utama       | ✅ Selesai |
| 6   | Dashboard peringatan dini     | 🟡 Sedang      | ✅ Selesai |
| 7   | Export laporan PDF/Excel      | 🟡 Sedang      | ✅ Selesai |
| 8   | Rate limiting edge functions  | 🔴 Keamanan    | ✅ Selesai |
| 9   | Persistensi pengaturan admin  | 🔴 Stabilitas  | ✅ Selesai |
| 10  | Uptime monitoring             | 🟡 Operasional | ⚠️ Pending |
| 11  | Error tracking (Sentry)       | 🟡 Operasional | ⚠️ Pending |

---

## BAGIAN 5: SMART VILLAGE — VISI SISTEM

> _"Teknologi harus terasa seperti udara — tidak terasa, tapi selalu ada dan menopang kehidupan."_

Smart Village bukan sekadar otomatisasi — melainkan sistem yang:

- **Mengerti konteks** — data bergantung pada role, waktu, dan situasi
- **Mengurangi beban kognitif** — warga tidak perlu tahu alur birokrasi, sistem yang tahu
- **Bersahaja secara teknis** — tetap ringan di perangkat RAM 2GB, jaringan 3G

### Fitur Kecerdasan Aktif

| Fitur                 | Implementasi                                        | Status   |
| --------------------- | --------------------------------------------------- | -------- |
| Estimasi waktu surat  | `/api/surat/estimasi` dari historis per jenis       | ✅ Aktif |
| Reminder Verifikator  | Cron `_scheduled.ts` → WA jika surat > 3 hari       | ✅ Aktif |
| Peringatan dini admin | `AlertPanel` — surat aged, NIK belum validasi       | ✅ Aktif |
| Validasi NIK online   | SIPPN API + cache 5 menit + fallback lokal          | ✅ Aktif |
| Autofill cerdas       | Input NIK → auto-isi 12 field dari `penduduk-store` | ✅ Aktif |
| Persistensi settings  | Lock system IDB + localStorage survive refresh/HMR  | ✅ Aktif |

### Integrasi Eksternal (Roadmap)

| Sistem             | Tujuan                   | Status             |
| ------------------ | ------------------------ | ------------------ |
| SIPPN / Kemendagri | Validasi NIK + KK online | ✅ Fase awal aktif |
| Pusdatin Kemenkeu  | Data APBDes / Dana Desa  | 🔜 Q4 2026         |
| BPJS Kesehatan     | Validasi peserta jaminan | 🔜 Q4 2026         |
| BPS / Datasets     | Statistik kependudukan   | 🔜 Q4 2026         |

### UX Warga — Prinsip Ramah

- Label form bahasa Indonesia sehari-hari — bukan istilah teknis
- Placeholder dengan contoh nyata: `"cth: Nusa Tenggara Barat"`
- Error message actionable: "NIK tidak ditemukan — hubungi kantor desa" (bukan error raw)
- Empty state selalu ada konteks + aksi: jangan tampilkan layar kosong tanpa penjelasan
- Setiap error punya minimal satu opsi recovery

### Standar Device & Performa

| Parameter     | Target          | Solusi                                     |
| ------------- | --------------- | ------------------------------------------ |
| TTI           | < 3 detik di 3G | Code splitting per route, lazy load        |
| LCP           | < 2.5 detik     | Compress hero image, lazy load below-fold  |
| CLS           | < 0.1           | `aspect-ratio` + `min-height` untuk gambar |
| RAM minimum   | 1GB             | No memory leak, code splitting             |
| Layar minimum | 320px           | Mobile-first, single column                |

---

## BAGIAN 6: MONITORING & SEO

### Monitoring Aktif

- **Frontend errors:** Sentry / Axiom — uncaught exception + React error boundary
- **Edge fn logging:** log terstruktur ke Supabase `error_log` (severity, message, request_id)
- **Uptime:** UptimeRobot / BetterStack, interval 5 menit, alert downtime > 5 menit (**⚠️ belum setup**)
- **Performance:** Core Web Vitals via Google Search Console; Lighthouse CI tiap deploy
- **Analytics:** Plausible / Umami self-hosted — **bukan Google Analytics** (data warga tidak ke pihak ketiga)
- **JANGAN log PII** (NIK, no HP) di error message — gunakan ID anonim

### SEO & Aksesibilitas

- Target: **WCAG 2.1 AA** — kontras ≥ 4.5:1, keyboard nav, screen reader
- `sitemap.xml` otomatis semua route publik; `robots.txt` blokir `/admin`, `/api`
- Structured data JSON-LD di halaman berita dan profil desa
- `<html lang="id">` di semua halaman

---

## BAGIAN 7: NEXT STEP AKTIF

### ✅ Sprint Mei 2026 — Selesai Semua

- [x] Rate limiting — `functions/_lib/rate-limit.ts` + 9 edge functions
- [x] Smart decision engine — `/api/surat/estimasi` + badge estimasi di monitoring
- [x] Push notification proaktif — cron `_scheduled.ts` setiap 6 jam, WA ke Verifikator
- [x] Integrasi SIPPN — `/api/sippn/validate-nik`, cache 5 menit, fallback lokal
- [x] Settings Lock System — persistensi pengaturan admin (Bagian 2.6 CLAUDE.md)

### ✅ Juni 2026 — Selesai Semua

- [x] Dashboard peringatan dini — `AlertPanel` (surat aged, NIK belum validasi)
- [x] Export laporan — PDF (jsPDF) + Excel (xlsx) di admin dashboard
- [x] Modul pengaduan — `/pelayanan/pengaduan`, eskalasi WA, ticket MD-XXXX
- [x] Dark mode full support — semua warna via CSS variables

### ⚠️ Pending — Harus Diselesaikan

- [ ] **Uptime monitoring** — setup UptimeRobot untuk domain produksi (estimasi: 1 jam)
- [ ] **Error tracking** — integrasi Sentry free tier (estimasi: 2–3 jam)
- [ ] **CSP header** — konfigurasi di hosting provider (estimasi: 1–2 jam)

### 🗓️ Q3 2026 — Mobile App

- [ ] Capacitor integration — Android APK (Android 8.0+)
- [ ] SQLite offline — Capacitor SQLite plugin
- [ ] Push notification native — FCM (Android), APNs (iOS)
- [ ] Deep linking dari Play Store
- [ ] Aksesibilitas audit — axe-core / Lighthouse ≥ 90
- [ ] Backup database terjadwal + Disaster Recovery Plan

### 🔭 Q4 2026 & Beyond

- [ ] Marketplace BUMDes (katalog + QRIS)
- [ ] Multi-bahasa Indonesia + Bahasa Sasak (`i18next`)
- [ ] Modul e-Democracy (voting agenda desa)
- [ ] Integrasi SID nasional
- [ ] Laporan keuangan RW & Posyandu
- [ ] Analytics dashboard — Umami self-hosted

---

## LAMPIRAN: REFERENSI CEPAT

### Dokumen Terkait

| Dokumen                | Isi                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| `CLAUDE.md`            | Stack, arsitektur, stores, migrations, edge fn, keamanan, persistensi settings |
| `GOALS.md` (ini)       | Goals strategis, roadmap, prioritas, next step                                 |
| `supabase/migrations/` | History schema DB — urutan 001–022                                             |
| `src/lib/roles.ts`     | Role matrix + permission — acuan semua pengecekan akses                        |

### Perintah Utama

```bash
npm run dev          # Development server
npm run build        # Production build
npx tsc --noEmit     # TypeScript check — ZERO error sebelum push
npx supabase db push # Push migration ke cloud
```

### Konvensi Commit

- Format: `[Goal-X] deskripsi singkat`
- JANGAN commit `.env`, `.dev.vars`, atau file yang mengandung secrets

---

_Dokumen aktif — update checklist setiap task selesai._  
_Sinkronkan dengan `CLAUDE.md` setiap ada perubahan arsitektur signifikan._  
_Versi: v1.6 · 11 Mei 2026_
