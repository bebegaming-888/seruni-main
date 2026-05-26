import { ArrowUpRight, Clock, Tag } from "lucide-react";
import { Link } from "@/components/Link";
import { SectionTitle } from "@/components/site/SectionTitle";
import { TextReveal } from "@/components/ui/TextReveal";
import newsImg1 from "@/assets/news-1.jpg";
import newsImg2 from "@/assets/news-2.jpg";
import newsImg3 from "@/assets/news-3.jpg";

const articles = [
  {
    id: 1,
    category: "Pengumuman",
    title: "Pendaftaran Bantuan Langsung Tunai 2026 Telah Dibuka",
    date: "12 Mei 2026",
    image: newsImg1,
  },
  {
    id: 2,
    category: "Kegiatan",
    title: "Gotong Royong Bersih-Bersih Desa di Minggu Pertama",
    date: "8 Mei 2026",
    image: newsImg2,
  },
  {
    id: 3,
    category: "Berita",
    title: "Desa Seruni Mumbul Raih Predikat Desa Mandiri",
    date: "3 Mei 2026",
    image: newsImg3,
  },
];

export function NewsUpdateSection() {
  return (
    <section className="min-h-screen bg-background py-20 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl w-full">
        <div className="mb-6">
          <p className="eyebrow text-primary mb-3">Kabar Desa</p>
          <SectionTitle first="Update" second="Berita" className="text-foreground" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {articles.map((a, i) => (
            <article
              key={a.id}
              className="group rounded-lg overflow-hidden bg-card border border-border hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={a.image}
                  alt={a.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-ui text-[11px] font-bold uppercase tracking-wide">
                    <Tag className="h-2.5 w-2.5" />
                    {a.category}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-foreground text-base leading-snug mb-2 line-clamp-2">
                  <Link
                    to={`/informasi/berita/${a.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    <TextReveal mode="hover">{a.title}</TextReveal>
                  </Link>
                </h3>
                <div className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {a.date}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6">
          <Link
            to="/informasi/berita"
            className="btn-pill bg-ink text-background hover:bg-primary inline-flex group"
          >
            <TextReveal mode="hover">Semua Berita</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
