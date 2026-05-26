# Deployment Guide — Seruni Mumbul E-Government System

**Last Updated:** 23 Mei 2026  
**Target Platform:** Cloudflare Pages (Frontend) + Self-hosted Express (Backend)  
**Prerequisites:** Node.js 18+, Bun/npm, Git, Supabase account

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Frontend Deployment (Cloudflare Pages)](#frontend-deployment)
5. [Backend Deployment (Self-hosted)](#backend-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure ALL of the following are complete:

### Critical Blockers

- [ ] All CRITICAL security vulnerabilities fixed (see `PRODUCTION_READINESS.md`)
- [ ] HMAC secret configured (min 64 chars)
- [ ] Supabase RLS policies verified
- [ ] Rate limiting tested
- [ ] Backup system verified

### Code Quality

- [ ] `npm run lint` passes with 0 errors
- [ ] `tsc --noEmit` passes with 0 type errors
- [ ] `npm run build` succeeds
- [ ] Test coverage ≥ 60% for critical paths

### Configuration

- [ ] All environment variables documented
- [ ] Secrets stored in secure vault (not in git)
- [ ] CORS configured for production domain
- [ ] CSP headers configured

### Monitoring

- [ ] Sentry DSN configured
- [ ] UptimeRobot monitoring active
- [ ] Error alerting configured

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/seruni-mumbul.git
cd seruni-mumbul
bun install
```

### 2. Environment Variables

Create `.env.production` file:

```bash
# Frontend (VITE_ prefix = exposed to browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_SESSION_SECRET=your-64-char-secret-here
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key

# Backend (server-side only, NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SESSION_SECRET=your-64-char-secret-here  # MUST match VITE_ADMIN_SESSION_SECRET
ADMIN_USER=admindesa
ADMIN_PASS=your-secure-password-here
QR_SECRET=your-qr-signing-secret
FONNTE_API_KEY=your-fonnte-api-key
ADMIN_WA_NUMBER=628123456789
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
ALLOWED_ORIGIN=https://your-domain.com
PORT=3001
NODE_ENV=production
```

**CRITICAL:** Never commit `.env.production` to git. Use secret management:

- Cloudflare Pages: Environment Variables UI
- Self-hosted: `.env.production` with `chmod 600`

### 3. Generate Secrets

```bash
# Generate HMAC secret (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate QR secret (32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## Database Migration

### 1. Verify Supabase Connection

```bash
# Test connection
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

### 2. Run Migrations

Migrations are in `supabase/migrations/`. Apply in order:

```bash
# Option A: Via Supabase CLI (recommended)
supabase db push

# Option B: Manual via SQL Editor
# Copy-paste each migration file in order (000 → 055)
```

### 3. Verify RLS Policies

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Should return 0 rows (all tables have RLS enabled)
```

### 4. Seed Initial Data

```bash
# Run seed script (creates super admin, default settings)
node scripts/seed-production.js
```

---

## Frontend Deployment

### Platform: Cloudflare Pages

### 1. Build Frontend

```bash
# Production build
NODE_ENV=production npm run build

# Verify output
ls -lh dist/client/
# Should see: index.html, assets/, _headers
```

### 2. Configure Cloudflare Pages

**Build Settings:**

- Build command: `npm run build`
- Build output directory: `dist/client`
- Root directory: `/`
- Node version: `18`

**Environment Variables:**
Add all `VITE_*` variables from `.env.production`

### 3. Deploy

```bash
# Option A: Git push (automatic deployment)
git push origin main

# Option B: Manual via Wrangler CLI
npx wrangler pages publish dist/client --project-name=seruni-mumbul
```

### 4. Configure Custom Domain

1. Go to Cloudflare Pages → Custom domains
2. Add `desa-serunimumbul.id`
3. Update DNS records (CNAME to `seruni-mumbul.pages.dev`)
4. Wait for SSL certificate (5-10 minutes)

### 5. Verify Deployment

```bash
# Check frontend
curl -I https://desa-serunimumbul.id
# Should return: 200 OK

# Check CSP headers
curl -I https://desa-serunimumbul.id | grep -i content-security-policy
# Should see CSP header
```

---

## Backend Deployment

### Platform: Self-hosted VPS (Ubuntu 22.04 LTS)

### 1. Server Setup

```bash
# SSH to server
ssh root@your-server-ip

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Create app user
sudo useradd -m -s /bin/bash seruni
sudo su - seruni
```

### 2. Deploy Backend Code

```bash
# Clone repo
git clone https://github.com/your-org/seruni-mumbul.git
cd seruni-mumbul

# Install dependencies
npm install --production

# Copy environment file
cp .env.production.example .env.production
nano .env.production  # Fill in secrets
chmod 600 .env.production
```

### 3. Start with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'seruni-api',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env_file: '.env.production',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
  }]
};
EOF

