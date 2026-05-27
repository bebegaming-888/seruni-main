/**
 * LetterRenderer — Layout-Based Blanko Surat (OpenSID Standard)
 *
 * REFACTORED (Mei 2026): Uses layout-based rendering from letter-renderer.ts.
 * Now reads from `letter_layouts` database table — no hardcoded layout.
 * Falls back to default RenderedLetter for backward compat.
 */
import { useMemo, memo } from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";
import { sanitizeHtml } from "@/lib/utils";
import { renderLetterFromLayout } from "@/lib/letter-renderer";
import { type LetterLayout, type RenderContext } from "@/types/letter-layout";
import { LetterHeader } from "./LetterHeader";
import { LetterTitle } from "./LetterTitle";
import { LetterSigner } from "./LetterSigner";
import { LetterSubject } from "./LetterSubject";
import { LetterBody } from "./LetterBody";
import { LetterSignature } from "./LetterSignature";

const BRAND_WHITE = "#ffffff";
const BRAND_BORDER = "#D5D5D5";
const BRAND_TEXT = "#1a1918";

type Props = {
  /** Legacy RenderedLetter object (backward compat) */
  letter?: RenderedLetter;
  /** Layout-driven rendering (new path — from DB) */
  layout?: LetterLayout;
  /** RenderContext for layout-based rendering */
  context?: RenderContext;
  namaPemohon?: string;
  primaryColor?: string;
  isPrintMode?: boolean;
  className?: string;
};

export const LetterRenderer = memo(function LetterRenderer({
  letter,
  layout,
  context,
  namaPemohon,
  primaryColor: propColor,
  isPrintMode = false,
  className = "",
}: Props) {
  const settings = getSettings();
  const primaryColor = propColor ?? settings.branding.primary_color ?? "#1a5276";
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  const sections = useMemo(
    () => (layout && context ? renderLetterFromLayout(layout, context) : null),
    [layout, context],
  );

  // ── NEW PATH: Layout-based rendering ──────────────────────────────────────
  if (sections) {
    return (
      <div
        id="letter-renderer"
        className={`letter-renderer ${className}`}
        style={{
          width: isPrintMode ? "100%" : 794,
          minHeight: isPrintMode ? "auto" : 1122,
          padding: "40px 56px 48px",
          background: BRAND_WHITE,
          color: BRAND_TEXT,
          fontFamily: layout?.style?.font_family || bodyFont,
          fontSize: layout?.style?.font_size_body || bodyFontSize,
          lineHeight: layout?.style?.line_height || 1.65,
          boxSizing: "border-box",
          ...(isPrintMode
            ? {}
            : {
                boxShadow: "0 4px 32px rgba(0,0,0,0.14)",
                border: `1px solid ${BRAND_BORDER}`,
              }),
        }}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            className={`letter-section-${section.type}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.html) }}
          />
        ))}
      </div>
    );
  }

  // ── LEGACY PATH: RenderedLetter (backward compat) ────────────────────────
  if (!letter) {
    return (
      <div
        className="letter-renderer-empty"
        style={{ padding: 40, textAlign: "center", color: "#888" }}
      >
        No letter data provided
      </div>
    );
  }

  return (
    <div
      id="letter-renderer"
      className={`letter-renderer ${className}`}
      style={{
        width: isPrintMode ? "100%" : 794,
        minHeight: isPrintMode ? "auto" : 1122,
        padding: "40px 56px 48px",
        background: BRAND_WHITE,
        color: BRAND_TEXT,
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        lineHeight: 1.65,
        boxSizing: "border-box",
        ...(isPrintMode
          ? {}
          : {
              boxShadow: "0 4px 32px rgba(0,0,0,0.14)",
              border: `1px solid ${BRAND_BORDER}`,
            }),
      }}
    >
      {/* ── 1. KOP SURAT ───────────────────────────── */}
      <LetterHeader header={letter.header} primaryColor={primaryColor} />

      {/* ── 2-3. JUDUL + NOMOR ─────────────────────── */}
      <LetterTitle title={letter.title} />

      {/* ── 4-5. PEMBUKA + PEJABAT ─────────────────── */}
      <LetterSigner signer={letter.signer} />

      {/* ── Separator tipis ────────────────────────── */}
      <div className="mx-0 my-2" style={{ borderBottom: `0.75px solid ${BRAND_BORDER}` }} />

      {/* ── 6. "Menerangkan bahwa :" ────────────────── */}
      <p
        className="font-normal"
        style={{ fontFamily: bodyFont, fontSize: bodyFontSize, margin: "4px 0 2px" }}
      >
        Menerangkan bahwa :
      </p>

      {/* ── 7. IDENTITAS PEMOHON ────────────────────── */}
      <LetterSubject subject={letter.subject} />

      {/* ── Separator ──────────────────────────────── */}
      <div className="mx-0 my-2.5" style={{ borderBottom: `0.75px solid ${BRAND_BORDER}` }} />

      {/* ── 8. ISI SURAT (DNA CLAUSES) ─────────────── */}
      <LetterBody body={letter.body} />

      {/* ── 9. PENUTUP ─────────────────────────────── */}
      <p
        className="text-justify"
        style={{
          fontFamily: bodyFont,
          fontSize: bodyFontSize,
          margin: "12px 0 0",
          lineHeight: 1.7,
        }}
      >
        {letter.closing}
      </p>

      {/* ── 10. BLOK TANDA TANGAN + QR ─────────────── */}
      <LetterSignature signature={letter.signature} namaPemohon={namaPemohon} />
    </div>
  );
});
