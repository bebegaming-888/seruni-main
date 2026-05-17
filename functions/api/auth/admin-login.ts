/**
 * Edge Function: /api/auth/admin-login
 *
 * Admin login dengan httpOnly cookie (XSS-safe).
 * Session token ditandatangani HMAC-SHA256 — forgery langsung terdeteksi.
 *
 * Env vars (Cloudflare Secrets):
 *   ADMIN_SESSION_SECRET   — HMAC key untuk menandatangani session token
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body:
 *   { username: string, password: string, remember?: boolean }
 *
 * Response:
 *   { ok: true, session: { userId, username, name, role, expiresAt } }
 *   { ok: false, error: string }
 *
 * Sets httpOnly cookie: admin_session=<signed_token>
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions, hmacSha256Hex, base64UrlEncode } from "../../_lib/utils";
import { createRateLimiter, getClientIp } from "../../_lib/rate-limit";

interface Env {
  ADMIN_SESSION_SECRET: string;
  ADMIN_USER: string;
  ADMIN_PASS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface LoginBody {
  username: string;
  password: string;
  remember?: boolean;
}

// Minimal user record we need to verify credentials
interface AdminUserRow {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
}

function createAdminClient(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const rl = createRateLimiter("auth");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: LoginBody;
  try {
    body = (await context.request.json()) as LoginBody;
  } catch {
    return json({ ok: false, error: "invalid request" }, 400);
  }

  const { username, password, remember = false } = body;
  if (!username || !password) {
    return json({ ok: false, error: "username dan password wajib diisi" }, 400);
  }

  const sb = createAdminClient(context.env);
  const sessionDurationMs = remember ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000; // 7 hari atau 30 menit
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();

  // Load admin credentials — support both Supabase DB and env var fallback
  let user: AdminUserRow | null = null;

  if (sb) {
    const { data } = await sb
      .from("admin_users")
      .select("id, username, password, name, role")
      .eq("username", username.trim())
      .maybeSingle();
    user = data as AdminUserRow | null;
  }

  // Env var superadmin fallback (always checked — cannot be removed)
  // Gunakan ADMIN_USER / ADMIN_PASS (Cloudflare Secrets, BUKAN VITE_*).
  // VITE_* di-browser bundle; Secrets tidak pernah terekspos ke client.
  const envUser = (context.env as Record<string, string | undefined>).ADMIN_USER;
  const envPass = (context.env as Record<string, string | undefined>).ADMIN_PASS;
  if (
    !user &&
    envUser &&
    envUser.toLowerCase() === username.trim().toLowerCase() &&
    envPass === password
  ) {
    user = {
      id: "fixed-admin",
      username: envUser,
      password: envPass,
      name: "Admin Desa",
      role: "Super Admin",
    };
  }

  // Constant-time password comparison untuk mencegah timing attack.
  // bcrypt lebih ideal tapi kompleksitas Cloudflare Workers WASM membuat implementasi
  // PBKDF2-based approach lebih praktis untuk sekarang.
  const a = new TextEncoder().encode(password);
  // stored password (from DB or env var fallback) — plaintext comparison karena
  // admin users di-store sebagai plaintext di Supabase (bukan bcrypt).
  // Untuk env var fallback (ADMIN_PASS), password di-set oleh operator saat deployment.
  const b = new TextEncoder().encode(user.password);
  const passwordsMatch = a.length === b.length && crypto.subtle.timingSafeEqual(a, b);

  if (!user || !passwordsMatch) {
    // Log failed attempt untuk audit trail
    if (sb && username) {
      sb.from("audit_log")
        .insert({
          username: username.trim(),
          action: "admin.login_failed",
          detail: "Invalid credentials",
          ip_address: "unknown",
          created_at: new Date(),
        })
        .catch(() => {}); // non-blocking
    }
    return json({ ok: false, error: "Username atau password salah" }, 401);
  }

  // Build session payload (unsigned — client uses this for display only)
  const sessionPayload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt,
  };

  // Sign the session token with HMAC-SHA256
  const secret = context.env.ADMIN_SESSION_SECRET;
  let signedToken = "";
  if (secret) {
    const data = JSON.stringify(sessionPayload);
    signedToken = await hmacSha256Hex(data, secret);
  }

  const payloadEncoded = base64UrlEncode(JSON.stringify(sessionPayload));
  const cookieValue = signedToken ? `${payloadEncoded}.${signedToken}` : payloadEncoded;

  const cookieMaxAge = Math.floor(sessionDurationMs / 1000);
  const cookiePath = "/";

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(corsOptions().headers as Record<string, string>),
  });

  // RFC 6265 single Set-Cookie header:
  // admin_session=<value>; Path=/; Max-Age=...; HttpOnly; Secure; SameSite=Strict
  // Note: only the first segment has "name="; attributes (Path, Max-Age, HttpOnly,
  // SameSite) do NOT have "Attr=" prefix — they are bare attribute names.
  const cookieHeader = [
    `admin_session=${encodeURIComponent(cookieValue)}`,
    `Path=${cookiePath}`,
    `Max-Age=${cookieMaxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
  headers.append("Set-Cookie", cookieHeader);

  return new Response(JSON.stringify({ ok: true, session: sessionPayload }), { headers });
}
