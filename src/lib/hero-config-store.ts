/**
 * hero-config-store.ts — Zustand + IndexedDB + Supabase
 *
 * Single source of truth untuk Hero Landing Page configuration.
 * LANDING PAGE = Video Background + Marquee (tidak ada image slider).
 *
 * Data flow:
 *   initHeroConfig() → IndexedDB cache → Supabase fetch → _data + Zustand
 *   getHeroConfig()  → _data (sync, instant)
 *   saveHeroConfig() → idbPut → Supabase → _data + Zustand
 *
 * PRIORITAS DATA (paling baru menang):
 *   1. IndexedDB        ← selalu tulis ke sini duluan
 *   2. _data             ← module-level cache, synchronous read
 *   3. Supabase          ← sync, tapi HANYA jika updated_at lebih baru dari IDB
 *   4. Default           ← JIKA semua kosong
 */

import { create } from "zustand";
import { idbGet, idbPut, idbDelete } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

// ── ID & Key Constants ─────────────────────────────────────────────────────────

const ID_KEY = "00000000-0000-0000-0000-000000000001";
const IDB_STORE = "settings";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarqueeLine = {
  id: string;
  text: string;
  enabled: boolean;
};

export type MarqueeStyle = {
  font_family: string;
  font_weight: "normal" | "bold";
  font_style: "normal" | "italic";
  color: string;
  opacity: number; // 0-100
  position: "top" | "center" | "bottom";
};

export type HeroConfig = {
  id: string;
  active: boolean;

  // ── Video Background ─────────────────────────────────────────────────────
  video_url: string;
  video_storage_path?: string;
  video_enabled: boolean;
  video_fallback_image: string;
  video_fallback_storage_path?: string;
  video_muted: boolean;
  video_loop: boolean;
  video_autoplay: boolean;

  // ── Marquee Text ──────────────────────────────────────────────────────────
  marquee_enabled: boolean;
  marquee_text: string; // legacy — tidak dipakai di UI baru
  marquee_lines: MarqueeLine[];
  marquee_font_size: string;
  marquee_speed: number; // seconds for full cycle
  marquee_style: MarqueeStyle;

  // ── Weather Badge ─────────────────────────────────────────────────────────
  weather_enabled: boolean;
  weather_label: string;

  // ── Layout ───────────────────────────────────────────────────────────────
  overlay_opacity: number; // 0-100
  show_kepala_desa: boolean;

  // ── Metadata ────────────────────────────────────────────────────────────
  created_at: string;
  updated_at: string;
  /** Flag sync dari Supabase: undefined=belum tahu, true=sukses, false=gagal */
  cloudSynced?: boolean;
};

// ── ID Generator ─────────────────────────────────────────────────────────────

function _genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Default Marquee Lines (Anti-Empty Fallback) ────────────────────────────────
// Inject otomatis saat marquee_lines kosong ATAU semua baris disabled/empty.
// Admin dapat menyimpan perubahan tanpa takut di-overwrite setiap save.

const DEFAULT_MARQUEE_LINES: MarqueeLine[] = [
  {
    id: _genId(),
    text: "Selamat Datang di Portal Resmi Desa Seruni Mumbul",
    enabled: true,
  },
  {
    id: _genId(),
    text: "Melayani dengan Sepenuh Hati",
    enabled: true,
  },
];

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  id: ID_KEY,
  active: true,

  video_url: "",
  video_storage_path: undefined,
  video_enabled: false,
  video_fallback_image: "",
  video_fallback_storage_path: undefined,
  video_muted: true,
  video_loop: true,
  video_autoplay: true,

  marquee_enabled: true,
  marquee_text: "",
  marquee_lines: DEFAULT_MARQUEE_LINES,
  marquee_font_size: "clamp(48px, 11vw, 200px)",
  marquee_speed: 20,
  marquee_style: {
    font_family: "Fraunces, serif",
    font_weight: "bold",
    font_style: "italic",
    color: "#ffffff",
    opacity: 30,
    position: "center",
  },

  weather_enabled: false,
  weather_label: "Desa · 28°C · Cerah",

  overlay_opacity: 60,
  show_kepala_desa: true,

  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Module-Level State ─────────────────────────────────────────────────────────

