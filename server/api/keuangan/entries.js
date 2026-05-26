/**
 * GET    /api/keuangan/entries
 * POST   /api/keuangan/entries
 *
 * Transaction ledger — list and create entries.
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

// ── Auth ─────────────────────────────────────────────────────────────────────

async function entriesAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Kepala Desa", "Sekretaris Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// ── GET /api/keuangan/entries ───────────────────────────────────────────────

router.get("/", entriesAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return badRequest(res, "Database belum dikonfigurasi.");
  }

  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10) || null;
  const type = req.query.type;
  const coaCode = req.query.coa;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = sb
      .from("keuangan")
      .select(
        "id, year, month, coa_code, type, amount, description, reference, is_realisasi, created_at, created_by",
        { count: "exact" },
      )
      .eq("year", year)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (month >= 1 && month <= 12) query = query.eq("month", month);
    if (type === "income" || type === "expense") query = query.eq("type", type);
    if (coaCode) query = query.eq("coa_code", coaCode);

    const { data, error, count } = await query;
    if (error) {
      console.error("[keuangan/entries] Fetch error:", error.message);
      return serverError(res, "Gagal mengambil data transaksi.");
    }

    // Summary totals
    let summary = { total_income: 0, total_expense: 0, entry_count: count ?? 0 };
    if (!coaCode && !month) {
      const { data: incomeData } = await sb
        .from("keuangan")
        .select("amount", { count: "exact" })
        .eq("year", year)
        .eq("type", "income");
      const { data: expenseData } = await sb
        .from("keuangan")
        .select("amount", { count: "exact" })
        .eq("year", year)
        .eq("type", "expense");
      summary.total_income = incomeData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
      summary.total_expense = expenseData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
    }

    return ok(res, {
      entries: data ?? [],
      summary,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        hasMore: offset + (data?.length ?? 0) < (count ?? 0),
      },
    });
  } catch (err) {
    console.error("[keuangan/entries] Unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/keuangan/entries ──────────────────────────────────────────────

router.post("/", entriesAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return badRequest(res, "Database belum dikonfigurasi.");
  }

  const { year, month, coa_code, type, amount, description, reference, is_realisasi } =
    req.body ?? {};
  const userId = req.adminSession?.userId;

  if (!year || !month || !coa_code || !type || !amount) {
    return badRequest(res, "Tahun, bulan, kode COA, tipe, dan jumlah wajib diisi.");
  }
  if (!["income", "expense"].includes(type)) {
    return badRequest(res, "Tipe transaksi tidak valid.");
  }
  if (Number(amount) <= 0) {
    return badRequest(res, "Jumlah harus lebih dari 0.");
  }
  const monthInt = parseInt(month, 10);
  if (monthInt < 1 || monthInt > 12) {
    return badRequest(res, "Bulan harus antara 1 dan 12.");
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data, error } = await sb
      .from("keuangan")
      .insert({
        year: parseInt(year, 10),
        month: monthInt,
        coa_code: coa_code.trim(),
        type,
        amount: (() => {
          const num = Number(amount);
          if (!Number.isFinite(num) || num <= 0) {
            throw new Error("Invalid amount: must be a positive number");
          }
          // Parse directly from string to avoid Number() precision loss
          const normalized = String(num).replace(/\..*/, ""); // remove decimals
          return BigInt(normalized);
        })(),
        description: description?.trim() || null,
        reference: reference?.trim() || null,
        is_realisasi: Boolean(is_realisasi),
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[keuangan/entries] Insert error:", error.message);
      return serverError(res, "Gagal menyimpan transaksi.");
    }

    return ok(res, { entry: data }, 201);
  } catch (err) {
    console.error("[keuangan/entries] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
