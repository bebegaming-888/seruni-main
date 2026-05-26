/**
 * lembaga-store.ts — Lembaga Desa CRUD + Struktur Tree
 *
 * Single source of truth untuk data lembaga, struktur jabatan, dan pengurus.
 * Load order: Supabase → IndexedDB → empty fallback.
 *
 * Hierarki: lembaga_desa (1) → struktur_lembaga (∞) → pengurus_lembaga (∞)
 *
 * IDB key: "lembaga"
 */

import { idbGetAll, idbPut, idbReplaceAll } from "@/lib/idb-store";
import { idbGetAllDynamic, idbPutDynamic, idbReplaceAllDynamic } from "@/lib/idb-dynamic";
import { autofillFromNik as _wargaAutofill } from "@/lib/warga-autofill";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { logAudit } from "@/lib/settings-store";
import { isStoreLocked } from "@/lib/settings-lock";
import { getMediaUrl } from "@/lib/media-upload";
import { broadcastLembagaChange } from "@/lib/idb-sync";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KontakInfo = {
  alamat?: string;
  telepon?: string;
  email?: string;
  jam_layanan?: string;
  catatan?: string;
};

export type LembagaDesa = {
  id: number;
  slug: string;
  nama: string;
  jenis: string;
  deskripsi: string;
  logo_url: string;
  logo_storage_path: string;
  periode_mulai: string;
  periode_selesai: string;
  kontak_info: KontakInfo;
  enabled: boolean;
  urutan: number;
  created_at: string;
  updated_at?: string;
};

export type StrukturNode = {
  id: number;
  lembaga_id: number;
  parent_id: number | null;
  nama_jabatan: string;
  level: number;
  urutan: number;
  created_at: string;
  updated_at?: string;
  // populated by buildTree()
  children?: StrukturNode[];
  pengurus?: TrusteesLembaga;
};

export type TrusteesLembaga = {
  id: number;
  struktur_id: number;
  nama: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  pendidikan: string;
  alamat: string;
  no_hp: string;
  foto_url: string;
  foto_storage_path: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

// Alias for external use
export type PengurusLembaga = TrusteesLembaga;

export type LembagaWithTree = {
  lembaga: LembagaDesa;
  strukturTree: StrukturNode[];
  allStruktur: StrukturNode[];
  allPengurus: TrusteesLembaga[];
};

// ── IDB Store ─────────────────────────────────────────────────────────────────
const IDB_KEY = "lembaga";

// ── In-Memory Cache ────────────────────────────────────────────────────────────
let _cache: LembagaDesa[] | null = null;
let _initialized = false;

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initLembagaStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked(IDB_KEY)) {
    console.info(`[lembaga-store] Store is locked, initializing from IDB.`);
    const cached = await idbGetAll<LembagaDesa>(IDB_KEY);
    if (cached.length > 0) {
      _cache = cached;
      _initialized = true;
      return;
    }
  }

  try {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from("lembaga_desa")
          .select("*")
          .order("urutan", { ascending: true });

        if (!error && data && data.length > 0) {
          _cache = data as LembagaDesa[];
          _initialized = true;
          await idbReplaceAll(IDB_KEY, _cache);
          console.info(`[lembaga-store] Loaded ${data.length} lembaga dari Supabase`);
          return;
        }
        if (error) {
          console.warn("[lembaga-store] Supabase select error:", error.message);
        }
      }
    }

    const cached = await idbGetAll<LembagaDesa>(IDB_KEY);
    if (cached.length > 0) {
      _cache = cached;
      _initialized = true;
      console.info(`[lembaga-store] Loaded ${cached.length} lembaga dari IDB`);
      return;
    }

    _cache = [];
    _initialized = true;
  } catch (e) {
    console.error("[lembaga-store] Init failed:", e);
    _cache = [];
    _initialized = true;
  }
}

// ── Sync Read ─────────────────────────────────────────────────────────────────

export function listLembaga(): LembagaDesa[] {
  return _cache ?? [];
}

export function listLembagaAktif(): LembagaDesa[] {
  return listLembaga().filter((l) => l.enabled);
}

export function getLembagaBySlug(slug: string): LembagaDesa | null {
  return listLembaga().find((l) => l.slug === slug) ?? null;
}