let _data: HeroConfig = { ...DEFAULT_HERO_CONFIG };
let _initialized = false;
let _initPromise: Promise<void> | null = null;

/** HMR guard: sessionStorage survives hot reload, persists init state across HMR events */
const _HMR_GUARD = "__hero_hmr_done__";

/** ID key constant hoisted here so both initHeroConfig() and _doInit() can reference it */
const _ID_KEY = "00000000-0000-0000-0000-000000000001";

// ── Zustand Store (reactive UI) ────────────────────────────────────────────────

interface HeroState {
  config: HeroConfig;
  _isLoaded: boolean;
  _sync: (config: HeroConfig) => void;
}

export const useHeroConfig = create<HeroState>()((set) => ({
  config: { ...DEFAULT_HERO_CONFIG },
  _isLoaded: false,
  _sync: (config) => set({ config, _isLoaded: true }),
}));

function _syncZustand(config: HeroConfig): void {
  useHeroConfig.getState()._sync(config);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Synchronous read — call after initHeroConfig() completes */
export function getHeroConfig(): HeroConfig {
  return _data;
}

/** Async init — call once at app start, BEFORE first render */
export async function initHeroConfig(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  // HMR guard: if sessionStorage says we've already done a full init this session,
  // skip the heavy work and restore state from IndexedDB immediately.
  // This prevents DEFAULT_HERO_CONFIG from overwriting real saved settings on every hot reload.
  try {
    if (sessionStorage.getItem(_HMR_GUARD) === "1") {
      const cached = await idbGet<HeroConfig>(IDB_STORE, _ID_KEY);
      if (cached && cached.id) {
        const resolved = _ensureMarqueeDefaults(cached);
        _data = resolved;
        _initialized = true;
        _syncZustand(resolved);
        console.info("[hero] HMR restore from IDB");
        return;
      }
    }
  } catch {
    // sessionStorage not available — proceed normally
  }

  _initPromise = _doInit();
  await _initPromise;

  // Mark session as initialized so HMR events can fast-path restore from IDB
  try {
    sessionStorage.setItem(_HMR_GUARD, "1");
  } catch {
    // non-critical
  }
}

async function _doInit(): Promise<void> {
  // HMR double-guard: if sessionStorage says we've already initialized this session,
  // and IDB has real data, use it immediately without hitting the network.
  try {
    if (sessionStorage.getItem(_HMR_GUARD) === "1") {
      const cached = await idbGet<HeroConfig>(IDB_STORE, _ID_KEY);
      if (cached && cached.id) {
        const resolved = _ensureMarqueeDefaults(cached);
        _data = resolved;
        _initialized = true;
        _syncZustand(resolved);
        console.info("[hero] HMR restore from IDB (doInit guard)");
        return;
      }
    }
  } catch {
    // non-critical
  }

  try {
    // 1. Baca IndexedDB duluan (selalu tersedia, offline-first)
    const cached = await idbGet<HeroConfig>(IDB_STORE, ID_KEY);

    // 2. Supabase — AMBIL tapi JANGAN overwrite jika IDB lebih baru
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data: remote, error } = await sb.from("hero_config").select("*").maybeSingle();

        if (!error && remote) {
          const remoteConfig = remote as unknown as HeroConfig;

          const remoteTs = remoteConfig.updated_at
            ? new Date(remoteConfig.updated_at).getTime()
            : 0;
          const idbTs = cached?.updated_at ? new Date(cached.updated_at).getTime() : 0;

          if (remoteTs <= idbTs) {
            // IDB sama atau lebih baru dari Supabase — gunakan IDB
            console.info("[hero] IDB data is newer/equal — using IDB");
          } else {
            // Supabase lebih baru
            const resolved = _ensureMarqueeDefaults(remoteConfig);
            await idbPut(IDB_STORE, { ...resolved, id: ID_KEY });
            _data = resolved;
            _initialized = true;
            _syncZustand(resolved);
            console.info("[hero] Loaded from Supabase — cloudSynced:", resolved.cloudSynced);
            return;
          }
        }
      }
    }

    // 3. Gunakan IndexedDB (jika ada) atau default
    if (cached) {
      // Resolve marquee lines DAN save balik ke IDB agar persist
      const resolved = _ensureMarqueeDefaults(cached);
      if (resolved.marquee_lines !== cached.marquee_lines) {
        await idbPut(IDB_STORE, { ...resolved, id: ID_KEY });
      }
      _data = resolved;
      _initialized = true;
      _syncZustand(resolved);
      console.info("[hero] Loaded from IndexedDB — cloudSynced:", resolved.cloudSynced);
      return;
    }

    // 4. Last resort: default (sudah punya marquee_lines dari DEFAULT_MARQUEE_LINES)
    _data = { ...DEFAULT_HERO_CONFIG };
    _initialized = true;
    await idbPut(IDB_STORE, { ..._data, id: ID_KEY });
    _syncZustand(_data);
    console.warn("[hero] No data found, using defaults");
  } catch (e) {
    console.error("[hero] Init failed:", e);
    _data = { ...DEFAULT_HERO_CONFIG };
    _initialized = true;
    _syncZustand(_data);
  }
}

