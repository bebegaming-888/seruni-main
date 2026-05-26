/**
 * PreviewModal — Preview Blanko Surat + Foto Selfie + Dokumen Pendukung
 *
 * Shows:
 * 1. Blanko Surat (PDF embed / preview)
 * 2. Foto Selfie dengan KTP
 * 3. Dokumen Pendukung (lampiran)
 */

import { X as XIcon } from "lucide-react";
import { type SuratRecord } from "@/lib/esurat-store";
import { getSettings, useSettings } from "@/lib/settings-store";
import { getMediaUrl } from "@/lib/media-upload";

interface PreviewModalProps {
  record: SuratRecord;
  onClose: () => void;
}

export function PreviewModal({ record, onClose }: PreviewModalProps) {
  // FIX: Use Zustand state for reactive updates; fall back to sync getSettings()
  // This ensures we get real settings once initSettingsStore() completes in __root.tsx
  const zustandSettings = useSettings();
  const syncSettings = getSettings();

  // Prefer Zustand (reactive) over sync getSettings() (may be default during HMR)
  const settings = zustandSettings._isLoaded ? zustandSettings : syncSettings;
  const kop = settings.kopSurat;

  // Determine fallback kop lines from settings village data
  const fallbackKopLines = [
    { id: "kab", text: `PEMERINTAH KABUPATEN ${settings.village.regency?.toUpperCase() ?? "..."}` },
    { id: "kec", text: `KECAMATAN ${settings.village.district?.toUpperCase() ?? "..."}` },
    { id: "des", text: `DESA ${settings.village.name?.toUpperCase() ?? "..."}` },
    { id: "almt", text: settings.village.address ?? "Alamat" },
  ];

  // Parse attachments
  const attachments = record.attachments ?? [];
  const fotoSelfie = record.foto_selfie;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="font-display text-xl font-bold">Preview Surat</h2>
            <p className="font-ui text-sm text-muted-foreground mt-0.5">
              {record.kode} #{record.no} — {record.nama_surat}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Blanko Surat Preview */}
          <div>
            <h3 className="font-ui text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Blanko Surat
            </h3>
            <div className="rounded-xl border border-border bg-white overflow-hidden">
              {/* Kop Surat Header */}
              <div className="bg-slate-50 px-8 py-6 border-b border-border">
                <div className="text-center">
                  {/* Line 1: Kabupaten */}
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    {kop.kop_lines.find((l) => l.id === "kab")?.text ??
                      fallbackKopLines.find((l) => l.id === "kab")?.text}
                  </p>
                  {/* Line 2: Kecamatan */}
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    {kop.kop_lines.find((l) => l.id === "kec")?.text ??
                      fallbackKopLines.find((l) => l.id === "kec")?.text}
                  </p>
                  {/* Line 3: Desa */}
                  <p className="font-display text-base font-bold uppercase tracking-wider text-foreground">
                    {kop.kop_lines.find((l) => l.id === "des")?.text ??
                      fallbackKopLines.find((l) => l.id === "des")?.text}
                  </p>
                  {/* Line 4: Alamat */}
                  <p className="font-ui text-xs text-muted-foreground mt-1">
                    {kop.kop_lines.find((l) => l.id === "almt")?.text ??
                      fallbackKopLines.find((l) => l.id === "almt")?.text}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="px-8 py-4 text-center border-b border-border">
                <p className="font-display text-lg font-bold uppercase tracking-wide">
                  {record.nama_surat}
                </p>
              </div>

              {/* Data Pemohon */}
              <div className="px-8 py-4 space-y-2">
                <p className="font-body text-sm">
                  <span className="font-semibold">Nama:</span> {record.pemohon}
                </p>
                <p className="font-body text-sm">
                  <span className="font-semibold">NIK:</span> {record.nik}
                </p>
                <p className="font-body text-sm">
                  <span className="font-semibold">Kontak:</span> {record.kontak}
                </p>
                <p className="font-body text-sm">
                  <span className="font-semibold">Data:</span>
                </p>
                <div className="ml-4 space-y-1">
                  {Object.entries(record.data ?? {}).map(([key, value]) =>
                    value ? (
                      <p key={key} className="font-body text-xs text-muted-foreground">
                        {key}: {value}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>

              {/* Footer */}
              {kop.footer_enabled && (
                <div className="px-8 py-3 bg-slate-50 border-t border-border text-center">
                  <p className="font-ui text-xs text-muted-foreground">{kop.footer_text}</p>
                </div>
              )}
            </div>
          </div>

          {/* Foto Selfie */}
          {fotoSelfie && (
            <div>
              <h3 className="font-ui text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Foto Selfie dengan KTP
              </h3>
              <div className="rounded-xl border border-border overflow-hidden">
                {typeof fotoSelfie === "string" ? (
                  <img
                    src={fotoSelfie}
                    alt="Foto Selfie"
                    className="w-full max-h-64 object-contain bg-slate-100"
                  />
                ) : fotoSelfie.storage_path ? (
                  <img
                    src={getMediaUrl(fotoSelfie.storage_path, "surat-attachments")}
                    alt="Foto Selfie"
                    className="w-full max-h-64 object-contain bg-slate-100"
                  />
                ) : fotoSelfie.data_url ? (
                  <img
                    src={fotoSelfie.data_url}
                    alt="Foto Selfie"
                    className="w-full max-h-64 object-contain bg-slate-100"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground font-ui text-sm">
                    Foto selfie tidak tersedia
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dokumen Pendukung */}
          {attachments.length > 0 && (
            <div>
              <h3 className="font-ui text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Dokumen Pendukung ({attachments.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border overflow-hidden bg-muted/30"
                  >
                    {att.type?.startsWith("image/") ? (
                      <img
                        src={
                          att.data_url ??
                          (att.storage_path
                            ? getMediaUrl(att.storage_path, "surat-attachments")
                            : "")
                        }
                        alt={att.name ?? `Dokumen ${i + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="p-4 flex flex-col items-center justify-center h-32 gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="font-ui text-xs text-center text-muted-foreground truncate w-full">
                          {att.name ?? `Dokumen ${i + 1}`}
                        </p>
                      </div>
                    )}
                    <div className="px-3 py-2 border-t border-border">
                      <p className="font-ui text-xs truncate">{att.name ?? `Dokumen ${i + 1}`}</p>
                      {att.size && (
                        <p className="font-ui text-[10px] text-muted-foreground">
                          {(att.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attachments.length === 0 && !fotoSelfie && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-ui text-sm">Tidak ada dokumen pendukung</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-xl font-ui text-sm font-semibold bg-muted hover:bg-muted/80 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export FileText for use in template
import { FileText } from "lucide-react";
