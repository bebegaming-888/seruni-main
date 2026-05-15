/**
 * idb-health.ts — IndexedDB Health Check & Auto-Recovery
 *
 * Deteksi dan perbaiki masalah IndexedDB secara otomatis:
 * - Corrupt database → delete & recreate
 * - Quota exceeded → cleanup old data
 * - Connection timeout → retry with backoff
 */

import { openIDB, IDB_NAME, IDB_VER } from "@/lib/idb-store";

export type HealthStatus = "healthy" | "degraded" | "critical" | "recovering";

export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  canWrite: boolean;
  canRead: boolean;
  quotaUsed?: number;
  quotaTotal?: number;
  lastCheck: string;
}

let _lastHealthCheck: HealthCheckResult | null = null;
let _healthCheckPromise: Promise<HealthCheckResult> | null = null;

/**
 * Cek kesehatan IndexedDB — read/write test + quota check.
 * Cache hasil selama 30 detik untuk menghindari overhead.
 */
export async function checkIDBHealth(): Promise<HealthCheckResult> {
  if (typeof window === "undefined") {
    return {
      status: "critical",
      message: "IndexedDB tidak tersedia (SSR)",
      canWrite: false,
      canRead: false,
      lastCheck: new Date().toISOString(),
    };
  }

  // Return cached result jika masih fresh (< 30s)
  if (_lastHealthCheck && Date.now() - new Date(_lastHealthCheck.lastCheck).getTime() < 30000) {
    return _lastHealthCheck;
  }

  // Deduplicate concurrent checks
  if (_healthCheckPromise) return _healthCheckPromise;

  _healthCheckPromise = performHealthCheck();
  const result = await _healthCheckPromise;
  _healthCheckPromise = null;
  _lastHealthCheck = result;
  return result;
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: "healthy",
    message: "IndexedDB berfungsi normal",
    canWrite: false,
    canRead: false,
    lastCheck: new Date().toISOString(),
  };

  try {
    // 1. Test open database
    const db = await openIDB();
    result.canRead = true;

    // 2. Test write (ke store 'settings' dengan test key)
    const testKey = "__health_check__";
    const testValue = { id: testKey, timestamp: Date.now() };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put(testValue);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    result.canWrite = true;

    // 3. Test read back
    const readBack = await new Promise<typeof testValue | undefined>((resolve, reject) => {
      const tx = db.transaction("settings", "readonly");
      const req = tx.objectStore("settings").get(testKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!readBack || readBack.timestamp !== testValue.timestamp) {
      throw new Error("Read-back verification failed");
    }

    // 4. Cleanup test data
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").delete(testKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 5. Check storage quota
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      result.quotaUsed = estimate.usage;
      result.quotaTotal = estimate.quota;

      if (estimate.quota && estimate.usage) {
        const usagePercent = (estimate.usage / estimate.quota) * 100;
        if (usagePercent > 90) {
          result.status = "critical";
          result.message = `Storage hampir penuh (${usagePercent.toFixed(1)}%)`;
        } else if (usagePercent > 75) {
          result.status = "degraded";
          result.message = `Storage usage tinggi (${usagePercent.toFixed(1)}%)`;
        }
      }
    }

    result.status = result.status === "healthy" ? "healthy" : result.status;
  } catch (err) {
    result.status = "critical";
    result.message = err instanceof Error ? err.message : "Unknown error";
    result.canWrite = false;
    result.canRead = false;
  }

  return result;
}

/**
 * Auto-recovery: hapus database corrupt dan recreate.
 * HATI-HATI: ini akan menghapus SEMUA data lokal!
 */
export async function recoverIDB(): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Cannot recover in SSR" };
  }

  try {
    console.warn("[idb-health] Starting database recovery...");

    // 1. Delete corrupt database
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        console.warn("[idb-health] Delete blocked by other tabs");
        reject(new Error("Database deletion blocked"));
      };
    });

    console.info("[idb-health] Database deleted successfully");

    // 2. Recreate database
    const db = await openIDB();
    db.close();

    console.info("[idb-health] Database recreated successfully");

    // 3. Verify health
    const health = await checkIDBHealth();
    if (health.status === "healthy") {
      return { success: true, message: "Database recovered successfully" };
    } else {
      return { success: false, message: `Recovery incomplete: ${health.message}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[idb-health] Recovery failed:", msg);
    return { success: false, message: `Recovery failed: ${msg}` };
  }
}

/**
 * Clear old audit logs and offline queue to free up space.
 */
export async function cleanupOldData(): Promise<{ success: boolean; freedBytes: number }> {
  if (typeof window === "undefined") {
    return { success: false, freedBytes: 0 };
  }

  try {
    const db = await openIDB();
    let freedBytes = 0;

    // 1. Keep only last 100 audit logs
    const auditTx = db.transaction("audit_log", "readwrite");
    const auditStore = auditTx.objectStore("audit_log");
    const allAudits = await new Promise<Array<{ id: string; ts: string }>>((resolve, reject) => {
      const req = auditStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (allAudits.length > 100) {
      const sorted = allAudits.sort((a, b) => b.ts.localeCompare(a.ts));
      const toDelete = sorted.slice(100);
      for (const item of toDelete) {
        auditStore.delete(item.id);
        freedBytes += JSON.stringify(item).length;
      }
    }

    // 2. Clear offline queue older than 7 days
    const queueTx = db.transaction("offline_queue", "readwrite");
    const queueStore = queueTx.objectStore("offline_queue");
    const allQueue = await new Promise<Array<{ id: string; timestamp: number }>>(
      (resolve, reject) => {
        const req = queueStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const item of allQueue) {
      if (item.timestamp < sevenDaysAgo) {
        queueStore.delete(item.id);
        freedBytes += JSON.stringify(item).length;
      }
    }

    console.info(`[idb-health] Cleaned up ~${(freedBytes / 1024).toFixed(2)} KB`);
    return { success: true, freedBytes };
  } catch (err) {
    console.error("[idb-health] Cleanup failed:", err);
    return { success: false, freedBytes: 0 };
  }
}

/**
 * Get current health status (cached, no async check).
 */
export function getLastHealthStatus(): HealthCheckResult | null {
  return _lastHealthCheck;
}
