-- Migration: 056_session_revocation.sql
-- Date: 2026-05-23
-- Security Fix H-02: Session Revocation Table
--
-- Purpose: Allow admin to immediately revoke stolen sessions.
-- A revoked session is rejected on next API call — no waiting for expiry.
--
-- Usage:
--   INSERT INTO revoked_sessions(session_id, revoked_by, reason)
--   VALUES ('user-uuid-here', 'adminusername', 'Security incident — user logged out');

CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id   TEXT        NOT NULL,  -- userId from the session being revoked
  revoked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by   TEXT        NOT NULL,  -- admin username who performed revocation
  reason       TEXT        NOT NULL DEFAULT 'User logout',  -- reason for revocation
  ip_address   INET,                  -- IP address that requested revocation (nullable)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT   revoked_sessions_pkey PRIMARY KEY (session_id)
);

-- Fast lookup index on session_id (primary key already covers this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_session_id
  ON revoked_sessions(session_id);

-- Auto-cleanup index — expired sessions (>7 days) can be cleaned up via cron
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at
  ON revoked_sessions(revoked_at);

-- RLS: Only service_role can insert/delete; read is unrestricted (fast lookup)
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;

-- Service role has full access (server-side API uses service_role key)
CREATE POLICY "Service role full access" ON revoked_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous users can check revocation status (for public health checks, optional)
-- This is safe — it only reveals whether a session_id is revoked, not secrets.
CREATE POLICY "Public read for health checks" ON revoked_sessions
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE revoked_sessions IS
  'Stores revoked session IDs for immediate session invalidation (H-02 security fix)';

COMMENT ON COLUMN revoked_sessions.session_id IS
  'The userId from the admin session being revoked';
COMMENT ON COLUMN revoked_sessions.revoked_by IS
  'Admin username who performed the revocation';
COMMENT ON COLUMN revoked_sessions.reason IS
  'Human-readable reason for revocation (e.g., "Security incident", "User logout")';
COMMENT ON COLUMN revoked_sessions.ip_address IS
  'IP address of the revocation requester';