import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Link } from "@/components/Link";
import { Users, Store, Target, Heart, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/profil/lembaga")({
  head: () => ({
    meta: [
      { title: `Lembaga Desa — ${VILLAGE.name}` },
      {
        name: "description",
        content: "Profil Lembaga Desa Seruni Mumbul: BPD, LPM, PKK, Karang Taruna, BUMDes.",
      },
    ],
  }),
  component: () => <LembagaPage />,
});

const LEMBAGA = [
  {
    icon: Users,
    label: "BPD",
    nama: "Badan Permusyawaratan Desa",
    desc: "Wadah partisipasi rakyat dalam pembentukan peraturan desa, pembahasan APBDes, dan pengawasan kinerja pemerintah desa.",
    to: "/profil/bpd",
    warna: "from-blue-50 to-blue-100",
    badge: "8 Anggota",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    icon: Target,
    label: "LPM",
    nama: "Lembaga Pemberdayaan Masyarakat",
    desc: "Mitra strategis pemerintah desa dalam merencanakan dan melaksanakan program pembangunan partisipatif.",
    to: "/profil/lpm",
    warna: "from-green-50 to-green-100",
    badge: "15 Program",
    badgeClass: "bg-green-500/10 text-green-600 border-green-200",
  },
  {
    icon: Heart,
    label: "PKK",
    nama: "TP-PKK & KWT",
    desc: "Pemberdayaan kesejahteraan keluarga melalui program pendidikan, kesehatan, dan ekonomi kreatif perempuan.",
    to: "/profil/pkkrw",
    warna: "from-pink-50 to-pink-100",
    badge: "104 Anggota",
    badgeClass: "bg-pink-500/10 text-pink-600 border-pink-200",
  },
  {
    icon: Store,
    label: "BUMDes",
    nama: "Badan Usaha Milik Desa",
    desc: "Usaha produktif desa di bidang wisata, kerajinan, dan pengelolaan hasil bumi untuk kemandirian ekonomi warga.",
    to: "/ekonomi/bumdes",
    warna: "from-amber-50 to-amber-100",
    badge: "6 Unit Usaha",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
];

const KARANG_TARUNA = {
  label: "Karang Taruna Mumbul Jaya",
  desc: "Organisasi kepemudaan yang menggerakkan bakti sosial, lingkungan, dan pemberdayaan ekonomi generasi muda desa.",
  to: "/profil/karangtaruna",
  badge: "67 Anggota",
  badgeClass: "bg-primary/10 text-primary border-primary/30",
};

export function LembagaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Tata Kelola Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              Lembaga Desa
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Desa memiliki 5 lembaga desa yang bekerja sama menjalankan pemerintahan dan
              pemberdayaan masyarakat. Setiap lembaga memiliki peran spesifik dalam tata kelola
              pemerintahan desa yang transparan dan partisipatif.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />5 Lembaga aktif · Musyawarah terbuka
            </div>
          </div>
        </section>

        {/* Lembaga Cards */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              {LEMBAGA.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition block"
                  >
                    <div className={`h-2 bg-gradient-to-r ${l.warna}`} />
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {l.label}
                            </span>
                            <span
                              className={`text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full border ${l.badgeClass}`}
                            >
                              {l.badge}
                            </span>
                          </div>
                          <h3 className="font-display text-lg font-bold text-ink leading-tight mb-1.5">
                            {l.nama}
                          </h3>
                          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
                            {l.desc}
                          </p>
                          <span className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-primary">
                            Lihat Profil{" "}
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Karang Taruna */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <Link
              to={KARANG_TARUNA.to}
              className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-primary/30 transition block"
            >
              <div className="h-2 bg-gradient-to-r from-primary/20 to-primary/5" />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full border ${KARANG_TARUNA.badgeClass}`}
                  >
                    {KARANG_TARUNA.badge}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-ink mb-1.5">
                  {KARANG_TARUNA.label}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
                  {KARANG_TARUNA.desc}
                </p>
                <span className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-primary">
                  Lihat Profil{" "}
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