# Start
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the command it outputs
```

### 4. Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sivailable/seruni-api

# Paste this config:
server {
    listen 80;
    server_name api.desa-serunimumbul.id;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/seruni-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSL with Certbot

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.desa-serunimumbul.id

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### 6. Configure Firewall

```bash
# Allow HTTP, HTTPS, SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# API health
curl https://api.desa-serunimumbul.id/api/health-check
# Expected: {"status":"ok","timestamp":"..."}

# Frontend
curl -I https://desa-serunimumbul.id
# Expected: 200 OK
```

### 2. Test Critical Flows

```bash
# Admin login
curl -X POST https://api.desa-serunimumbul.id/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admindesa","password":"your-password"}'
# Expected: {"ok":true,"session":{...}}

# Warga OTP request
curl -X POST https://api.desa-serunimumbul.id/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"nik":"1234567890123456"}'
# Expected: {"ok":true,"message":"OTP dikirim..."}
```

### 3. Monitor Logs

```bash
# PM2 logs
pm2 logs seruni-api --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 4. Setup Monitoring

```bash
# UptimeRobot
# Add monitor: https://desa-serunimumbul.id
# Add monitor: https://api.desa-serunimumbul.id/api/health-check

# Sentry
# Verify DSN in .env.production
# Check Sentry dashboard for errors
```

---

## Rollback Procedure

### If Deployment Fails

#### Frontend Rollback (Cloudflare Pages)

```bash
# Via Cloudflare Dashboard
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "Rollback to this deployment"

# Via Git
git revert HEAD
git push origin main
# Cloudflare auto-deploys
```

#### Backend Rollback (PM2)

```bash
# SSH to server
ssh seruni@your-server-ip

# Stop current version
pm2 stop seruni-api

# Checkout previous version
cd ~/seruni-mumbul
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# Restart
pm2 restart seruni-api
pm2 logs seruni-api
```

### Database Rollback

```bash
# CRITICAL: Only rollback if migration failed
# Supabase migrations are NOT automatically reversible

# Manual rollback via SQL
# 1. Identify fd migration
# 2. Write reverse migration SQL
# 3. Apply via Supabase SQL Editor
```

---

## Troubleshooting

### Frontend Issues

**Problem:** White screen / blank page

```bash
# Check browser console for errors
# Common causes:
# 1. VITE_SUPABASE_URL not set
# 2. CSP blocking scripts
# 3. Missing _headers file

# Fix: Verify environment variables
# Rebuild: npm run build
```

**Problem:** API calls fail with CORS error

```bash
# Check ALLOWED_ORIGIN in backend .env.production
# Should match frontend domain exactly

# Fix:
ALLOWED_ORIGIN=https://desa-serunimumbul.id
pm2 restart seruni-api
```

### Backend Issues

**Problem:** PM2 process crashes

```bash
# Check logs
pm2 logs seruni-api --err --lines 50

# Common causes:
# 1. Missing environment variables
# 2. Supabase connection failed
# 3. Port 3001 already in use

# Fix: Check .env.production
pm2 restart seruni-api
```

**Problem:** 502 Bad Gateway

```bash
# Check if PM2 is running
pm2 status

# Check Nginx config
sudo nginx -t

# Check if port 3001 is listening
sudo netstat -tlnp | grep 3001

# Restart services
pm2 restart seruni-api
sudo systemctl restart nginx
```

### Database Issues

**Problem:** RLS policy blocks queries

```sql
-- Check current user role
SELECT current_user, current_setting('request.jwt.claims', true);

-- Temporarily disable RLS for debugging (NEVER in production)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after fix
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

## Emergency Contacts

- **System Admin:** admin@desa-serunimumbul.id
- **Supabase Support:** https://supabase.com/support
- **Cloudflare Support:** https://dash.cloudflare.com/support

---

## Next Steps

After successful deployment:

1. ✅ Monitor logs for 24 Test all critical user flows
2. ✅ Setup automated backups (see `RUNBOOK.md`)
3. ✅ Train village staff on admin panel
4. ✅ Announce to public

---

**Prepared by:** DevOps Team  
**Version:** 1.0  
**Last Tested:** 23 Mei 2026
