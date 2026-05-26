import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/media-upload"; // M-3 fix: static import (was dynamic in handleFile)

// ── Reusable UI Components for Settings Panel ──

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {desc && <p className="font-body text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  compact,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
    >
      <div>
        <p className="font-ui text-sm font-semibold">{label}</p>
        {desc && <p className="font-body text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── Video Upload Field ──

export function VideoUploadField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Hanya file video yang diizinkan");
      return;
    }
    // Check max size 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Ukuran video maksimal 50MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setVideoError(false);
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Masukkan URL video terlebih dahulu");
      return;
    }
    setVideoError(false);
    onChange(trimmed);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const handleUrlBlur = () => {
    if (urlInput.trim()) handleUrlSubmit();
  };

  const isDataUrl = value.startsWith("data:");
  const videoSrc = videoError ? "" : value;

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <svg
            className="h-4 w-4 mr-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Perangkat
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.webm,.mov,.avi"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          variant={showUrlInput ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowUrlInput((v) => !v);
            if (!showUrlInput && value && value.startsWith("http")) {
              setUrlInput(value);
            }
          }}
        >
          <svg
            className="h-4 w-4 mr-1.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          URL
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setVideoError(false);
              setUrlInput("");
            }}
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        )}
      </div>

      {/* URL input panel */}
      {showUrlInput && (
        <div className="flex gap-2 items-center">
          <Input
            placeholder="https://example.com/video.mp4"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            onBlur={handleUrlBlur}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            OK
          </Button>
        </div>
      )}

      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}

      {/* Error state */}
      {videoError && value && (
        <p className="font-body text-[11px] text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gagal memuat video. Coba upload ulang.
        </p>
      )}

      {/* Preview */}
      {videoSrc && !videoError && (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-md">
          <video
            src={videoSrc}
            controls
            className="w-full h-48 object-cover"
            onError={() => setVideoError(true)}
          />
          <span className="absolute top-1 right-1 bg-success/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {isDataUrl ? "Lokal" : "URL"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Image Upload Field ──

export function ImageUploadField({
  label,
  hint,
  value,
  storagePath,
  onChange,
  onStoragePathChange,
}: {
  label: string;
  hint?: string;
  value: string;
  storagePath?: string;
  onChange: (v: string) => void;
  onStoragePathChange?: (path: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan");
      return;
    }
    setUploading(true);
    setImgError(false);
    try {
      const folder = label.toLowerCase().includes("logo")
        ? "logos"
        : label.toLowerCase().includes("slide")
          ? "hero"
          : label.toLowerCase().includes("cover")
            ? "covers"
            : "media";
      const result = await uploadMedia(file, folder, "public-media");
      if (result.ok) {
        onChange(result.publicUrl);
        if (onStoragePathChange && result.storagePath) {
          onStoragePathChange(result.storagePath);
        }
        toast.success("Gambar berhasil diupload");
      } else {
        toast.error(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const isDataUrl = value.startsWith("data:");

  return (
    <div className="space-y-2">
      <Label className="font-ui text-xs font-semibold">{label}</Label>
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl"
        >
          {uploading ? (
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
          )}
          {uploading ? "Mengupload…" : "Ambil dari Perangkat"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setImgError(false);
            }}
            className="rounded-xl"
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        )}
      </div>

      {hint && <p className="font-body text-[11px] text-muted-foreground">{hint}</p>}

      {/* Error state */}
      {imgError && value && (
        <p className="font-body text-[11px] text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gagal memuat gambar. Coba upload ulang.
        </p>
      )}

      {/* Preview */}
      {value && !imgError && (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
          <img
            src={value}
            alt={label}
            className="h-36 w-full object-cover"
            onError={() => setImgError(true)}
          />
          <span className="absolute top-1 right-1 bg-success/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {isDataUrl ? "Lokal" : "Storage"}
          </span>
        </div>
      )}
    </div>
  );
}
