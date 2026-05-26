/**
 * Letter Layout System — TypeScript Type Definitions
 * Enables 100% admin-configurable blanko surat via dashboard.
 * Replaces hardcoded letter structure in LetterRenderer.tsx.
 */

// ─── Section Types ─────────────────────────────────────────────────────────

export type SectionType =
  | "kop"
  | "title"
  | "pembuka"
  | "subject"
  | "body"
  | "closing"
  | "signature"
  | "qr"
  | "footer"
  | "separator"
  | "custom_text";

export type TextAlign = "left" | "center" | "right";
export type FontWeight = "normal" | "bold";
export type TitleFormat = "uppercase" | "capitalize" | "normal";
export type LogoPosition = "separate" | "inline" | "none";
export type BorderStyle = "single" | "double" | "thick";
export type SubjectLayout = "table" | "list";
export type BodyFormat = "numbered" | "bulleted" | "plain" | "paragraphs";
export type NumberingStyle = "1." | "1)" | "a." | "I." | "custom";
export type SignatureLayout = "one_column" | "two_column" | "three_column";
export type QRPosition = "bottom_left" | "bottom_right" | "top_left" | "top_right";
export type SeparatorStyle = "line" | "dots" | "space";
export type PaperSize = "A4" | "F4" | "Letter";
export type ClauseSource = "template" | "form_data" | "static";
export type PartyType = "pemohon" | "signer" | "saksi" | "custom";

// ─── Section Configs ─────────────────────────────────────────────────────────

export interface KopLineConfig {
  text: string;
  font_size: number;
  font_weight: FontWeight;
  align: TextAlign;
}

export interface KopSectionConfig {
  logo_position: LogoPosition;
  logo_kab_url?: string;
  logo_desa_url?: string;
  logo_size?: number;
  kop_lines: KopLineConfig[];
  show_border_bottom: boolean;
  border_style: BorderStyle;
  header_color: string;
  divider_color?: string;
}

export interface TitleSectionConfig {
  format: TitleFormat;
  show_nomor: boolean;
  nomor_format: string;
  show_perihal: boolean;
  purview_label: string;
  align: TextAlign;
  underline: boolean;
  font_weight: FontWeight;
}

export interface SignerFieldConfig {
  label: string;
  value_source: string; // e.g. "signer.name", "village.name", "signer.title"
}

export interface PembukaSectionConfig {
  text: string;
  show_signer_table: boolean;
  signer_fields: SignerFieldConfig[];
  font_size?: number;
}

export interface SubjectFieldConfig {
  id: string;
  label: string;
  value_source: string; // e.g. "form_data.nama", "form_data.nik", "form_data.pekerjaan"
  format?: "uppercase" | "capitalize" | "normal";
  show_if?: string; // conditional expression
}

export interface SubjectSectionConfig {
  title: string;
  fields: SubjectFieldConfig[];
  label_format: string; // e.g. "{label} : {value}"
  layout: SubjectLayout;
  label_width: number; // percentage, e.g. 30
  separator?: string; // e.g. " : "
}

export interface BodySectionConfig {
  clauses_source: ClauseSource;
  static_clauses?: string[];
  format: BodyFormat;
  numbering_style: NumberingStyle;
  custom_numbering?: string;
  indent_level: number;
  clause_spacing: number; // px
}

export interface ClosingSectionConfig {
  text: string;
  show_date: boolean;
  date_format: string; // e.g. "Mumbul, {tanggal} {bulan} {tahun}"
  align: TextAlign;
}

export interface SignatureColumnConfig {
  party: PartyType;
  custom_party_name?: string;
  title: string;
  show_name: boolean;
  show_title: boolean;
  show_nip: boolean;
  show_stamp: boolean;
  name_source: string; // e.g. "form_data.nama", "signer.name"
  title_source: string; // e.g. "signer.title", "custom:Pemohon"
  nip_source: string;
  ttd_label: string; // e.g. "Yang Bersangkutan", "Kepala Desa"
}

export interface SignatureSectionConfig {
  layout: SignatureLayout;
  columns: SignatureColumnConfig[];
  signature_height: number; // px for blank signature area
  show_materai: boolean;
  materai_position: "left" | "right";
  materai_label?: string;
}

