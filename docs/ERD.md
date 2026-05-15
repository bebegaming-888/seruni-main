# Entity-Relationship Diagram — Seruni Mumbul

Database: **Supabase PostgreSQL** (`jnarzbkddjdrethfkxtn`)
Total tables: **24** (+ 3 storage buckets, 5 enums)

---

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE TABLES (001)                         │
│  admin_users, warga, surat_requests, audit_log, notifications │
└──────────────────┬──────────────────────────────────────────┘
                   │ 1:N

┌──────────────────▼──────────────────────────────────────────┐
│                    AUTH TABLES (002)                         │
│        otp_requests, warga_sessions, warga_trackings       │
└──────────────────┬──────────────────────────────────────────┘
                   │ warga_id

┌──────────────────▼──────────────────────────────────────────┐
│              PUSH & ATTACHMENTS (003, 004)                   │
│         push_subscriptions, attachments storage               │
└──────────────────┬──────────────────────────────────────────┘
                   │ user_id / warga_id

┌──────────────────▼──────────────────────────────────────────┐
│              CMS & SETTINGS (006, 023)                     │
│      app_settings, app_settings_history, cms_contents,     │
│                   komoditas                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              LETTER SYSTEM (015, 016)                      │
│                 surat_types ← surat_requests                │
│              (74 master types)    (user letters)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         WILAYAH & SUBDIVISIONS (015)                        │
│      wilayah (self-ref) ← village_subdivisions             │
│   (province→regency→district→village)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             APBDes & MONOGRAFI (017)                        │
│          apbdes_data, monografi (idm_data)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│      PERANGKAT DESA (018, 019, 021)                        │
│  perangkat_desa_struktur (tree) ← perangkat_desa (people)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            LEMBAGA DESA (020)                               │
│ lembaga_desa → struktur_lembaga (tree) → pengurus_lembaga  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PENGADUAN (022)                                 │
│               pengaduan (tickets)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Enumerations

### `surat_status`

```
Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak
```

### `jenis_kelamin`

```
Laki-Laki | Laki-linux | Perempuan
```

### `status_perkawinan`

```
Belum Kawin | Kawin | Cerai Hidup | Cerai Mati
```

### `golongan_darah`

```
A | B | AB | O | Tidak Diketahui
```

### `kategori_pengaduan`

```
Infrastruktur & Jalan | Pelayanan Publik | Keamanan & Ketertiban |
Kesehatan & Kebersihan | Bantuan Sosial | Lingkungan Hidup |
Pertanahan | Lainnya
```

---

## Table Detail Cards

---

### `admin_users` — Admin Akun

**Migrations:** 001

| Column     | Type        | PK  | UQ  | FK  | Nullable | Default                                                |
| ---------- | ----------- | --- | --- | --- | -------- | ------------------------------------------------------ |
| id         | uuid        | ✅  |     |     | ❌       | uuid_generate_v4()                                     |
| username   | text        |     | ✅  |     | ❌       |                                                        |
| password   | text        |     |     |     | ❌       |                                                        |
| name       | text        |     |     |     | ❌       |                                                        |
| email      | text        |     |     |     | ✅       |                                                        |
| role       | text        |     |     |     | ❌       | CHECK: Super Admin, Operator, Verifikator, Kepala Desa |
| fixed      | boolean     |     |     |     | ❌       | false                                                  |
| created_at | timestamptz |     |     |     | ❌       | now()                                                  |
| updated_at | timestamptz |     |     |     | ✅       |                                                        |

**Triggers:** `admin_users_updated_at` — auto-set `updated_at` on UPDATE

**Relations:**

- `1:1` → `audit_log(user_id)` (nullable)
- `1:N` → `push_subscriptions(user_id)` ON DELETE CASCADE

---

### `warga` — Data Penduduk

**Migrations:** 001, 008, 012, 013, 014

