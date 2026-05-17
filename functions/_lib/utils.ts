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
export function json(
  data: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
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

/** Constant-time byte comparison to prevent timing attacks.
 * CF Workers V8 engine supports timingSafeEqual natively.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Verify a JWT-like HMAC signature. Returns true if valid.
 * Uses constant-time comparison to prevent timing attack leaks on signature bytes.
 */
export async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, bodyB64, receivedSig] = parts;
  const expectedSig = await hmacSha256Hex(`${headerB64}.${bodyB64}`, secret);
  const a = new TextEncoder().encode(expectedSig);
  const b = new TextEncoder().encode(receivedSig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** OTP hash — PBKDF2 untuk keamanan yang lebih baik daripada plain SHA-256.
 * Menggunakan 100,000 iterasi untuk mencegah brute-force pada OTP 6-digit.
 *
 * Hash format: "pbkdf2:{iterations}${salt}${hash}"
 * Prefix "pbkdf2:" digunakan untuk backward compatibility (old hashes tidak punya prefix).
 */
const OTP_PBKDF2_ITERATIONS = 100_000;

export async function hashOtp(plain: string): Promise<string> {
  // Generate per-OTP random salt (16 bytes, base64url)
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...saltBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: OTP_PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `pbkdf2:${OTP_PBKDF2_ITERATIONS}${saltB64}${hashHex}`;
}

/** Verifikasi OTP hash (support PBKDF2 baru + legacy SHA-256).
 * Menggunakan constant-time comparison untuk mencegah timing attack.
 */
export async function verifyOtpHash(plain: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("pbkdf2:")) {
    // New format: PBKDF2
    const withoutPrefix = storedHash.slice(7);
    const parts = withoutPrefix.split("$");
    if (parts.length !== 3) return false;
    const iterations = parseInt(parts[0], 10);
    const saltB64 = parts[1];
    const expectedHex = parts[2];

    // Decode salt from base64url
    let saltB64Padded = saltB64.replace(/-/g, "+").replace(/_/g, "/");
    while (saltB64Padded.length % 4) saltB64Padded += "=";
    const saltBytes = Uint8Array.from(atob(saltB64Padded), (c) => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(plain),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
      keyMaterial,
      256,
    );
    const computedHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (computedHex.length !== expectedHex.length) return false;
    const a = new TextEncoder().encode(computedHex);
    const b = new TextEncoder().encode(expectedHex);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // Legacy format: SHA-256 + fixed salt (untuk backward compat saat migrasi)
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain + "seruni-otp-salt"),
  );
  const legacyHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (legacyHex.length !== storedHash.length) return false;
  const a = new TextEncoder().encode(legacyHex);
  const b = new TextEncoder().encode(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Legacy hash function (for reading existing SHA-256 hashes during migration). */
async function legacyHashOtp(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain + "seruni-otp-salt"),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
