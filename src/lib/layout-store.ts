/**
 * Letter Layout Store — CRUD operations for configurable blanko surat.
 * Client-side version — uses getSupabase() (RLS-aware).
 * For admin write operations, use the Express API endpoints instead.
 */

import { getSupabase } from "@/lib/supabase";
import type {
  LetterLayout,
  LetterSigner,
  RejectionReason,
  LetterLayoutHistory,
} from "@/types/letter-layout";

// ─── Layout CRUD ────────────────────────────────────────────────────────────────

/**
 * Get the active layout for a specific surat type code.
 * Returns null if no active layout exists.
 */
export async function getLayoutBySuratType(suratTypeCode: string): Promise<LetterLayout | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("letter_layouts")
    .select("*")
    .eq("surat_type_code", suratTypeCode)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("[layout-store] getLayoutBySuratType error:", error);
    return null;
  }

  return data as LetterLayout;
}

/**
 * Get all layouts (all statuses) for a surat type.
 */
export async function getAllLayoutsForType(suratTypeCode: string): Promise<LetterLayout[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("letter_layouts")
    .select("*")
    .eq("surat_type_code", suratTypeCode)
    .order("version", { ascending: false });

  if (error) {
    console.error("[layout-store] getAllLayoutsForType error:", error);
    return [];
  }

  return (data as LetterLayout[]) ?? [];
}

/**
 * Get a layout by its UUID id.
 */
export async function getLayoutById(id: string): Promise<LetterLayout | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.from("letter_layouts").select("*").eq("id", id).single();

  if (error) {
    console.error("[layout-store] getLayoutById error:", error);
    return null;
  }

  return data as LetterLayout;
}

/**
 * Create a new layout (draft or active).
 * NOTE: Requires admin auth — call via API endpoint /api/admin/layouts
 */
