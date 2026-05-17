/**
 * Edge Function: /api/send-wa
 *
 * Token Fonnte dibaca DARI settings (app_settings table) — admin mengkonfigurasi
 * melalui SettingsPanel. Fallback ke FONNTE_API_KEY env var untuk backward compat.
 *
 * Env vars:
 *   FONNTE_API_KEY       — Fonnte API token (fallback)
 *   FONNTE_SENDER_NAME   — Nama pengirim opsional
 *   SUPABASE_URL         — Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *
 * Request body:
 *   { target: "62812...", message: "Halo...", no_surat?: string, username?: string }
 */

import { createClient } from "@supabase/supabase-js";
import { json, corsOptions } from "../_lib/utils";
import { createRateLimiter, getClientIp } from "../_lib/rate-limit";
import { verifyAdminSession } from "../_lib/admin-session";

interface SendWaRequest {
  target: string;
  message: string;
  no_surat?: string;
  username?: string;
}

interface Env {
  ADMIN_SESSION_SECRET: string;
  FONNTE_API_KEY?: string;
  FONNTE_SENDER_NAME?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

// ---- Supabase Admin Client ----

function createAdminClient(env: Env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Fetch fonnte_token dari app_settings table (server-side, admin-configured). */
async function fetchFonnteTokenFromSettings(
  sb: ReturnType<typeof createClient>,
): Promise<string | null> {
  try {
    const { data } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "main_settings")
      .single();
    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      const val = data.value as Record<string, unknown>;
      const notif = val.notifications;
      if (notif && typeof notif === "object" && !Array.isArray(notif)) {
        const token = (notif as Record<string, unknown>).fonnte_token;
        if (typeof token === "string" && token.trim()) return token.trim();
      }
    }
  } catch {
    // non-critical
  }
  return null;
}

// ---- Audit & Notification Logger ----

async function logToDb(
  env: Env,
  entry: {
    action: string;
    detail?: string;
    username?: string;
    nik?: string;
    phone?: string;
    status?: string;
  },
) {
  const sb = createAdminClient(env);
  if (!sb) return;

  try {
    await sb.from("audit_log").insert({
      username: entry.username ?? "system",
      action: entry.action,
      detail: entry.detail ?? null,
    });
  } catch {
    // Audit log failure should never break WA sending
  }

  try {
    await sb.from("notifications").insert({
      phone: entry.phone ?? null,
      type: entry.action,
      status: entry.status ?? "pending",
      sent_at: entry.status === "sent" ? new Date().toISOString() : null,
      detail: entry.detail ?? null,
    });
  } catch {
    // Notification log failure should never break WA sending
  }
}

// ---- Main Handler ----

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  // Admin auth check — only logged-in admins can send WhatsApp messages
  const session = await verifyAdminSession(context.request, context.env.ADMIN_SESSION_SECRET ?? "");
  if (!session) {
    return json({ ok: false, message: "Unauthorized — silakan login terlebih dahulu" }, 401);
  }

  const rl = createRateLimiter("admin");
  const ip = getClientIp(context.request);
  const rlCheck = rl.check(ip);
  if (!rlCheck.ok && rlCheck.response) return rlCheck.response;

  const { request, env } = context;

  // Parse request body
  let body: SendWaRequest;
  try {
    body = (await request.json()) as SendWaRequest;
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { target, message, no_surat, username } = body;

  if (!target || !message) {
    return new Response(JSON.stringify({ ok: false, message: "target dan message wajib diisi" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve Fonnte token: settings (app_settings) → env var (fallback)
  // Settings-driven token: admin mengkonfigurasi melalui SettingsPanel E-Signature
  let token: string | null = null;
  const sb = createAdminClient(env);
  if (sb) {
    token = await fetchFonnteTokenFromSettings(sb);
  }
  if (!token) {
    token = env.FONNTE_API_KEY ?? null;
  }
  if (!token) {
    console.error("[send-wa] Fonnte token tidak ditemukan — cek SettingsPanel tab E-Signature");
    return new Response(
      JSON.stringify({
        ok: false,
        message:
          "Token WhatsApp belum dikonfigurasi. Buka Settings → E-Signature untuk mengisi Fonnte Token.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Kirim ke Fonnte API
  try {
    const formData = new URLSearchParams({ target, message });
    if (env.FONNTE_SENDER_NAME) formData.set("sender", env.FONNTE_SENDER_NAME);

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = (await fonnteRes.json()) as {
      status?: boolean;
      message?: string;
      reason?: string;
    };

    const waStatus = fonnteRes.ok && result.status !== false ? "sent" : "failed";

    // Log audit + notification ke Supabase (non-blocking — WA sending tetap dikembalikan)
    logToDb(env, {
      action: "wa.send",
      detail: no_surat
        ? `WA ke ${target} untuk surat ${no_surat}: ${result.reason ?? result.message ?? "OK"}`
        : `WA ke ${target}: ${result.reason ?? result.message ?? "OK"}`,
      username: username ?? "system",
      phone: target,
      status: waStatus,
    });

    if (!fonnteRes.ok || result.status === false) {
      console.error("[send-wa] Fonnte error:", result);
      return new Response(
        JSON.stringify({ ok: false, message: result.reason ?? "Gagal mengirim WA" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, message: `WA terkirim ke ${target}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-wa] Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, message: "Terjadi kesalahan server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// OPTIONS — untuk CORS preflight jika diperlukan
export async function onRequestOptions(): Promise<Response> {
  return corsOptions();
}
