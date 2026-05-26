# SECURITY FIX IMPLEMENTATION PLAN

**Last Updated:** 23 Mei 2026
**Priority:** CRITICAL (H-01, H-02) + MEDIUM (H-03 - DONE)
**Status:** H-03 ✅ Complete, H-01 & H-02 Pending

---

## COMPLETED ✅

### H-03: Dev Mode Bypass Fix

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

## PENDING 🔴

## H-01: HMAC Secret Browser Exposure (CRITICAL)

### Problem Summary

Currently, `VITE_ADMIN_SESSION_SECRET` is exposed to the browser bundle, allowing attackers to:

1. Forge admin sessions with any role
2. Bypass all server-side auth checks
3. Access sensitive admin functions

### Root Cause

```
Browser Bundle
├── VITE_ADMIN_SESSION_SECRET (exposed!)
└── hmacSign() function
    └── User can sign arbitrary session data
```

### Solution: Server-Side Signing

Move session signing from browser to server:

```
NEW FLOW:
1. Client sends unsigned session to server
2. Server verifies credentials
3. Server signs session with SERVER-SIDE secret
4. Server returns signed session
5. Client stores signed session
6. All future API calls use signed session
```

### Implementation Steps

#### Step 1: Create New Endpoint

Create `server/api/auth/sign-session.js`:

```javascript
/**
 * POST /api/auth/sign-session
 *
 * Signs an unsigned session with server-side HMAC.
 * Client sends: { userId, username, role, expiresAt }
 * Server returns: { userId, username, role, expiresAt, sig }
 */

import crypto from "crypto";
import express from "express";

const router = express.Router();
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";

router.post("/", (req, res) => {
  const { userId, username, role, expiresAt } = req.body;

  if (!userId || !role || !expiresAt) {
    return res.status(400).json({
      ok: false,
      error: "Invalid session data",
      code: 400,
    });
  }

  if (!ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) {
    return res.status(503).json({
      ok: false,
      error: "Server misconfigured",
      code: 503,
    });
  }

  const payload = `${userId}|${role}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(payload).digest("hex");

  return res.status(200).json({
    ok: true,
    session: { userId, username, role, expiresAt, sig: signature },
  });
});

export default router;
```

#### Step 2: Update loginHybrid()

In `src/lib/auth.ts`, modify `loginHybrid()`:

```typescript
// BEFORE: Client signs session
const sig = await hmacSign(buildSignPayload(userId, role, expiresAt), secret);

// AFTER: Server signs session
const res = await fetch("/api/auth/sign-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, username, role, expiresAt }),
});
const { session: signedSession } = await res.json();
```

#### Step 3: Remove VITE_ADMIN_SESSION_SECRET

**In `.env.example`:**

```
# REMOVE: VITE_ADMIN_SESSION_SECRET (no longer needed in browser)
```

**In `src/lib/auth.ts`:**

```typescript
// REMOVE getSessionSecret() that reads VITE_ADMIN_SESSION_SECRET

// REPLACE with server signing call
export async function signSessionOnServer(sessionData) {
  const res = await fetch("/api/auth/sign-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionData),
  });
  if (!res.ok) throw new Error("Failed to sign session");
  return (await res.json()).session;
}
```

#### Step 4: Update All API Endpoints

All 10+ API endpoints that currently check HMAC should be updated:

- Remove client-side `hmacSign()` call
- Use server-side signing only

**Files to update:**

```
server/api/auth-admin-login.js    → add sign-session endpoint
server/api/sign-surat-qr.js       → keep HMAC check (server verifies)
server/api/generate-pdf.js        → keep HMAC check
server/api/generate-nomor-surat.js → keep HMAC check
server/api/admin-users.js          → keep HMAC check
```

#### Step 5: Test Thoroughly

```bash
# Test 1: Login without signing
curl -X POST http://localhost:3001/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admindesa","password":"..."}'
# Should return unsigned session

# Test 2: Sign session
curl -X POST http://localhost:3001/api/auth/sign-session \
  -H "Content-Type: application/json" \
  -d '{"userId":"...","role":"Super Admin","expiresAt":"..."}'
# Should return signed session

# Test 3: Use signed session
curl -X POST http://localhost:3001/api/generate-pdf \
  -H "Authorization: Bearer <signed-session>" \
  -d '{"no":"..."}'
# Should work

# Test 4: Use unsigned session
curl -X POST http://localhost:3001/api/generate-pdf \
  -H "Authorization: Bearer <unsigned-session>" \
  -d '{"no":"..."}'
# Should return 401
```

#### Step 6: Security Verification

```bash
# Verify VITE_ADMIN_SESSION_SECRET is NOT in browser bundle
npm run build
grep -r "ADMIN_SESSION_SECRET" dist/client/

# Should return: (no matches found)
```

### Estimated Time

- **Developer:** 2-3 days
- **Testing:** 1 day
- **Total:** 3-4 days

---

## H-02: No Session Revocation (HIGH)

### Problem Summary

Stolen sessions remain valid until expiry (7 days). No way to:

1. Force logout a specific user
2. Invalidate session after security incident
3. Revoke access remotely

### Solution: Session Revocation Table

Add database table to track revoked sessions:

#### Step 1: Create Migration

Create `supabase/migrations/056_session_revocation.sql`:

```sql
-- Session Revocation Table
-- Stores revoked session IDs that are immediately invalid

CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id TEXT PRIMARY KEY,        -- The userId or session token
  revoked_at TIMESTAMPTZ NOT NULL,    -- When it was revoked
  revoked_by TEXT NOT NULL,           -- Who revoked it (admin username)
  reason TEXT,                        -- Why it was revoked
  ip_address INET,                    -- IP address that requested revocation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-cleanup: sessions older than 7 days are auto-deleted
ALTER TABLE revoked_sessions SET (
  storage.applies.time_partitions.auto_partition = '7 days'
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_session_id
ON revoked_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at
ON revoked_sessions(revoked_at);

-- RLS: Only admin can insert/delete
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage revoked sessions" ON revoked_sessions
  FOR ALL
  TO authenticated
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' IN ('Super Admin', 'Operator')
  );

-- Service role can do anything
CREATE POLICY "Service role full access" ON revoked_sessions
  FOR ALL
  TO service_role
  USING (true);
```

#### Step 2: Create Revocation API

Create `server/api/auth/revoke-session.js`:

```javascript
/**
 * POST /api/auth/revoke-session
 *
 * Revokes a session immediately.
 * Requires admin auth.
 *
 * Body: { sessionId: string, reason?: string }
 */

import express from "express";
import crypto from "crypto";

const router = express.Router();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";

function hmacVerify(data, sig, secret) {
  /* ... */
}
function buildSignPayload(userId, role, expiresAt) {
  /* ... */
}

function verifyAdmin(req, res, next) {
  /* ... */
}

router.post("/", verifyAdmin, async (req, res) => {
  const { sessionId, reason } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({
      ok: false,
      error: "sessionId wajib diisi",
      code: 400,
    });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(503).json({
      ok: false,
      error: "Supabase not configured",
      code: 503,
    });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Insert revocation record
    const { error } = await sb.from("revoked_sessions").insert({
      session_id: sessionId,
      revoked_at: new Date().toISOString(),
      revoked_by: req.adminSession.username || "system",
      reason: reason || "User requested logout",
      ip_address: req.ip,
    });

    if (error) {
      console.error("[revoke-session] Insert error:", error);
      return res.status(500).json({
        ok: false,
        error: "Gagal mencabut sesi",
        code: 500,
      });
    }

    console.info(`[revoke-session] Session revoked: ${sessionId}`);
    return res.status(200).json({
      ok: true,
      message: "Sesi berhasil dicabut",
    });
  } catch (err) {
    console.error("[revoke-session] Error:", err);
    return res.status(500).json({
      ok: false,
      error: "Terjadi kesalahan",
      code: 500,
    });
  }
});

export default router;
```

#### Step 3: Update Auth Middleware

Update ALL auth middlewares to check revocation:

```javascript
async function isSessionRevoked(sb, sessionId) {
  const { data } = await sb
    .from("revoked_sessions")
    .select("session_id")
    .eq("session_id", sessionId)
    .single();

  return !!data;
}

// In verifyAdmin():
const isRevoked = await isSessionRevoked(sb, session.userId);
if (isRevoked) {
  return res.status(401).json({
    ok: false,
    error: "Sesi telah dicabut. Silakan login ulang.",
    code: 401,
  });
}
```

#### Step 4: Add Logout Endpoint

Create `server/api/auth/logout.js`:

```javascript
/**
 * POST /api/auth/logout
 *
 * Logs out user and revokes session.
 * Client should also clear localStorage.
 */

import express from "express";

const router = express.Router();
// ... similar to revoke-session but for current user
```

#### Step 5: Update Client Auth

In `src/lib/auth.ts`:

```typescript
export async function logout() {
  const session = getSession();
  if (session?.userId) {
    // Notify server to revoke
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getSessionToken()}`,
      },
      body: JSON.stringify({ sessionId: session.userId }),
    });
  }

  // Clear local
  localStorage.removeItem("admin_session");
  sessionStorage.removeItem("admin_session");
}
```

#### Step 6: Add Admin UI

In Admin panel, add "Logout User" functionality:

- Go to Admin → Users
- Find user → Actions → Revoke Session
- Confirmation dialog
- Toast notification on success

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
- [ ] Logout clears local storage
- [ ] All API endpoints check revocation
- [ ] No bypass paths in auth flow

---

## ROLLBACK PLAN

If something goes wrong:

### H-01 Rollback

```bash
# Revert to old signing (client-side)
git revert <commit-hash>

# Restore VITE_ADMIN_SESSION_SECRET to .env.example
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

## DOCUMENTATION

After implementation, update:

- [ ] `docs/GOALS.md` — Mark H-01, H-02 as complete
- [ ] `docs/PRODUCTION_READINESS.md` — Remove from critical blockers
- [ ] `docs/DEPLOYMENT.md` — Add session revocation setup
- [ ] `docs/RUNBOOK.md` — Add revoke-session instructions

---

**Prepared by:** Security Review  
**Target Completion:** 2 weeks from start  
**Priority:** CRITICAL
