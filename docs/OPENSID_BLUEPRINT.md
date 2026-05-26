# Blueprint Sistem E-Government Desa — OpenSID-Inspired

## Seruni Mumbul Village E-Government System

**Versi: 1.0 — 23 Mei 2026**
**Reference: OpenSID Premium (rilis-premium) + OpenDK**
**Status: Planning**

---

## 1. Executive Summary

### Visi

Membangun sistem informasi desa yang memenuhi standar **OpenSID** — open-source village information system yang dipakai 16.000+ desa di Indonesia — dengan teknologi modern (React 19, TanStack Start, Zustand, Supabase), offline-first architecture, dan UI/UX yang lebih modern.

### Cakupan Fitur OpenSID yang Sudah Dibangun (Seruni Mumbul ✅)

- E-Surat lengkap dengan 74 jenis surat (configurable layouts)
- Letter Layout Editor (kop, title, pembuka, subject, body, closing, signature, qr, footer)
- CRUD Perangkat Desa
- CRUD Wilayah (Provinsi → Kabupaten → Kecamatan → Desa hierarchy)
- Manajemen Penanda Tangan & Alasan Penolakan
- CMS (Berita, Pengumuman, Agenda, Galeri)
- Monitoring & Approval workflow
- WhatsApp Notification (Fonnte)
- Auth: Admin HMAC + Warga OTP
- QR Code verification untuk surat
- Leaflet Map
- Offline-first dengan IndexedDB

### Cakupan Fitur OpenSID yang Akan Dibangun (Roadmap)

Target: **85% feature coverage OpenSID** dalam 3 fase implementasi.

---

## 2. Gap Analysis — Apa yang Belum vs OpenSID

| Modul OpenSID                  | Status                   | Prioritas |
| ------------------------------ | ------------------------ | --------- |
| **Keuangan APBDes**            | ❌ Belum ada             | 🔴 HIGH   |
| **Buku Agenda Surat**          | ❌ Belum ada             | 🔴 HIGH   |
| **Pengaduan / SIKEMA**         | ❌ Belum ada             | 🔴 HIGH   |
| **Layanan Mandiri Warga**      | ❌ Belum ada             | 🔴 HIGH   |
| **Statistik Kependudukan**     | ❌ Belum ada             | 🔴 HIGH   |
| **Inventaris Desa**            | ❌ Belum ada             | 🟡 MEDIUM |
| **Pembangunan (RPJMDes/RKP)**  | ❌ Belum ada             | 🟡 MEDIUM |
| **Bantuan Sosial**             | ❌ Belum ada             | 🟡 MEDIUM |
| **Kelompok Masyarakat**        | ⚠️ Parsial (lembaga ada) | 🟡 MEDIUM |
| **Peraturan Desa**             | ❌ Belum ada             | 🟡 MEDIUM |
| **IDM / SDGs Monitoring**      | ⚠️ Ada halaman statis    | 🟡 MEDIUM |
| **Kehadiran Perangkat**        | ❌ Belum ada             | 🟢 LOW    |
| **Klasifikasi Surat extended** | ⚠️ Basic ada             | 🟢 LOW    |
| **Dusun/RW/RT Management**     | ❌ Belum ada             | 🟢 LOW    |
| **Anjungan Mandiri (Kiosk)**   | ❌ Belum ada             | 🟢 LOW    |
| **SMS Gateway**                | ❌ Belum ada             | 🟢 LOW    |

---

## 3. Arsitektur Database — Semua Tabel Baru

### Overview

