import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Baby,
  Heart,
  Activity,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  TrendingDown,
  Home,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useVillage } from "@/hooks/use-village";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/admin/laporan-rw")({
  head: () => {
    const s = getSettings();
    return {
      meta: [{ title: `Laporan RW & Posyandu — ${s?.village?.name ?? "Admin"}` }],
    };
  },
  component: LaporanRWPage,
});

// ── Mock Data (replace with real data from penduduk-store + Posyandu store) ───

const RW_DATA = [
  {
    rw: "RW 01",
    dusun: "Mandar",
    rt: "RT 01, RT 02, RT 03",
    kepala_rw: "H. Ahmad Dahlan",
    no_hp: "081234567890",
    jumlah_kk: 87,
    jumlah_penduduk: 312,
    balita: 18,
    ibu_hamil: 4,
    lansia: 41,
    disabilitas: 6,
    blt_recipients: 12,
  },
  {
    rw: "RW 02",
    dusun: "Sasak",
    rt: "RT 04, RT 05, RT 06",
    kepala_rw: "Bpk. Hasan Basri",
    no_hp: "081234567891",
    jumlah_kk: 94,
    jumlah_penduduk: 341,
    balita: 22,
    ibu_hamil: 5,
    lansia: 38,
    disabilitas: 4,
    blt_recipients: 15,
  },
  {
    rw: "RW 03",
    dusun: "Dames",
    rt: "RT 07, RT 08",
    kepala_rw: "Ibu Kartika Sari",
    no_hp: "081234567892",
    jumlah_kk: 63,
    jumlah_penduduk: 228,
    balita: 12,
    ibu_hamil: 3,
    lansia: 29,
    disabilitas: 3,
    blt_recipients: 9,
  },
  {
    rw: "RW 04",
    dusun: "Brantapen Asri",
    rt: "RT 09, RT 10",
    kepala_rw: "Bpk. Wijono",
    no_hp: "081234567893",
    jumlah_kk: 78,
    jumlah_penduduk: 289,
    balita: 15,
    ibu_hamil: 4,
    lansia: 35,
    disabilitas: 5,
    blt_recipients: 11,
  },
];

const POSYANDU_DATA = [
  {
    id: "1",
    nama: "Posyandu Mawar",
    dusun: "Mandar",
    rw: "RW 01",
    kategori: "Balita & Ibu Hamil",
    kegiatan: "Setiap bulan, tanggal 15",
    kader: ["Siti Aminah", "Ratna Dewi", "Mariani"],
    balita_total: 18,
    balita_tervaccine: 16,
    ibu_hamil_total: 4,
    ibu_hamil_terimpan: 4,
    lansia_total: 41,
    posbindu: true,
    status: "Aktif",
  },
  {
    id: "2",
    nama: "Posyandu Melati",
    dusun: "Sasak",
    rw: "RW 02",
    kategori: "Balita & Ibu Hamil",
    kegiatan: "Setiap bulan, tanggal 20",
    kader: ["Nurhayati", "Siti Rohmah", "Dewi Lestari"],
    balita_total: 22,
    balita_tervaccine: 20,
    ibu_hamil_total: 5,
    ibu_hamil_terimpan: 5,
    lansia_total: 38,
    posbindu: true,
    status: "Aktif",
  },
  {
    id: "3",
    nama: "Posyandu Anggrek",
    dusun: "Dames",
    rw: "RW 03",
    kategori: "Lansia & Balita",
    kegiatan: "Setiap bulan, tanggal 10",
    kader: ["Siti Halimah", "Siti Fatimah"],
    balita_total: 12,
    balita_tervaccine: 11,
    ibu_hamil_total: 3,
    ibu_hamil_terimpan: 3,
    lansia_total: 29,
    posbindu: false,
    status: "Aktif",
  },
  {
    id: "4",
    nama: "Posyandu Kenanga",
    dusun: "Brantapen Asri",
    rw: "RW 04",
    kategori: "Balita & Ibu Hamil",
    kegiatan: "Setiap bulan, tanggal 25",
    kader: ["Siti Nurjanah", "Siti Aisyah", "Nurul Hidayah"],
    balita_total: 15,
    balita_tervaccine: 14,
    ibu_hamil_total: 4,
    ibu_hamil_terimpan: 4,
    lansia_total: 35,
    posbindu: true,
    status: "Aktif",
  },
];

