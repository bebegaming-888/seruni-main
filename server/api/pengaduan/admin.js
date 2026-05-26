/**
 * GET  /api/pengaduan/admin
 * GET  /api/pengaduan/admin/:ticket
 * PUT  /api/pengaduan/admin/:ticket
 * GET  /api/pengaduan/admin/stats
 *
 * Admin pengaduan management API.
 *
 * Auth: Admin session (HMAC-signed + role check)
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../../middleware/auth.js";
import { badRequest, serverError, ok, notFound, unauthorized } from "../../lib/api-response.js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Auth ─────────────────────────────────────────────────────────────────────

async function adminAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// ── GET /api/pengaduan/admin/stats ───────────────────────────────────────

router.get("/stats", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Total counts by status
    const { data: allData, error: allErr } = await sb
      .from("pengaduan")
      .select("status, prioritas, kategori, created_at, resolved_at", { count: "exact" })
      .gte("created_at", startOfYear)
      .lte("created_at", endOfYear);

    if (allErr) return serverError(res, "Gagal mengambil statistik.");

    const records = allData ?? [];
    const total = records.length;

    // Count by status
    const byStatus = { Baru: 0, Diproses: 0, Selesai: 0, Ditolak: 0 };
    for (const r of records) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    // Count by priority
    const byPrioritas = {};
    for (const r of records) byPrioritas[r.prioritas] = (byPrioritas[r.prioritas] ?? 0) + 1;

    // Count by category
    const byKategori = {};
    for (const r of records) byKategori[r.kategori] = (byKategori[r.kategori] ?? 0) + 1;

    // Top categories (sorted)
    const topKategori = Object.entries(byKategori)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kategori, count]) => ({ kategori, count }));

    // Average resolution time (ms → days)
    const resolved = records.filter((r) => r.status === "Selesai" && r.resolved_at);
    let avgResolutionDays = 0;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, r) => {
        return sum + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime());
      }, 0);
      avgResolutionDays = Math.round((totalMs / resolved.length / (1000 * 60 * 60 * 24)) * 10) / 10;
    }

    // 30-day trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentData = records.filter((r) => new Date(r.created_at) >= thirtyDaysAgo);

    // Group by date
    const trendMap = new Map();
    for (const r of recentData) {
      const dateKey = r.created_at.slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + 1);
    }
    const trend = Array.from(trendMap.entries())
      .sort()
      .map(([date, count]) => ({ date, count }));

    // Monthly breakdown for current year
    const monthlyMap = {};
    for (const r of records) {
      const month = new Date(r.created_at).getMonth() + 1;
      monthlyMap[month] = (monthlyMap[month] ?? 0) + 1;
    }
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: monthlyMap[i + 1] ?? 0,
    }));

    return ok(res, {
      year,
      total,
      byStatus,
      byPrioritas,
      topKategori,
      avgResolutionDays,
      trend,
      monthly,
      openCount: (byStatus.Baru ?? 0) + (byStatus.Diproses ?? 0),
    });
  } catch (err) {
    console.error("[pengaduan/admin/stats] Unexpected error:", err);
    return serverError(res);
  }
});

// ── GET /api/pengaduan/admin ──────────────────────────────────────────────

router.get("/", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { status, kategori, prioritas, date_from, date_to, q } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = sb
      .from("pengaduan")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (kategori) query = query.eq("kategori", kategori);
    if (prioritas) query = query.eq("prioritas", prioritas);
    if (date_from) query = query.gte("created_at", date_from);
    if (date_to) query = query.lte("created_at", date_to + "T23:59:59");
    if (q) {
      // Text search: ticket, nama, judul, isi
      query = query.or(`ticket.ilike.%${q}%,nama.ilike.%${q}%,judul.ilike.%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) return serverError(res, "Gagal mengambil data pengaduan.");

    return ok(res, {
      items: data ?? [],
      pagination: {
        total: count ?? 0,
        page,
        limit,
        hasMore: offset + (data?.length ?? 0) < (count ?? 0),
      },
    });
  } catch (err) {
    console.error("[pengaduan/admin] Unexpected error:", err);
    return serverError(res);
  }
});

// ── GET /api/pengaduan/admin/:ticket ──────────────────────────────────────

router.get("/:ticket", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { ticket } = req.params;
  if (!ticket) return badRequest(res, "Ticket wajib diisi.");

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb.from("pengaduan").select("*").eq("ticket", ticket).single();

    if (error || !data) return notFound(res, "Pengaduan");

    return ok(res, { item: data });
  } catch (err) {
    console.error("[pengaduan/admin/:ticket] Unexpected error:", err);
    return serverError(res);
  }
});

// ── PUT /api/pengaduan/admin/:ticket ──────────────────────────────────────

router.put("/:ticket", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { ticket } = req.params;
  const { status, admin_catatan, admin_tindak, assigned_to } = req.body ?? {};
  const VALID_STATUSES = ["Baru", "Diproses", "Selesai", "Ditolak"];
  const userId = req.adminSession?.userId;

  if (status && !VALID_STATUSES.includes(status)) {
    return badRequest(res, `Status tidak valid. Gunakan: ${VALID_STATUSES.join(", ")}`);
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const updateData = {
      updated_at: new Date().toISOString(),
    };
    if (status) updateData.status = status;
    if (admin_catatan !== undefined) updateData.admin_catatan = admin_catatan;
    if (admin_tindak !== undefined) updateData.admin_tindak = admin_tindak;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (status === "Selesai" || status === "Ditolak") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await sb
      .from("pengaduan")
      .update(updateData)
      .eq("ticket", ticket)
      .select()
      .single();

    if (error || !data) return notFound(res, "Pengaduan");

    // Audit log — failure should NOT block the main operation, but must be logged
    try {
      await sb.from("audit_log").insert({
        action: "pengaduan.admin_update",
        table_name: "pengaduan",
        details: `Admin ${userId} updated ${ticket} → status: ${status ?? "unchanged"}`,
        username: userId ?? "admin",
      });
    } catch (auditErr) {
      // Log immediately — do NOT let this fail silently
      console.error(
        `[pengaduan/admin/:ticket] Audit log insert FAILED for ticket ${ticket} by ${userId}:`,
        auditErr,
      );
      // Consider: make this fatal for compliance (uncomment next line):
      // return serverError(res, "Audit trail tidak dapat dicatat. Perubahan ditolak.");
    }

    return ok(res, { item: data });
  } catch (err) {
    console.error("[pengaduan/admin/:ticket] PUT error:", err);
    return serverError(res);
  }
});

export default router;
