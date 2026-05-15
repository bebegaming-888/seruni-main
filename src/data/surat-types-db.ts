/**
 * surat-types-db.ts
 *
 * Sync helper untuk master tabel `surat_types` di Supabase.
 * Sumber kebenaran (source of truth) tetaplah `SURAT_MASTER` di
 * `src/data/surat-master.ts` — file ini hanya untuk Sinkronisasi
 * dari Supabase ke client (baca-only, admin editor optional).
 *
 * Alur:
 *   1. Saat startup (atau manual trigger): fetch semua row dari Supabase
 *   2. Bandingkan count dengan SURAT_MASTER
 *   3. Jika mismatch → warning console + suggest regenerate
 *   4. Data di-cache di memory (module-level Map) untuk fast lookup
 *
 * Admin dapat EDIT surat_types via Supabase dashboard tanpa harus
 * push kode baru. Perubahan itu persisten dan tidak overwritten
 * oleh source code (kecuali regenerate dipanggil explicit).
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { SURAT_MASTER } from "@/data/surat-master";
import { DNA_CLAUSES_PRESETS } from "@/lib/letter-engine";
import type { FieldDef } from "@/data/surat-fields";

export type SuratTypeRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  wewenang: boolean;
  description: string | null;
  eta: string;
  kode_klasifikasi: string | null;
  is_substitute: boolean;
  note: string | null;
  form_fields: string[]; // deserialized from JSONB
  dna_clauses: string[]; // deserialized from JSONB
  dna_placeholders: string[];
  field_count: number;
  dna_count: number;
  created_at: string;
  updated_at: string | null;
};

// ── In-memory cache (survives across React re-renders) ────────────────────────

let _cache: Map<string, SuratTypeRow> | null = null;
let _lastFetch: number = 0;
const CACHE_TTL_MS = 60_000; // 1 menit — cukup untuk satu session

// ── Fetch from Supabase ───────────────────────────────────────────────────────

/** Ambil semua surat_types dari Supabase. Auto-cached. */
export async function fetchSuratTypes(): Promise<SuratTypeRow[]> {
  if (!isSupabaseConfigured) {
    console.warn("[surat-types-db] Supabase not configured — returning empty array");
    return [];
  }
  const sb = getSupabase();
  if (!sb) {
    console.warn("[surat-types-db] Supabase not configured — returning empty array");
    return [];
  }

  const now = Date.now();
  if (_cache && now - _lastFetch < CACHE_TTL_MS) {
    return Array.from(_cache.values());
  }

  const { data, error } = await sb
    .from("surat_types")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[surat-types-db] fetch error:", error.message);
    return [];
  }

  const rows = (data ?? []) as SuratTypeRow[];
  _cache = new Map(rows.map((r) => [r.code, r]));
  _lastFetch = now;

  return rows;
}

/** Get satu surat type by code. O(1) dari cache. */
export async function getSuratType(code: string): Promise<SuratTypeRow | null> {
  if (_cache?.has(code)) return _cache.get(code)!;

  const rows = await fetchSuratTypes();
  return _cache?.get(code) ?? null;
}

/** Get semua surat type untuk sebuah kategori. */
export async function getSuratTypesByCategory(category: string): Promise<SuratTypeRow[]> {
  const rows = await fetchSuratTypes();
  return rows.filter((r) => r.category === category);
}

/** Invalidate cache — paksa re-fetch dari Supabase. */
export function invalidateCache() {
  _cache = null;
  _lastFetch = 0;
}

// ── Validation helpers ─────────────────────────────────────────────────────────

