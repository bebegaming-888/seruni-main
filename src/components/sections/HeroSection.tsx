/**
 * HeroSection — Video Background + Marquee Landing Page
 *
 * Baca dari hero-config-store. LANDING PAGE = VIDEO ONLY.
 * Marquee: anti-error. Default text selalu ada (store _ensureMarqueeDefaults).
 *
 * Fallback: gradient background saat video belum di-set.
 *
 * All layers are `position:absolute; inset:0` so they stack.
 * The wrapper section is NOT a parallax layer — it clips overflow.
 *
 * Parallax handled via CSS variables (--scroll-y) set by __root.tsx
 */

import { useHeroConfig, DEFAULT_HERO_CONFIG } from "@/lib/hero-config-store";
import { resolveVideoUrl, resolveImageUrl } from "@/lib/media-upload";
import { getVillage } from "@/lib/village-dynamic";
import kepalaDesa from "@/assets/kepala-desa-hero.webp";

/** Marquee vertical position → CSS top value */
const MARQUEE_POSITION_MAP = {
  top: "20%",
  center: "50%",
  bottom: "78%",
} as const;

/** Fallback gradient — uses CSS variable for theme awareness */
const FALLBACK_GRADIENT =
  "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--muted)) 40%, hsl(var(--foreground)) 100%)";

/** Placeholder marquee text — belt & suspenders safety net */
const MARQUEE_FALLBACK_TEXT = "Selamat Datang di Portal Resmi Desa";

