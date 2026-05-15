import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Search,
  Plus,
  Upload,
  Download,
  FileText,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Check,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRightLeft,
  RefreshCw,
  CloudUpload,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listPenduduk,
  addPenduduk,
  updatePenduduk,
  deletePenduduk,
  importPenduduk,
  exportPendudukCSV,
  exportPendudukTemplate,
  exportPendudukXLSX,
  purgeAllPenduduk,
  isUsingMock,
  initPendudukStore,
  syncAllToSupabase,
  pullFromSupabase,
  type SmartImportResult,
} from "@/lib/penduduk-store";
import { getSettings } from "@/lib/settings-store";
import { getSession } from "@/lib/auth";
import {
  type Penduduk,
  PEKERJAAN_LIST,
  PENDIDIKAN_LIST,
  AGAMA_LIST,
  SUKU_LIST,
  STATUS_DALAM_KK_LIST,
  GOLONGAN_DARAH_LIST,
  KONDISI_FISIK_LIST,
  KEPEMILIKAN_RUMAH_LIST,
  JENIS_LANTAI_LIST,
  JENIS_DINDING_LIST,
  JENIS_ATAP_LIST,
  KEPEMILIKAN_TANAH_LIST,
  PENERANGAN_LIST,
  SUMBER_ENERGI_LIST,
  MCK_LIST,
  SUMBER_AIR_LIST,
  KEPEMILIKAN_ASET_LIST,
} from "@/data/penduduk";
import * as XLSX from "xlsx";

const PAGE_SIZE = 20;

function buildEmptyPenduduk(): Penduduk {
  // Baca dari settings store — sekarang backed by wilayah-store (database)
  const fallback = {
    province: "Nusa Tenggara Barat",
    regency: "Lombok Timur",
    district: "Pringgabaya",
    name: "Desa",
    default_rt: "001",
    default_rw: "001",
    dusun_list: ["Dusun 1", "Dusun 2"],
  };
  let loc = fallback;
  try {
    const w = getSettings().wilayah;
    loc = {
      province: w.province ?? "Nusa Tenggara Barat",
      regency: w.regency ?? "Lombok Timur",
      district: w.district ?? "Pringgabaya",
      name: w.village ?? "Desa",
      default_rt: w.default_rt,
      default_rw: w.default_rw,
      dusun_list:
        Array.isArray(w.dusun_list) && w.dusun_list.length > 0 ? w.dusun_list : fallback.dusun_list,
    };
  } catch {
    /* SSR — pakai fallback */
  }

  return {
    provinsi: loc.province,
    kabupaten: loc.regency,
    kecamatan: loc.district,
    desa: loc.name,
    dusun: loc.dusun_list[0] ?? "Mandar",
    rt: loc.default_rt,
    rw: loc.default_rw,
    nama: "",
    jenis_kelamin: "Laki-Laki",
    status_dalam_kk: "Kepala Keluarga",
    no_kk: "",
    nik: "",
    status_perkawinan: "Belum Kawin",
    tempat_lahir: "",
    tanggal_lahir: "",
    pendidikan: "",
    pekerjaan: "Petani",
    pendapatan_bulan: "0",
    kewarganegaraan: "Indonesia",
    agama: "Islam",
    suku: "Sasak",
    kepemilikan_rumah: "-",
    luas_rumah: "-",
    jumlah_lantai: "-",
    jenis_lantai: "-",
    jenis_dinding: "-",
    jenis_atap: "-",
    kepemilikan_tanah: "-",
    luas_tanah: "-",
    penerangan: "-",
    sumber_energi_masak: "-",
    mck: "-",
    sumber_air: "-",
    bantuan_sosial: "Tidak",
    bantuan_extra: "Tidak",
    bpjs_kesehatan: "Tidak",
    bpjs_ketenagakerjaan: "Tidak",
    kepemilikan_aset: "Tidak",
    kondisi_fisik: "Normal",
    nama_ibu: "",
    nama_bapak: "",
    golongan_darah: "-",
    no_hp: "",
    alamat: "",
  };
}

type ModalMode = "add" | "edit" | "import" | "purge" | null;

