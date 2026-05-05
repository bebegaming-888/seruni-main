// Pusat penyimpanan pengaturan sistem (client-side).
// Semua pengaturan dapat diekspor / diimpor sebagai JSON.

const KEY = "admin_settings_v1";

export type HeroSlide = {
  id: string;
  image_url: string; // URL atau base64
  alt: string;
  enabled: boolean;
};

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
  nomor: {
    inisialJabatan: string; // contoh: "KDS" (Kepala Desa)
    inisialDesa: string; // contoh: "SRMB" (Seruni Mumbul)
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
  hero: {
    marquee_text: string;
    marquee_enabled: boolean;
    slider_enabled: boolean;
    video_url: string; // YouTube embed or direct video URL
    video_enabled: boolean;
    video_fallback_image: string; // base64 atau URL gambar fallback saat video tidak aktif
    weather_enabled: boolean;
    weather_label: string; // contoh "Pringgabaya · 28°C · Cerah"
    slides: HeroSlide[];
  };
  kopSurat: {
    logo_url: string;
    logo_position: "left" | "center" | "right";
    kop_line: string; // nama lengkap institutions
    kop_sub: string; // sub-institution text
    kop_address: string;
    kop_phone: string;
    kop_email: string;
    kop_website: string;
    header_bar_color: string;
    footer_enabled: boolean;
    footer_text: string;
    signature_style: "text" | "image";
  };
  pages: Record<string, PageConfig>;
  backup: {
    auto_backup: boolean;
    interval_hours: number;
    last_backup_at?: string;
  };
};

export type PageConfig = {
  enabled: boolean;
  title: string;
  description: string;
  image_url: string;
  custom_content: string; // HTML atau teks bebas
  /** Kolom ekstra per-halaman */
  extras: Record<string, string>;
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
  nomor: {
    inisialJabatan: "KDS",
    inisialDesa: "SRMB",
  },
  security: {
    session_timeout_min: 60,
    require_strong_password: true,
    enable_2fa: false,
    login_attempts: 5,
    audit_log: true,
  },
  appearance: {
    theme: "light" as const,
    sidebar_compact: false,
    show_announcement_bar: false,
    announcement_text: "Pelayanan tatap muka: Senin–Jumat, 08.00–15.00 WITA.",
  },
  hero: {
    marquee_text:
      "Selamat datang di Portal Resmi Desa Seruni Mumbul · Pelayanan publik transparan · Mari membangun desa bersama",
    marquee_enabled: true,
    slider_enabled: true,
    video_url: "",
    video_enabled: false,
    video_fallback_image: "",
    weather_enabled: true,
    weather_label: "Pringgabaya · 28°C · Cerah",
    slides: [
      { id: "s1", image_url: "/images/hero-village.jpg", alt: "Pemandangan Desa", enabled: true },
      {
        id: "s2",
        image_url: "/images/wisata-airterjun.jpg",
        alt: "Wisata Air Terjun",
        enabled: true,
      },
      { id: "s3", image_url: "/images/wisata-pantai.jpg", alt: "Pantai", enabled: true },
      { id: "s4", image_url: "/images/wisata-budaya.jpg", alt: "Budaya Sasak", enabled: true },
      { id: "s5", image_url: "/images/galeri-1.jpg", alt: "Galeri Desa", enabled: true },
    ],
  },
  kopSurat: {
    logo_url: "",
    logo_position: "left" as const,
    kop_line: "PEMERINTAH KABUPATEN LOMBOK TIMUR",
    kop_sub: "KECAMATAN PRINGGABAYA\nDESA SERUNI MUMBUL",
    kop_address: "Jl. Raya Pringgabaya No. 88, Seruni Mumbul, Lombok Timur, NTB 83654",
    kop_phone: "Telepon: (0376) 123-4567",
    kop_email: "Email: info@serunimumbul.desa.id",
    kop_website: "Website: https://serunimumbul.desa.id",
    header_bar_color: "#0f7a4a",
    footer_enabled: true,
    footer_text: "Sistem Informasi Desa Seruni Mumbul · Hak Cipta Dilindungi Undang-Undang",
    signature_style: "text" as const,
  },
  pages: {
    "/profil/desa": {
      enabled: true,
      title: "Profil Desa Seruni Mumbul",
      description: "Kenali lebih dekat sejarah, visi misi, dan potensi desa kami.",
      image_url: "",
      custom_content: "",
      extras: { sejarah: "", visi: "", misi: "" },
    },
    "/profil/perangkat": {
      enabled: true,
      title: "Struktur Perangkat Desa",
      description: "Pengurus dan staff Pemerintah Desa Seruni Mumbul.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/profil/lembaga": {
      enabled: true,
      title: "Lembaga Desa",
      description: "BPD, LPM, PKK, Karang Taruna, dan kelompok lainnya.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/informasi/berita": {
      enabled: true,
      title: "Berita Desa",
      description: "Kabar terkini dari Pemerintah Desa Seruni Mumbul.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/informasi/agenda": {
      enabled: true,
      title: "Agenda Kegiatan",
      description: "Jadwal kegiatan mendatang di Desa Seruni Mumbul.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/informasi/galeri": {
      enabled: true,
      title: "Galeri Foto",
      description: "Dokumentasi kegiatan dan potensi desa.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/informasi/pengumuman": {
      enabled: true,
      title: "Pengumuman",
      description: "Informasi penting untuk warga.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/informasi/idm": {
      enabled: true,
      title: "Indeks Desa Membangun",
      description: "Data dan skor IDM Desa Seruni Mumbul.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/laporan/rpjmdes": {
      enabled: true,
      title: "RPJMDes",
      description: "Rencana Pembangunan Jangka Menengah Desa.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/laporan/rkpdes": {
      enabled: true,
      title: "RKPDes",
      description: "Rencana Kerja Pemerintah Desa.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/laporan/apbdes": {
      enabled: true,
      title: "APBDes",
      description: "Anggaran Pendapatan dan Belanja Desa.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/laporan/realisasi": {
      enabled: true,
      title: "Realisasi Anggaran",
      description: "Laporan realisasi penggunaan APBDes.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/laporan/pbb": {
      enabled: true,
      title: "PBB-P2",
      description: "Pajak Bumi dan Bangunan Pedesaan.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/wisata/destinasi": {
      enabled: true,
      title: "Destinasi Wisata",
      description: "Tempat wisata alam dan budaya di Seruni Mumbul.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/ekonomi/bumdes": {
      enabled: true,
      title: "BUMDes Seruni Mumbul",
      description: "Badan Usaha Milik Desa untuk pemberdayaan ekonomi.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
    "/lainnya/monografi": {
      enabled: true,
      title: "Monografi Desa",
      description: "Data lengkap profil dan statistik desa.",
      image_url: "",
      custom_content: "",
      extras: {},
    },
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
      nomor: { ...DEFAULT_SETTINGS.nomor, ...(parsed.nomor ?? {}) },
      security: { ...DEFAULT_SETTINGS.security, ...(parsed.security ?? {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance ?? {}) },
      backup: { ...DEFAULT_SETTINGS.backup, ...(parsed.backup ?? {}) },
      hero: { ...DEFAULT_SETTINGS.hero, ...(parsed.hero ?? {}) },
      kopSurat: { ...DEFAULT_SETTINGS.kopSurat, ...(parsed.kopSurat ?? {}) },
      pages: {
        ...DEFAULT_SETTINGS.pages,
        ...(parsed.pages ?? {}),
      } as Record<string, PageConfig>,
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