```
public.keuangan      — APBDes entries (income/expense ledger)
public.keuangan_category  — Chart of Accounts (COA)
public.keuangan_report    — Generated monthly reports
public.surat_agenda       — Outgoing/incoming letter registry
public.pengaduan          — Complaint submissions
public.pengaduan_category  — Complaint categories
public.pengaduan_response  — Complaint responses/resolution
public.inventaris          — Village asset inventory
public.inventaris_category — Asset categories
public.pembangunan         — Development projects (RPJMDes/RKP)
public.pembangunan_activity — Project activity logs
public.bantuan             — Social assistance programs
public.bantuan_recipients  — Assistance recipients
public.kelompok            — Community groups
public.kelompok_member     — Group members
public.peraturan            — Village regulations
public.peraturan_category   — Regulation types
public.statistik           — Population statistics snapshots
public.kehadiran           — Staff attendance records
public.dusun               — Hamlet (dusun) management
public.rw                  — RW management
public.rt                  — RT management
public.warga_service       — Citizen self-service requests (track their own)
```

---

## 4. Fase 1 — HIGH PRIORITY (Bulan 1)

### 4.1 Keuangan APBDes (Village Budget)

**Kebutuhan OpenSID:**

- Input data keuangan manual (pendapatan, belanja)
- COA (Chart of Accounts) yang configurable
- Laporan bulanan (LPJ APBDes)
- Laporan semester & tahun buku
- Ringkasan kas (cash book)

**Database Schema:**

```sql
-- Chart of Accounts (COA)
create table if not exists public.keuangan_coa (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  type            text not null check (type in ('income', 'expense', 'asset', 'liability')),
  name            text not null,
  parent_code     text,
  position        smallint not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- APBDes Ledger
create table if not exists public.keuangan (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  month           smallint not null,
  coa_code        text not null,
  type            text not null check (type in ('income', 'expense')),
  amount          numeric(18, 0) not null,
  description     text,
  reference       text,
  is_realisasi    boolean not null default false,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- Budget Plan (Rencana APBDes)
create table if not exists public.keuangan_plan (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  coa_code        text not null,
  planned_amount  numeric(18, 0) not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (year, coa_code)
);

-- Monthly/Annual Reports
create table if not exists public.keuangan_report (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  month           smallint,
  type            text not null check (type in ('monthly', 'semester', 'annual')),
  title           text not null,
  content         jsonb not null,
  generated_at    timestamptz not null default now(),
  generated_by    uuid
);
```

**API Endpoints:**

```
GET    /api/keuangan/coa              — List COA accounts
POST   /api/keuangan/coa              — Create COA
GET    /api/keuangan/entries          — List ledger entries (?year=2026)
POST   /api/keuangan/entries          — Create entry
GET    /api/keuangan/plan             — Get budget plan (?year=2026)
PUT    /api/keuangan/plan             — Update budget plan
GET    /api/keuangan/report/monthly   — Get monthly report (?year=2026&month=5)
POST   /api/keuangan/report/generate  — Generate monthly/semester report
GET    /api/keuangan/ringkasan        — Cash summary (?year=2026)
```

**Frontend Components:**

- `KeuanganDashboard.tsx` — Main dashboard dengan ringkasan kas
- `CoaManager.tsx` — COA management (CRUD)
- `KeuanganEntry.tsx` — Form input transaksi
- `KeuanganReport.tsx` — Report viewer
- `KeuanganPlan.tsx` — Budget planning form

**Status UI:**

```
Admin → Pengaturan → Keuangan
├── Ringkasan Kas (saldo, total income, total expense)
├── Input Transaksi
├── Laporan Bulanan (generateable PDF)
├── Laporan Semester
└── Laporan Tahun Buku
```

---

### 4.2 Buku Agenda Surat (Letter Registry)

**Kebutuhan OpenSID:**

- Buku Agenda Surat Keluar (outgoing letter log)
- Buku Agenda Surat Masuk (incoming letter log)
- Nomor surat dengan format registry
- Kategori surat (biasa, rahasia, penting)
- Tanggal kirim/terima

**Database Schema:**

```sql
create table if not exists public.surat_agenda (
  id              uuid primary key default gen_random_uuid(),
  surat_request_id uuid,
  direction       text not null check (direction in ('outgoing', 'incoming')),
  nomor_agenda    text not null unique,
  tanggal         date not null,
  kode_surat      text,
  perihal         text,
  kepada          text,
  asal_surat      text,
  keterangan      text,
  file_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);
```

