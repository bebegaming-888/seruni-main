/**
 * GET  /api/keuangan/coa
 * POST /api/keuangan/coa
 *
 * Chart of Accounts (COA) — list and create accounts.
 *
 * Auth: Admin session (HMAC-signed + role check)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../../middleware/auth.js";
import { badRequest, serverError, ok, notFound } from "../../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Auth Middleware ──────────────────────────────────────────────────────────

async function coaAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// ── GET /api/keuangan/coa ───────────────────────────────────────────────────

router.get("/", coaAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return badRequest(res, "Database belum dikonfigurasi.");
  }

  const { type, active } = req.query;
  const userId = req.adminSession?.userId;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = sb
      .from("keuangan_coa")
      .select("id, code, type, name, parent_code, position, is_active, created_at, updated_at")
      .order("code");

    if (type === "income" || type === "expense") {
      query = query.eq("type", type);
    }
    if (active !== undefined) {
      query = query.eq("is_active", active === "true");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[keuangan/coa] Fetch error:", error.message);
      return serverError(res, "Gagal mengambil data COA.");
    }

    // Build hierarchical tree from flat list
    const items = data ?? [];
    const tree = buildCoaTree(items);

    return ok(res, { items, tree, total: items.length });
  } catch (err) {
    console.error("[keuangan/coa] Unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/keuangan/coa ──────────────────────────────────────────────────

router.post("/", coaAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return badRequest(res, "Database belum dikonfigurasi.");
  }

  const { code, type, name, parent_code, position } = req.body ?? {};
  if (!code || typeof code !== "string") return badRequest(res, "Kode COA wajib diisi.");
  if (!type || !["income", "expense", "asset", "liability"].includes(type)) {
    return badRequest(res, "Tipe COA tidak valid. Gunakan: income, expense, asset, liability.");
  }
  if (!name || typeof name !== "string") return badRequest(res, "Nama COA wajib diisi.");

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data, error } = await sb
      .from("keuangan_coa")
      .insert({
        code: code.trim(),
        type,
        name: name.trim(),
        parent_code: parent_code?.trim() || null,
        position: Number(position) || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return badRequest(res, `Kode COA "${code}" sudah ada.`);
      console.error("[keuangan/coa] Insert error:", error.message);
      return serverError(res, "Gagal menyimpan COA.");
    }

    return ok(res, { item: data }, 201);
  } catch (err) {
    console.error("[keuangan/coa] Unexpected error:", err);
    return serverError(res);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a nested tree from flat COA list */
function buildCoaTree(items) {
  const map = new Map();
  const roots = [];

  for (const item of items) {
    map.set(item.code, { ...item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item.code);
    if (item.parent_code && map.has(item.parent_code)) {
      map.get(item.parent_code).children.push(node);
    } else if (!item.parent_code) {
      roots.push(node);
    }
  }
  return roots;
}

export default router;
