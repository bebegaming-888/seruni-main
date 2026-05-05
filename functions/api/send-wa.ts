/**
 * Edge Function: /api/send-wa
 *
 * Aman: Token Fonnte tidak pernah dikirim ke browser.
 * Browser memanggil endpoint ini → Edge Function meneruskan ke Fonnte API.
 *
 * Request body:
 *   { target: "62812...", message: "Halo..." }
 *
 * Deployment:
 *   wrangler secret put FONNTE_API_KEY
 *   wrangler secret put SUPABASE_URL
 *   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
 *   lalu: npx wrangler deploy
 */

// Cloudflare Pages Functions dieksekusi di Edge (V8 isolate)
// env.FONNTE_API_KEY berasal dari: wrangler secret put FONNTE_API_KEY
// env.SUPABASE_* berasal dari: wrangler secret put SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

interface SendWaRequest {
  target: string;
  message: string;
  no_surat?: string;
  username?: string;
}

interface Env {
  FONNTE_API_KEY: string;
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

  const token = env.FONNTE_API_KEY;
  if (!token) {
    console.error("[send-wa] FONNTE_API_KEY belum di-set di wrangler secrets");
    return new Response(
      JSON.stringify({ ok: false, message: "Server not configured for WhatsApp" }),
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
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