| Column            | Type        | PK  | UQ  | FK  | Nullable | Default                                            |
| ----------------- | ----------- | --- | --- | --- | -------- | -------------------------------------------------- |
| id                | uuid        | ✅  |     |     | ❌       | uuid_generate_v4()                                 |
| nik               | char(16)    |     | ✅  |     | ❌       |                                                    |
| nama              | text        |     |     |     | ❌       |                                                    |
| tempat_lahir      | text        |     |     |     | ✅       |                                                    |
| tanggal_lahir     | date        |     |     |     | ✅       |                                                    |
| jenis_kelamin     | text        |     |     |     | ✅       | CHECK: Laki-Laki, Laki-linux, Perempuan            |
| agama             | text        |     |     |     | ✅       |                                                    |
| no_kk             | char(16)    |     |     |     | ✅       |                                                    |
| alamat            | text        |     |     |     | ✅       |                                                    |
| rt                | char(3)     |     |     |     | ✅       |                                                    |
| rw                | text        |     |     |     | ✅       |                                                    |
| dusun             | text        |     |     |     | ✅       |                                                    |
| desa              | text        |     |     |     | ✅       | 'Seruni Mumbul'                                    |
| kecamatan         | text        |     |     |     | ✅       | 'Pringgabaya'                                      |
| kabupaten         | text        |     |     |     | ✅       | 'Lombok Timur'                                     |
| provinsi          | text        |     |     |     | ✅       | 'Nusa Tenggara Barat'                              |
| no_hp             | text        |     |     |     | ✅       |                                                    |
| status_perkawinan | text        |     |     |     | ✅       | CHECK: Belom Kawin, Kawin, Cerai Hidup, Cerai Mati |
| pekerjaan         | text        |     |     |     | ✅       |                                                    |
| pendidikan        | text        |     |     |     | ✅       |                                                    |
| nama_ibu          | text        |     |     |     | ✅       |                                                    |
| nama_bapak        | text        |     |     |     | ✅       |                                                    |
| archived          | boolean     |     |     |     | ❌       | false                                              |
| created_at        | timestamptz |     |     |     | ❌       | now()                                              |
| updated_at        | timestamptz |     |     |     | ✅       |                                                    |

**Indexes:** nik (UQ), dusun, rt, rw, status_dalam_kk, pekerjaan, agama, status_perkawinan, archived

**Triggers:**

- `warga_updated_at` — auto-set `updated_at` on UPDATE
- `warga_audit_log` — AFTER INSERT/UPDATE/DELETE → log to audit trail

**Relations:**

- `1:N` → `surat_requests(warga_id)` (nullable)
- `1:N` → `otp_requests(warga_id)` ON DELETE CASCADE
- `1:N` → `warga_sessions(warga_id)` ON DELETE CASCADE
- `1:N` → `warga_trackings(warga_id)` ON DELETE CASCADE
- `1:N` → `notifications(warga_id)` (nullable)
- `1:N` → `perangkat_desa(nik)` (nullable, through NIK)

---

### `surat_requests` — E-Surat Records

**Migrations:** 001, 003, 007, 009, 011, 016

| Column        | Type         | PK  | UQ  | FK                   | Nullable | Default               |
| ------------- | ------------ | --- | --- | -------------------- | -------- | --------------------- |
| id            | uuid         | ✅  |     |                      | ❌       | uuid_generate_v4()    |
| no_surat      | text         |     | ✅  |                      | ❌       |                       |
| kode          | text         |     |     | FK→surat_types(code) | ❌       |                       |
| nama_surat    | text         |     |     |                      | ❌       |                       |
| warga_id      | uuid         |     |     | FK→warga(id)         | ✅       |                       |
| nik           | text         |     |     |                      | ❌       |                       |
| pemohon       | text         |     |     |                      | ❌       |                       |
| kontak        | text         |     |     |                      | ✅       |                       |
| data_json     | jsonb        |     |     |                      | ✅       | '{}'                  |
| attachments   | jsonb        |     |     |                      | ✅       | '[]' (GIN idx)        |
| status        | surat_status |     |     |                      | ❌       | 'Menunggu Verifikasi' |
| catatan       | text         |     |     |                      | ✅       |                       |
| verified_by   | text         |     |     |                      | ✅       |                       |
| verified_at   | timestamptz  |     |     |                      | ✅       |                       |
| approved_by   | text         |     |     |                      | ✅       |                       |
| approved_at   | timestamptz  |     |     |                      | ✅       |                       |
| signed_at     | timestamptz  |     |     |                      | ✅       |                       |
| signed_by     | text         |     |     |                      | ✅       |                       |
| qr_payload    | text         |     |     |                      | ✅       |                       |
| tracking_no   | text         |     |     |                      | ✅       |                       |
| category      | text         |     |     |                      | ✅       |                       |
| eta           | text         |     |     |                      | ✅       |                       |
| is_substitute | boolean      |     |     |                      | ✅       | false                 |
| archived      | boolean      |     |     |                      | ❌       | false                 |
| created_at    | timestamptz  |     |     |                      | ❌       | now()                 |
| updated_at    | timestamptz  |     |     |                      | ✅       |                       |

**Indexes:** no_surat (UQ), status, nik, archived (partial), attachments (GIN), category, kode

**Triggers:**

- `surat_requests_updated_at` — auto-set `updated_at` on UPDATE
- `trg_sync_surat_request_metadata` — AFTER INSERT/UPDATE of `kode` → sync denormalized fields

**Relations:**

