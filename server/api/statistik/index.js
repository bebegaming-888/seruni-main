/**
 * GET /api/statistik/penduduk
 * GET /api/statistik/penduduk/chart
 *
 * Population statistics — aggregated from warga table.
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

async function adminAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  const ALLOWED_ROLES = ["Super Admin", "Operator"];
  if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
  next();
}

// Helper: compute age from date of birth
function computeAge(tanggal_lahir) {
  if (!tanggal_lahir) return null;
  const birth = new Date(tanggal_lahir);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// Age group labels
const AGE_GROUPS = [
  { label: "0-4", min: 0, max: 4 },
  { label: "5-9", min: 5, max: 9 },
  { label: "10-14", min: 10, max: 14 },
  { label: "15-19", min: 15, max: 19 },
  { label: "20-24", min: 20, max: 24 },
  { label: "25-29", min: 25, max: 29 },
  { label: "30-34", min: 30, max: 34 },
  { label: "35-39", min: 35, max: 39 },
  { label: "40-44", min: 40, max: 44 },
  { label: "45-49", min: 45, max: 49 },
  { label: "50-54", min: 50, max: 54 },
  { label: "55-59", min: 55, max: 59 },
  { label: "60+", min: 60, max: 999 },
];

// ── GET /api/statistik/penduduk ────────────────────────────────────────────

router.get("/penduduk", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb
      .from("warga")
      .select(
        "jenis_kelamin, tanggal_lahir, agama, pendidikan, pekerjaan, status_perkawinan, dusun, rt, rw, archived",
      )
      .eq("archived", false);

    if (error) return serverError(res, "Gagal mengambil data statistik.");

    const records = data ?? [];
    const total = records.length;

    // ── Gender ──
    const gender = { "Laki-Laki": 0, Perempuan: 0, Unknown: 0 };
    for (const r of records)
      gender[r.jenis_kelamin ?? "Unknown"] = (gender[r.jenis_kelamin ?? "Unknown"] ?? 0) + 1;

    // ── Age groups ──
    const ageGroups = AGE_GROUPS.map((g) => ({ label: g.label, count: 0 }));
    for (const r of records) {
      const age = computeAge(r.tanggal_lahir);
      if (age !== null) {
        const group = ageGroups.find((g) => {
          if (g.label === "60+") return age >= 60;
          return age >= g.min && age <= g.max;
        });
        if (group) group.count++;
      }
    }

    // ── Occupation (top 10) ──
    const pekerjaanMap = {};
    for (const r of records) {
      const p = r.pekerjaan ?? "Lainnya";
      pekerjaanMap[p] = (pekerjaanMap[p] ?? 0) + 1;
    }
    const pekerjaan = Object.entries(pekerjaanMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // ── Religion ──
    const agamaMap = {};
    for (const r of records) {
      const a = r.agama ?? "Tidak Diketahui";
      agamaMap[a] = (agamaMap[a] ?? 0) + 1;
    }
    const agama = Object.entries(agamaMap).map(([name, count]) => ({ name, count }));

    // ── Education ──
    const pendidikanMap = {};
    for (const r of records) {
      const p = r.pendidikan ?? "Tidak Diketahui";
      pendidikanMap[p] = (pendidikanMap[p] ?? 0) + 1;
    }
    const pendidikan = Object.entries(pendidikanMap).map(([name, count]) => ({ name, count }));

    // ── Marital Status ──
    const perkawinanMap = {};
    for (const r of records) {
      const k = r.status_perkawinan ?? "Tidak Diketahui";
      perkawinanMap[k] = (perkawinanMap[k] ?? 0) + 1;
    }
    const perkawinan = Object.entries(perkawinanMap).map(([name, count]) => ({ name, count }));

    // ── By Wilayah (dusun/rt/rw) ──
    const wilayahMap = {};
    for (const r of records) {
      const key = [r.dusun, r.rt, r.rw].filter(Boolean).join(" / ") || "Tidak Diketahui";
      wilayahMap[key] = (wilayahMap[key] ?? 0) + 1;
    }
    const wilayah = Object.entries(wilayahMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // ── Summary metrics ──
    const genderRatio =
      gender["Laki-Laki"] && gender["Perempuan"]
        ? (gender["Perempuan"] / gender["Laki-Laki"]).toFixed(2)
        : null;
    const avgAge = (() => {
      let sum = 0,
        count = 0;
      for (const r of records) {
        const age = computeAge(r.tanggal_lahir);
        if (age !== null && age >= 0 && age <= 120) {
          sum += age;
          count++;
        }
      }
      return count > 0 ? Math.round(sum / count) : 0;
    })();

    return ok(res, {
      total,
      gender,
      ageGroups,
      pekerjaan,
      agama,
      pendidikan,
      perkawinan,
      wilayah,
      genderRatio,
      avgAge,
      recordCount: records.length,
    });
  } catch (err) {
    console.error("[statistik/penduduk] Unexpected error:", err);
    return serverError(res);
  }
});

// ── GET /api/statistik/penduduk/chart ─────────────────────────────────────

router.get("/chart", adminAuth, async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return badRequest(res, "Database belum dikonfigurasi.");

  const { type } = req.query;
  const VALID_TYPES = ["jk", "usia", "pekerjaan", "agama", "pendidikan", "wilayah"];
  if (!type || !VALID_TYPES.includes(type)) {
    return badRequest(res, `Tipe chart tidak valid. Gunakan: ${VALID_TYPES.join(", ")}`);
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await sb
      .from("warga")
      .select("jenis_kelamin, tanggal_lahir, agama, pendidikan, pekerjaan, dusun, rt, rw")
      .eq("archived", false);

    if (error) return serverError(res, "Gagal mengambil data chart.");

    let chartData = [];

    if (type === "jk") {
      const map = { "Laki-Laki": 0, Perempuan: 0 };
      for (const r of data ?? [])
        map[r.jenis_kelamin ?? "Unknown"] = (map[r.jenis_kelamin ?? "Unknown"] ?? 0) + 1;
      chartData = Object.entries(map).map(([name, value]) => ({ name, value }));
    } else if (type === "usia") {
      const counts = {};
      for (const r of data ?? []) {
        const age = computeAge(r.tanggal_lahir);
        if (age !== null && age >= 0) {
          const label =
            age >= 60 ? "60+" : `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
          counts[label] = (counts[label] ?? 0) + 1;
        }
      }
      chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));
    } else {
      const fieldMap = {
        pekerjaan: "pekerjaan",
        agama: "agama",
        pendidikan: "pendidikan",
        wilayah: "dusun",
      };
      const field = fieldMap[type] ?? type;
      const map = {};
      for (const r of data ?? []) {
        const key = r[field] ?? "Tidak Diketahui";
        map[key] = (map[key] ?? 0) + 1;
      }
      chartData = Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, value]) => ({ name, value }));
    }

    return ok(res, { type, data: chartData });
  } catch (err) {
    console.error("[statistik/chart] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
