/**
 * PageHero — Reusable page header hero (25vh, dark overlay, brand-compliant)
 *
 * RULES:
 * - titleFirst  : kata 1 — bold white
 * - titleSecond  : kata 2 — ITALIC, warna beda (accent peach #EEAA78)
 * - bgImage      : jika ada, pakai dengan overlay gelap 70%+
 * - bgFallback   : gradient gelap brand jika tidak ada image
 * - Brand palette only: E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
 */

import { Link } from "@/components/Link";
import { ChevronRight } from "lucide-react";

interface PageHeroProps {
  /** Kata pertama judul — bold white */
  titleFirst: string;
  /** Kata kedua judul — ITALIC, accent color #EEAA78 */
  titleSecond: string;
  /** Deskripsi singkat di bawah judul */
  description?: string;
  /** Badge opsional di atas judul (e.g. "Informasi") */
  badge?: string;
  badgeIcon?: React.ReactNode;
  /** Path ke gambar hero (dari /src/assets/) */
  bgImage?: string;
  /** Ikon badge opsional */
  imageAlt?: string;
  /** Navigasi breadcrumb opsional */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Jika true, badge/icon warna putih; jika false, warna primary */
  dark?: boolean;
}

const BRAND_SECONDARY = "#078898";
const BRAND_DARK_FALLBACK = "linear-gradient(160deg, #078898 0%, #0a3d47 100%)";

export function PageHero({
  titleFirst,
  titleSecond,
  description,
  badge,
  badgeIcon,
  bgImage,
  imageAlt = "",
  breadcrumbs,
  dark = true,
}: PageHeroProps) {
  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{
        minHeight: "25vh",
        background: bgImage ? `url(${bgImage}) center/cover no-repeat` : BRAND_DARK_FALLBACK,
      }}
    >
      {/* Dark overlay — minimum 70% to ensure text readability */}
      {bgImage ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(7,20,26,0.78) 0%, rgba(10,40,50,0.82) 50%, rgba(7,20,26,0.85) 100%)",
          }}
        />
      ) : (
        /* Subtle texture on fallback gradient */
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.15) 35px, rgba(255,255,255,0.15) 36px)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative max-w-6xl mx-auto w-full px-4 py-10">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="flex items-center gap-1.5 font-ui text-[11px] text-white/60 mb-4"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-white/40" />
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/80">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Badge */}
        {(badge || badgeIcon) && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm px-3 py-1 font-ui text-xs font-semibold text-white mb-4">
            {badgeIcon && <span className="h-3.5 w-3.5">{badgeIcon}</span>}
            {badge}
          </div>
        )}

        {/* Title */}
        <h1
          className="font-display font-bold text-white leading-tight mb-3"
          style={{
            fontSize: "clamp(2rem, 4vw, 3.75rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {titleFirst}
          <span className="ml-2 text-[hsl(27,55%,71%)] italic">{titleSecond}</span>
        </h1>

        {/* Description */}
        {description && (
          <p className="font-body text-white/75 max-w-lg text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
