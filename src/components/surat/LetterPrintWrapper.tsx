/**
 * LetterPrintWrapper — Container Cetak A4
 *
 * Membungkus LetterRenderer dengan:
 * - Tombol "Cetak" dan "Download PDF" di screen mode
 * - @media print CSS untuk output printer A4 yang presisi
 * - Fungsi printElement() menggunakan window.print()
 *
 * Brand palette: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
 */
import React, { useRef, useCallback } from "react";
import { LetterRenderer } from "./LetterRenderer";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";

const BRAND_PRIMARY = "#E37222";
const BRAND_SECONDARY = "#078898";
const BRAND_WHITE = "#ffffff";
const BRAND_LIGHT = "#f4f4f4";
const BRAND_BORDER = "#D5D5D5";
const BRAND_MUTED = "#5c5a56";
const BRAND_TEXT = "#1a1918";

type Props = {
  letter: RenderedLetter;
  namaPemohon?: string;
  primaryColor?: string;
  nomorSurat?: string;
  /** Callback ketika user klik Download PDF */
  onDownloadPdf?: () => void;
  /** Sedang dalam proses generate PDF */
  isGeneratingPdf?: boolean;
};

export function LetterPrintWrapper({
  letter,
  namaPemohon,
  primaryColor: propColor,
  nomorSurat,
  onDownloadPdf,
  isGeneratingPdf,
}: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const s = getSettings();
  const primaryColor = propColor ?? s.branding.primary_color;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const pdfMargin = s.pdfLayout?.margin || {
    top: "20mm",
    bottom: "20mm",
    left: "25mm",
    right: "20mm",
  };
  const pdfFontFamily = s.pdfLayout?.body_font || "Arial, sans-serif";
  const pdfFontSize = `${s.pdfLayout?.body_font_size || 11}pt`;
  const pdfLineHeight = s.pdfLayout?.font?.lineHeight || "1.5";

  return (
    <>
      {/* Print CSS — diinjeksikan ke head saat komponen ini aktif */}
      <style>{`
        @media print {
          @page {
            margin: ${pdfMargin.top} ${pdfMargin.right} ${pdfMargin.bottom} ${pdfMargin.left};
          }
          body * {
            visibility: hidden;
          }
          #print-overlay, #print-overlay * {
            visibility: visible;
          }
          #print-overlay {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
            font-family: ${pdfFontFamily} !important;
            font-size: ${pdfFontSize} !important;
            line-height: ${pdfLineHeight} !important;
          }
          #letter-renderer {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 0 !important; /* padding is handled by @page margin */
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid;
          }
          .signature-qr {
            width: ${pdfMargin ? s.pdfLayout?.signaturePos.qrWidth || "80px" : "80px"} !important;
            height: ${pdfMargin ? s.pdfLayout?.signaturePos.qrWidth || "80px" : "80px"} !important;
            margin-top: ${pdfMargin ? s.pdfLayout?.signaturePos.marginY || "1rem" : "1rem"} !important;
            margin-bottom: ${pdfMargin ? s.pdfLayout?.signaturePos.marginY || "1rem" : "1rem"} !important;
          }
          .letter-print-controls {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen: toolbar aksi */}
      <div
        className="letter-print-controls"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {nomorSurat && (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: BRAND_MUTED,
              marginRight: "auto",
              padding: "4px 10px",
              background: BRAND_LIGHT,
              borderRadius: 4,
            }}
          >
            {nomorSurat}
          </span>
        )}
        <button
          onClick={handlePrint}
          style={{
            padding: "8px 20px",
            background: primaryColor,
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🖨️ Cetak Surat
        </button>
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            style={{
              padding: "8px 20px",
              background: isGeneratingPdf ? BRAND_BORDER : BRAND_SECONDARY,
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isGeneratingPdf ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isGeneratingPdf ? "⏳ Membuat PDF..." : "⬇️ Download PDF"}
          </button>
        )}
      </div>

      {/* Print area */}
      <div ref={printAreaRef} id="print-overlay" style={{ display: "contents" }}>
        <LetterRenderer letter={letter} namaPemohon={namaPemohon} primaryColor={primaryColor} />
      </div>
    </>
  );
}