/** Bandingkan count Supabase vs SURAT_MASTER. Konsisten = OK. */
export async function validateSuratTypesCount(): Promise<{
  ok: boolean;
  source_count: number;
  db_count: number;
  missing: string[];
  extra: string[];
  message: string;
}> {
  const sourceKeys = Object.keys(SURAT_MASTER).filter(
    (k) =>
      ![
        "getSuratMaster",
        "getAllSuratMaster",
        "getSuratByCategory",
        "SURAT_MASTER",
        "SURAT_CATEGORIES",
      ].includes(k),
  );
  const sourceCount = sourceKeys.length;

  const rows = await fetchSuratTypes();
  const dbCount = rows.length;
  const dbKeys = new Set(rows.map((r) => r.code));

  const missing = sourceKeys.filter((k) => !dbKeys.has(k));
  const extra = rows.map((r) => r.code).filter((k) => !sourceKeys.includes(k));

  const ok = missing.length === 0 && extra.length === 0 && sourceCount === dbCount;

  let message: string;
  if (ok) {
    message = `✓ surat_types sinkron (${dbCount} entries)`;
  } else {
    const parts: string[] = [];
    if (missing.length) parts.push(`missing in DB: ${missing.join(", ")}`);
    if (extra.length) parts.push(`extra in DB: ${extra.join(", ")}`);
    if (sourceCount !== dbCount) parts.push(`count mismatch: src=${sourceCount} db=${dbCount}`);
    message = `⚠️ surat_types tidak sinkron — ${parts.join(" | ")}`;
  }

  return { ok, source_count: sourceCount, db_count: dbCount, missing, extra, message };
}

/**
 * Peringatan saat startup (DEV mode).
 * Dipanggil dari app init untuk memastikan developer tahu kalau
 * Supabase dan source code tidak sinkron.
 */
export async function warnIfOutOfSync(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const result = await validateSuratTypesCount();
  if (!result.ok) {
    console.warn(`[surat-types-db] ⚠️ OUT OF SYNC — ${result.message}`);
    console.info(
      "[surat-types-db] Untuk regenerate seed SQL:\n  python3 generate-surat-dna.py && python3 generate-surat-types-seed.py",
    );
  }
}

// ── Admin helpers (server-side only) ─────────────────────────────────────────

/** Sync satu surat type dari SURAT_MASTER → Supabase. */
export async function upsertSuratType(code: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const sb = getSupabase();
  if (!sb) return false;

  const master = SURAT_MASTER[code];
  if (!master) {
    console.error(`[surat-types-db] No SURAT_MASTER entry for: ${code}`);
    return false;
  }

  const dna = DNA_CLAUSES_PRESETS[code] ?? [];
  const placeholders = new Set<string>();
  for (const clause of dna) {
    for (const p of clause.matchAll(/\{\{(\w+)\}\}/g)) {
      placeholders.add(p[1]);
    }
  }

  const { error } = await sb.from("surat_types").upsert({
    code,
    name: master.name,
    category: master.category,
    wewenang: master.wewenang,
    description: master.description,
    eta: master.eta,
    kode_klasifikasi: master.kodeKlasifikasi,
    is_substitute: master.isNew ?? false,
    note: master.note ?? null,
    form_fields: master.fields.map((f: FieldDef) => f.key),
    dna_clauses: dna,
    dna_placeholders: Array.from(placeholders).sort(),
    field_count: master.fields.length,
    dna_count: dna.length,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[surat-types-db] upsert error for ${code}:`, error.message);
    return false;
  }

  invalidateCache();
  return true;
}

/** Sync semua surat_types dari SURAT_MASTER → Supabase. */
export async function syncAllSuratTypes(): Promise<{
  success: number;
  failed: string[];
}> {
  const keys = Object.keys(SURAT_MASTER).filter(
    (k) =>
      ![
        "getSuratMaster",
        "getAllSuratMaster",
        "getSuratByCategory",
        "SURAT_MASTER",
        "SURAT_CATEGORIES",
      ].includes(k),
  );

  const failed: string[] = [];
  let success = 0;

  for (const code of keys) {
    const ok = await upsertSuratType(code);
    if (ok) success++;
    else failed.push(code);
  }

  return { success, failed };
}
