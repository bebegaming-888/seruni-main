import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { PageHero } from "@/components/sections/PageHero";
import {
  Users,
  Home,
  MapPin,
  Award,
  TrendingUp,
  Building2,
  Heart,
  BookOpen,
  Droplets,
  Zap,
  TreePine,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/lainnya/monografi")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Monografi — ${v.name}` },
        {
          name: "description",
          content: `Data lengkap profil dan statistik ${v.name}. Demografi, geografi, fasilitas, dan IDM.`,
        },
      ],
    };
  },
  component: () => <MonografiPage />,
});

type MonografiData = {
  semester: string;
  kode_desa: string;
  nama_desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  klasifikasi: string;
  luas_wilayah: number;
  altitude: number;
  batas_utara: string;
  batas_selatan: string;
  batas_barat: string;
  batas_timur: string;
  jumlah_rw: number;
  jumlah_rt: number;
  jumlah_dusun: number;
  total_penduduk: number;
  laki_laki: number;
  perempuan: number;
  kepala_keluarga: number;
  rumah_tangga: number;
  rumah_tetap: number;
  rumah_tidak_tetap: number;
  count_pendidikan: number;
  count_kesehatan: number;
  count_ibadah: number;
  idm_score: number;
  idm_status: string;
};

const MOCK: MonografiData = {
  semester: "2026-1",
  kode_desa: "0000000",
  nama_desa: "Desa",
  kecamatan: "Kecamatan",
  kabupaten: "Kabupaten",
  provinsi: "Provinsi",
  klasifikasi: "Pedesaan",
  luas_wilayah: 0,
  altitude: 0,
  batas_utara: "-",
  batas_selatan: "-",
  batas_barat: "-",
  batas_timur: "-",
  jumlah_rw: 0,
  jumlah_rt: 0,
  jumlah_dusun: 0,
  total_penduduk: 0,
  laki_laki: 0,
  perempuan: 0,
  kepala_keluarga: 0,
  rumah_tangga: 0,
  rumah_tetap: 0,
  rumah_tidak_tetap: 0,
  count_pendidikan: 0,
  count_kesehatan: 0,
  count_ibadah: 0,
  idm_score: 0,
  idm_status: "Berkembang",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-muted ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="font-ui text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="font-ui text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function MonografiPage() {
  const v = useVillage();
  const [data, setData] = useState<MonografiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setData(MOCK);
        setUsingMock(true);
        setLoading(false);
        return;
      }
      const sb = getSupabase();
      if (!sb) {
        setData(MOCK);
        setUsingMock(true);
        setLoading(false);
        return;
      }
      try {
        const { data: rows, error } = await sb
          .from("monografi")
          .select("*")
          .order("semester", { ascending: false })
          .limit(1)
          .single();

        if (!error && rows) {
          setData(rows as MonografiData);
        } else {
          setData(MOCK);
          setUsingMock(true);
        }
      } catch {
        setData(MOCK);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const d = data ?? MOCK;
  const lakiPct = d.total_penduduk > 0 ? Math.round((d.laki_laki / d.total_penduduk) * 100) : 0;
  const perempuanPct = 100 - lakiPct;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Profil"
          titleSecond="Desa"
          description={"Data lengkap profil dan statistik " + (v as { name?: string }).name + "."}
          badge="Profil & Statistik"
          badgeIcon={<BookOpen className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Lainnya" }, { label: "Monografi" }]}
        />

        {/* Demo data notice */}
        {usingMock && (
          <div className="px-4 mb-6">
            <div className="max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(27,55%,71%_/_0.2)] border border-[hsl(27,55%,71%_/_0.3)] px-3 py-1 font-ui text-xs font-semibold text-[hsl(30,5%,10%)]">
                <span>⚠️</span>
                Data contoh — belum ada data monografi di database. Hubungi admin untuk upload data
                semester berjalan.
              </div>
            </div>
          </div>
        )}

        {/* Demografi */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <SectionTitle label="Demografi" icon={<Users className="h-4 w-4" />} />

            {/* Population bar */}
            <div className="rounded-2xl border border-border bg-card p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display text-3xl font-bold text-ink">
                    {d.total_penduduk.toLocaleString("id-ID")}
                  </p>
                  <p className="font-ui text-xs text-muted-foreground">Total Penduduk</p>
                </div>
                <div className="text-right">
                  <p className="font-ui text-xs text-muted-foreground">
                    {d.kepala_keluarga.toLocaleString("id-ID")} KK
                  </p>
                  <p className="font-ui text-xs text-muted-foreground">
                    {d.rumah_tangga.toLocaleString("id-ID")} rumah tangga
                  </p>
                </div>
              </div>
              {/* Gender bar */}
              <div className="h-3 w-full rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-info transition-all duration-500"
                  style={{ width: `${lakiPct}%` }}
                />
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${perempuanPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-info" />
                  <span className="font-ui text-xs text-muted-foreground">
                    Laki-Laki: {d.laki_laki.toLocaleString("id-ID")} ({lakiPct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="font-ui text-xs text-muted-foreground">
                    Perempuan: {d.perempuan.toLocaleString("id-ID")} ({perempuanPct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={Users}
                label="Kepala Keluarga"
                value={d.kepala_keluarga.toLocaleString("id-ID")}
                sub="KK"
              />
              <StatCard
                icon={Home}
                label="Rumah Tangga"
                value={d.rumah_tangga.toLocaleString("id-ID")}
                sub={`${d.rumah_tetap} tetap, ${d.rumah_tidak_tetap} tidak tetap`}
              />
              <StatCard
                icon={MapPin}
                label="RW / RT / DTS"
                value={`${d.jumlah_rw} RW · ${d.jumlah_rt} RT · ${d.jumlah_dusun} Dsn`}
              />
              <StatCard
                icon={Award}
                label="Status IDM"
                value={d.idm_status}
                sub={`Skor: ${d.idm_score.toFixed(4)}`}
                color="text-success"
              />
            </div>
          </div>
        </section>

        {/* Geografi */}
        <section className="px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <SectionTitle label="Geografi & Wilayah" icon={<MapPin className="h-4 w-4" />} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Identitas Wilayah
                </h3>
                {[
                  ["Kode Desa", d.kode_desa],
                  ["Klasifikasi", d.klasifikasi],
                  ["Luas Wilayah", `${d.luas_wilayah.toLocaleString("id-ID")} km²`],
                  ["Ketinggian", `${d.altitude} m dpi`],
                  ["Kecamatan", d.kecamatan],
                  ["Kabupaten", d.kabupaten],
                  ["Provinsi", d.provinsi],
                ].map(([label, value]) => (
                  <GeoRow key={label} label={label as string} value={value as string} />
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Batas Wilayah
                </h3>
                {[
                  ["Utara", d.batas_utara],
                  ["Selatan", d.batas_selatan],
                  ["Barat", d.batas_barat],
                  ["Timur", d.batas_timur],
                ].map(([label, value]) => (
                  <GeoRow key={label} label={label as string} value={value as string} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Fasilitas */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <SectionTitle
              label="Fasilitas & Ketersediaan"
              icon={<Building2 className="h-4 w-4" />}
            />
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { icon: BookOpen, label: "Fasilitas Pendidikan", value: d.count_pendidikan },
                { icon: Heart, label: "Fasilitas Kesehatan", value: d.count_kesehatan },
                { icon: TreePine, label: "Tempat Ibadah", value: d.count_ibadah },
                { icon: Zap, label: "Akses Listrik", value: "100%", color: "text-success" },
                { icon: Droplets, label: "Akses Air Bersih", value: "82%", color: "text-info" },
              ].map(({ icon: Icon, label, value, color }) => (
                <StatCard key={label} icon={Icon} label={label} value={value} color={color} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SectionTitle({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="font-display text-xl font-bold text-ink">{label}</h2>
    </div>
  );
}

function GeoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-ui text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="font-ui text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
