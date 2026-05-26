// Type declarations for third-party globals
// Cloudflare Turnstile (browser widget API — platform-agnostic)
declare global {
  interface Window {
    turnstile: {
      render(
        container: Element | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (errorCode: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
          tabindex?: number;
          responseFieldName?: string;
        },
      ): string;
      remove(widgetId: string): void;
      reset(widgetId: string): void;
      getResponse(widgetId: string): string;
    };
  }
}

// IndexedDB native key type
type IDBValidKey = number | string | Date | ArrayBuffer | DataView | IDBValidKey[];

// Third-party module declarations
declare module "papaparse" {
  export interface ParseConfig<T = any> {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    transformHeader?: (header: string) => string;
    dynamicTyping?: boolean | { [key: string]: boolean };
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult<T>, parser: Parser) => void;
    complete?: (results: ParseResult<T>, file?: File) => void;
    error?: (error: ParseError, file?: File) => void;
    download?: boolean;
    downloadRequestHeaders?: { [key: string]: string };
    skipEmptyLines?: boolean | "greedy";
    chunk?: (results: ParseResult<T>, parser: Parser) => void;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string | void;
    withCredentials?: boolean;
    transform?: (value: string, field: string | number) => any;
    delimitersToGuess?: string[];
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields?: string[];
  }

  export interface Parser {
    abort: () => void;
    pause: () => void;
    resume: () => void;
  }

  export function parse<T = any>(input: string | File, config?: ParseConfig<T>): ParseResult<T>;
  export function unparse(data: any[] | object, config?: object): string;
}

declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    type?: "image/png" | "image/jpeg" | "image/webp";
    quality?: number;
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export interface QRCodeToStringOptions {
    type?: "svg" | "terminal" | "utf8";
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  export function toDataURL(
    text: string,
    callback: (error: Error | null, url: string) => void,
  ): void;

  export function toDataURL(
    text: string,
    options: QRCodeToDataURLOptions,
    callback: (error: Error | null, url: string) => void,
  ): void;

  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<void>;
}

// Supabase Database type (for use with typed supabase client)
// Fill in with generated types from Supabase CLI:
// npx supabase gen types typescript --project-id <your-project-id>
export type Database = {
  public: {
    Tables: {
      warga: {
        Row: {
          id: string;
          nik: string;
          nama: string;
          tempat_lahir: string;
          tanggal_lahir: string;
          jenis_kelamin: "Laki-Laki" | "Perempuan";
          agama: string;
          status_perkawinan: string;
          pekerjaan: string;
          no_kk: string;
          alamat: string;
          dusun: string;
          created_at: string;
        };
        Insert: Omit<Row, "created_at"> & Partial<Pick<Row, "id">>;
        Update: Partial<Omit<Row, "id">>;
      };
      surat_requests: {
        Row: {
          id: string;
          no: string;
          kode: string;
          nama_surat: string;
          pemohon: string;
          nik: string;
          kontak: string;
          data: Record<string, string>;
          status: string;
          catatan: string | null;
          signed_by: string | null;
          signed_at: string | null;
          qr_payload: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Row, "created_at" | "updated_at">;
        Update: Partial<Omit<Row, "id" | "no">>;
      };
      admin_users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          name: string;
          role: string;
          created_at: string;
        };
        Insert: Omit<Row, "created_at">;
        Update: Partial<Omit<Row, "id">>;
      };
      audit_log: {
        Row: {
          id: string;
          username: string;
          action: string;
          detail: string | null;
          created_at: string;
        };
        Insert: Omit<Row, "id" | "created_at">;
        Update: never;
      };
    };
  };
};

export {};
