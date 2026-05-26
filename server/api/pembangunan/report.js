/**
 * GET /api/pembangunan/report/summary  — RPJMDes/RKP summary stats
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, ok } from "../../lib/api-response.js";

const router = express.Router();
const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

router.get("/report/summary", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { year } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("pembangunan")
      .select("id, type, year, budget, status, priority", { count: "exact" });
    if (year) query = query.eq("year", Number(year));

    const { data, error, count } = await query;
    if (error) return serverError(res);

    const items = data ?? [];
    const byStatus = Object.groupBy(items, (p) => p.status);
    const byType = Object.groupBy(items, (p) => p.type);

    const totalBudget = items.reduce((s, p) => s + Number(p.budget || 0), 0);
    const aktifBudget = (byStatus["aktif"] ?? []).reduce((s, p) => s + Number(p.budget || 0), 0);

    return ok(res, {
      total: count ?? 0,
      total_budget: totalBudget,
      aktif_budget: aktifBudget,
      by_status: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.length])),
      by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    });
  } catch (err) {
    return serverError(res);
  }
});

export default router;
