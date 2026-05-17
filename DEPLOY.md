# Deploy Guide — Seruni Mumbul ke Netlify

## Opsi Deployment

### Opsi A: GitHub Auto-Deploy (Recommended)
Push kode → Netlify otomatis build & deploy. Tidak perlu upload manual.

**Setup (1x saja):**

1. Buka https://app.netlify.com → Log in
2. Buka https://app.netlify.com/user/settings → Applications
3. scroll ke **Personal access tokens** → klik **Create new token**
4. Beri nama `deploy-seruni` → Create → **COPY token-nya**
5. Buka https://github.com/USER/seruni-mumbul/settings/secrets/actions
6. Tambah 2 secrets:

| Name | Value |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Token dari langkah 4 |
| `NETLIFY_SITE_ID` | Dari Netlify Dashboard → Site Settings → General → Site ID |

7. Hubungkan repo ke Netlify:
   - Buka https://app.netlify.com/start
   - Pilih **Import from Git** → pilih repo `seruni-mumbul`
   - Build command: `bun run build`
   - Publish directory: `dist/client`

**Setelah setup:** Setiap `git push origin main` → auto deploy. Tidak ada batas ukuran.

---

### Opsi B: Drag & Drop Manual
Untuk test cepat tanpa setup GitHub.

1. Buat ZIP:
   ```bash
   cd d:/seruni-mumbul
   bun run build
   Compress-Archive -Path dist/client -DestinationPath seruni.zip
   ```
2. Buka https://app.netlify.com/drop
3. Drag file `seruni.zip` ke halaman itu
4. Dapat URL langsung

> ⚠️ Tiap perubahan butuh upload ulang manual.

---

## Environment Variables (Netlify Dashboard)

```
Site Settings → Environment Variables → Production
```

| Variable | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dari Supabase → Project Settings → API → service_role |
| `QR_SECRET` | String acak 64 karakter (generate pakai script di bawah) |
| `FONNTE_API_KEY` | `BdNCQG5LAMoyC4atopz7` |
| `ADMIN_WA_NUMBER` | `087763170088` |

**Generate QR_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Build Vars (GitHub Secrets)

Di **GitHub repo → Settings → Secrets → Actions**, tambah:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Dari Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Dari Supabase Dashboard |
| `VITE_ADMIN_USER` | `admindesa` |
| `VITE_ADMIN_PASS` | `admin123` |
| `VITE_FONNTE_KEY` | `BdNCQG5LAMoyC4atopz7` |
| `VITE_TURNSTILE_SITE_KEY` | Dari Cloudflare Dashboard |
| `VITE_VAPID_PUBLIC_KEY` | Generate dengan `npx web-push generate-vapid-keys` |
| `VITE_ADMIN_DB_TOKEN` | String acak 32 karakter |

---

## Checklist Deploy

```
□ Build sukses: bun run build ✓
□ GitHub Secrets di-set (VITE_* vars)
□ Netlify Environment Variables di-set (server-side secrets)
□ Repo terhubung ke Netlify (Settings → Build & Deploy)
□ Deploy pertama trigger otomatis
□ Cek site URL → test fitur utama
```

---

## Update Project (Lakukan di Local, Push ke GitHub)

```bash
cd d:/seruni-mumbul

# 1. Edit kode sesuai kebutuhan
# 2. Test lokal
bun run dev

# 3. Commit & push
git add -A
git commit -m "deskripsi perubahan"
git push origin main

# 4. Netlify auto-build & deploy (~2 menit)
# Cek progress: https://app.netlify.com/sites/NAMA-SITE/deploys
```