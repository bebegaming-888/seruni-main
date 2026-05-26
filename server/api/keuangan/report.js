/**
 * GET  /api/keuangan/report/monthly
 * POST /api/keuangan/report/generate
 *
 * APBDes reports — monthly, semester, annual.
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

async function reportAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Kepala Desa"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// GET /api/keuangan/report/monthly?year=2026&month=5
router.get("/monthly", reportAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = (page - 1) * limit;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch monthly entries
    let query = sb
      .from("keuangan")
      .select("id, coa_code, type, amount, description, reference, is_realisasi, created_at")
      .eq("year", year)
      .order("created_at", { ascending: false });

    if (month >= 1 && month <= 12) {
      query = query.eq("month", month);
    }

    const { data: entries, error, count } = await query.range(offset, offset + limit - 1);
    if (error) return serverError(res, "Gagal mengambil data.");

    // Group by COA
    const coaMap = new Map();
    for (const entry of entries ?? []) {
      if (!coaMap.has(entry.coa_code)) coaMap.set(entry.coa_code, []);
      coaMap.get(entry.coa_code).push(entry);
    }

    // Fetch COA names
    const coaCodes = [...coaMap.keys()];
    const { data: coaList } = await sb
      .from("keuangan_coa")
      .select("code, name, type, parent_code")
      .in("code", coaCodes);

    const coaLookup = new Map((coaList ?? []).map((c) => [c.code, c]));

    // Build report sections
    const income = [];
    const expense = [];
    for (const [code, txns] of coaMap) {
      const coa = coaLookup.get(code) ?? {};
      const total = txns.reduce((s, t) => s + Number(t.amount), 0);
      const realized = txns.filter((t) => t.is_realisasi).reduce((s, t) => s + Number(t.amount), 0);
      if (coa.type === "income" || code.startsWith("4")) {
        income.push({
          code,
          name: coa.name ?? code,
          total,
          realized,
          count: txns.length,
          transactions: txns,
        });
      } else {
        expense.push({
          code,
          name: coa.name ?? code,
          total,
          realized,
          count: txns.length,
          transactions: txns,
        });
      }
    }

    const totalIncome = income.reduce((s, i) => s + i.total, 0);
    const totalExpense = expense.reduce((s, i) => s + i.total, 0);

    return ok(res, {
      year,
      month: month || null,
      income,
      expense,
      totals: { income: totalIncome, expense: totalExpense, saldo: totalIncome - totalExpense },
      pagination: {
        total: count ?? 0,
        page,
        limit,
        hasMore: offset + (entries?.length ?? 0) < (count ?? 0),
      },
    });
  } catch (err) {
    console.error("[keuangan/report/monthly] Unexpected error:", err);
    return serverError(res);
  }
});

// POST /api/keuangan/report/generate
router.post("/generate", reportAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { year, month, type } = req.body ?? {};
  if (!year || !type) return badRequest(res, "Tahun dan tipe laporan wajib diisi.");
  if (!["monthly", "semester", "annual"].includes(type)) {
    return badRequest(res, "Tipe laporan tidak valid.");
  }
  if (type !== "annual" && (!month || month < 1 || month > 12)) {
    return badRequest(res, "Bulan wajib diisi untuk laporan bulanan/semester.");
  }

  const userId = req.adminSession?.userId;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch entries for the period
    let query = sb
      .from("keuangan")
      .select("coa_code, type, amount, description, reference, is_realisasi")
      .eq("year", parseInt(year, 10));
    if (type === "monthly") {
      query = query.eq("month", parseInt(month, 10));
    } else if (type === "semester") {
      const startMonth = month <= 6 ? 1 : 7;
      const endMonth = month <= 6 ? 6 : 12;
      query = query.gte("month", startMonth).lte("month", endMonth);
    }

    const { data: entries, error } = await query;
    if (error) return serverError(res, "Gagal mengambil data transaksi.");

    // Aggregate by COA
    const agg = new Map();
    for (const entry of entries ?? []) {
      if (!agg.has(entry.coa_code)) agg.set(entry.coa_code, { total: 0, realized: 0, count: 0 });
      const a = agg.get(entry.coa_code);
      a.total += Number(entry.amount);
      if (entry.is_realisasi) a.realized += Number(entry.amount);
      a.count++;
    }

    const { data: coaList } = await sb
      .from("keuangan_coa")
      .select("code, name, type, parent_code")
      .in("code", [...agg.keys()]);
    const coaLookup = new Map((coaList ?? []).map((c) => [c.code, c]));

    const content = {
      type,
      year: parseInt(year, 10),
      month: parseInt(month, 10) || null,
      generated_at: new Date().toISOString(),
      generated_by: userId,
      items: [...agg.entries()].map(([code, stats]) => ({
        code,
        name: coaLookup.get(code)?.name ?? code,
        type: coaLookup.get(code)?.type ?? "unknown",
        ...stats,
      })),
    };

    // Save report
    const title = `${type === "monthly" ? "Laporan Bulan" : type === "semester" ? "Laporan Semester" : "Laporan Tahunan"} ${month ? `Bulan ${month}` : ""} ${year}`;
    const { data: report, error: insertError } = await sb
      .from("keuangan_report")
      .insert({
        year: parseInt(year, 10),
        month: parseInt(month, 10) || null,
        type,
        title,
        content,
        generated_by: userId,
      })
      .select()
      .single();

    if (insertError) return serverError(res, "Gagal menyimpan laporan.");

    return ok(res, { report }, 201);
  } catch (err) {
    console.error("[keuangan/report/generate] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
