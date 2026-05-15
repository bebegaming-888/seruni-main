/**
 * HeroSettings — Admin panel for Hero Landing Page configuration.
 *
 * LANDING PAGE = VIDEO BACKGROUND + MARQUEE (tidak ada image slider).
 *
 * Tab terpisah:
 *   1. Video Background    — upload video, poster, autoplay/muted/loop
 *   2. Teks Marquee       — isi teks, kecepatan, posisi, karakter
 *   3. Tampilan & overlay — overlay, siluet kepala desa, weather badge
 *
 * Data disimpan via hero-config-store → IndexedDB + Supabase.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useHeroConfig,
  saveHeroConfig,
  resetHeroConfig,
  DEFAULT_HERO_CONFIG,
  type HeroConfig,
  type MarqueeLine,
} from "@/lib/hero-config-store";
import { uploadMedia, uploadVideo } from "@/lib/media-upload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Type,
  Eye,
  CloudSun,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Upload,
  Check,
  X,
  SlidersHorizontal,
  User,
  LayoutGrid,
} from "lucide-react";

// ── Preset Options ────────────────────────────────────────────────────────────

const MARQUEE_SIZE_OPTIONS = [
  { label: "Kecil", value: "clamp(36px, 7vw, 96px)" },
  { label: "Sedang", value: "clamp(48px, 11vw, 180px)" },
  { label: "Besar", value: "clamp(60px, 13vw, 220px)" },
  { label: "Sangat Besar", value: "clamp(80px, 16vw, 280px)" },
  { label: "Ultra", value: "clamp(100px, 20vw, 360px)" },
];

const MARQUEE_SPEED_OPTIONS = [
  { label: "Lambat", value: 40 },
  { label: "Normal", value: 25 },
  { label: "Cepat", value: 15 },
  { label: "Sangat Cepat", value: 8 },
];

const MARQUEE_FONT_OPTIONS = [
  { label: "Fraunces", value: "Fraunces, serif" },
  { label: "Playfair Display", value: "Playfair Display, serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial Black", value: "Arial Black, sans-serif" },
];

const MARQUEE_COLOR_OPTIONS = [
  { label: "Putih", value: "#ffffff" },
  { label: "Putih Muda", value: "#f5f5f5" },
  { label: "Emas", value: "#f5c842" },
  { label: "Hijau Mudi", value: "#86efac" },
  { label: "Biru Langit", value: "#93c5fd" },
  { label: "Abu-abu", value: "#d1d5db" },
  { label: "Hitam", value: "#111111" },
  { label: "Transparan", value: "rgba(255,255,255,0.3)" },
];

const MARQUEE_OPACITY_OPTIONS = [
  { label: "10%", value: 10 },
  { label: "20%", value: 20 },
  { label: "30%", value: 30 },
  { label: "50%", value: 50 },
  { label: "70%", value: 70 },
  { label: "100%", value: 100 },
];

const OVERLAY_OPACITY_OPTIONS = [
  { label: "Sangat Tipis (15%)", value: 15 },
  { label: "Tipis (30%)", value: 30 },
  { label: "Sedang (50%)", value: 50 },
  { label: "Gelap (70%)", value: 70 },
  { label: "Sangat Gelap (85%)", value: 85 },
];

// ── Color Swatch Picker ────────────────────────────────────────────────────────

function ColorSwatchPicker({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={cn(
            "h-9 w-9 rounded-full border-2 transition-all",
            value === opt.value
              ? "border-primary scale-110 ring-2 ring-primary/30"
              : "border-border hover:scale-105",
          )}
          style={{
            backgroundColor: opt.value.includes("rgba") ? undefined : opt.value,
            background: opt.value.includes("rgba")
              ? opt.value.replace("rgba(", "rgba(").replace(", 0.3)", ",1)")
              : opt.value,
          }}
        />
      ))}
    </div>
  );
}

// ── Video Upload Field ────────────────────────────────────────────────────────

function VideoUploadField({
  value,
  storagePath,
  onChange,
}: {
  value: string;
  storagePath?: string;
  onChange: (url: string, storagePath?: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentPath, setCurrentPath] = useState(storagePath);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPath(storagePath);
  }, [storagePath]);

  const displaySrc = value
    ? currentPath
      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/public-media/${currentPath}`
      : value
    : "";

  return (
    <div className="space-y-3">
      {displaySrc && (
        <div className="relative h-40 rounded-xl overflow-hidden bg-black/5 border border-border">
          <video
            src={displaySrc}
            controls
            className="h-full w-full object-cover rounded-xl"
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoError(false)}
          />
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <p className="font-ui text-xs text-destructive">Video tidak bisa diputar</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          setVideoError(false);
          try {
            const result = await uploadVideo(file, "hero-video", "public-media");
            if (result.ok) {
              setCurrentPath(result.storagePath);
              onChange(result.publicUrl, result.storagePath);
            } else {
              toast.error(result.error);
            }
          } catch {
            toast.error("Gagal upload video");
          } finally {
            setUploading(false);
            e.target.value = "";
          }
        }}
      />

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        {uploading ? "Mengupload..." : value ? "Ganti Video" : "Ambil Video dari Perangkat"}
      </Button>

      <p className="font-body text-[10px] text-muted-foreground">
        Format: mp4, webm, mov, ogg. Maksimal 100 MB.
      </p>
    </div>
  );
}

// ── Poster Image Upload ───────────────────────────────────────────────────────

function PosterUploadField({
  value,
  storagePath,
  onChange,
}: {
  value: string;
  storagePath?: string;
  onChange: (url: string, storagePath?: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative h-28 rounded-xl overflow-hidden bg-black/5 border border-border">
          <img src={value} alt="Poster" className="h-full w-full object-cover" />
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        id="hero-poster-upload"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const result = await uploadMedia(file, "hero-video", "public-media");
            if (result.ok) {
              onChange(result.publicUrl, result.storagePath);
            } else {
              toast.error(result.error);
            }
          } catch {
            toast.error("Gagal upload poster");
          } finally {
            setUploading(false);
            e.target.value = "";
          }
        }}
      />

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={() => document.getElementById("hero-poster-upload")?.click()}
        disabled={uploading}
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Mengupload..." : value ? "Ganti Poster" : "Ambil Poster"}
      </Button>

      <p className="font-body text-[10px] text-muted-foreground">
        Gambar yang ditampilkan saat video masih loading.
      </p>
    </div>
  );
}

// ── Toggle Row Helper ─────────────────────────────────────────────────────────

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-ui text-sm font-semibold">{label}</p>
        {desc && <p className="font-body text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1: VIDEO BACKGROUND
// ════════════════════════════════════════════════════════════════════════════════

function TabVideoBackground({
  config,
  update,
}: {
  config: HeroConfig;
  update: <K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Video Toggle */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
          <Video className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm font-bold">Video Background</h4>
        </div>
        <div className="p-4 space-y-4">
          <ToggleRow
            label="Aktifkan Video Background"
            desc="Video autoplay di belakang marquee. Nonaktifkan untuk gradient."
            checked={config.video_enabled}
            onChange={(v) => update("video_enabled", v)}
          />
        </div>
      </div>

      {/* Video Upload */}
      {config.video_enabled && (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <Upload className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold">File Video</h4>
            </div>
            <div className="p-4">
              <VideoUploadField
                value={config.video_url}
                storagePath={config.video_storage_path}
                onChange={(url, sp) => {
                  update("video_url", url);
                  update("video_storage_path", sp);
                }}
              />
            </div>
          </div>

          {/* Video Controls */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold">Pengaturan Video</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <ToggleRow
                  label="Autoplay"
                  checked={config.video_autoplay !== false}
                  onChange={(v) => update("video_autoplay", v)}
                />
                <ToggleRow
                  label="Tanpa Suara"
                  checked={config.video_muted !== false}
                  onChange={(v) => update("video_muted", v)}
                />
                <ToggleRow
                  label="Loop (Ulang)"
                  checked={config.video_loop !== false}
                  onChange={(v) => update("video_loop", v)}
                />
              </div>

              {/* Poster */}
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Gambar Poster</Label>
                <PosterUploadField
                  value={config.video_fallback_image}
                  storagePath={config.video_fallback_storage_path}
                  onChange={(url, sp) => {
                    update("video_fallback_image", url);
                    update("video_fallback_storage_path", sp);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2: TEKS MARQUEE
// ════════════════════════════════════════════════════════════════════════════════

function TabMarquee({
  config,
  update,
}: {
  config: HeroConfig;
  update: <K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => void;
}) {
  const addLine = (line: MarqueeLine) => {
    update("marquee_lines", [...config.marquee_lines, line]);
  };

  const updateLine = (id: string, patch: Partial<MarqueeLine>) => {
    update(
      "marquee_lines",
      config.marquee_lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (id: string) => {
    update(
      "marquee_lines",
      config.marquee_lines.filter((l) => l.id !== id),
    );
  };

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="rounded-xl border border-border bg-card p-4">
        <ToggleRow
          label="Aktifkan Teks Marquee"
          desc="Teks berjalan besar di atas video background"
          checked={config.marquee_enabled}
          onChange={(v) => update("marquee_enabled", v)}
        />
      </div>

      {!config.marquee_enabled && (
        <p className="font-body text-sm text-muted-foreground text-center py-4">
          Aktifkan untuk mengatur teks berjalan.
        </p>
      )}

      {config.marquee_enabled && (
        <>
          {/* ── Isi Teks Marquee ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <Type className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold">Isi Teks</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-ui text-xs font-semibold">Baris Teks</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => addLine({ id: `ml-${Date.now()}`, text: "", enabled: true })}
                >
                  <Plus className="h-3 w-3" /> Tambah Baris
                </Button>
              </div>

              {config.marquee_lines.length === 0 && (
                <p className="font-body text-xs text-muted-foreground">
                  Klik &quot;Tambah Baris&quot; untuk menambahkan teks marquee.
                </p>
              )}

              <div className="space-y-2">
                {config.marquee_lines.map((line) => (
                  <div key={line.id} className="flex items-start gap-2">
                    <Input
                      value={line.text}
                      onChange={(e) => updateLine(line.id, { text: e.target.value })}
                      placeholder="Ketik teks marquee..."
                      className="flex-1"
                    />
                    <button
                      onClick={() => updateLine(line.id, { enabled: !line.enabled })}
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center transition-colors",
                        line.enabled
                          ? "bg-green-50 border-green-300 text-green-600"
                          : "bg-muted border-transparent text-muted-foreground",
                      )}
                    >
                      {line.enabled ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="h-9 w-9 shrink-0 rounded-lg border border-destructive/30 text-destructive flex items-center justify-center hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="font-body text-[10px] text-muted-foreground">
                Beberapa baris digabungkan dengan separator &quot;·&quot;.
              </p>
            </div>
          </div>

          {/* ── Gerak & Posisi ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold">Gerak & Posisi</h4>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Kecepatan</Label>
                <Select
                  value={String(config.marquee_speed)}
                  onValueChange={(v) => update("marquee_speed", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARQUEE_SPEED_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Posisi Vertikal</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() =>
                        update("marquee_style", {
                          ...config.marquee_style,
                          position: pos,
                        })
                      }
                      className={cn(
                        "rounded-lg border-2 py-2 font-ui text-sm font-semibold capitalize transition-all",
                        config.marquee_style.position === pos
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {pos === "top" ? "Atas" : pos === "center" ? "Tengah" : "Bawah"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Karakter Teks ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
              <Type className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm font-bold">Karakter Teks</h4>
            </div>
            <div className="p-4 space-y-4">
              {/* Font */}
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Jenis Font</Label>
                <Select
                  value={config.marquee_style.font_family}
                  onValueChange={(v) =>
                    update("marquee_style", { ...config.marquee_style, font_family: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARQUEE_FONT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size */}
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Ukuran</Label>
                <Select
                  value={config.marquee_font_size}
                  onValueChange={(v) => update("marquee_font_size", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARQUEE_SIZE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Weight + Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-ui text-xs font-semibold mb-2 block">Ketebalan</Label>
                  <Select
                    value={config.marquee_style.font_weight}
                    onValueChange={(v: "normal" | "bold") =>
                      update("marquee_style", { ...config.marquee_style, font_weight: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-ui text-xs font-semibold mb-2 block">Style</Label>
                  <Select
                    value={config.marquee_style.font_style}
                    onValueChange={(v: "normal" | "italic") =>
                      update("marquee_style", { ...config.marquee_style, font_style: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="italic">Italic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Color */}
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Warna</Label>
                <ColorSwatchPicker
                  options={MARQUEE_COLOR_OPTIONS}
                  value={config.marquee_style.color}
                  onChange={(v) => update("marquee_style", { ...config.marquee_style, color: v })}
                />
              </div>

              {/* Opacity */}
              <div>
                <Label className="font-ui text-xs font-semibold mb-2 block">Transparansi</Label>
                <Select
                  value={String(config.marquee_style.opacity)}
                  onValueChange={(v) =>
                    update("marquee_style", {
                      ...config.marquee_style,
                      opacity: Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARQUEE_OPACITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3: TAMPILAN & OVERLAY
// ════════════════════════════════════════════════════════════════════════════════

function TabTampilan({
  config,
  update,
}: {
  config: HeroConfig;
  update: <K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Overlay Transparansi */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
          <Eye className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm font-bold">Transparansi Overlay</h4>
        </div>
        <div className="p-4">
          <p className="font-body text-xs text-muted-foreground mb-3">
            Lapisan gelap di atas video untuk readability teks marquee.
          </p>
          <Select
            value={String(config.overlay_opacity)}
            onValueChange={(v) => update("overlay_opacity", Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OVERLAY_OPACITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kepala Desa */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
          <User className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm font-bold">Siluet Kepala Desa</h4>
        </div>
        <div className="p-4">
          <ToggleRow
            label="Tampilkan Siluet"
            desc="Gambar transparan di bagian bawah layar"
            checked={config.show_kepala_desa}
            onChange={(v) => update("show_kepala_desa", v)}
          />
        </div>
      </div>

      {/* Weather Badge */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
          <CloudSun className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm font-bold">Weather Badge</h4>
        </div>
        <div className="p-4 space-y-4">
          <ToggleRow
            label="Aktifkan Weather Badge"
            desc="Badge info di pojok kanan atas"
            checked={config.weather_enabled}
            onChange={(v) => update("weather_enabled", v)}
          />
          {config.weather_enabled && (
            <div>
              <Label className="font-ui text-xs font-semibold mb-2 block">Label Teks</Label>
              <Input
                value={config.weather_label}
                onChange={(e) => update("weather_label", e.target.value)}
                placeholder="Desa Mumbul · 28°C · Cerah"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

type HeroTab = "video" | "marquee" | "tampilan";

export function HeroSettings() {
  const storeConfig = useHeroConfig((s) => s.config);
  const storeLoaded = useHeroConfig((s) => s._isLoaded);

  const [config, setConfig] = useState<HeroConfig>(storeConfig);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<HeroTab>("video");

  // Sync local state on first store load
  const loadedRef = useRef(false);
  useEffect(() => {
    if (storeLoaded && !loadedRef.current) {
      setConfig(storeConfig);
      loadedRef.current = true;
      setDirty(false);
    }
  }, [storeLoaded, storeConfig]);

  // Belt & suspenders: keep local state in sync when store updates from another source
  // (e.g. cross-tab save, Supabase sync, or other tab updates)
  // Only sync if user is NOT currently editing (not dirty)
  useEffect(() => {
    if (loadedRef.current && !dirty && storeLoaded) {
      // Check if store has newer data than our local copy
      const storeUpdated = new Date(storeConfig.updated_at).getTime();
      const localUpdated = new Date(config.updated_at).getTime();
      if (storeUpdated > localUpdated) {
        setConfig(storeConfig);
      }
    }
  }, [storeConfig, storeLoaded, dirty, config.updated_at]);

  const update = useCallback(<K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveHeroConfig(config);
      toast.success("Pengaturan hero disimpan");
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan hero");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Reset pengaturan hero ke default?")) return;
    resetHeroConfig();
    setConfig({ ...DEFAULT_HERO_CONFIG });
    loadedRef.current = false;
    setDirty(false);
    toast.success("Pengaturan hero direset ke default");
  };

  const TABS: Array<{ key: HeroTab; label: string; icon: React.ElementType }> = [
    { key: "video", label: "Video Background", icon: Video },
    { key: "marquee", label: "Teks Marquee", icon: Type },
    { key: "tampilan", label: "Tampilan & Overlay", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" /> Hero Landing Page
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Konfigurasi video background + marquee teks berjalan.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm font-semibold whitespace-nowrap transition-all",
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "video" && <TabVideoBackground config={config} update={update} />}
      {activeTab === "marquee" && <TabMarquee config={config} update={update} />}
      {activeTab === "tampilan" && <TabTampilan config={config} update={update} />}

      {/* Save / Reset */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Pengaturan Hero"}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset ke Default
        </Button>
        {!dirty && (
          <p className="font-body text-xs text-muted-foreground self-center ml-2">
            Tidak ada perubahan
          </p>
        )}
      </div>
    </div>
  );
}
