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
 *   lalu: npx wrangler deploy
 */

// Cloudflare Pages Functions dieksekusi di Edge (V8 isolate)
// env.FONNTE_API_KEY berasal dari: wrangler secret put FONNTE_API_KEY

interface SendWaRequest {
  target: string;
  message: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: { FONNTE_API_KEY: string; FONNTE_SENDER_NAME?: string };
}): Promise<Response> {
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

  const { target, message } = body;

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
    const formData = new URLSearchParams({
      target,
      message,
      ...(env.FONNTE_SENDER_NAME ? { sender: env.FONNTE_SENDER_NAME } : {}),
    });

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
