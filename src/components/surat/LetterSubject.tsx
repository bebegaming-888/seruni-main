/**
 * LetterSubject — Identitas Pemohon / Yang Diterangkan
 *
 * Menampilkan tabel field identitas dinamis berdasarkan subject_fields dari template.
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";

export function LetterSubject({ subject }: { subject: RenderedLetter["subject"] }) {
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  if (subject.length === 0) return null;

  return (
    <div style={{ fontFamily: bodyFont, fontSize: bodyFontSize, margin: "6px 0 12px 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {subject.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  width: 180,
                  verticalAlign: "top",
                  paddingBottom: 4,
                  paddingLeft: 32,
                }}
              >
                {row.label}
              </td>
              <td style={{ width: 16, verticalAlign: "top" }}>:</td>
              <td
                style={{
                  verticalAlign: "top",
                  paddingBottom: 4,
                  fontWeight: row.label === "Nama" ? "bold" : "normal",
                }}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
