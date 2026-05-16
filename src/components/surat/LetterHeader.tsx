/**
 * LetterHeader — Komponen Kop Surat
 *
 * Layout: Logo Kab (kiri) | Hierarki Teks (tengah) | Logo Desa (kanan)
 * Diikuti alamat, kontak, dan double rule.
 */
import React from "react";
import type { RenderedLetter } from "@/lib/letter-engine";

// ── Brand palette defaults for letter components ────────────────────────────────
// Primary = E37222 (orange), Secondary = 078898 (teal)
const BRAND_PRIMARY = "#E37222";
const BRAND_SECONDARY = "#078898";
const BRAND_BORDER = "#D5D5D5";
const BRAND_TEXT = "#1a1918";
const BRAND_MUTED = "#5c5a56";

type Props = {
  header: RenderedLetter["header"];
  primaryColor?: string;
};

export function LetterHeader({ header, primaryColor = BRAND_PRIMARY }: Props) {
  return (
    <div className="letter-header">
      {/* Double top rule */}
      <div
        className="letter-top-rules"
        style={{
          borderTop: `3px solid ${primaryColor}`,
          borderBottom: `1px solid ${primaryColor}`,
          paddingTop: 2,
          marginBottom: 6,
        }}
      />

      {/* Row: Logo Kab | Teks | Logo Desa */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 0",
        }}
      >
        {/* Logo Kabupaten */}
        <div style={{ width: 72, flexShrink: 0, textAlign: "center" }}>
          {header.logoKabupatenUrl ? (
            <img
              src={header.logoKabupatenUrl}
              alt="Logo Kabupaten"
              style={{ width: 68, height: 68, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 68,
                height: 68,
                border: `1px dashed ${BRAND_BORDER}`,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: BRAND_MUTED,
              }}
            >
              Logo Kab
            </div>
          )}
        </div>

        {/* Hierarki Teks */}
        <div style={{ flex: 1, textAlign: "center", fontFamily: "Times New Roman, serif" }}>
          <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 }}>
            {header.namaKabupaten}
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold" }}>{header.namaKecamatan}</div>
          <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 1 }}>
            {header.namaDesa}
          </div>
          <div style={{ fontSize: 9, marginTop: 3, color: BRAND_TEXT }}>{header.alamat}</div>
          <div style={{ fontSize: 9, color: BRAND_MUTED }}>{header.kontak}</div>
        </div>

        {/* Logo Desa */}
        <div style={{ width: 72, flexShrink: 0, textAlign: "center" }}>
          {header.logoDesaUrl ? (
            <img
              src={header.logoDesaUrl}
              alt="Logo Desa"
              style={{ width: 68, height: 68, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 68,
                height: 68,
                border: `1px dashed ${BRAND_BORDER}`,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: BRAND_MUTED,
              }}
            >
              Logo Desa
            </div>
          )}
        </div>
      </div>

      {/* Bottom double rule */}
      <div
        style={{
          borderTop: `3px solid ${primaryColor}`,
          borderBottom: `1px solid ${primaryColor}`,
          paddingTop: 2,
          marginTop: 4,
        }}
      />
    </div>
  );
}
