// ============================================================
//
// settings-store.ts — COMPLETE REBUILD
//
// DATA FLOW (Supabase-first, no localStorage persist):
//
//   DATABASE TABLE: app_settings (key, value jsonb, updated_at, updated_by)
//
//   ┌─── initSettingsStore() [ASYNC, awaited at app start] ───┐
//   │  1. Supabase → value jsonb                               │
//   │  2. [fallback] IndexedDB "settings"/"main"              │
//   │  3. [fallback] DEFAULT_SETTINGS                          │
//   │  → sets: _settingsData + Zustand + IDB                   │
//   └─────────────────────────────────────────────────────────┘
//                          ↓
//   ┌─── getSettings() [SYNC, instant] ───────────────────────┐
//   │  returns _settingsData — always correct after init       │
//   └─────────────────────────────────────────────────────────┘
//                          ↓
//   ┌─── saveSettings() ──────────────────────────────────────┐
//   │  1. IndexedDB  (synchronous write, primary)             │
//   │  2. Supabase   (upsert, non-blocking)                    │
//   │  3. _settingsData (update sync — instant for render)     │
//   │  4. Zustand    (reactive update for SettingsPanel)       │
//   └─────────────────────────────────────────────────────────┘
//
// ============================================================

import { idbGet, idbPut, idbGetAll, idbDelete, idbExportAll, idbImportAll } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { generateId } from "@/lib/utils";
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────────────────────

export type KopLineConfig = {
  id: string;
  label: string;
  text: string;
  font_size: number;
  bold: boolean;
  italic: boolean;
};

export type VillageStat = {
  label: string;
  value: string;
  icon: string;
  color: string;
};

export type WilayahConfig = {
  selected_kode: string;
  address: string;
  postal_code: string;
  default_rt: string;
  default_rw: string;
  province?: string;
  regency?: string;
  district?: string;
  village: string;
  village_code: string;
  dusun_list: string[];
};

export type SystemSettings = {
  wilayah: WilayahConfig;
  village: {
    name: string;
    head: string;
    secretary: string;
    code: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    district: string;
    regency: string;
    province: string;
    postal_code: string;
    logo_url: string;
    logo_storage_path?: string;
    consultants?: Array<{ name: string; role: string; schedule: string; whatsapp: string }>;
  };
  branding: {
    primary_color: string;
    accent_color: string;
    site_title: string;
    tagline: string;
    favicon_url: string;
    favicon_storage_path?: string;
  };
  content: {
    about_text: string;
    vision: string;
    mission: string[];
    stats: VillageStat[];
  };
  social: {
    facebook: string;
    instagram: string;
    youtube: string;
    twitter: string;
    website: string;
  };
  notifications: {
    wa_enabled: boolean;
    fonnte_token: string;
    notify_on_submit: boolean;
    notify_on_verify: boolean;
    notify_on_approve: boolean;
    notify_on_reject: boolean;
    template_submit: string;
    template_approve: string;
    template_reject: string;
  };
  signature: {
    signer_name: string;
    signer_title: string;
    sekdes_name: string;
    require_qr: boolean;
    qr_secret: string;
    sign_image_url: string;
    sign_image_storage_path?: string;
  };
  surat: {
    prefix_no: string;
    use_yearly_reset: boolean;
    auto_archive: boolean;
    auto_archive_days: number;
    require_attachment: boolean;
    allowed_types: string[];
    max_file_mb: number;
  };
  nomor: { inisialJabatan: string; inisialDesa: string; lastUrut?: number; lastYear?: number };
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
  kopSurat: {
    logo_kab_url: string;
    logo_desa_url: string;
    logo_kab_storage_path?: string;
    logo_desa_storage_path?: string;
    logo_position: "separate" | "left" | "center" | "right";
    kop_lines: KopLineConfig[];
    header_bar_color: string;
    footer_enabled: boolean;
    footer_text: string;
    signature_style: "text" | "image";
  };
  pages: Record<string, PageConfig>;
  backup: { auto_backup: boolean; interval_hours: number; last_backup_at?: string };
  pdfLayout: {
    margin: { top: string; bottom: string; left: string; right: string };
    font: { family: string; size: string; lineHeight: string };
    signaturePos: { qrWidth: string; marginY: string };
    body_font: string;
    body_font_size: number;
  };
};

export type PageConfig = {
  enabled: boolean;
  title: string;
  description: string;
  image_url: string;
  image_storage_path?: string;
  custom_content: string;
  extras: Record<string, string>;
};