/**
 * Anti-empty marquee — HANYA untuk init path.
 * Inject default lines JIKA marquee_lines kosong atau semua disabled.
 * Dipanggil saat _doInit() load dari IDB/Supabase/Default.
 * TIDAK dipanggil saat saveHeroConfig() — agar perubahan admin tidak
 * ter-overwrite oleh regenerasi ID setiap kali save.
 */
function _ensureMarqueeDefaults(config: HeroConfig): HeroConfig {
  const hasContent = config.marquee_lines?.some((l) => l.enabled && l.text.trim());
  if (!hasContent) {
    return {
      ...config,
      marquee_lines: DEFAULT_MARQUEE_LINES.map((l) => ({
        ...l,
        id: _genId(),
      })),
    };
  }
  return config;
}

/** Save hero config — writes to IndexedDB + Supabase */
export async function saveHeroConfig(patch: Partial<HeroConfig>): Promise<void> {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();
  const ID_KEY = DEFAULT_HERO_CONFIG.id;
  const merged = { ..._data, ...patch };
  const raw = JSON.parse(JSON.stringify(merged)) as HeroConfig;

  // Anti-empty JIKA dan HANYA JIKA marquee_lines kosong setelah merge.
  // Ini memungkinkan admin menyimpan perubahan tanpa takut di-overwrite
  // oleh default setiap kali save.
  const hasContent = raw.marquee_lines?.some((l) => l.enabled && l.text.trim());
  const config = hasContent ? raw : _ensureMarqueeDefaults(raw);

  config.id = ID_KEY;
  config.updated_at = now;
  config.cloudSynced = undefined;

  // 1. IndexedDB (primary) — selalu berhasil
  await idbPut(IDB_STORE, { ...config, id: ID_KEY });

  // 2. Module state + Zustand — HeroSection langsung update
  _data = config;
  _syncZustand(config);

  // 3. Supabase upsert (non-blocking, retry 2x)
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const upsertPayload = {
        id: ID_KEY,
        active: config.active,
        video_url: config.video_url,
        video_storage_path: config.video_storage_path ?? "",
        video_enabled: config.video_enabled,
        video_fallback_image: config.video_fallback_image,
        video_fallback_storage_path: config.video_fallback_storage_path ?? "",
        video_muted: config.video_muted,
        video_loop: config.video_loop,
        video_autoplay: config.video_autoplay,
        marquee_enabled: config.marquee_enabled,
        marquee_text: config.marquee_text,
        marquee_lines: config.marquee_lines,
        marquee_font_size: config.marquee_font_size,
        marquee_speed: config.marquee_speed,
        marquee_style: config.marquee_style,
        weather_enabled: config.weather_enabled,
        weather_label: config.weather_label,
        overlay_opacity: config.overlay_opacity,
        show_kepala_desa: config.show_kepala_desa,
        created_at: config.created_at,
        updated_at: config.updated_at,
        cloud_synced: true, // snake_case untuk Supabase column
      };

      const tryUpsert = async (attempt: number): Promise<boolean> => {
        try {
          const { error } = await sb.from("hero_config").upsert(upsertPayload);
          if (error) {
            console.warn(
              `[hero] Supabase upsert attempt ${attempt} failed: ${JSON.stringify(error)}`,
            );
            return false;
          }
          return true;
        } catch (err) {
          console.warn(`[hero] Supabase upsert attempt ${attempt} exception:`, err);
          return false;
        }
      };

      // Async, non-blocking
      void (async () => {
        const ok = await tryUpsert(1);
        if (!ok) {
          await new Promise((r) => setTimeout(r, 2000));
          const ok2 = await tryUpsert(2);
          if (!ok2) {
            console.warn("[hero] Supabase upsert failed after 2 attempts — IDB is source of truth");
            _data = { ..._data, cloudSynced: false };
            await idbPut(IDB_STORE, { ..._data, id: ID_KEY });
            _syncZustand(_data);
            return;
          }
        }
        _data = { ..._data, cloudSynced: true };
        await idbPut(IDB_STORE, { ..._data, id: ID_KEY });
        _syncZustand(_data);
        console.info("[hero] Saved to Supabase");
      })();
    }
  }

  // 4. Broadcast ke tab lain
  _broadcastHeroUpdate();

  // 5. Protect dari HMR
  void _lockHeroConfig();
}