export interface QRSectionConfig {
  position: QRPosition;
  size: number; // px
  show_verification_text: boolean;
  verification_text: string;
  verification_url_template: string; // e.g. "/verifikasi/{nomor_surat}"
}

export interface FooterSectionConfig {
  text: string;
  align: TextAlign;
  font_size: number;
  show_page_number: boolean;
  separator_color?: string;
}

export interface SeparatorSectionConfig {
  style: SeparatorStyle;
  height: number; // px
  color: string;
}

export interface CustomTextSectionConfig {
  text: string;
  align: TextAlign;
  font_size: number;
  font_weight: FontWeight;
  margin_top: number; // px
  margin_bottom: number; // px
  italic?: boolean;
}

// Union of all section config types
export type SectionConfig =
  | KopSectionConfig
  | TitleSectionConfig
  | PembukaSectionConfig
  | SubjectSectionConfig
  | BodySectionConfig
  | ClosingSectionConfig
  | SignatureSectionConfig
  | QRSectionConfig
  | FooterSectionConfig
  | SeparatorSectionConfig
  | CustomTextSectionConfig;

// ─── LetterSection ────────────────────────────────────────────────────────────

export interface LetterSection {
  id: string;
  type: SectionType;
  config: SectionConfig;
  enabled: boolean;
  order: number;
}

// ─── LetterStyle ───────────────────────────────────────────────────────────────

export interface LetterStyle {
  font_family: string;
  font_size_body: number;
  font_size_title: number;
  font_size_header: number;
  line_height: number;
  text_color: string;
  margins: {
    top: number; // mm
    bottom: number;
    left: number;
    right: number;
  };
  header_color: string;
  paper_size: PaperSize;
}

// ─── LetterLayout ─────────────────────────────────────────────────────────────

export interface LetterLayout {
  id: string;
  surat_type_code: string;
  name: string;
  description?: string;
  sections: LetterSection[];
  style: LetterStyle;
  version: number;
  status: "draft" | "active" | "archived";
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

// ─── RenderedOutput ────────────────────────────────────────────────────────────

export interface RenderedSection {
  id: string;
  type: SectionType;
  html: string;
  order: number;
}

// ─── RenderContext ─────────────────────────────────────────────────────────────
// Data passed to renderer at runtime

export interface RenderContext {
  // Form data from submitted surat request
  form_data: Record<string, string | number | boolean>;

  // Signer (selected by admin at approve time)
  signer: {
    name: string;
    title: string;
    nip?: string;
    role: string;
  };

  // Village identity
  village: {
    name: string;
    kecamatan: string;
    kabupaten: string;
    provinsi: string;
    kode_pos?: string;
    address?: string;
    phone?: string;
    email?: string;
  };

  // Letter metadata
  letter: {
    nomor: string;
    tanggal: string;
    formatted_date?: string;
    perihal?: string;
    klasifikasi: string;
    no_urut?: string;
  };

  // Template data (from surat_types or template-store)
  template: {
    name: string;
    code: string;
    category: string;
    dna_clauses: string[];
    subject_fields: Array<{ key: string; label: string }>;
    closing: string;
  };

  // QR code
  qr_code_data_url?: string;

