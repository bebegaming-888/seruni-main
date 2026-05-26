/**
 * Letter Renderer — Layout-Based HTML Generation
 *
 * Renders a complete letter as HTML from a LetterLayout config + RenderContext.
 * Replaces hardcoded section structure in LetterRenderer.tsx.
 */

import {
  type LetterLayout,
  type RenderContext,
  type RenderedSection,
  type KopSectionConfig,
  type TitleSectionConfig,
  type PembukaSectionConfig,
  type SubjectSectionConfig,
  type BodySectionConfig,
  type ClosingSectionConfig,
  type SignatureSectionConfig,
  type QRSectionConfig,
  type FooterSectionConfig,
  type SeparatorSectionConfig,
  type CustomTextSectionConfig,
} from "@/types/letter-layout";

import { BULAN_ID } from "@/lib/utils";
import { ROMAWI as BULAN_ROMAWI } from "@/lib/nomor-surat";

// ─── Placeholder Resolution ─────────────────────────────────────────────────

function resolveValue(context: RenderContext, path: string): string {
  const parts = path.split(".");
  let value: unknown = context;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return "";
    value = (value as Record<string, unknown>)[part];
  }
  if (value === undefined || value === null) return "";
  return String(value);
}

function replaceText(text: string, context: RenderContext): string {
  if (!text) return "";
  let result = text;
  result = result.replace(/\{newline\}/gi, "<br/>");
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const e = expr.trim();
    if (e.includes("||")) {
      const [key, fallback] = e.split("||").map((s: string) => s.trim());
      const val = resolveValue(context, key);
      return val || fallback || "-";
    }
    if (e.includes("?")) {
      const [key, rest] = e.split("?");
      const val = resolveValue(context, key.trim());
      if (val) {
        const [truthy, falsy] = rest.split(":").map((s: string) => s.trim().replace(/'/g, ""));
        return val ? truthy : falsy;
      }
      return "";
    }
    const val = resolveValue(context, e);
    return val || "";
  });
  return result;
}

// ─── Section Renderers ─────────────────────────────────────────────────────────

function renderKopSection(
  config: KopSectionConfig,
  context: RenderContext,
  style: LetterLayout["style"],
): string {
  const linesHtml = config.kop_lines
    .map((line) => {
      const text = replaceText(line.text, context);
      const fw = line.font_weight === "bold" ? "font-weight:700" : "font-weight:400";
      return `<div style="font-size:${line.font_size}pt;${fw};text-align:${line.align};line-height:1.3;">${text}</div>`;
    })
    .join("");

  const logoKab = config.logo_kab_url
    ? `<img src="${config.logo_kab_url}" alt="Logo Kabupaten" style="height:${config.logo_size ?? 60}px;object-fit:contain;" />`
    : "";
  const logoDesa = config.logo_desa_url
    ? `<img src="${config.logo_desa_url}" alt="Logo Desa" style="height:${config.logo_size ?? 60}px;object-fit:contain;" />`
    : "";
  const hdrColor = config.header_color || style?.header_color || "#E37222";

  let headerLayout = "";
  if (config.logo_position === "separate") {
    headerLayout = `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px;">${logoKab ? `<div style="flex-shrink:0;">${logoKab}</div>` : ""}<div style="flex:1;text-align:center;">${linesHtml}</div>${logoDesa ? `<div style="flex-shrink:0;">${logoDesa}</div>` : ""}</div>`;
  } else {
    headerLayout = `<div style="margin-bottom:8px;">${linesHtml}</div>`;
  }

  const borderStyle =
    config.border_style === "double"
      ? `border-top:3px solid ${hdrColor};border-bottom:1px solid ${hdrColor};padding-top:4px;padding-bottom:4px;`
      : config.border_style === "thick"
        ? `border-top:2px solid ${hdrColor};border-bottom:2px solid ${hdrColor};padding-top:4px;padding-bottom:4px;`
        : `border-top:1px solid ${hdrColor};border-bottom:1px solid ${hdrColor};padding-top:4px;padding-bottom:4px;`;

  return `<div class="letter-kop" style="${borderStyle}margin-bottom:12px;">${headerLayout}</div>`;
}

