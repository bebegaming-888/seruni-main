/**
 * Edge Function: /api/surat/estimasi
 *
 * Hitung estimasi waktu pemrosesan surat berdasarkan data historis.
 * Menghitung durasi hanya untuk surat yang sudah Disetujui (approved_at tersedia).
 * Hasil di-cache selama 5 menit.
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body (opsional):
 *   { kode?: string } — jika ada, hanya return estimasi untuk kode tersebut
 *
 * Response:
 *   { ok: true, estimasi: Record<string, number>, cached: boolean }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface CacheEntry {
  data: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

declare global {
  var __estimasiCache: CacheEntry | undefined;
}

function getCached(): Record<string, number> | null {
  const c = globalThis.__estimasiCache;
  if (!c) return null;
  if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
  return c.data;
}

function setCached(data: Record<string, number>) {
  globalThis.__estimasiCache = { data, fetchedAt: Date.now() };
}

function createAdminClient(env: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function corsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

export async function onRequestPost(context: {
  request: Request;
  env: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
}): Promise<Response> {
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: { kode?: string } | undefined;
  try {
    body = (await context.request.json()) as { kode?: string } | undefined;
  } catch {
    // body opsional — lanjut tanpa body
  }

  const targetKode = body?.kode;

  // ── Cache check ──
  const cached = getCached();
  if (cached) {
    const result = targetKode ? { [targetKode]: cached[targetKode] ?? null } : cached;
    return json({ ok: true, estimasi: result, cached: true }, 200);
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  // ── Query: hanya surat yang sudah Disetujui ──
  const { data, error } = await sb
    .from("surat_requests")
    .select("kode, approved_at, created_at")
    .eq("status", "Disetujui")
    .not("approved_at", "is", null)
    .not("created_at", "is", null);

  if (error) {
    console.error("[estimasi] Query error:", error);
    return json({ ok: false, error: "Gagal menghitung estimasi" }, 500);
  }

  // ── Agregasi: AVG durasi per kode ──
  const sums: Record<string, { total: number; count: number }> = {};

  for (const row of data ?? []) {
    const approved = row.approved_at as string | null;
    const created = row.created_at as string | null;
    if (!approved || !created) continue;

    const approvedMs = new Date(approved).getTime();
    const createdMs = new Date(created).getTime();
    const diffJam = (approvedMs - createdMs) / (1000 * 60 * 60);

    // Abaikan outlier (< 0 jam atau > 30 hari)
    if (diffJam < 0 || diffJam > 30 * 24) continue;

    if (!sums[row.kode]) sums[row.kode] = { total: 0, count: 0 };
    sums[row.kode].total += diffJam;
    sums[row.kode].count++;
  }

  const estimasi: Record<string, number> = {};
  for (const [kode, { total, count }] of Object.entries(sums)) {
    if (count >= 1) {
      // Rata-rata dibulatkan 1 desimal
      estimasi[kode] = Math.round((total / count) * 10) / 10;
    }
  }

  // ── Cache hasil ──
  setCached(estimasi);

  const result = targetKode ? { [targetKode]: estimasi[targetKode] ?? null } : estimasi;

  return json({ ok: true, estimasi: result, cached: false }, 200);
}
