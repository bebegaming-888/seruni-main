// Frontend stub for Fonnte WhatsApp notifications.
// Token dibaca dari settings DB (settings.notifications.fonnte_token).
// Untuk production: SELALU melewati Edge Function /api/send-wa (token tidak pernah ke browser).

import { getSettings } from "@/lib/settings-store";
import { getSession } from "@/lib/auth";
import { getWargaSession } from "@/lib/warga-auth";

export type FonnteResult = { ok: boolean; message: string };

/**
 * Kirim WA via Edge Function /api/send-wa.
 * Token Fonnte dan Admin WA number dibaca dari settings DB, dikirim ke server.
 * Server akan fallback ke env var jika settings kosong.
 *
 * Auth: Admin session (HMAC-signed) OR Warga session (NIK-based)
 */
export async function sendWaNotification(target: string, message: string): Promise<FonnteResult> {
  const settings = getSettings();
  const token = settings.notifications.fonnte_token || "";
  const adminCC = settings.village.whatsapp || "";

  try {
    // Try admin session first, fallback to warga session
    const adminSession = getSession();
    const wargaSession = getWargaSession();

    let authHeader = "";
    if (adminSession) {
      authHeader = `Bearer ${JSON.stringify(adminSession)}`;
    } else if (wargaSession) {
      authHeader = `Bearer ${JSON.stringify(wargaSession)}`;
    }

    const res = await fetch("/api/send-wa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ target, message, token, adminCC }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data.message ?? `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: data.ok ?? true, message: data.message ?? `WA terkirim ke ${target}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengirim notifikasi";
    return { ok: false, message: msg };
  }
}
