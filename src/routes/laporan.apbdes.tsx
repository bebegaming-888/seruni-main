import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import {
  formatRupiah,
  formatRupiahFull,
  pct,
  BELANJA_KATEGORI,
  type BelanjaItem,
  type PendapatanItem,
  PENDAPATAN_2026 as MOCK_PENDAPATAN,
  BELANJA_2026 as MOCK_BELANJA,
  TAHUN_2026 as MOCK_TAHUN,
  REALISASI_2026 as MOCK_REALISASI,
  HISTORY_APBDES as MOCK_HISTORY,
} from "@/data/apbdes";
import { useApbdesStore } from "@/lib/content-store";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  ArrowDownLeft,
  ArrowDownRight,
  Target,
  Info,
  Download,
  ChevronDown,
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
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
} from "recharts";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/laporan/apbdes")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `APBDes 2026 — ${village.name}` },
        {
          name: "description",
          content: `Anggaran Pendapatan dan Belanja Desa ${village.name} Tahun 2026. Transparansi anggaran desa secara online.`,
        },
      ],
    };
  },
  component: () => <ApbdesPage />,
});

// ── Brand palette chart colors ────────────────────────────────────────────────
// Brand: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
const KATEGORI_COLOR: Record<string, string> = {
  Penyelenggaraan: "#078898",
  Pelaksanaan: "#66B9BF",
  Pembinaan: "#EEAA78",
  Pemberdayaan: "#E37222",
  TidakTerduga: "#D5D5D5",
};

