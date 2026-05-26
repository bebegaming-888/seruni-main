/**
 * src/components/admin/WilayahManager.tsx
 * CRUD interface for WILAYAH administrative area data.
 * Allows admin to manage: Provinsi, Kabupaten, Kecamatan, Desa.
 *
 * Source of truth: public.wilayah table via /api/wilayah
 */

import React, { useEffect, useState } from "react";
import {
  useWilayahStore,
  wilayahActions,
  parseWilayahData,
  getVillageHierarchy,
} from "@/lib/wilayah-store";
import type {
  WilayahRecord,
  WilayahLevel,
  CreateWilayahInput,
  UpdateWilayahInput,
  WilayahData,
} from "@/types/wilayah";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<WilayahLevel, string> = {
  provinsi: "Provinsi",
  kabupaten: "Kabupaten",
  kecamatan: "Kecamatan",
  desa: "Desa",
};

const LEVEL_COLORS: Record<WilayahLevel, string> = {
  provinsi: "bg-blue-100 text-blue-800 border-blue-200",
  kabupaten: "bg-green-100 text-green-800 border-green-200",
  kecamatan: "bg-amber-100 text-amber-800 border-amber-200",
  desa: "bg-purple-100 text-purple-800 border-purple-200",
};

const LEVEL_OPTIONS: Array<{ value: WilayahLevel; label: string }> = [
  { value: "provinsi", label: "Provinsi" },
  { value: "kabupaten", label: "Kabupaten" },
  { value: "kecamatan", label: "Kecamatan" },
  { value: "desa", label: "Desa" },
];

function levelBadge(level: WilayahLevel) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_COLORS[level]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}

// ── Edit Modal ──────────────────────────────────────────────────────────────────