- `N:1` → `warga(warga_id)` (nullable)
- `N:1` → `surat_types(kode)` (nullable, added 016)
- `1:N` → `warga_trackings(surat_request_id)` (nullable)

---

### `surat_types` — Jenis Surat (74 types)

**Migrations:** 015

| Column           | Type        | PK  | UQ  | FK  | Nullable | Default            |
| ---------------- | ----------- | --- | --- | --- | -------- | ------------------ |
| id               | uuid        | ✅  |     |     | ❌       | uuid_generate_v4() |
| code             | text        |     | ✅  |     | ❌       |                    |
| name             | text        |     |     |     | ❌       |                    |
| category         | text        |     |     |     | ❌       |                    |
| wewenang         | boolean     |     |     |     | ❌       | true               |
| description      | text        |     |     |     | ✅       |                    |
| eta              | text        |     |     |     | ✅       | '1 hari kerja'     |
| kode_klasifikasi | text        |     |     |     | ✅       |                    |
| is_substitute    | boolean     |     |     |     | ❌       | false              |
| note             | text        |     |     |     | ✅       |                    |
| form_fields      | jsonb       |     |     |     | ✅       | '[]' (GIN idx)     |
| dna_clauses      | jsonb       |     |     |     | ✅       | '[]' (GIN idx)     |
| dna_placeholders | text[]      |     |     |     | ✅       | '{}' (GIN idx)     |
| field_count      | smallint    |     |     |     | ✅       | 0                  |
| dna_count        | smallint    |     |     |     | ✅       | 0                  |
| created_at       | timestamptz |     |     |     | ❌       | now()              |
| updated_at       | timestamptz |     |     |     | ✅       |                    |

**Indexes:** code (UQ), category, wewenang, form_fields (GIN), dna_placeholders (GIN)

**Relations:**

- `1:N` → `surat_requests(kode)`

---

### `audit_log` — Audit Trail

**Migrations:** 001

| Column     | Type        | PK  | FK                 | Nullable | Default |
| ---------- | ----------- | --- | ------------------ | -------- | ------- |
| id         | uuid        | ✅  |                    | ❌       |         |
| user_id    | uuid        |     | FK→admin_users(id) | ✅       |         |
| username   | text        |     |                    | ❌       |         |
| action     | text        |     |                    | ❌       |         |
| detail     | text        |     |                    | ✅       |         |
| ip_address | text        |     |                    | ✅       |         |
| created_at | timestamptz |     |                    | ❌       | now()   |

**Indexes:** created_at DESC

**Relations:**

- `N:1` → `admin_users(user_id)` (nullable)

---

### `notifications` — In-App Notifications

**Migrations:** 001

| Column     | Type        | PK  | FK           | Nullable | Default   |
| ---------- | ----------- | --- | ------------ | -------- | --------- |
| id         | uuid        | ✅  |              | ❌       |           |
| warga_id   | uuid        |     | FK→warga(id) | ✅       |           |
| nik        | text        |     |              | ✅       |           |
| phone      | text        |     |              | ✅       |           |
| type       | text        |     |              | ❌       |           |
| status     | text        |     |              | ❌       | 'pending' |
| sent_at    | timestamptz |     |              | ✅       |           |
| created_at | timestamptz |     |              | ❌       | now()     |

**Relations:**

- `N:1` → `warga(warga_id)` (nullable)

> ⚠️ **Dead table:** No application code writes to this table. WA notifications go through Fonnte API directly.

---

### `otp_requests` — OTP untuk Warga Login

**Migrations:** 002

| Column     | Type        | PK  | FK                             | Nullable | Default      |
| ---------- | ----------- | --- | ------------------------------ | -------- | ------------ |
| id         | uuid        | ✅  |                                | ❌       |              |
| warga_id   | uuid        |     | FK→warga(id) ON DELETE CASCADE | ✅       |              |
| nik        | char(16)    |     |                                | ❌       |              |
| otp_hash   | text        |     |                                | ❌       | SHA-256 hash |
| expires_at | timestamptz |     |                                | ❌       |              |
| used       | boolean     |     |                                | ❌       | false        |
| created_at | timestamptz |     |                                | ❌       | now()        |

**Indexes:** (nik, used, expires_at DESC)

**Relations:**

- `N:1` → `warga(warga_id)` ON DELETE CASCADE

---

### `warga_sessions` — Warga Session Tokens

**Migrations:** 002

| Column     | Type        | PK  | FK                             | Nullable | Default |
| ---------- | ----------- | --- | ------------------------------ | -------- | ------- |
| id         | uuid        | ✅  |                                | ❌       |         |
| warga_id   | uuid        |     | FK→warga(id) ON DELETE CASCADE | ✅       |         |
| token_hash | text        |     |                                | ❌       |         |
| expires_at | timestamptz |     |                                | ❌       |         |
| created_at | timestamptz |     |                                | ❌       | now()   |

