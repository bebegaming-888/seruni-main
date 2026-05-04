import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Users, Home, MapPin, Building2 } from "lucide-react";
import aboutImg from "@/assets/about-village.jpg";
import kepalaImg from "@/assets/kepala-desa.jpg";

const stats = [
  { icon: Users, value: "4.823", label: "Jiwa" },
  { icon: Home, value: "1.456", label: "KK" },
  { icon: MapPin, value: "1.287 ha", label: "Luas" },
  { icon: Building2, value: "6", label: "Dusun" },
];

export function AboutSection() {
  return (
    <section id="tentang" className="py-20 sm:py-28 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="eyebrow text-primary mb-4">Tentang Desa</p>
            <SectionTitle first="Warisan" second="Sasak" className="text-ink mb-6" />
            <div className="space-y-4 font-body text-base text-muted-foreground leading-relaxed">
              <p>
                Desa Seruni Mumbul terletak di lereng timur Gunung Rinjani, Kecamatan Pringgabaya,
                Kabupaten Lombok Timur. Berdiri sejak tahun 1923, desa kami menyimpan sejarah
                panjang sebagai pusat tenun tradisional Sasak.
              </p>
              <p>
                Kini, dengan 4.823 jiwa dan 6 dusun, kami terus berinovasi menjadi desa mandiri —
                memadukan kearifan lokal dengan layanan publik digital yang modern dan transparan.
              </p>
            </div>

            <blockquote className="mt-8 border-l-4 border-primary pl-5 py-1">
              <p className="font-display italic text-xl text-ink leading-snug">
                "Mewujudkan Desa Seruni Mumbul yang mandiri, sejahtera, berbudaya, dan berbasis
                teknologi pada tahun 2030."
              </p>
              <cite className="block mt-3 font-ui text-sm text-muted-foreground not-italic">
                — Visi Desa 2025–2030
              </cite>
            </blockquote>

            <div className="mt-8 flex items-center gap-4 p-4 rounded-2xl bg-cream">
              <img
                src={kepalaImg}
                alt="H. Lalu Mahsun, Kepala Desa Seruni Mumbul"
                className="h-16 w-16 rounded-full object-cover"
                width={768}
                height={768}
                loading="lazy"
              />
              <div className="flex-1">
                <div className="font-display font-bold text-ink">H. Lalu Mahsun</div>
                <div className="font-ui text-xs text-muted-foreground">
                  Kepala Desa Seruni Mumbul
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
                alt="Perangkat dan warga Desa Seruni Mumbul di depan kantor desa"
                className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                width={1280}
                height={960}
                loading="lazy"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-cream p-4 hover:bg-primary hover:text-primary-foreground transition-colors group"
                >
                  <s.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                  <div className="font-display text-2xl font-bold mt-3 text-ink group-hover:text-primary-foreground">
                    {s.value}
                  </div>
                  <div className="font-ui text-xs text-muted-foreground group-hover:text-primary-foreground/80 mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
