/**
 * LetterSignature — Blok Tanda Tangan
 *
 * Layout 2 kolom:
 * - Kiri: "Yang Bersangkutan," / kosong
 * - Kanan: Lokasi, Tanggal, Jabatan, ruang TTD, Nama Pejabat, QR Code
 */
import React, { useEffect, useState } from "react";
import type { RenderedLetter } from "@/lib/letter-engine";

// ── Brand palette (STRICT: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5) ──
const BRAND_PRIMARY = "#E37222";
const BRAND_SECONDARY = "#078898";
const BRAND_BORDER = "#D5D5D5";
const BRAND_TEXT = "#1a1918";
const BRAND_MUTED = "#5c5a56";

type Props = {
  signature: RenderedLetter["signature"];
  namaPemohon?: string;
};

export function LetterSignature({ signature, namaPemohon }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!signature.qrPayload) return;
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(signature.qrPayload!, { width: 90, margin: 1 }))
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        /* non-blocking */
      });
    return () => {
      cancelled = true;
    };
  }, [signature.qrPayload]);

  return (
    <div
      style={{
        fontFamily: "Times New Roman, serif",
        fontSize: 11,
        marginTop: 20,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* Kolom kiri — pemohon */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <p style={{ margin: 0 }}>Yang Bersangkutan,</p>
        <div style={{ height: 70 }} />
        {namaPemohon && <p style={{ margin: 0, fontWeight: "bold" }}>{namaPemohon}</p>}
      </div>

      {/* Kolom kanan — pejabat */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <p style={{ margin: 0 }}>
          {signature.lokasi}, {signature.tanggal}
        </p>
        <p style={{ margin: "2px 0" }}>{signature.jabatan},</p>
        <div style={{ height: 70, position: "relative" }}>
          {/* Ruang TTD — bisa diisi gambar tandatangan */}
        </div>
        <p style={{ margin: 0, fontWeight: "bold", textDecoration: "underline" }}>
          {signature.namaPejabat}
        </p>
        <p style={{ margin: 0, fontSize: 10 }}>{signature.jabatan}</p>

        {/* QR Code */}
        {qrDataUrl && (
          <div style={{ marginTop: 8 }}>
            <img
              className="signature-qr"
              src={qrDataUrl}
              alt="QR Verifikasi"
              style={{ width: 80, height: 80 }}
            />
            <p style={{ fontSize: 8, margin: 0, color: BRAND_MUTED }}>Scan untuk verifikasi</p>
          </div>
        )}
      </div>
    </div>
  );
}