// ── Default Settings ──────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: SystemSettings = {
  wilayah: {
    selected_kode: "5203012001",
    address: "Jl. Raya Pringgabaya No. 88",
    postal_code: "83654",
    default_rt: "001",
    default_rw: "001",
    province: "Provinsi",
    regency: "Kabupaten",
    district: "Kecamatan",
    village: "Nama Desa",
    village_code: "0000000000",
    dusun_list: ["Dusun 1", "Dusun 2"],
  },
  village: {
    name: "Nama Desa",
    head: "-",
    secretary: "-",
    code: "0000000000",
    phone: "-",
    whatsapp: "-",
    email: "kontak@desa.id",
    address: "-",
    district: "Kecamatan",
    regency: "Kabupaten",
    province: "Provinsi",
    postal_code: "00000",
    logo_url: "",
    consultants: [],
  },
  branding: {
    primary_color: "#E37222", // Brand: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
    accent_color: "#078898",
    site_title: "Sistem Informasi Desa",
    tagline: "Bersama membangun desa yang mandiri, sejahtera, dan berbudaya.",
    favicon_url: "",
    favicon_storage_path: "",
  },
  content: {
    about_text: "",
    vision: "",
    mission: [],
    stats: [],
  },
  social: { facebook: "", instagram: "", youtube: "", twitter: "", website: "" },
  notifications: {
    wa_enabled: false,
    fonnte_token: "",
    notify_on_submit: true,
    notify_on_verify: true,
    notify_on_approve: true,
    notify_on_reject: true,
    template_submit: "",
    template_approve: "",
    template_reject: "",
  },
  signature: {
    signer_name: "",
    signer_title: "",
    sekdes_name: "",
    require_qr: false,
    qr_secret: "",
    sign_image_url: "",
  },
  surat: {
    prefix_no: "474",
    use_yearly_reset: true,
    auto_archive: true,
    auto_archive_days: 30,
    require_attachment: false,
    allowed_types: ["jpg", "jpeg", "png", "pdf"],
    max_file_mb: 5,
  },
  nomor: { inisialJabatan: "", inisialDesa: "", lastUrut: 0, lastYear: new Date().getFullYear() },
  security: {
    session_timeout_min: 30,
    require_strong_password: true,
    enable_2fa: false,
    login_attempts: 5,
    audit_log: true,
  },
  appearance: {
    theme: "system",
    sidebar_compact: false,
    show_announcement_bar: false,
    announcement_text: "",
  },
  kopSurat: {
    logo_kab_url: "",
    logo_desa_url: "",
    logo_position: "separate",
    kop_lines: [],
    header_bar_color: "#E37222",
    footer_enabled: false,
    footer_text: "",
    signature_style: "text",
  },
  pages: {},
  backup: { auto_backup: false, interval_hours: 24 },
  pdfLayout: {
    margin: { top: "20mm", bottom: "15mm", left: "20mm", right: "15mm" },
    font: { family: "Arial, sans-serif", size: "11pt", lineHeight: "1.5" },
    signaturePos: { qrWidth: "2.5cm", marginY: "3cm" },
    body_font: "Arial, sans-serif",
    body_font_size: 11,
  },
};

// ── Module-Level State (Signal Pattern) ───────────────────────────────────────
//
// _settingsData = SINGLE SOURCE OF TRUTH for all synchronous reads.
// Survives HMR via JS module evaluation order.
// Updated synchronously inside saveSettings() and _doInit().
// getSettings() ALWAYS returns this — no timing issues.

let _settingsData: SystemSettings = { ...DEFAULT_SETTINGS };
let _initialized = false;
let _initPromise: Promise<void> | null = null;

// ── Deep Merge ────────────────────────────────────────────────────────────────

