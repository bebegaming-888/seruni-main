/**
 * LetterTitle — Nama Surat + Nomor Surat
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";

export function LetterTitle({ title }: { title: RenderedLetter["title"] }) {
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  return (
    <div
      style={{
        textAlign: "center",
        margin: "18px 0 16px",
        fontFamily: bodyFont,
      }}
    >
      <div
        style={{
          fontSize: (bodyFontSize as number) + 2,
          fontWeight: "bold",
          textDecoration: "underline",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title.namaSurat}
      </div>
      <div style={{ fontSize: bodyFontSize, marginTop: 4 }}>{title.nomorSurat}</div>
    </div>
  );
}
