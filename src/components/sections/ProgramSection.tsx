/**
 * ProgramSection — "Layanan Utama" — Full-Screen Stacked Image Cards
 *
 * 3 layanan: E-Surat, Keuangan, Kependudukan
 * Full-screen image backgrounds with text overlay
 * Stacking/overlapping animation — cards shift as user scrolls
 * Inspired by: thekrakentraining.com stacking-cards pattern
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/Link";
import { FileText, Wallet, Users } from "lucide-react";

interface Service {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  /** Full-screen background image */
  image: string;
  /** Link target */
  href: string;
  cta: string;
  /** Overlay opacity for readability */
  overlayOpacity: number;
}

const SERVICES: Service[] = [
  {
    id: "e-surat",
    title: "E-Surat",
    subtitle: "Layanan Administrasi",
    description:
      "Ajukan surat keterangan secara online — Domisili, Usaha, Tidak Mampu, dan lainnya. Proses cepat, data aman, bisa dipantau statusnya.",
    icon: <FileText className="w-10 h-10" strokeWidth={1.5} />,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=85",
    href: "/pelayanan/e-surat",
    cta: "Ajukan Surat Sekarang",
    overlayOpacity: 0.55,
  },
  {
    id: "keuangan",
    title: "Keuangan",
    subtitle: "Transparansi Dana Desa",
    description:
      "Pantau real-time penerimaan dan pengeluaran dana desa. APBDes, sumber anggaran, dan alokasi dana清清楚楚 — untuk transparansi penuh.",
    icon: <Wallet className="w-10 h-10" strokeWidth={1.5} />,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=85",
    href: "/laporan/apbdes",
    cta: "Lihat Laporan Keuangan",
    overlayOpacity: 0.6,
  },
  {
    id: "kependudukan",
    title: "Kependudukan",
    subtitle: "Data & Profil Penduduk",
    description:
      "Akses data penduduk, statistik demografi, dan profil keluarga. Informasi akurat untuk perencanaan pembangunan desa.",
    icon: <Users className="w-10 h-10" strokeWidth={1.5} />,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&q=85",
    href: "/pelayanan/penduduk",
    cta: "Lihat Data Penduduk",
    overlayOpacity: 0.55,
  },
];

// ── Animated card wrapper ─────────────────────────────────────────────────────
function ServiceCard({
  service,
  index,
  total,
  isActive,
  isPast,
}: {
  service: Service;
  index: number;
  total: number;
  isActive: boolean;
  isPast: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  // Animate in when this card enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger reveal: card 0 first, then 1, then 2
          setTimeout(() => setRevealed(true), index * 200);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const translateY = isPast ? -30 : isActive ? 0 : 20;
  const scale = isActive ? 1 : isPast ? 0.97 : 0.94;
  const opacity = isActive ? 1 : isPast ? 0.85 : 0.5;
  const zIndex = isActive ? total : total - index - 1;

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        zIndex,
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {/* Full-screen image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${service.image})` }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(38,38,38,${service.overlayOpacity}) 0%, rgba(38,38,38,0.3) 50%, rgba(38,38,38,${service.overlayOpacity + 0.2}) 100%)`,
        }}
      />

      {/* Diagonal accent stripe */}
      <div
        className="absolute top-0 right-0 w-32 h-full opacity-20"
        style={{
          background: "linear-gradient(to bottom left, transparent 40%, #FF5722 100%)",
        }}
      />

      {/* Content — bottom-left positioned */}
      <div
        ref={contentRef}
        className={`absolute bottom-0 left-0 right-0 px-8 sm:px-16 pb-12 sm:pb-20 transition-all duration-700 delay-100 ${
          revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Service number indicator */}
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-xs tracking-widest text-white/40">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="flex-1 h-px bg-white/10" />
          {/* Progress dots */}
          {SERVICES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-400 ${
                i === index ? "bg-primary w-4" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Subtitle / eyebrow */}
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50 mb-3">
          {service.subtitle}
        </p>

        {/* Title — large, bold */}
        <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-[0.9] mb-6 tracking-tight">
          {service.title}
        </h2>

        {/* Description */}
        <p className="font-body text-base sm:text-lg text-white/70 max-w-xl leading-relaxed mb-8">
          {service.description}
        </p>

        {/* CTA Button */}
        <Link to={service.href} className="inline-flex items-center gap-3 group">
          <div className="flex items-center gap-0 overflow-hidden rounded-full">
            <div className="btn-animate-chars rounded-full bg-primary text-primary-foreground px-6 py-3 font-ui text-sm font-semibold flex items-center gap-2">
              <span data-btn-chars>{service.cta}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Top-right icon badge */}
      <div className="absolute top-8 right-8 sm:top-12 sm:right-12 text-white/30">
        {service.icon}
      </div>

      {/* Left border accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary transition-all duration-700"
        style={{ opacity: isActive ? 1 : 0.2 }}
      />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ProgramSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll-driven active card switching
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const scrollProgress = Math.max(
        0,
        Math.min(1, -rect.top / (containerHeight - window.innerHeight)),
      );
      const newIndex = Math.floor(scrollProgress * SERVICES.length);
      setActiveIndex(Math.min(newIndex, SERVICES.length - 1));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ height: "300vh" }}>
      {/* Sticky viewport — sticks for the full scroll distance */}
      <div
        ref={containerRef}
        className="sticky top-0 min-h-[100dvh] overflow-hidden"
        style={{ backgroundColor: "hsl(var(--ink))" }}
      >
        {/* Section label — top-left */}
        <div className="absolute top-8 left-8 sm:left-16 z-20">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            Layanan Utama
          </span>
        </div>

        {/* 3 stacked cards — absolute positioned */}
        {SERVICES.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            index={index}
            total={SERVICES.length}
            isActive={index === activeIndex}
            isPast={index < activeIndex}
          />
        ))}

        {/* Scroll hint — bottom right */}
        <div className="absolute bottom-8 right-8 sm:right-16 z-20 flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
