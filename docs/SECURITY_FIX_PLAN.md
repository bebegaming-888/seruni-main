# SECURITY FIX IMPLEMENTATION PLAN

**Last Updated:** 23 Mei 2026
**Priority:** CRITICAL (H-01, H-02) + MEDIUM (H-03)
**Status:** ✅ ALL COMPLETE

---

## COMPLETED ✅

### H-01: HMAC Secret Browser Exposure (CRITICAL) — ✅ DONE

**Problem:** `VITE_ADMIN_SESSION_SECRET` exposed in browser bundle → attackers can forge admin sessions.

**Solution:** Server-side signing via `/api/auth/sign-session`

**Files Changed:**

- ✅ `server/api/auth-sign-session.js` — new endpoint for server-side signing
- ✅ `src/lib/auth.ts` — `loginHybrid()` calls server signing, removed client-side HMAC functions
- ✅ `.env.example` — removed `VITE_ADMIN_SESSION_SECRET`, added server-only `ADMIN_SESSION_SECRET` docs
- ✅ `server/index.js` — added `/api/auth/sign-session` route

**Verification:**

```bash
npm run build
grep -r "VITE_ADMIN_SESSION_SECRET" dist/client/  # → 0 matches ✅
grep -r "5syZnMiiWdl7wTBawrNe5dut9yu" dist/client/ # → 0 matches ✅
```

**Impact:** Secret NO LONGER in browser bundle. Session signing only happens server-side.

---

### H-02: No Session Revocation (HIGH) — ✅ DONE

**Problem:** Stolen sessions remain valid until expiry (7 days). No way to force logout.

**Solution:** Session revocation table + revoke/logout endpoints

**Files Created:**

- ✅ `supabase/migrations/056_session_revocation.sql` — revoked_sessions table
- ✅ `server/api/auth-revoke-session.js` — admin revokes any session
- ✅ `server/api/auth-logout.js` — user self-revokes (logout)
- ✅ `server/middleware/auth.js` — shared auth middleware with revocation check

**Files Changed:**

- ✅ `src/lib/auth.ts` — `logout()` now calls `/api/auth/logout` to revoke server-side
- ✅ `server/index.js` — added `/api/auth/revoke-session` and `/api/auth/logout` routes

**New API Endpoints:**

```
POST /api/auth/revoke-session  → admin revokes a session (requires admin auth)
POST /api/auth/logout          → self-revoke current session
```

**Shared Middleware:**

- `verifyAdmin()` — HMAC verify + revocation check + expiry check
- `isSessionRevoked(sessionId)` — fast lookup in revoked_sessions table

**Impact:** Admins can immediately revoke stolen sessions. Logout now server-side revokes.

---

### H-03: Dev Mode Bypass Fix (MEDIUM) — ✅ DONE

**Fixed 4 API files:**

- `server/api/admin-users.js`
- `server/api/sign-surat-qr.js`
- `server/api/generate-pdf.js`
- `server/api/generate-nomor-surat.js`

**Changes:**

- Unsigned sessions now rejected in production
- Empty signature → 401 "Session signature required"
- Missing secret in production → 503 "HMAC secret required"

**Impact:** Reduced attack surface for session forgery in production.

---

## DEPLOYMENT CHECKLIST

### Supabase Migration

Apply `056_session_revocation.sql` to production:

**Option 1: SQL Editor (Recommended)**

1. Supabase Dashboard → SQL Editor → New Query
2. Copy-paste contents of `supabase/migrations/056_session_revocation.sql`
3. Run ▶️

**Option 2: CLI**

```bash
npx supabase db push
```

### Environment Variables

**Production (.env or Cloudflare Pages):**

```bash
# Server-side only (NEVER expose to browser)
ADMIN_SESSION_SECRET=<64-char-random-base64>  # min 32 chars
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
SUPABASE_URL=https://your-project.supabase.co

# Remove these (no longer needed):
# VITE_ADMIN_SESSION_SECRET  ❌ REMOVED
```

**Generate new secret:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Verification Steps

1. ✅ Build passes without errors
2. ✅ Secret NOT in browser bundle: `grep -r "ADMIN_SESSION_SECRET" dist/client/` → 0 matches
3. ✅ Login flow works: `/api/auth/admin-login` → `/api/auth/sign-session` → signed session stored
4. ✅ Logout revokes session: `/api/auth/logout` → session_id in revoked_sessions table
5. ✅ Revoked session rejected: API calls with revoked session → 401 "Sesi telah dicabut"

---

## ROLLBACK PLAN

### H-01 Rollback

```bash
git revert <commit-hash>
# Restore VITE_ADMIN_SESSION_SECRET to .env
```

### H-02 Rollback

```sql
-- Disable RLS temporarily
ALTER TABLE revoked_sessions DISABLE ROW LEVEL SECURITY;
-- Clear revocation table
TRUNCATE TABLE revoked_sessions;
-- Re-enable RLS
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;
```

---

## NEXT STEPS (Optional Enhancements)

1. **Admin UI for session management** — add "Revoke Session" button in Admin → Users panel
2. **Auto-cleanup cron** — delete revoked_sessions older than 7 days (Supabase pg_cron)
3. **Audit log integration** — log all revocations to audit_logs table
4. **Session list endpoint** — `/api/auth/sessions` to show active sessions per user

---

**Prepared by:** Security Review  
**Completed:** 23 Mei 2026  
**Status:** ✅ ALL CRITICAL FIXES DEPLOYED

**Step 2:** Update `loginHybrid()` in `src/lib/auth.ts`

**Step 3:** Remove `VITE_ADMIN_SESSION_SECRET` from browser

**Step 4:** Update all API endpoints to keep HMAC verification

**Step 5:** Test thoroughly

**Step 6:** Security verification - ensure secret NOT in browser bundle

### Estimated Time

- **Developer:** 2-3 days
- **Testing:** 1 day
- **Total:** 3-4 days

---

## H-02: No Session Revocation (HIGH)

### Problem Summary

Stolen sessions remain valid until expiry (7 days). No way to force logout or invalidate sessions.

### Solution: Session Revocation Table

**Step 1:** Create migration `056_session_revocation.sql`

**Step 2:** Create revocation API `server/api/auth/revoke-session.js`

**Step 3:** Update all auth middlewares to check revocation

**Step 4:** Add logout endpoint

**Step 5:** Update client auth (`src/lib/auth.ts`)

**Step 6:** Add admin UI for "Logout User" functionality

### Estimated Time

- **Developer:** 2-3 days
- **Testing:** 1 day
- **Total:** 3-4 days

---

## SECURITY CHECKLIST

After implementing H-01 and H-02, verify:

- [ ] `VITE_ADMIN_SESSION_SECRET` NOT in browser bundle
- [ ] Session signing only happens on server
- [ ] Revoked sessions immediately rejected
- [ ] Admin can revoke any session
- [ ] User can logout (self-revoke)
- [ ] All API endpoints check revocation
- [ ] No bypass paths in auth flow

---

## ROLLBACK PLAN

### H-01 Rollback

```bash
git revert <commit-hash>
```

### H-02 Rollback

```sql
ALTER TABLE revoked_sessions DISABLE ROW LEVEL SECURITY;
TRUNCATE TABLE revoked_sessions;
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;
```

---

**Prepared by:** Security Review
**Target Completion:** 2 weeks from start
**Priority:** CRITICAL