export function getLembagaById(id: number): LembagaDesa | null {
  return listLembaga().find((l) => l.id === id) ?? null;
}

// ── Struktur Tree ─────────────────────────────────────────────────────────────

/** Bangun tree dari flat struktur array. root = parent_id = null */
export function buildStrukturTree(nodes: StrukturNode[]): StrukturNode[] {
  const map = new Map<number, StrukturNode>();
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  const roots: StrukturNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id == null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }
  // Sort by urutan
  const sortNodes = (arr: StrukturNode[]) => {
    arr.sort((a, b) => a.urutan - b.urutan);
    for (const n of arr) {
      if (n.children?.length) sortNodes(n.children);
    }
  };
  sortNodes(roots);
  return roots;
}

// ── Full Load: Struktur + Pengurus ───────────────────────────────────────────

export type StrukturMap = Record<string, StrukturNode[]>;
export type TrusteesMap = Record<number, TrusteesLembaga[]>;

/**
 * Ambil semua struktur dan pengurus untuk satu lembaga.
 * Loader: first from IDB cache, then from Supabase.
 */
export async function loadLembagaDetail(
  lembagaId: number,
): Promise<{ struktur: StrukturNode[]; urus: TrusteesLembaga[] }> {
  // Check if detail stores are locked (using dynamic naming pattern)
  const isLocked = isStoreLocked(`struktur_${lembagaId}`) || isStoreLocked(`pengurus_${lembagaId}`);

  if (!isSupabaseConfigured) {
    const [sCached, pCached] = await Promise.all([
      idbGetAllDynamic<StrukturNode>(`struktur_${lembagaId}`),
      idbGetAllDynamic<TrusteesLembaga>(`pengurus_${lembagaId}`),
    ]);
    return { struktur: sCached, urus: pCached };
  }

  const sb = getSupabase();
  if (!sb) {
    const [sCached, pCached] = await Promise.all([
      idbGetAllDynamic<StrukturNode>(`struktur_${lembagaId}`),
      idbGetAllDynamic<TrusteesLembaga>(`pengurus_${lembagaId}`),
    ]);
    return { struktur: sCached, urus: pCached };
  }

  const [sRes, pRes] = await Promise.all([
    sb.from("struktur_lembaga").select("*").eq("lembaga_id", lembagaId).order("urutan"),
    sb.from("pengurus_lembaga").select("*"), // load ALL (aktif + non-aktif) untuk edit
  ]);

  const struktur = (sRes.data ?? []) as StrukturNode[];
  const urus = (pRes.data ?? []) as TrusteesLembaga[];

  // Cache per-lembaga ONLY if not locked
  if (!isLocked) {
    await idbReplaceAllDynamic(`struktur_${lembagaId}`, struktur);
    await idbReplaceAllDynamic(`pengurus_${lembagaId}`, urus);
  }

  return { struktur, urus };
}

/**
 * Ambil data lengkap satu lembaga + tree struktur + flat list.
 * Cocok untuk halaman profil.
 */
export async function getLembagaWithStruktur(slug: string): Promise<LembagaWithTree | null> {
  const lembaga = getLembagaBySlug(slug);
  if (!lembaga) return null;

  const { struktur, urus } = await loadLembagaDetail(lembaga.id);

  // Assign pengurus ke struktur node
  const struktMap = new Map<number, StrukturNode>();
  for (const s of struktur) {
    struktMap.set(s.id, { ...s, children: [] });
  }
  for (const p of urus) {
    const node = struktMap.get(p.struktur_id);
    if (node) {
      (node as unknown as { trustees: TrusteesLembaga }).trustees = p;
    }
  }

  const allStruktur = Array.from(struktMap.values());
  const tree = buildStrukturTree(allStruktur);

  return { lembaga, strukturTree: tree, allStruktur, allPengurus: urus };
}

// ── CRUD: Lembaga ──────────────────────────────────────────────────────────────

export type LembagaFormData = Omit<LembagaDesa, "id" | "created_at" | "updated_at">;

