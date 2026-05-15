// Frontend stub for Fonnte WhatsApp notifications.
// Token tidak pernah di-hardcode — dibaca dari VITE_FONNTE_KEY.
// Untuk production: SELALU melewati Edge Function /api/send-wa (token tidak pernah ke browser).

// Token dibaca dari VITE_FONNTE_KEY (di-set via .env / deployment secrets)
const getToken = () => {
  const t = import.meta.env.VITE_FONNTE_KEY;
  if (!t) {
    console.warn("[Fonnte] VITE_FONNTE_KEY belum di-set — fallback ke mock");
    return "__MOCK__";
  }
  return t;
};

export type FonnteResult = { ok: boolean; message: string };

/**
 * Kirim WA via Edge Function /api/send-wa.
 * Token Fonnte TIDAK PERNAH dikirim ke browser — selalu di-handle server-side.
 * Dev mode fallback: edge function akan menggunakan mock jika VITE_FONNTE_KEY tidak di-set.
 */
export async function sendWaNotification(target: string, message: string): Promise<FonnteResult> {
  try {
    const res = await fetch("/api/send-wa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, message: data.message ?? `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: data.ok ?? true, message: data.message ?? `WA terkirim ke ${target}` };
  } catch {
    return { ok: false, message: "Gagal mengirim notifikasi" };
  }
}
