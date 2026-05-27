# Deploy ke Railway (Server) + Netlify (Client)

Arsitektur deployment production:

```
                    ┌──────────────────┐
Browser ──────────► │  Netlify          │  (static client, SPA)
                    │  seruni-mumbul    │
                    │  .netlify.app     │
                    └───────┬──────────┘
                            │ /api/* redirect
                            ▼
                    ┌──────────────────┐
                    │  Railway         │  (Express API server)
                    │  seruni-api      │
                    │  :3001           │
                    └───────┬──────────┘
                            │ Supabase
                            ▼
                    ┌──────────────────┐
                    │  Supabase        │
                    │  PostgreSQL      │
                    └──────────────────┘
```

**Client** (frontend) → Netlify (gratis, unlimited bandwidth)
**Server** (API) → Railway Hobby ($5/bulan) atau Railway Starter (gratis tier)

---

## Langkah 1: Deploy Server ke Railway

### 1.1 Buat project baru di Railway

1. Buka [railway.app](https://railway.app) → Login (GitHub)
2. Klik **New Project** → **Deploy from GitHub repo**
3. Pilih repo `d--seruni-mumbul`
4. Railway auto-detect Node.js → set build command: `npm install`
5. Set start command: `node dist/server/index.js`

### 1.2 Set environment variables di Railway

Masuk ke project Railway → **Variables** → add satu per satu:

```bash
# WAJIB — Server
NODE_ENV=production
PORT=3001
ALLOWED_ORIGIN=https://seruni-mumbul.netlify.app

# WAJIB — Admin Auth
# Generate dengan: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
ADMIN_SESSION_SECRET=<generate_sekarang_min_32_chars>
ADMIN_USER=admindesa
ADMIN_PASS=<password_baru_yang_kuat>

# WAJIB — Supabase
SUPABASE_URL=https://wrfraskmawmciiutwcpx.supabase.co
# DARI: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=<isi_dari_supabase>

# WAJIB — QR Signing (min 32 chars)
QR_SECRET=<generate_sekarang>

# OPSIONAL — Fonnte WhatsApp
FONNTE_KEY=

# OPSIONAL — Cloudflare Turnstile
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

### 1.3 Set build artifact

Railway perlu build artifact dari CI. Ada 2 opsi:

#### Opsi A: GitHub Actions + Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link <project-id>

# Trigger deploy dari GitHub Actions
# Tambahkan step ini ke .github/workflows/deploy.yml
- name: Deploy to Railway
  run: |
    npm run build
    railway up --detach
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Dapatkan `RAILWAY_TOKEN` dari: Railway → Account Settings → Tokens

#### Opsi B: Railway Git Hook

1. Railway → Project → Settings → Git Trigger
2. Connect repo → Railway auto-deploy on push
3. Set environment variables di Railway dashboard
4. Railway auto-build dari `npm run build` → `dist/server/`

### 1.4 Verifikasi server berjalan

```bash
curl https://your-railway-app.railway.app/api/health
# Should return: {"ok":true,"ts":...}
```

---

## Langkah 2: Update Netlify Client

### 2.1 Update netlify.toml

Sudah diperbaiki — `netlify.toml` sekarang redirect `/api/*` ke `.netlify/functions/`.

Tapi jika deploy server ke Railway (bukan Netlify Functions), ubah redirect:

```toml
# Ganti ini di netlify.toml:
[[redirects]]
  from = "/api/*"
  to = "https://your-railway-app.railway.app/api/:splat"
  status = 200
  force = true
```

### 2.2 Set environment variables di Netlify

Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://wrfraskmawmciiutwcpx.supabase.co
VITE_SUPABASE_ANON_KEY=<dari_supabase_anon_key>
VITE_QR_SECRET=<sama_dengan_server>
VITE_ADMIN_USER=admindesa
VITE_FONNTE_KEY=
VITE_TURNSTILE_SITE_KEY=
VITE_ADMIN_SESSION_SECRET=   # ← KOSONGKAN, server-side only
```

### 2.3 Deploy Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy (dari repo root)
netlify deploy --prod --dir=dist/client
```

Atau push ke GitHub → Netlify auto-deploy dari branch `main`.

---

## Langkah 3: Test End-to-End

### 3.1 Test API health

```bash
curl https://your-railway-app.railway.app/api/health
```

### 3.2 Test admin login

```bash
curl -X POST https://your-railway-app.railway.app/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admindesa","password":"password_anda"}'
```

### 3.3 Test dari browser

1. Buka https://seruni-mumbul.netlify.app
2. Login admin → seharusnya berfungsi
3. Buat surat test → PDF generation harus works

---

## Troubleshooting

### Server 503 / Connection refused

- Railway app belum ready → tunggu 1-2 menit setelah deploy
- Cek Railway logs: `railway logs`

### CORS error di browser

- Pastikan `ALLOWED_ORIGIN` di Railway = URL Netlify (tanpa trailing slash)
- Format: `https://seruni-mumbul.netlify.app` (bukan `*.netlify.app`)

### 401 Unauthorized

- Pastikan `ADMIN_SESSION_SECRET` di Railway minimal 32 karakter
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` tidak ada spasi di awal/akhir

### Rate limit "Terlalu banyak percobaan"

- Rate limiter in-memory → restart Railway instance untuk reset
- Atau tunggu 15 menit

---

## Update Workflow

```bash
# 1. Pull latest
git pull origin main

# 2. Push to GitHub
git push origin main

# 3. Railway auto-deploys (Git Trigger)
#    Netlify auto-deploys (Git Trigger)

# Atau manual:
railway up        # Railway
netlify deploy    # Netlify
```

---

_Last updated: 26 Mei 2026_
