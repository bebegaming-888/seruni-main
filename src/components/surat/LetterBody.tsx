/**
 * LetterBody — Konten Inti / DNA Clauses
 *
 * Merender array paragraf DNA clauses yang sudah disubstitusi variabel.
 * Klause bertipe kisi (multi-baris dengan \n) dirender sebagai blok indent.
 */
import { memo } from "react";
import { getSettings } from "@/lib/settings-store";

export const LetterBody = memo(function LetterBody({ body }: { body: string[] }) {
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  return (
    <div
      style={{
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        lineHeight: 1.7,
        margin: "12px 0",
        textAlign: "justify",
      }}
    >
      {body.map((clause, i) => {
        // Klausa multi-baris (data fields) → render sebagai blok
        if (clause.includes("\n")) {
          return (
            <div
              key={i}
              style={{
                marginLeft: 40,
                marginBottom: 8,
                fontFamily: bodyFont,
                fontSize: bodyFontSize,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {clause}
            </div>
          );
        }
        // Klausa biasa → paragraf
        return (
          <p
            key={i}
            style={{ margin: "0 0 8px", textIndent: clause.startsWith("Dengan") ? 0 : 32 }}
          >
            {clause}
          </p>
        );
      })}
    </div>
  );
});
