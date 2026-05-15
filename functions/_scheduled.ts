/**
 * Cloudflare Pages Scheduled Function: _scheduled.ts
 *
 * Dijalankan secara otomatis oleh Cloudflare Pages Cron Trigger.
 * Schedule: setiap 6 jam (cron: 0 0,6,12,18 * * *) — dikonfigurasi di Cloudflare Dashboard:
 *   Settings → Cron Triggers → Add Cron → "0 0,6,12,18 * * *"
 *
 * Fungsi:
 *   1. Query semua surat dengan status 'Menunggu Verifikasi'
 *      yang tidak diupdate lebih dari 3x24 jam (aged >= 3 hari)
 *   2. Kirim WA reminder ke Verifikator via /api/send-wa
 *   3. Log hasil ke audit_log
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FONNTE_API_KEY
 *   ADMIN_WA_NUMBER  — nomor WA Verifikator/Kepala Desa untuk terima notifikasi
 *
 * Cloudflare Dashboard setup:
 *   1. Buka Cloudflare Dashboard → Pages → project Seruni Mumbul
 *   2. Settings → Cron Triggers
 *   3. Add Cron: "0 0,6,12,18 * * *" (setiap 6 jam)
 *   4. Associate: _scheduled (this file)
 */

import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FONNTE_API_KEY?: string;
  ADMIN_WA_NUMBER?: string;
}

function sb(env: Env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Kirim WA via Fonnte API */
async function sendWa(token: string, target: string, message: string): Promise<boolean> {
  try {
    const formData = new URLSearchParams({ target, message });
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const json = (await res.json()) as { status?: boolean };
    return res.ok && json.status !== false;
  } catch {
    return false;
  }
}

interface SuratItem {
  no_surat: string;
  nama_surat: string;
  pemohon: string;
  created_at: string;
  updated_at: string;
  kontak: string;
}

/** Format tanggal Indonesia */
function fmtTanggal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export async function scheduled(env: Env, _cron: { schedule: string }): Promise<Response> {
  const client = sb(env);
  const token = env.FONNTE_API_KEY;
  const adminWa = env.ADMIN_WA_NUMBER;

  if (!client) {
    console.error("[cron/reminder] Supabase not configured");
    return new Response("Supabase not configured", { status: 500 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Ambil surat aged 3+ hari di "Menunggu Verifikasi" ──
  const { data: aged, error: agedErr } = await client
    .from("surat_requests")
    .select("no_surat, nama_surat, pemohon, kontak, created_at, updated_at")
    .eq("status", "Menunggu Verifikasi")
    .lt("updated_at", threeDaysAgo)
    .order("updated_at", { ascending: true });

  if (agedErr) {
    console.error("[cron/reminder] Query error:", agedErr);
    return new Response("Query failed", { status: 500 });
  }

  const items = (aged ?? []) as SuratItem[];

  if (items.length === 0) {
    console.log("[cron/reminder] No aged surat found — skipping");
    return new Response("No aged surat found", { status: 200 });
  }

  // ── 2. Kirim WA ke Verifikator ──
  if (!token || !adminWa) {
    console.warn("[cron/reminder] FONNTE_API_KEY or ADMIN_WA_NUMBER not set — skipping WA");
    return new Response("WA not configured", { status: 200 });
  }

  const itemList = items
    .map(
      (s, i) =>
        `${i + 1}. *${s.nama_surat}*\n   No: ${s.no_surat}\n   Pemohon: ${s.pemohon}\n   Ajuan: ${fmtTanggal(s.created_at)}`,
    )
    .join("\n\n");

  const waMessage = `🏷️ *Reminder: Surat Menunggu Verifikasi*

Halo, terdapat *${items.length} surat* yang belum diproses lebih dari 3 hari:

${itemList}

Mohon segera ditinjau dan diproses.

_Notifikasi otomatis dari Sistem Desa Seruni Mumbul_`;

  const sent = await sendWa(token, adminWa, waMessage);

  // ── 3. Log audit ──
  await client.from("audit_log").insert({
    username: "system:cron",
    action: "cron.reminder_surat_aged",
    detail: `Reminder dikirim untuk ${items.length} surat aged 3+ hari. WA sent: ${sent}. Items: ${items.map((s) => s.no_surat).join(", ")}`,
  });

  console.log(`[cron/reminder] Sent reminder for ${items.length} aged surat. WA sent: ${sent}`);
  return new Response(JSON.stringify({ ok: true, aged_count: items.length, wa_sent: sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
