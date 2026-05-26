/**
 * Local API Server — Seruni Mumbul
 *
 * Replaces Netlify Functions for local development.
 * Run: node server/index.js (or via `bun run server` / `npm run server`)
 *
 * All endpoints mirror the Netlify Function implementations.
 *
 * Response format: { ok: boolean, data?: any, error?: string, code?: number }
 * All responses include security headers (X-Content-Type-Options, etc.)
 */

import "dotenv/config";
import "express-async-errors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";

// ── Environment Loading ───────────────────────────────────────────────────────

// Also load .dev.vars (server-side secrets — not in browser bundle)
// dotenv/config loads .env first; then we manually merge .dev.vars on top
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devVarsPath = path.join(__dirname, "../.dev.vars");
if (fs.existsSync(devVarsPath)) {
  const devVarsContent = fs.readFileSync(devVarsPath, "utf8");
  for (const line of devVarsContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV ?? "development";

// ── CORS Configuration ─────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "";

if (
  NODE_ENV === "production" &&
  (!ALLOWED_ORIGIN || ALLOWED_ORIGIN.trim() === "" || ALLOWED_ORIGIN === "*")
) {
  console.error(
    "[server] FATAL: ALLOWED_ORIGIN must be set to a specific origin in production. " +
      "Refusing to start with wildcard CORS.",
  );
  process.exit(1);
}

if (!ALLOWED_ORIGIN || ALLOWED_ORIGIN.trim() === "" || ALLOWED_ORIGIN === "*") {
  console.warn(
    "[server] WARNING: CORS is open to all origins. " +
      "Set ALLOWED_ORIGIN for production (e.g., https://app.adacode.ai).",
  );
}

// ── Route Imports ───────────────────────────────────────────────────────────────

import healthCheck from "./api/health-check.js";
import authAdminLogin from "./api/auth-admin-login.js";
import authSignSession from "./api/auth-sign-session.js";
import authRevokeSession from "./api/auth-revoke-session.js";
import authLogout from "./api/auth-logout.js";
import requestOtp from "./api/request-otp.js";
import verifyOtp from "./api/verify-otp.js";
import refreshWargaSession from "./api/refresh-warga-session.js";
import signSuratQr from "./api/sign-surat-qr.js";
import generatePdf from "./api/generate-pdf.js";
import renderPdf from "./api/render-pdf.js";
import generateNomorSurat from "./api/generate-nomor-surat.js";
import adminUsers from "./api/admin-users.js";
import pushSend from "./api/push-send.js";
import verifySurat from "./api/verify-surat.js";
import downloadPdf from "./api/download-pdf.js";
import listSigners from "./api/list-signers.js";
import listRejectionReasons from "./api/list-rejection-reasons.js";
import letterSystemData from "./api/letter-system-data.js";
import wilayahCrud from "./api/wilayah.js";
import submitSurat from "./api/submit-surat.js";
import sendWa from "./api/send-wa.js";
import suratEstimasi from "./api/surat-estimasi.js";
import templateVersion from "./api/template-version.js";
import keuanganCoa from "./api/keuangan/coa.js";
import keuanganEntries from "./api/keuangan/entries.js";
import keuanganRingkasan from "./api/keuangan/ringkasan.js";
import keuanganReport from "./api/keuangan/report.js";
import pengaduanAdmin from "./api/pengaduan/admin.js";
import pengaduanTrack from "./api/pengaduan/track.js";
import statistikApi from "./api/statistik/index.js";
import suratAgendaIndex from "./api/surat-agenda/index.js";
import suratAgendaId from "./api/surat-agenda/[id].js";
import inventarisIndex from "./api/inventaris/index.js";
import inventarisId from "./api/inventaris/[id].js";
import inventarisReport from "./api/inventaris/report.js";
import potensiApi from "./api/potensi/index.js";
import pembangunanIndex from "./api/pembangunan/index.js";
import pembangunanId from "./api/pembangunan/[id].js";
import pembangunanReport from "./api/pembangunan/report.js";
import bantuanIndex from "./api/bantuan/index.js";
import kelompokIndex from "./api/kelompok/index.js";
import {
  adminLoginRateLimiter,
  otpRateLimiter,
  refreshTokenRateLimiter,
  generalApiRateLimiter,
  signQrRateLimiter,
  downloadPdfRateLimiter,
  publicEndpointRateLimiter,
} from "./middleware/rate-limit.js";

// ── App Setup ─────────────────────────────────────────────────────────────────

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────

// CORS — explicit whitelist only
app.use(
  cors({
    origin: ALLOWED_ORIGIN || undefined,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey"],
  }),
);

// Parse JSON — limit body size to prevent abuse
app.use(express.json({ limit: "10mb" }));

// Security headers on ALL responses
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Request-ID", generateRequestId(req));
  // Content-Security-Policy — blocks inline script injection and external resource loading
  // Note: 'unsafe-inline' for style is required for Tailwind CSS v4 per-line extraction
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.fonnte.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.fonnte.com https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  next();
});

// Request logging (non-sensitive — no body content)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;
    if (res.statusCode >= 500) {
      console.error(log);
    } else if (res.statusCode >= 400) {
      console.warn(log);
    } else {
      console.info(log);
    }
  });
  next();
});

// ── Route Registration ─────────────────────────────────────────────────────────

// Health check (no auth)
app.use("/api/health-check", healthCheck);

// Admin auth (rate limited)
app.use("/api/auth/admin-login", adminLoginRateLimiter, authAdminLogin);
app.use("/api/auth/sign-session", authSignSession);
app.use("/api/auth/revoke-session", authRevokeSession);
app.use("/api/auth/logout", authLogout);

