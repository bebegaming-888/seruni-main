/**
 * Edge Function: /api/sippn/validate-nik
 *
 * Validasi NIK terhadap sistem SIPPN / Database Kependudukan Kemendagri.
 * Workflow:
 *   1. Cek cache (5 menit TTL) — hindari hit berulang ke external API
 *   2. Jika SIPPN_BASE_URL dikonfigurasi → panggil endpoint validasi
 *   3. Selalu fallback ke Supabase `warga` table jika local match
 *   4. Jika SIPPN unreachable → return data lokal saja + `source: "local"`
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SIPPN_BASE_URL       — base URL SIPPN API (opsional, misal "https://sippn.kemendagri.go.id")
 *   SIPPN_API_KEY        — API key untuk SIPPN (opsional)
 *
 * Request body:
 *   { nik: string }
 *
 * Response:
 *   { ok: true, valid: boolean, data: ResidentData | null, source: "sippn" | "local" | "cache" }
 *   { ok: false, error: string }
 */

import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";

interface CacheEntry {
  data: ResidentData | null;
  source: "cache";
  fetchedAt: number;
}

interface ResidentData {
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat: string;
  rw: string;
  rt: string;
  dusun: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  status_validasi: "terverifikasi" | "belum_terverifikasi";
}

const CACHE_TTL_MS = 5 * 60 * 1000;

declare global {
  var __sippnCache: Map<string, CacheEntry> | undefined;
}

function getCache(nik: string): ResidentData | null | "expired" {
  const m = globalThis.__sippnCache;
  if (!m) return "expired";
  const e = m.get(nik);
  if (!e) return "expired";
  if (Date.now() - e.fetchedAt > CACHE_TTL_MS) return "expired";
  return e.data;
}

function setCache(nik: string, data: ResidentData | null) {
  if (!globalThis.__sippnCache) {
    globalThis.__sippnCache = new Map();
  }
  globalThis.__sippnCache.set(nik, { data, source: "cache", fetchedAt: Date.now() });
  // Cleanup expired entries (keep map size bounded)
  if (globalThis.__sippnCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of globalThis.__sippnCache) {
      if (now - v.fetchedAt > CACHE_TTL_MS) globalThis.__sippnCache.delete(k);
    }
  }
}

function createAdminClient(env: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }) {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env;
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

/** Validasi format NIK 16 digit */
function isValidNikFormat(nik: string): boolean {
  return /^\d{16}$/.test(nik);
}

/** Parse data warga dari Supabase ke ResidentData */
function parseWarga(row: Record<string, unknown>): ResidentData {
  return {
    nik: String(row.nik ?? ""),
    nama: String(row.nama ?? ""),
    tempat_lahir: String(row.tempat_lahir ?? ""),
    tanggal_lahir: String(row.tanggal_lahir ?? ""),
    jenis_kelamin: String(row.jenis_kelamin ?? ""),
    alamat: String(row.alamat ?? ""),
    rw: String(row.rw ?? ""),
    rt: String(row.rt ?? ""),
    dusun: String(row.dusun ?? ""),
    desa: String(row.desa ?? ""),
    kecamatan: String(row.kecamatan ?? ""),
    kabupaten: String(row.kabupaten ?? ""),
    provinsi: String(row.provinsi ?? ""),
    status_validasi:
      row.is_valid === true || row.is_valid === "true" ? "terverifikasi" : "belum_terverifikasi",
  };
}

export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}

export async function onRequestPost(context: {
  request: Request;
  env: {
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SIPPN_BASE_URL?: string;
    SIPPN_API_KEY?: string;
  };
}): Promise<Response> {
  const rl = createRateLimiter("public");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  let body: { nik?: string } | undefined;
  try {
    body = (await context.request.json()) as { nik?: string } | undefined;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const nik = (body?.nik ?? "").trim();
  if (!isValidNikFormat(nik)) {
    return json({ ok: false, error: "NIK harus 16 digit angka" }, 400);
  }

  // ── 1. Cache check ──
  const cached = getCache(nik);
  if (cached !== "expired") {
    return json(
      {
        ok: true,
        valid: cached !== null,
        data: cached,
        source: "cache",
        cached: true,
      },
      200,
    );
  }

  const sb = createAdminClient(context.env);
  if (!sb) {
    return json({ ok: false, error: "Server misconfigured" }, 500);
  }

  let sippnData: ResidentData | null = null;
  let sippnError = false;

  // ── 2. SIPPN API call (opsional) ──
  const sippnBase = context.env.SIPPN_BASE_URL;
  if (sippnBase) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (context.env.SIPPN_API_KEY) {
        headers["Authorization"] = `Bearer ${context.env.SIPPN_API_KEY}`;
      }

      const res = await fetch(`${sippnBase}/api/v1/validate-nik`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nik }),
        signal: AbortSignal.timeout(8000), // 8 detik timeout
      });

      if (res.ok) {
        const json = (await res.json()) as {
          valid?: boolean;
          data?: {
            nik?: string;
            nama?: string;
            tempat_lahir?: string;
            tanggal_lahir?: string;
            jenis_kelamin?: string;
            alamat?: string;
            rw?: string;
            rt?: string;
            dusun?: string;
            desa?: string;
            kecamatan?: string;
            kabupaten?: string;
            provinsi?: string;
          };
        };
        if (json.valid && json.data) {
          sippnData = {
            nik: json.data.nik ?? nik,
            nama: json.data.nama ?? "",
            tempat_lahir: json.data.tempat_lahir ?? "",
            tanggal_lahir: json.data.tanggal_lahir ?? "",
            jenis_kelamin: json.data.jenis_kelamin ?? "",
            alamat: json.data.alamat ?? "",
            rw: json.data.rw ?? "",
            rt: json.data.rt ?? "",
            dusun: json.data.dusun ?? "",
            desa: json.data.desa ?? "",
            kecamatan: json.data.kecamatan ?? "",
            kabupaten: json.data.kabupaten ?? "",
            provinsi: json.data.provinsi ?? "",
            status_validasi: "terverifikasi",
          };
        }
      }
      // If non-200, treat as SIPPN unavailable — fall through to local
    } catch {
      sippnError = true;
      // Network error / timeout — fall through to local fallback
    }
  }

  // ── 3. Local Supabase fallback ──
  let localData: ResidentData | null = null;
  const { data: warga } = await sb.from("warga").select("*").eq("nik", nik).limit(1);

  if (warga && warga.length > 0) {
    localData = parseWarga(warga[0]);
  }

  // ── 4. Determine result — prefer SIPPN, fallback to local ──
  const resultData = sippnData ?? localData;

  // Determine status_validasi
  let statusValidasi: "terverifikasi" | "belum_terverifikasi" = "belum_terverifikasi";
  if (sippnData) statusValidasi = "terverifikasi";
  else if (localData) statusValidasi = localData.status_validasi;

  const finalData: ResidentData | null = resultData
    ? { ...resultData, status_validasi: statusValidasi }
    : null;

  // ── 5. Cache result ──
  setCache(nik, finalData);

  const source: "sippn" | "local" = sippnData ? "sippn" : "local";

  return json(
    {
      ok: true,
      valid: finalData !== null,
      data: finalData,
      source,
      sippn_error: sippnError ? "SIPPN unreachable — using local data" : undefined,
      cached: false,
    },
    200,
  );
}
