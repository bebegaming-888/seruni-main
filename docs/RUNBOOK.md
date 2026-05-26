# Operational Runbook — Seruni Mumbul E-Government System

**Last Updated:** 23 Mei 2026  
**Version:** 1.0  
**For:** System Administrators & Village Tech Support

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Common Issues & Fixes](#common-issues--fixes)
3. [Emergency Procedures](#emergency-procedures)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Contact Information](#contact-information)

---

## Daily Operations

### 1. Morning Health Check (5 minutes)

```bash
# SSH to server
ssh seruni@your-server-ip

# Check PM2 status
pm2 status
# Expected: seruni-api status = online

# Check API health
curl -s https://api.desa-serunimumbul.id/api/health-check
# Expected: {"status":"ok",...}

# Check error logs
pm2 logs seruni-api --lines 20 --nostream | grep -i error
# Expected: No errors (or known/resolved errors)

# Check disk space
df -h
# Expected: /dev/vda1 < 80%
```

### 2. Monitor Supabase Dashboard

1. Go to https://supabase.com/project/your-project
2. Check **Database** → **Logs** for errors
3. Check **Storage** → **Usage** for quota
4. Check **Auth** → **Logs** for failed attempts (brute force protection)

### 3. Check Backup Status

```bash
# Check Supabase backup schedule
# Go to: Database → Backups
# Verify: Daily backups enabled

# Manual backup test (monthly)
node scripts/test-backup-restore.js
```

---

## Common Issues & Fixes

### Issue 1: "Terlalu banyak percobaan login" (Rate Limited)

**Symptoms:** User cannot login, error message about too many attempts

**Cause:** Too many failed login attempts from same IP

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Reset rate limiter by restarting
pm2 restart seruni-api

# OR wait 15 minutes (rate limit auto-resets)
```

### Issue 2: "Sesi tidak valid atau sudah kadaluarsa" (Session Expired)

**Symptoms:** Admin logged in but gets unauthorized errors

**Cause:** Session expired (7 days) or HMAC signature issue

**Fix:**

1. Ask user to logout and login again
2. Clear browser cache (Ctrl+Shift+R)
3. If persists, check server time: `date` on server

### Issue 3: API Returns 500 Error

**Symptoms:** API calls fail with 500 Internal Server Error

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check logs
pm2 logs seruni-api --lines 50

# Common causes:
# 1. Supabase connection failed
# 2. Missing environment variable
# 3. Database migration error

# Fix: Restart API
pm2 restart seruni-api

# If still broken, check Supabase status
# https://status.supabase.com/
```

### Issue 4: WhatsApp Notification Not Sending

**Symptoms:** User doesn't receive WA notification

**Cause:** Fonnte API key issue, or phone number not registered

**Fix:**

1. Check Fonnte dashboard: https://dashboard.fonnte.com
2. Verify API key in `.env.production`
3. Check recipient phone number format (must be 62...)
4. Test manually:

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_FONNTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target":"6281234567890","message":"Test","countryCode":"62"}'
```

### Issue 5: PDF Download Not Working

**Symptoms:** Download button doesn't work

**Cause:** Surat not yet "Disetujui" status

**Fix:**

1. Verify surat status is "Disetujui" in admin panel
2. Check browser console for CORS errors
3. Verify session is valid (logout and login again)

### Issue 6: "Server misconfigured" Error

**Symptoms:** API returns 503 "Server misconfigured"

**Cause:** Missing environment variable (ADMIN_SESSION_SECRET, etc.)

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check .env.production
cat ~/seruni-mumbul/.env.production | grep -E "ADMIN_SESSION_SECRET|SUPABASE_SERVICE_ROLE_KEY"

# If missing, add and restart
nano ~/seruni-mumbul/.env.production
# Add: ADMIN_SESSION_SECRET=your-64-char-secret
pm2 restart seruni-api
```

### Issue 7: CORS Error in Browser

**Symptoms:** Console shows "Access-Control-Allow-Origin" error

**Cause:** Frontend domain not in ALLOWED_ORIGIN

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check ALLOWED_ORIGIN
grep ALLOWED_ORIGIN ~/seruni-mumbul/.env.production

# If wrong, update
nano ~/seruni-mumbul/.env.production
# Set: ALLOWED_ORIGIN=https://your-frontend-domain.com
pm2 restart seruni-api
```

---

## Emergency Procedures

### Emergency 1: Server Down

**Symptoms:** API returns 502/503, PM2 status offline

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check PM2
pm2 status

# If offline, start it
pm2 start seruni-api

# Check logs
pm2 logs seruni-api --lines 100

# If crashes immediately, check .env
cat ~/seruni-mumbul/.env.production

# If disk full
df -h
pm2 flush  # Clear logs
```

### Emergency 2: Database Unavailable

**Symptoms:** "Supabase not configured" error

**Fix:**

1. Check Supabase status: https://status.supabase.com/
2. If Supabase is down, wait and monitor
3. If local issue, check environment:

```bash
grep SUPABASE_URL ~/seruni-mumbul/.env.production
grep SUPABASE_SERVICE_ROLE_KEY ~/seruni-mumbul/.env.production
```

4. Test Supabase connection:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://your-project.supabase.co/rest/v1/"
# Should return 200
```

### Emergency 3: Security Incident (Breach Suspected)

**Symptoms:** Unusual activity, unauthorized access, data leak

**Fix:**

1. **IMMEDIATE:**

```bash
# Rotate all secrets
# Generate new HMAC secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env.production with new secrets
nano ~/seruni-mumbul/.env.production

# Restart API
pm2 restart seruni-api

# Force logout all users (clear sessions)
pm2 restart seruni-api --update-env
```

2. **INVESTIGATE:**

```bash
# Check auth logs
pm2 logs seruni-api --lines 500 | grep -E "login|401|403"

# Check Supabase auth logs
# Go to: Supabase Dashboard → Auth → Logs

# Check for suspicious IPs
pm2 logs seruni-api --lines 1000 | awk '/IP/ {print}'
```

3. **REPORT:**

- Document timeline of incident
- Report to village head
- Consider disclosure to affected users

### Emergency 4: Full Disk

**Symptoms:** "No space left on device", PM2 crashes

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check disk usage
df -h

# Clear PM2 logs
pm2 flush

# Clear old logs
sudo find /var/log -name "*.gz" -mtime +7 -delete
sudo journalctl --vacuum-time=7d

# If /home is full
cd ~/seruni-mumbul
du -sh logs/
rm -rf logs/*.log
pm2 restart seruni-api

# Verify
df -h
```

### Emergency 5: Reset Admin Password

**Symptoms:** Forgot admin password, cannot login

**Fix:**

```bash
# SSH to server
ssh seruni@your-server-ip

# Check current password
grep ADMIN_PASS ~/seruni-mumbul/.env.production

# If you have access to Supabase:
# 1. Go to Supabase SQL Editor
# 2. Run:
UPDATE admin_users SET password_hash = 'NEW_HASH' WHERE username = 'admindesa';

# If no access, update .env.production
nano ~/seruni-mumbul/.env.production
# Set: ADMIN_PASS=NewSecurePassword123
pm2 restart seruni-api
```

---

## Maintenance Tasks

### Monthly Tasks

1. **Database Backup Verification**

```bash
# Test backup restore
node scripts/test-backup-restore.js
# Takes ~30 minutes
```

2. **Security Audit**

```bash
# Check for failed login attempts
pm2 logs seruni-api --lines 10000 | grep -E "401|403" | wc -l

# If > 100 in a month, consider adding IP blocklist
```

3. **Update Dependencies**

```bash
# Check for security updates
npm audit

# Update (carefully, test first)
npm update

# Rebuild
npm run build

# Test locally before deploying
```

### Quarterly Tasks

1. **Renew SSL Certificates**

```bash
# Certbot auto-renews, but verify
sudo certbot renew --dry-run
```

2. **Review User Access**

```bash
# Check admin_users table
# Remove inactive users
# Update roles as needed
```

3. **Performance Review**

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.desa-serunimumbul.id/api/health-check

# Check database query performance
# Supabase Dashboard → Database → Performance
```

---

## Contact Information

### Internal Contacts

| Role         | Name   | Contact       |
| ------------ | ------ | ------------- |
| System Admin | [Name] | [Phone/Email] |
| Village Head | [Name] | [Phone/Email] |
| Tech Support | [Name] | [Phone/Email] |

### External Support

| Service            | Contact                             | Hours          |
| ------------------ | ----------------------------------- | -------------- |
| Supabase Support   | https://supabase.com/support        | 24/7           |
| Cloudflare Support | https://dash.cloudflare.com/support | 24/7           |
| Fonnte Support     | https://fonnte.com/support          | Business hours |

### Escalation Path

1. **Level 1:** System Admin (internal)
2. **Level 2:** Tech Support (vendor)
3. **Level 3:** Supabase/Cloudflare support
4. **Level 4:** External consultant

---

## Quick Reference

### Useful Commands

```bash
# Restart API
pm2 restart seruni-api

# View logs
pm2 logs seruni-api --lines 100

# Check status
pm2 status

# Clear logs
pm2 flush

# Monitor in real-time
pm2 monit

# Update from git
cd ~/seruni-mumbul
git pull origin main
npm install
pm2 restart seruni-api
```

### Important URLs

| URL                                       | Purpose      |
| ----------------------------------------- | ------------ |
| https://desa-serunimumbul.id              | Frontend     |
| https://api.desa-serunimumbul.id          | Backend API  |
| https://supabase.com/project/your-project | Database     |
| https://dashboard.fonnte.com              | WhatsApp API |
| https://dash.cloudflare.com               | Hosting      |

---

## Document Control

| Version | Date        | Author | Changes         |
| ------- | ----------- | ------ | --------------- |
| 1.0     | 23 Mei 2026 | System | Initial version |

**Next Review:** 23 Agustus 2026

---

**Remember:** When in doubt, check the logs first. Most issues can be diagnosed from `pm2 logs seruni-api`.