export async function addLembaga(
  data: LembagaFormData,
): Promise<{ ok: boolean; message: string; id?: number }> {
  if (listLembaga().find((l) => l.slug === data.slug)) {
    return { ok: false, message: `Slug "${data.slug}" sudah digunakan` };
  }

  const newItem: LembagaDesa = {
    ...data,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };

  const updated = [...listLembaga(), newItem];
  _cache = updated;
  await idbPut(IDB_KEY, newItem);
  await idbReplaceAll(IDB_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { data: inserted, error } = await sb
        .from("lembaga_desa")
        .insert({ ...data })
        .select()
        .single();
      if (error) {
        console.warn("[lembaga-store] Insert error:", error.message);
        return {
          ok: false,
          message: "Gagal menyinkronkan ke cloud. Data tersimpan secara lokal.",
        };
      }
      if (inserted) {
        const idx = _cache!.findIndex((l) => l.slug === data.slug);
        if (idx >= 0) _cache![idx] = inserted as LembagaDesa;
        await idbReplaceAll(IDB_KEY, _cache!);
        broadcastLembagaChange();
        logAudit("add_lembaga", inserted.nama, inserted.jenis);
        return {
          ok: true,
          message: `"${data.nama}" ditambahkan`,
          id: (inserted as { id: number }).id,
        };
      }
    }
  }

  logAudit("add_lembaga", data.nama, data.jenis);
  return { ok: true, message: `"${data.nama}" ditambahkan` };
}

export async function updateLembaga(
  id: number,
  data: Partial<LembagaFormData>,
): Promise<{ ok: boolean; message: string }> {
  const updated = listLembaga().map((l) => (l.id === id ? { ...l, ...data } : l));
  _cache = updated;
  await idbReplaceAll(IDB_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb
        .from("lembaga_desa")
        .update({ ...data })
        .eq("id", id);
      if (error) {
        console.warn("[lembaga-store] Update error:", error.message);
        return {
          ok: false,
          message: "Gagal menyinkronkan ke cloud. Data tersimpan secara lokal.",
        };
      }
    }
  }

  const l = updated.find((x) => x.id === id);
  if (l) logAudit("update_lembaga", l.nama, l.jenis);
  broadcastLembagaChange();
  return { ok: true, message: "Berhasil diperbarui" };
}

export async function deleteLembaga(id: number): Promise<{ ok: boolean; message: string }> {
  const removed = listLembaga().find((l) => l.id === id);
  if (!removed) return { ok: false, message: "Lembaga tidak ditemukan" };

  const updated = listLembaga().filter((l) => l.id !== id);
  _cache = updated;
  await idbReplaceAll(IDB_KEY, updated);
  broadcastLembagaChange();

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("lembaga_desa").delete().eq("id", id);
      if (error) console.error("[lembaga-store] Delete lembaga error:", error.message);
    }
  }

  logAudit("delete_lembaga", removed.nama, removed.jenis);
  return { ok: true, message: `"${removed.nama}" dihapus` };
}

// ── CRUD: Struktur ─────────────────────────────────────────────────────────────

export type StrukturFormData = Omit<
  StrukturNode,
  "id" | "created_at" | "updated_at" | "children" | "pengurus"
>;

export async function addStruktur(
  data: StrukturFormData,
): Promise<{ ok: boolean; message: string; id?: number }> {
  let inserted: Record<string, unknown> | null = null;
  let insertError: { message: string } | null = null;

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const result = await sb
        .from("struktur_lembaga")
        .insert(data as Record<string, unknown>)
        .select()
        .single();
      inserted = result.data;
      insertError = result.error ? { message: result.error.message } : null;
    }
  }

  if (insertError || !inserted) {
    // Offline: store locally
    const tempItem: StrukturNode = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    await idbPutDynamic(`struktur_${data.lembaga_id}`, tempItem);
    broadcastLembagaChange();
    return { ok: true, message: "Jabatan ditambahkan (offline)" };
  }

  await idbPutDynamic(`struktur_${data.lembaga_id}`, inserted as StrukturNode);
  broadcastLembagaChange();
  logAudit("add_struktur", data.nama_jabatan, `lembaga #${data.lembaga_id}`);
  return {
    ok: true,
    message: `"${data.nama_jabatan}" ditambahkan`,
    id: (inserted as { id: number }).id,
  };
}