// ── Marquee Lines ────────────────────────────────────────────────────────────

function _generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Add a marquee line */
export async function addMarqueeLine(text: string): Promise<void> {
  const line: MarqueeLine = { id: _generateId(), text, enabled: true };
  await saveHeroConfig({ marquee_lines: [..._data.marquee_lines, line] });
}

/** Update a marquee line */
export async function updateMarqueeLine(id: string, patch: Partial<MarqueeLine>): Promise<void> {
  await saveHeroConfig({
    marquee_lines: _data.marquee_lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  });
}

/** Remove a marquee line */
export async function removeMarqueeLine(id: string): Promise<void> {
  await saveHeroConfig({
    marquee_lines: _data.marquee_lines.filter((l) => l.id !== id),
  });
}

// ── BroadcastChannel (cross-tab sync) ────────────────────────────────────────

let _heroChannel: BroadcastChannel | null = null;

function _getHeroChannel(): BroadcastChannel {
  if (!_heroChannel && typeof window !== "undefined") {
    _heroChannel = new BroadcastChannel("seruni-hero-config");
    _heroChannel.onmessage = (e) => {
      if (e.data?.type === "HERO_CONFIG_UPDATED") {
        const newConfig = e.data.payload as HeroConfig;
        if (newConfig.updated_at !== _data.updated_at) {
          console.info("[hero] Received update from another tab");
          _data = newConfig;
          _syncZustand(newConfig);
          void idbPut("settings", { ...newConfig, id: newConfig.id }).catch(console.warn);
        }
      }
    };
  }
  return _heroChannel!;
}

function _broadcastHeroUpdate(): void {
  try {
    _getHeroChannel().postMessage({ type: "HERO_CONFIG_UPDATED", payload: _data });
  } catch {
    try {
      const ts = Date.now().toString();
      localStorage.setItem("__hero_saved__", ts);
      localStorage.removeItem("__hero_saved__");
    } catch {
      // non-critical
    }
  }
}

// ── Lock Protection ────────────────────────────────────────────────────────────

async function _lockHeroConfig(): Promise<void> {
  try {
    const { lockSettings } = await import("@/lib/settings-lock");
    await lockSettings(
      [
        "settings",
        "berita",
        "pengumuman",
        "agenda",
        "galeri",
        "komoditas",
        "apbdes",
        "templates",
        "lembaga",
        "perangkat_desa",
        "pengaduan",
        "esurat",
        "wilayah",
        "penduduk",
        "hero",
      ],
      "admin:hero-save",
    );
  } catch {
    // non-critical
  }
}

/** Reset to defaults */
export function resetHeroConfig(): void {
  const ID_KEY = DEFAULT_HERO_CONFIG.id;
  _data = { ...DEFAULT_HERO_CONFIG };
  _initialized = false;
  _initPromise = null;
  _syncZustand(_data);
  void idbDelete("settings", ID_KEY).catch(console.warn);
}
