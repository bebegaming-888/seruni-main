/**
 * Per-Attachment Retry Queue
 *
 * Independent queue untuk upload attachment yang gagal.
 * Berbeda dari offline-queue.ts yang menangani entire record submission.
 * Attachment queue diproses terpisah agar kegagalan upload tidak menggagalkan seluruh submission.
 *
 * Usage:
 *   import { enqueueAttachmentUpload, processAttachmentQueue } from "@/lib/offline-queue-attachments";
 *
 *   // After record saved, enqueue any attachments that failed to upload
 *   record.attachments.filter(a => a.data_url && !a.storage_path).forEach(att => {
 *     enqueueAttachmentUpload(record.no, att);
 *   });
 *
 *   // In app init (fire-and-forget):
 *   processAttachmentQueue();
 */

import { idbPut, idbGetAll, idbDelete } from "@/lib/idb-store";
import type { Lampiran } from "@/lib/esurat-store";

const ATTACHMENT_QUEUE_STORE = "attachment_queue";

export type AttachmentQueueItem = {
  id: string;
  surat_no: string;
  name: string;
  type: string;
  size: number;
  data_url: string;
  retries: number;
  nextRetry: number;
  created_at: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

/** Exponential backoff delays in ms: 30s, 2m, 10m, 30m, 2h, 10h */
const BACKOFF_DELAYS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000, 36_000_000];

function backoffDelay(retries: number): number {
  return BACKOFF_DELAYS[Math.min(retries, BACKOFF_DELAYS.length - 1)];
}

function newId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Core Functions ────────────────────────────────────────────────────────────

/** Enqueue a single attachment for upload retry. */
export async function enqueueAttachmentUpload(
  suratNo: string,
  attachment: Lampiran,
): Promise<AttachmentQueueItem> {
  // Check if already in queue
  const queue = await getAttachmentQueue();
  const existing = queue.find(
    (q) =>
      q.surat_no === suratNo && q.name === attachment.name && q.data_url === attachment.data_url,
  );
  if (existing) return existing;

  const item: AttachmentQueueItem = {
    id: newId(),
    surat_no: suratNo,
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
    data_url: attachment.data_url ?? "",
    retries: 0,
    nextRetry: 0, // Retry immediately
    created_at: new Date().toISOString(),
  };
  await idbPut(ATTACHMENT_QUEUE_STORE, item);
  return item;
}

/** Remove an attachment from the queue (after successful upload). */
export async function dequeueAttachmentUpload(id: string): Promise<void> {
  await idbDelete(ATTACHMENT_QUEUE_STORE, id);
}

/** Get all items in the attachment queue. */
export async function getAttachmentQueue(): Promise<AttachmentQueueItem[]> {
  return idbGetAll<AttachmentQueueItem>(ATTACHMENT_QUEUE_STORE);
}

/** Get count of pending attachment uploads. */
export async function hasPendingAttachments(): Promise<boolean> {
  const items = await getAttachmentQueue();
  return items.length > 0;
}

// ── Upload Function ───────────────────────────────────────────────────────────

async function uploadSingleAttachment(
  item: AttachmentQueueItem,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const base64Data = item.data_url.split(",")[1];
    if (!base64Data) return { ok: false, error: "Invalid data_url: no base64 content" };

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    const fileExt = item.name.split(".").pop() ?? "bin";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `attachments/${item.surat_no}/${fileName}`;

    const { getSupabase, isSupabaseConfigured } = await import("@/lib/supabase");
    if (!isSupabaseConfigured) return { ok: false, error: "Supabase not configured" };

    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase client null" };

    const { data, error } = await sb.storage
      .from("surat-attachments")
      .upload(filePath, blob, { contentType: "auto" });

    if (error) {
      return { ok: false, error: `[storage] Upload failed: ${error.message}` };
    }

    return { ok: true, path: data!.path };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ── Queue Processor ──────────────────────────────────────────────────────────

/**
 * Process all pending attachment uploads.
 * Fire-and-forget — dipanggil saat app mount + saat online event.
 *
 * Each attachment is processed independently with retry.
 * Successful uploads update the surat record in IndexedDB.
 */
export async function processAttachmentQueue(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const items = await getAttachmentQueue();
  if (items.length === 0) return;

  // Only process items whose backoff has elapsed
  const now = Date.now();
  const eligible = items.filter((item) => item.nextRetry === 0 || item.nextRetry <= now);
  if (eligible.length === 0) return;

  console.info(`[attachment-queue] Processing ${eligible.length} attachment(s)`);

  // Process concurrently
  await Promise.allSettled(
    eligible.map(async (item) => {
      const result = await uploadSingleAttachment(item);

      if (result.ok) {
        // Success — update the surat record with storage_path
        console.info(`[attachment-queue] Uploaded: ${item.name} → ${result.path}`);
        await updateSuratRecordWithPath(item.surat_no, item.name, result.path);
        await dequeueAttachmentUpload(item.id);
      } else {
        // Failed — update retry count and backoff
        const newRetries = item.retries + 1;
        const nextDelay = backoffDelay(newRetries);
        const updated: AttachmentQueueItem = {
          ...item,
          retries: newRetries,
          nextRetry: Date.now() + nextDelay,
        };
        await idbPut(ATTACHMENT_QUEUE_STORE, updated);
        console.warn(
          `[attachment-queue] Upload failed for ${item.name} (retry #${newRetries} in ${nextDelay / 1000 / 60} min): ${result.error}`,
        );
      }
    }),
  );
}

/** Update surat record in IndexedDB with the storage_path for this attachment. */
async function updateSuratRecordWithPath(
  suratNo: string,
  attachmentName: string,
  storagePath: string,
): Promise<void> {
  try {
    const { getLocalRecords, setLocalRecords } = await import("@/lib/useSupabaseSync");
    const records = getLocalRecords();
    const idx = records.findIndex((r) => r.no === suratNo);
    if (idx < 0) return;

    const record = records[idx];
    const updatedAttachments = record.attachments.map((att) =>
      att.name === attachmentName ? { ...att, storage_path: storagePath } : att,
    );

    const updated = { ...record, attachments: updatedAttachments };
    const updatedRecords = [...records];
    updatedRecords[idx] = updated;
    setLocalRecords(updatedRecords);
  } catch (err) {
    console.warn("[attachment-queue] Failed to update record with path:", err);
  }
}

/** Clear all items for a specific surat (called when surat is archived/deleted). */
export async function clearAttachmentQueueForSurat(suratNo: string): Promise<void> {
  const items = await getAttachmentQueue();
  const toRemove = items.filter((q) => q.surat_no === suratNo);
  await Promise.all(toRemove.map((q) => dequeueAttachmentUpload(q.id)));
}
