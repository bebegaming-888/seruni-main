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
