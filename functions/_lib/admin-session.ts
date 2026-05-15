/**
 * Shared admin session utilities for edge functions.
 *
 * Format cookie: base64url(json_payload).hmac_hex_signature
 * Signature = HMAC-SHA256(json_payload, ADMIN_SESSION_SECRET)
 *
 * Usage:
 *   const session = await verifyAdminSession(request, env.ADMIN_SESSION_SECRET);
 *   if (!session) return new Response("Unauthorized", { status: 401 });
 */

import { hmacSha256Hex, base64UrlDecode } from "./utils";

export type AdminSession = {
  userId: string;
  username: string;
  name: string;
  role: string;
  expiresAt: string;
};

/** Parse and verify admin_session cookie. Returns null if missing/tampered/expired. */
export async function verifyAdminSession(
  request: Request,
  secret: string,
): Promise<AdminSession | null> {
  if (!secret) return null;

  const cookieHeader = request.headers.get("Cookie") ?? request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )admin_session=([^;]+)/);
  if (!match) return null;

  const raw = decodeURIComponent(match[1]);
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx < 0) return null;

  const payloadB64 = raw.slice(0, dotIdx);
  const receivedSig = raw.slice(dotIdx + 1);

  // Re-compute expected HMAC
  const decoder = new TextDecoder();
  const payloadStr = decoder.decode(base64UrlDecode(payloadB64));
  const expectedSig = await hmacSha256Hex(payloadStr, secret);

  if (expectedSig !== receivedSig) {
    console.warn("[admin-session] Tampered or invalid signature");
    return null;
  }

  let session: AdminSession;
  try {
    session = JSON.parse(payloadStr) as AdminSession;
  } catch {
    return null;
  }

  // Check expiry
  if (Date.now() > new Date(session.expiresAt).getTime()) {
    return null;
  }

  return session;
}
