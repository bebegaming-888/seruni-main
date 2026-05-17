/**
 * warga-autofill.ts — Shared autofill-from-Warga helper
 *
 * Used by perangkat-desa-store and lembaga-store when filling a person's
 * form fields from their NIK lookup in the warga (penduduk) table.
 *
 * Priority: Supabase (warga table) → IndexedDB (penduduk store)
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { idbGetAll } from "@/lib/idb-store";

export type WargaAutofillResult = {
  nik: string;
  nama: string;
  jenis_kelamin: "Laki-Laki" | "Perempuan";
  tempat_lahir: string;
  tanggal_lahir: string;
  pendidikan: string;
};

/**
 * Lookup warga by NIK and return autofill fields.
 * Returns null if NIK not found or too short.
 *
 * Usage:
 *   const result = await autofillFromNik(nik);
 *   if (result) { setField("nama", result.nama); ... }
 */
export async function autofillFromNik(nik: string): Promise<WargaAutofillResult | null> {
  if (!nik || nik.replace(/\D/g, "").length < 14) return null;

  // 1. Supabase
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb
        .from("warga")
        .select("nik,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,pendidikan")
        .eq("nik", nik)
        .maybeSingle();
      if (data) {
        return {
          nik: String(data.nik ?? ""),
          nama: String(data.nama ?? ""),
          jenis_kelamin: (data.jenis_kelamin as "Laki-Laki" | "Perempuan") ?? "Laki-Laki",
          tempat_lahir: String(data.tempat_lahir ?? ""),
          tanggal_lahir: data.tanggal_lahir ? String(data.tanggal_lahir).slice(0, 10) : "",
          pendidikan: String(data.pendidikan ?? ""),
        };
      }
    }
  }

  // 2. IndexedDB fallback
  const warga = await idbGetAll<Record<string, unknown>>("penduduk");
  const found = warga.find((w) => String(w.nik ?? "") === nik);
  if (found) {
    return {
      nik: String(found.nik ?? ""),
      nama: String(found.nama ?? ""),
      jenis_kelamin: (found.jenis_kelamin as "Laki-Laki" | "Perempuan") ?? "Laki-Laki",
      tempat_lahir: String(found.tempat_lahir ?? ""),
      tanggal_lahir: found.tanggal_lahir ? String(found.tanggal_lahir).slice(0, 10) : "",
      pendidikan: String(found.pendidikan ?? ""),
    };
  }

  return null;
}
