/**
 * PDF Generator — surat医生 (Edge-compatible)
 *
 * Menggunakan pdf-lib untuk membuat dokumen surat resmi dengan:
 * - Kop surat (header desa)
 * - Isi surat (dari template {{placeholder}})
 * - QR Code verifikasi
 * - Tanda tangan digital
 *
 * @param params.surat   — data surat
 * @param params.warga   — data warga
 * @param params.settings — settings sistem (nama desa, kepala desa, dll.)
 * @param params.includeQr — apakah QR ditampilkan (default true)
 */
import { PDFDocument, rgb, StandardFonts, type RGB } from "pdf-lib";
import type { SuratRecord } from "@/lib/esurat-store";
import type { Penduduk } from "@/data/penduduk";
import type { SystemSettings } from "@/lib/settings-store";

export type PdfGenParams = {
  surat: SuratRecord;
  warga: Penduduk;
  settings: SystemSettings;
  includeQr?: boolean;
};

const MARGIN = 56; // ~2 cm
const LINE_HEIGHT = 18;

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return rgb(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  );
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.length ? lines : [""];
}

export async function generateSuratPdf({
  surat,
  warga,
  settings,
  includeQr = true,
}: PdfGenParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait (dalam 1/72 inch)
  const { width, height } = page.getSize();

  // Fonts
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontCourier = await doc.embedFont(StandardFonts.Courier);

  const primaryRgb = hexToRgb(settings.branding.primary_color);

  let y = height - MARGIN;

  const resetY = () => {
    y = height - MARGIN;
  };
  const moveDown = (n = LINE_HEIGHT) => {
    y -= n;
  };
  const drawLine = (
    text: string,
    opts?: {
      font?: typeof fontRegular;
      size?: number;
      color?: RGB;
      bold?: boolean;
      align?: "left" | "center" | "right";
    },
  ) => {
    const font = opts?.bold ? fontBold : (opts?.font ?? fontRegular);
    const size = opts?.size ?? 10;
    const color = opts?.color ?? rgb(0, 0, 0);
    const textWidth = font.widthOfTextAtSize(text, size);

    let x: number;
    if (opts?.align === "center") x = (width - textWidth) / 2;
    else if (opts?.align === "right") x = width - MARGIN - textWidth;
    else x = MARGIN;

    if (y < MARGIN + 60) {
      // Auto-add new page if space runs out
      const newPage = doc.addPage([595.28, 841.89]);
      resetY();
      newPage.drawText(text, { x, y, size, font, color });
      y -= LINE_HEIGHT;
      return;
    }

    page.drawText(text, { x, y, size, font, color });
    y -= LINE_HEIGHT * (Math.ceil(textWidth / (width - 2 * MARGIN)) || 1);
  };

  // ============ KOP SURAT ============
  // Garis batas atas
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 2,
    color: primaryRgb,
  });
  y -= 6;

  // Nama desa
  drawLine(settings.village.name.toUpperCase(), { size: 14, bold: true, align: "center" });
  drawLine(settings.village.address, { size: 9, align: "center", color: rgb(0.4, 0.4, 0.4) });
  drawLine(`${settings.village.phone} · ${settings.village.email ?? ""}`.trim(), {
    size: 8,
    align: "center",
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 6;
  // Garis batas bawah kop
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1.5,
    color: primaryRgb,
  });
  y -= 16;

  // ============ NOMOR SURAT ============
  drawLine(`${surat.nama_surat.toUpperCase()}`, { size: 13, bold: true, align: "center" });
  drawLine(`Nomor: ${surat.no}`, { size: 10, align: "center" });
  y -= 10;

  // ============ BODY SURAT ============
  const villageName = settings.village.name;
  const villageDistrict = settings.village.district;
  const villageRegency = settings.village.regency;

  const bodyLines = [
    `Yang bertanda tangan di bawah ini, Kepala Desa ${villageName}, Kecamatan ${villageDistrict} — Kabupaten ${villageRegency},`,
    "menerangkan bahwa:",
    "",
    ...wrapText(`Nama        : ${warga.nama}`, 60),
    ...wrapText(`NIK         : ${warga.nik}`, 60),
    ...wrapText(`Tempat/Tgl : ${warga.tempat_lahir}, ${warga.tanggal_lahir}`, 60),
    ...wrapText(`Alamat      : ${warga.alamat}, RT ${warga.rt}/RW ${warga.rw},`, 60),
    ...wrapText(
      `              Desa ${warga.desa}, Kec. ${warga.kecamatan}, ${warga.kabupaten}`,
      60,
    ),
    "",
    "Adalah benar warga kami dan surat ini dibuat untuk keperluan:",
    "",
  ];

  // Data spesifik dari pengajuan
  if (surat.data) {
    Object.entries(surat.data).forEach(([key, value]) => {
      if (value && key !== "keperluan") {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        bodyLines.push(...wrapText(`${label}: ${value}`, 60));
      }
    });
    bodyLines.push("");
    const keperluan = surat.data.keperluan ?? "mengajukan surat ini";
    bodyLines.push(...wrapText(`              ${keperluan}`, 60));
  }

  bodyLines.push("");
  bodyLines.push(
    "Demikian surat ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.",
  );
  bodyLines.push("");

  for (const line of bodyLines) {
    drawLine(line, { size: 10 });
  }

  y -= 8;

  // ============ TANDA TANGAN ============
  const ttdX = width - MARGIN - 180;
  const ttdY = y;

  // Kolom kiri: pemohon
  drawLine("Yang Bersangkutan,", { size: 9, align: "center" });
  y -= 50;
  drawLine(warga.nama, { size: 10, bold: true, align: "center" });

  y = ttdY;

  // Kolom kanan: kepala desa
  const tglSurat = surat.signed_at
    ? new Date(surat.signed_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  drawLine(`${villageName}, ${tglSurat}`, { size: 9, align: "center" });
  if (surat.signed_by) {
    drawLine("Kepala Desa,", { size: 9, align: "center" });
    y -= 50;
    drawLine(surat.signed_by, { size: 10, bold: true, align: "center" });
  } else {
    drawLine("Kepala Desa,", { size: 9, align: "center" });
    y -= 50;
    drawLine(settings.signature.signer_name, { size: 10, bold: true, align: "center" });
    drawLine(settings.signature.signer_title, {
      size: 8,
      align: "center",
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // ============ QR CODE (jika diminta) ============
  if (includeQr && settings.signature.require_qr && surat.qr_payload) {
    try {
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(surat.qr_payload, { width: 80, margin: 1 });
      const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const qrImage = await doc.embedPng(qrImageBytes);

      page.drawImage(qrImage, {
        x: MARGIN,
        y: MARGIN + 60,
        width: 80,
        height: 80,
      });

      page.drawText("Scan untuk verifikasi", {
        x: MARGIN,
        y: MARGIN + 55,
        size: 7,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(surat.no, {
        x: MARGIN,
        y: MARGIN + 47,
        size: 7,
        font: fontCourier,
        color: rgb(0.4, 0.4, 0.4),
      });
    } catch (qrErr) {
      // QR generation failed — skip QR, surat tetap valid
      console.warn("[PDF] QR code generation failed:", qrErr);
    }
  }

  // ============ FOOTER ============
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 10 },
    end: { x: width - MARGIN, y: MARGIN + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(
    `Dokumen ini diterbitkan oleh ${villageName}. Untuk verifikasi: ${settings.village.name} / ${settings.village.phone}`,
    {
      x: MARGIN,
      y: MARGIN,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  const pdfBytes = await doc.save();
  return pdfBytes;
}
