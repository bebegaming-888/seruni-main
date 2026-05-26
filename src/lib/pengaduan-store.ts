/**
 * pengaduan-store.ts — Pengaduan / Aspirasi Warga
 *
 * Flow: form submit → simpan ke IndexedDB → sync ke Supabase
 *       → logging ke audit_log
 *       → eskalasi WA jika prioritas=Tinggi/Urgent
 *
 * Store: "pengaduan" di IndexedDB (keyPath: ticket)
 */

import { idbPut, idbGet, idbGetAll, type IDBStoreName } from "./idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { sendWaNotification } from "@/lib/fonnte";
import { logAudit } from "@/lib/useSupabaseSync";
import { isStoreLocked } from "@/lib/settings-lock";

export type PengaduanKategori =
  | "Infrastruktur & Jalan"
  | "Pelayanan Publik"
  | "Keamanan & Ketertiban"
  | "Kesehatan & Kebersihan"
  | "Bantuan Sosial"
  | "Lingkungan Hidup"
  | "Pertanahan"
  | "Lainnya";

export type PengaduanStatus = "Baru" | "Diproses" | "Selesai" | "Ditolak";
export type PengaduanPrioritas = "Rendah" | "Normal" | "Tinggi" | "Urgent";

export type Pengaduan = {
  ticket: string;
  nama: string;
  nik?: string;
  kontak: string;
  kategori: PengaduanKategori;
  judul: string;
  isi: string;
  lampiran_url?: string;
  status: PengaduanStatus;
  prioritas: PengaduanPrioritas;
  admin_catatan?: string;
  admin_tindak?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
};

export type PengaduanInput = Omit<Pengaduan, "ticket" | "status" | "prioritas" | "created_at">;

const STORE_KEY: IDBStoreName = "pengaduan";

// ── In-Memory Cache ───────────────────────────────────────────────────────────
let _mem: Pengaduan[] | null = null;
let _initialized = false;

/** Initialize pengaduan store.
 * Priority: Supabase → IndexedDB.
 */
export async function initPengaduanStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked("pengaduan")) {
    console.info("[pengaduan-store] Initializing from IDB (Store Locked)");
    const data = await idbGetAll<Pengaduan>(STORE_KEY);
    if (data && data.length > 0) {
      _mem = data;
      _initialized = true;
      return;
    }
  }

  try {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from("pengaduan")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          _mem = data as Pengaduan[];
          _initialized = true;
          console.info(`[pengaduan-store] Loaded ${_mem.length} records from Supabase`);
          return;
        }
      }
    }

    // Fallback to IDB
    const idbData = await idbGetAll<Pengaduan>(STORE_KEY);
    _mem = idbData || [];
    _initialized = true;
    console.info(`[pengaduan-store] Loaded ${_mem.length} records from IDB`);
  } catch (e) {
    console.error("[pengaduan-store] Init failed:", e);
    _initialized = true; // Avoid infinite retry
  }
}