**API Endpoints:**

```
GET    /api/surat-agenda              — List agenda (?direction=outgoing&year=2026)
POST   /api/surat-agenda              — Create agenda entry
PUT    /api/surat-agenda/:id          — Update entry
GET    /api/surat-agenda/:id          — Get single entry
GET    /api/surat-agenda/report       — Generate agenda PDF (?year=2026&direction=outgoing)
```

**Frontend Components:**

- `SuratAgendaManager.tsx` — Main agenda viewer
- Tab: Surat Keluar | Surat Masuk
- Print agenda (Buku Agenda)

---

### 4.3 Pengaduan (Complaint System — SIKEMA-inspired)

**Kebutuhan OpenSID:**

- Submit pengaduan oleh warga (via warga portal)
- Kategori pengaduan
- Status tracking (Baru, Diproses, Selesai, Ditutup)
- Assign ke perangkat desa
- Attachments support
- Response/resolution tracking

**Database Schema:**

```sql
create table if not exists public.pengaduan_category (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  sla_days    smallint default 14,
  is_active   boolean not null default true,
  position    smallint not null default 0
);

create table if not exists public.pengaduan (
  id              uuid primary key default gen_random_uuid(),
  tracking_no     text unique not null,
  warga_nik       text,
  warga_name      text,
  warga_phone     text,
  category_id     uuid not null,
  subject         text not null,
  description     text not null,
  attachment_urls text[],
  status          text not null check (status in (' baru', 'diproses', 'selesai', 'ditutup')),
  priority        text check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to     uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  resolved_at     timestamptz
);

create table if not exists public.pengaduan_response (
  id              uuid primary key default gen_random_uuid(),
  pengaduan_id    uuid not null references public.pengaduan(id),
  response_by     uuid,
  response_text   text,
  status_from     text,
  status_to       text,
  created_at      timestamptz not null default now()
);
```

**API Endpoints:**

```
POST   /api/pengaduan/submit           — Warga: submit complaint (public, captcha)
GET    /api/pengaduan/track/:tracking  — Track complaint by tracking number (public)
GET    /api/pengaduan                  — Admin: list complaints (?status=diproses)
PUT    /api/pengaduan/:id              — Update complaint (assign, resolve)
POST   /api/pengaduan/:id/response     — Add response to complaint
GET    /api/pengaduan/categories       — List categories
```

**Frontend Components:**

- `PengaduanSubmit.tsx` — Submit form (for warga portal)
- `PengaduanTrack.tsx` — Track status page (public)
- `PengaduanManager.tsx` — Admin: manage complaints
- `PengaduanDetail.tsx` — Detail view with timeline

---

### 4.4 Layanan Mandiri Warga (Citizen Self-Service Portal)

**Kebutuhan OpenSID:**

- Warga login dengan OTP
- Track status surat mereka
- Submit layanan (surat, pengaduan, informasi)
- Lihat history pengajuan
- Update profil sendiri

**Database Schema:**

```sql
create table if not exists public.warga_service_request (
  id              uuid primary key default gen_random_uuid(),
  warga_nik       text not null,
  tracking_no     text unique not null,
  type            text not null check (type in ('surat', 'pengaduan', 'informasi')),
  related_id      uuid,
  status          text not null check (status in ('submitted', 'verified', 'approved', 'rejected', 'completed')),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz
);
```

**API Endpoints:**

```
POST   /api/warga/request/submit       — Submit service request
GET    /api/warga/request/track/:no    — Track by tracking number
GET    /api/warga/history              — Get warga's history (?nik=...)
```

**Frontend Pages:**

```
/masuk/warga          — Warga login
/masuk/pengajuan-saya — Track their requests
```

---

### 4.5 Statistik Kependudukan

**Kebutuhan OpenSID:**

