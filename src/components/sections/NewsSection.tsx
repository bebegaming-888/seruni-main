import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Clock } from "lucide-react";
import { ARTICLES, formatRelativeDate } from "@/data/berita";

// Ambil 3 artikel terbaru untuk homepage
const HOMEPAGE_NEWS = ARTICLES.slice(0, 3);

export function NewsSection() {
  return (
    <section id="berita" className="py-20 sm:py-28 px-4 sm:px-8 bg-cream">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="eyebrow text-primary mb-3">Kabar Terkini</p>
            <SectionTitle first="Berita" second="desa" className="text-ink max-w-xl" />
          </div>
          <Link
            to="/informasi/berita"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            Semua Berita
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {HOMEPAGE_NEWS.map((n) => (
            <Link
              to="/informasi/berita/$slug"
              params={{ slug: n.slug }}
              key={n.id}
              className="group block bg-card rounded-3xl overflow-hidden hover:shadow-elev transition-shadow"
            >
              {/* Cover placeholder */}
              <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="font-display text-4xl font-bold text-primary/30 mb-1">
                    {n.category[0]}
                  </div>
                  <div className="font-ui text-xs text-primary/40 font-medium">{n.category}</div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-ui font-semibold">
                    {n.category}
                  </span>
                  <span className="font-ui text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {n.read_time} menit
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-ink leading-tight group-hover:text-primary transition-colors">
                  {n.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground mt-2 line-clamp-2">
                  {n.excerpt}
                </p>
                <div className="font-ui text-xs text-muted-foreground mt-4">
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