function renderTitleSection(config: TitleSectionConfig, context: RenderContext): string {
  let titleText = context.template?.name || "SURAT KETERANGAN";
  if (config.format === "uppercase") titleText = titleText.toUpperCase();
  else if (config.format === "capitalize")
    titleText = titleText.charAt(0).toUpperCase() + titleText.slice(1).toLowerCase();

  const fw = config.font_weight === "bold" ? "font-weight:700" : "font-weight:400";
  const td = config.underline ? "text-decoration:underline" : "";
  const titleHtml = `<div style="font-size:13pt;${fw};${td};text-align:${config.align};margin-bottom:4px;">${titleText}</div>`;

  let nomorHtml = "";
  if (config.show_nomor) {
    const nomor = replaceText(
      config.nomor_format || "{klasifikasi}/{no_urut}/KDS.SRMB/{bulan_romawi}/{tahun}",
      context,
    );
    nomorHtml = `<div style="font-size:10pt;text-align:${config.align};margin-bottom:8px;">Nomor: ${nomor}</div>`;
  }

  let purviewHtml = "";
  if (config.show_perihal && context.letter?.perihal) {
    purviewHtml = `<div style="font-size:10pt;text-align:${config.align};margin-bottom:4px;">${config.purview_label}: ${context.letter.perihal}</div>`;
  }

  return `<div class="letter-title" style="margin-bottom:12px;">${titleHtml}${nomorHtml}${purviewHtml}</div>`;
}

function renderPembukaSection(config: PembukaSectionConfig, context: RenderContext): string {
  const text = replaceText(
    config.text ||
      "Yang bertanda tangan di bawah ini,{{signer.title}},Desa {{village.name}},menerangkan bahwa:",
    context,
  );
  const lines = text
    .split("<br/>")
    .map((l) => `<div style="margin-bottom:2px;">${l}</div>`)
    .join("");

  let tableHtml = "";
  if (config.show_signer_table && config.signer_fields?.length) {
    const rows = config.signer_fields
      .map((f) => {
        const val = replaceText(f.value_source, context);
        return `<tr><td style="width:30%;vertical-align:top;padding:2px 4px;">${f.label}</td><td style="width:5%;vertical-align:top;padding:2px 4px;">:</td><td style="width:65%;vertical-align:top;padding:2px 4px;">${val}</td></tr>`;
      })
      .join("");
    tableHtml = `<table style="width:100%;margin-top:8px;">${rows}</table>`;
  }

  return `<div class="letter-pembuka" style="margin-bottom:10px;font-size:${config.font_size ?? 11}pt;">${lines}${tableHtml}</div>`;
}

function renderSubjectSection(config: SubjectSectionConfig, context: RenderContext): string {
  const titleHtml = config.title
    ? `<div style="margin-bottom:6px;"><strong>${config.title}</strong></div>`
    : "";

  const rows = config.fields
    .filter((f) => {
      if (!f.show_if) return true;
      return !!replaceText(f.show_if, context);
    })
    .map((field) => {
      let value = replaceText(field.value_source, context) || "-";
      if (field.format === "uppercase") value = value.toUpperCase();
      else if (field.format === "capitalize")
        value = value.charAt(0).toUpperCase() + value.slice(1);

      const label = field.label || field.id;
      const sep = config.separator || " : ";
      const formatted = `${label}${sep}${value}`;

      if (config.layout === "table") {
        return `<tr><td style="width:${config.label_width ?? 30}%;vertical-align:top;padding:3px 4px;">${label}</td><td style="width:5%;vertical-align:top;padding:3px 2px;">:</td><td style="width:${95 - (config.label_width ?? 30)}%;vertical-align:top;padding:3px 4px;">${value}</td></tr>`;
      }
      return `<div style="margin-bottom:2px;font-size:11pt;">${formatted}</div>`;
    });

  let contentHtml = "";
  if (config.layout === "table" && rows.length > 0) {
    contentHtml = `<table style="width:100%;">${rows.join("")}</table>`;
  } else {
    contentHtml = rows.map((r) => r.replace(/<\/?tr>/g, "")).join("");
  }

  return `<div class="letter-subject" style="margin-bottom:10px;">${titleHtml}${contentHtml}</div>`;
}

