// Role-based permissions untuk alur status surat & template.
import { getSession, type AdminRole } from "@/lib/auth";
import type { SuratStatus } from "@/lib/esurat-store";
import type { TemplateStatus } from "@/lib/template-store";

export type ActionKey =
  | "template.view"
  | "template.create"
  | "template.edit"
  | "template.delete"
  | "template.submitVerify"
  | "template.verify"
  | "template.approve"
  | "template.reject"
  | "template.send"
  | "surat.verify"
  | "surat.toApproval"
  | "surat.approve"
  | "surat.reject"
  | "surat.send"
  | "surat.archive"
  | "settings.manage";

const MATRIX: Record<AdminRole, Set<ActionKey>> = {
  "Super Admin": new Set<ActionKey>([
    "template.view",
    "template.create",
    "template.edit",
    "template.delete",
    "template.submitVerify",
    "template.verify",
    "template.approve",
    "template.reject",
    "template.send",
    "surat.verify",
    "surat.toApproval",
    "surat.approve",
    "surat.reject",
    "surat.send",
    "surat.archive",
    "settings.manage",
  ]),
  Operator: new Set<ActionKey>([
    "template.view",
    "template.create",
    "template.edit",
    "template.delete",
    "template.submitVerify",
    "template.send",
    "surat.send",
  ]),
  Verifikator: new Set<ActionKey>([
    "template.view",
    "template.verify",
    "template.reject",
    "surat.verify",
    "surat.toApproval",
    "surat.reject",
  ]),
  "Kepala Desa": new Set<ActionKey>([
    "template.view",
    "template.approve",
    "template.reject",
    "surat.approve",
    "surat.reject",
  ]),
  "Sekretaris Desa": new Set<ActionKey>([
    "template.view",
    "template.approve",
    "template.reject",
    "surat.approve",
    "surat.reject",
  ]),
};

export function currentRole(): AdminRole | null {
  return getSession()?.role ?? null;
}

export function can(action: ActionKey): boolean {
  const role = currentRole();
  if (!role) return false;
  return MATRIX[role].has(action);
}

/** Tombol aksi yang layak ditampilkan untuk record surat berdasarkan status & role. */
export function suratActionsFor(status: SuratStatus): ActionKey[] {
  const out: ActionKey[] = [];
  if (status === "Menunggu Verifikasi") {
    if (can("surat.verify")) out.push("surat.verify");
    if (can("surat.reject")) out.push("surat.reject");
  } else if (status === "Diverifikasi") {
    if (can("surat.toApproval")) out.push("surat.toApproval");
    if (can("surat.reject")) out.push("surat.reject");
  } else if (status === "Menunggu Approval") {
    if (can("surat.approve")) out.push("surat.approve");
    if (can("surat.reject")) out.push("surat.reject");
  } else if (status === "Disetujui") {
    if (can("surat.send")) out.push("surat.send");
  }
  return out;
}

export function templateActionsFor(status: TemplateStatus): ActionKey[] {
  const out: ActionKey[] = [];
  if (status === "Draft" && can("template.submitVerify")) out.push("template.submitVerify");
  if (status === "Menunggu Verifikasi") {
    if (can("template.verify")) out.push("template.verify");
    if (can("template.reject")) out.push("template.reject");
  }
  if (status === "Diverifikasi") {
    if (can("template.approve")) out.push("template.approve");
    if (can("template.reject")) out.push("template.reject");
  }
  if (status === "Disetujui" && can("template.send")) out.push("template.send");
  return out;
}
