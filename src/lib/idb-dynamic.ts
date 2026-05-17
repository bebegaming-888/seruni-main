/**
 * idb-dynamic.ts — Shared dynamic-IDB helpers
 *
 * For stores that need to access IndexedDB stores whose names are computed at runtime
 * (e.g. `struktur_${lembagaId}` or `pengurus_${lembagaId}`) — beyond the fixed
 * IDB_STORES keyPath map.
 *
 * All functions are SSR-safe (no-op on server).
 */

import { openIDB } from "./idb-store";

/** Get all records from a dynamically-named store. */
export async function idbGetAllDynamic<T>(storeName: string): Promise<T[]> {
  if (typeof window === "undefined") return [];
  const db = await openIDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/** Put (upsert) one record into a dynamically-named store. */
export async function idbPutDynamic<T>(storeName: string, record: T): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Replace all records in a dynamically-named store (clear + batch put). */
export async function idbReplaceAllDynamic<T>(storeName: string, records: T[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const oStore = tx.objectStore(storeName);
    oStore.clear();
    for (const r of records) oStore.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete a single record from a dynamically-named store. */
export async function idbDeleteDynamic(storeName: string, key: IDBValidKey): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Re-export the IDBValidKey type from idb-store for consumers
export type { IDBValidKey } from "./idb-store";