// Warga auth (rate limited)
app.use("/api/auth/request-otp", otpRateLimiter, requestOtp);
app.use("/api/auth/verify-otp", verifyOtp);
app.use("/api/auth/refresh", refreshTokenRateLimiter, refreshWargaSession);

// Protected surat endpoints (HMAC session required)
app.use("/api/sign-surat-qr", signQrRateLimiter, signSuratQr);
app.use("/api/generate-pdf", generalApiRateLimiter, generatePdf);
app.use("/api/render-pdf", generalApiRateLimiter, renderPdf);
app.use("/api/generate-nomor-surat", generateNomorSurat);

// Admin management
app.use("/api/admin-users", adminUsers);
app.use("/api/push/send", generalApiRateLimiter, pushSend);
app.use("/api/list-signers", generalApiRateLimiter, listSigners);
app.use("/api/list-rejection-reasons", generalApiRateLimiter, listRejectionReasons);
app.use("/api/letter-system-data", generalApiRateLimiter, letterSystemData);
app.use("/api/wilayah", generalApiRateLimiter, wilayahCrud);

// Public endpoints (rate limited)
app.use("/api/verify-surat", publicEndpointRateLimiter, verifySurat);
app.use("/api/download-pdf", downloadPdfRateLimiter, downloadPdf);
app.use("/api/surat/estimasi", publicEndpointRateLimiter, suratEstimasi);
app.use("/api/submit-surat", submitSurat);
app.use("/api/send-wa", sendWa);
app.use("/api/template-version", templateVersion);

// Keuangan APBDes (HMAC session required)
app.use("/api/keuangan/coa", generalApiRateLimiter, keuanganCoa);
app.use("/api/keuangan/entries", generalApiRateLimiter, keuanganEntries);
app.use("/api/keuangan/ringkasan", generalApiRateLimiter, keuanganRingkasan);
app.use("/api/keuangan/report", generalApiRateLimiter, keuanganReport);

// Pengaduan Admin (HMAC session required)
app.use("/api/pengaduan/admin", generalApiRateLimiter, pengaduanAdmin);

// Pengaduan Public Track (public, rate limited)
app.use("/api/pengaduan", publicEndpointRateLimiter, pengaduanTrack);

// Statistik Kependudukan (HMAC session required)
app.use("/api/statistik", generalApiRateLimiter, statistikApi);

// Buku Agenda Surat (HMAC session required)
app.use("/api/surat-agenda", generalApiRateLimiter, suratAgendaIndex);
app.use("/api/surat-agenda", generalApiRateLimiter, suratAgendaId);

// Inventaris Desa (HMAC session required for write, public for read)
app.use("/api/inventaris", generalApiRateLimiter, inventarisIndex);
app.use("/api/inventaris", generalApiRateLimiter, inventarisId);
app.use("/api/inventaris", generalApiRateLimiter, inventarisReport);

// Potensi Desa (public read)
app.use("/api/potensi", publicEndpointRateLimiter, potensiApi);

// Pembangunan (HMAC session required)
app.use("/api/pembangunan", generalApiRateLimiter, pembangunanIndex);
app.use("/api/pembangunan", generalApiRateLimiter, pembangunanId);
app.use("/api/pembangunan", generalApiRateLimiter, pembangunanReport);

// Bantuan Sosial (HMAC session required)
app.use("/api/bantuan", generalApiRateLimiter, bantuanIndex);

// Kelompok Masyarakat (HMAC session required)
app.use("/api/kelompok", generalApiRateLimiter, kelompokIndex);

// ── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`,
    code: 404,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────

// NOTE: Express catches synchronous errors automatically.
// Async errors must be forwarded with next(err).
app.use((err, req, res, _next) => {
  console.error("[server] Unhandled error:", err);

  // Never expose internal error details to clients
  if (NODE_ENV === "production") {
    res.status(500).json({
      ok: false,
      error: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
      code: 500,
    });
  } else {
    res.status(500).json({
      ok: false,
      error: "Internal server error",
      code: 500,
      details: err?.message ?? String(err),
    });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.info(`[server] Local API server running on http://localhost:${PORT}`);
  console.info(`[server] Environment: ${NODE_ENV}`);
  console.info(`[server] API endpoints:`);
  const endpoints = [
    ["GET", "/api/health-check"],
    ["POST", "/api/auth/admin-login"],
    ["POST", "/api/auth/sign-session"],
    ["POST", "/api/auth/revoke-session"],
    ["POST", "/api/auth/logout"],
    ["POST", "/api/auth/request-otp"],
    ["POST", "/api/auth/verify-otp"],
    ["POST", "/api/auth/refresh"],
    ["POST", "/api/sign-surat-qr"],
    ["POST", "/api/generate-pdf"],
    ["POST", "/api/render-pdf"],
    ["POST", "/api/generate-nomor-surat"],
    ["GET", "/api/admin-users"],
    ["POST", "/api/push/send"],
    ["GET", "/api/list-signers"],
    ["GET", "/api/list-rejection-reasons"],
    ["POST", "/api/verify-surat"],
    ["POST", "/api/download-pdf"],
    ["POST", "/api/submit-surat"],
    ["POST", "/api/send-wa"],
    ["POST", "/api/surat/estimasi"],
    ["POST", "/api/template-version"],
    ["GET", "/api/keuangan/coa"],
    ["POST", "/api/keuangan/coa"],
    ["GET", "/api/keuangan/entries"],
    ["POST", "/api/keuangan/entries"],
    ["GET", "/api/keuangan/ringkasan"],
    ["GET", "/api/keuangan/report/monthly"],
    ["POST", "/api/keuangan/report/generate"],
  ];
  for (const [method, path] of endpoints) {
    console.info(`  ${method.padEnd(6)} ${path}`);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

function generateRequestId(req) {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
