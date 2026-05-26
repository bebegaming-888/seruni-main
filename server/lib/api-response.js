/**
 * API Response Utilities — Standardized Error & Success Responses
 *
 * Semua endpoint API WAJIB menggunakan helper dari modul ini
 * untuk memastikan konsistensi response format.
 *
 * Format Standar:
 *   Success: { ok: true, data: {...} }
 *   Error:   { ok: false, error: "msg", code: 400 }
 *   503:      { ok: false, error: "msg", code: 503 }
 *   500:      { ok: false, error: "msg", code: 500 } (dev mode: +details)
 */

// ── Constants ──────────────────────────────────────────────────────────────────

export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_INTERNAL_ERROR = 500;
export const HTTP_SERVICE_UNAVAILABLE = 503;

export const IS_DEV = process.env.NODE_ENV !== "production";

// ── Success Responses ─────────────────────────────────────────────────────────

/** Standard success response */
export function ok(res, data, status = HTTP_OK) {
  return res.status(status).json({ ok: true, data });
}

/** Success with raw data (no data wrapper) */
export function okRaw(res, data, status = HTTP_OK) {
  return res.status(status).json({ ok: true, ...data });
}

/** Success with just a message (e.g., for DELETE) */
export function okMessage(res, message, status = HTTP_OK) {
  return res.status(status).json({ ok: true, message });
}

// ── Error Responses ───────────────────────────────────────────────────────────

/**
 * Standard error response — gunakan ini untuk SEMUA error response.
 *
 * @param {object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} error - Pesan error dalam Bahasa Indonesia
 * @param {object|null} details - Detail tambahan (opsional, hanya dev mode)
 */
export function error(res, status, errorMsg, details = null) {
  const body = {
    ok: false,
    error: errorMsg,
    code: status,
  };

  // Hanya expose details di dev mode
  if (details !== null && IS_DEV) {
    body.details = details;
  }

  return res.status(status).json(body);
}

// ── Convenience Shortcuts ─────────────────────────────────────────────────────

/** 400 Bad Request */
export function badRequest(res, errorMsg, details = null) {
  return error(res, HTTP_BAD_REQUEST, errorMsg, details);
}

/** 401 Unauthorized */
export function unauthorized(
  res,
  errorMsg = "Sesi tidak valid atau sudah kadaluarsa. Silakan login ulang.",
) {
  return error(res, HTTP_UNAUTHORIZED, errorMsg);
}

/** 403 Forbidden */
export function forbidden(
  res,
  errorMsg = "Anda tidak memiliki izin untuk mengakses resource ini.",
) {
  return error(res, HTTP_FORBIDDEN, errorMsg);
}

/** 404 Not Found */
export function notFound(res, resource = "Data") {
  return error(res, HTTP_NOT_FOUND, `${resource} tidak ditemukan.`);
}

/** 429 Too Many Requests */
export function rateLimit(
  res,
  errorMsg = "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
) {
  return error(res, HTTP_TOO_MANY_REQUESTS, errorMsg);
}

/** 500 Internal Server Error */
export function serverError(res, details = null) {
  return error(
    res,
    HTTP_INTERNAL_ERROR,
    "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
    details,
  );
}

/** 503 Service Unavailable */
export function unavailable(
  res,
  errorMsg = "Layanan sementara tidak tersedia. Hubungi administrator.",
) {
  return error(res, HTTP_SERVICE_UNAVAILABLE, errorMsg);
}
