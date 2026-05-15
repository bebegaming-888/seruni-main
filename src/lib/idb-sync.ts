/**
 * idb-sync.ts — IndexedDB Sync Layer & Multi-Tab Conflict Detection
 *
 * Mengelola:
 * 1. Multi-tab synchronization via storage event API
 * 2. Conflict detection saat tab lain mengubah data
 * 3. Merge strategy: tab yang terakhir menyimpan menang
 * 4. Automatic refresh saat data berubah di tab lain
 */

import { getSettings } from "@/lib/settings-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type ConflictAction = "notify" | "merge" | "force_overwrite";

export interface SyncEvent {
  source: "local" | "remote" | "tab";
  store: string;
  key: string;
  timestamp: number;
  data?: unknown;
}

let _syncListeners: ((event: SyncEvent) => void)[] = [];
let _lastSyncTimestamp = 0;

/**
 * Register listener untuk sync events.
 * Dipanggil oleh SettingsPanel untuk re-fetch data saat tab lain menyimpan.
 */
export function addSyncListener(listener: (event: SyncEvent) => void): () => void {
  _syncListeners.push(listener);
  return () => {
    _syncListeners = _syncListeners.filter((l) => l !== listener);
  };
}

export function notifySyncListeners(event: SyncEvent) {
  _syncListeners.forEach((l) => {
    try {
      l(event);
    } catch (err) {
      console.warn("[idb-sync] Listener error:", err);
    }
  });
}

/**
 * Init multi-tab sync via storage event API.
 * Listen untuk perubahan dari tab lain via localStorage.
 */
export function initIDBSync(): void {
  if (typeof window === "undefined") return;

  // 1. Listen storage events dari tab lain
  window.addEventListener("storage", (e) => {
    if (!e.key) return;

    // Handle settings lock changes dari tab lain
    if (e.key === "seruni_settings_locked") {
      const newState = e.newValue ? JSON.parse(e.newValue) : null;
      console.info("[idb-sync] Lock state changed from another tab:", newState);

      notifySyncListeners({
        source: "tab",
        store: "settings",
        key: "settings_lock",
        timestamp: Date.now(),
        data: newState,
      });
    }

    // Handle cross-tab settings save signal
    if (e.key === "__settings_saved__") {
      const savedAt = parseInt(e.newValue ?? "0", 10);
      if (savedAt > _lastSyncTimestamp) {
        _lastSyncTimestamp = savedAt;
        console.info("[idb-sync] Settings changed in another tab, re-fetching...");

        notifySyncListeners({
          source: "tab",
          store: "settings",
          key: "main",
          timestamp: savedAt,
        });
      }
    }

    // Handle cross-tab template changes
    if (e.key === "__templates_changed__") {
      const savedAt = parseInt(e.newValue ?? "0", 10);
      if (savedAt > _lastSyncTimestamp) {
        _lastSyncTimestamp = savedAt;
        console.info("[idb-sync] Templates changed in another tab, signaling refresh...");

        notifySyncListeners({
          source: "tab",
          store: "templates",
          key: "all",
          timestamp: savedAt,
        });
      }
    }
  });

  // 2. Broadcast local save ke tab lain via localStorage signal
}

/**
 * Broadcast bahwa settings telah disimpan.
 * Tab lain akan mendeteksi via storage event dan re-fetch.
 */
export function broadcastSettingsSave(): void {
  if (typeof window === "undefined") return;

  const ts = Date.now().toString();
  _lastSyncTimestamp = parseInt(ts, 10);

  // Signal untuk tab lain
  localStorage.setItem("__settings_saved__", ts);
  localStorage.removeItem("__settings_saved__");

  // Tambahan: broadcast ke Supabase channel jika configured (optional)
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const channel = sb.channel("settings-sync");
        channel.send({
          type: "broadcast",
          event: "settings-update",
          payload: { timestamp: ts, tabId: _getTabId() },
        });
      } catch {
        // Supabase broadcast optional — tidak critical
      }
    }
  }
}

/**
 * Broadcast bahwa templates telah berubah.
 */
