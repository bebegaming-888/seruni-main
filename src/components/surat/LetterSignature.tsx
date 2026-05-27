/**
 * LetterSignature — Blok Tanda Tangan
 *
 * Layout 2 kolom:
 * - Kiri: "Yang Bersangkutan," / kosong
 * - Kanan: Lokasi, Tanggal, Jabatan, ruang TTD, Nama Pejabat, QR Code
 */
import { memo, useEffect, useState } from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";

const BRAND_MUTED = "#5c5a56";

export const LetterSignature = memo(function LetterSignature({
  signature,
  namaPemohon,
}: {
  signature: RenderedLetter["signature"];
  namaPemohon?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || "Times New Roman, Times, serif";
  const bodyFontSize = settings.pdfLayout?.body_font_size || 12;

  useEffect(() => {
    if (!signature.qrPayload) return;
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(signature.qrPayload!, { width: 96, margin: 0 }))
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

  const footerFontSize = Math.max(8, (bodyFontSize as number) - 2);
  return (
    <div
      className="flex justify-between gap-4 relative"
      style={{
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        marginTop: 32,
        pageBreakInside: "avoid",
      }}
    >
      {/* Kolom kiri — pemohon */}
      <div className="flex-1 text-center pt-4">
        <p className="m-0">Yang Bersangkutan,</p>
        <div className="h-20" />
        {namaPemohon && <p className="m-0 font-bold">{namaPemohon}</p>}
      </div>

      {/* Kolom kanan — pejabat */}
      <div className="flex-1 text-center">
        <p className="m-0">
          {signature.lokasi}, {signature.tanggal}
        </p>
        <p className="my-1">{signature.jabatan},</p>
        <div className="h-20 relative">
          {/* Ruang TTD — gambar tandatangan pejabat */}
          {signature.signImageUrl && (
            <img
              src={signature.signImageUrl}
              alt="Tanda Tangan"
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                transform: "translateX(-50%)",
                height: 80,
                width: "auto",
                objectFit: "contain",
                opacity: 0.9,
              }}
            />
          )}
        </div>
        <p className="m-0 font-bold underline">{signature.namaPejabat}</p>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="mt-3 flex flex-col items-center">
            <img
              className="signature-qr"
              src={qrDataUrl}
              alt="QR Verifikasi"
              style={{ width: 80, height: 80 }}
            />
            <p
              className="text-[9px] mt-1 italic"
              style={{ color: BRAND_MUTED, fontFamily: "JetBrains Mono, monospace" }}
            >
              Scan untuk verifikasi
            </p>
          </div>
        )}
      </div>

      {/* Footer text (dari settings kopSurat.footer_text) */}
      {signature.footerText && (
        <div
          className="absolute bottom-[-48px] left-0 right-0 text-center italic"
          style={{ fontSize: footerFontSize, color: BRAND_MUTED }}
        >
          {signature.footerText}
        </div>
      )}
    </div>
  );
});