- Dashboard analytics dengan chart
- Rekapitulasi jumlah penduduk
- Statistik berdasarkan: jenis kelamin, usia, pekerjaan, agama, pendidikan
- Pie chart, bar chart, line chart
- Export laporan

**Database Schema:**

```sql
create table if not exists public.statistik (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  month           smallint,
  category        text not null,
  metric          text not null,
  value           numeric not null,
  created_at      timestamptz not null default now(),
  unique (year, month, category, metric)
);
```

**API Endpoints:**

```
GET    /api/statistik/penduduk         — Population stats (?year=2026)
GET    /api/statistik/chart            — Chart data (?type=jk|usia|pekerjaan)
POST   /api/statistik/generate         — Generate/update stats snapshot
GET    /api/statistik/report           — Export report (?format=pdf|csv)
```

**Frontend Components:**

- `StatistikDashboard.tsx` — Main analytics dashboard
- Chart components: PieChart, BarChart, LineChart (via Recharts or Chart.js)
- `PendudukRekap.tsx` — Rekapitulasi table

---

## 5. Fase 2 — MEDIUM PRIORITY (Bulan 2)

### 5.1 Inventaris Desa

**Database Schema:**

```sql
create table if not exists public.inventaris_category (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  depreciation_rate smallint default 0,
  is_active   boolean not null default true
);

create table if not exists public.inventaris (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.inventaris_category(id),
  name            text not null,
  code            text unique,
  condition       text check (condition in ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  acquisition_date date,
  acquisition_value numeric(18,0),
  location        text,
  responsible      text,
  year_acquired    smallint,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);
```

**API Endpoints:**

```
GET    /api/inventaris                — List assets
POST   /api/inventaris                — Add asset
PUT    /api/inventaris/:id            — Update asset
DELETE /api/inventaris/:id            — Soft delete
GET    /api/inventaris/report         — Asset report
```

---

### 5.2 Pembangunan (RPJMDes / RKP)

**Database Schema:**

```sql
create table if not exists public.pembangunan (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('rpjmdes', 'rkp')),
  year            smallint not null,
  title           text not null,
  description     text,
  budget          numeric(18,0),
  location        text,
  start_year      smallint,
  end_year        smallint,
  status          text check (status in ('rencana', 'aktif', 'selesai', 'batal')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create table if not exists public.pembangunan_activity (
  id              uuid primary key default gen_random_uuid(),
  pembangunan_id  uuid references public.pembangunan(id),
  year            smallint not null,
  month           smallint,
  activity        text not null,
  realization     numeric(18,0),
  output          text,
  created_at      timestamptz not null default now()
);
```

**API Endpoints:**

```
GET    /api/pembangunan               — List projects
POST   /api/pembangunan               — Create project
GET    /api/pembangunan/:id           — Detail project
PUT    /api/pembangunan/:id           — Update project
GET    /api/pembangunan/:id/activities — Project activities
POST   /api/pembangunan/:id/activity  — Add activity
```

---

### 5.3 Bantuan Sosial

**Database Schema:**

```sql
create table if not exists public.bantuan (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  source          text,
  year            smallint not null,
  start_date      date,
  end_date        date,
  total_budget    numeric(18,0),
  recipient_count integer,
  status          text check (status in ('planning', 'active', 'completed')),
  created_at      timestamptz not null default now()
);

create table if not exists public.bantuan_recipient (
  id              uuid primary key default gen_random_uuid(),
  bantuan_id      uuid references public.bantuan(id),
  warga_nik       text not null,
  warga_name      text,
  amount          numeric(18,0),
  distribution_date date,
  notes           text,
  created_at      timestamptz not null default now()
);
```

---

### 5.4 Kelompok Masyarakat

**Database Schema:**

```sql
create table if not exists public.kelompok_category (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  name        text not null,
  is_active   boolean not null default true
);

create table if not exists public.kelompok (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.kelompok_category(id),
  name            text not null,
  leader_name     text,
  leader_phone    text,
  member_count    integer,
  established_date date,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
```

