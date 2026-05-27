/**
 * LetterHeader — Komponen Kop Surat
 *
 * Layout: Logo Kab (kiri) | Hierarki Teks (tengah) | Logo Desa (kanan)
 * Diikuti alamat, kontak, dan double rule.
 *
 * logo_position: "separate" → 3-column (Kab | Teks | Desa)
 *                 "left"    → Logo Kab di kiri, teks+desa di kanan
 *                 "center"  → Logo Desa di tengah, teks di sekitar
 *                 "right"   → Logo Desa di kanan, teks+kab di kiri
 */
import { memo } from "react";
import type { RenderedLetter } from "@/lib/letter-engine";
import { getSettings } from "@/lib/settings-store";
import { getMediaUrl } from "@/lib/media-upload";

// ── Brand palette defaults for letter components ────────────────────────────────
const BRAND_PRIMARY = "#E37222";
const BRAND_BORDER = "#D5D5D5";
const BRAND_TEXT = "#1a1918";
const BRAND_MUTED = "#5c5a56";
const DEFAULT_FONT = "Arial, sans-serif";

type Props = {
  header: RenderedLetter["header"];
  primaryColor?: string;
};

export const LetterHeader = memo(function LetterHeader({
  header,
  primaryColor = BRAND_PRIMARY,
}: Props) {
  const settings = getSettings();
  const bodyFont = settings.pdfLayout?.body_font || DEFAULT_FONT;
  const logoPos = settings.kopSurat.logo_position;

  const logoKabUrl = settings.kopSurat.logo_kab_storage_path
    ? getMediaUrl(settings.kopSurat.logo_kab_storage_path, "public-media")
    : settings.kopSurat.logo_kab_url || "";
  const logoDesaUrl = settings.kopSurat.logo_desa_storage_path
    ? getMediaUrl(settings.kopSurat.logo_desa_storage_path, "public-media")
    : settings.kopSurat.logo_desa_url || "";

  const hasLogoKab = Boolean(logoKabUrl);
  const hasLogoDesa = Boolean(logoDesaUrl);

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

      {/* Row — layout depends on logo_position setting */}
      <div
        className="flex items-center gap-3 py-1.5"
        style={{
          paddingLeft: logoPos === "center" ? 80 : 0,
          paddingRight: logoPos === "center" ? 80 : 0,
        }}
      >
        {/* Logo Kabupaten — shown when position includes left */}
        {logoPos !== "right" && (logoPos === "separate" || logoPos === "left") && (
          <div className="shrink-0 text-center" style={{ width: logoPos === "separate" ? 72 : 60 }}>
            {hasLogoKab ? (
              <img
                src={logoKabUrl}
                alt="Logo Kabupaten"
                className="object-contain mx-auto"
                style={{
                  width: logoPos === "separate" ? 68 : 56,
                  height: logoPos === "separate" ? 68 : 56,
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center border border-dashed rounded-1 mx-auto"
                style={{
                  width: logoPos === "separate" ? 68 : 56,
                  height: logoPos === "separate" ? 68 : 56,
                  borderColor: BRAND_BORDER,
                  fontSize: 9,
                  color: BRAND_MUTED,
                }}
              >
                Logo Kab
              </div>
            )}
          </div>
        )}

        {/* Hierarki Teks — always shown, width varies */}
        <div
          className="text-center"
          style={{
            flex: logoPos === "center" ? "0 0 auto" : 1,
            textAlign: logoPos === "right" ? "right" : "center",
            fontFamily: bodyFont,
            paddingLeft: logoPos === "center" ? 80 : 0,
            paddingRight: logoPos === "center" ? 80 : 0,
          }}
        >
          <div className="text-[13px] font-bold tracking-wide">{header.namaKabupaten}</div>
          <div className="text-sm font-bold">{header.namaKecamatan}</div>
          <div className="text-sm font-bold tracking-widest">{header.namaDesa}</div>
          <div className="text-[9px] mt-1" style={{ color: BRAND_TEXT }}>
            {header.alamat}
          </div>
          <div className="text-[9px]" style={{ color: BRAND_MUTED }}>
            {header.kontak}
          </div>
        </div>

        {/* Logo Desa — shown when position includes right */}
        {logoPos !== "left" &&
          (logoPos === "separate" || logoPos === "center" || logoPos === "right") && (
            <div
              className="shrink-0 text-center"
              style={{ width: logoPos === "separate" ? 72 : 60 }}
            >
              {hasLogoDesa ? (
                <img
                  src={logoDesaUrl}
                  alt="Logo Desa"
                  className="object-contain mx-auto"
                  style={{
                    width: logoPos === "separate" ? 68 : 56,
                    height: logoPos === "separate" ? 68 : 56,
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center border border-dashed rounded-1 mx-auto"
                  style={{
                    width: logoPos === "separate" ? 68 : 56,
                    height: logoPos === "separate" ? 68 : 56,
                    borderColor: BRAND_BORDER,
                    fontSize: 9,
                    color: BRAND_MUTED,
                  }}
                >
                  Logo Desa
                </div>
              )}
            </div>
          )}
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
});
