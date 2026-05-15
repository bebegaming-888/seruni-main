import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Format tanggal ke dd/mm/yyyy (Indonesia). */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format tanggal ke dd month yyyy (Indonesia full). */
export function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = BULAN_ID[d.getMonth() + 1];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

/**
 * Strip dangerous HTML tags and attributes to prevent XSS.
 * Safe for admin-authored CMS content — blocks script injection and event handlers.
 * Uses DOMParser (browser-only).
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Remove script elements
  doc.querySelectorAll("script").forEach((el) => el.remove());
  // Remove event handler attributes (onclick, onerror, onload, etc.)
  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    });
  });
  // Remove javascript: URLs from href/src
  doc.querySelectorAll("[href]").forEach((el) => {
    const href = el.getAttribute("href");
    if (href && href.trim().toLowerCase().startsWith("javascript:")) {
      el.removeAttribute("href");
    }
  });
  doc.querySelectorAll("[src]").forEach((el) => {
    const src = el.getAttribute("src");
    if (src && src.trim().toLowerCase().startsWith("javascript:")) {
      el.removeAttribute("src");
    }
  });
  return doc.body.innerHTML;
}

const BULAN_ID: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};
