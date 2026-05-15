/**
 * HeroSection — Video Background + Marquee Landing Page
 *
 * Baca dari hero-config-store. LANDING PAGE = VIDEO ONLY.
 * Marquee: anti-error. Default text selalu ada (store _ensureMarqueeDefaults).
 * Animation 100% inline — tidak ada ketergantungan CSS class.
 * Keyframe @keyframes marquee ada di styles.css.
 *
 * Fallback: gradient background saat video belum di-set.
 */

import kepalaDesa from "@/assets/kepala-desa-hero.png";
import { useHeroConfig, DEFAULT_HERO_CONFIG } from "@/lib/hero-config-store";
import { resolveVideoUrl, resolveImageUrl } from "@/lib/media-upload";
import { getVillage } from "@/lib/village-dynamic";

/** Marquee vertical position → CSS top value */
const MARQUEE_POSITION_MAP = {
  top: "20%",
  center: "50%",
  bottom: "78%",
} as const;

/** Fallback gradient saat belum ada video */
const FALLBACK_GRADIENT = "linear-gradient(160deg, #1a4d2e 0%, #0d2818 50%, #051a0f 100%)";

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

  // ── Marquee text ────────────────────────────────────────────────────────────
  // _ensureMarqueeDefaults() di store injects default jika marquee_lines kosong.
  // Belt & suspenders: fallback ke placeholder jika semua baris disabled/empty.
  const marqueeText = (() => {
    const lines = marquee_lines ?? [];
    const text = lines
      .filter((l) => l.enabled && l.text.trim())
      .map((l) => l.text.trim())
      .join("  ·  ");
    return text || (marquee_enabled ? MARQUEE_FALLBACK_TEXT : null);
  })();

  // ── Video URL resolver ─────────────────────────────────────────────────────
  const videoSrc = resolveVideoUrl(video_storage_path, video_enabled ? video_url : "");
  const posterSrc = resolveImageUrl(video_fallback_storage_path, video_fallback_image);
  const hasVideo = !!(videoSrc && video_enabled);

  // ── Marquee style resolver ────────────────────────────────────────────────
  const ms = marquee_style ?? DEFAULT_HERO_CONFIG.marquee_style;
  const msFontSize = marquee_font_size ?? DEFAULT_HERO_CONFIG.marquee_font_size;
  const msDuration = `${Math.max(marquee_speed ?? 20, 5)}s`;
  const msTop = MARQUEE_POSITION_MAP[ms.position ?? "center"];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
      {/* ══ 1. VIDEO BACKGROUND ══ */}
      {hasVideo ? (
        <video
          key={videoSrc}
          src={videoSrc}
          autoPlay={video_autoplay !== false}
          muted={video_muted !== false}
          loop={video_loop !== false}
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          poster={posterSrc || undefined}
          onError={(e) => {
            console.warn("[hero] Video load failed — showing gradient fallback");
            (e.target as HTMLVideoElement).style.display = "none";
          }}
        />
      ) : (
        <div className="absolute inset-0 h-full w-full" style={{ background: FALLBACK_GRADIENT }}>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 50%)",
            }}
          />
        </div>
      )}

      {/* ══ 2. GRADIENT OVERLAY ══ */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.55) 100%)",
          opacity: Math.min(Math.max((overlay_opacity ?? 60) / 100, 0), 1),
        }}
      />

      {/* ══ 3. MARQUEE TEXT (mandatory when enabled) ══ */}
      {marquee_enabled && marqueeText && (
        <div
          aria-hidden
          className="absolute inset-x-0 z-10 pointer-events-none select-none overflow-hidden"
          style={{ top: msTop }}
        >
          {/*
            Animation 100% inline — tidak ada CSS class.
            Tailwind v4: inline style animation shorthand works perfectly.
            Keyframe @keyframes marquee (styles.css) supply the name & path.
            duration + timing + iteration controlled via inline style.
          */}
          <div
            className="flex whitespace-nowrap will-change-transform"
            style={{ animation: `marquee ${msDuration} linear infinite` }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="shrink-0 px-10"
                style={{
                  fontFamily: ms.font_family ?? "Fraunces, serif",
                  fontSize: msFontSize,
                  fontWeight: ms.font_weight ?? "bold",
                  fontStyle: ms.font_style ?? "italic",
                  color: ms.color ?? "#ffffff",
                  opacity: Math.min(Math.max((ms.opacity ?? 30) / 100, 0.05), 1),
                  lineHeight: 1.05,
                  letterSpacing: ms.font_style === "italic" ? "-0.03em" : "-0.02em",
                  textShadow: "0 4px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {marqueeText}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══ 4. WEATHER BADGE ══ */}
      {weather_enabled && weather_label && (
        <div className="absolute right-4 top-24 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white shadow-lg backdrop-blur-md">
          <span className="font-ui text-xs font-medium tracking-wide">{weather_label}</span>
        </div>
      )}

      {/* ══ 5. KEPALA DESA SILHOUETTE ══ */}
      {show_kepala_desa && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center">
          <img
            src={kepalaDesa}
            alt={`Siluet Kepala Desa ${v.village}`}
            className="block h-[92vh] w-auto object-contain object-bottom"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </section>
  );
}
