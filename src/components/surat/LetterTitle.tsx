/**
 * LetterTitle — Nama Surat + Nomor Surat
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";

type Props = {
  title: RenderedLetter["title"];
};

export function LetterTitle({ title }: Props) {
  return (
    <div
      style={{
        textAlign: "center",
        margin: "18px 0 10px",
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: "bold",
          textDecoration: "underline",
          letterSpacing: 1,
        }}
      >
        {title.namaSurat}
      </div>
      <div style={{ fontSize: 11, marginTop: 4 }}>{title.nomorSurat}</div>
    </div>
  );
}