export async function updateStruktur(
  id: number,
  data: Partial<StrukturFormData>,
  lembagaId: number,
): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      await sb
        .from("struktur_lembaga")
        .update(data as Record<string, unknown>)
        .eq("id", id);
    }
  }
  await idbPutDynamic(`struktur_${lembagaId}`, { id, ...data } as StrukturNode);
  broadcastLembagaChange();
  logAudit("update_struktur", `jabatan #${id}`, "");
  return { ok: true, message: "Jabatan diperbarui" };
}

export async function deleteStruktur(
  id: number,
  lembagaId: number,
): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("struktur_lembaga").delete().eq("id", id);
      if (error) console.error("[lembaga-store] Delete struktur error:", error.message);
    }
  }
  // Also cascade delete related structure via FK
  const allStruktur = await idbGetAllDynamic<StrukturNode>(`struktur_${lembagaId}`);
  const remaining = allStruktur.filter((s) => s.id !== id);
  await idbReplaceAllDynamic(`struktur_${lembagaId}`, remaining);
  broadcastLembagaChange();
  logAudit("delete_struktur", `jabatan #${id}`, "");
  return { ok: true, message: "Jabatan dihapus" };
}

// ── CRUD: Trustees ────────────────────────────────────────────────────────────

export type TrusteesFormData = Omit<TrusteesLembaga, "id" | "created_at" | "updated_at">;

export async function addPengurus(
  data: TrusteesFormData,
  lembagaId: number,
): Promise<{ ok: boolean; message: string; id?: number }> {
  let inserted: Record<string, unknown> | null = null;
  let insertError: { message: string } | null = null;

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const result = await sb
        .from("pengurus_lembaga")
        .insert(data as Record<string, unknown>)
        .select()
        .single();
      inserted = result.data;
      insertError = result.error ? { message: result.error.message } : null;
    }
  }

  if (insertError || !inserted) {
    const tempItem: TrusteesLembaga = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    await idbPutDynamic(`pengurus_${lembagaId}`, tempItem);
    broadcastLembagaChange();
    return { ok: true, message: "Pengurus ditambahkan (offline)" };
  }

  await idbPutDynamic(`pengurus_${lembagaId}`, inserted as TrusteesLembaga);
  broadcastLembagaChange();
  logAudit("add_pengurus", data.nama, `struktur #${data.struktur_id}`);
  return { ok: true, message: `"${data.nama}" ditambahkan`, id: (inserted as { id: number }).id };
}

export async function updatePengurus(
  id: number,
  data: Partial<TrusteesFormData>,
  lembagaId: number,
): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      await sb
        .from("pengurus_lembaga")
        .update(data as Record<string, unknown>)
        .eq("id", id);
    }
  }
  await idbPutDynamic(`pengurus_${lembagaId}`, { id, ...data } as TrusteesLembaga);
  broadcastLembagaChange();
  logAudit("update_pengurus", `pengurus #${id}`, "");
  return { ok: true, message: "Pengurus diperbarui" };
}

export async function deletePengurus(
  id: number,
  lembagaId: number,
): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("pengurus_lembaga").delete().eq("id", id);
      if (error) console.error("[lembaga-store] Delete pengurus error:", error.message);
    }
  }
  const all = await idbGetAllDynamic<TrusteesLembaga>(`pengurus_${lembagaId}`);
  await idbReplaceAllDynamic(
    `pengurus_${lembagaId}`,
    all.filter((p) => p.id !== id),
  );
  broadcastLembagaChange();
  logAudit("delete_pengurus", `pengurus #${id}`, "");
  return { ok: true, message: "Pengurus dihapus" };
}

// ── Autofill ─────────────────────────────────────────────────────────────────

export async function autofillFromNik(nik: string): Promise<{
  nama: string;
  jenis_kelamin: "Laki-Laki" | "Perempuan";
  tempat_lahir: string;
  tanggal_lahir: string;
  pendidikan: string;
} | null> {
  // Delegate to shared helper — Supabase → IndexedDB fallback
  return _wargaAutofill(nik);
}

// ── Helper: count aktif pengurus per lembaga ─────────────────────────────────

export async function countPengurusAktif(lembagaId: number): Promise<number> {
  const result = await loadLembagaDetail(lembagaId);
  return result.urus.filter((p) => p.status === "aktif").length;
}

// ── Reset Store ──────────────────────────────────────────────────────────────

export function resetLembagaCache(): void {
  _cache = null;
  _initialized = false;
}