**Indexes:** token_hash, warga_id

**Relations:**

- `N:1` → `warga(warga_id)` ON DELETE CASCADE

---

### `warga_trackings` — Tracking Riwayat Surat

**Migrations:** 002

| Column           | Type        | PK  | FK                             | Nullable | Default |
| ---------------- | ----------- | --- | ------------------------------ | -------- | ------- |
| id               | uuid        | ✅  |                                | ❌       |         |
| warga_id         | uuid        |     | FK→warga(id) ON DELETE CASCADE | ✅       |         |
| surat_request_id | uuid        |     | FK→surat_requests(id)          | ✅       |         |
| created_at       | timestamptz |     |                                | ❌       | now()   |

**Indexes:** warga_id

**Relations:**

- `N:1` → `warga(warga_id)` ON DELETE CASCADE
- `N:1` → `surat_requests(surat_request_id)` ON DELETE SET NULL

---

### `push_subscriptions` — Web Push Subscriptions

**Migrations:** 004

| Column     | Type        | PK  | UQ  | FK                                   | Nullable | Default |
| ---------- | ----------- | --- | --- | ------------------------------------ | -------- | ------- |
| id         | uuid        | ✅  |     |                                      | ❌       |         |
| user_id    | uuid        |     |     | FK→admin_users(id) ON DELETE CASCADE | ✅       |         |
| endpoint   | text        |     | ✅  |                                      | ❌       |         |
| p256dh     | text        |     |     |                                      | ❌       |         |
| auth       | text        |     |     |                                      | ❌       |         |
| created_at | timestamptz |     |     |                                      | ❌       | now()   |
| updated_at | timestamptz |     |     |                                      | ✅       |         |

**Indexes:** user_id, endpoint (UQ)

**Relations:**

- `N:1` → `admin_users(user_id)` ON DELETE CASCADE

---

### `app_settings` — Settings

**Migrations:** 006, 023

| Column     | Type        | PK  | UQ  | Nullable | Default |
| ---------- | ----------- | --- | --- | -------- | ------- |
| id         | uuid        | ✅  |     | ❌       |         |
| key        | text        |     | ✅  | ❌       |         |
| value      | jsonb       |     |     | ❌       | '{}'    |
| version    | integer     |     |     | ✅       | 1       |
| updated_by | text        |     |     | ✅       |         |
| created_at | timestamptz |     |     | ✅       | now()   |
| updated_at | timestamptz |     |     | ❌       | now()   |

**Triggers:**

- `app_settings_updated_at` — auto-set `updated_at` on UPDATE
- `tr_app_settings_history` — BEFORE UPDATE → save to `app_settings_history`

**Relations:**

- `1:N` → `app_settings_history(setting_id)` ON DELETE CASCADE

---

### `app_settings_history` — Settings Version History

**Migrations:** 023

| Column     | Type        | PK  | FK                                    | Nullable | Default |
| ---------- | ----------- | --- | ------------------------------------- | -------- | ------- |
| id         | uuid        | ✅  |                                       | ❌       |         |
| setting_id | uuid        |     | FK→app_settings(id) ON DELETE CASCADE | ✅       |         |
| key        | text        |     |                                       | ❌       |         |
| value      | jsonb       |     |                                       | ❌       |         |
| version    | integer     |     |                                       | ❌       |         |
| saved_by   | text        |     |                                       | ✅       |         |
| saved_at   | timestamptz |     |                                       | ✅       | now()   |

**Indexes:** key

**Relations:**

- `N:1` → `app_settings(setting_id)` ON DELETE CASCADE

---

### `cms_contents` — Berita, Pengumuman, Agenda, Galeri

**Migrations:** 006

| Column      | Type        | PK  | FK  | Nullable | Default                            |
| ----------- | ----------- | --- | --- | -------- | ---------------------------------- |
| id          | uuid        | ✅  |     | ❌       |                                    |
| type        | text        |     |     | ❌       | berita, pengumuman, agenda, galeri |
| slug        | text        |     |     | ✅       |                                    |
| title       | text        |     |     | ❌       |                                    |
| excerpt     | text        |     |     | ✅       |                                    |
| content     | text        |     |     | ✅       | HTML                               |
| category    | text        |     |     | ✅       |                                    |
| cover_image | text        |     |     | ✅       |                                    |
| metadata    | jsonb       |     |     | ✅       | '{}'                               |
| created_at  | timestamptz |     |     | ❌       | now()                              |
| updated_at  | timestamptz |     |     | ✅       |                                    |

