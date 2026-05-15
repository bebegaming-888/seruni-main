/**
 * LetterSigner — Identitas Pejabat Penandatangan
 *
 * "Yang bertanda tangan di bawah ini, ..."
 * diikuti tabel identitas pejabat.
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";

type Props = {
  signer: RenderedLetter["signer"];
};

export function LetterSigner({ signer }: Props) {
  return (
    <div style={{ fontFamily: "Times New Roman, serif", fontSize: 11, margin: "8px 0" }}>
      <p style={{ margin: "0 0 4px" }}>{signer.pembuka}</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {signer.rows.map((row, i) => (
            <tr key={i}>
              <td style={{ width: 160, verticalAlign: "top", paddingBottom: 2 }}>{row.label}</td>
              <td style={{ width: 12, verticalAlign: "top" }}>:</td>
              <td style={{ verticalAlign: "top", paddingBottom: 2 }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
