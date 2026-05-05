import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Zap, Users, Phone, MapPin, Target, HeartHandshake, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/profil/karangtaruna")({
  head: () => ({
    meta: [
      { title: `Karang Taruna — ${VILLAGE.name}` },
      {
        name: "description",
        content:
          "Karang Taruna Mumbul Jaya Desa Seruni Mumbul. Generasi muda pemberdaya masyarakat.",
      },
    ],
  }),
  component: () => <KarangTarunaPage />,
});

const PROGRAM = [
  {
    icon: HeartHandshake,
    title: "Bakti Sosial",
    desc: "Donor darah, pembagian bantuan, dan kepedulian terhadap warga kurang mampu.",
  },
  {
    icon: Target,
    title: "Pelatihan Keterampilan",
    desc: "Digital marketing, desain grafis, dan manajemen usaha untuk anak muda.",
  },
  {
    icon: Zap,
    title: "Lingkungan & Kehutanan",
    desc: "Penanaman 500 pohon baru, bank sampah, dan pengelolaan ruang terbuka hijau.",
  },
  {
    icon: Users,
    title: "Pendampingan Lansia",
    desc: "Kunjungan rumah, bantuan harian, dan program kebahagiaan lansia.",
  },
];

const STATS = [
  { label: "Anggota Aktif", value: "67" },
  { label: "Program/Tahun", value: "14" },
  { label: "Relawan Tetap", value: "23" },
  { label: "Usia Rata-rata", value: "22 th" },
];

const PENGURUS = [
  { nama: "M. Ryan Saputra", jabatan: "Ketua Umum", instagram: "@ryan_seruni" },
  { nama: "Siti Nurfadilah", jabatan: "Sekretaris 1", instagram: "@nfdlh_" },
  { nama: "Lalu Gilang", jabatan: "Bendahara", instagram: "@lalu_gilang" },
  { nama: "Baiq Dina", jabatan: "Kabid Sosial", instagram: "@dina.kt" },
  { nama: "H. Fauzi", jabatan: "Kabid Lingkungan", instagram: "@fauzi_kt" },
];

export function KarangTarunaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Zap className="h-3.5 w-3.5" />
              Organisasi Kepemudaan
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              Karang Taruna
              <br />
              <span className="text-primary">Mumbul Jaya</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Organisasi pemuda-pemudi desa yang bergerak di bidang sosial, lingkungan, dan
              pemberdayaan ekonomi kreatif. Menginspirasi generasi muda untuk aktif membangun desa
              dari sekarang.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                67 Anggota aktif
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <Zap className="h-3.5 w-3.5" />
                14 Program/tahun
              </span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 -mt-8 mb-14">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card shadow-card p-5 text-center"
              >
                <p className="font-display text-2xl sm:text-3xl font-bold text-primary">
                  {s.value}
                </p>
                <p className="font-ui text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Program */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Unggulan
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">
              Empat Pilar Karang Taruna
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {PROGRAM.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-ink mb-2">{p.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Kepengurusan */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-ink mb-8">Kepengurusan</h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Nama
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Jabatan
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Instagram
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PENGURUS.map((p) => (
                    <tr
                      key={p.nama}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="px-4 py-3 font-display font-semibold">{p.nama}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {p.jabatan}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <a
                          href={`https://instagram.com/${p.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-ui text-xs text-primary hover:underline font-medium"
                        >
                          {p.instagram}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap gap-6">
                {[
                  { icon: MapPin, text: "Balai Desa Seruni Mumbul, Ruang Karang Taruna" },
                  { icon: Phone, text: "+62 812-3456-7890 (Ketua)" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-ui text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
