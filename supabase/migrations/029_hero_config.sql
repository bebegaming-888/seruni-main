-- ============================================================
-- MIGRATION 029: Hero Landing Page Configuration
--
-- TABLE: hero_config
-- Tipe background: 'image' | 'video' (solid color dihapus)
-- Image slides, marquee text, video background, weather badge.
-- Semua pengaturan di sini — TIDAK ada di app_settings.
--
-- RLS: TO public (menggunakan anon key, bukan Supabase Auth).
-- ============================================================

-- ── Drop existing table if exists ────────────────────────────
DROP TABLE IF EXISTS public.hero_config CASCADE;

-- ── Create hero_config table ────────────────────────────────
CREATE TABLE public.hero_config (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  active          boolean NOT NULL DEFAULT true,

  -- Background mode: image | video
  bg_type         text NOT NULL DEFAULT 'image'
                   CHECK (bg_type IN ('image', 'video')),

  -- ── Image Slides ──────────────────────────────────────────
  slides          jsonb NOT NULL DEFAULT '[]',
  slider_enabled  boolean NOT NULL DEFAULT true,
  slider_auto_play boolean NOT NULL DEFAULT true,
  slider_interval integer NOT NULL DEFAULT 6000,

  -- ── Video Background ─────────────────────────────────────
  video_url       text DEFAULT '',
  video_storage_path text DEFAULT '',
  video_enabled    boolean NOT NULL DEFAULT false,
  video_fallback_image text DEFAULT '',
  video_fallback_storage_path text DEFAULT '',
  video_muted      boolean NOT NULL DEFAULT true,
  video_loop      boolean NOT NULL DEFAULT true,
  video_autoplay  boolean NOT NULL DEFAULT true,

  -- ── Marquee Text ──────────────────────────────────────────
  marquee_enabled      boolean NOT NULL DEFAULT true,
  marquee_text          text DEFAULT '',
  marquee_lines         jsonb NOT NULL DEFAULT '[]',
  marquee_font_size     text NOT NULL DEFAULT 'clamp(60px, 12vw, 200px)',
  marquee_speed         integer NOT NULL DEFAULT 20,
  marquee_style         jsonb NOT NULL DEFAULT '{"font_family":"Fraunces, serif","font_weight":"bold","font_style":"italic","color":"#ffffff","opacity":30,"position":"center"}',

  -- ── Weather Badge ─────────────────────────────────────────
  weather_enabled  boolean NOT NULL DEFAULT false,
  weather_label    text DEFAULT 'Desa · 28°C · Cerah',

  -- ── Layout ───────────────────────────────────────────────
  overlay_opacity  numeric NOT NULL DEFAULT 60,
  show_kepala_desa boolean NOT NULL DEFAULT true,

  -- ── Metadata ──────────────────────────────────────────────
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX hero_config_active_idx ON public.hero_config(active);
CREATE INDEX hero_config_bg_type_idx ON public.hero_config(bg_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_hero_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hero_config_updated_at ON public.hero_config;
CREATE TRIGGER hero_config_updated_at
  BEFORE UPDATE ON public.hero_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_hero_config_updated_at();

-- ── RLS Policies ───────────────────────────────────────────────────────────────
ALTER TABLE public.hero_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero_config" ON public.hero_config
  FOR SELECT TO public USING (true);

CREATE POLICY "Public write hero_config" ON public.hero_config
  FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT ON public.hero_config TO anon, authenticated;
GRANT INSERT ON public.hero_config TO anon, authenticated;
GRANT UPDATE ON public.hero_config TO anon, authenticated;
GRANT DELETE ON public.hero_config TO anon, authenticated;

-- ── Seed: default hero config ─────────────────────────────────────────────────
INSERT INTO public.hero_config (
  id, active, bg_type, slides, slider_enabled, slider_auto_play, slider_interval,
  marquee_enabled, marquee_text, marquee_lines, marquee_font_size, marquee_speed, marquee_style,
  weather_enabled, weather_label, overlay_opacity, show_kepala_desa,
  video_url, video_storage_path, video_enabled,
  video_muted, video_loop, video_autoplay,
  video_fallback_image, video_fallback_storage_path
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  'image',
  '[{"id":"s1","image_url":"/images/hero-village.jpg","alt":"Pemandangan Desa","title":"","subtitle":"","enabled":true},{"id":"s2","image_url":"/images/wisata-airterjun.jpg","alt":"Wisata Alam","title":"","subtitle":"","enabled":true},{"id":"s3","image_url":"/images/wisata-pantai.jpg","alt":"Pesisir Pantai","title":"","subtitle":"","enabled":true},{"id":"s4","image_url":"/images/wisata-budaya.jpg","alt":"Budaya Lokal","title":"","subtitle":"","enabled":true},{"id":"s5","image_url":"/images/galeri-1.jpg","alt":"Gotong Royong","title":"","subtitle":"","enabled":true}]',
  true, true, 6000,
  true, 'Selamat Datang di Portal Resmi Desa',
  '[{"id":"m1","text":"Selamat Datang di Portal Resmi Desa","enabled":true},{"id":"m2","text":"Pelayanan Publik Transparan dan Akuntabel","enabled":true},{"id":"m3","text":"Mari Membangun Desa Bersama","enabled":true}]',
  'clamp(60px, 12vw, 200px)', 20,
  '{"font_family":"Fraunces, serif","font_weight":"bold","font_style":"italic","color":"#ffffff","opacity":30,"position":"center"}',
  false, 'Desa · 28°C · Cerah', 60, true,
  '', '', false,
  true, true, true,
  '', ''
);

-- ── Verify ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.hero_config;
  IF cnt = 0 THEN
    RAISE WARNING 'hero_config table is empty after seed — check INSERT';
  ELSE
    RAISE NOTICE '[OK] hero_config: % rows seeded', cnt;
  END IF;
END $$;
