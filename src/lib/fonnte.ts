// Frontend stub for Fonnte WhatsApp notifications.
// API key dari env variable VITE_FONNTE_KEY — tidak pernah di-hardcode.
// Untuk production: panggil Edge Function, bukan langsung dari browser.

// Token baca dari Vite env var (di-set via .dev.vars lokal / Cloudflare Secrets untuk production)
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
 * Mock send: logs to console and resolves successfully.
 * In production: call Edge Function `/api/send-wa` — token tidak pernah dikirim ke browser.
 */
export async function sendWaNotification(target: string, message: string): Promise<FonnteResult> {
  const token = getToken();

  // Jika belum ada env var, pakai mock
  if (token === "__MOCK__" || import.meta.env.DEV) {
    await new Promise((r) => setTimeout(r, 400));
    console.info("[Fonnte mock] →", target, "\n", message);
    return { ok: true, message: `Notifikasi WA mock terkirim ke ${target}` };
  }

  // Production: memanggil Edge Function (bukan langsung ke Fonnte dari browser)
  // TODO: wire ke /api/send-wa Edge Function setelah Fase 1 backend
  try {
    const res = await fetch("/api/send-wa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, message: `Notifikasi WA terkirim ke ${target}` };
  } catch {
    return { ok: false, message: "Gagal mengirim notifikasi" };
  }
}
