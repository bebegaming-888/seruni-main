/**
 * GallerySection — Horizontal Scroll Gallery
 *
 * Images shift LEFT as user scrolls down.
 * Full-width horizontal strip, images slide out of view.
 * Max 1 screen height.
 */

import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight } from "lucide-react";
import { useGaleriStore } from "@/lib/content-store";
import { getMediaUrl } from "@/lib/media-upload";
import { TextReveal } from "@/components/ui/TextReveal";
import { useEffect, useRef } from "react";

export function GallerySection() {
  const galeriItems = useGaleriStore((state) => state.items);
  const items = galeriItems.length > 0 ? galeriItems.slice(0, 8) : [];
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Horizontal scroll effect on vertical scroll
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calculate scroll progress through this section
      // 0 = section just entering viewport from bottom
      // 1 = section fully scrolled past
      const progress = Math.max(
        0,
        Math.min(1, (windowHeight - sectionTop) / (windowHeight + sectionHeight)),
      );

      // Shift track left as user scrolls down
      // Max shift = 40% of track width
      const maxShift = track.scrollWidth * 0.4;
      const translateX = -progress * maxShift;
      track.style.transform = `translateX(${translateX}px)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items.length]);

  return (
    <section
      ref={sectionRef}
      id="galeri"
      className="min-h-[100dvh] flex flex-col justify-center bg-cream overflow-hidden"
    >
      <div className="px-4 sm:px-8 mb-8">
        <div className="mx-auto max-w-7xl flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary mb-3">
              <TextReveal mode="scroll">Galeri Terbaru</TextReveal>
            </p>
            <SectionTitle first="Cerita" second="visual" className="text-ink" />
          </div>
          <Link
            to="/informasi/galeri"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            <TextReveal mode="hover">Lihat Galeri</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 inline ml-1" />
          </Link>
        </div>
      </div>

      {/* Horizontal scrolling track */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={trackRef}
          className="absolute inset-0 flex gap-4 px-4 sm:px-8 items-center transition-transform duration-100 ease-linear"
          style={{ willChange: "transform" }}
        >
          {items.map((it, i) => {
            // Vary heights for visual interest
            const heights = ["h-48", "h-64", "h-56", "h-72", "h-60", "h-52", "h-68", "h-56"];
            const h = heights[i % heights.length];
            return (
              <div
                key={it.id}
                className={`relative ${h} w-80 shrink-0 overflow-hidden rounded-2xl group cursor-pointer`}
              >
                <img
                  src={it.storage_path ? getMediaUrl(it.storage_path, "public-media") : it.url}
                  alt={it.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="font-ui text-sm text-white font-semibold">
                    <TextReveal mode="hover">{it.title}</TextReveal>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