**Indexes:** type, slug

**Triggers:** `cms_contents_updated_at`

---

### `komoditas` — Harga Komoditas Pasar

**Migrations:** 006

| Column     | Type        | PK  | Nullable | Default  |
| ---------- | ----------- | --- | -------- | -------- |
| id         | uuid        | ✅  | ❌       |          |
| name       | text        |     | ❌       |          |
| price      | numeric     |     | ❌       | 0        |
| unit       | text        |     | ❌       | 'kg'     |
| trend      | text        |     | ✅       | 'stable' |
| change     | numeric     |     | ✅       | 0        |
| created_at | timestamptz |     | ❌       | now()    |
| updated_at | timestamptz |     | ✅       |          |

**Checks:** trend IN ('up', 'down', 'stable')

---

### `wilayah` — Hierarki Wilayah Administratif

**Migrations:** 015

| Column      | Type        | PK  | UQ  | FK                                 | Nullable | Default                              |
| ----------- | ----------- | --- | --- | ---------------------------------- | -------- | ------------------------------------ |
| id          | SERIAL      | ✅  |     |                                    | ❌       |                                      |
| kode        | VARCHAR(13) |     | ✅  |                                    | ❌       |                                      |
| level       | VARCHAR(20) |     |     |                                    | ❌       | province, regency, district, village |
| nama        | TEXT        |     |     |                                    | ❌       |                                      |
| parent_kode | VARCHAR(13) |     |     | FK→wilayah(kode) ON DELETE CASCADE | ✅       |                                      |
| created_at  | TIMESTAMPTZ |     |     |                                    | ✅       | NOW()                                |

**Indexes:** kode, parent_kode, level, nama

**Self-reference:** `parent_kode` → `wilayah(kode)` — cascade deletes children

---

### `village_subdivisions` — DBSN, RW, RT

**Migrations:** 015

| Column       | Type        | PK  | UQ  | FK                                 | Nullable | Default       |
| ------------ | ----------- | --- | --- | ---------------------------------- | -------- | ------------- |
| id           | SERIAL      | ✅  |     |                                    | ❌       |               |
| village_kode | VARCHAR(13) |     |     | FK→wilayah(kode) ON DELETE CASCADE | ❌       |               |
| level        | VARCHAR(10) |     |     |                                    | ❌       | dusun, rw, rt |
| nama         | VARCHAR(20) |     |     |                                    | ❌       |               |
| created_at   | TIMESTAMPTZ |     |     |                                    | ✅       | NOW()         |

**Indexes:** village_kode, level; UNIQUE(village_kode, level, nama)

**Relations:**

- `N:1` → `wilayah(village_kode)` ON DELETE CASCADE

---

### `apbdes_data` — APBDes

**Migrations:** 017

| Column           | Type        | PK  | UQ  | Nullable | Default |
| ---------------- | ----------- | --- | --- | -------- | ------- |
| id               | uuid        | ✅  |     | ❌       |         |
| tahun            | smallint    |     | ✅  | ❌       |         |
| status           | text        |     |     | ❌       |         |
| total_pendapatan | bigint      |     |     | ❌       | 0       |
| total_belanja    | bigint      |     |     | ❌       | 0       |
| total_pembiayaan | bigint      |     |     | ❌       | 0       |
| sisa_cadangan    | bigint      |     |     | ❌       | 0       |
| detail           | jsonb       |     |     | ❌       | '{}'    |
| realizes         | jsonb       |     |     | ❌       | '{}'    |
| history          | jsonb       |     |     | ❌       | '[]'    |
| created_at       | timestamptz |     |     | ❌       | now()   |
| updated_at       | timestamptz |     |     | ❌       | now()   |

> **Note:** Column in DB is `realizes`, mapped to `realization` in app code.

**Indexes:** tahun (UQ)

---

### `monografi` — Monografi Desa

**Migrations:** 017