export function PendudukManager({ username = "Admin" }: { username?: string }) {
  const session = getSession();
  const isSuperAdmin = session?.role === "Super Admin";

  const [data, setData] = useState<Penduduk[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterJK, setFilterJK] = useState("");
  const [filterDusun, setFilterDusun] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalMode>(null);
  // Lazy init — runs during component mount, not module load, safe from HMR
  const [form, setForm] = useState<Penduduk>(() => buildEmptyPenduduk());
  const [formErr, setFormErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    mode: string;
    name: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ title: string; messages: string[] } | null>(null);
  const [smartResult, setSmartResult] = useState<SmartImportResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setData(listPenduduk()), []);

  useEffect(() => {
    initPendudukStore().then(() => {
      setData(listPenduduk());
      setLoading(false);
    });
  }, []);

  // ── Scroll to top of table on page change ───────────────────────────────
  useEffect(() => {
    const el = document.getElementById("penduduk-table-top");
    if (el) {
      const offset = 140;
      const top = el.offsetTop - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [page]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((p) => {
      if (filterJK && p.jenis_kelamin !== filterJK) return false;
      if (filterDusun && p.dusun !== filterDusun) return false;
      if (!s) return true;
      return [p.nik, p.nama, p.dusun, p.pekerjaan, p.no_kk].some((v) =>
        (v ?? "").toLowerCase().includes(s),
      );
    });
  }, [data, q, filterJK, filterDusun]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const usingMock = isUsingMock();

  function hitungUmur(tgl: string) {
    if (!tgl) return "-";
    const d = new Date(tgl);
    if (isNaN(d.getTime())) return "-";
    const age = new Date().getFullYear() - d.getFullYear();
    return String(age);
  }

  /** Format ISO date string (yyyy-mm-dd) → dd/mm/yyyy untuk tampilan Indonesia. */
  function formatTanggal(iso: string | undefined | null): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function showInfoDialog(title: string, messages: string[]) {
    setInfoDialog({ title, messages });
  }

  function openAdd() {
    setForm(buildEmptyPenduduk());
    setFormErr("");
    setModal("add");
  }
  function openEdit(p: Penduduk) {
    setForm({ ...p });
    setFormErr("");
    setModal("edit");
  }

  async function handleSave() {
    if (!/^\d{16}$/.test(form.nik)) {
      setFormErr("NIK harus 16 digit angka");
      showInfoDialog("Data Tidak Lengkap", ["NIK harus 16 digit angka."]);
      return;
    }
    if (!/^\d{16}$/.test(form.no_kk ?? "")) {
      setFormErr("No. KK harus 16 digit angka");
      showInfoDialog("Data Tidak Lengkap", ["No. KK harus 16 digit angka."]);
      return;
    }
    if (!form.nama.trim()) {
      setFormErr("Nama tidak boleh kosong");
      showInfoDialog("Data Tidak Lengkap", ["Nama lengkap tidak boleh kosong."]);
      return;
    }
    const isAdd = modal === "add";
    setConfirmTarget({
      mode: isAdd ? "add" : "edit",
      name: form.nama,
      message: isAdd
        ? `Tambah penduduk "${form.nama}" (NIK: ${form.nik}) ke sistem?`
        : `Simpan perubahan data "${form.nama}" (NIK: ${form.nik})?`,
      action: async () => {
        const result = isAdd
          ? await addPenduduk(form, username)
          : await updatePenduduk(form, username);
        if (!result.ok) {
          setFormErr(result.message);
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        refresh();
        setModal(null);
      },
    });
  }

  async function handleDelete(nik: string) {
    const r = await deletePenduduk(nik, username);
    if (r.ok) {
      toast.success("Data dihapus");
      refresh();
    } else toast.error(r.message);
    setDeleteTarget(null);
  }

  async function runSmartImport(rows: Record<string, string>[]) {
    const result = await importPenduduk(rows, username);
    setSmartResult(result);
    refresh();
    toast.success(`Import selesai: ${result.added} baru, ${result.updated} diperbarui`);
    if (result.errors.length > 0) {
      toast.warning(`${result.errors.length} baris gagal diimport`);
    }
  }

  async function handlePurge() {
    await purgeAllPenduduk(username);
    refresh();
    setModal(null);
    setPurgeConfirm("");
    toast.success("Seluruh data penduduk berhasil dihapus");
  }

  async function handleImportFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buf = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
          raw: false,
        });
        await runSmartImport(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (res) => await runSmartImport(res.data),
      });
    }
  }

  const F = form as Record<string, string>;
  const setF = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="font-ui text-sm">Memuat data penduduk…</p>
      </div>
    );

  return (
    <div className="space-y-5" id="penduduk-table-top">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari NIK / Nama / Dusun…"
              className="pl-9 w-60 rounded-full"
            />
          </div>
          <select
            value={filterJK}
            onChange={(e) => {
              setFilterJK(e.target.value);
              setPage(1);
            }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-ui focus:outline-none"
          >
            <option value="">Semua JK</option>
            <option>Laki-laki</option>
            <option>Perempuan</option>
          </select>
          <select
            value={filterDusun}
            onChange={(e) => {
              setFilterDusun(e.target.value);
              setPage(1);
            }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-ui focus:outline-none"
          >
            <option value="">Semua Dusun</option>
            {getSettings().wilayah.dusun_list.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConfirmTarget({
                mode: "template",
                name: "Template",
                message: `Unduh template daftar kolom penduduk (${data.length} kolom)?`,
                action: () => exportPendudukTemplate(),
              });
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const count = filtered.length;
              setConfirmTarget({
                mode: "csv",
                name: "CSV",
                message: `Ekspor ${count} data penduduk ke file CSV?`,
                action: () => exportPendudukCSV(),
              });
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const count = filtered.length;
              setConfirmTarget({
                mode: "xlsx",
                name: "XLSX",
                message: `Ekspor ${count} data penduduk ke file XLSX?`,
                action: () => exportPendudukXLSX(),
              });
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            XLSX
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setConfirmTarget({
                mode: "import-info",
                name: "Import Data",
                message:
                  "File akan dibaca dan diproses dengan Smart Import Engine — data duplikat (NIK sama) akan otomatis diperbarui, data baru akan ditambahkan.",
                action: () => {
                  setSmartResult(null);
                  setModal("import");
                },
              });
            }}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-info text-info hover:bg-info/10"
            disabled={isSyncing}
            onClick={() => {
              setConfirmTarget({
                mode: "upload-cloud",
                name: "Upload ke Cloud",
                message: `Unggah ${data.length} data penduduk ke Supabase Cloud? Data yang sudah ada akan diperbarui.`,
                action: async () => {
                  setIsSyncing(true);
                  const res = await syncAllToSupabase();
                  setIsSyncing(false);
                  if (res.ok) {
                    toast.success(res.message);
                    refresh();
                  } else toast.error(res.message);
                },
              });
            }}
          >
            <CloudUpload className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Mengunggah..." : "Upload ke Cloud"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            disabled={isSyncing}
            onClick={() => {
              setConfirmTarget({
                mode: "pull-cloud",
                name: "Tarik dari Cloud",
                message:
                  "Tarik data dari Supabase Cloud? Data lokal yang ada akan diperbarui. Data lokal baru (belum di-cloud) tetap aman.",
                action: async () => {
                  setIsSyncing(true);
                  const res = await pullFromSupabase();
                  setIsSyncing(false);
                  if (res.ok) {
                    toast.success(res.message);
                    refresh();
                  } else toast.error(res.message);
                },
              });
            }}
          >
            <ArrowRightLeft className={`h-4 w-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Menarik..." : "Tarik dari Cloud"}
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
          {isSuperAdmin && (
            <Button
              size="sm"
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setPurgeConfirm("");
                setModal("purge");
              }}
            >
              <ShieldAlert className="h-4 w-4 mr-1" />
              Hapus Semua
            </Button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-3 text-sm font-ui text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {filtered.length.toLocaleString("id-ID")} dari {data.length.toLocaleString("id-ID")}{" "}
          penduduk
        </span>
        {usingMock && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-xs font-semibold">
            <AlertCircle className="h-3 w-3" />
            Data Simulasi
          </span>
        )}
        {!usingMock && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-semibold">
            <Check className="h-3 w-3" />
            Data Aktif
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No", "NIK", "Nama", "JK", "Umur", "TTL", "Dusun", "Pekerjaan", "Aksi"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground font-body">
                    Tidak ada data yang cocok
                  </td>
                </tr>
              ) : (
                paginated.map((p, i) => (
                  <tr
                    key={p.nik}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-3 font-ui text-xs text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{p.nik}</td>
                    <td className="px-3 py-3 font-ui text-sm font-semibold max-w-[180px] truncate">
                      {p.nama}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.jenis_kelamin === "Laki-Laki" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}
                      >
                        {p.jenis_kelamin === "Laki-Laki" ? "L" : "P"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">{hitungUmur(p.tanggal_lahir)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {p.tempat_lahir
                        ? `${p.tempat_lahir}, ${formatTanggal(p.tanggal_lahir)}`
                        : formatTanggal(p.tanggal_lahir)}
                    </td>
                    <td className="px-3 py-3 text-xs">{p.dusun}</td>
                    <td className="px-3 py-3 text-xs max-w-[120px] truncate">{p.pekerjaan}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p.nik)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {pages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Modal (Add/Edit) ── */}
      {(modal === "add" || modal === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-card rounded-3xl shadow-elev border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display text-xl font-bold">
                {modal === "add" ? "Tambah Penduduk" : "Edit Data Penduduk"}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* ── FORM BODY ── */}
            <div className="p-5 space-y-6">
              {/* ── IDENTITAS ─────────────────────────────────────── */}
              <div>
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary mb-3">
                  📋 Identitas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { k: "nik", label: "NIK*", placeholder: "16 digit", maxLength: 16 },
                    { k: "no_kk", label: "No. KK*", placeholder: "16 digit", maxLength: 16 },
                    { k: "nama", label: "Nama Lengkap*", placeholder: "Sesuai KTP", sm: true },
                    { k: "tempat_lahir", label: "Tempat Lahir", placeholder: "Kota/Kabupaten" },
                    { k: "tanggal_lahir", label: "Tanggal Lahir", type: "date" },
                    { k: "no_hp", label: "No. HP", placeholder: "08xxxxxxxxxx" },
                    { k: "nama_ibu", label: "Nama Ibu", placeholder: "Nama ibu kandung" },
                    { k: "nama_bapak", label: "Nama Bapak", placeholder: "Nama bapak kandung" },
                  ].map(({ k, label, placeholder, type, sm, maxLength }) => (
                    <div key={k} className={sm ? "sm:col-span-2" : ""}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <Input
                        value={F[k] ?? ""}
                        onChange={(e) => setF(k, e.target.value)}
                        placeholder={placeholder}
                        type={type ?? "text"}
                        maxLength={maxLength}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                  {[
                    {
                      k: "jenis_kelamin",
                      label: "Jenis Kelamin",
                      opts: ["Laki-Laki", "Perempuan"],
                    },
                    { k: "status_dalam_kk", label: "Status dalam KK", opts: STATUS_DALAM_KK_LIST },
                    {
                      k: "status_perkawinan",
                      label: "Status Kawin",
                      opts: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
                    },
                    { k: "agama", label: "Agama", opts: AGAMA_LIST },
                    { k: "suku", label: "Suku Bangsa", opts: SUKU_LIST },
                    { k: "pekerjaan", label: "Pekerjaan", opts: PEKERJAAN_LIST },
                    { k: "pendidikan", label: "Pendidikan", opts: PENDIDIKAN_LIST },
                    { k: "golongan_darah", label: "Gol. Darah", opts: GOLONGAN_DARAH_LIST },
                    { k: "kondisi_fisik", label: "Kondisi Fisik", opts: KONDISI_FISIK_LIST },
                    {
                      k: "kepemilikan_aset",
                      label: "Kepemilikan Aset",
                      opts: KEPEMILIKAN_ASET_LIST,
                    },
                  ].map(({ k, label, opts }) => (
                    <div key={k}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <select
                        value={F[k] ?? ""}
                        onChange={(e) => setF(k, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Pendapatan/Bulan (Rp)
                    </Label>
                    <Input
                      value={F["pendapatan_bulan"] ?? "0"}
                      onChange={(e) => setF("pendapatan_bulan", e.target.value)}
                      placeholder="0"
                      type="number"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* ── LOKASI ─────────────────────────────────────────── */}
              <div>
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary mb-3">
                  📍 Lokasi
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Dusun</Label>
                    <select
                      value={F["dusun"] ?? ""}
                      onChange={(e) => setF("dusun", e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {getSettings().wilayah.dusun_list.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  {[
                    {
                      k: "rt",
                      label: "RT",
                      placeholder: getSettings().wilayah.default_rt || "001",
                    },
                    {
                      k: "rw",
                      label: "RW",
                      placeholder: getSettings().wilayah.default_rw || "001",
                    },
                    { k: "alamat", label: "Alamat", placeholder: "Jl. / Dsn.", sm: true },
                  ].map(({ k, label, placeholder, sm }) => (
                    <div key={k} className={sm ? "sm:col-span-2" : ""}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <Input
                        value={F[k] ?? ""}
                        onChange={(e) => setF(k, e.target.value)}
                        placeholder={placeholder}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── PERUMAHAN ──────────────────────────────────────── */}
              <div>
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary mb-3">
                  🏠 Perumahan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      k: "kepemilikan_rumah",
                      label: "Kepemilikan Rumah",
                      opts: KEPEMILIKAN_RUMAH_LIST,
                    },
                    {
                      k: "kepemilikan_tanah",
                      label: "Kepemilikan Tanah",
                      opts: KEPEMILIKAN_TANAH_LIST,
                    },
                    { k: "jenis_lantai", label: "Jenis Lantai", opts: JENIS_LANTAI_LIST },
                    { k: "jenis_dinding", label: "Jenis Dinding", opts: JENIS_DINDING_LIST },
                    { k: "jenis_atap", label: "Jenis Atap", opts: JENIS_ATAP_LIST },
                  ].map(({ k, label, opts }) => (
                    <div key={k}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <select
                        value={F[k] ?? "-"}
                        onChange={(e) => setF(k, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {[
                    { k: "luas_rumah", label: "Luas Rumah (m²)", placeholder: "60" },
                    { k: "jumlah_lantai", label: "Jumlah Lantai", placeholder: "1" },
                    { k: "luas_tanah", label: "Luas Tanah (m²)", placeholder: "100" },
                  ].map(({ k, label, placeholder }) => (
                    <div key={k}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <Input
                        value={F[k] ?? "-"}
                        onChange={(e) => setF(k, e.target.value)}
                        placeholder={placeholder}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── FASILITAS ──────────────────────────────────────── */}
              <div>
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary mb-3">
                  💡 Fasilitas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { k: "penerangan", label: "Penerangan", opts: PENERANGAN_LIST },
                    { k: "sumber_energi_masak", label: "Energi Masak", opts: SUMBER_ENERGI_LIST },
                    { k: "mck", label: "MCK / Toilet", opts: MCK_LIST },
                    { k: "sumber_air", label: "Sumber Air", opts: SUMBER_AIR_LIST },
                  ].map(({ k, label, opts }) => (
                    <div key={k}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <select
                        value={F[k] ?? "-"}
                        onChange={(e) => setF(k, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SOSIAL & KESEHATAN ─────────────────────────────── */}
              <div>
                <p className="font-ui text-xs font-bold uppercase tracking-widest text-primary mb-3">
                  🏥 Sosial & Kesehatan
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { k: "bantuan_sosial", label: "Bansos" },
                    { k: "bantuan_extra", label: "Bantuan Extra" },
                    { k: "bpjs_kesehatan", label: "BPJS Kesehatan" },
                    { k: "bpjs_ketenagakerjaan", label: "BPJS TK" },
                  ].map(({ k, label }) => (
                    <div key={k}>
                      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
                      <select
                        value={F[k] ?? "Tidak"}
                        onChange={(e) => setF(k, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option>Tidak</option>
                        <option>Ya</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {formErr && <p className="px-5 pb-2 text-sm text-destructive font-ui">{formErr}</p>}
            <div className="flex gap-3 justify-end p-5 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                {modal === "add" ? "Tambahkan" : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-border p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-bold">Hapus Data?</h3>
            </div>
            <p className="font-body text-sm text-muted-foreground mb-5">
              NIK <span className="font-mono font-bold">{deleteTarget}</span> akan dihapus permanen.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => handleDelete(deleteTarget)}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {modal === "import" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Smart Import</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Smart features info */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-4 space-y-1">
              <p className="font-ui text-xs font-semibold text-primary mb-1">
                🧠 Smart Import Engine
              </p>
              {[
                "Header fleksibel — 80+ variasi nama kolom dikenali",
                "Data duplikat (NIK sama) otomatis diperbarui",
                "Gender & tanggal lahir diinferensikan dari NIK",
                "Normalisasi nilai: JK, agama, pendidikan, pekerjaan, tanggal",
              ].map((t) => (
                <p key={t} className="font-body text-xs text-muted-foreground">
                  ✓ {t}
                </p>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mb-4"
              onClick={exportPendudukTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template CSV
            </Button>

            {/* Result */}
            {smartResult && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4 space-y-3">
                <p className="font-ui text-sm font-bold text-foreground">Hasil Import</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    {
                      label: "Total",
                      val:
                        smartResult.added +
                        smartResult.updated +
                        smartResult.skipped +
                        smartResult.errors.length,
                      color: "text-foreground",
                    },
                    { label: "Baru", val: smartResult.added, color: "text-success" },
                    { label: "Diperbarui", val: smartResult.updated, color: "text-info" },
                    { label: "Dilewati", val: smartResult.skipped, color: "text-destructive" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-lg bg-card border border-border p-2">
                      <p className={`font-display text-xl font-bold ${color}`}>{val}</p>
                      <p className="font-ui text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {smartResult.errors.length > 0 && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2 max-h-24 overflow-y-auto">
                    {smartResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="font-mono text-[10px] text-destructive">
                        Baris {e.row}: {e.message}
                      </p>
                    ))}
                    {smartResult.errors.length > 5 && (
                      <p className="font-ui text-[10px] text-destructive">
                        ...dan {smartResult.errors.length - 5} error lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-colors py-8 cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="font-ui text-sm font-semibold text-foreground">
                Klik untuk pilih file CSV / XLSX
              </span>
              <span className="font-body text-xs text-muted-foreground mt-1">
                .csv atau .xlsx — header bebas, hingga 10MB
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Purge Modal (Super Admin) ── */}
      {modal === "purge" && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-destructive/30 p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-destructive">
                  Hapus Semua Data
                </h3>
                <p className="font-ui text-xs text-muted-foreground">Tindakan Super Admin</p>
              </div>
            </div>
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 mb-4">
              <p className="font-body text-sm text-destructive font-semibold">⚠ Peringatan!</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Seluruh {data.length.toLocaleString("id-ID")} data penduduk akan dihapus permanen
                dari sistem. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </p>
            </div>
            <p className="font-ui text-xs text-muted-foreground mb-2">
              Ketik <strong>HAPUS SEMUA</strong> untuk konfirmasi:
            </p>
            <Input
              value={purgeConfirm}
              onChange={(e) => setPurgeConfirm(e.target.value)}
              placeholder="HAPUS SEMUA"
              className="rounded-xl mb-4 border-destructive/30 focus:ring-destructive/30"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>
                Batal
              </Button>
              <Button
                disabled={purgeConfirm !== "HAPUS SEMUA"}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white disabled:opacity-40"
                onClick={handlePurge}
              >
                Hapus Permanen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generic Confirm Dialog (CRUD / Export / Sync) ── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmTarget(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-border p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold">Konfirmasi — {confirmTarget.name}</h3>
            </div>
            <p className="font-body text-sm text-muted-foreground mb-5 leading-relaxed">
              {confirmTarget.message}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmTarget(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  const action = confirmTarget.action;
                  setConfirmTarget(null);
                  action();
                }}
              >
                Ya, Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info Dialog (validation errors / incomplete data) ── */}
      {infoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setInfoDialog(null)}
          />
          <div className="relative bg-card rounded-3xl shadow-elev border border-border p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-display text-lg font-bold">{infoDialog.title}</h3>
            </div>
            <ul className="font-body text-sm text-muted-foreground mb-5 space-y-1.5 pl-1">
              {infoDialog.messages.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setInfoDialog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
