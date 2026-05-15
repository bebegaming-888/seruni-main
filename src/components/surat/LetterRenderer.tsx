/**
 * LetterRenderer — Orkestrator 7 Komponen Surat
 *
 * Menerima `RenderedLetter` dari letter-engine dan merender semua komponen
 * dalam urutan yang benar sesuai standar surat resmi desa Indonesia.
 *
 * Props:
 * - letter: output dari buildRenderedLetter()
 * - namaPemohon: untuk kolom TTD pemohon
 * - primaryColor: warna utama kop dan rule (dari settings)
 * - isPrintMode: jika true → hide border/shadow, optimal untuk @media print
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { LetterHeader } from "./LetterHeader";
import { LetterTitle } from "./LetterTitle";
import { LetterSigner } from "./LetterSigner";
import { LetterSubject } from "./LetterSubject";
import { LetterBody } from "./LetterBody";
import { LetterSignature } from "./LetterSignature";

type Props = {
  letter: RenderedLetter;
  namaPemohon?: string;
  primaryColor?: string;
  isPrintMode?: boolean;
  className?: string;
};

export function LetterRenderer({
  letter,
  namaPemohon,
  primaryColor = "#0f7a4a",
  isPrintMode = false,
  className = "",
}: Props) {
  return (
    <div
      id="letter-renderer"
      className={`letter-renderer ${className}`}
      style={{
        // A4 dimensions in screen mode
        width: isPrintMode ? "100%" : 794,
        minHeight: isPrintMode ? "auto" : 1122,
        padding: "56px 64px",
        background: "#fff",
        color: "#111",
        fontFamily: "Times New Roman, serif",
        fontSize: 11,
        lineHeight: 1.6,
        boxSizing: "border-box",
        // Screen-only decoration
        ...(isPrintMode
          ? {}
          : {
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              border: "1px solid #e0e0e0",
            }),
      }}
    >
      {/* 1. KOP SURAT */}
      <LetterHeader header={letter.header} primaryColor={primaryColor} />

      {/* 2. JUDUL & NOMOR SURAT */}
      <LetterTitle title={letter.title} />

      {/* 3. PENANDATANGAN — "Yang bertanda tangan di bawah ini..." */}
      <LetterSigner signer={letter.signer} />

      {/* Garis separator tipis sebelum identitas */}
      <div style={{ borderBottom: "0.5px solid #bbb", margin: "6px 0" }} />

      {/* Pembuka menerangkan (biasanya sebelum identitas) */}
      <p
        style={{
          fontFamily: "Times New Roman, serif",
          fontSize: 11,
          margin: "6px 0 2px",
        }}
      >
        Menerangkan bahwa :
      </p>

      {/* 4. IDENTITAS PEMOHON */}
      <LetterSubject subject={letter.subject} />

      {/* Garis separator */}
      <div style={{ borderBottom: "0.5px solid #bbb", margin: "6px 0 10px" }} />

      {/* 5. DNA CLAUSES — Isi surat */}
      <LetterBody body={letter.body} />

      {/* 6. PENUTUP */}
      <p
        style={{
          fontFamily: "Times New Roman, serif",
          fontSize: 11,
          margin: "10px 0",
          textAlign: "justify",
        }}
      >
        {letter.closing}
      </p>

      {/* 7. TANDA TANGAN + QR */}
      <LetterSignature signature={letter.signature} namaPemohon={namaPemohon} />
    </div>
  );
}
