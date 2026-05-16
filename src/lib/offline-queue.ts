/**
 * Offline Submission Queue — IndexedDB persistence
 *
 * Menyimpan form submissions yang gagal (offline/server error)
 * agar bisa di-retry saat koneksi kembali.
 *
 * Usage:
 *   import { enqueueOfflineSubmission, processOfflineQueue } from "@/lib/offline-queue";
 *
 *   // Di handleSubmit ESurat:
 *   if (!navigator.onLine) {
 *     await enqueueOfflineSubmission({ type: "surat", data: record });
 *     toast.info("Pengajuan disimpan offline — akan dikirim saat koneksi pulih");
 *     return;
 *   }
 *
 *   // Di app init (e.g. __root.tsx useEffect):
 *   processOfflineQueue(); // fire-and-forget, retried on reconnect
 */

import { idbPut, idbGetAll, idbDelete } from "@/lib/idb-store";
import type { IDBStoreName } from "@/lib/idb-store";
import type { SuratRecord } from "@/lib/esurat-store";

const OFFLINE_QUEUE_STORE = "offline_queue" as IDBStoreName;

export type OfflineSubmission = {
  id: string; // unique timestamp-based ID
  type: "surat" | "penduduk" | string;
  data: Record<string, unknown>;
  created_at: string;
  retries: number;
  /** Timestamp (ms) when eligible for next retry. 0 = retry immediately. */
  nextRetry: number;
};

function newId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Exponential backoff delays in ms: 30s, 2m, 10m, 30m, 2h, 10h */
const BACKOFF_DELAYS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000, 36_000_000];

function backoffDelay(retries: number): number {
  return BACKOFF_DELAYS[Math.min(retries, BACKOFF_DELAYS.length - 1)];
}

/**
 * Tambahkan submission ke offline queue.
 * Returns the queue item for confirmation display.
 */
export async function enqueueOfflineSubmission(opts: {
  type: string;
  data: Record<string, unknown>;
}): Promise<OfflineSubmission> {
  const item: OfflineSubmission = {
    id: newId(),
    type: opts.type,
    data: opts.data,
    created_at: new Date().toISOString(),
    retries: 0,
    nextRetry: 0,
  };
  await idbPut(OFFLINE_QUEUE_STORE, item);
  return item;
}

/**
 * Hapus item dari queue setelah berhasil diproses.
 */
export async function dequeueOfflineSubmission(id: string): Promise<void> {
  await idbDelete(OFFLINE_QUEUE_STORE, id);
}

/**
 * Ambil semua item yang masih di queue.
 */
export async function getOfflineQueue(): Promise<OfflineSubmission[]> {
  return idbGetAll<OfflineSubmission>(OFFLINE_QUEUE_STORE);
}

/**
 * Process semua items di offline queue.
 * fire-and-forget — dipanggil saat app mount + saat online event.
 *
 * Setiap item dikirim via syncSaveRecord() + notifySurat(), lalu dihapus
 * dari queue jika berhasil. Gagal disimpan di queue dengan backoff.
 */
export async function processOfflineQueue(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const items = await getOfflineQueue();
  if (items.length === 0) return;

  // Only process items whose backoff has elapsed
  const now = Date.now();
  const eligible = items.filter((item) => item.nextRetry === 0 || item.nextRetry <= now);
  if (eligible.length === 0) return;

  console.info(`[offline-queue] Processing ${eligible.length} queued submissions`);

  for (const item of eligible) {
    if (item.type === "surat") {
      try {
        const record = item.data as unknown as SuratRecord;
        const { syncSaveRecord } = await import("@/lib/useSupabaseSync");
        const { notifySurat } = await import("@/lib/esurat-notif");

        const result = await syncSaveRecord(record, record.pemohon ?? "Warga");

        if (result.ok) {
          await notifySurat(record, "submit").catch((e) =>
            console.warn("[offline-queue] WA notify failed:", e),
          );
          console.info(`[offline-queue] Queued submission ${item.id} sent successfully`);
          await dequeueOfflineSubmission(item.id);
        } else {
          const updated: OfflineSubmission = {
            ...item,
            retries: item.retries + 1,
            nextRetry: Date.now() + backoffDelay(item.retries + 1),
          };
          await idbPut(OFFLINE_QUEUE_STORE, updated);
          console.warn(
            `[offline-queue] Submission ${item.id} sync failed (${result.error}), retry #${updated.retries} in ${backoffDelay(item.retries) / 1000 / 60} min`,
          );
        }
      } catch (err) {
        const updated: OfflineSubmission = {
          ...item,
          retries: item.retries + 1,
          nextRetry: Date.now() + backoffDelay(item.retries + 1),
        };
        await idbPut(OFFLINE_QUEUE_STORE, updated);
        console.warn(`[offline-queue] Network error for ${item.id}:`, err);
      }
      continue;
    }

    if (item.type === "CREATE_ORDER") {
      try {
        const { useOrdersStore } = await import("@/stores/orders-store");
        const { useMarketplaceStore } = await import("@/lib/content-store");
        const { useCartStore } = await import("@/lib/cart-store");
        const { useMarketplaceConfigStore } = await import("@/lib/content-store");

        const data = item.data as {
          cart: Array<{ id: string; quantity: number }>;
          buyer: { name: string; wa: string; address: string };
          paymentMethod: "bank_transfer" | "cod";
        };

        // Reconstruct cart items from stored IDs
        const marketplaceStore = useMarketplaceStore.getState();
        await marketplaceStore.load();

        const cartStore = useCartStore.getState();
        const configStore = useMarketplaceConfigStore.getState();
        await configStore.load();

        const cartItems = data.cart
          .map((ci) => {
            const product = marketplaceStore.items.find((p) => p.id === ci.id);
            if (!product) return null;
            return { product, quantity: ci.quantity };
          })
          .filter(Boolean) as ReturnType<typeof cartStore.items extends (infer T)[] ? T[] : never[]>;

        if (cartItems.length === 0) {
          // Products no longer exist — remove from queue
          await dequeueOfflineSubmission(item.id);
          continue;
        }

        const ordersStore = useOrdersStore.getState();
        await ordersStore.load();

        await ordersStore.createOrder(cartItems, data.buyer, data.paymentMethod);

        console.info(`[offline-queue] CREATE_ORDER ${item.id} synced successfully`);
        await dequeueOfflineSubmission(item.id);
      } catch (err) {
        const updated: OfflineSubmission = {
          ...item,
          retries: item.retries + 1,
          nextRetry: Date.now() + backoffDelay(item.retries + 1),
        };
        await idbPut(OFFLINE_QUEUE_STORE, updated);
        console.warn(`[offline-queue] CREATE_ORDER ${item.id} failed:`, err);
      }
      continue;
    }

    console.warn(`[offline-queue] Unknown submission type: ${item.type}`);
  }
}

/**
 * Cek apakah ada item di queue (untuk badge/indicator).
 */
export async function hasOfflineQueueItems(): Promise<boolean> {
  const items = await getOfflineQueue();
  return items.length > 0;
}
