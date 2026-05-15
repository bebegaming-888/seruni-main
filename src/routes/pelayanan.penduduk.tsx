import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useSettings, getSettings } from "@/lib/settings-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  Baby,
  HeartHandshake,
  TrendingUp,
  Search,
  Filter,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  listPenduduk,
  getStatistik,
  hitungUmur,
  maskNama,
  kelompokUmurLabel,
} from "@/lib/penduduk-store";
import { DUSUN_LIST, PEKERJAAN_LIST, PENDIDIKAN_LIST } from "@/data/penduduk";

export const Route = createFileRoute("/pelayanan/penduduk")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Statistik Penduduk — ${village.name}` },
        { name: "description", content: `Data kependudukan ${village.name}` },
      ],
    };
  },
  component: () => <PendudukPage />,
});

const PAGE_SIZE = 15;
const JK_COLORS = ["#0f7a4a", "#dc2626"];
const PIE_COLORS = ["#0891b2", "#0f7a4a", "#d97706", "#6b7280"];

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-foreground mb-1">{value}</p>
      <p className="font-ui text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function PendudukPage() {
  const { village } = useSettings();
  const allData = useMemo(() => listPenduduk(), []);
  const stat = useMemo(() => getStatistik(), []);

  // Filters
  const [fDusun, setFDusun] = useState("");
  const [fJK, setFJK] = useState("");
  const [fUmur, setFUmur] = useState("");
  const [fPekerjaan, setFPekerjaan] = useState("");
  const [fStatusKawin, setFStatusKawin] = useState("");
  const [fAgama, setFAgama] = useState("");
  const [fPendidikan, setFPendidikan] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const hasFilter = !!(
    fDusun ||
    fJK ||
    fUmur ||
    fPekerjaan ||
    fStatusKawin ||
    fAgama ||
    fPendidikan ||
    q
  );

  function clearFilters() {
    setFDusun("");
    setFJK("");
    setFUmur("");
    setFPekerjaan("");
    setFStatusKawin("");
    setFAgama("");
    setFPendidikan("");
    setQ("");
    setPage(1);
  }

  const filtered = useMemo(() => {
    return allData.filter((p) => {
      if (fDusun && p.dusun !== fDusun) return false;
      if (fJK && p.jenis_kelamin !== fJK) return false;
      if (fPekerjaan && p.pekerjaan !== fPekerjaan) return false;
      if (fStatusKawin && p.status_perkawinan !== fStatusKawin) return false;
      if (fAgama && p.agama !== fAgama) return false;
      if (fPendidikan && p.pendidikan !== fPendidikan) return false;
      if (fUmur) {
        const u = hitungUmur(p.tanggal_lahir);
        if (fUmur === "Anak (0-14)" && u > 14) return false;
        if (fUmur === "Produktif (15-64)" && (u < 15 || u > 64)) return false;
        if (fUmur === "Lansia (65+)" && u < 65) return false;
      }
      if (q) {
        const s = q.toLowerCase();
        return [p.dusun, p.pekerjaan, p.agama, p.pendidikan, p.status_perkawinan].some((v) =>
          (v ?? "").toLowerCase().includes(s),
        );
      }
      return true;
    });
  }, [allData, fDusun, fJK, fUmur, fPekerjaan, fStatusKawin, fAgama, fPendidikan, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Rekap filtered
  const rekap = useMemo(() => {
    const laki = filtered.filter((p) => p.jenis_kelamin === "Laki-Laki").length;
    const perempuan = filtered.length - laki;
    const dusunCount = filtered.reduce<Record<string, number>>((acc, p) => {
      acc[p.dusun] = (acc[p.dusun] ?? 0) + 1;
      return acc;
    }, {});
    const pekerjaanCount = filtered.reduce<Record<string, number>>((acc, p) => {
      acc[p.pekerjaan] = (acc[p.pekerjaan] ?? 0) + 1;
      return acc;
    }, {});
    const umurCount = filtered.reduce<Record<string, number>>((acc, p) => {
      const lbl = kelompokUmurLabel(p.tanggal_lahir);
      acc[lbl] = (acc[lbl] ?? 0) + 1;
      return acc;
    }, {});
    return { laki, perempuan, dusunCount, pekerjaanCount, umurCount };
  }, [filtered]);

  const chartDusun = Object.entries(rekap.dusunCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  const chartPekerjaan = Object.entries(rekap.pekerjaanCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const chartUmur = Object.entries(rekap.umurCount).map(([name, value]) => ({ name, value }));

  // Global charts from stat
  const kelompokUmurData = stat.kelompok_umur.map((k) => ({
    name: k.label,
    laki: k.laki,
    perempuan: k.perempuan,
  }));
  const agamaData = Object.entries(stat.per_agama).map(([name, value]) => ({ name, value }));
  const statusKawinData = Object.entries(stat.per_status_kawin).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Data Kependudukan
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Statistik Demografi
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Data kependudukan {village.name}. Informasi bersumber dari database desa yang dikelola
              pemerintah desa.
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-ui text-xs font-semibold ${stat.is_mock ? "bg-warning/10 border-warning/20 text-warning" : "bg-success/10 border-success/20 text-success"}`}
            >
              <Activity className="h-3.5 w-3.5" />
              {stat.is_mock
                ? "Data Simulasi — Demo"
                : `Data Aktif · ${stat.total.toLocaleString("id-ID")} jiwa`}
            </span>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="px-4 -mt-4 mb-10">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Penduduk"
              value={stat.total.toLocaleString("id-ID")}
              sub="Jiwa terdaftar"
              icon={Users}
              color="#0f7a4a"
            />
            <StatCard
              title="Total KK"
              value={stat.total_kk.toLocaleString("id-ID")}
              sub="Kartu Keluarga"
              icon={UserCheck}
              color="#0891b2"
            />
            <StatCard
              title="Rasio L:P"
              value={`${stat.laki}:${stat.perempuan}`}
              sub="Laki-laki : Perempuan"
              icon={Baby}
              color="#7c3aed"
            />
            <StatCard
              title="Dependency"
              value={`${stat.dependency_ratio}%`}
              sub="Non-produktif per 100 produktif"
              icon={HeartHandshake}
              color="#d97706"
            />
          </div>
        </section>

        {/* Charts Row */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Kelompok Umur
              </h3>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <BarChart
                    data={kelompokUmurData}
                    margin={{ top: 0, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip />
                    <Bar dataKey="laki" name="L" stackId="a" fill={JK_COLORS[0]} />
                    <Bar
                      dataKey="perempuan"
                      name="P"
                      stackId="a"
                      fill={JK_COLORS[1]}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Agama
              </h3>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={agamaData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {agamaData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => (v as number).toLocaleString("id-ID")} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Status Perkawinan
              </h3>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusKawinData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {statusKawinData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => (v as number).toLocaleString("id-ID")} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* === TABEL PUBLIK SECTION === */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Daftar Penduduk
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Data terbuka — informasi sensitif disembunyikan untuk privasi
                </p>
              </div>
              {hasFilter && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 font-ui text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset Filter
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-primary" />
                <span className="font-ui text-sm font-semibold text-foreground">Filter Data</span>
                {hasFilter && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 font-ui text-xs font-bold text-primary-foreground">
                    {filtered.length} hasil
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari dusun/pekerjaan…"
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {[
                  { label: "Dusun", val: fDusun, set: setFDusun, opts: DUSUN_LIST },
                  {
                    label: "Jenis Kelamin",
                    val: fJK,
                    set: setFJK,
                    opts: ["Laki-Laki", "Perempuan"],
                  },
                  {
                    label: "Kelompok Umur",
                    val: fUmur,
                    set: setFUmur,
                    opts: ["Anak (0-14)", "Produktif (15-64)", "Lansia (65+)"],
                  },
                  { label: "Pekerjaan", val: fPekerjaan, set: setFPekerjaan, opts: PEKERJAAN_LIST },
                  {
                    label: "Status Kawin",
                    val: fStatusKawin,
                    set: setFStatusKawin,
                    opts: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
                  },
                  {
                    label: "Agama",
                    val: fAgama,
                    set: setFAgama,
                    opts: ["Islam", "Kristen", "Katolik", "Hindu", "Budha"],
                  },
                  {
                    label: "Pendidikan",
                    val: fPendidikan,
                    set: setFPendidikan,
                    opts: PENDIDIKAN_LIST,
                  },
                ].map(({ label, val, set, opts }) => (
                  <select
                    key={label}
                    value={val}
                    onChange={(e) => {
                      set(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">{label}</option>
                    {opts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Rekap Terfilter */}
            {hasFilter && filtered.length > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-ui text-sm font-semibold text-primary">
                    Rekapitulasi Hasil Filter
                  </span>
                  <span className="rounded-full bg-primary px-2 py-0.5 font-ui text-xs font-bold text-primary-foreground ml-auto">
                    {filtered.length} jiwa
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-card border border-border p-3 text-center">
                    <p className="font-display text-2xl font-bold text-foreground">
                      {filtered.length}
                    </p>
                    <p className="font-ui text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3 text-center">
                    <p className="font-display text-2xl font-bold text-blue-600">{rekap.laki}</p>
                    <p className="font-ui text-xs text-muted-foreground">Laki-laki</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3 text-center">
                    <p className="font-display text-2xl font-bold text-pink-600">
                      {rekap.perempuan}
                    </p>
                    <p className="font-ui text-xs text-muted-foreground">Perempuan</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {chartDusun.length > 1 && (
                    <div>
                      <p className="font-ui text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Per Dusun
                      </p>
                      <div className="space-y-1.5">
                        {chartDusun.slice(0, 4).map((d) => (
                          <div key={d.name}>
                            <div className="flex justify-between mb-0.5">
                              <span className="font-ui text-xs text-foreground truncate max-w-[100px]">
                                {d.name}
                              </span>
                              <span className="font-ui text-xs font-bold">{d.value}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.round((d.value / filtered.length) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {chartUmur.length > 0 && (
                    <div>
                      <p className="font-ui text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Kelompok Umur
                      </p>
                      <div className="space-y-1.5">
                        {chartUmur.map((d) => (
                          <div key={d.name}>
                            <div className="flex justify-between mb-0.5">
                              <span className="font-ui text-xs text-foreground">{d.name}</span>
                              <span className="font-ui text-xs font-bold">{d.value}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-info"
                                style={{
                                  width: `${Math.round((d.value / filtered.length) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {chartPekerjaan.length > 1 && (
                    <div>
                      <p className="font-ui text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Top Pekerjaan
                      </p>
                      <div className="space-y-1.5">
                        {chartPekerjaan.slice(0, 4).map((d) => (
                          <div key={d.name}>
                            <div className="flex justify-between mb-0.5">
                              <span className="font-ui text-xs text-foreground truncate max-w-[100px]">
                                {d.name}
                              </span>
                              <span className="font-ui text-xs font-bold">{d.value}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-success"
                                style={{
                                  width: `${Math.round((d.value / filtered.length) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Public Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {[
                        "No",
                        "Nama",
                        "JK",
                        "Umur",
                        "Kel. Umur",
                        "Dusun",
                        "RT/RW",
                        "Pekerjaan",
                        "Pendidikan",
                        "Status Kawin",
                        "Agama",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-16 text-center text-muted-foreground font-body"
                        >
                          Tidak ada data yang cocok dengan filter
                        </td>
                      </tr>
                    ) : (
                      paginated.map((p, i) => {
                        const umur = hitungUmur(p.tanggal_lahir);
                        return (
                          <tr
                            key={p.nik}
                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-3 py-3 font-ui text-xs text-muted-foreground">
                              {(page - 1) * PAGE_SIZE + i + 1}
                            </td>
                            <td className="px-3 py-3 font-ui text-sm font-semibold">
                              {maskNama(p.nama)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.jenis_kelamin === "Laki-Laki" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}
                              >
                                {p.jenis_kelamin === "Laki-Laki" ? "L" : "P"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs">{umur > 0 ? `${umur} th` : "-"}</td>
                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${umur <= 14 ? "bg-blue-100 text-blue-700" : umur <= 64 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                              >
                                {umur <= 14 ? "Anak" : umur <= 64 ? "Produktif" : "Lansia"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs">{p.dusun}</td>
                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                              {p.rt}/{p.rw}
                            </td>
                            <td className="px-3 py-3 text-xs max-w-[120px] truncate">
                              {p.pekerjaan}
                            </td>
                            <td className="px-3 py-3 text-xs max-w-[100px] truncate">
                              {p.pendidikan || "-"}
                            </td>
                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                              {p.status_perkawinan}
                            </td>
                            <td className="px-3 py-3 text-xs">{p.agama}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Menampilkan {Math.min(filtered.length, (page - 1) * PAGE_SIZE + 1)}–
                    {Math.min(filtered.length, page * PAGE_SIZE)} dari {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                      const pg = page <= 3 ? i + 1 : page + i - 2;
                      if (pg < 1 || pg > pages) return null;
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`min-w-[32px] px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${pg === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <button
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 flex items-start gap-2">
              <span className="text-lg">🔒</span>
              <p className="font-body text-xs text-muted-foreground">
                <strong>Perlindungan Data Pribadi:</strong> NIK, Nomor KK, Nomor HP, dan alamat
                lengkap tidak ditampilkan sesuai dengan UU No. 27 Tahun 2022 tentang Perlindungan
                Data Pribadi. Nama ditampilkan dengan inisial.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
