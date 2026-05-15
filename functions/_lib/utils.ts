/**
 * Shared utilities for Cloudflare Pages Edge Functions.
 */

/** RFC 4648 base64url encode — no Buffer, works in Cloudflare Workers V8. */
export function base64UrlEncode(str: string): string {
  // Encode to UTF-8 bytes, then base64url
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64 URL decode — handles both URL-safe and standard base64. */
export function base64UrlDecode(str: string): ArrayBuffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Standard JSON response helper with CORS headers. */
export function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

/** CORS preflight handler. */
export function corsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** HMAC-SHA256 → hex string (for edge function session signing). */
export async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const dataBuffer = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify a JWT-like HMAC signature. Returns true if valid. */
export async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, bodyB64, receivedSig] = parts;
  const expectedSig = await hmacSha256Hex(`${headerB64}.${bodyB64}`, secret);
  if (expectedSig.length !== receivedSig.length) return false;
  // Constant-time comparison to prevent timing attacks
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ receivedSig.charCodeAt(i);
  }
  return diff === 0;
}

/** OTP hash — shared between request-otp and verify-otp.
 * Salt is defined here so both files stay in sync.
 */
export async function hashOtp(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain + "seruni-otp-salt"),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