  // Additional computed values
  computed?: Record<string, string | number | boolean>;
}

// ─── Database Record Types ────────────────────────────────────────────────────

export interface LetterSigner {
  id: string;
  role: string;
  title: string;
  name: string;
  nip?: string;
  position_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RejectionReason {
  id: string;
  code: string;
  reason: string;
  category?: string;
  is_active: boolean;
  position_order: number;
  created_at: string;
  updated_at?: string;
}

export interface LetterLayoutHistory {
  id: string;
  layout_id: string;
  version: number;
  sections: LetterSection[];
  style: LetterStyle;
  changed_by?: string;
  change_note?: string;
  created_at: string;
}

// ─── Default Layout Factories ─────────────────────────────────────────────────
// These create default layouts for migrations

export function createDefaultKopSection(): LetterSection {
  return {
    id: "kop-default",
    type: "kop",
    enabled: true,
    order: 1,
    config: {
      logo_position: "separate",
      logo_size: 60,
      kop_lines: [],
      show_border_bottom: true,
      border_style: "double",
      header_color: "#E37222",
    } as KopSectionConfig,
  };
}

export function createDefaultTitleSection(): LetterSection {
  return {
    id: "title-default",
    type: "title",
    enabled: true,
    order: 2,
    config: {
      format: "uppercase",
      show_nomor: true,
      nomor_format: "{klasifikasi}/{no_urut}/KDS.SRMB/{bulan_romawi}/{tahun}",
      show_perihal: false,
      purview_label: "Perihal",
      align: "center",
      underline: false,
      font_weight: "bold",
    } as TitleSectionConfig,
  };
}

export function createDefaultPembukaSection(): LetterSection {
  return {
    id: "pembuka-default",
    type: "pembuka",
    enabled: true,
    order: 3,
    config: {
      text: "Yang bertanda tangan di bawah ini,{newline}{{signer.title}},Desa {{village.name}},Kecamatan {{village.kecamatan}},menerangkan bahwa:",
      show_signer_table: true,
      signer_fields: [
        { label: "Nama", value_source: "signer.name" },
        { label: "Jabatan", value_source: "signer.title" },
        { label: "Desa", value_source: "village.name" },
        { label: "Kecamatan", value_source: "village.kecamatan" },
      ],
      font_size: 11,
    } as PembukaSectionConfig,
  };
}

export function createDefaultSubjectSection(): LetterSection {
  return {
    id: "subject-default",
    type: "subject",
    enabled: true,
    order: 4,
    config: {
      title: "Menerangkan bahwa :",
      fields: [],
      label_format: "{label} : {value}",
      layout: "table",
      label_width: 30,
      separator: " : ",
    } as SubjectSectionConfig,
  };
}

export function createDefaultBodySection(): LetterSection {
  return {
    id: "body-default",
    type: "body",
    enabled: true,
    order: 5,
    config: {
      clauses_source: "template",
      format: "plain",
      numbering_style: "1.",
      indent_level: 0,
      clause_spacing: 6,
    } as BodySectionConfig,
  };
}

export function createDefaultClosingSection(): LetterSection {
  return {
    id: "closing-default",
    type: "closing",
    enabled: true,
    order: 6,
    config: {
      text: "Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
      show_date: true,
      date_format: "{{village.name}}, {tanggal} {bulan} {tahun}",
      align: "left",
    } as ClosingSectionConfig,
  };
}

export function createDefaultSignatureSection(): LetterSection {
  return {
    id: "signature-default",
    type: "signature",
    enabled: true,
    order: 7,
    config: {
      layout: "two_column",
      columns: [
        {
          party: "pemohon",
          title: "Yang Bersangkutan",
          show_name: true,
          show_title: false,
          show_nip: false,
          show_stamp: false,
          name_source: "form_data.nama",
          title_source: "custom:Pemohon",
          nip_source: "",
          ttd_label: "Yang Bersangkutan",
        },
        {
          party: "signer",
          title: "Kepala Desa",
          show_name: true,
          show_title: true,
          show_nip: true,
          show_stamp: true,
          name_source: "signer.name",
          title_source: "signer.title",
          nip_source: "signer.nip",
          ttd_label: "Kepala Desa",
        },
      ],
      signature_height: 60,
      show_materai: false,
      materai_position: "right",
    } as SignatureSectionConfig,
  };
}

export function createDefaultQRSection(): LetterSection {
  return {
    id: "qr-default",
    type: "qr",
    enabled: true,
    order: 8,
    config: {
      position: "bottom_left",
      size: 80,
      show_verification_text: true,
      verification_text: "Scan untuk verifikasi",
      verification_url_template: "/verifikasi/{nomor_surat}",
    } as QRSectionConfig,
  };
}

export function createDefaultFooterSection(): LetterSection {
  return {
    id: "footer-default",
    type: "footer",
    enabled: false,
    order: 9,
    config: {
      text: "",
      align: "center",
      font_size: 7,
      show_page_number: false,
    } as FooterSectionConfig,
  };
}

export function createDefaultStyle(): LetterStyle {
  return {
    font_family: "Arial, sans-serif",
    font_size_body: 11,
    font_size_title: 13,
    font_size_header: 14,
    line_height: 1.2,
    text_color: "#1a1918",
    margins: { top: 20, bottom: 15, left: 20, right: 15 },
    header_color: "#E37222",
    paper_size: "A4",
  };
}
