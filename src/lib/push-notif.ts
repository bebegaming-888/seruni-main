/**
 * push-notif.ts — Web Push API subscription & trigger
 *
 * Service Worker (sw.js) handles push events natively.
 * This module manages: permission request, subscription, storage, trigger.
 *
 * Env vars needed:
 *   VITE_VAPID_PUBLIC_KEY — VAPID public key (browser-safe)
 *   (VAPID private key → Cloudflare Secrets → Edge Function /api/push/send)
 *
 * Generate VAPID keys:
 *   npx web-push generate-vapid-keys
 */

import { isSupabaseConfigured } from "./supabase";

const PUSH_SUB_KEY = "push_subscription_v1";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: number;
};

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
};

/** Cek apakah browser mendukung push notification */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Current permission state */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Request notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Ambil VAPID public key dari env */
export function getVapidPublicKey(): string | null {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_VAPID_PUBLIC_KEY ?? null;
}

/** Subscribe ke push manager — simpan subscription di localStorage + Supabase */
export async function subscribePush(): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.warn("[push] VITE_VAPID_PUBLIC_KEY not set — push disabled");
    return null;
  }

  const sw = await navigator.serviceWorker.ready;
  const sub = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });

  const subJson = sub.toJSON() as PushSubscriptionJSON;
  const stored: PushSubscriptionJSON = { ...subJson, created_at: Date.now() };

  localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(stored));

  if (isSupabaseConfigured) {
    try {
      const { getSupabase } = await import("./supabase");
      const sb = getSupabase();
      if (sb) {
        const sessionRaw = localStorage.getItem("admin_session");
        if (sessionRaw) {
          const user = JSON.parse(sessionRaw) as { id?: string };
          if (user?.id) {
            await sb.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: stored.endpoint,
                p256dh: stored.keys.p256dh,
                auth: stored.keys.auth,
              },
              { onConflict: "endpoint" },
            );
          }
        }
      }
    } catch {
      // non-blocking
    }
  }

  return stored;
}

/** Unsubscribe dari push */
export async function unsubscribePush(): Promise<void> {
  const sw = await navigator.serviceWorker.ready;
  const sub = await sw.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  localStorage.removeItem(PUSH_SUB_KEY);
}

/** Cek apakah sudah subscribed */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const sw = await navigator.serviceWorker.ready;
    const sub = await sw.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Kirim push notification via Edge Function /api/push/send */
export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  const subRaw = localStorage.getItem(PUSH_SUB_KEY);
  if (!subRaw) return false;

  try {
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, subscription: JSON.parse(subRaw) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trigger push saat status surat berubah */
export async function triggerSuratPush(
  no: string,
  namaSurat: string,
  status: string,
  namaWarga: string,
): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;

  const statusMessage: Record<string, string> = {
    "Menunggu Verifikasi": "sedang menunggu verifikasi oleh admin.",
    Diverifikasi: "telah diverifikasi dan menunggu persetujuan.",
    "Menunggu Approval": "menunggu persetujuan Kepala Desa.",
    Disetujui: "TELAH DISETUJI! Surat siap diambil.",
    Ditolak: "ditolak. Mohon cek catatan dari admin.",
  };

  await sendPushNotification({
    title: `Status Surat: ${namaSurat}`,
    body: `Yth. ${namaWarga}, pengajuan surat Anda ${statusMessage[status] ?? status}`,
    url: `/pelayanan/monitoring?no=${no}`,
    tag: `surat-${no}`,
  });
}

// ---- Helpers ----

/** Konversi VAPID key (base64url) ke Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
