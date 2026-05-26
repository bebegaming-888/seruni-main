# Manual Migration Application Guide

Karena koneksi langsung ke database Supabase tidak tersedia dari environment ini, berikut langkah manual untuk apply migrations:

## Langkah 1: Buka Supabase SQL Editor

1. Buka browser dan navigasi ke:

   ```
   https://supabase.com/dashboard/project/wrfraskmawmciiutwcpx/sql/new
   ```

2. Login dengan akun Supabase Anda

## Langkah 2: Apply Combined Migration

File `supabase/migrations/COMBINED_015_057.sql` sudah dibuat (508 lines) yang menggabungkan:

- Migration 015: `surat_types` table (74 jenis surat)
- Migration 057: `letter_layouts`, `letter_signers`, `rejection_reasons`, `letter_layout_history` tables

**Cara apply:**

1. Buka file: `d:\seruni-mumbul\supabase\migrations\COMBINED_015_057.sql`
2. Copy SELURUH isi file (Ctrl+A, Ctrl+C)
3. Paste ke Supabase SQL Editor
4. Click tombol **"Run"** atau tekan **Ctrl+Enter**
5. Tunggu sampai selesai (~10-30 detik)

**Expected output:**

- ✅ `surat_types` table created with 74 rows
- ✅ `letter_signers` table created with 3 default signers
- ✅ `rejection_reasons` table created with 6 default reasons
- ✅ `letter_layouts` table created (empty, akan diisi oleh script)
- ✅ `letter_layout_history` table created

## Langkah 3: Verify Tables Created

Jalankan query ini di SQL Editor untuk verify:

```sql
-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('surat_types', 'letter_layouts', 'letter_signers', 'rejection_reasons')
ORDER BY table_name;

-- Check surat_types count (should be 74)
SELECT COUNT(*) as total_surat_types FROM surat_types;

-- Check signers (should be 3)
SELECT role, name FROM letter_signers ORDER BY position_order;

-- Check rejection reasons (should be 6)
SELECT code, reason FROM rejection_reasons ORDER BY position_order;
```

Expected results:

- 4 tables found
- 74 surat types
- 3 signers (Kepala Desa, Sekretaris, Kaur Pemerintahan)
- 6 rejection reasons

## Langkah 4: Run Migration Script

Setelah tables berhasil dibuat, jalankan script untuk membuat 74 default layouts:

```bash
cd d:\seruni-mumbul
node --env-file=.dev.vars scripts/migrate-layouts.ts
```

Script ini akan:

- Fetch semua 74 surat types dari database
- Untuk setiap surat type, buat default layout dengan 9 sections (kop, title, pembuka, subject, body, closing, signature, qr, footer)
- Set semua layouts ke status 'active'

Expected output:

```
============================================================
Migration: letter_layouts for all surat types
============================================================
✅ Created layout for SKTM (Surat Keterangan Tidak Mampu)
✅ Created layout for SKU (Surat Keterangan Usaha)
...
✅ 74 layouts created successfully
============================================================
```

## Langkah 5: Test di Browser

1. Start dev servers (jika belum running):

   ```bash
   npm run dev:all
   ```

2. Buka browser: http://localhost:8083/admin

3. Login sebagai admin

4. Click tab **"Layout Blanko"**

5. Test:
   - Select surat type dari dropdown (misal: SKTM)
   - Lihat section list (9 sections: kop, title, pembuka, dst)
   - Click "Edit" pada salah satu section → modal terbuka dengan form editor
   - Edit konfigurasi (misal: ubah font size, warna header)
   - Click "Preview" → preview panel menampilkan blanko surat dengan perubahan
   - Click "Save as Draft" → layout e database
   - Click "Activate" → layout menjadi active (digunakan untuk render surat)

## Troubleshooting

### Error: "Could not find the table 'public.surat_types'"

- Migration 015 belum di-apply
- Ulangi Langkah 2 dengan file COMBINED_015_057.sql

### Error: "relation 'letter_layouts' does not exist"

- Migration 057 belum di-apply
- Ulangi Langkah 2

### Script migrate-layouts.ts error: "FATAL: Could not fetch surat_types"

- Tables belum dibuat di remote database
- Pastikan Langkah 2 berhasil (check via Langkah 3)

### Preview panel tidak muncul di Admin → Layout Blanko

- Check console browser untuk error
- Pastikan dev server running (npm run dev:all)
- Refresh browser (Ctrl+Shift+R)

## Alternative: Apply via psql CLI

Jika Anda memiliki `psql` installed:

```bash
psql "postgresql://postgres:Serunimumbul88@db.wrfraskmawmciiutwcpx.supabase.co:5432/postgres" -f supabase/migrations/COMBINED_015_057.sql
```

## Next Steps After Migration

1. **Customize layouts** via Admin → Layout Blanko
2. **Test PDF generation** dengan layout baru
3. **Backup database** setelah konfigurasi selesai

---

**File locations:**

- Combined migration: `d:\seruni-mumbul\supabase\migrations\COMBINED_015_057.sql`
- Migration script: `d:\seruni-mumbul\scripts\migrate-layouts.ts`
- Layout editor: `d:\seruni-mumbul\src\components\admin\LetterLayoutEditor.tsx`