---

### 5.5 Peraturan Desa

**Database Schema:**

```sql
create table if not exists public.peraturan_category (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true
);

create table if not exists public.peraturan (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.peraturan_category(id),
  type            text check (type in ('peraturan', 'keputusan', 'pengumuman')),
  number          text,
  title           text not null,
  year            smallint,
  file_url        text,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
```

---

### 5.6 Laporan Bulanan

**Database Schema:**

```sql
create table if not exists public.laporan (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  month           smallint not null,
  type            text not null check (type in ('kegiatan', 'pertanggungjawaban', 'evaluasi')),
  title           text not null,
  content         jsonb not null,
  attachment_urls text[],
  created_by      uuid,
  status          text check (status in ('draft', 'published')),
  created_at      timestamptz not null default now()
);
```

**API Endpoints:**

```
GET    /api/laporan                   — List reports
POST   /api/laporan                   — Create report
GET    /api/laporan/:id               — Get report
PUT    /api/laporan/:id               — Update/publish report
GET    /api/laporan/print/:id         — Print report as PDF
```

---

## 6. Fase 3 — ADVANCED FEATURES (Bulan 3)

### 6.1 Kehadiran Perangkat

**Database Schema:**

```sql
create table if not exists public.kehadiran (
  id              uuid primary key default gen_random_uuid(),
  perangkat_id    uuid references public.perangkat_desa(id),
  date            date not null,
  status          text check (status in ('hadir', 'izin', 'sakit', 'alpha')),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (perangkat_id, date)
);

create table if not exists public.kehadiran_setting (
  id              uuid primary key default gen_random_uuid(),
  workday_start   time default '08:00',
  workday_end     time default '17:00',
  grace_minutes   smallint default 15,
  work_days       text[] default ARRAY['mon','tue','wed','thu','fri','sat']
);
```

---

### 6.2 IDM / SDGs Monitoring

**Database Schema:**

```sql
create table if not exists public.idm (
  id              uuid primary key default gen_random_uuid(),
  year            smallint not null,
  quarter         smallint,
  score           numeric(4,2) not null,
  category        text check (category in ('mandiri', ' maju', 'berkembang', 'tertinggal')),
  indicators      jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.sdgs_indicator (
  id              uuid primary key default gen_random_uuid(),
  goal_number     smallint not null check (goal_number between 1 and 17),
  target_number   smallint,
  indicator_code   text,
  description     text,
  current_value   numeric,
  target_value    numeric,
  year            smallint,
  updated_at      timestamptz
);
```

---

### 6.3 DBSN / RW / RT Management

**Database Schema:**

```sql
create table if not exists public.dusun (
  id              uuid primary key default gen_random_uuid(),
  kode            text unique not null,
  name            text not null,
  kepala_nama     text,
  kepala_phone    text,
  position        smallint not null default 0,
  is_active       boolean not null default true
);

create table if not exists public.rw (
  id              uuid primary key default gen_random_uuid(),
  dusun_id        uuid references public.dusun(id),
  kode            text unique not null,
  name            text not null,
  rw_number       text,
  posisi          text,
  position        smallint not null default 0,
  is_active       boolean not null default true
);

create table if not exists public.rt (
  id              uuid primary key default gen_random_uuid(),
  rw_id           uuid references public.rw(id),
  kode            text unique not null,
  name            text not null,
  rt_number       text,
  position        smallint not null default 0,
  is_active       boolean not null default true
);
```

---

## 7. API Design — Ringkasan Endpoint Baru

### Finance

```
GET    /api/keuangan/coa
POST   /api/keuangan/coa
GET    /api/keuangan/entries?year=&month=
POST   /api/keuangan/entries
PUT    /api/keuangan/entries/:id
DELETE /api/keuangan/entries/:id
GET    /api/keuangan/plan?year=
PUT    /api/keuangan/plan
GET    /api/keuangan/report/monthly?year=&month=
POST   /api/keuangan/report/generate
GET    /api/keuangan/ringkasan?year=
```

