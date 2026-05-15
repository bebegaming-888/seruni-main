/**
 * LetterSubject — Identitas Pemohon / Yang Diterangkan
 *
 * Menampilkan tabel field identitas dinamis berdasarkan subject_fields dari template.
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";

type Props = {
  subject: RenderedLetter["subject"];
};

export function LetterSubject({ subject }: Props) {
  if (subject.length === 0) return null;

  return (
    <div style={{ fontFamily: "Times New Roman, serif", fontSize: 11, margin: "6px 0 8px 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {subject.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  width: 180,
                  verticalAlign: "top",
                  paddingBottom: 2,
                  paddingLeft: 24,
                }}
              >
                {row.label}
              </td>
              <td style={{ width: 12, verticalAlign: "top" }}>:</td>
              <td
                style={{
                  verticalAlign: "top",
                  paddingBottom: 2,
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