export function broadcastTemplateChange(): void {
  if (typeof window === "undefined") return;

  const ts = Date.now().toString();
  _lastSyncTimestamp = parseInt(ts, 10);

  // Signal untuk tab lain
  localStorage.setItem("__templates_changed__", ts);
  localStorage.removeItem("__templates_changed__");
}

/**
 * Broadcast intent untuk menyimpan.
 * Tab lain akan diberitahu dan bisa memilih konflik atau auto-refresh.
 */
export function broadcastSettingsIntent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("__settings_intent__", Date.now().toString());
  setTimeout(() => {
    localStorage.removeItem("__settings_intent__");
  }, 5000); // 5 detik window untuk conflict resolution
}

/**
 * Cek apakah tab lain sedang mengedit (intent broadcast).
 */
export function isOtherTabEditing(): boolean {
  if (typeof window === "undefined") return false;
  const intent = localStorage.getItem("__settings_intent__");
  if (!intent) return false;
  const ts = parseInt(intent, 10);
  // Jika intent lebih baru dari 5 detik, tab lain sedang mengedit
  return Date.now() - ts < 5000;
}

/**
 * Force overwrite dari remote.
 * Called ketika user memilih "Gunakan data tab lain".
 */
export async function forceRemoteOverwrite(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured for remote overwrite");
  }
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase not configured for remote overwrite");
  }

  try {
    const { data: remoteData, error } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "main_settings")
      .single();

    if (error || !remoteData?.value) {
      throw new Error("No remote data to overwrite from");
    }

    const remoteSettings = remoteData.value;
    const { idbPut } = await import("@/lib/idb-store");
    await idbPut("settings", { id: "main", ...remoteSettings });

    console.info("[idb-sync] Force overwritten from remote");
  } catch (err) {
    console.error("[idb-sync] Force remote overwrite failed:", err);
    throw err;
  }
}

/** Get unique tab ID untuk multi-tab sync. */
function _getTabId(): string {
  let tabId = sessionStorage.getItem("__tab_id__");
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("__tab_id__", tabId);
  }
  return tabId;
}

/**
 * Remote sync via Supabase Realtime channel.
 * Dipanggil saat tab menjadi aktif kembali.
 */
export function initRemoteSync(): void {
  if (!isSupabaseConfigured) return;
  const sb = getSupabase();
  if (!sb) return;

  const channel = sb.channel("settings-sync");

  channel.on("broadcast", { event: "settings-update" }, (payload) => {
    const tabId = (payload as unknown as { tabId: string }).tabId;
    if (tabId === _getTabId()) return; // Skip broadcast dari tab sendiri

    console.info("[idb-sync] Remote settings update detected from tab:", tabId);

    notifySyncListeners({
      source: "remote",
      store: "settings",
      key: "main",
      timestamp: Date.now(),
    });
  });

  channel.subscribe((status) => {
    console.info("[idb-sync] Supabase channel status:", status);
  });
}

/**
 * Sync settings FROM remote (called on tab become active).
 */
export async function syncFromRemote(): Promise<{
  success: boolean;
  updated: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, updated: false, message: "Supabase not configured" };
  }
  const sb = getSupabase();
  if (!sb) {
    return { success: false, updated: false, message: "Supabase not configured" };
  }

  try {
    const { data: remoteData, error } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "main_settings")
      .single();

    if (error || !remoteData?.value) {
      return { success: true, updated: false, message: "No remote data" };
    }

    const current = getSettings();
    const remoteSettings = remoteData.value as Record<string, unknown>;
    const remoteTs = (remoteSettings.updated_at as string | undefined)
      ? new Date(remoteSettings.updated_at as string).getTime()
      : 0;
    const localTs = current.backup?.last_backup_at
      ? new Date(current.backup.last_backup_at).getTime()
      : 0;

    // Jika remote lebih baru dari local, sync
    if (remoteTs > localTs) {
      const { idbPut } = await import("@/lib/idb-store");
      const merged = { id: "main", ...(remoteData.value as object) };
      await idbPut("settings", merged);

      return {
        success: true,
        updated: true,
        message: `Synced from remote (remote: ${new Date(remoteTs).toISOString()})`,
      };
    }

    return { success: true, updated: false, message: "Local data is newer" };
  } catch (err) {
    return {
      success: false,
      updated: false,
      message: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