### Letter Agenda

```
GET    /api/surat-agenda?direction=&year=
POST   /api/surat-agenda
PUT    /api/surat-agenda/:id
GET    /api/surat-agenda/:id
GET    /api/surat-agenda/report?direction=&year=
```

### Complaints

```
POST   /api/pengaduan/submit
GET    /api/pengaduan/track/:tracking
GET    /api/pengaduan?status=&category=
PUT    /api/pengaduan/:id
POST   /api/pengaduan/:id/response
GET    /api/pengaduan/categories
GET    /api/pengaduan/dashboard  — Stats for admin
```

### Citizen Service

```
POST   /api/warga/request/submit
GET    /api/warga/request/track/:no
GET    /api/warga/history?nik=
GET    /api/warga/profile?nik=
PUT    /api/warga/profile
```

### Statistics

```
GET    /api/statistik/penduduk?year=
GET    /api/statistik/chart?type=
POST   /api/statistik/generate
GET    /api/statistik/report?format=
```

### Inventory

```
GET    /api/inventaris/categories
POST   /api/inventaris/categories
GET    /api/inventaris
POST   /api/inventaris
PUT    /api/inventaris/:id
DELETE /api/inventaris/:id
GET    /api/inventaris/report
```

### Development

```
GET    /api/pembangunan?type=&year=
POST   /api/pembangunan
GET    /api/pembangunan/:id
PUT    /api/pembangunan/:id
GET    /api/pembangunan/:id/activities
POST   /api/pembangunan/:id/activity
```

### Bantuan

```
GET    /api/bantuan
POST   /api/bantuan
PUT    /api/bantuan/:id
GET    /api/bantuan/:id/recipients
POST   /api/bantuan/:id/recipient
PUT    /api/bantuan/:id/recipient/:rid
```

### Reports

```
GET    /api/laporan?year=&month=&type=
POST   /api/laporan
PUT    /api/laporan/:id
GET    /api/laporan/print/:id
```

### Kehadiran

```
GET    /api/kehadiran?month=&year=
POST   /api/kehadiran
GET    /api/kehadiran/report?month=&year=
GET    /api/kehadiran/summary?month=&year=
```

### IDM/SDGs

```
GET    /api/idm?year=
POST   /api/idm
GET    /api/sdgs/indicators?goal=
PUT    /api/sdgs/indicators/:id
```

### Subdivisions

```
GET    /api/dusun
POST   /api/dusun
GET    /api/rw?dusun_id=
POST   /api/rw
GET    /api/rt?rw_id=
POST   /api/rt
```

---

## 8. Frontend Architecture — Pages & Components

### Admin Pages (new)

```
/admin → view="keuangan"
  └── KeuanganDashboard, CoaManager, KeuanganEntry, KeuanganReport, KeuanganPlan

/admin → view="agenda-surat"
  └── SuratAgendaManager, AgendaReport

/admin → view="pengaduan"
  └── PengaduanManager, PengaduanDetail

/admin → view="inventaris"
  └── InventarisManager, InventarisDetail

/admin → view="pembangunan"
  └── PembangunanManager, PembangunanDetail

/admin → view="bantuan"
  └── BantuanManager, BantuanRecipient

/admin → view="kelompok"
  └── KelompokManager

/admin → view="peraturan"
  └── PeraturanManager

/admin → view="laporan"
  └── LaporanManager, LaporanEditor

/admin → view="statistik"
  └── StatistikDashboard, ChartGenerator

/admin → view="kehadiran"
  └── KehadiranManager, KehadiranReport

/admin → view="idm-sdgs"
  └── IdmDashboard, SdgsTracker

/admin → view="dusun-rw-rt"
  └── SubdivisionManager
```

### Public/Warga Pages (new)

