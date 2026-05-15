/**
 * perangkat-desa-store.ts — Perangkat Desa & Struktur Tree
 *
 * Two-table model:
 *   perangkat_desa_struktur (tree jabatan hierarchy)
 *   perangkat_desa (orang/personel → FK struktur_id)
 *
 * Load order: Supabase → IndexedDB → empty fallback.
 * Autofill from warga via NIK lookup.
 */

import { idbGetAll, idbPut, idbReplaceAll, openIDB } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { logAudit } from "@/lib/settings-store";
import { isStoreLocked } from "@/lib/settings-lock";

// ── Types: Struktur (Tree Jabatan) ─────────────────────────────────────────

export type PerangkatStruktur = {
  id: number;
  parent_id: number | null;
  nama_jabatan: string;
  kategori: string;
  level_hierarchy: number;
  urutan: number;
  warna_label: string | null;
  is_single_position: boolean;
  status_aktif: boolean;
  created_at: string;
  updated_at?: string;
  // populated by buildStrukturTree()
  children?: PerangkatStruktur[];
  /** personnel currently filling this position */
  person?: PerangkatPerson | null;
};

export type PerangkatPerson = {
  id: number;
  struktur_id: number;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  pendidikan: string;
  alamat: string;
  no_hp: string;
  email: string;
  foto_url: string;
  foto_storage_path: string;
  nomor_sk: string;
  tanggal_terbit_sk: string;
  tanggal_berakhir: string;
  status_aktif: boolean;
  created_at: string;
  updated_at?: string;
};

// Legacy alias for backward compat
export type PerangkatDesa = PerangkatPerson;

export type PerangkatWithPerson = {
  struktur: PerangkatStruktur;
  person: PerangkatPerson | null;
};

// ── Dynamic IDB helpers (bypass IDBStoreName union for struktur) ─────────────