| Column                          | Type          | PK  | UQ  | Nullable | Default       |
| ------------------------------- | ------------- | --- | --- | -------- | ------------- |
| id                              | uuid          | ✅  |     | ❌       |               |
| semester                        | text          |     | ✅  | ❌       | '2024-Ganjil' |
| kode_desa                       | text          |     |     | ✅       |               |
| nama_desa                       | text          |     |     | ✅       |               |
| kecamatan                       | text          |     |     | ✅       |               |
| kabupaten                       | text          |     |     | ✅       |               |
| provinsi                        | text          |     |     | ✅       |               |
| klasifikasi                     | text          |     |     | ✅       | 'Pedesaan'    |
| luas_wilayah                    | numeric(10,2) |     |     | ✅       |               |
| altitude                        | numeric(6,1)  |     |     | ✅       |               |
| batas_utara/selatan/barat/timur | text          |     |     | ✅       |               |
| jumlah_rw/dusun/rt              | smallint      |     |     | ✅       | 0             |
| total_penduduk                  | bigint        |     |     | ✅       | 0             |
| laki_laki                       | bigint        |     |     | ✅       | 0             |
| perempuan                       | bigint        |     |     | ✅       | 0             |
| kepala_keluarga                 | bigint        |     |     | ✅       | 0             |
| rumah_tangga                    | bigint        |     |     | ✅       | 0             |
| idm_score                       | numeric(5,4)  |     |     | ✅       |               |
| idm_status                      | text          |     |     | ✅       |               |
| created_at                      | timestamptz   |     |     | ❌       | now()         |
| updated_at                      | timestamptz   |     |     | ❌       | now()         |

**Indexes:** semester (UQ)

---

### `perangkat_desa_struktur` — Struktur Jabatan

**Migrations:** 021

| Column             | Type        | PK  | FK                                               | Nullable | Default            |
| ------------------ | ----------- | --- | ------------------------------------------------ | -------- | ------------------ |
| id                 | SERIAL      | ✅  |                                                  | ❌       |                    |
| parent_id          | INTEGER     |     | FK→perangkat_desa_struktur(id) ON DELETE CASCADE | ✅       | self-ref           |
| nama_jabatan       | TEXT        |     |                                                  | ❌       |                    |
| kategori           | TEXT        |     |                                                  | ❌       | 'Pelaksana Teknis' |
| level_hierarchy    | INTEGER     |     |                                                  | ❌       | 1                  |
| urutan             | INTEGER     |     |                                                  | ❌       | 99                 |
| warna_label        | TEXT        |     |                                                  | ✅       |                    |
| is_single_position | BOOLEAN     |     |                                                  | ❌       | FALSE              |
| status_aktif       | BOOLEAN     |     |                                                  | ❌       | TRUE               |
| created_at         | TIMESTAMPTZ |     |                                                  | ❌       | NOW()              |
| updated_at         | TIMESTAMPTZ |     |                                                  | ✅       |                    |

**Indexes:** parent_id, kategori, urutan

**Self-reference:** `parent_id` → `perangkat_desa_struktur(id)` — tree structure

**Relations:**

- `1:N` → `perangkat_desa(struktur_id)` ON DELETE CASCADE

---

### `perangkat_desa` — Perangkat Desa (Orang)

**Migrations:** 021 (replaces 018)

| Column            | Type        | PK  | FK                                               | Nullable | Default     |
| ----------------- | ----------- | --- | ------------------------------------------------ | -------- | ----------- |
| id                | SERIAL      | ✅  |                                                  | ❌       |             |
| struktur_id       | INTEGER     |     | FK→perangkat_desa_struktur(id) ON DELETE CASCADE | ❌       |             |
| nik               | CHAR(16)    |     |                                                  | ✅       |             |
| nama              | TEXT        |     |                                                  | ❌       |             |
| jenis_kelamin     | TEXT        |     |                                                  | ✅       | 'Laki-Laki' |
| tempat_lahir      | TEXT        |     |                                                  | ✅       |             |
| tanggal_lahir     | DATE        |     |                                                  | ✅       |             |
| pendidikan        | TEXT        |     |                                                  | ✅       |             |
| alamat            | TEXT        |     |                                                  | ✅       |             |
| no_hp             | TEXT        |     |                                                  | ✅       |             |
| email             | TEXT        |     |                                                  | ✅       |             |
| foto_url          | TEXT        |     |                                                  | ✅       |             |
| foto_storage_path | TEXT        |     |                                                  | ✅       |             |
| nomor_sk          | TEXT        |     |                                                  | ✅       |             |
| tanggal_terbit_sk | DATE        |     |                                                  | ✅       |             |
| tanggal_berakhir  | DATE        |     |                                                  | ✅       |             |
| status_aktif      | BOOLEAN     |     |                                                  | ❌       | TRUE        |
| created_at        | TIMESTAMPTZ |     |                                                  | ❌       | NOW()       |
| updated_at        | TIMESTAMPTZ |     |                                                  | ✅       |             |

**Indexes:** struktur_id, nik, status_aktif; COMPOSITE(structur_id, status_aktif)

**Relations:**

- `N:1` → `perangkat_desa_struktur(struktur_id)` ON DELETE CASCADE
- `N:1` → `warga(nik)` (link via NIK, nullable)

---

### `lembaga_desa` — Lembaga Desa

**Migrations:** 020

