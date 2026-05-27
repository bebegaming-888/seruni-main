/**
 * LetterSigner — Identitas Pejabat Penandatangan
 *
 * "Yang bertanda tangan di bawah ini, ..."
 * diikuti tabel identitas pejabat.
 */
import { memo } from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";

export const LetterSigner = memo(function LetterSigner({
  signer,
}: {
  signer: RenderedLetter["signer"];
}) {
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  return (
    <div style={{ fontFamily: bodyFont, fontSize: bodyFontSize, margin: "12px 0 8px" }}>
      <p style={{ margin: "0 0 6px" }}>{signer.pembuka}</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {signer.rows.map((row, i) => (
            <tr key={i}>
              <td style={{ width: 180, verticalAlign: "top", paddingBottom: 4, paddingLeft: 32 }}>
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
});
