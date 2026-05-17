import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { PageHero } from "@/components/sections/PageHero";
import { useSettings } from "@/lib/settings-store";
import { Info } from "lucide-react";

import { History, Target, Shield, Map as MapIcon, Users } from "lucide-react";

export const Route = createFileRoute("/profil/desa")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Profil Desa — ${v.name}` },
        {
          name: "description",
          content: `Sejarah, visi, misi, dan profil umum Pemerintah ${v.name}.`,
        },
      ],
    };
  },
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
  const v = useVillage();
  const { content } = useSettings();
  const pageConfig = getVillage();

  const vision = content?.vision || "Terwujudnya desa yang maju, mandiri, dan sejahtera.";
  const missions = content?.mission?.length
    ? content.mission
    : [
        "Mewujudkan tata kelola pemerintahan desa yang transparan dan akuntabel.",
        "Mendorong kemandirian ekonomi masyarakat melalui optimalisasi potensi lokal.",
        "Meningkatkan kualitas pendidikan, kesehatan, dan kesejahteraan sosial.",
        "Menjaga kelestarian lingkungan dan budaya lokal.",
      ];

  // Sejarah dari page settings config, fallback paragraphs
  const sejarahDefault = [
    `${v.name} memiliki sejarah panjang sebagai desa yang bertransformasi dari waktu ke waktu.`,
    `Desa ini terus berkembang dalam berbagai aspek kehidupan masyarakat.`,
    `Komitmen untuk menjaga kearifan lokal sekaligus terbuka terhadap inovasi tetap menjadi pilar utama.`,
  ];
  const sejarahParas = (content as { sejarah?: string } | undefined)?.sejarah
    ? ((content as { sejarah?: string }).sejarah || "").split("|").filter(Boolean)
    : sejarahDefault;

  // Stats — dari getVillage() atau page settings extras
  const luasWilayah = v.luas_wilayah || "— Ha";
  const populasiText = v.penduduk_stat || "— Jiwa";
  const dusunCount = v.dusun_list?.length ? `${v.dusun_list.length} Danau` : "—";
  const pageStats = content?.stats?.length
    ? content.stats
    : [
        { label: "Luas Wilayah", value: luasWilayah, icon: "map" },
        { label: "Populasi", value: populasiText, icon: "users" },
        { label: "Dusun", value: dusunCount, icon: "map" },
        { label: "Kepala Keluarga", value: "— KK", icon: "users" },
      ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Profil"
          titleSecond="Desa"
          description="Sejarah, visi, misi, dan profil umum pemerintah desa."
          badge="Tentang Kami"
          badgeIcon={<Info className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "Profil Desa" }]}
        />

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
                  &ldquo;{vision}&rdquo;
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="font-display text-3xl font-bold text-ink">Misi Kami</h2>
              <ul className="space-y-6">
                {missions.map((m, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="font-display text-2xl font-bold text-primary/30">0{i + 1}</div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-ink">{m}</h4>
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
              {sejarahParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-12 border-t border-border">
              {pageStats.map((stat, i) => (
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
