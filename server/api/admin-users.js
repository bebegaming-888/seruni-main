/**
 * GET /api/admin-users
 *
 * Server-side proxy for admin user management.
 * Browser cannot read admin_users directly (RLS: service_role only).
 * Browser calls this endpoint with HMAC-signed admin session.
 * Server uses SUPABASE_SERVICE_ROLE_KEY to read from admin_users table.
 *
 * Auth: Admin session (HMAC-signed + role check)
 * Query: { limit?: number, offset?: number }
 * Response: { ok: true, data: { users: [...], pagination: {...} } or { ok: false, error: string, code: number }
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { serverError, unavailable, ok } from "../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Middleware: verify + role check ─────────────────────────────────────────

async function adminUsersAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;

  const ALLOWED_ROLES = ["Super Admin", "Operator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;

  next();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePagination(raw) {
  const val = parseInt(raw, 10);
  return Number.isNaN(val) || val < 1 ? null : val;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

router.get("/", adminUsersAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return unavailable(res, "Database belum dikonfigurasi.");
  }

  // Parse pagination — clamp to safe bounds
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;
  let limit = sanitizePagination(req.query.limit) ?? DEFAULT_LIMIT;
  let offset = sanitizePagination(req.query.offset) ?? 0;
  limit = Math.min(limit, MAX_LIMIT);
  offset = Math.max(0, offset);

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch total count
    const { count, error: countError } = await sb
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[admin-users] Count error:", countError.message);
    }

    // Fetch paginated data — explicitly select only safe fields
    const { data, error } = await sb
      .from("admin_users")
      .select("id, username, name, email, role, fixed, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[admin-users] Fetch error:", error.message);
      return serverError(res, "Gagal mengambil data admin.");
    }

    const users = (data ?? []).map((u) => ({ ...u }));
    const total = count ?? users.length;

    return ok(res, {
      users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      },
    });
  } catch (err) {
    console.error("[admin-users] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
