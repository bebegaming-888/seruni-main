/**
 * TestimonialSlider — Quote/Endorsement Carousel (CSS-only, no GSAP)
 *
 * Features:
 * - Smooth fade transitions
 * - Progress bar with countdown
 * - Auto-play with pause on hover
 * - Pure CSS animations
 */

import { useEffect, useRef, useState } from "react";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "Pelayanan desa sangat memuaskan. Surat可以在 3 hari selesai tanpa harus bolak-balik ke kantor desa.",
    author: "Hj. Siti Aminah",
    role: "Warga Desa Seruni Mumbul",
  },
  {
    id: "2",
    quote:
      "Program pemberdayaan UMKM membantu saya mengembangkan usaha kerajinan rakyat. Terima kasih desa!",
    author: "Bpk. Ahmad Wijaya",
    role: "Pengusaha Mikro",
  },
  {
    id: "3",
    quote:
      "Sistem e-surat sangat membantu warga yang tinggal di luar kota. Sekarang bisaurus surat dari mana saja.",
    author: "Ibu Dewi Lestari",
    role: "Perantau, Jakarta",
  },
  {
    id: "4",
    quote:
      "Transparansi APBDes sangat baik. Masyarakat bisa melihat penggunaan anggaran dengan jelas.",
    author: "Bpk. H. Marzuki",
    role: "Ketua RT 03",
  },
];

export function TestimonialSlider() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const progressTimerRef = useRef<number | null>(null);
  const DURATION = 6; // seconds per testimonial

  const total = TESTIMONIALS.length;

  const goTo = (index: number) => {
    if (index === current) return;
    setCurrent(index);
    setProgress(0);
  };

  const next = () => {
    goTo((current + 1) % total);
  };

  // Auto-play timer
  useEffect(() => {
    if (isHovered) {
      if (progressTimerRef.current) cancelAnimationFrame(progressTimerRef.current);
      return;
    }

    const startTime = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / (DURATION * 1000)) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        next();
      } else {
        progressTimerRef.current = requestAnimationFrame(animateProgress);
      }
    };

    progressTimerRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (progressTimerRef.current) {
        cancelAnimationFrame(progressTimerRef.current);
      }
    };
  }, [current, isHovered]);

  const testimonial = TESTIMONIALS[current];

  return (
    <section className="py-20 bg-primary/5 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Label */}
          <div className="text-center mb-8">
            <span className="inline-block font-ui text-xs font-semibold uppercase tracking-widest text-primary px-4 py-1 border border-primary/20 rounded-full">
              Apa Kata Warga
            </span>
          </div>

          {/* Slider */}
          <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Quote icon */}
            <div className="text-center mb-6">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                className="mx-auto text-primary/20"
              >
                <path
                  d="M14 20C14 15.5817 17.5817 12 22 12V12C22 12 22 12 22 12C22 12 22 12 22 12V16C22 16 22 16 22 16H26C30.4183 16 34 19.5817 34 24V24C34 28.4183 30.4183 32 26 32H22V20H14ZM14 20H14V20Z"
                  fill="currentColor"
                />
                <path
                  d="M28 12V12C28 12 28 12 28 12V16C28 16 28 16 28 16H32C36.4183 16 40 19.5817 40 24V24C40 28.4183 36.4183 32 32 32H28V20H20H20H14H14V24C14 19.5817 17.5817 16 22 16H28V12Z"
                  fill="currentColor"
                  fillOpacity="0.5"
                />
              </svg>
            </div>

            {/* Quote text with fade transition */}
            <div className="relative min-h-[120px] mb-8">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.id}
                  className={`absolute inset-0 text-center font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight transition-opacity duration-500 ${
                    i === current ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                >
                  {t.quote}
                </div>
              ))}
            </div>

            {/* Author */}
            <div className="text-center">
              <p className="font-ui text-lg font-semibold text-foreground">{testimonial.author}</p>
              <p className="font-body text-sm text-muted-foreground">{testimonial.role}</p>
            </div>

            {/* Progress track */}
            <div className="mt-10 h-0.5 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full origin-left transition-transform duration-0.1"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === current ? "bg-primary w-6" : "bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
