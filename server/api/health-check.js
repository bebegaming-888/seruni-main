/**
 * GET /api/health-check
 *
 * Health check endpoint for monitoring services and load balancers.
 *
 * Auth: None
 * Response: { ok: true, data: { timestamp, status, version } }
 */

import express from "express";
import { ok } from "../lib/api-response.js";

const router = express.Router();

router.get("/", (req, res) => {
  return ok(res, {
    timestamp: new Date().toISOString(),
    status: "ok",
    version: process.env.VITE_BUILD_HASH || "dev",
    uptime: process.uptime(),
  });
});

export default router;
