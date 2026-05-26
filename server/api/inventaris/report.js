/**
 * GET /api/inventaris/report/summary
 *   ?year=2026  → total assets, total value, by category
 *   &group=category|condition|dusun
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, ok } from "../../lib/api-response.js";

const router = express.Router();
const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

router.get("/report/summary", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { year, group = "category" } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);

    // Base: active assets
    let query = sb
      .from("inventaris")
      .select(
        "id, name, acquisition_value, current_value, condition, status, category_id, dusun, year_acquired, acquisition_date",
        { count: "exact" },
      )
      .eq("is_active", true);

    if (year) query = query.eq("year_acquired", Number(year));

    const { data, error } = await query;
    if (error) return serverError(res, "Gagal mengambil data laporan.");

    const items = data ?? [];

    // Group aggregations
    let byGroup = {};
    let byCondition = {};
    let byStatus = {};

    for (const item of items) {
      // by group
      const gKey =
        group === "category"
          ? (item.category_id ?? "unknown")
          : group === "condition"
            ? (item.condition ?? "unknown")
            : (item.dusun ?? "unknown") || "Umum";

      if (!byGroup[gKey]) byGroup[gKey] = { count: 0, value: 0 };
      byGroup[gKey].count++;
      byGroup[gKey].value += Number(item.current_value) || 0;

      // by condition
      const cond = item.condition ?? "unknown";
      if (!byCondition[cond]) byCondition[cond] = { count: 0, value: 0 };
      byCondition[cond].count++;
      byCondition[cond].value += Number(item.current_value) || 0;

      // by status
      const st = item.status ?? "unknown";
      if (!byStatus[st]) byStatus[st] = { count: 0, value: 0 };
      byStatus[st].count++;
      byStatus[st].value += Number(item.current_value) || 0;
    }

    // Enrich category names
    let catMap = {};
    const catIds = Object.keys(byGroup).filter((k) => k !== "unknown");
    if (catIds.length > 0) {
      const { data: cats } = await sb
        .from("inventaris_category")
        .select("id, code, name")
        .in("id", catIds);
      catMap = Object.fromEntries((cats ?? []).map((c) => [c.id, c]));
    }

    const byGroupEnriched = Object.entries(byGroup).map(([key, v]) => ({
      key,
      name: catMap[key]?.name ?? key,
      ...v,
    }));

    return ok(res, {
      summary: {
        total_assets: items.length,
        total_acquisition_value: items.reduce((s, i) => s + Number(i.acquisition_value || 0), 0),
        total_current_value: items.reduce((s, i) => s + Number(i.current_value || 0), 0),
      },
      by_group: byGroupEnriched,
      by_condition: Object.entries(byCondition).map(([key, v]) => ({ key, ...v })),
      by_status: Object.entries(byStatus).map(([key, v]) => ({ key, ...v })),
    });
  } catch (err) {
    console.error("[inventaris/report] GET error:", err);
    return serverError(res);
  }
});

export default router;
