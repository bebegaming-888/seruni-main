import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Clock } from "lucide-react";
import { formatRelativeDate } from "@/data/berita";
import { useBeritaStore } from "@/lib/content-store";
import { TextReveal } from "@/components/ui/TextReveal";

export function NewsSection() {
  const items = useBeritaStore((state) => state.items);
  // Ambil 3 artikel terbaru untuk homepage
  const homepageNews = items.length > 0 ? items.slice(0, 3) : [];

  return (
    <section
      id="berita"
      className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-8 bg-cream overflow-hidden"
    >
      <div className="mx-auto max-w-7xl w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="eyebrow text-primary mb-3">Kabar Terkini</p>
            <SectionTitle first="Berita" second="desa" className="text-ink max-w-xl" />
          </div>
          <Link
            to="/informasi/berita"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            <TextReveal mode="hover" className="inline-block">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 inline mr-1" />
              Semua Berita
            </TextReveal>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {homepageNews.map((n) => (
            <Link
              to="/informasi/berita/$slug"
              params={{ slug: n.slug }}
              key={n.id}
              className="group block bg-card rounded-2xl overflow-hidden hover:shadow-elev transition-shadow"
            >
              {/* Cover placeholder */}
              <div className="aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                {n.cover_image ? (
                  <img
                    src={n.cover_image}
                    alt={n.title}
                    className="w-full h-full object-cover"
                    width={640}
                    height={360}
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="font-display text-4xl font-bold text-primary/30 mb-1">
                      {n.category[0]}
                    </div>
                    <div className="font-ui text-xs text-primary/40 font-medium">{n.category}</div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-ui font-semibold">
                    {n.category}
                  </span>
                  <span className="font-ui text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {n.read_time || "5"} menit
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink leading-tight group-hover:text-primary transition-colors">
                  <TextReveal mode="hover">{n.title}</TextReveal>
                </h3>
                <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">
                  {n.excerpt}
                </p>
                <div className="font-ui text-xs text-muted-foreground mt-3">
                  {formatRelativeDate(n.published_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
