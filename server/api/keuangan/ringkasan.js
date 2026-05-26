/**
 * GET /api/keuangan/ringkasan
 *
 * Cash summary (ringkasan kas) — income vs expense per bulan.
 *
 * Auth: Admin session (HMAC-signed + role check)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../../middleware/auth.js";
import { badRequest, serverError, ok } from "../../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function ringkasanAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Kepala Desa", "Sekretaris Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// GET /api/keuangan/ringkasan?year=2026
router.get("/", ringkasanAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return badRequest(res, "Database belum dikonfigurasi.");
  }

  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch all entries for the year grouped by month
    const { data: entries, error } = await sb
      .from("keuangan")
      .select("month, type, amount")
      .eq("year", year)
      .order("month");

    if (error) {
      console.error("[keuangan/ringkasan] Fetch error:", error.message);
      return serverError(res, "Gagal mengambil ringkasan kas.");
    }

    // Group by month
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthEntries = entries?.filter((e) => e.month === monthNum) ?? [];
      const income = monthEntries
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + Number(e.amount), 0);
      const expense = monthEntries
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + Number(e.amount), 0);
      return { month: monthNum, income, expense, saldo: income - expense };
    });

    const grandTotalIncome = months.reduce((s, m) => s + m.income, 0);
    const grandTotalExpense = months.reduce((s, m) => s + m.expense, 0);
    const saldoAkhir = grandTotalIncome - grandTotalExpense;

    // Fetch COA breakdown (top-level parents)
    const { data: coaList } = await sb
      .from("keuangan_coa")
      .select("code, name, type")
      .or("code.eq.4,code.eq.5")
      .order("code");

    return ok(res, {
      year,
      months,
      totals: {
        total_income: grandTotalIncome,
        total_expense: grandTotalExpense,
        saldo_akhir: saldoAkhir,
      },
      coa_titles: coaList ?? [],
    });
  } catch (err) {
    console.error("[keuangan/ringkasan] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