```
/pelayanan/pengaduan           — Submit complaint (public)
/pelayanan/track/:tracking    — Track complaint status
/pelayanan/layanan-mandiri     — Self-service portal
/masuk/warga                  — Warga login
/masuk/pengajuan-saya          — Track own requests
```

### Components (new)

```
Keuangan/
  ├── KeuanganDashboard.tsx
  ├── CoaManager.tsx
  ├── KeuanganEntry.tsx
  ├── KeuanganEntryForm.tsx
  ├── KeuanganReport.tsx
  ├── RencanaAPBDes.tsx
  └── RingkasanKas.tsx

Pengaduan/
  ├── PengaduanManager.tsx
  ├── PengaduanDetail.tsx
  ├── PengaduanStats.tsx
  └── PengaduanCategoryModal.tsx

Statistik/
  ├── StatistikDashboard.tsx
  ├── ChartPie.tsx
  ├── ChartBar.tsx
  ├── ChartLine.tsx
  └── PendudukRekap.tsx

Inventaris/
  ├── InventarisManager.tsx
  ├── InventarisForm.tsx
  └── InventarisReport.tsx

Pembangunan/
  ├── PembangunanManager.tsx
  ├── RpjmdesView.tsx
  ├── RkpView.tsx
  └── ActivityLog.tsx

Bantuan/
  ├── BantuanManager.tsx
  ├── BantuanForm.tsx
  └── RecipientList.tsx

Kelompok/
  ├── KelompokManager.tsx
  └── KelompokDetail.tsx

Peraturan/
  ├── PeraturanManager.tsx
  └── PeraturanViewer.tsx

Laporan/
  ├── LaporanManager.tsx
  ├── LaporanEditor.tsx
  └── LaporanPrint.tsx

AgendaSurat/
  ├── SuratAgendaManager.tsx
  ├── AgendaKeluar.tsx
  └── AgendaMasuk.tsx

Kehadiran/
  ├── KehadiranManager.tsx
  └── KehadiranCalendar.tsx

IDM/
  ├── IdmDashboard.tsx
  └── SdgsTracker.tsx

Subdivisi/
  ├── SubdivisionManager.tsx
  ├── dusunManager.tsx
  ├── RwManager.tsx
  └── RtManager.tsx
```

---

## 9. Technical Considerations

### Offline-First Support

Semua fitur baru harus mendukung offline:

- Zustand stores dengan IndexedDB persistence
- Queue offline submissions
- Sync on reconnect
- Conflict resolution untuk multi-device

### Mobile Responsive

- Semua komponen menggunakan Tailwind responsive classes
- Touch-friendly UI (min tap target 44px)
- Optimized untuk tablet (mode kiosk)

### PDF Generation

- Server-side Puppeteer untuk semua laporan
- Format template sesuai standar OpenSID
- Include village logo, signatures, QR codes

### Performance

- Lazy loading untuk component heavy
- Pagination untuk semua list views
- Virtual scrolling untuk long lists
- Cache API responses (5 min TTL)

### Security

- RLS policies untuk semua tabel baru
- HMAC-signed sessions untuk admin endpoints
- Rate limiting untuk public endpoints
- Input sanitization untuk XSS prevention

---

## 10. Migration & Seeding Scripts

### Seed Data Strategy

