/**
 * Template Versioning Endpoints
 *
 * POST   /api/template-version               — Create new draft version
 * GET    /api/template-version/:code/history — Get version history
 * POST   /api/template-version/:id/approve   — Approve draft
 * POST   /api/template-version/:id/reject    — Reject draft
 *
 * Auth: Admin session (HMAC-signed + Super Admin role for approve/reject)
 * Response: { ok: true, data: {...} } or { ok: false, error: string, code: number }
 */

import crypto from "crypto";
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin, checkRole } from "../middleware/auth.js";
import { badRequest, notFound, serverError, ok } from "../lib/api-response.js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

function sanitizePagination(raw) {
  const val = parseInt(raw, 10);
  return Number.isNaN(val) || val < 1 ? null : val;
}

// ── Middleware: verify + role check (Super Admin only for mutations) ─────────

async function templateAuth(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  next();
}

async function superAdminOnly(req, res, next) {
  const err = await verifyAdmin(req, res);
  if (err) return;
  if (!checkRole(res, req.adminSession, ["Super Admin"])) return;
  next();
}

// ── POST /api/template-version — Create new draft ─────────────────────────────

router.post("/", templateAuth, async (req, res) => {
  const sb = await getSupabaseClient();
  if (!sb) return res.status(503).json({ ok: false, error: "Supabase not configured", code: 503 });

  const {
    template_id,
    name,
    dna_clauses,
    subject_fields,
    closing,
    category,
    description,
    syarat,
    fields,
  } = req.body ?? {};

  if (!template_id || typeof template_id !== "string") {
    return badRequest(res, "template_id wajib diisi.");
  }

  try {
    // Fetch existing template
    const { data: existing, error: fetchErr } = await sb
      .from("surat_template")
      .select("*")
      .eq("id", template_id)
      .single();

    if (fetchErr || !existing) {
      return notFound(res, "Template");
    }

    const now = new Date().toISOString();
    const newVersion = (existing.version ?? 1) + 1;

    const draft = {
      id: crypto.randomUUID(),
      code: existing.code,
      name: name ?? existing.name,
      category: category ?? existing.category,
      description: description ?? existing.description,
      syarat: syarat ?? existing.syarat ?? [],
      fields: fields ?? existing.fields ?? [],
      eta: existing.eta ?? "1 hari kerja",
      body: existing.body ?? "",
      dna_clauses: dna_clauses ?? existing.dna_clauses ?? [],
      subject_fields: subject_fields ?? existing.subject_fields ?? [],
      closing: closing ?? existing.closing ?? existing.body ?? "",
      subject_count: existing.subject_count ?? 1,
      status: "Draft",
      version: newVersion,
      parent_version_id: existing.id,
      approved_by: null,
      approved_at: null,
      catatan: null,
      verified_by: null,
      verified_at: null,
      sent_to: null,
      sent_at: null,
      created_at: now,
      updated_at: now,
    };

    const { error: insertErr } = await sb.from("surat_template").insert(draft);
    if (insertErr) {
      console.error("[template-version] Insert error:", insertErr);
      return serverError(res, "Gagal membuat versi baru.");
    }

    // Archive old template
    await sb.from("surat_template").update({ status: "Archived" }).eq("id", template_id);

    console.info(
      `[template-version] Draft created from ${template_id} (v${newVersion}) by ${req.adminSession?.username}`,
    );
    return ok(res, { template: draft });
  } catch (err) {
    console.error("[template-version] Unexpected error:", err);
    return serverError(res);
  }
});

// ── GET /api/template-version/:code/history ─────────────────────────────────

router.get("/:code/history", templateAuth, async (req, res) => {
  const sb = await getSupabaseClient();
  if (!sb) return res.status(503).json({ ok: false, error: "Supabase not configured", code: 503 });

  const { code } = req.params ?? {};
  if (!code) return badRequest(res, "Kode template wajib diisi.");

  // Pagination
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;
  let limit = sanitizePagination(req.query.limit) ?? DEFAULT_LIMIT;
  let offset = sanitizePagination(req.query.offset) ?? 0;
  limit = Math.min(limit, MAX_LIMIT);
  offset = Math.max(0, offset);

  try {
    const { count, error: countError } = await sb
      .from("surat_template")
      .select("*", { count: "exact", head: true })
      .eq("code", code);

    if (countError) console.error("[template-version/history] Count error:", countError.message);

    const { data, error } = await sb
      .from("surat_template")
      .select("*")
      .eq("code", code)
      .order("version", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const templates = data ?? [];
    const total = count ?? templates.length;

    return ok(res, {
      templates,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + templates.length < total,
      },
    });
  } catch (err) {
    console.error("[template-version/history] Unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/template-version/:id/approve ──────────────────────────────────

router.post("/:id/approve", superAdminOnly, async (req, res) => {
  const sb = await getSupabaseClient();
  if (!sb) return res.status(503).json({ ok: false, error: "Supabase not configured", code: 503 });

  const { id } = req.params ?? {};
  if (!id) return badRequest(res, "ID template wajib diisi.");

  try {
    const { data: template, error: fetchErr } = await sb
      .from("surat_template")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !template) return notFound(res, "Template");

    if (template.status !== "Draft") {
      return badRequest(res, "Template bukan status Draft.");
    }

    const now = new Date().toISOString();
    const updated = {
      ...template,
      status: "Disetujui",
      approved_by: String(req.adminSession?.username ?? "Super Admin"),
      approved_at: now,
      updated_at: now,
    };

    const { error: updateErr } = await sb.from("surat_template").update(updated).eq("id", id);

    if (updateErr) {
      console.error("[template-version/approve] Update error:", updateErr);
      return serverError(res, "Gagal menyetujui template.");
    }

    // Archive previous approved versions
    await sb
      .from("surat_template")
      .update({ status: "Archived" })
      .eq("code", template.code)
      .eq("status", "Disetujui")
      .neq("id", id);

    console.info(
      `[template-version] Approved: ${id} (${template.code}) by ${req.adminSession?.username}`,
    );
    return ok(res, { template: updated });
  } catch (err) {
    console.error("[template-version/approve] Unexpected error:", err);
    return serverError(res);
  }
});

// ── POST /api/template-version/:id/reject ───────────────────────────────────

router.post("/:id/reject", superAdminOnly, async (req, res) => {
  const sb = await getSupabaseClient();
  if (!sb) return res.status(503).json({ ok: false, error: "Supabase not configured", code: 503 });

  const { id } = req.params ?? {};
  const { catatan } = req.body ?? {};

  if (!id) return badRequest(res, "ID template wajib diisi.");

  try {
    const { data: template, error: fetchErr } = await sb
      .from("surat_template")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !template) return notFound(res, "Template");

    if (template.status !== "Draft") {
      return badRequest(res, "Template bukan status Draft.");
    }

    const { error: updateErr } = await sb
      .from("surat_template")
      .update({
        status: "Ditolak",
        catatan: catatan ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      console.error("[template-version/reject] Update error:", updateErr);
      return serverError(res, "Gagal menolak template.");
    }

    console.info(
      `[template-version] Rejected: ${id} (${template.code}) by ${req.adminSession?.username}`,
    );
    return ok(res, {});
  } catch (err) {
    console.error("[template-version/reject] Unexpected error:", err);
    return serverError(res);
  }
});

export default router;