interface EditModalProps {
  record: WilayahRecord | null; // null = create mode
  allRecords: WilayahRecord[];
  onSave: (data: CreateWilayahInput | UpdateWilayahInput, id?: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function EditModal({ record, allRecords, onSave, onClose, loading }: EditModalProps) {
  const isCreate = !record;
  const [level, setLevel] = useState<WilayahLevel>(record?.level ?? "desa");
  const [kode, setKode] = useState(record?.kode ?? "");
  const [nama, setNama] = useState(record?.nama ?? "");
  const [parentKode, setParentKode] = useState<string>(record?.parent_kode ?? "");
  const [position, setPosition] = useState(String(record?.position ?? 0));
  const [extraData, setExtraData] = useState<WilayahData>(() =>
    record ? parseWilayahData(record.data) : {},
  );

  // Build parent options based on selected level
  const parentOptions = allRecords.filter((w) => {
    if (level === "provinsi") return false;
    if (level === "kabupaten") return w.level === "provinsi";
    if (level === "kecamatan") return w.level === "kabupaten";
    if (level === "desa") return w.level === "kecamatan";
    return false;
  });

  // Province options for all
  const provinceOptions = allRecords.filter((w) => w.level === "provinsi" && w.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    if (!isCreate && !kode.trim()) {
      toast.error("Kode tidak boleh kosong");
      return;
    }

    const data: CreateWilayahInput | UpdateWilayahInput = isCreate
      ? {
          level,
          kode,
          nama: nama.trim(),
          parent_kode: parentKode || null,
          data: extraData,
          position: Number(position) || 0,
        }
      : {
          nama: nama.trim(),
          parent_kode: parentKode || null,
          data: extraData,
          position: Number(position) || 0,
        };

    await onSave(data, record?.id);
  };

  const handleExtraChange = (key: string, value: string) => {
    setExtraData((prev) => ({ ...prev, [key]: value }));
  };

  const extraFieldsByLevel: Record<
    WilayahLevel,
    Array<{ key: keyof WilayahData; label: string; placeholder?: string }>
  > = {
    provinsi: [
      { key: "ibukota", label: "Ibukota", placeholder: "contoh: Denpasar" },
      { key: "kode_pos_prefix", label: "Prefix Kode Pos", placeholder: "contoh: 80" },
    ],
    kabupaten: [
      { key: "ibukota", label: "Ibukota", placeholder: "contoh: Mengwi" },
      { key: "kode_pos_prefix", label: "Prefix Kode Pos", placeholder: "contoh: 803" },
    ],
    kecamatan: [{ key: "luas_km2", label: "Luas (km²)", placeholder: "contoh: 68.12" }],
    desa: [
      { key: "alamat", label: "Alamat", placeholder: "Jl. Raya ..." },
      { key: "telepon", label: "Telepon", placeholder: "(0361) ..." },
      { key: "whatsapp", label: "WhatsApp", placeholder: "0812..." },
      { key: "email", label: "Email", placeholder: "info@..." },
      { key: "website", label: "Website", placeholder: "https://..." },
      { key: "kode_pos", label: "Kode Pos", placeholder: "80361" },
      { key: "rt_rw", label: "RT/RW", placeholder: "RT 001 RW 002" },
      { key: "dusun", label: "Dusun", placeholder: "Mumbul" },
      { key: "koordinat_lat", label: "Latitude", placeholder: "-8.6102" },
      { key: "koordinat_lng", label: "Longitude", placeholder: "115.1834" },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isCreate ? "Tambah Wilayah" : "Edit Wilayah"}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Tutup dialog"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Level */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Level</label>
            <div className="flex gap-2 flex-wrap">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setLevel(opt.value);
                    setParentKode("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    level === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kode */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Kode {isCreate && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              disabled={!isCreate}
              placeholder={isCreate ? "PROV-51, KAB-BADUNG, dll" : ""}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            {!isCreate && (
              <p className="text-xs text-muted-foreground mt-1">Kode tidak dapat diubah</p>
            )}
          </div>

          {/* Nama */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nama {isCreate && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama wilayah..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Parent (hidden for provinsi) */}
          {level !== "provinsi" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Induk</label>
              <select
                value={parentKode}
                onChange={(e) => setParentKode(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">
                  — Pilih{" "}
                  {level === "kabupaten"
                    ? "Provinsi"
                    : level === "kecamatan"
                      ? "Kabupaten"
                      : "Kecamatan"}{" "}
                  —
                </option>
                {(level === "kabupaten" ? provinceOptions : parentOptions).map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.nama} ({p.kode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Position */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Urutan Tampil</label>
            <input
              type="number"
              min={0}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm w-24"
            />
          </div>

          {/* Extra Data Fields */}
          {extraFieldsByLevel[level].map((field) => (
            <div key={String(field.key)}>
              <label className="block text-sm font-medium mb-1.5">{field.label}</label>
              <input
                type="text"
                value={((extraData as Record<string, unknown>)[field.key] as string) ?? ""}
                onChange={(e) => handleExtraChange(String(field.key), e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !nama.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : isCreate ? "Tambah" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ─────────────────────────────────────────────────────────

interface DeleteModalProps {
  record: WilayahRecord;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function DeleteModal({ record, onConfirm, onClose, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl border shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-2">Nonaktifkan Wilayah</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Yakin ingin menonaktifkan <strong>{record.nama}</strong>? Data tidak dihapus dari database
          — hanya di-set nonaktif.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Menghapus..." : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────────

interface Props {
  username?: string;
}

export function WilayahManager({ username = "Admin" }: Props) {
  const { records, loading, error, initialized } = useWilayahStore();
  const actions = wilayahActions();

  const [filterLevel, setFilterLevel] = useState<WilayahLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<WilayahRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WilayahRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    actions.init();
  }, []);

  const hierarchy = getVillageHierarchy(records);
  const activeRecords = records.filter((r) => r.is_active);

  const filtered = activeRecords.filter((r) => {
    if (filterLevel !== "all" && r.level !== filterLevel) return false;
    if (
      search &&
      !r.nama.toLowerCase().includes(search.toLowerCase()) &&
      !r.kode.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // Sort: provinsi first, then kabupaten, kecamatan, desa
  const levelOrder: Record<WilayahLevel, number> = {
    provinsi: 0,
    kabupaten: 1,
    kecamatan: 2,
    desa: 3,
  };
  filtered.sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.position - b.position);

  const handleSave = async (data: CreateWilayahInput | UpdateWilayahInput, id?: string) => {
    try {
      if (id) {
        await actions.update(id, data as UpdateWilayahInput);
        toast.success("Wilayah berhasil diperbarui");
      } else {
        await actions.create(data as CreateWilayahInput);
        toast.success("Wilayah berhasil ditambahkan");
      }
      setEditTarget(null);
      setShowCreate(false);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await actions.remove(deleteTarget.id);
      toast.success(`"${deleteTarget.nama}" dinonaktifkan`);
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Wilayah</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola data wilayah: Provinsi, Kabupaten, Kecamatan, Desa
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <span>+</span> Tambah Wilayah
        </button>
      </div>

      {/* Hierarchy Banner */}
      {hierarchy.desa && (
        <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Hierarki Desa:
          </span>
          {[
            { label: hierarchy.provinsi?.nama ?? "—", level: "provinsi" },
            { label: hierarchy.kabupaten?.nama ?? "—", level: "kabupaten" },
            { label: hierarchy.kecamatan?.nama ?? "—", level: "kecamatan" },
            { label: hierarchy.desa.nama, level: "desa" },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_COLORS[item.level as WilayahLevel]}`}
              >
                {item.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Cari nama atau kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterLevel("all")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filterLevel === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            Semua
          </button>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterLevel(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filterLevel === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {(["provinsi", "kabupaten", "kecamatan", "desa"] as WilayahLevel[]).map((level) => {
          const count = activeRecords.filter((r) => r.level === level).length;
          return (
            <div
              key={level}
              className={`rounded-xl border p-4 ${LEVEL_COLORS[level].replace("text-", "").replace("border-", "border-").replace("bg-", "bg-opacity-[0.07] ")}`}
              style={{
                borderColor: `var(--${level === "provinsi" ? "blue" : level === "kabupaten" ? "green" : level === "kecamatan" ? "amber" : "purple"}-200)`,
                background: `var(--${level === "provinsi" ? "blue" : level === "kabupaten" ? "green" : level === "kecamatan" ? "amber" : "purple"}-50)`,
              }}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium text-muted-foreground">{LEVEL_LABELS[level]}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left font-medium px-4 py-3">Level</th>
                <th className="text-left font-medium px-4 py-3">Kode</th>
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Induk</th>
                <th className="text-left font-medium px-4 py-3">Urutan</th>
                <th className="text-right font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && !initialized ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {search || filterLevel !== "all"
                      ? "Tidak ada hasil pencarian"
                      : "Belum ada data wilayah"}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const extra = parseWilayahData(r.data);
                  const parent = records.find((w) => w.kode === r.parent_kode && w.is_active);
                  return (
                    <tr key={r.id} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3">{levelBadge(r.level)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.kode}</td>
                      <td className="px-4 py-3 font-medium">
                        {r.nama}
                        {r.level === "desa" && extra.alamat && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {String(extra.alamat)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {parent ? parent.nama : r.level === "provinsi" ? "— (Akar)" : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.position}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setEditTarget(r)}
                            className="px-3 py-1 rounded-lg border border-input text-xs hover:bg-muted transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50 transition-colors"
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {/* Modals */}
      {(showCreate || editTarget) && (
        <EditModal
          record={editTarget}
          allRecords={records}
          onSave={handleSave}
          onClose={() => {
            setEditTarget(null);
            setShowCreate(false);
          }}
          loading={loading}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={loading}
        />
      )}
    </div>
  );
}
