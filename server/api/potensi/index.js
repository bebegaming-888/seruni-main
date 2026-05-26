/**
 * GET /api/potensi              — Village potentials public data
 * GET /api/potensi/umkm         — UMKM list
 * GET /api/potensi/wisata       — Tourism spots
 * GET /api/potensi/komoditas    — Commodities
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, ok } from "../../lib/api-response.js";

const router = express.Router();

const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── GET /api/potensi ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { type } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);

    // Gather all potentials in parallel
    const [umkmData, wisataData, komoditasData] = await Promise.all([
      type !== "umkm"
        ? sb
            .from("umkm")
            .select("id, name, type, address, phone, description, products, photos")
            .eq("is_active", true)
            .limit(20)
        : { data: null },
      type !== "wisata"
        ? sb
            .from("destinasi_wisata")
            .select("id, name, description, location, category, photos,facilities")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: null },
      type !== "komoditas"
        ? sb
            .from("komoditas")
            .select("id, name, category, unit, price_range, description, location")
            .eq("is_active", true)
            .limit(20)
        : { data: null },
    ]);

    const result = {};

    if (type !== "umkm" && umkmData?.data) {
      result.umkm = {
        count: umkmData.data.length,
        items: umkmData.data.map((u) => ({
          ...u,
          phone: u.phone ? `****${String(u.phone).slice(-4)}` : null, // mask
        })),
      };
    }

    if (type !== "komoditas" && komoditasData?.data) {
      result.komoditas = {
        count: komoditasData.data.length,
        items: komoditasData.data,
      };
    }

    if (type !== "wisata" && wisataData?.data) {
      result.wisata = {
        count: wisataData.data.length,
        items: wisataData.data,
      };
    }

    return ok(res, result);
  } catch (err) {
    console.error("[potensi] GET error:", err);
    return serverError(res);
  }
});

// ── GET /api/potensi/umkm ──────────────────────────────────────────────────────
router.get("/umkm", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { search, category } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("umkm")
      .select("id, name, type, address, description, products, photos, phone", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("name", `%${search}%`);
    if (category) query = query.eq("type", category);

    const { data, error, count } = await query.limit(50);
    if (error) return serverError(res, "Gagal mengambil data UMKM.");

    const items = (data ?? []).map((u) => ({
      ...u,
      phone: u.phone ? `****${String(u.phone).slice(-4)}` : null,
    }));

    return ok(res, { items, total: count ?? 0 });
  } catch (err) {
    console.error("[potensi/umkm] GET error:", err);
    return serverError(res);
  }
});

// ── GET /api/potensi/wisata ─────────────────────────────────────────────────────
router.get("/wisata", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { category } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("destinasi_wisata")
      .select("id, name, description, location, category, photos, facilities", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);

    const { data, error, count } = await query.limit(50);
    if (error) return serverError(res, "Gagal mengambil data wisata.");

    return ok(res, { items: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("[potensi/wisata] GET error:", err);
    return serverError(res);
  }
});

// ── GET /api/potensi/komoditas ──────────────────────────────────────────────────
router.get("/komoditas", async (req, res) => {
  if (!SB_URL || !SB_KEY) return serverError(res);

  const { category } = req.query;

  try {
    const sb = createClient(SB_URL, SB_KEY);
    let query = sb
      .from("komoditas")
      .select("id, name, category, unit, price_range, description, location", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);

    const { data, error, count } = await query.limit(50);
    if (error) return serverError(res, "Gagal mengambil data komoditas.");

    // Enrich with category breakdown
    const items = data ?? [];
    const byCategory = {};
    for (const item of items) {
      const cat = item.category ?? "Lainnya";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, items: [] };
      byCategory[cat].count++;
      byCategory[cat].items.push(item);
    }

    return ok(res, { items, total: count ?? 0, by_category: byCategory });
  } catch (err) {
    console.error("[potensi/komoditas] GET error:", err);
    return serverError(res);
  }
});

export default router;