function renderBodySection(config: BodySectionConfig, context: RenderContext): string {
  let clauses: string[] = [];

  if (config.clauses_source === "static" && config.static_clauses?.length) {
    clauses = config.static_clauses;
  } else if (config.clauses_source === "form_data" && Array.isArray(context.form_data?.clauses)) {
    clauses = context.form_data.clauses as string[];
  } else {
    clauses = context.template?.dna_clauses ?? [];
  }

  const renderedClauses = clauses.map((clause, index) => {
    const text = replaceText(clause, context);
    let prefix = "";
    if (config.format === "numbered") {
      const style = config.numbering_style || "1.";
      prefix = style === "1)" ? `${index + 1}) ` : `${index + 1}. `;
    } else if (config.format === "bulleted") {
      prefix = "&#8226; ";
    }
    const indent = config.indent_level > 0 ? `margin-left:${config.indent_level * 20}px` : "";
    const spacing = config.clause_spacing > 0 ? `margin-bottom:${config.clause_spacing}px` : "";
    return `<div style="${indent};${spacing};font-size:11pt;">${prefix}${text}</div>`;
  });

  return `<div class="letter-body" style="margin-bottom:10px;">${renderedClauses.join("")}</div>`;
}

function renderClosingSection(config: ClosingSectionConfig, context: RenderContext): string {
  const text = replaceText(
    config.text ||
      "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
    context,
  );
  let dateHtml = "";
  if (config.show_date) {
    const dateStr = replaceText(
      config.date_format || "{{village.name}}, {tanggal} {bulan} {tahun}",
      context,
    );
    dateHtml = `<div style="margin-top:8px;text-align:${config.align};">${dateStr}</div>`;
  }
  return `<div class="letter-closing" style="text-align:${config.align};margin-bottom:10px;">${text}${dateHtml}</div>`;
}

function renderSignatureSection(config: SignatureSectionConfig, context: RenderContext): string {
  const colCount = config.layout === "one_column" ? 1 : config.layout === "three_column" ? 3 : 2;
  const colWidth = 100 / colCount;

  const columns = config.columns.slice(0, colCount).map((col) => {
    const name =
      replaceText(col.name_source, context) ||
      (col.party === "pemohon"
        ? (context.form_data?.nama as string) || "-"
        : (context.signer?.name ?? "-"));
    const title = col.title_source.startsWith("custom:")
      ? col.title_source.replace("custom:", "")
      : replaceText(col.title_source, context) || col.title;
    const nip = col.show_nip && col.nip_source ? replaceText(col.nip_source, context) : "";

    return `<td style="width:${colWidth}%;vertical-align:top;text-align:center;padding:8px 16px;">
      <div style="margin-bottom:4px;font-size:11pt;">${col.ttd_label || title}</div>
      <div style="height:${config.signature_height}px;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;">
        ${col.show_stamp ? '<div style="font-size:10pt;color:#888;">[STEMPEL]</div>' : ""}
      </div>
      ${col.show_name ? `<div style="text-decoration:underline;margin-bottom:2px;font-size:11pt;">${name}</div>` : ""}
      ${col.show_title ? `<div style="font-size:10pt;color:#555;margin-bottom:2px;">${title}</div>` : ""}
      ${col.show_nip && nip ? `<div style="font-size:9pt;color:#555;">NIP. ${nip}</div>` : ""}
    </td>`;
  });

  return `<div class="letter-signature" style="margin-top:16px;margin-bottom:16px;">
    <table style="width:100%;table-layout:fixed;"><tr>${columns.join("")}</tr></table>
  </div>`;
}

function renderQRSection(config: QRSectionConfig, context: RenderContext): string {
  if (!context.qr_code_data_url) return "";

  const posMap: Record<string, string> = {
    bottom_left: "bottom:0;left:0",
    bottom_right: "bottom:0;right:0",
    top_left: "top:0;left:0",
    top_right: "top:0;right:0",
  };

  const posStyle = posMap[config.position] || posMap["bottom_left"];
  const verifyText = config.show_verification_text
    ? `<div style="font-size:7pt;color:#888;text-align:center;margin-top:2px;">${config.verification_text}</div><div style="font-size:7pt;color:#888;text-align:center;">${context.letter?.nomor ?? ""}</div>`
    : "";

  return `<div class="letter-qr" style="position:absolute;${posStyle};width:${config.size}px;">
    <img src="${context.qr_code_data_url}" alt="QR Verifikasi" style="width:${config.size}px;height:${config.size}px;object-fit:contain;" />
    ${verifyText}
  </div>`;
}