function deepMerge(saved: Partial<SystemSettings>): SystemSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    wilayah: { ...DEFAULT_SETTINGS.wilayah, ...(saved.wilayah ?? {}) },
    village: { ...DEFAULT_SETTINGS.village, ...(saved.village ?? {}) },
    branding: { ...DEFAULT_SETTINGS.branding, ...(saved.branding ?? {}) },
    content: { ...DEFAULT_SETTINGS.content, ...(saved.content ?? {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(saved.social ?? {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(saved.notifications ?? {}) },
    signature: { ...DEFAULT_SETTINGS.signature, ...(saved.signature ?? {}) },
    surat: { ...DEFAULT_SETTINGS.surat, ...(saved.surat ?? {}) },
    nomor: { ...DEFAULT_SETTINGS.nomor, ...(saved.nomor ?? {}) },
    security: { ...DEFAULT_SETTINGS.security, ...(saved.security ?? {}) },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...(saved.appearance ?? {}) },
    kopSurat: { ...DEFAULT_SETTINGS.kopSurat, ...(saved.kopSurat ?? {}) },
    pdfLayout: { ...DEFAULT_SETTINGS.pdfLayout, ...(saved.pdfLayout ?? {}) },
    pages: (() => {
      const savedPages = saved.pages ?? {};
      const result: Record<string, PageConfig> = {};
      for (const [k, def] of Object.entries(DEFAULT_SETTINGS.pages)) {
        result[k] = { ...def, ...(savedPages[k] ?? {}) };
      }
      return result;
    })(),
    backup: { ...DEFAULT_SETTINGS.backup, ...(saved.backup ?? {}) },
  };
}

// ── Zustand Store (reactive UI only — NOT source of truth) ─────────────────────

interface SettingsState extends SystemSettings {
  selectedVillageKode: string;
  _isLoaded: boolean; // true after initSettingsStore() completes
  _syncFromData: (data: SystemSettings) => void;
}

export const useSettings = create<SettingsState>()((set) => ({
  // Start with DEFAULT_SETTINGS — will be synced from _settingsData after init
  ...DEFAULT_SETTINGS,
  selectedVillageKode: "",
  _isLoaded: false,
  _syncFromData: (data) =>
    set({
      ...DEFAULT_SETTINGS,
      ...data,
      selectedVillageKode: data.wilayah?.village_code ?? "",
      _isLoaded: true,
    }),
}));

function _syncZustand(data: SystemSettings): void {
  useSettings.getState()._syncFromData(data);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * getSettings() — SYNCHRONOUS, instant access to current settings.
 *
 * Used by HeroSection, route head(), Navbar — called on every render.
 * Always returns _settingsData which is set during initSettingsStore().
 *
 * IMPORTANT: initSettingsStore() MUST be awaited before first render.
 * In this app, it IS awaited via initAllStores() in __root.tsx.
 */
export function getSettings(): SystemSettings {
  return _settingsData;
}

export function getWilayah(): WilayahConfig {
  return _settingsData.wilayah;
}

/**
 * initSettingsStore() — Call ONCE at app start, AWAITED before first render.
 * Reads from: Supabase → IndexedDB → DEFAULT_SETTINGS
 *
 * After call: _settingsData has real data, getSettings() returns it.
 */
export async function initSettingsStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = _doInit();
  await _initPromise;
}

async function _doInit(): Promise<void> {
  try {
    // ── 1. Try IndexedDB first (fast offline cache) ─────────────────────────
    let fromIDB = false;
    let raw = await idbGet<{ id: string } & Partial<SystemSettings>>("settings", "main");

    // ── 2. Supabase — override with latest cloud data ───────────────────────
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data: remote, error } = await sb
          .from("app_settings")
          .select("value")
          .eq("key", "main_settings")
          .maybeSingle();

        if (!error && remote?.value) {
          // Cloud data takes priority over IndexedDB
          raw = { id: "main", ...(remote.value as Partial<SystemSettings>) };
          console.info("[settings] Loaded from Supabase");
        } else if (!raw) {
          // No cloud, no IDB → load IDB
          console.info("[settings] Loaded from IndexedDB (no cloud data)");
          fromIDB = true;
        }
      }
    }

    // ── 3. Resolve settings data ───────────────────────────────────────────
    const data = raw ? deepMerge(raw as Partial<SystemSettings>) : { ...DEFAULT_SETTINGS };

    // Set synchronous — HeroSection reads this on next render
    _settingsData = data;
    _initialized = true;

    // Sync Zustand so SettingsPanel sees real data
    _syncZustand(data);

    console.info(`[settings] Ready — loaded=${!fromIDB ? "Supabase" : "IDB"}`);
  } catch (e) {
    console.warn("[settings] Init failed, using defaults:", e);
    _settingsData = { ...DEFAULT_SETTINGS };
    _initialized = true;
    _syncZustand(_settingsData);
  }
}

/**
 * saveSettings() — Save to IndexedDB (primary) + Supabase (cloud).
 *
 * Writes _settingsData SYNCHRONOUSLY so HeroSection renders correctly
 * on the SAME tick as the save completes (no await needed for render).
 */
export async function saveSettings(s: SystemSettings, updatedBy?: string): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Write to IndexedDB (synchronous, primary)
  const clean = JSON.parse(JSON.stringify(s)) as SystemSettings;
  await idbPut("settings", { id: "main", ...clean });
  console.info("[settings] Written to IndexedDB — idbPut done");

  // Only sync Zustand if data actually changed — skip identical saves
  const prevStr = JSON.stringify(_settingsData);
  const nextStr = JSON.stringify(clean);
  if (prevStr !== nextStr) {
    _settingsData = clean;
    _syncZustand(clean);
  }

  // Invalidate village cache so getVillage() picks up new settings
  try {
    const { invalidateVillageCache } = await import("@/lib/village-dynamic");
    invalidateVillageCache();
  } catch {
    // non-critical
  }

  // 3. Supabase write-behind (non-blocking)
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      sb.from("app_settings")
        .upsert({
          key: "main_settings",
          value: clean,
          updated_by: updatedBy || "system",
          updated_at: new Date().toISOString(),
        })
        .then(({ error }: { error: unknown }) => {
          if (error) console.warn("[settings] Cloud upsert failed:", error);
          else console.info("[settings] Cloud upsert done");
        });
    }
  }

  // 4. Broadcast to other tabs
  try {
    const { broadcastSettingsSave } = await import("@/lib/idb-sync");
    broadcastSettingsSave();
  } catch {
    // non-critical
  }

  console.info("[settings] Saved successfully");
}

