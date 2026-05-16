import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import { useKoprasiStore } from "@/lib/content-store";
import {
  Users,
  Wallet,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  MapPin,
  Mail,
  DollarSign,
} from "lucide-react";

export const Route = createFileRoute("/ekonomi/koperasi")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Koperasi Desa — ${village.name}` },
        {
          name: "description",
          content: `Koperasi Desa ${village.name}. Simpan pinjam, tabungan, dan pembiayaan mikro bagi warga desa.`,
        },
      ],
    };
  },
  component: () => <KoprasiPage />,
});

const STATS_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, Wallet, TrendingUp, ShieldCheck,
};
const LAYANAN_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PiggyBank, Wallet, CreditCard, BarChart3, FileText, DollarSign,
};

function resolveStatIcon(name?: string) {
  return (name && STATS_ICON_MAP[name]) ? STATS_ICON_MAP[name] : Users;
}
function resolveLayananIcon(name?: string) {
  return (name && LAYANAN_ICON_MAP[name]) ? LAYANAN_ICON_MAP[name] : ShieldCheck;
}

const MOCK_KOPRASI = {
  stats: [
    { label: "Anggota Aktif", value: "342", icon: "Users" },
    { label: "Total Aset", value: "Rp 2,8 M", icon: "Wallet" },
    { label: "Volume Usaha", value: "Rp 5,1 M", icon: "TrendingUp" },
    { label: "SHU Tahun Ini", value: "Rp 187 Jt", icon: "ShieldCheck" },
  ],
  layanan: [
    { id: "l-1", nama: "Simpanan Sukarela", deskripsi: "Tabungan tanpa batas waktu dengan bunga kompetitif 6% per tahun. Dana dapat diambil kapan saja.", icon: "PiggyBank", status: "Aktif" },
    { id: "l-2", nama: "Simpanan Pokok", deskripsi: "Simpanan wajib bulanan anggota @ Rp 50.000. Menjadi dasar kepemilikan saham.", icon: "Wallet", status: "Aktif" },
    { id: "l-3", nama: "Simpanan Wajib", deskripsi: "Simpanan wajib bulanan @ Rp 25.000. Mengikuti perda desa tentang keanggotaan.", icon: "CreditCard", status: "Aktif" },
    { id: "l-4", nama: "Pinjaman Mikro", deskripsi: "Pinjaman untuk modal usaha dengan plafon Rp 500.000 – Rp 10.000.000. Angsuran ringan.", icon: "BarChart3", status: "Aktif" },
    { id: "l-5", nama: "Pinjaman Konsumtif", deskripsi: "Pinjaman untuk kebutuhan mendesak (pendidikan, kesehatan, renovasi rumah). Jangka 3-12 bulan.", icon: "FileText", status: "Aktif" },
    { id: "l-6", nama: "Tabungan Hari Raya", deskripsi: "Program tabungan menjelang Hari Raya Idulfitri & Natalie dengan target 12x setoran.", icon: "DollarSign", status: "Aktif" },
  ],
  produk: [
    { id: "p-1", nama: "Paket Modal Usaha", harga: "Rp 1.000.000", satuan: "per paket", desc: "Bantuan modal kerja untuk UMKM mikro anggota.", icon: "BarChart3" },
    { id: "p-2", nama: "Tabungan Anak Sekolah", harga: "Rp 5.000", satuan: "/ bulan", desc: "Tabungan edukasi anak dengan booklet tabungan.", icon: "PiggyBank" },
    { id: "p-3", nama: "Asuransi Mikro", harga: "Rp 15.000", satuan: "/ bulan", desc: "Proteksi kecelakaan dan kesehatan untuk anggota dan keluarga.", icon: "ShieldCheck" },
  ],
};

function formatRupiahLabel(n: string): string {
  return n;
}

export function KoprasiPage() {
  const { village } = useSettings();
  const { items: koprasiData } = useKoprasiStore();

  const data = koprasiData.find((k) => k.key === "koperasi") ?? null;

  const statsItems = data?.stats?.length ? data.stats : MOCK_KOPRASI.stats;
  const layananItems = data?.layanan?.length ? data.layanan : MOCK_KOPRASI.layanan;
  const produkItems = data?.produk?.length ? data.produk : MOCK_KOPRASI.produk;

  const activeLayananCount = layananItems.filter((l) => l.status === "Aktif").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Koperasi"
          titleSecond="Desa"
          description="Koperasi Desa — simpan pinjam, tabungan, dan pembiayaan mikro bagi warga desa."
          badge="Koperasi Desa"
          badgeIcon={<Users className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Ekonomi" }, { label: "Koperasi" }]}
        />

        {/* Stats */}
        <section className="px-4 -mt-8 mb-14">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statsItems.map((s) => {
              const Icon = resolveStatIcon(s.icon);
              return (
                <div key={s.label} className="rounded-2xl border border-border bg-card shadow-card p-5 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-display text-2xl sm:text-3xl font-bold text-ink">{s.value}</p>
                  <p className="font-ui text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tentang */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  Tentang Kopi
                </p>
                <h2 className="font-display text-3xl font-bold text-ink mb-4 leading-tight">
                  Menggerakan Ekonomi Rakyat melalui Gerakan Coop
                </h2>
                <p className="font-body text-muted-foreground leading-relaxed mb-4">
                  Kopi {village.name} didirikan tahun 2019 dan berbadan hukum No.
                  012345/BH/PD/PAD/2019. Kami merupakan perpanjangan tangan pemerintah
                  desa dalam program keuangan mikro untuk masyarakat.
                </p>
                <p className="font-body text-muted-foreground leading-relaxed">
                  Dengan prinsip cooperative — dari anggota, oleh anggota, untuk
                  anggota — kami mengelola simpanan dan memberikan pembiayaan mikro
                  dengan bunga ringan dan persyaratan mudah.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Berdiri Sejak", value: "2019" },
                    { label: "Anggota", value: "342 orang" },
                    { label: "Produk Layanan", value: `${activeLayananCount} layanan` },
                    { label: "Badan Hukum", value: "No. 012345" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="font-ui text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        {item.label}
                      </p>
                      <p className="font-display text-lg font-bold text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visi Misi */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: CheckCircle2,
                title: "Visi",
                content: "Menjadi lembaga keuangan mikro terpercaya yang memberdayakan ekonomi warga desa dan mendukung program pengentasan kemiskinan.",
                bg: "from-primary/5 to-transparent",
              },
              {
                icon: Clock,
                title: "Misi",
                content: "1) Memberikan pembiayaan mikro dengan bunga ringan\n2) Mendorong kebiasaan menabung di kalangan warga\n3) Membina kewirausahaan warga melalui pelatihan\n4) Mengelola dana sosial untuk warga kurang mampu",
                bg: "from-info/5 to-transparent",
              },
            ].map((item) => (
              <div key={item.title} className={`bg-gradient-to-br ${item.bg} rounded-3xl p-6 sm:p-8`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
                </div>
                <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Layanan */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Produk &amp; Layanan
              </p>
              <h2 className="font-display text-3xl font-bold text-ink">Layanan Kopi {village.name}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {layananItems.map((l) => {
                const Icon = resolveLayananIcon(l.icon);
                return (
                  <div key={l.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-[10px] font-ui font-bold px-2 py-0.5 rounded-full ${l.status === "Aktif" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {l.status}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1.5">{l.nama}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {l.deskripsi}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Info Grafis Sederhana */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-ink mb-6">Alur Keanggotaan</h3>
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Pendaftaran", desc: "Isi formulir & fotokopi KTP di Sekretariat Kopi" },
                  { step: "2", title: "Validasi", desc: "Verifikasi data oleh pengelola selama 1-3 hari kerja" },
                  { step: "3", title: "Setoran Awal", desc: "Bayar simpanan pokok Rp 50.000 + wajib Rp 25.000" },
                  { step: "4", title: "Aktif", desc: "Menerima buku anggota dan dapat menggunakan layanan" },
                ].map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center mx-auto mb-3">
                      {step.step}
                    </div>
                    <h4 className="font-display font-bold text-ink mb-1">{step.title}</h4>
                    <p className="font-body text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Kontak */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink mb-3">Hubungi Kopi</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                    Sekretariat Kopi {village.name} terletak di Kantor Desa. Buka setiap
                    hari kerja pukul 08.00 – 15.00 WITA.
                  </p>
                  <div className="space-y-3">
                    {[
                      { icon: MapPin, text: village.address },
                      { icon: Phone, text: village.whatsapp },
                      { icon: Mail, text: village.email },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-3 font-ui text-sm">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-5">
                  <h4 className="font-display font-bold text-ink mb-3">Jadwal Rapat Anggota</h4>
                  <div className="space-y-2">
                    {[
                      { event: "Rapat Anggota Tahunan (RAT)", date: "Minggu pertama Maret" },
                      { event: "Rapat Anggota Bulanan", date: "Tanggal 15 setiap bulan" },
                      { event: "Pelatihan Keuangan Anggota", date: "Per Triwulan" },
                    ].map((item) => (
                      <div key={item.event} className="flex items-start gap-2 font-ui text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <span className="text-ink font-semibold">{item.event}</span>
                          <span className="text-muted-foreground"> — {item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
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