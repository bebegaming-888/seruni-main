/**
 * qr-signature.ts — HMAC-SHA256 signing & verification for QR verification payloads
 *
 * Format payload:
 *   SERUNI-MUMBUL|{no}|{nik}|{kode}|{timestamp}|{hmac_hex}
 *
 * Signature = HMAC-SHA256("SERUNI-MUMBUL|{no}|{nik}|{kode}|{timestamp}", qr_secret)
 * Verifikasi: re-compute signature dan bandingkan — forgery langsung terdeteksi.
 *
 * Usage:
 *   // Di Admin.tsx approve() — await signQrPayload():
 *   const signed = await signQrPayload({ no: noSurat, nik: r.nik, kode: r.kode });
 *   updated.qr_payload = signed.raw;
 *
 *   // Di verify-surat.ts edge function — await verifyQrPayload():
 *   const payload = await verifyQrPayload(rawString, serverSecret);
 *   if (!payload) → tampered/forged
 */

const PAYLOAD_PREFIX = "SERUNI-MUMBUL";

export type SignedQrPayload = {
  no: string;
  nik: string;
  kode: string;
  timestamp: string;
  /** Hex-encoded HMAC-SHA256 signature */
  signature: string;
  /** Full string: SERUNI-MUMBUL|no|nik|kode|ts|signature */
  raw: string;
};

// ── Signing ────────────────────────────────────────────────────────────────────

/** Sign payload untuk QR code (async — browser + edge compatible) */
export async function signQrPayload(params: {
  no: string;
  nik: string;
  kode: string;
  secret?: string;
}): Promise<SignedQrPayload> {
  const timestamp = new Date().toISOString();
  const secret = params.secret ?? "";

  const data = [PAYLOAD_PREFIX, params.no, params.nik, params.kode, timestamp].join("|");
  const signature = secret ? await hmacSha256Hex(data, secret) : "unsigned";

  const raw = [PAYLOAD_PREFIX, params.no, params.nik, params.kode, timestamp, signature].join("|");

  return { no: params.no, nik: params.nik, kode: params.kode, timestamp, signature, raw };
}

// ── Verification ──────────────────────────────────────────────────────────────

/** Verify signed payload (async — browser/edge compatible). Returns null if tampered. */
export async function verifyQrPayload(
  raw: string,
  secret: string,
): Promise<SignedQrPayload | null> {
  if (!raw || typeof raw !== "string") return null;

  const parts = raw.split("|");
  if (parts.length < 6) return null;

  const [prefix, no, nik, kode, timestamp, ...sigParts] = parts;
  const signature = sigParts.join("|"); // signature itself may not contain "|"

  if (prefix !== PAYLOAD_PREFIX) return null;
  if (!no || !nik || !kode || !timestamp || !signature) return null;
  if (signature === "unsigned" || !secret) return { no, nik, kode, timestamp, signature, raw };

  // Re-compute expected signature
  const data = [PAYLOAD_PREFIX, no, nik, kode, timestamp].join("|");
  const expected = await hmacSha256Hex(data, secret);

  if (expected !== signature) {
    console.warn("[qr-signature] Tampered payload:", raw);
    return null;
  }

  return { no, nik, kode, timestamp, signature, raw };
}

// ── HMAC-SHA256 via Web Crypto API ─────────────────────────────────────────────

/** HMAC-SHA256 → hex string (works in browser, Cloudflare Workers, Node.js 19+) */
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
