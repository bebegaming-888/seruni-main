/**
 * Edge Function: /api/push/send
 *
 * Kirim Web Push notification via Web Push Protocol (RFC 8030).
 * Menggunakan fetch ke endpoint browser push — tidak perlu library eksternal.
 *
 * Env vars (Cloudflare Secrets):
 *   VAPID_PRIVATE_KEY — VAPID private key (base64, PKCS8)
 *   VAPID_PUBLIC_KEY  — VAPID public key (base64)
 *   VAPID_SUBJECT     — mailto: atau https:// URL (VAPID subject)
 *
 * Request body:
 *   { title, body, url?, tag?, icon?, badge?, subscription: {...} }
 *
 * Response:
 *   { ok: true }
 *   { ok: false, error: string }
 */

import { base64UrlDecode } from "../../_lib/utils";

interface Env {
  VAPID_PRIVATE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_SUBJECT: string;
}

interface RequestBody {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
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

// ─── VAPID JWT ────────────────────────────────────────────────────────────────
async function createVapidJwt(endpoint: string, env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const audience = new URL(endpoint).origin;

  const header = { typ: "JWT", alg: "ES256" };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)).buffer);

  // Normalize VAPID_SUBJECT: prepend mailto: if not already present
  const rawSub = env.VAPID_SUBJECT ?? "";
  const sub =
    rawSub.startsWith("mailto:") || rawSub.startsWith("https://") ? rawSub : `mailto:${rawSub}`;

  const payload = {
    aud: audience,
    exp: now + 86400,
    sub,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)).buffer);

  // Sign with crypto.subtle (ES256 P-256 curve)
  // cloudflare workers supports crypto.subtle since 2021
  const privateKeyRaw = base64UrlDecode(env.VAPID_PRIVATE_KEY);
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyRaw,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyData,
    signingInput,
  );

  const sigB64 = base64UrlEncode(signature);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

// ─── Base64 URL encode ────────────────────────────────────────────────────────
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await context.request.json()) as RequestBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { title, body: msgBody, url, tag, icon, badge, subscription } = body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh) {
    return json({ ok: false, error: "Invalid subscription" }, 400);
  }

  if (!title || !msgBody) {
    return json({ ok: false, error: "title and body required" }, 400);
  }

  // Validate VAPID env vars at entry point
  if (
    !context.env.VAPID_PRIVATE_KEY ||
    !context.env.VAPID_PUBLIC_KEY ||
    !context.env.VAPID_SUBJECT
  ) {
    console.error("[push/send] Missing VAPID env vars — check wrangler secrets");
    return json({ ok: false, error: "Push service misconfigured" }, 500);
  }

  // Validate VAPID_SUBJECT is a proper mailto: or https:// URL
  const sub = context.env.VAPID_SUBJECT;
  if (!/^(mailto:|https?:\/\/)/.test(sub)) {
    console.error("[push/send] VAPID_SUBJECT must be mailto: or https:// URL");
    return json({ ok: false, error: "VAPID_SUBJECT must be a mailto: or https:// URL" }, 500);
  }

  // Build push payload
  const payloadObj = {
    title,
    body: msgBody,
    icon: icon ?? "/icons/icon-192.png",
    badge: badge ?? "/icons/badge-72.png",
    url: url ?? "/",
    tag: tag ?? "default",
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadBytes = new TextEncoder().encode(payloadStr);

  // Create VAPID JWT
  let vapidToken: string;
  try {
    vapidToken = await createVapidJwt(subscription.endpoint, context.env);
  } catch (signErr) {
    console.error("[push/send] VAPID JWT signing failed:", signErr);
    return json({ ok: false, error: "Failed to sign push message" }, 500);
  }

  // Send via Web Push Protocol
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Topic: tag ?? "default",
      "Crypto-Key": `p256dh=${subscription.keys.p256dh}; vapid=${vapidToken}`,
      Authorization: `vapid t=${vapidToken}, k=${context.env.VAPID_PUBLIC_KEY}`,
    },
    body: payloadBytes,
  });

  // Handle expired/invalid subscription — client should unsubscribe
  if (response.status === 410 || response.status === 404) {
    return json({ ok: false, error: "Subscription expired" }, 410);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    return json({ ok: false, error: errText }, 500);
  }

  return json({ ok: true }, 200);
}

// ─── JSON helper with CORS ────────────────────────────────────────────────────
function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
