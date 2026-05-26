/**
 * E-Surat Submit — Client wrapper untuk /api/submit-surat
 *
 * Menggantikan pemanggilan langsung syncSaveRecord() di ESurat.tsx.
 * Semua submission warga HARUS melalui submitSurat() untuk:
 * 1. Server-side captcha verification
 * 2. Rate limit protection
 * 3. Version audit trail
 * 4. Offline fallback
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { syncSaveRecord } from "./useSupabaseSync";
import { enqueueOfflineSubmission } from "./offline-queue";
import type { SuratRecord } from "./esurat-store";

export type SubmitResult =
  | { ok: true; no: string; tracking_no: string; error: null }
  | { ok: false; no?: string; tracking_no?: string; error: string };

/** Submit surat ke server. Fallback ke offline queue jika server unreachable. */
export async function submitSurat(
  record: SuratRecord,
  captcha_token?: string,
): Promise<SubmitResult> {
  // 1. Validate required fields client-side (belt-and-suspenders)
  if (!record.no || !record.kode || !record.pemohon || !record.nik || !record.kontak) {
    return { ok: false, error: "Data tidak lengkap — semua field wajib diisi" };
  }
  if (!/^\d{16}$/.test(record.nik)) {
    return { ok: false, error: "NIK harus 16 digit angka" };
  }

  // 2. Check online status
  if (!navigator.onLine) {
    // Offline: enqueue and return success (will be processed on reconnect)
    await enqueueOfflineSubmission({
      type: "surat",
      data: { ...record, captcha_token },
    });
    return {
      ok: true,
      no: record.no,
      tracking_no: record.tracking_no ?? record.no,
      error: null,
    };
  }

  // 3. Try server-side submission
  try {
    const response = await fetch("/api/submit-surat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record, captcha_token }),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await response.json()) as {
      ok: boolean;
      no?: string;
      tracking_no?: string;
      error?: string;
    };

    if (json.ok && json.no && json.tracking_no) {
      // Update local cache with server-returned data
      const updatedRecord = {
        ...record,
        no: json.no,
        tracking_no: json.tracking_no,
        cloudSynced: true,
      };
      await syncSaveRecord(updatedRecord, record.pemohon ?? "Warga", true);
      return { ok: true, no: json.no, tracking_no: json.tracking_no, error: null };
    }

    return { ok: false, error: json.error ?? "Submission gagal" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[submitSurat] Server unreachable, queueing offline:", msg);

    // Server unreachable — queue for later
    await enqueueOfflineSubmission({
      type: "surat",
      data: { ...record, captcha_token },
    });

    // Still return success — submission is queued
    return {
      ok: true,
      no: record.no,
      tracking_no: record.tracking_no ?? record.no,
      error: null,
    };
  }
}

/** Check rate limit status — returns remaining submissions for this NIK. */
export async function getRateLimitStatus(nik: string): Promise<{
  remaining: number;
  resetAt?: string;
}> {
  if (!isSupabaseConfigured) return { remaining: 3 };

  try {
    const sb = getSupabase();
    if (!sb) return { remaining: 3 };

    const { data } = await sb
      .from("submission_rate_limit")
      .select("count, first_at")
      .eq("nik", nik)
      .single();

    if (!data) return { remaining: 3 };

    const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(data.first_at) < window24h) {
      // Window expired
      return { remaining: 3 };
    }

    return {
      remaining: Math.max(0, 3 - (data.count ?? 0)),
      resetAt: new Date(new Date(data.first_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    return { remaining: 3 };
  }
}

/** Get surat request version history for audit. */
export async function getSuratVersionHistory(suratNo: string): Promise<
  Array<{
    id: string;
    version: number;
    data: Record<string, unknown>;
    changed_by: string;
    changed_at: string;
    change_type: string;
  }>
> {
  if (!isSupabaseConfigured) return [];

  try {
    const sb = getSupabase();
    if (!sb) return [];

    const { data } = await sb
      .from("surat_request_versions")
      .select("*")
      .eq("surat_no", suratNo)
      .order("version", { ascending: false });

    return (data ?? []) as Array<{
      id: string;
      version: number;
      data: Record<string, unknown>;
      changed_by: string;
      changed_at: string;
      change_type: string;
    }>;
  } catch {
    return [];
  }
}
