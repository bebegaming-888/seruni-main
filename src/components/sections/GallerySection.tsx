import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight } from "lucide-react";
import { useGaleriStore } from "@/lib/content-store";
import { getMediaUrl } from "@/lib/media-upload";

export function GallerySection() {
  const galeriItems = useGaleriStore((state) => state.items);
  // Ambil 6 galeri terbaru untuk homepage
  const items = galeriItems.length > 0 ? galeriItems.slice(0, 6) : [];

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
          {items.map((it, i) => {
            // Berikan layout row-span untuk item pertama dan kelima agar desain asimetris
            const span = i === 0 || i === 4 ? "row-span-2" : "";
            return (
              <div
                key={it.id}
                className={`relative overflow-hidden rounded-3xl group cursor-pointer ${span}`}
              >
                <img
                  src={it.storage_path ? getMediaUrl(it.storage_path, "public-media") : it.url}
                  alt={it.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="font-ui text-sm text-white font-semibold">{it.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
