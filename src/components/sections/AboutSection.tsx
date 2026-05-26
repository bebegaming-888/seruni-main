import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Users, Home, MapPin, Building2, Palmtree, Trophy, Map } from "lucide-react";
import { getSettings } from "@/lib/settings-store";
import { resolveImageUrl } from "@/lib/media-upload";
import aboutImg from "@/assets/about-village.jpg";
import kepalaImg from "@/assets/kepala-desa.jpg";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  home: Home,
  map: Map,
  mappin: MapPin,
  building: Building2,
  palmtree: Palmtree,
  trophy: Trophy,
};

export function AboutSection() {
  const settings = getSettings();
  const { content, village } = settings;

  return (
    <section
      id="tentang"
      className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <p className="eyebrow text-primary mb-4">Tentang Desa</p>
            <SectionTitle first="Warisan" second="Budaya" className="text-ink mb-6" />
            <div className="space-y-4 font-body text-base text-muted-foreground leading-relaxed">
              <p>{content.about_text}</p>
            </div>

            <blockquote className="mt-8 border-l-4 border-primary pl-5 py-1">
              <p className="font-display italic text-xl text-foreground leading-snug">
                "{content.vision}"
              </p>
              <cite className="block mt-3 font-ui text-sm text-muted-foreground not-italic">
                — Visi Desa
              </cite>
            </blockquote>

            <div className="mt-8 flex items-center gap-4 p-4 rounded-lg bg-card">
              <img
                src={resolveImageUrl(village.logo_storage_path, village.logo_url) || kepalaImg}
                alt={village.head}
                className="h-16 w-16 rounded-full object-cover"
                width={768}
                height={768}
                loading="lazy"
              />
              <div className="flex-1">
                <div className="font-display font-bold text-foreground">{village.head}</div>
                <div className="font-ui text-xs text-muted-foreground">
                  Kepala Desa {village.name}
                </div>
              </div>
              <Link
                to="/profil/perangkat"
                className="hidden sm:flex h-10 w-10 rounded-full bg-ink text-background items-center justify-center hover:bg-primary transition-colors"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <Link
              to="/profil/desa"
              className="mt-8 btn-pill bg-ink text-background hover:bg-primary inline-flex group"
            >
              Profil Lengkap Desa
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl">
              <img
                src={aboutImg}
                alt={`Wilayah ${village.name}`}
                className="w-full max-h-[420px] h-auto object-cover hover:scale-105 transition-transform duration-700"
                width={1280}
                height={960}
                loading="lazy"
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {content.stats.map((s) => {
                const Icon = ICON_MAP[s.icon.toLowerCase()] || Users;
                return (
                  <div
                    key={s.label}
                    className="rounded-2xl bg-card p-4 hover:bg-primary hover:text-primary-foreground transition-colors group"
                  >
                    <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                    <div className="font-display text-2xl font-bold mt-3 text-foreground group-hover:text-primary-foreground">
                      {s.value}
                    </div>
                    <div className="font-ui text-xs text-muted-foreground group-hover:text-primary-foreground/80 mt-0.5">
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