function renderFooterSection(config: FooterSectionConfig): string {
  return `<div class="letter-footer" style="text-align:${config.align};font-size:${config.font_size}pt;color:#888;margin-top:8px;">
    <hr style="border:none;border-top:0.5px solid ${config.separator_color ?? "#ccc"};margin:4px 0;" />
    <div>${config.text}</div>
    ${config.show_page_number ? `<div style="margin-top:4px;">Hal. 1 dari 1</div>` : ""}
  </div>`;
}

function renderSeparatorSection(config: SeparatorSectionConfig): string {
  if (config.style === "line") {
    return `<div style="height:${config.height}px;border-top:1px solid ${config.color ?? "#ccc"};margin:8px 0;"></div>`;
  } else if (config.style === "space") {
    return `<div style="height:${config.height}px;"></div>`;
  }
  return "";
}

function renderCustomTextSection(config: CustomTextSectionConfig, context: RenderContext): string {
  const text = replaceText(config.text, context);
  const fw = config.font_weight === "bold" ? "font-weight:700" : "font-weight:400";
  const fs = config.italic ? "font-style:italic" : "";
  return `<div class="letter-custom" style="text-align:${config.align};font-size:${config.font_size}pt;${fw};${fs};margin-top:${config.margin_top}px;margin-bottom:${config.margin_bottom}px;">${text}</div>`;
}

// ─── Main Functions ───────────────────────────────────────────────────────────

export function renderLetterFromLayout(
  layout: LetterLayout,
  context: RenderContext,
): RenderedSection[] {
  if (!layout?.sections?.length) return [];

  return layout.sections
    .filter((s) => s.enabled)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map((section) => {
      let html = "";
      switch (section.type) {
        case "kop":
          html = renderKopSection(section.config as KopSectionConfig, context, layout.style);
          break;
        case "title":
          html = renderTitleSection(section.config as TitleSectionConfig, context);
          break;
        case "pembuka":
          html = renderPembukaSection(section.config as PembukaSectionConfig, context);
          break;
        case "subject":
          html = renderSubjectSection(section.config as SubjectSectionConfig, context);
          break;
        case "body":
          html = renderBodySection(section.config as BodySectionConfig, context);
          break;
        case "closing":
          html = renderClosingSection(section.config as ClosingSectionConfig, context);
          break;
        case "signature":
          html = renderSignatureSection(section.config as SignatureSectionConfig, context);
          break;
        case "qr":
          html = renderQRSection(section.config as QRSectionConfig, context);
          break;
        case "footer":
          html = renderFooterSection(section.config as FooterSectionConfig);
          break;
        case "separator":
          html = renderSeparatorSection(section.config as SeparatorSectionConfig);
          break;
        case "custom_text":
          html = renderCustomTextSection(section.config as CustomTextSectionConfig, context);
          break;
        default:
          html = `<!-- Unknown section: ${(section as unknown as { type: string }).type} -->`;
      }
      return { id: section.id, type: section.type, html, order: section.order ?? 999 };
    });
}

export function renderLetterToHTML(layout: LetterLayout, context: RenderContext): string {
  const style = layout.style ?? {};
  const m = style.margins ?? { top: 20, bottom: 15, left: 20, right: 15 };
  const sections = renderLetterFromLayout(layout, context);
  const sectionsHtml = sections.map((s) => s.html).join("\n");

  const village = context.village;
  const kopLinesHtml = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:8px 0;">
      <div style="flex:1;text-align:center;">
        <div style="font-size:13pt;font-weight:700;">${village?.kabupaten ?? ""}</div>
        <div style="font-size:12pt;font-weight:700;">${village?.kecamatan ?? ""}</div>
        <div style="font-size:14pt;font-weight:700;letter-spacing:0.5px;">${village?.name ?? ""}</div>
        ${village?.address ? `<div style="font-size:9pt;color:#5c5a56;">${village.address}</div>` : ""}
        ${village?.phone || village?.email ? `<div style="font-size:8pt;color:#5c5a56;">${[village.phone, village.email].filter(Boolean).join(" · ")}</div>` : ""}
      </div>
    </div>`;

  const titleText = context.template?.name || "SURAT KETERANGAN";
  const nomorHtml = context.letter?.nomor
    ? `<div style="font-size:10pt;text-align:center;margin-bottom:12px;">Nomor: ${context.letter.nomor}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${titleText} - ${context.letter?.nomor ?? ""}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:${style.font_family ?? "Arial, sans-serif"};font-size:${style.font_size_body ?? 11}pt;color:${style.text_color ?? "#1a1918"};line-height:${style.line_height ?? 1.2}}
