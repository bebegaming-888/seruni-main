-- ============================================================
-- MIGRATION 043: Seed Admin Accounts
-- ============================================================
-- Purpose: Add admin accounts for admin login. Stored in Supabase admin_users table.
--
-- Hash format: pbkdf2_sha512$100000$<salt_base64>$<hash_base64>
-- Password verification: PBKDF2-SHA512 (100000 iterations)
-- ============================================================

-- Account 1: supadmin
-- Password: AdminDesa2024!
INSERT INTO public.admin_users (username, password, name, email, role, fixed)
VALUES (
  'supadmin',
  'pbkdf2_sha512$100000$SzESAVByQbLh0a/jZoD9yA==$ykT9KAM6tQFRgSGCjg1ZcwdO5fJ1GIjKp4iACQmZ+dFOg7Q55BM12zSyaRKyHy6XcshAc0V+Xz6/E9Cgucx4KQ==',
  'Super Admin',
  'admin@seruni.id',
  'Super Admin',
  false
) ON CONFLICT (username) DO NOTHING;

-- Account 2: bebe
-- Password: 30488
INSERT INTO public.admin_users (username, password, name, email, role, fixed)
VALUES (
  'bebe',
  'pbkdf2_sha512$100000$s2BM3glY5gOGVHMdBolBcg==$s9vxLxDhM5ajlwuauaH3ZMrJhWqUZXPb6HwnA054S7hno8tiRwEybuH8L0b82iiflcArqtAjORNV25GR1bc5XQ==',
  'Bebe',
  'bebe@seruni.id',
  'Super Admin',
  false
) ON CONFLICT (username) DO NOTHING;

-- Audit log
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'admin_users',
  'Migration 043: Seeded admin accounts (supadmin, bebe)',
  '127.0.0.1',
  'system'
);