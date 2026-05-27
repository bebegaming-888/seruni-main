# =============================================================================

# DEPLOYMENT GUIDE — Seruni Mumbul

#

# Arsitektur:

# Frontend → Cloudflare Pages (https://seruni-mumbul.pages.dev)

# API → Railway (https://seruni-api.up.railway.app)

# Database → Supabase (PostgreSQL)

#

# =============================================================================

## QUICK SETUP

### 1. Railway (API Server)

1. Buka https://railway.railway.new/d/seruni-mumbul
2. Connect repo GitHub
3. Set environment variables:

| Variable                          | Value                             | Notes                                                                                   |
| --------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `NODE_ENV`                        | `production`                      | WAJIB                                                                                   |
| `PORT`                            | `3001`                            | Railway auto-assigns, tapi ini fallback                                                 |
| `ALLOWED_ORIGIN`                  | `https://seruni-mumbul.pages.dev` | Ganti jika domain berbeda                                                               |
| `ADMIN_SESSION_SECRET`            | min 32 chars                      | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `SUPABASE_SERVICE_ROLE_KEY`       | dari Supabase dashboard           |                                                                                         |
| `SUPABASE_URL`                    | dari Supabase dashboard           |                                                                                         |
| `ADMIN_USER`                      | admin username                    |                                                                                         |
| `ADMIN_PASS`                      | admin password (hashed di DB)     |                                                                                         |
| `QR_SECRET`                       | min 32 chars                      | Untuk QR signing                                                                        |
| `FONTE_API_KEY`                   | dari Fonnte dashboard             | WhatsApp notifications                                                                  |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | dari Cloudflare dashboard         | Anti-bot                                                                                |
| `SENTRY_DSN`                      | dari Sentry                       | Error tracking (optional)                                                               |

4. Start command: `node server/index.js`

### 2. Cloudflare Pages (Frontend)

1. Buka https://pages.cloudflare.com/
2. Buat project baru → connect repo GitHub
3. Build settings:
   - Framework preset: None
   - Build command: `npm install && npm run build`
   - Build output: `dist/client`
   - Environment variables:
     - `VITE_SUPABASE_URL` → dari Supabase
     - `VITE_SUPABASE_ANON_KEY` → dari Supabase
     - `VITE_FONNTE_KEY` → dari Fonnte
     - `VITE_TURNSTILE_SITE_KEY` → dari Cloudflare dashboard
     - `VITE_QR_SECRET` → sama dengan `QR_SECRET` di Railway

4. **PENTING — Redirect /api/\*:**
   Di Cloudflare Pages dashboard → Workers & Pages → Create Worker:

```javascript
// worker.js — route /api/* ke Railway
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const targetUrl = `https://seruni-api.up.railway.app${url.pathname}${url.search}`;
      return fetch(targetUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          "X-Forwarded-Host": url.host,
        },
        body: request.body,
      });
    }
    return fetch(request);
  },
};
```

### 3. Custom Domain (Opsional)

- Cloudflare Pages: Tambahkan domain di Pages dashboard
- Railway: Tambahkan domain di Railway dashboard → Settings → Domains

## ENVIRONMENT FILES

Buat `.env` untuk development:

```bash
# Development — local API server
NODE_ENV=development
PORT=3001

# Supabase
VITE_SUPABASE_URL=https://wrfraskmawmciiutwcpx.supabase.co
VITE_SUPABASE_ANON_KEY=...

# Admin Auth
VITE_ADMIN_USER=admindesa
VITE_ADMIN_SESSION_SECRET=your-64-char-secret-minimum-32

# Session signing (server-side)
ADMIN_SESSION_SECRET=your-64-char-secret-minimum-32

# QR
VITE_QR_SECRET=your-qr-secret
QR_SECRET=your-qr-secret

# WhatsApp
VITE_FONNTE_KEY=...

# Turnstile
VITE_TURNSTILE_SITE_KEY=...

# ALLOWED_ORIGIN — untuk development, kosongkan atau localhost
ALLOWED_ORIGIN=
```

## TROUBLESHOOTING

### API returns 403/401

→ Cek `ALLOWED_ORIGIN` di Railway harus sama persis dengan frontend URL
→ Termasuk https:// dan tanpa trailing slash

### CORS errors di browser

→ Pastikan Railway ALLOWED_ORIGIN diset ke Cloudflare Pages URL
→ Cek tidak ada http/https mismatch

### Build fails di Cloudflare Pages

→ Pastikan `npm run build` tidak memerlukan VITE\_ variabel yang belum di-set
→ Test build locally: `npm run build`

### Database connection fails

→ Cek SUPABASE_SERVICE_ROLE_KEY dan SUPABASE_URL di Railway dashboard
→ Pastikan Supabase IP allowlist mencakup Railway IPs
