import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Info, History, Target, Shield, Map as MapIcon, Users } from "lucide-react";

export const Route = createFileRoute("/profil/desa")({
  head: () => ({
    meta: [
      { title: `Profil Desa — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Sejarah, visi, misi, dan profil umum Pemerintah ${VILLAGE.name}.`,
      },
    ],
  }),
  component: () => <ProfilDesaPage />,
});

function SectionTitle({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-8">
      {Icon && (
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h2 className="font-display text-3xl font-bold text-ink">{title}</h2>
      {subtitle && <p className="font-body text-muted-foreground mt-2">{subtitle}</p>}
    </div>
  );
}

export function ProfilDesaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-4xl mx-auto relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-6">
              <Info className="h-3.5 w-3.5" />
              Tentang Kami
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink mb-6 tracking-tight">
              Profil {VILLAGE.name}
            </h1>
            <p className="font-body text-muted-foreground text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              Mengenal lebih dekat sejarah, nilai-nilai, dan cita-cita besar kami dalam membangun
              desa yang mandiri dan berbudaya.
            </p>
          </div>
        </section>

        {/* Visi & Misi */}
        <section className="py-20 px-4 border-y border-border/50">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
            <div className="p-8 rounded-[2rem] bg-ink text-background shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Target className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="font-display text-3xl font-bold mb-4">Visi Kami</h2>
                <p className="font-body text-xl leading-relaxed italic opacity-90">
                  "Menjadi desa yang mandiri, sejahtera, dan religius melalui tata kelola
                  pemerintahan yang transparan dan inovasi ekonomi kerakyatan."
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="font-display text-3xl font-bold text-ink">Misi Kami</h2>
              <ul className="space-y-6">
                {[
                  {
                    title: "Pemerintahan Transparan",
                    desc: "Mewujudkan tata kelola pemerintahan desa yang bersih, transparan, dan akuntabel.",
                  },
                  {
                    title: "Peningkatan Ekonomi",
                    desc: "Mendorong kemandirian ekonomi masyarakat melalui optimalisasi BUMDes dan UMKM.",
                  },
                  {
                    title: "Kualitas Sumber Daya",
                    desc: "Meningkatkan kualitas pendidikan, kesehatan, dan kesejahteraan sosial masyarakat.",
                  },
                  {
                    title: "Kelestarian Budaya",
                    desc: "Menjaga dan melestarikan nilai-nilai adat serta budaya lokal sebagai identitas desa.",
                  },
                ].map((m, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="font-display text-2xl font-bold text-primary/30">0{i + 1}</div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-ink">{m.title}</h4>
                      <p className="font-body text-muted-foreground text-sm mt-1">{m.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sejarah */}
        <section className="py-24 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 text-info mb-4">
                <History className="h-6 w-6" />
              </div>
              <h2 className="font-display text-3xl font-bold text-ink">Sejarah Singkat</h2>
            </div>

            <div className="prose prose-lg prose-slate mx-auto font-body text-muted-foreground leading-relaxed space-y-6">
              <p>
                {VILLAGE.name} memiliki akar sejarah yang kuat yang bermula dari pemukiman nelayan
                tradisional di pesisir Pringgabaya. Nama "Seruni Mumbul" sendiri diambil dari
                filosofi bunga Seruni yang melambangkan keindahan dan kemandirian, serta "Mumbul"
                yang berarti bangkit atau menjulang tinggi.
              </p>
              <p>
                Sejak diresmikan sebagai desa definitif, {VILLAGE.name} terus bertransformasi dari
                pusat perdagangan hasil laut menjadi desa wisata yang mengedepankan kearifan lokal
                tenun Sasak dan keindahan pesisir pantainya.
              </p>
              <p>
                Melalui pergantian kepemimpinan dari masa ke masa, komitmen untuk tetap menjaga jati
                diri sebagai desa religius namun terbuka terhadap inovasi teknologi tetap menjadi
                pilar utama pembangunan kami.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-12 border-t border-border">
              {[
                { label: "Luas Wilayah", value: "1.250 Ha", icon: MapIcon },
                { label: "Populasi", value: "8.420 Jiwa", icon: Users },
                { label: "Dusun", value: "12 Dusun", icon: MapIcon },
                { label: "Kepala Keluarga", value: "2.140 KK", icon: Users },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="font-display text-2xl font-bold text-ink mb-1">{stat.value}</div>
                  <div className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