```javascript
// scripts/seed-keuangan-coa.cjs
// Seed default COA based on Permendes 4/2020
const COA_DATA = [
  // Pendapatan
  { code: "4.1", type: "income", name: "Pendapatan Asli Desa" },
  { code: "4.1.01", type: "income", name: "Hasil Usaha Desa" },
  { code: "4.1.02", type: "income", name: "Hasil Aset Desa" },
  { code: "4.1.03", type: "income", name: "Pajak & Retribusi" },
  { code: "4.1.04", type: "income", name: "Hasil民政" },
  { code: "4.2", type: "income", name: "Transfer" },
  { code: "4.2.01", type: "income", name: "Dana Desa" },
  { code: "4.2.02", type: "income", name: "Alokasi Dana Desa" },
  { code: "4.2.03", type: "income", name: "Bantuan Provinsi" },
  { code: "4.3", type: "income", name: "Lain-Lain Pendapatan" },

  // Belanja
  { code: "5.1", type: "expense", name: "Penyelenggaraan Pemerintahan Desa" },
  { code: "5.2", type: "expense", name: "Pelaksanaan Pembangunan Desa" },
  { code: "5.3", type: "expense", name: "Pembinaan Kemasyarakatan" },
  { code: "5.4", type: "expense", name: "Pelestarian Lingkungan Hidup" },
  { code: "5.5", type: "expense", name: "Pelayanan Kepada Masyarakat" },
  { code: "5.6", type: "expense", name: "Pembentukan Dana Cadangan" },
  { code: "5.7", type: "expense", name: "Pembayaran Hutang Desa" },
];
```

---

## 11. OpenSID Compliance Checklist

| Aspek              | Standar OpenSID                                                 | Status |
| ------------------ | --------------------------------------------------------------- | ------ |
| Format Nomor Surat | {klasifikasi}/{no_urut}/{singkatan_desa}/{bulan_romawi}/{tahun} | ✅     |
| Kop Surat          | PEMERINTAH KABUPATEN → KECAMATAN → DESA                         | ✅     |
| Tanda Tangan       | Kepala Desa + Pejabat berwenang                                 | ✅     |
| QR Verification    | {base_url}/verifikasi/{nomor_surat}                             | ✅     |
| Klasifikasi Surat  | Kode Perdes terbaru                                             | ✅     |
| APBDes Format      | Sesuai Permendes 4/2020                                         | 🔴     |
| Buku Agenda        | Format buku agenda OpenSID                                      | 🔴     |
| Statistic Format   | Rekapitulasi BIP-compliant                                      | 🔴     |
| IDM Indicators     | Indeks Desa Membangun terbaru                                   | 🔴     |
| SDGs 17 Goals      | Target SDGs Indonesia                                           | 🔴     |
| Letter Types       | 74 jenis surat sesuai Permendes                                 | ✅     |
| RPKMD/RJMDes       | Format RPJMDes 5 tahun                                          | 🔴     |

---

## 12. Timeline & Effort Estimate

| Fase       | Modul                     | Estimasi Effort |
| ---------- | ------------------------- | --------------- |
| **Fase 1** | Keuangan APBDes           | ~3 weeks        |
|            | Buku Agenda Surat         | ~1 week         |
|            | Pengaduan                 | ~2 weeks        |
|            | Statistik Kependudukan    | ~2 weeks        |
|            | Layanan Mandiri Warga     | ~1 week         |
| **Fase 2** | Inventaris                | ~1 week         |
|            | Pembangunan (RPJMDes/RKP) | ~2 weeks        |
|            | Bantuan Sosial            | ~1 week         |
|            | Kelompok Masyarakat       | ~1 week         |
|            | Peraturan Desa            | ~1 week         |
|            | Laporan Bulanan           | ~1 week         |
| **Fase 3** | Kehadiran                 | ~1 week         |
|            | IDM/SDGs                  | ~2 weeks        |
|            | Daven/RW/RT               | ~1 week         |
|            | Anjungan Mandiri UI       | ~2 weeks        |

**Total: ~22 weeks (~5.5 bulan)**

---

## 13. Next Steps — Immediate Actions

1. **Fase 1.1** — Build Keuangan APBDes module
   - Create migration files
   - Build API endpoints
   - Create admin UI
   - Test with sample data

2. **Fase 1.2** — Build Pengaduan system
   - Aligns well with existing warga auth
   - Reuse Fonnte WhatsApp integration for notifications

3. **Fase 1.3** — Build Statistik dashboard
   - Reuse penduduk data already in system
   - Add charts with Recharts

---

_Blueprint ini adalah living document — update sesuai progress implementasi._
_Versi berikutnya akan mencakup detail SQL migration dan component specs._