async function idbGetAllDynamic<T>(storeName: string): Promise<T[]> {
  if (typeof window === "undefined") return [];
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbReplaceAllDynamic<T>(storeName: string, records: T[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const oStore = tx.objectStore(storeName);
    oStore.clear();
    for (const r of records) oStore.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbPutDynamic<T>(storeName: string, record: T): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── IDB Keys ────────────────────────────────────────────────────────────────

const STRUKTUR_KEY = "perangkat_struktur";
const PERANGKAT_KEY = "perangkat";

// ── In-Memory Cache ────────────────────────────────────────────────────────

let _strukturCache: PerangkatStruktur[] | null = null;
let _perangkatCache: PerangkatPerson[] | null = null;
let _initialized = false;

// ── Build Tree ─────────────────────────────────────────────────────────────

/** Bangun tree dari flat struktur array. root = parent_id = null */
export function buildPerangkatTree(nodes: PerangkatStruktur[]): PerangkatStruktur[] {
  const map = new Map<number, PerangkatStruktur>();
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  const roots: PerangkatStruktur[] = [];
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
  const sortNodes = (arr: PerangkatStruktur[]) => {
    arr.sort((a, b) => a.urutan - b.urutan);
    for (const n of arr) {
      if (n.children?.length) sortNodes(n.children);
    }
  };
  sortNodes(roots);
  return roots;
}

// ── Init ────────────────────────────────────────────────────────────────────

export async function initPerangkatStore(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  // ── Data Guard: Jika store terkunci, prioritaskan IDB ──
  if (isStoreLocked(STRUKTUR_KEY) || isStoreLocked(PERANGKAT_KEY)) {
    console.info(`[perangkat-store] Store is locked, initializing from IDB.`);
    const [s, p] = await Promise.all([
      idbGetAll<PerangkatStruktur>(STRUKTUR_KEY),
      idbGetAll<PerangkatPerson>(PERANGKAT_KEY),
    ]);
    if (s.length > 0 || p.length > 0) {
      _strukturCache = s;
      _perangkatCache = p;
      _initialized = true;
      return;
    }
  }

  try {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const [sRes, pRes] = await Promise.all([
          sb.from("perangkat_desa_struktur").select("*").order("urutan"),
          sb.from("perangkat_desa").select("*"),
        ]);

        if (!sRes.error && (sRes.data ?? []).length > 0) {
          _strukturCache = sRes.data as PerangkatStruktur[];
          if (!isStoreLocked(STRUKTUR_KEY)) {
            await idbReplaceAllDynamic(STRUKTUR_KEY, _strukturCache);
          }
        }
        if (!pRes.error && (pRes.data ?? []).length > 0) {
          _perangkatCache = pRes.data as PerangkatPerson[];
          if (!isStoreLocked(PERANGKAT_KEY)) {
            await idbReplaceAllDynamic(PERANGKAT_KEY, _perangkatCache);
          }
        }
        if (!sRes.error && !pRes.error) {
          _initialized = true;
          console.info(
            `[perangkat-store] Loaded ${_strukturCache?.length ?? 0} struktur, ${_perangkatCache?.length ?? 0} perangkat dari Supabase`,
          );
          return;
        }
      }
    }

    // Fallback: IndexedDB
    const [sCached, pCached] = await Promise.all([
      idbGetAllDynamic<PerangkatStruktur>(STRUKTUR_KEY),
      idbGetAllDynamic<PerangkatPerson>(PERANGKAT_KEY),
    ]);
    _strukturCache = sCached.length > 0 ? sCached : [];
    _perangkatCache = pCached.length > 0 ? pCached : [];
    _initialized = true;
    if (sCached.length > 0 || pCached.length > 0) {
      console.info(
        `[perangkat-store] Loaded ${sCached.length} struktur, ${pCached.length} perangkat dari IDB`,
      );
    }
  } catch (e) {
    console.error("[perangkat-store] Init failed:", e);
    _strukturCache = [];
    _perangkatCache = [];
    _initialized = true;
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function listStruktur(): PerangkatStruktur[] {
  return _strukturCache ?? [];
}

export function listStrukturAktif(): PerangkatStruktur[] {
  return listStruktur().filter((s) => s.status_aktif);
}

export function getStrukturById(id: number): PerangkatStruktur | null {
  return listStruktur().find((s) => s.id === id) ?? null;
}

export function listPerangkat(): PerangkatPerson[] {
  return _perangkatCache ?? [];
}

export function listPerangkatAktif(): PerangkatPerson[] {
  return listPerangkat().filter((p) => p.status_aktif);
}

export function getPerangkatById(id: number): PerangkatPerson | null {
  return listPerangkat().find((p) => p.id === id) ?? null;
}

export function getPerangkatByNik(nik: string): PerangkatPerson | null {
  return listPerangkat().find((p) => p.nik === nik) ?? null;
}

/** Get struktur tree with person attached to each node */
export function getPerangkatTreeWithPersons(): PerangkatStruktur[] {
  const personsByStruktur = new Map<number, PerangkatPerson>();
  for (const p of listPerangkatAktif()) {
    // For single-position, only keep first active person
    const existing = personsByStruktur.get(p.struktur_id);
    if (!existing) {
      personsByStruktur.set(p.struktur_id, p);
    }
  }

  const flat = listStrukturAktif().map((s) => ({
    ...s,
    person: personsByStruktur.get(s.id) ?? null,
  }));
  return buildPerangkatTree(flat);
}

/** Get all persons for a specific struktur_id (for multi-fill positions like Kadus) */
export function getPerangkatByStrukturId(strukturId: number): PerangkatPerson[] {
  return listPerangkat().filter((p) => p.struktur_id === strukturId && p.status_aktif);
}

// ── CRUD: Struktur ───────────────────────────────────────────────────────────

export type StrukturFormData = Omit<
  PerangkatStruktur,
  "id" | "created_at" | "updated_at" | "children" | "person"
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
        .from("perangkat_desa_struktur")
        .insert(data as Record<string, unknown>)
        .select()
        .single();
      inserted = result.data;
      insertError = result.error ? { message: result.error.message } : null;
    }
  }

  if (insertError || !inserted) {
    // Offline: store locally
    const tempItem: PerangkatStruktur = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    await idbPutDynamic(STRUKTUR_KEY, tempItem);
    return { ok: true, message: "Jabatan ditambahkan (offline)" };
  }

  await idbPutDynamic(STRUKTUR_KEY, inserted as PerangkatStruktur);
  logAudit("add_struktur", data.nama_jabatan, `kategori: ${data.kategori}`);
  return {
    ok: true,
    message: `"${data.nama_jabatan}" ditambahkan`,
    id: (inserted as { id: number }).id,
  };
}

