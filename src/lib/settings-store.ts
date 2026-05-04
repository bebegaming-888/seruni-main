// Pusat penyimpanan pengaturan sistem (client-side).
// Semua pengaturan dapat diekspor / diimpor sebagai JSON.

const KEY = "admin_settings_v1";

export type SystemSettings = {
  village: {
    name: string;
    head: string; // Kepala Desa
    secretary: string;
    code: string; // kode desa
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    district: string;
    regency: string;
    province: string;
    postal_code: string;
    logo_url: string;
  };
  branding: {
    primary_color: string; // hex
    accent_color: string;
    site_title: string;
    tagline: string;
    favicon_url: string;
  };
  notifications: {
    wa_enabled: boolean;
    fonnte_token: string;
    sender_name: string;
    notify_on_submit: boolean;
    notify_on_verify: boolean;
    notify_on_approve: boolean;
    notify_on_reject: boolean;
    template_submit: string;
    template_approve: string;
    template_reject: string;
  };
  signature: {
    signer_name: string; // Pejabat penandatangan
    signer_title: string;
    require_qr: boolean;
    qr_secret: string;
    sign_image_url: string;
  };
  surat: {
    prefix_no: string; // contoh: "470"
    use_yearly_reset: boolean;
    auto_archive: boolean;
    auto_archive_days: number;
    require_attachment: boolean;
    allowed_types: string[];
    max_file_mb: number;
  };
  security: {
    session_timeout_min: number;
    require_strong_password: boolean;
    enable_2fa: boolean;
    login_attempts: number;
    audit_log: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    sidebar_compact: boolean;
    show_announcement_bar: boolean;
    announcement_text: string;
  };
  backup: {
    auto_backup: boolean;
    interval_hours: number;
    last_backup_at?: string;
  };
};

export const DEFAULT_SETTINGS: SystemSettings = {
  village: {
    name: "Desa Seruni Mumbul",
    head: "H. Sumardi, S.Sos.",
    secretary: "Lalu Ahmad",
    code: "5203012001",
    phone: "+62 812-3456-7890",
    whatsapp: "6281234567890",
    email: "info@serunimumbul.desa.id",
    address: "Jl. Raya Pringgabaya No. 88",
    district: "Pringgabaya",
    regency: "Lombok Timur",
    province: "Nusa Tenggara Barat",
    postal_code: "83654",
    logo_url: "",
  },
  branding: {
    primary_color: "#0f7a4a",
    accent_color: "#c79a3a",
    site_title: "Sistem Informasi Desa",
    tagline: "Bersama membangun desa yang mandiri, sejahtera, dan berbudaya.",
    favicon_url: "",
  },
  notifications: {
    wa_enabled: true,
    fonnte_token: "", // Token asli dibaca dari VITE_FONNTE_KEY (env var) — tidak disimpan di settings
    sender_name: "Pemdes Seruni Mumbul",
    notify_on_submit: true,
    notify_on_verify: true,
    notify_on_approve: true,
    notify_on_reject: true,
    template_submit:
      "Halo {nama}, pengajuan {jenis_surat} ({no}) telah kami terima. Mohon menunggu proses verifikasi.",
    template_approve:
      "Halo {nama}, surat {jenis_surat} ({no}) telah disetujui dan ditandatangani digital. Silakan ambil/unduh dokumen Anda.",
    template_reject:
      "Halo {nama}, mohon maaf pengajuan {jenis_surat} ({no}) ditolak. Alasan: {alasan}",
  },
  signature: {
    signer_name: "H. Sumardi, S.Sos.",
    signer_title: "Kepala Desa Seruni Mumbul",
    require_qr: true,
    qr_secret: "SERUNI-MUMBUL-2026",
    sign_image_url: "",
  },
  surat: {
    prefix_no: "470",
    use_yearly_reset: true,
    auto_archive: true,
    auto_archive_days: 30,
    require_attachment: false,
    allowed_types: ["pdf", "jpg", "jpeg", "png"],
    max_file_mb: 5,
  },
  security: {
    session_timeout_min: 60,
    require_strong_password: true,
    enable_2fa: false,
    login_attempts: 5,
    audit_log: true,
  },
  appearance: {
    theme: "light",
    sidebar_compact: false,
    show_announcement_bar: false,
    announcement_text: "Pelayanan tatap muka: Senin–Jumat, 08.00–15.00 WITA.",
  },
  backup: {
    auto_backup: false,
    interval_hours: 24,
  },
};

export function getSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SystemSettings>;
    // Deep merge dengan default supaya field baru tidak hilang.
    return {
      village: { ...DEFAULT_SETTINGS.village, ...(parsed.village ?? {}) },
      branding: { ...DEFAULT_SETTINGS.branding, ...(parsed.branding ?? {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
      signature: { ...DEFAULT_SETTINGS.signature, ...(parsed.signature ?? {}) },
      surat: { ...DEFAULT_SETTINGS.surat, ...(parsed.surat ?? {}) },
      security: { ...DEFAULT_SETTINGS.security, ...(parsed.security ?? {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance ?? {}) },
      backup: { ...DEFAULT_SETTINGS.backup, ...(parsed.backup ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SystemSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetSettings() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/* ---------- Backup helpers ---------- */
const BACKUP_KEYS = [
  "e_surat_records",
  "e_surat_archive",
  "e_surat_penduduk",
  "admin_users",
  "admin_settings_v1",
];

export function exportFullBackup(): string {
  const data: Record<string, unknown> = {};
  if (typeof window !== "undefined") {
    BACKUP_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) data[k] = JSON.parse(v);
    });
  }
  return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data }, null, 2);
}

export function importFullBackup(json: string): { ok: boolean; message: string } {
  try {
    const parsed = JSON.parse(json) as { data?: Record<string, unknown> };
    if (!parsed.data) return { ok: false, message: "Format backup tidak dikenali" };
    if (typeof window === "undefined") return { ok: false, message: "Tidak tersedia di SSR" };
    Object.entries(parsed.data).forEach(([k, v]) => {
      if (BACKUP_KEYS.includes(k)) {
        localStorage.setItem(k, JSON.stringify(v));
      }
    });
    return { ok: true, message: "Backup berhasil dipulihkan" };
  } catch (e) {
    return { ok: false, message: `Gagal: ${(e as Error).message}` };
  }
}

export function clearAllData() {
  if (typeof window === "undefined") return;
  BACKUP_KEYS.forEach((k) => {
    if (k !== "admin_users" && k !== "admin_settings_v1") localStorage.removeItem(k);
  });
}

/* ---------- Audit log ---------- */
const AUDIT_KEY = "admin_audit_log";
export type AuditEntry = { ts: string; user: string; action: string; detail?: string };
export function logAudit(user: string, action: string, detail?: string) {
  if (typeof window === "undefined") return;
  const cur = JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]") as AuditEntry[];
  cur.unshift({ ts: new Date().toISOString(), user, action, detail });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(cur.slice(0, 500)));
}
export function listAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]") as AuditEntry[];
}
export function clearAudit() {
  if (typeof window !== "undefined") localStorage.removeItem(AUDIT_KEY);
}
