/**
 * LetterBody — Konten Inti / DNA Clauses
 *
 * Merender array paragraf DNA clauses yang sudah disubstitusi variabel.
 * Klause bertipe kisi (multi-baris dengan \n) dirender sebagai blok indent.
 */
import React from "react";

type Props = {
  body: string[];
};

export function LetterBody({ body }: Props) {
  return (
    <div
      style={{
        fontFamily: "Times New Roman, serif",
        fontSize: 11,
        lineHeight: 1.8,
        margin: "10px 0",
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
                marginLeft: 24,
                marginBottom: 6,
                fontFamily: "monospace",
                fontSize: 10,
                whiteSpace: "pre-wrap",
              }}
            >
              {clause}
            </div>
          );
        }
        // Klausa biasa → paragraf
        return (
          <p key={i} style={{ margin: "0 0 6px", textIndent: clause.startsWith("Dengan") ? 0 : 0 }}>
            {clause}
          </p>
        );
      })}
    </div>
  );
}
