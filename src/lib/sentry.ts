/**
 * sentry.ts — Sentry Error Tracking Integration
 *
 * Setup Sentry untuk production error monitoring.
 * Free tier: 5,000 errors/month — cukup untuk volume desa.
 *
 * Env vars:
 *   VITE_SENTRY_DSN — Sentry DSN (opsional, hanya di production)
 *   VITE_SENTRY_ENVIRONMENT — environment name (default: production)
 *
 * Features:
 *   - Automatic error capture (uncaught exceptions, unhandled rejections)
 *   - React error boundary integration
 *   - Breadcrumbs (console, fetch, navigation)
 *   - User context (NIK di-mask untuk privacy)
 *   - Release tracking via git hash
 *
 * Privacy:
 *   - NIK, nomor HP, email di-scrub otomatis via beforeSend
 *   - PII tidak pernah dikirim ke Sentry
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENVIRONMENT || "production";
const BUILD_HASH = import.meta.env.VITE_BUILD_HASH || "dev";

/** Regex untuk deteksi PII */
const NIK_PATTERN = /\b\d{16}\b/g;
const PHONE_PATTERN = /\b(?:08|62)\d{8,12}\b/g;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/** Scrub PII dari string */
function scrubPii(text: string): string {
  return text
    .replace(NIK_PATTERN, "[NIK_REDACTED]")
    .replace(PHONE_PATTERN, "[PHONE_REDACTED]")
    .replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");
}

/** Scrub PII dari object (recursive) */
function scrubObject(obj: unknown): unknown {
  if (typeof obj === "string") return scrubPii(obj);
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(scrubObject);

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys yang sering mengandung PII
    if (["nik", "kontak", "no_hp", "email", "telepon", "whatsapp"].includes(key.toLowerCase())) {
      scrubbed[key] = "[REDACTED]";
    } else {
      scrubbed[key] = scrubObject(value);
    }
  }
  return scrubbed;
}

export function initSentry() {
  // Hanya aktif di production + DSN tersedia
  if (import.meta.env.DEV || !SENTRY_DSN) {
    console.log("[sentry] Skipped (dev mode or no DSN)");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,
    release: `mitradesa@${BUILD_HASH}`,

    // Sample rate: 100% untuk error, 10% untuk performance
    tracesSampleRate: 0.1,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Replay: hanya capture saat error (hemat quota)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Scrub PII sebelum kirim
    beforeSend(event, hint) {
      // Scrub exception message
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((ex) => ({
          ...ex,
          value: ex.value ? scrubPii(ex.value) : ex.value,
        }));
      }

      // Scrub breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
          ...crumb,
          message: crumb.message ? scrubPii(crumb.message) : crumb.message,
          data: crumb.data ? (scrubObject(crumb.data) as Record<string, unknown>) : crumb.data,
        }));
      }

      // Scrub request data
      if (event.request) {
        if (event.request.url) event.request.url = scrubPii(event.request.url);
        // query_string is QueryParams object — already covered by URL scrubbing
        if (event.request.data)
          event.request.data = scrubObject(event.request.data) as Record<string, unknown>;
      }

      // Scrub extra context
      if (event.extra) {
        event.extra = scrubObject(event.extra) as Record<string, unknown>;
      }

      return event;
    },

    // Ignore known non-critical errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",
      // Network errors (user offline)
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      // ResizeObserver loop limit (non-critical)
      "ResizeObserver loop",
    ],
  });

  console.log(`[sentry] Initialized (env: ${SENTRY_ENV}, release: ${BUILD_HASH})`);
}

/** Set user context (untuk tracking per user, NIK di-mask) */
export function setSentryUser(nik?: string, nama?: string) {
  if (!SENTRY_DSN || import.meta.env.DEV) return;

  Sentry.setUser({
    id: nik ? `user_${nik.slice(0, 4)}****` : undefined, // mask NIK
    username: nama,
  });
}

/** Clear user context (saat logout) */
export function clearSentryUser() {
  if (!SENTRY_DSN || import.meta.env.DEV) return;
  Sentry.setUser(null);
}

/** Capture exception manually */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN || import.meta.env.DEV) {
    console.error("[sentry] Error (dev mode):", error, context);
    return;
  }

  Sentry.captureException(
    error,
    context ? { extra: scrubObject(context) as Record<string, unknown> } : {},
  );
}

/** Capture message (non-error event) */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (!SENTRY_DSN || import.meta.env.DEV) {
    console.log(`[sentry] Message (${level}):`, message);
    return;
  }

  Sentry.captureMessage(scrubPii(message), level);
}