// Chart data
const VAKSINASI_DATA = [
  { name: "Mawar", vaccinated: 16, total: 18, pct: 89 },
  { name: "Melati", vaccinated: 20, total: 22, pct: 91 },
  { name: "Anggrek", vaccinated: 11, total: 12, pct: 92 },
  { name: "Kenanga", vaccinated: 14, total: 15, pct: 93 },
];

const KATEGORI_COLORS = [
  "hsl(190,75%,36%)",
  "hsl(27,79%,52%)",
  "hsl(183,50%,58%)",
  "hsl(27,55%,71%)",
  "hsl(0,0%,84%)",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-ui text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-ink mb-1">{value}</p>
      <p className="font-ui text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function RWRow({ rw }: { rw: (typeof RW_DATA)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
            {rw.rw.replace("RW ", "")}
          </div>
          <div>
            <p className="font-display font-bold text-ink">{rw.rw}</p>
            <p className="font-ui text-xs text-muted-foreground">
              {rw.dusun} — {rw.jumlah_kk} KK
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-4 text-right">
            <div>
              <p className="font-ui text-xs text-muted-foreground">Penduduk</p>
              <p className="font-ui text-sm font-bold">{rw.jumlah_penduduk}</p>
            </div>
            <div>
              <p className="font-ui text-xs text-muted-foreground">Balita</p>
              <p className="font-ui text-sm font-bold text-primary">{rw.balita}</p>
            </div>
            <div>
              <p className="font-ui text-xs text-muted-foreground">Lansia</p>
              <p className="font-ui text-sm font-bold text-info">{rw.lansia}</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="space-y-1">
              <p className="font-ui text-[10px] text-muted-foreground uppercase">RT</p>
              <p className="font-body text-sm">{rw.rt}</p>
            </div>
            <div className="space-y-1">
              <p className="font-ui text-[10px] text-muted-foreground uppercase">Kepala RW</p>
              <p className="font-body text-sm">{rw.kepala_rw}</p>
            </div>
            <div className="space-y-1">
              <p className="font-ui text-[10px] text-muted-foreground uppercase">HP</p>
              <p className="font-body text-sm">{rw.no_hp}</p>
            </div>
            <div className="space-y-1">
              <p className="font-ui text-[10px] text-muted-foreground uppercase">BLT-DD</p>
              <p className="font-body text-sm text-warning font-semibold">{rw.blt_recipients} KK</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

function LaporanRWPage() {
  const village = useVillage();
  const [tab, setTab] = useState<"rw" | "posyandu">("rw");
  const [search, setSearch] = useState("");

  const filteredRW = useMemo(
    () =>
      RW_DATA.filter(
        (r) =>
          r.rw.toLowerCase().includes(search.toLowerCase()) ||
          r.dusun.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const filteredPosyandu = useMemo(
    () =>
      POSYANDU_DATA.filter(
        (p) =>
          p.nama.toLowerCase().includes(search.toLowerCase()) ||
          p.dusun.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const totalPenduduk = RW_DATA.reduce((s, r) => s + r.jumlah_penduduk, 0);
  const totalBalita = RW_DATA.reduce((s, r) => s + r.balita, 0);
  const totalIbuHamil = RW_DATA.reduce((s, r) => s + r.ibu_hamil, 0);
  const totalLansia = RW_DATA.reduce((s, r) => s + r.lansia, 0);
  const totalKK = RW_DATA.reduce((s, r) => s + r.jumlah_kk, 0);

  const pieData = [
    { name: "Balita", value: totalBalita },
    { name: "Ibu Hamil", value: totalIbuHamil },
    { name: "Lansia", value: totalLansia },
    { name: "Disabilitas", value: RW_DATA.reduce((s, r) => s + r.disabilitas, 0) },
    {
      name: "Produktif",
      value:
        totalPenduduk -
        totalBalita -
        totalIbuHamil -
        totalLansia -
        RW_DATA.reduce((s, r) => s + r.disabilitas, 0),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-ink">Laporan RW & Posyandu</h1>
            <p className="font-ui text-xs text-muted-foreground">
              Data populasi per RW dan Posyandu — {village.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Penduduk"
            value={formatNumber(totalPenduduk)}
            subtitle={`${totalKK} Kepala Keluarga`}
            icon={Users}
            color="hsl(190,75%,36%)"
          />
          <StatCard
            title="Balita (0-5 th)"
            value={totalBalita}
            subtitle={`${POSYANDU_DATA.length} Posyandu aktif`}
            icon={Baby}
            color="hsl(27,79%,52%)"
          />
          <StatCard
            title="Ibu Hamil"
            value={totalIbuHamil}
            subtitle="Pemeriksaan rutin per bulan"
            icon={Heart}
            color="hsl(183,50%,58%)"
          />
          <StatCard
            title="Lansia (>60 th)"
            value={totalLansia}
            subtitle="Pembinaan posbindu"
            icon={Activity}
            color="hsl(27,55%,71%)"
          />
        </div>

        {/* Demografi Chart */}
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-base font-bold text-ink mb-4">Komposisi Penduduk</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={KATEGORI_COLORS[i % KATEGORI_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatNumber(val as number)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
                      {(payload ?? []).map((entry) => (
                        <div
                          key={entry.value}
                          className="flex items-center gap-1.5 font-ui text-xs"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color as string }}
                          />
                          {entry.value}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-base font-bold text-ink mb-4">
              Cakupan Imunisasi per Posyandu
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={VAKSINASI_DATA}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={50} />
                <Tooltip formatter={(val) => `${val} anak`} labelStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="vaccinated"
                  fill="hsl(190,75%,36%)"
                  name="Tervaksinasi"
                  radius={[0, 4, 4, 0]}
                  opacity={0.7}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(183,50%,58%)"
                  name="Total Balita"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="inline-flex rounded-full bg-muted p-1 gap-1">
            {(["rw", "posyandu"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold font-ui transition-all ${
                  tab === t
                    ? "bg-ink text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "rw" ? "Data RW" : "Data Posyandu"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Cari ${tab === "rw" ? "RW / dusun" : "Posyandu"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </div>

        {/* RW List */}
        {tab === "rw" && (
          <div className="space-y-3">
            {filteredRW.map((rw) => (
              <RWRow key={rw.rw} rw={rw} />
            ))}
            {filteredRW.length === 0 && (
              <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
                Tidak ada data RW yang cocok dengan pencarian.
              </div>
            )}
          </div>
        )}

        {/* Posyandu List */}
        {tab === "posyandu" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredPosyandu.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-ui text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        {p.rw}
                      </span>
                      <span className="font-ui text-[10px] text-muted-foreground">{p.dusun}</span>
                    </div>
                    <h3 className="font-display font-bold text-ink">{p.nama}</h3>
                    <p className="font-ui text-xs text-muted-foreground mt-0.5">{p.kategori}</p>
                  </div>
                  <span
                    className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full ${
                      p.status === "Aktif"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-muted/30 p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink">{p.balita_total}</p>
                    <p className="font-ui text-[10px] text-muted-foreground">Balita</p>
                    <p className="font-ui text-[10px] text-success font-semibold">
                      {p.balita_tervaccine}/{p.balita_total} vaks
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 text-center">
                    <p className="font-display text-xl font-bold text-ink">{p.ibu_hamil_total}</p>
                    <p className="font-ui text-[10px] text-muted-foreground">Ibu Hamil</p>
                    <p className="font-ui text-[10px] text-success font-semibold">
                      {p.ibu_hamil_terimpan}/{p.ibu_hamil_total} impan
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-body text-muted-foreground">{p.kegiatan}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-body text-muted-foreground">
                      Kader: {p.kader.join(", ")}
                    </span>
                  </div>
                  {p.posbindu && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="font-body text-success">Posbindu Aktif</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredPosyandu.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
                Tidak ada data Posyandu yang cocok dengan pencarian.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
