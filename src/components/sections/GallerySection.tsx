import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight } from "lucide-react";
import g1 from "@/assets/galeri-1.jpg";
import g2 from "@/assets/galeri-2.jpg";
import g3 from "@/assets/galeri-3.jpg";
import g4 from "@/assets/wisata-pantai.jpg";
import g5 from "@/assets/wisata-budaya.jpg";
import g6 from "@/assets/news-1.jpg";

const items = [
  { img: g1, caption: "Gotong royong jumat bersih", span: "row-span-2" },
  { img: g2, caption: "Kunjungan SD ke balai desa", span: "" },
  { img: g3, caption: "Pasar tradisional Mumbul", span: "" },
  { img: g4, caption: "Pesisir Pantai Mumbul", span: "" },
  { img: g5, caption: "Festival Tenun Sasak 2025", span: "row-span-2" },
  { img: g6, caption: "Upacara HUT RI ke-80", span: "" },
];

export function GallerySection() {
  return (
    <section id="galeri" className="py-20 sm:py-28 px-4 sm:px-8 bg-cream">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="eyebrow text-primary mb-3">Galeri Terbaru</p>
            <SectionTitle first="Cerita" second="visual" className="text-ink" />
          </div>
          <Link
            to="/informasi/galeri"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            Lihat Galeri
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] gap-3">
          {items.map((it, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-3xl group cursor-pointer ${it.span}`}
            >
              <img
                src={it.img}
                alt={it.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="font-ui text-sm text-white font-semibold">{it.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
