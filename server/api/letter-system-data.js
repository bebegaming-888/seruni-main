/**
 * GET /api/letter-system-data
 * Fetch all system data needed for letter layout configuration
 * Returns: village info, signers, rejection reasons, surat types
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

router.get("/", async (req, res) => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch village data from WILAYAH table (source of truth)
    const { data: wilayahRows } = await sb
      .from("wilayah")
      .select("level, kode, nama, data")
      .eq("is_active", true)
      .order("position");

    // Fetch app settings for fallback
    const { data: settings } = await sb.from("app_settings").select("key, value");
    const settingsMap = {};
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Build village object from WILAYAH table
    const wilayahMap = {};
    wilayahRows?.forEach((w) => {
      wilayahMap[w.level] = w;
    });

    const getWilayahData = (level) => {
      const w = wilayahMap[level];
      if (!w) return {};
      return typeof w.data === "string" ? JSON.parse(w.data) : w.data || {};
    };

    const provinsi = wilayahMap["provinsi"];
    const kabupaten = wilayahMap["kabupaten"];
    const kecamatan = wilayahMap["kecamatan"];
    const desa = wilayahMap["desa"];

    const villageData = {
      name: desa?.nama || settingsMap.village_name || "Desa Seruni Mumbul",
      address: getWilayahData("desa").alamat || settingsMap.village_address || "",
      phone: getWilayahData("desa").telepon || settingsMap.village_phone || "",
      email: getWilayahData("desa").email || settingsMap.village_email || "",
      kecamatan:
        kecamatan?.nama?.replace(/^KECAMATAN\s+/i, "") ||
        settingsMap.kecamatan ||
        "Kecamatan Seruni",
      kabupaten:
        kabupaten?.nama?.replace(/^KABUPATEN\s+/i, "") ||
        settingsMap.kabupaten ||
        "Kabupaten Badung",
      provinsi: provinsi?.nama?.replace(/^PROVINSI\s+/i, "") || settingsMap.provinsi || "Bali",
      kode_pos: getWilayahData("desa").kode_pos || settingsMap.kode_pos || "80361",
      rt_rw: getWilayahData("desa").rt_rw || "",
      dusun: getWilayahData("desa").dusun || "",
      whatsapp: getWilayahData("desa").whatsapp || "",
      website: getWilayahData("desa").website || "",
      koordinat_lat: getWilayahData("desa").koordinat_lat || "",
      koordinat_lng: getWilayahData("desa").koordinat_lng || "",
      // Full hierarchy for kop lines
      hierarchy: {
        provinsi: provinsi?.nama || "",
        kabupaten: kabupaten?.nama || "",
        kecamatan: kecamatan?.nama || "",
        desa: desa?.nama || "",
      },
    };

    // 2. Fetch active signers
    const { data: signers } = await sb
      .from("letter_signers")
      .select("id, role, title, name, nip, position_order")
      .eq("is_active", true)
      .order("position_order");

    // 3. Fetch active rejection reasons
    const { data: reasons } = await sb
      .from("rejection_reasons")
      .select("id, code, reason, category, position_order")
      .eq("is_active", true)
      .order("position_order");

    // 4. Fetch all surat types with DNA clauses
    const { data: suratTypes } = await sb
      .from("surat_types")
      .select("code, name, category, kode_klasifikasi, dna_clauses, form_fields, eta")
      .order("category, name");

    // 5. Get default kop surat config — built from WILAYAH hierarchy
    const kopSurat = {
      logo_url: "/logo-desa.png",
      header_lines: [
        villageData.hierarchy.kabupaten.toUpperCase(),
        villageData.hierarchy.kecamatan.toUpperCase(),
        villageData.hierarchy.desa.toUpperCase(),
      ],
      address_line: villageData.address,
      contact_line: `Telp: ${villageData.phone} | Email: ${villageData.email}`,
    };

    return res.json({
      ok: true,
      data: {
        village: villageData,
        signers: signers || [],
        rejection_reasons: reasons || [],
        surat_types: suratTypes || [],
        kop_surat: kopSurat,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[letter-system-data] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