export async function updateStruktur(
  id: number,
  data: Partial<StrukturFormData>,
): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb
        .from("perangkat_desa_struktur")
        .update(data as Record<string, unknown>)
        .eq("id", id);
      if (error) {
        console.warn("[perangkat-desa-store] updateStruktur error:", error.message);
      }
    }
  }
  await idbPutDynamic(STRUKTUR_KEY, { id, ...data } as PerangkatStruktur);
  const s = getStrukturById(id);
  if (s) logAudit("update_struktur", s.nama_jabatan, `level ${s.level_hierarchy}`);
  return { ok: true, message: "Jabatan diperbarui" };
}

export async function deleteStruktur(id: number): Promise<{ ok: boolean; message: string }> {
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("perangkat_desa_struktur").delete().eq("id", id);
      if (error) console.error("[perangkat-desa-store] deleteStruktur error:", error.message);
    }
  }
  const all = await idbGetAllDynamic<PerangkatStruktur>(STRUKTUR_KEY);
  await idbReplaceAllDynamic(
    STRUKTUR_KEY,
    all.filter((s) => s.id !== id),
  );
  const s = all.find((x) => x.id === id);
  if (s) logAudit("delete_struktur", s.nama_jabatan, "");
  return { ok: true, message: "Jabatan dihapus" };
}

// ── CRUD: Perangkat (Person) ───────────────────────────────────────────────

export type PerangkatFormData = Omit<PerangkatPerson, "id" | "created_at" | "updated_at">;

/**
 * Add a person to a struktur position.
 * For is_single_position=true struktur, checks if position already filled.
 */
export async function addPerangkat(
  data: PerangkatFormData,
): Promise<{ ok: boolean; message: string; id?: number }> {
  // Check single-position conflict
  const strukt = getStrukturById(data.struktur_id);
  if (strukt?.is_single_position) {
    const existing = listPerangkatAktif().find((p) => p.struktur_id === data.struktur_id);
    if (existing) {
      return {
        ok: false,
        message: `"${strukt.nama_jabatan}" sudah diisi oleh ${existing.nama}`,
      };
    }
  }

  const newItem: PerangkatPerson = {
    ...data,
    id: Date.now(),
    created_at: new Date().toISOString(),
  };

  const updated = [...listPerangkat(), newItem];
  _perangkatCache = updated;
  await idbPut(PERANGKAT_KEY, newItem);
  await idbReplaceAllDynamic(PERANGKAT_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { data: inserted, error } = await sb
        .from("perangkat_desa")
        .insert({ ...data })
        .select()
        .single();
      if (error) {
        console.warn("[perangkat-store] Insert error:", error.message);
        return { ok: true, message: "Tersimpan lokal (sync cloud gagal)" };
      }
      if (inserted) {
        const idx = _perangkatCache!.findIndex((p) => p.struktur_id === data.struktur_id);
        if (idx >= 0) _perangkatCache![idx] = inserted as PerangkatPerson;
        await idbReplaceAllDynamic(PERANGKAT_KEY, _perangkatCache!);
        logAudit("add_perangkat", inserted.nama as string, strukt?.nama_jabatan ?? "");
        return {
          ok: true,
          message: `"${data.nama}" ditambahkan ke "${strukt?.nama_jabatan}"`,
          id: (inserted as { id: number }).id,
        };
      }
    }
  }

  logAudit("add_perangkat", data.nama, strukt?.nama_jabatan ?? "");
  return { ok: true, message: `"${data.nama}" ditambahkan ke "${strukt?.nama_jabatan}"` };
}