export async function createLayout(
  layout: Omit<LetterLayout, "id" | "created_at" | "updated_at" | "version">,
): Promise<LetterLayout | null> {
  // Use API endpoint for write operations (requires admin auth)
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch("/api/admin/layouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(layout),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.layout ?? null;
}

/**
 * Update an existing layout. Also saves current version to history.
 * NOTE: Requires admin auth — call via API endpoint /api/admin/layouts
 */
export async function updateLayout(
  id: string,
  updates: Partial<Pick<LetterLayout, "sections" | "style" | "name" | "description" | "status">>,
  changeNote?: string,
): Promise<LetterLayout | null> {
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch(`/api/admin/layouts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...updates, changeNote }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.layout ?? null;
}

/**
 * Activate a layout — archives other layouts for the same surat type,
 * then sets this one to 'active'.
 * NOTE: Requires admin auth — call via API endpoint /api/admin/layouts/activate
 */
export async function activateLayout(id: string): Promise<boolean> {
  const token = localStorage.getItem("admin_session");
  if (!token) return false;

  const res = await fetch(`/api/admin/layouts/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

/**
 * Delete a layout (soft-delete by setting status to 'archived').
 */
export async function deleteLayout(id: string): Promise<boolean> {
  const token = localStorage.getItem("admin_session");
  if (!token) return false;

  const res = await fetch(`/api/admin/layouts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

/**
 * Get layout version history.
 */
export async function getLayoutHistory(layoutId: string): Promise<LetterLayoutHistory[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("letter_layout_history")
    .select("*")
    .eq("layout_id", layoutId)
    .order("version", { ascending: false });

  if (error) {
    console.error("[layout-store] getLayoutHistory error:", error);
    return [];
  }

  return (data as LetterLayoutHistory[]) ?? [];
}

/**
 * Duplicate an existing layout with a new name.
 */
export async function duplicateLayout(id: string, newName: string): Promise<LetterLayout | null> {
  const original = await getLayoutById(id);
  if (!original) return null;

  return createLayout({
    surat_type_code: original.surat_type_code,
    name: newName,
    description: `Duplicate of "${original.name}"`,
    sections: original.sections,
    style: original.style,
    status: "draft",
    is_default: false,
  });
}

// ─── Signer CRUD ────────────────────────────────────────────────────────────────

/**
 * Get all active signers ordered by position.
 */
export async function getAllSigners(): Promise<LetterSigner[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("letter_signers")
    .select("*")
    .eq("is_active", true)
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[layout-store] getAllSigners error:", error);
    return [];
  }

  return (data as LetterSigner[]) ?? [];
}

/**
 * Get all signers (including inactive) — for admin management.
 */
export async function getAllSignersAdmin(): Promise<LetterSigner[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("letter_signers")
    .select("*")
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[layout-store] getAllSignersAdmin error:", error);
    return [];
  }

  return (data as LetterSigner[]) ?? [];
}

/**
 * Create a new signer.
 */
export async function createSigner(
  signer: Omit<LetterSigner, "id" | "created_at" | "updated_at">,
): Promise<LetterSigner | null> {
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch("/api/admin/signers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(signer),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.signer ?? null;
}

/**
 * Update a signer.
 */
export async function updateSigner(
  id: string,
  updates: Partial<
    Pick<LetterSigner, "role" | "title" | "name" | "nip" | "position_order" | "is_active">
  >,
): Promise<LetterSigner | null> {
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch(`/api/admin/signers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.signer ?? null;
}

/**
 * Soft-delete a signer (mark as inactive).
 */
export async function deleteSigner(id: string): Promise<boolean> {
  return (await updateSigner(id, { is_active: false })) !== null;
}

// ─── Rejection Reason CRUD ────────────────────────────────────────────────────

/**
 * Get all active rejection reasons ordered by position.
 */
export async function getAllRejectionReasons(): Promise<RejectionReason[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("rejection_reasons")
    .select("*")
    .eq("is_active", true)
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[layout-store] getAllRejectionReasons error:", error);
    return [];
  }

  return (data as RejectionReason[]) ?? [];
}

/**
 * Get all rejection reasons (including inactive) — for admin management.
 */
export async function getAllRejectionReasonsAdmin(): Promise<RejectionReason[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("rejection_reasons")
    .select("*")
    .order("position_order", { ascending: true });

  if (error) {
    console.error("[layout-store] getAllRejectionReasonsAdmin error:", error);
    return [];
  }

  return (data as RejectionReason[]) ?? [];
}

/**
 * Create a new rejection reason.
 */
export async function createRejectionReason(
  reason: Omit<RejectionReason, "id" | "created_at" | "updated_at">,
): Promise<RejectionReason | null> {
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch("/api/admin/rejection-reasons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reason),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.reason ?? null;
}

/**
 * Update a rejection reason.
 */
export async function updateRejectionReason(
  id: string,
  updates: Partial<
    Pick<RejectionReason, "code" | "reason" | "category" | "is_active" | "position_order">
  >,
): Promise<RejectionReason | null> {
  const token = localStorage.getItem("admin_session");
  if (!token) return null;

  const res = await fetch(`/api/admin/rejection-reasons/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.reason ?? null;
}

/**
 * Soft-delete a rejection reason.
 */
export async function deleteRejectionReason(id: string): Promise<boolean> {
  return (await updateRejectionReason(id, { is_active: false })) !== null;
}

// ─── Server-side Helper: Get Layout with All Relations ───────────────────────

/**
 * Full context for rendering: layout + signers + rejection reasons.
 * Used by API endpoints like /api/render-pdf.
 */
export async function getRenderContext(suratTypeCode: string): Promise<{
  layout: LetterLayout | null;
  signers: LetterSigner[];
  rejectionReasons: RejectionReason[];
}> {
  const [layout, signers, rejectionReasons] = await Promise.all([
    getLayoutBySuratType(suratTypeCode),
    getAllSigners(),
    getAllRejectionReasons(),
  ]);

  return { layout, signers, rejectionReasons };
}