const PENDAPATAN_COLOR = "#078898";
const SPENDING_COLOR = "#E37222";

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct_val = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct_val}%`, backgroundColor: color ?? "var(--color-primary)" }}
      />
    </div>
  );
}

function PendapatanRow({
  item,
  realisasiPercent,
}: {
  item: PendapatanItem;
  realisasiPercent: number;
}) {
  const realized = Math.round(item.nilai * (realisasiPercent / 100));
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-ui text-xs font-medium text-foreground truncate">{item.label}</span>
          <span className="font-ui text-xs text-muted-foreground shrink-0">{item.kode}</span>
        </div>
        <ProgressBar value={realisasiPercent} color={PENDAPATAN_COLOR} />
        <div className="flex items-center justify-between mt-1">
          <span className="font-body text-[10px] text-muted-foreground">
            {formatRupiah(realized)}/{formatRupiah(item.nilai)}
          </span>
          <span className="font-ui text-[10px] text-muted-foreground">{realisasiPercent}%</span>
        </div>
      </div>
    </div>
  );
}

function BelanjaRow({
  item,
  realisasi,
}: {
  item: BelanjaItem;
  realisasi: Record<string, { percent: number }>;
}) {
  const percent = realisasi[item.kategori]?.percent ?? 0;
  const realized = Math.round(item.nilai * (percent / 100));
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-body text-xs text-foreground truncate leading-tight">
            {item.label}
          </span>
          <span className="font-ui text-[10px] text-muted-foreground shrink-0">{item.kode}</span>
        </div>
        <ProgressBar value={percent} color={KATEGORI_COLOR[item.kategori]} />
        <div className="flex items-center justify-between mt-1">
          <span className="font-body text-[10px] text-muted-foreground">
            {formatRupiah(realized)}/{formatRupiah(item.nilai)}
          </span>
          <span className="font-ui text-[10px] text-muted-foreground">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: "up" | "down";
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
      <p className="font-display text-2xl font-bold text-foreground mb-1">{value}</p>
      <div className="flex items-center gap-1.5">
        {trend &&
          (trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-primary" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[#E37222]" />
          ))}
        <span className="font-ui text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

function KategoriChart({
  belanja,
  realisasi,
}: {
  belanja: BelanjaItem[];
  realisasi: Record<string, { percent: number }>;
}) {
  const data = BELANJA_KATEGORI.map((kat) => {
    const total = belanja.filter((b) => b.kategori === kat).reduce((s, b) => s + b.nilai, 0);
    const percent = realisasi[kat]?.percent ?? 0;
    return {
      name: kat,
      total,
      realized: Math.round(total * (percent / 100)),
      percent,
    };
  });

  const pieData = data.map((d) => ({ name: d.name, value: d.total }));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Komposisi Belanja
          </h3>
          <ChartContainer
            config={Object.fromEntries(
              KATEGORI_COLOR
                ? Object.entries(KATEGORI_COLOR).map(([k, v]) => [k, { label: k, color: v }])
                : [],
            )}
            className="h-[200px]"
          >
            <RePieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={Object.values(KATEGORI_COLOR)[i % Object.values(KATEGORI_COLOR).length]}
                  />
                ))}
              </Pie>
              <ChartTooltipContent
                indicator="dot"
                formatter={(val) => formatRupiah(val as number)}
              />
              <Legend
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
                    {(payload ?? []).map((entry) => (
                      <div key={entry.value} className="flex items-center gap-1.5 font-ui text-xs">
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
            </RePieChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Target vs Realisasi
          </h3>
          <ChartContainer
            config={Object.fromEntries(
              Object.entries(KATEGORI_COLOR).map(([k, v]) => [k, { label: k, color: v }]),
            )}
            className="h-[200px]"
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
              <Tooltip
                formatter={(val) => formatRupiah(val as number)}
                labelStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="total" fill={SPENDING_COLOR} radius={[0, 4, 4, 0]} opacity={0.35} />
              <Bar dataKey="realized" fill={SPENDING_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Per-kategori cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.map((d) => (
          <div key={d.name} className="rounded-xl border bg-card p-3">
            <div
              className="mb-2 h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-muted)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${d.percent}%`,
                  backgroundColor: KATEGORI_COLOR[d.name],
                }}
              />
            </div>
            <p className="font-display text-sm font-bold text-foreground">
              {formatRupiah(d.total)}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-ui text-[10px] text-muted-foreground">{d.name}</span>
              <span
                className="font-ui text-[10px] font-semibold"
                style={{ color: KATEGORI_COLOR[d.name] }}
              >
                {d.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendapatanChart({ pendapatan }: { pendapatan: PendapatanItem[] }) {
  const data = pendapatan.map((p) => ({
    name: p.label.length > 18 ? p.label.slice(0, 18) + "…" : p.label,
    value: p.nilai,
    kategori: p.kategori,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Rincian Pendapatan
      </h3>
      <ChartContainer
        config={{
          value: { label: "Nilai", color: PENDAPATAN_COLOR },
        }}
        className="h-[220px]"
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 120, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 9 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
          <Tooltip formatter={(val) => formatRupiah(val as number)} labelStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" fill={PENDAPATAN_COLOR} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function TrendChart({
  history,
}: {
  history: { tahun: number; pendapatan: number; belanja: number }[];
}) {
  const data = history.map((h) => ({
    tahun: String(h.tahun),
    Pendapatan: h.pendapatan,
    Belanja: h.belanja,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Tren 5 Tahun
      </h3>
      <ChartContainer
        config={{
          Pendapatan: { label: "Pendapatan", color: PENDAPATAN_COLOR },
          Belanja: { label: "Belanja", color: SPENDING_COLOR },
        }}
        className="h-[200px]"
      >
        <LineChart data={history} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tahun" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 9 }} width={56} />
          <Tooltip formatter={(val) => formatRupiah(val as number)} labelStyle={{ fontSize: 11 }} />
          <Legend
            content={({ payload }) => (
              <div className="flex justify-center gap-4 pt-2">
                {(payload ?? []).map((e) => (
                  <div key={e.value} className="flex items-center gap-1.5 font-ui text-xs">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: e.color as string }}
                    />
                    {e.value}
                  </div>
                ))}
              </div>
            )}
          />
          <Line
            type="monotone"
            dataKey="Pendapatan"
            stroke={PENDAPATAN_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="Belanja"
            stroke={SPENDING_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function BelanjaAccordion({
  kategori,
  belanja,
  realisasi,
}: {
  kategori: string;
  belanja: BelanjaItem[];
  realisasi: Record<string, { percent: number }>;
}) {
  const [open, setOpen] = useState(false);
  const items = belanja.filter((b) => b.kategori === kategori);
  const percent = realisasi[kategori]?.percent ?? 0;
  const total = items.reduce((s, b) => s + b.nilai, 0);
  const realized = total * (percent / 100);
  const color = KATEGORI_COLOR[kategori];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div>
            <span className="font-display text-sm font-bold text-foreground">{kategori}</span>
            <span className="ml-2 font-ui text-xs text-muted-foreground">
              {items.length} kegiatan
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="font-ui text-xs text-muted-foreground">Terealisasi </span>
            <span className="font-ui text-xs font-bold" style={{ color }}>
              {realisasi[kategori]?.percent ?? 0}%
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-ui text-[10px] text-muted-foreground">
              {formatRupiah(Math.round(realized))} dari {formatRupiah(total)}
            </span>
            <span className="font-ui text-xs font-bold" style={{ color }}>
              {realisasi[kategori]?.percent ?? 0}%
            </span>
          </div>
          <div
            className="mb-3 h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-muted)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percent}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="space-y-0.5">
            {items.map((item) => (
              <div
                key={item.kode}
                className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body text-xs text-foreground leading-tight">
                      {item.label}
                    </span>
                    <span className="font-ui text-[10px] text-muted-foreground shrink-0">
                      {item.bagian}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-ui text-[10px] text-muted-foreground">
                      {formatRupiah(item.nilai)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApbdesPage() {
  const { village } = useSettings();
  const store = useApbdesStore();
  const items = store.items;

  useEffect(() => {
    store.load();
  }, [store]);

  // Map new Supabase shape to page's internal format
  const apbdes2026 = items.find((i) => i.tahun === 2026);

  const TAHUN_2026 = apbdes2026
    ? {
        tahun: apbdes2026.tahun,
        status: apbdes2026.status,
        total_pendapatan: apbdes2026.total_pendapatan,
        total_belanja: apbdes2026.total_belanja,
        total_pembiayaan: apbdes2026.total_pembiayaan,
        sisa: apbdes2026.sisa_cadangan,
      }
    : MOCK_TAHUN;

  const detail = (apbdes2026?.detail ?? {}) as {
    pendapatan?: { items: unknown[]; total: number };
    belanja?: { items: unknown[]; total: number };
    pembiayaan?: { netto: number; sisa: number; sumber: string };
  };
  const realized = (apbdes2026?.realization ?? {}) as {
    pendapatan?: { percent: number };
    belanja?: Record<string, { percent: number }>;
  };

  const PENDAPATAN_2026 = (detail.pendapatan?.items ?? []) as typeof MOCK_PENDAPATAN;
  const BELANJA_2026 = (detail.belanja?.items ?? []) as typeof MOCK_BELANJA;
  const REALISASI_2026 = (realized.belanja ? realized : MOCK_REALISASI) as typeof MOCK_REALISASI;
  const HISTORY_APBDES = apbdes2026?.history ?? MOCK_HISTORY;

  const total_pendapatan = TAHUN_2026.total_pendapatan;
  const total_belanja = TAHUN_2026.total_belanja;
  const total_pembiayaan = TAHUN_2026.total_pembiayaan;
  const realized_total = Math.round(
    BELANJA_KATEGORI.reduce((s, kat) => {
      const total = BELANJA_2026.filter((b: BelanjaItem) => b.kategori === kat).reduce(
        (sum: number, b: BelanjaItem) => sum + b.nilai,
        0,
      );
      const percent =
        (REALISASI_2026.belanja as Record<string, { percent?: number }>)[kat]?.percent ?? 0;
      return s + total * (percent / 100);
    }, 0),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Transparansi"
          titleSecond="APBDes"
          description={
            "Anggaran Pendapatan dan Belanja Desa " +
            (village as { name?: string }).name +
            " Tahun 2026."
          }
          badge="Transparansi Anggaran"
          badgeIcon={<Wallet className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Laporan" }, { label: "APBDes" }]}
        />

        {/* Summary Cards */}
        <section className="px-4 -mt-6 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <SummaryCard
                title="Total Pendapatan"
                value={formatRupiah(total_pendapatan)}
                subtitle={`Tahun ${TAHUN_2026.tahun}`}
                icon={ArrowDownLeft}
                color={PENDAPATAN_COLOR}
                trend="up"
              />
              <SummaryCard
                title="Total Belanja"
                value={formatRupiah(total_belanja)}
                subtitle={`(${pct(total_belanja, total_pendapatan)}% dari pendapatan)`}
                icon={ArrowDownRight}
                color={SPENDING_COLOR}
                trend="down"
              />
              <SummaryCard
                title="Sisa / Pembiayaan"
                value={formatRupiah(total_pembiayaan)}
                subtitle="Dana cadangan desa"
                icon={PieChart}
                color="#7c3aed"
                trend="up"
              />
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Pendapatan chart */}
            <div className="grid lg:grid-cols-2 gap-6">
              <PendapatanChart pendapatan={PENDAPATAN_2026} />
              <TrendChart history={HISTORY_APBDES} />
            </div>

            {/* Kategori breakdown */}
            <KategoriChart belanja={BELANJA_2026} realisasi={REALISASI_2026.belanja} />
          </div>
        </section>

        {/* Pendapatan Rinci */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Pendapatan Desa</h2>
                <p className="font-body text-sm text-muted-foreground">
                  Total: {formatRupiahFull(total_pendapatan)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-ui text-xs text-muted-foreground">Terealisasi</p>
                <p className="font-display text-xl font-bold text-primary">
                  {REALISASI_2026.pendapatan.percent}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 h-3 w-full rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${REALISASI_2026.pendapatan.percent}%` }}
                />
              </div>
              <div className="mt-4 space-y-0">
                {PENDAPATAN_2026.map((item: PendapatanItem) => (
                  <PendapatanRow
                    key={item.kode}
                    item={item}
                    realisasiPercent={REALISASI_2026.pendapatan.percent}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Belanja Rinci */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Belanja Desa</h2>
                <p className="font-body text-sm text-muted-foreground">
                  Total: {formatRupiahFull(total_belanja)}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-ui text-xs text-muted-foreground">Total Realisasi</p>
                <p className="font-display text-xl font-bold text-ink">
                  {formatRupiah(realized_total)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {BELANJA_KATEGORI.map((kategori) => (
                <BelanjaAccordion
                  key={kategori}
                  kategori={kategori}
                  belanja={BELANJA_2026}
                  realisasi={REALISASI_2026.belanja}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Catatan */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-ui text-xs font-semibold text-foreground mb-1">Catatan</p>
                  <p className="font-body text-xs text-muted-foreground leading-relaxed">
                    Data APBDes di atas adalah data simulasi untuk keperluan prototype dashboard
                    transparansi. Angka realisasi bersifat perkiraan per Mei 2026 dan belum
                    mencerminkan data real. Untuk data aktual, silakan kunjungi kantor desa atau
                    akses melalui sistem informasi desa yang terintegrasi dengan Supabase.
                    Penggunaan anggaran harus sesuai dengan Permendes PDT No. 2 Tahun 2015.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