/** List semua pengaduan (dari IndexedDB, async) — sorted newest first */
export async function listPengaduan(): Promise<Pengaduan[]> {
  if (typeof window === "undefined") return [];
  const raw = await idbGetAll<Pengaduan>(STORE_KEY);
  return (raw ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** List pengaduan berdasarkan status */
export async function listByStatus(status: PengaduanStatus): Promise<Pengaduan[]> {
  const all = await listPengaduan();
  return all.filter((p) => p.status === status);
}

/** Get satu pengaduan by ticket (async) */
export async function getByTicket(ticket: string): Promise<Pengaduan | null> {
  if (typeof window === "undefined") return null;
  const raw = await idbGet<Pengaduan>(STORE_KEY, ticket);
  if (!raw) return null;
  // Normalize from potential raw-IDB values (numbers, nested objects)
  const r = raw as unknown as Record<string, unknown>;
  return {
    ticket: String(r.ticket ?? raw.ticket ?? ""),
    nama: String(r.nama ?? raw.nama ?? ""),
    nik: r.nik ? String(r.nik) : raw.nik ? String(raw.nik) : undefined,
    kontak: String(r.kontak ?? raw.kontak ?? ""),
    kategori: String(r.kategori ?? raw.kategori ?? "Lainnya") as PengaduanKategori,
    judul: String(r.judul ?? raw.judul ?? ""),
    isi: String(r.isi ?? raw.isi ?? ""),
    lampiran_url: r.lampiran_url
      ? String(r.lampiran_url)
      : raw.lampiran_url
        ? String(raw.lampiran_url)
        : undefined,
    status: String(r.status ?? raw.status ?? "Baru") as PengaduanStatus,
    prioritas: String(r.prioritas ?? raw.prioritas ?? "Normal") as PengaduanPrioritas,
    admin_catatan: r.admin_catatan
      ? String(r.admin_catatan)
      : raw.admin_catatan
        ? String(raw.admin_catatan)
        : undefined,
    admin_tindak: r.admin_tindak
      ? String(r.admin_tindak)
      : raw.admin_tindak
        ? String(raw.admin_tindak)
        : undefined,
    created_at: String(r.created_at ?? raw.created_at ?? new Date().toISOString()),
    updated_at: r.updated_at
      ? String(r.updated_at)
      : raw.updated_at
        ? String(raw.updated_at)
        : undefined,
    resolved_at: r.resolved_at
      ? String(r.resolved_at)
      : raw.resolved_at
        ? String(raw.resolved_at)
        : undefined,
  };
}

/**
 * Submit pengaduan baru.
 * 1. Generate ticket
 * 2. Save ke IndexedDB
 * 3. Sync ke Supabase
 * 4. Notifikasi WA jika High/Urgent priority
 * 5. Log audit
 */
export async function submitPengaduan(
  input: PengaduanInput,
  adminWaNumber?: string,
): Promise<{ ok: boolean; ticket: string; error?: string }> {
  const ticket = `MD-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Tentukan prioritas otomatis dari kategori
  const urgentKeywords = ["Keamanan", "Kesehatan", "Bantuan Sosial"];
  const isUrgent = urgentKeywords.some((k) => input.kategori.includes(k));
  const autoPrioritas: PengaduanPrioritas = isUrgent ? "Tinggi" : "Normal";

  const record: Pengaduan = {
    ...input,
    ticket,
    status: "Baru",
    prioritas: autoPrioritas,
    created_at: now,
  };

  // 1. IndexedDB
  await idbPut(STORE_KEY, record);

  // 2. Supabase sync
  let synced = false;
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("pengaduan").insert({
        ticket,
        nama: input.nama,
        nik: input.nik ?? null,
        kontak: input.kontak,
        kategori: input.kategori,
        judul: input.judul,
        isi: input.isi,
        status: "Baru",
        prioritas: autoPrioritas,
      });
      if (!error) synced = true;
      else console.error("[pengaduan] Supabase insert error:", error.message);
    }
  }

  // 3. Eskalasi WA untuk prioritas Tinggi/Urgent
  if (adminWaNumber && (autoPrioritas === "Tinggi" || isUrgent)) {
    const waMsg = `🚨 *Pengaduan Urgent — ${ticket}*

*Kategori:* ${input.kategori}
*Judul:* ${input.judul}
*Pelapor:* ${input.nama}
*Kontak:* ${input.kontak}

📋 *Ringkasan:*
${input.isi.slice(0, 300)}${input.isi.length > 300 ? "..." : ""}

_Ini adalah pengaduan otomatis dari sistem. Mohon ditindaklanjuti segera._`;

    sendWaNotification(adminWaNumber, waMsg).catch(() => null);
    logAudit({
      action: "pengaduan.urgent_submitted",
      detail: `Pengaduan ${ticket} (${autoPrioritas}) dikirim via WA ke admin.`,
      username: "system",
    });
  }

  logAudit({
    action: "pengaduan.submit",
    detail: `Pengaduan ${ticket} dari ${input.nama} (${input.kategori}). Sync: ${synced}.`,
    username: input.nama,
  });

  return { ok: true, ticket };
}

/** Update status pengaduan (dari admin panel) */
export async function updateStatus(
  ticket: string,
  status: PengaduanStatus,
  catatan?: string,
  tindak?: string,
): Promise<{ ok: boolean; error?: string }> {
  const existing = await getByTicket(ticket);
  if (!existing) return { ok: false, error: "Pengaduan tidak ditemukan" };

  const updated: Pengaduan = {
    ...existing,
    status,
    admin_catatan: catatan ?? existing.admin_catatan,
    admin_tindak: tindak ?? existing.admin_tindak,
    updated_at: new Date().toISOString(),
    resolved_at: status === "Selesai" ? new Date().toISOString() : existing.resolved_at,
  };

  await idbPut(STORE_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (catatan) updateData.admin_catatan = catatan;
      if (tindak) updateData.admin_tindak = tindak;
      if (status === "Selesai") updateData.resolved_at = new Date().toISOString();

      const { error } = await sb.from("pengaduan").update(updateData).eq("ticket", ticket);
      if (error) console.error("[pengaduan] update error:", error.message);
    }
  }

  logAudit({
    action: `pengaduan.status_${status.toLowerCase()}`,
    detail: `Update status pengaduan ${ticket} → ${status}`,
    username: "admin",
  });

  return { ok: true };
}