export function resetSettings(): void {
  _settingsData = { ...DEFAULT_SETTINGS };
  _initialized = false;
  _initPromise = null;
  _syncZustand(_settingsData);
  idbDelete("settings", "main").catch(console.warn);
}

// ── Backup helpers ─────────────────────────────────────────────────────────────

export async function getBackupList(): Promise<{ key: string; timestamp: number }[]> {
  const all = await idbGetAll<{ id: string } & Partial<SystemSettings>>("settings");
  return all
    .filter((r) => r.id.startsWith("backup_"))
    .map((r) => ({
      key: r.id,
      timestamp: parseInt(r.id.replace("backup_", ""), 10) || 0,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function restoreBackup(backupKey: string): Promise<void> {
  const backup = await idbGet<{ id: string } & Partial<SystemSettings>>("settings", backupKey);
  if (!backup) throw new Error(`Backup "${backupKey}" tidak ditemukan`);
  const { id: _id, ...rest } = backup;
  const merged = deepMerge(rest);
  await saveSettings(merged);
}

export async function cleanupOldBackups(): Promise<void> {
  const all = await idbGetAll<{ id: string } & Partial<SystemSettings>>("settings");
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const record of all) {
    if (record.id.startsWith("backup_")) {
      const ts = parseInt(record.id.replace("backup_", ""), 10);
      if (ts < oneDayAgo) await idbDelete("settings", record.id);
    }
  }
}

export async function exportFullBackup(): Promise<string> {
  const data = await idbExportAll();
  return JSON.stringify({ version: 3, exported_at: new Date().toISOString(), ...data }, null, 2);
}

export async function importFullBackup(json: string): Promise<{ ok: boolean; message: string }> {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const result = await idbImportAll(parsed);
    if (result.ok) {
      _initialized = false;
      _initPromise = null;
      await initSettingsStore();
    }
    return result;
  } catch (e) {
    return { ok: false, message: `Gagal: ${(e as Error).message}` };
  }
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  import("@/lib/idb-store").then(({ idbClear }) => {
    (["penduduk", "users", "esurat_records", "esurat_archive", "templates"] as const).forEach((s) =>
      idbClear(s).catch(console.warn),
    );
  });
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  ts: string;
  user: string;
  action: string;
  detail?: string;
};

export async function logAudit(user: string, action: string, detail?: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const entry: AuditEntry = {
      id: generateId(),
      ts: new Date().toISOString(),
      user,
      action,
      detail,
    };

    const { idbPut, idbCount } = await import("@/lib/idb-store");
    await idbPut("audit_log", entry);

    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        sb.from("audit_log")
          .insert({
            id: entry.id,
            username: entry.user,
            action: entry.action,
            detail: entry.detail || null,
            // user_id: uuid FK → admin_users(id). Insert as null explicitly
            // agar tidak violates FK constraint. RLS policy mengizinkan public insert.
            user_id: undefined,
            ip_address: null,
            created_at: entry.ts,
          })
          .then(({ error }: { error: unknown }) => {
            if (error) console.warn("[settings] Audit insert error:", error);
          });
      }
    }

    // Defer audit trim to background scheduler — never block the caller
    scheduleAuditTrim();
  } catch {
    /* non-blocking */
  }
}

// Background audit trim — runs once per session, not on every logAudit call
let _auditTrimScheduled = false;
function scheduleAuditTrim() {
  if (_auditTrimScheduled) return;
  _auditTrimScheduled = true;
  setTimeout(async () => {
    try {
      const { idbCount, idbGetAll, idbReplaceAll } = await import("@/lib/idb-store");
      const count = await idbCount("audit_log");
      if (count > 500) {
        const all = await idbGetAll<AuditEntry>("audit_log");
        const sorted = all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 500);
        await idbReplaceAll("audit_log", sorted);
      }
    } catch {
      /* silent */
    } finally {
      _auditTrimScheduled = false; // allow next session to re-schedule
    }
  }, 5000); // 5s debounce — batch multiple logs within same session
}

export async function listAudit(): Promise<AuditEntry[]> {
  if (typeof window === "undefined") return [];
  const { idbGetAll } = await import("@/lib/idb-store");
  return (await idbGetAll<AuditEntry>("audit_log")).sort((a, b) => b.ts.localeCompare(a.ts));
}

export async function clearAudit(): Promise<void> {
  const { idbClear } = await import("@/lib/idb-store");
  await idbClear("audit_log");
}
