/**
 * media-upload.ts — Upload gambar/logo/foto ke Supabase Storage
 *
 * Seluruh gambar di-e-Government disimpan di Supabase Storage (bukan URL eksternal).
 * Fallback: base64 data URL jika Supabase belum dikonfigurasi.
 *
 * Bucket yang digunakan:
 *   - public-media    → logo, favicon, berita cover, kop surat logo
 *   - perangkat-fotos → foto perangkat desa
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { generateId } from "./utils";

/** Cek apakah sebuah nilai adalah Supabase Storage path (bukan URL/data URL). */
export function isStoragePath(value: string): boolean {
  return (
    !!value &&
    !value.startsWith("data:") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    (value.includes("/") || value.startsWith("perangkat/"))
  );
}

/**
 * Konversi Storage path → public URL.
 * Contoh: "logos/kades.png" → "https://xxx.supabase.co/storage/v1/object/public/public-media/logos/kades.png"
 */
export function storagePathToUrl(
  path: string,
  bucket: "public-media" | "perangkat-fotos" = "public-media",
): string {
  // Jika sudah full URL, langsung return
  if (path.startsWith("http")) return path;

  // Asumsikan path tanpa prefix bucket → tambahkan bucket
  const cleanPath = path;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Ambil public URL untuk sebuah storage path + bucket.
 * Jika Supabase tidak dikonfigurasi, return string kosong.
 */
export function getMediaUrl(
  storagePath: string | undefined | null,
  bucket: "public-media" | "perangkat-fotos" = "public-media",
): string {
  if (!storagePath) return "";
  if (!isSupabaseConfigured) return storagePath; // fallback base64 / mock URL
  if (storagePath.startsWith("http")) return storagePath; // sudah full URL
  return storagePathToUrl(storagePath, bucket);
}

/**
 * Resolve URL gambar: jika ada storage_path → Supabase URL,
 * jika tidak ada storage_path → fallback ke url langsung.
 * Digunakan di komponen render (HeroSection, AboutSection, dll).
 */
export function resolveImageUrl(
  storagePath: string | undefined | null,
  url: string | undefined | null,
): string {
  if (storagePath) {
    const resolved = getMediaUrl(storagePath, "public-media");
    if (resolved) return resolved;
  }
  return url ?? "";
}

/** Ekstensi file dari nama file. */
function getExt(file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  return ext.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve video URL: storage_path → Supabase Storage public URL,
 * jika tidak ada storage_path → fallback ke url langsung.
 * Logika sama dengan resolveImageUrl tapi tanpa getMediaUrl wrapper.
 */
export function resolveVideoUrl(
  storagePath: string | undefined | null,
  url: string | undefined | null,
): string {
  if (!storagePath || !isSupabaseConfigured) return url ?? "";
  if (storagePath.startsWith("http")) return storagePath; // sudah full URL
  const sbUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!sbUrl) return url ?? "";
  return `${sbUrl}/storage/v1/object/public/public-media/${storagePath}`;
}

/** Konversi File → Uint8Array. */
function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      resolve(bytes);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Hasil upload ke Supabase Storage. */
export type UploadResult =
  | { ok: true; storagePath: string; publicUrl: string; dataUrl?: string }
  | { ok: false; error: string; dataUrl?: string };

/**
 * Upload file ke Supabase Storage.
 *
 * Jika Supabase tidak dikonfigurasi, tetap berhasil tapi return base64 data URL
 * sebagai fallback (tidak ada storagePath, hanya dataUrl).
 *
 * @param file       - File dari input <input type="file">
 * @param folder     - Folder di dalam bucket (misal "logos", "hero", "berita")
 * @param bucket     - Bucket tujuan
 * @param customName - Nama file custom (opsional). Default: timestamp-id.ext
 */
export async function uploadMedia(
  file: File,
  folder: string,
  bucket: "public-media" | "perangkat-fotos" = "public-media",
  customName?: string,
): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Hanya file gambar yang diizinkan" };
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return {
      ok: false,
      error: `Ukuran file maksimal 5 MB (file ini ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    };
  }

  const ext = getExt(file);

  // ── Fallback: base64 jika Supabase tidak dikonfigurasi ──
  if (!isSupabaseConfigured) {
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }

  // ── Upload ke Supabase Storage ──
  const sb = getSupabase();
  if (!sb) {
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }

  try {
    const fileBytes = await fileToUint8Array(file);
    const fileName = customName ?? `${Date.now()}-${generateId()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await sb.storage
      .from(bucket)
      .upload(filePath, fileBytes, { contentType: file.type });

    if (error) {
      console.warn(`[media-upload] Upload failed: ${error.message}, falling back to base64`);
      const dataUrl = await fileToDataUrl(file);
      return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
    }

    const publicUrl = sb.storage.from(bucket).getPublicUrl(data!.path).data.publicUrl;
    return { ok: true, storagePath: data!.path, publicUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[media-upload] Error: ${msg}, falling back to base64`);
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }
}

/**
 * Upload video ke Supabase Storage.
 *
 * Mendukung format: mp4, webm, mov, ogg.
 * Batas ukuran: 100 MB.
 * Fallback: base64 data URL jika Supabase tidak dikonfigurasi.
 */
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg", "video/x-msvideo"];
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export type UploadVideoResult =
  | { ok: true; storagePath: string; publicUrl: string; dataUrl?: string }
  | { ok: false; error: string };

export async function uploadVideo(
  file: File,
  folder: string,
  bucket: "public-media" | "perangkat-fotos" = "public-media",
): Promise<UploadVideoResult> {
  if (!VIDEO_TYPES.includes(file.type)) {
    return { ok: false, error: `Format video tidak didukung. Gunakan: mp4, webm, mov, ogg.` };
  }

  if (file.size > VIDEO_MAX_SIZE) {
    return {
      ok: false,
      error: `Ukuran video maksimal 100 MB (file ini ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    };
  }

  if (!isSupabaseConfigured) {
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }

  const sb = getSupabase();
  if (!sb) {
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }

  try {
    const fileBytes = await fileToUint8Array(file);
    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") ?? "mp4";
    const fileName = `${Date.now()}-${generateId()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await sb.storage
      .from(bucket)
      .upload(filePath, fileBytes, { contentType: file.type });

    if (error) {
      console.warn(`[media-upload] Video upload failed: ${error.message}, falling back to base64`);
      const dataUrl = await fileToDataUrl(file);
      return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
    }

    const publicUrl = sb.storage.from(bucket).getPublicUrl(data!.path).data.publicUrl;
    return { ok: true, storagePath: data!.path, publicUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[media-upload] Video error: ${msg}, falling back to base64`);
    const dataUrl = await fileToDataUrl(file);
    return { ok: true, storagePath: "", publicUrl: dataUrl, dataUrl };
  }
}

/** Konversi File → base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Hapus file dari Supabase Storage berdasarkan storage path.
 * Tidak error jika Supabase tidak dikonfigurasi atau file tidak ditemukan.
 */
export async function deleteMedia(
  storagePath: string,
  bucket: "public-media" | "perangkat-fotos" = "public-media",
): Promise<void> {
  if (!storagePath || !isStoragePath(storagePath)) return;
  if (!isSupabaseConfigured) return;

  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb.storage.from(bucket).remove([storagePath]);
  } catch (err) {
    // Non-fatal — ignore deletion errors
    console.warn("[media-upload] Delete failed:", err);
  }
}