.letter-page{width:210mm;min-height:297mm;padding:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;background:white;position:relative}
</style>
</head>
<body>
<div class="letter-page">
  ${
    sectionsHtml ||
    `
    <div class="letter-kop" style="border-top:3px solid ${style.header_color ?? "#E37222"};border-bottom:1px solid ${style.header_color ?? "#E37222"};padding:6px 0;margin-bottom:12px;">${kopLinesHtml}</div>
    <div class="letter-title"><div style="font-size:13pt;font-weight:700;text-align:center;margin-bottom:4px;">${titleText.toUpperCase()}</div>${nomorHtml}</div>
  `
  }
</div>
</body>
</html>`;
}

export function buildRenderContextFromSurat(
  surat: {
    kode: string;
    no?: string;
    nama_surat?: string;
    data?: Record<string, string | number | boolean>;
    approved_at?: string;
    signed_by?: string;
    signer_title?: string;
    qr_payload?: string;
  },
  warga: {
    nama?: string;
    nik?: string;
    tempat_tanggal_lahir?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin?: string;
    pekerjaan?: string;
    agama?: string;
    kewarganegaraan?: string;
    alamat?: string;
    dusun?: string;
    rt?: string;
    rw?: string;
  },
  settings: {
    village?: {
      name?: string;
      kecamatan?: string;
      kabupaten?: string;
      province?: string;
      address?: string;
      phone?: string;
      email?: string;
    };
    signature?: { signer_name?: string; signer_title?: string; signer_nip?: string };
  },
  qrCodeDataUrl?: string,
): RenderContext {
  const tanggalRaw = surat.approved_at ?? new Date().toISOString();
  const tgl = new Date(tanggalRaw);
  const tanggal = tgl.getDate();
  const bulan = BULAN_ID[tgl.getMonth() + 1] ?? "";
  const tahun = tgl.getFullYear();
  const formattedDate = `${tanggal} ${bulan} ${tahun}`;
  const nomorParts = (surat.no ?? "").split("/");
  const klasifikasi = nomorParts[0] ?? "474";
  const noUrut = nomorParts[1] ?? "001";
  const bulanRomawi = BULAN_ROMAWI[tgl.getMonth() + 1] ?? "I";

  return {
    form_data: (surat.data ?? {}) as Record<string, string | number | boolean>,
    signer: {
      name: surat.signed_by ?? settings?.signature?.signer_name ?? "Nama Kepala Desa",
      title: surat.signer_title ?? settings?.signature?.signer_title ?? "Kepala Desa Seruni Mumbul",
      nip: settings?.signature?.signer_nip ?? "",
      role: "kepala_desa",
    },
    village: {
      name: settings?.village?.name ?? "Seruni Mumbul",
      kecamatan: settings?.village?.kecamatan ?? "Lombok Utara",
      kabupaten: settings?.village?.kabupaten ?? "Lombok Utara",
      provinsi: settings?.village?.province ?? "Nusa Tenggara Barat",
      address: settings?.village?.address ?? "",
      phone: settings?.village?.phone ?? "",
      email: settings?.village?.email ?? "",
    },
    letter: {
      nomor: surat.no ?? "",
      tanggal: formattedDate,
      formatted_date: formattedDate,
      klasifikasi,
      no_urut: noUrut,
    },
    template: {
      name: surat.nama_surat ?? "SURAT KETERANGAN",
      code: surat.kode,
      category: "",
      dna_clauses: [],
      subject_fields: [],
      closing:
        "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
    },
    qr_code_data_url: qrCodeDataUrl,
    computed: {
      bulan_romawi: bulanRomawi,
      tahun: String(tahun),
      tanggal: String(tanggal),
      bulan,
    },
  };
}

export type { LetterLayout, RenderContext, RenderedSection } from "@/types/letter-layout";