| Column            | Type        | PK  | UQ  | Nullable | Default   |
| ----------------- | ----------- | --- | --- | -------- | --------- |
| id                | SERIAL      | ✅  |     | ❌       |           |
| slug              | text        |     | ✅  | ❌       |           |
| nama              | TEXT        |     |     | ❌       |           |
| jenis             | TEXT        |     |     | ❌       | 'LAINNYA' |
| deskripsi         | TEXT        |     |     | ✅       |           |
| logo_url          | TEXT        |     |     | ✅       |           |
| logo_storage_path | TEXT        |     |     | ✅       |           |
| kontak_info       | JSONB       |     |     | ✅       | '{}'      |
| enabled           | BOOLEAN     |     |     | ❌       | TRUE      |
| urutan            | INTEGER     |     |     | ❌       | 99        |
| created_at        | TIMESTAMPTZ |     |     | ❌       | NOW()     |
| updated_at        | TIMESTAMPTZ |     |     | ✅       |           |

**Checks:** jenis IN (BPD, LPM, PKK, KARANG_TARUNA, BUMDES, POSYANDU, LINMAS, RT, FORUM_ANAK, POKDARWIS, KOPERASI, LEMBAGA_ADAT, POSBANKUM, TSBD, LEMBAGA_PEREMPUAN, LAINNYA)

**Indexes:** slug (UQ), jenis, enabled, urutan

**Relations:**

- `1:N` → `struktur_lembaga(lembaga_id)` ON DELETE CASCADE

---

### `struktur_lembaga` — Struktur Lembaga (Tree)

**Migrations:** 020

| Column       | Type        | PK  | FK                                        | Nullable | Default  |
| ------------ | ----------- | --- | ----------------------------------------- | -------- | -------- |
| id           | SERIAL      | ✅  |                                           | ❌       |          |
| lembaga_id   | INTEGER     |     | FK→lembaga_desa(id) ON DELETE CASCADE     | ❌       |          |
| parent_id    | INTEGER     |     | FK→struktur_lembaga(id) ON DELETE CASCADE | ✅       | self-ref |
| nama_jabatan | TEXT        |     |                                           | ❌       |          |
| level        | INTEGER     |     |                                           | ❌       | 0        |
| urutan       | INTEGER     |     |                                           | ❌       | 99       |
| created_at   | TIMESTAMPTZ |     |                                           | ❌       | NOW()    |
| updated_at   | TIMESTAMPTZ |     |                                           | ✅       |          |

**Indexes:** COMPOSITE(lembaga_id, urutan ASC), parent_id

**Self-reference:** `parent_id` → `struktur_lembaga(id)` — tree

**Relations:**

- `N:1` → `lembaga_desa(lembaga_id)` ON DELETE CASCADE
- `1:N` → `pengurus_lembaga(struktur_id)` ON DELETE CASCADE

---

### `pengurus_lembaga` — Pengurus Lembaga

**Migrations:** 020

| Column            | Type        | PK  | FK                                        | Nullable | Default     |
| ----------------- | ----------- | --- | ----------------------------------------- | -------- | ----------- |
| id                | SERIAL      | ✅  |                                           | ❌       |             |
| struktur_id       | INTEGER     |     | FK→struktur_lembaga(id) ON DELETE CASCADE | ❌       |             |
| nama              | TEXT        |     |                                           | ❌       |             |
| nik               | CHAR(16)    |     |                                           | ✅       |             |
| tempat_lahir      | TEXT        |     |                                           | ✅       |             |
| tanggal_lahir     | DATE        |     |                                           | ✅       |             |
| jenis_kelamin     | TEXT        |     |                                           | ✅       | 'Laki-Laki' |
| pendidikan        | TEXT        |     |                                           | ✅       |             |
| alamat            | TEXT        |     |                                           | ✅       |             |
| no_hp             | TEXT        |     |                                           | ✅       |             |
| foto_url          | TEXT        |     |                                           | ✅       |             |
| foto_storage_path | TEXT        |     |                                           | ✅       |             |
| status            | TEXT        |     |                                           | ❌       | 'aktif'     |
| created_at        | TIMESTAMPTZ |     |                                           | ❌       | NOW()       |
| updated_at        | TIMESTAMPTZ |     |                                           | ✅       |             |

**Checks:** status IN ('aktif', 'periode_sebelumnya')

**Indexes:** struktur_id, status

**Relations:**

- `N:1` → `struktur_lembaga(struktur_id)` ON DELETE CASCADE
- `N:1` → `warga(nik)` (link via NIK, nullable)

---

### `pengaduan` — Pengaduan Masyarakat

**Migrations:** 022