export async function updatePerangkat(
  id: number,
  data: Partial<PerangkatFormData>,
): Promise<{ ok: boolean; message: string }> {
  const updated = listPerangkat().map((p) => (p.id === id ? { ...p, ...data } : p));
  _perangkatCache = updated;
  await idbReplaceAllDynamic(PERANGKAT_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb
        .from("perangkat_desa")
        .update({ ...data })
        .eq("id", id);
      if (error) {
        console.warn("[perangkat-store] Update error:", error.message);
        return { ok: true, message: "Diperbarui secara lokal (sync cloud gagal)" };
      }
    }
  }

  const p = updated.find((x) => x.id === id);
  if (p) {
    const strukt = getStrukturById(p.struktur_id);
    logAudit("update_perangkat", p.nama, strukt?.nama_jabatan ?? "");
  }
  return { ok: true, message: "Berhasil diperbarui" };
}

export async function deletePerangkat(id: number): Promise<{ ok: boolean; message: string }> {
  const removed = listPerangkat().find((p) => p.id === id);
  if (!removed) return { ok: false, message: "Data tidak ditemukan" };

  const updated = listPerangkat().filter((p) => p.id !== id);
  _perangkatCache = updated;
  await idbReplaceAllDynamic(PERANGKAT_KEY, updated);

  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      await sb.from("perangkat_desa").delete().eq("id", id);
    }
  }

  const strukt = getStrukturById(removed.struktur_id);
  logAudit("delete_perangkat", removed.nama, strukt?.nama_jabatan ?? "");
  return { ok: true, message: `"${removed.nama}" dihapus dari "${strukt?.nama_jabatan ?? "—"}"` };
}

export async function nonaktifkanPerangkat(
  id: number,
  tanggal_berakhir: string,
): Promise<{ ok: boolean; message: string }> {
  return updatePerangkat(id, { status_aktif: false, tanggal_berakhir });
}

// ── Autofill from Warga ─────────────────────────────────────────────────────

export type AutofillResult = {
  nik: string;
  nama: string;
  jenis_kelamin: "Laki-Laki" | "Perempuan";
  tempat_lahir: string;
  tanggal_lahir: string;
  pendidikan: string;
};

/**
 * Lookup warga by NIK untuk autofill form perangkat.
 * Returns partial data: nama, ttl, jk, pendidikan.
 */
export async function autofillFromNik(nik: string): Promise<AutofillResult | null> {
  if (!nik || nik.replace(/\D/g, "").length < 14) return null;

  try {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb
          .from("warga")
          .select("nik,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,pendidikan")
          .eq("nik", nik)
          .maybeSingle();
        if (data) {
          return {
            nik: String(data.nik ?? ""),
            nama: String(data.nama ?? ""),
            jenis_kelamin: (data.jenis_kelamin as "Laki-Laki" | "Perempuan") ?? "Laki-Laki",
            tempat_lahir: String(data.tempat_lahir ?? ""),
            tanggal_lahir: data.tanggal_lahir ? String(data.tanggal_lahir).slice(0, 10) : "",
            pendidikan: String(data.pendidikan ?? ""),
          };
        }
      }
    }

    // Fallback: IDB warga
    const warga = await idbGetAllDynamic<Record<string, unknown>>("penduduk");
    const found = warga.find((w) => String(w.nik ?? "") === nik);
    if (found) {
      return {
        nik: String(found.nik ?? ""),
        nama: String(found.nama ?? ""),
        jenis_kelamin: (found.jenis_kelamin as "Laki-Laki" | "Perempuan") ?? "Laki-Laki",
        tempat_lahir: String(found.tempat_lahir ?? ""),
        tanggal_lahir: found.tanggal_lahir ? String(found.tanggal_lahir).slice(0, 10) : "",
        pendidikan: String(found.pendidikan ?? ""),
      };
    }
  } catch (e) {
    console.warn("[perangkat-store] autofillFromNik error:", e);
  }
  return null;
}

// ── Reset ────────────────────────────────────────────────────────────────────

export function resetPerangkatCache(): void {
  _strukturCache = null;
  _perangkatCache = null;
  _initialized = false;
}