export function HeroSection() {
  const config = useHeroConfig((s) => s.config);
  const v = getVillage();

  const {
    video_url,
    video_storage_path,
    video_enabled,
    video_fallback_image,
    video_fallback_storage_path,
    video_muted,
    video_loop,
    video_autoplay,
    marquee_enabled,
    marquee_lines,
    marquee_font_size,
    marquee_speed,
    marquee_style,
    weather_enabled,
    weather_label,
    overlay_opacity,
    show_kepala_desa,
  } = config;

  // ── Marquee text ───────────────────────────────────────────────────────────
  const marqueeText = (() => {
    const lines = marquee_lines ?? [];
    const text = lines
      .filter((l) => l.enabled && l.text.trim())
      .map((l) => l.text.trim())
      .join("  ·  ");
    return text || (marquee_enabled ? MARQUEE_FALLBACK_TEXT : null);
  })();

  // ── Video URL resolver ──────────────────────────────────────────────────────
  const videoSrc = resolveVideoUrl(video_storage_path, video_enabled ? video_url : "");
  const posterSrc = resolveImageUrl(video_fallback_storage_path, video_fallback_image);
  const hasVideo = !!(videoSrc && video_enabled);

  // ── Marquee style resolver ─────────────────────────────────────────────────
  const ms = marquee_style ?? DEFAULT_HERO_CONFIG.marquee_style;
  const msFontSize = marquee_font_size ?? DEFAULT_HERO_CONFIG.marquee_font_size;
  const msDuration = `${Math.max(marquee_speed ?? 20, 5)}s`;
  const msTop = MARQUEE_POSITION_MAP[ms.position ?? "center"];

  const overlayOpacity = Math.min(Math.max((overlay_opacity ?? 60) / 100, 0), 1);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section
      className="relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden"
      aria-label="Hero"
    >
      {/* ════════════════════════════════════════════════════════════════
          LAYER 1 — BG (parallax-bg): video or fallback gradient
          Moves at 0.35× scroll speed — fastest parallax depth
          ════════════════════════════════════════════════════════════════ */}
      <div className="parallax-layer absolute inset-0">
        {hasVideo ? (
          <video
            key={videoSrc}
            src={videoSrc}
            width={1920}
            height={1080}
            autoPlay={video_autoplay !== false}
            muted={video_muted !== false}
            loop={video_loop !== false}
            playsInline
            className="h-full w-full object-cover"
            poster={posterSrc || undefined}
            onError={(e) => {
              console.warn("[hero] Video load failed — showing gradient fallback");
              (e.target as HTMLVideoElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-full w-full" style={{ background: FALLBACK_GRADIENT }}>
            {/* Subtle radial highlights for depth */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 20% 50%, hsl(0 0% 100% / 0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(0 0% 100% / 0.03) 0%, transparent 50%)",
              }}
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          LAYER 2 — MID (parallax-mid): gradient overlay + marquee
          Moves at 0.18× scroll speed — middle parallax depth
          ════════════════════════════════════════════════════════════════ */}
      <div className="parallax-layer absolute inset-0 pointer-events-none select-none">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(0 0% 0% / 0.35) 0%, hsl(0 0% 0% / 0.1) 40%, hsl(0 0% 0% / 0.55) 100%)",
            opacity: overlayOpacity,
          }}
        />

        {/* Visible h1 — SEO + accessibility, positioned above marquee */}
        <div
          className="absolute inset-x-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: "30%" }}
        >
          <h1
            className="text-center font-display font-bold leading-tight tracking-tight drop-shadow-lg"
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
              fontSize: "clamp(1.75rem, 5vw, 3.5rem)",
              color: "hsl(var(--color-marquee-default))",
              textShadow: "0 2px 16px hsl(0 0% 0% / 0.6)",
              letterSpacing: "-0.02em",
            }}
          >
            {v.village}
          </h1>
          <p
            className="mt-2 text-center font-ui font-medium tracking-wide drop-shadow"
            style={{
              fontSize: "clamp(0.75rem, 2vw, 1.125rem)",
              color: "hsl(var(--color-marquee-default) / 0.85)",
              textShadow: "0 1px 8px hsl(0 0% 0% / 0.5)",
              letterSpacing: "0.05em",
            }}
          >
            Portal Resmi Desa {v.village}, {v.district}
          </p>
        </div>

        {/* Marquee text */}
        {marquee_enabled && marqueeText && (
          <div
            aria-hidden
            className="absolute inset-x-0 z-10 overflow-hidden"
            style={{ top: msTop }}
          >
            <div
              className="flex whitespace-nowrap will-change-transform"
              style={{ animation: `marquee ${msDuration} linear infinite` }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="shrink-0 px-4 sm:px-10"
                  style={{
                    fontFamily: ms.font_family ?? "Poppins, sans-serif",
                    fontSize: msFontSize,
                    fontWeight: ms.font_weight ?? "bold",
                    fontStyle: ms.font_style ?? "italic",
                    color: ms.color ?? "hsl(var(--color-marquee-default))",
                    opacity: Math.min(Math.max((ms.opacity ?? 30) / 100, 0.05), 1),
                    lineHeight: 1.05,
                    letterSpacing: ms.font_style === "italic" ? "-0.03em" : "-0.02em",
                    textShadow: "var(--marquee-text-shadow)",
                  }}
                >
                  {marqueeText}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          LAYER 3 — FG (parallax-fg): weather badge + kepala desa
          Moves at 0.06× scroll speed — slowest parallax depth (closest)
          ════════════════════════════════════════════════════════════════ */}
      <div className="parallax-layer absolute inset-0 pointer-events-none">
        {/* Weather badge */}
        {weather_enabled && weather_label && (
          <div className="absolute right-4 top-20 sm:top-24 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white shadow-lg backdrop-blur-md pointer-events-auto">
            <span className="font-ui text-xs font-medium tracking-wide">{weather_label}</span>
          </div>
        )}

        {/* Kepala Desa silhouette — anchored to bottom */}
        {show_kepala_desa && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center">
            <img
              src={kepalaDesa}
              alt={`Siluet Kepala Desa ${v.village}`}
              className="block h-[70vh] sm:h-[85vh] lg:h-[92vh] w-auto object-contain object-bottom"
              width={800}
              height={1200}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