| Column        | Type        | PK  | UQ  | Nullable | Default   |
| ------------- | ----------- | --- | --- | -------- | --------- |
| id            | SERIAL      | ✅  |     | ❌       |           |
| ticket        | TEXT        |     | ✅  | ❌       | 'PD-XXXX' |
| nama          | TEXT        |     |     | ❌       |           |
| nik           | TEXT        |     |     | ✅       |           |
| kontak        | TEXT        |     |     | ❌       |           |
| kategori      | TEXT        |     |     | ❌       | CHECK     |
| judul         | TEXT        |     |     | ❌       |           |
| isi           | TEXT        |     |     | ❌       |           |
| lampiran_url  | TEXT        |     |     | ✅       |           |
| status        | TEXT        |     |     | ❌       | 'Baru'    |
| prioritas     | TEXT        |     |     | ✅       | 'Normal'  |
| admin_catatan | TEXT        |     |     | ✅       |           |
| admin_tindak  | TEXT        |     |     | ✅       |           |
| created_at    | TIMESTAMPTZ |     |     | ✅       | NOW()     |
| updated_at    | TIMESTAMPTZ |     |     | ✅       | NOW()     |
| resolved_at   | TIMESTAMPTZ |     |     | ✅       |           |

**Indexes:** ticket (UQ), status, created_at DESC

---

## Storage Buckets

| Bucket              | Created | Access | RLS | Purpose                                 |
| ------------------- | ------- | ------ | --- | --------------------------------------- |
| `surat-attachments` | 010     | Public | No  | Document attachments for surat_requests |
| `public-media`      | 019     | Public | No  | Logos, favicons, berita covers          |
| `perangkat-fotos`   | 019     | Public | No  | Photos of perangkat desa                |

---

## Data Flow — Key Operations

### E-Surat Workflow

```
Warga (NIK) → OTP Request → OTP Verify → Session Token (HMAC)
           → Submit Surat → surat_requests (warga_id via NIK)
           → Admin Verify → status: Diverifikasi
           → Admin Approve → status: Disetujui + generate no_surat
           → PDF Download (verify-surat → generate-pdf)
```

### NIK Lookup Flow

```
Smart NIK Input → esurat-store.lookupPenduduk(nik)
               → penduduk-store.getPendudukByNik(nik)
               → Supabase: warga WHERE nik = X
               → IDB fallback (penduduk store)
```

### Settings Sync

```
saveSettings() → Supabase (blocking) → IDB → Zustand → broadcastSettingsSave()
                                            ↓
                                     idb-sync.ts (Supabase Realtime channel)
```

---

## Code ↔ DB Contract

| App Store       | IndexedDB Store      | Supabase Table                    | KeyPath   | Sync            |
| --------------- | -------------------- | --------------------------------- | --------- | --------------- |
| settings-store  | `settings`           | `app_settings`                    | `id`      | ✅ write-behind |
| content-store   | `berita`             | `cms_contents` (type=berita)      | `id`      | ✅ write-behind |
| content-store   | `pengumuman`         | `cms_contents` (type=pengumuman)  | `id`      | ✅ write-behind |
| content-store   | `agenda`             | `cms_contents` (type=agenda)      | `id`      | ✅ write-behind |
| content-store   | `galeri`             | `cms_contents` (type=galeri)      | `id`      | ✅ write-behind |
| content-store   | `komoditas`          | `komoditas`                       | `id`      | ✅ write-behind |
| content-store   | `apbdes`             | `apbdes_data`                     | `id`      | ✅ write-behind |
| penduduk-store  | `penduduk`           | `warga`                           | `nik`     | ✅ full sync    |
| esurat-store    | `esurat_records`     | `surat_requests`                  | `no`      | ✅ write-behind |
| esurat-store    | `esurat_archive`     | `surat_requests` (archived=true)  | `no`      | ✅ write-behind |
| template-store  | `templates`          | —                                 | `id`      | ❌ local only   |
| lembaga-store   | `lembaga`            | `lembaga_desa`                    | `id`      | ✅ full sync    |
| perangkat-desa  | `perangkat`          | `perangkat_desa`                  | `id`      | ✅ full sync    |
| perangkat-desa  | `perangkat_struktur` | `perangkat_desa_struktur`         | `id`      | ✅ full sync    |
| pengaduan-store | `pengaduan`          | `pengaduan`                       | `ticket`  | ✅ write-behind |
| wilayah-store   | — (localStorage)     | `wilayah`, `village_subdivisions` | —         | ✅ full sync    |
| audit-log       | `audit_log`          | `audit_log`                       | `id`      | ✅ append-only  |
| users           | `users`              | `admin_users`                     | `id`      | ✅ full sync    |
| nomor-surat     | `nomor_surat`        | —                                 | `id=YYYY` | ❌ IDB only     |
