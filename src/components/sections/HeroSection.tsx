import { Cloud } from "lucide-react";
import { useEffect, useState } from "react";
import kepalaDesa from "@/assets/kepala-desa-hero.png";
import heroVillage from "@/assets/hero-village.jpg";
import wisataAir from "@/assets/wisata-airterjun.jpg";
import wisataPantai from "@/assets/wisata-pantai.jpg";
import wisataBudaya from "@/assets/wisata-budaya.jpg";
import gal1 from "@/assets/galeri-1.jpg";

const slides = [
  { id: "s1", image: heroVillage, alt: "Pemandangan Desa Seruni Mumbul" },
  { id: "s2", image: wisataAir, alt: "Air terjun" },
  { id: "s3", image: wisataPantai, alt: "Pantai" },
  { id: "s4", image: wisataBudaya, alt: "Budaya Sasak" },
  { id: "s5", image: gal1, alt: "Galeri desa" },
];

const marqueeText =
  "Selamat datang di Portal Resmi Desa Seruni Mumbul · Pelayanan publik transparan · Mari membangun desa bersama";

export function HeroSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.image}
          alt={s.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === active ? "opacity-100" : "opacity-0"}`}
          width={1920}
          height={1280}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/75" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-white" : "w-3 bg-white/50"}`}
          />
        ))}
      </div>

      <div className="absolute right-4 top-24 sm:right-8 sm:top-28 z-30 flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-2 text-white border border-white/20">
        <Cloud className="h-4 w-4" />
        <span className="font-ui text-xs font-medium">Pringgabaya · 28°C · Cerah</span>
      </div>

      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 overflow-hidden pointer-events-none select-none"
        aria-hidden
      >
        <div
          className="flex whitespace-nowrap will-change-transform animate-marquee italic font-bold text-white/60"
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: "clamp(80px, 14vw, 240px)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="px-12 shrink-0">
              {marqueeText}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none">
        <img
          src={kepalaDesa}
          alt="Kepala Desa Seruni Mumbul"
          className="block object-contain object-bottom drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"
          style={{ height: "95vh", maxHeight: "100%" }}
        />
      </div>
    </section>
  );
}
