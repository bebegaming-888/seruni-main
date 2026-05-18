import React, { useEffect, useState } from "react";
import {
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Image,
  FileText,
  Camera,
  ExternalLink,
} from "lucide-react";
import { type SuratRecord, lookupPenduduk } from "@/lib/esurat-store";
import { getTemplate } from "@/lib/template-store";
import { buildRenderedLetter, type RenderedLetter } from "@/lib/letter-engine";
import type { Penduduk } from "@/data/penduduk";
import { LetterPrintWrapper } from "@/components/surat/LetterPrintWrapper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/** Standard alasan penolakan yang bisa diceklis */
const REJECTION_REASONS = [
  "Data identitas tidak sesuai (nama, NIK, alamat, tempat/tanggal lahir)",
  "Dokumen pendukung tidak lengkap, tidak jelas, atau tidak terbaca",
  "Field formulir/DNA tidak terisi dengan benar",
  "Foto selfie tidak sesuai, tidak ditemukan, atau tidak wajah sendiri",
  "Permohonan tidak memenuhi persyaratan jenis surat yang dipilih",
  "NIK tidak ditemukan dalam database penduduk",
];

export type SuratPreviewPanelActions = {
  onVerify?: (r: SuratRecord) => void;
  onReject?: (r: SuratRecord, alasan: string) => void;
  onLanjut?: (r: SuratRecord) => void;
  /** onApprove receives record + signer title */
  onApprove?: (r: SuratRecord, signerTitle: string) => void;
};

interface SuratPreviewPanelProps extends SuratPreviewPanelActions {
  preview: SuratRecord;
}

/** Check if a file is an image based on MIME type */
function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Format file size to human readable */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if a Lampiran is a selfie photo — prioritizes MIME type, uses filename as secondary signal */
function isSelfie(att: SuratRecord["attachments"][number]): boolean {
  const n = att.name.toLowerCase();
  // Primary signal: file is an image AND filename suggests selfie
  const isImageFile = att.type.startsWith("image/");
  if (!isImageFile) return false;
  if (
    n.includes("selfie") ||
    n.includes("foto") ||
    n.includes("photo") ||
    n.includes("wajah") ||
    n.includes("diri") ||
    n.includes("ktp")
  ) {
    return true;
  }
  // Fallback: short image filename (suspiciously short = likely a quick capture)
  // Documents will have longer descriptive names like "surat_pengantar_kades.pdf"
  return att.name.length < 30;
}

/** Lightbox untuk melihat gambar full-size */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/** Collapsible section for attachments */
function AttachmentsSection({ attachments }: { attachments: SuratRecord["attachments"] }) {
  const [open, setOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const selfie = attachments.filter(isSelfie);
  const docs = attachments.filter((a) => !isSelfie(a));

  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Lampiran" onClose={() => setLightboxSrc(null)} />
      )}

      <div className="mt-3 rounded-xl border border-border bg-muted/30 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-ui font-semibold">Lampiran & Dokumen</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
              {attachments.length} file
            </span>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {open && (
          <div className="px-3 pb-3 space-y-3">
            {/* Selfie section */}
            {selfie.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Camera className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-semibold text-success">Foto Selfie</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selfie.map((att, i) => (
                    <button
                      key={i}
                      className="relative rounded-lg overflow-hidden border-2 border-success/30 hover:border-success transition"
                      onClick={() => att.data_url && setLightboxSrc(att.data_url)}
                      title={`${att.name} — klik untuk memperbesar`}
                    >
                      {att.data_url ? (
                        <img src={att.data_url} alt={att.name} className="h-20 w-20 object-cover" />
                      ) : (
                        <div className="h-20 w-20 bg-muted flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[9px] text-white truncate text-center">{att.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Document files */}
            {docs.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-info" />
                  <span className="text-xs font-semibold text-info">Dokumen Pendukung</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {docs.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatSize(att.size)}
                          {isImageMime(att.type) && " · Gambar"}
                        </p>
                      </div>
                      {isImageMime(att.type) && att.data_url ? (
                        <button
                          className="shrink-0 p-1 rounded hover:bg-muted transition"
                          onClick={() => setLightboxSrc(att.data_url!)}
                          title="Lihat gambar"
                        >
                          <Image className="h-4 w-4 text-info" />
                        </button>
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** Modal alasan penolakan dengan checkbox */
export function RejectionModal({
  open,
  record,
  onClose,
  onConfirm,
}: {
  open: boolean;
  record: SuratRecord | null;
  onClose: () => void;
  onConfirm: (alasan: string) => void;
}) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [lainnya, setLainnya] = useState("");

  const toggle = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }));

  const alasanList = [
    ...REJECTION_REASONS.map((r, i) => (checked[i] ? r : null)).filter(Boolean),
    lainnya.trim() || null,
  ].filter(Boolean) as string[];

  const handleConfirm = () => {
    if (alasanList.length === 0) {
      toast.error("Pilih minimal satu alasan penolakan.");
      return;
    }
    onConfirm(alasanList.join("; "));
    // Reset state
    setChecked({});
    setLainnya("");
    onClose();
  };

  const handleClose = () => {
    setChecked({});
    setLainnya("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" /> Tolak Pengajuan
          </DialogTitle>
          <DialogDescription>
            {record && (
              <span>
                {record.nama_surat} — {record.pemohon} ({record.no})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-foreground">Pilih alasan penolakan:</p>
          <div className="space-y-2.5">
            {REJECTION_REASONS.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`reject-reason-${i}`}
                  checked={!!checked[i]}
                  onCheckedChange={() => toggle(i)}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`reject-reason-${i}`}
                  className="text-sm cursor-pointer leading-snug"
                >
                  {reason}
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-1">
            <Label htmlFor="reject-lainnya" className="text-sm font-medium">
              Alasan lain (opsional)
            </Label>
            <Textarea
              id="reject-lainnya"
              value={lainnya}
              onChange={(e) => setLainnya(e.target.value)}
              placeholder="Ketik alasan lain jika tidak ada di atas…"
              rows={2}
              className="mt-1.5"
            />
          </div>

          {alasanList.length > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5">
              <p className="text-xs font-semibold text-destructive mb-1">Ringkasan alasan:</p>
              <ul className="text-xs text-destructive/80 space-y-0.5">
                {alasanList.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={alasanList.length === 0}>
            <X className="h-4 w-4 mr-1" /> Konfirmasi Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuratPreviewPanel({
  preview,
  onVerify,
  onReject,
  onLanjut,
  onApprove,
}: SuratPreviewPanelProps) {
  const [letter, setLetter] = useState<RenderedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [signerModalOpen, setSignerModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<SuratRecord | null>(null);

  const hasActions = !!(onVerify || onReject || onLanjut || onApprove);

  useEffect(() => {
    let active = true;

    async function loadLetter() {
      setIsLoading(true);
      setError("");
      setLetter(null);

      try {
        const warga = await lookupPenduduk(preview.nik);
        if (!warga) {
          throw new Error("Data penduduk tidak ditemukan.");
        }

        const template = getTemplate(preview.kode);
        if (!template) {
          throw new Error(`Template surat ${preview.kode} tidak ditemukan.`);
        }

        const rendered = buildRenderedLetter({
          template: template,
          warga: warga as Penduduk,
          requestData: preview.data,
          nomorSurat: preview.no,
          tanggalSurat: preview.signed_at || new Date().toISOString(),
          qrPayload:
            preview.qr_payload ||
            `SURAT|${preview.no}|${preview.nik}|${preview.kode}|${preview.signed_at ?? ""}`,
        });

        if (active) setLetter(rendered);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadLetter();
    return () => {
      active = false;
    };
  }, [preview]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-ui">Membuat preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!letter) {
    return null;
  }

  const handleReject = (alasan: string) => {
    if (onReject) {
      onReject(preview, alasan);
    } else {
      toast.error("Handler penolakan belum dikonfigurasi.");
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Blanko Surat PDF Preview ── */}
      <div className="w-full overflow-auto bg-[#f0f0f0] rounded-lg border border-border flex justify-center p-3 max-h-[480px]">
        <div
          className="origin-top bg-white shadow-xl"
          style={{ transform: "scale(0.68)", transformOrigin: "top center", marginBottom: "-32%" }}
        >
          <LetterPrintWrapper
            letter={letter}
            namaPemohon={preview.pemohon}
            nomorSurat={preview.no}
          />
        </div>
      </div>

      {/* ── Dokumen Pendukung & Foto Selfie ── */}
      <AttachmentsSection attachments={preview.attachments} />

      {/* ── Catatan Admin (jika ada) ── */}
      {preview.catatan && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <p className="text-xs font-semibold text-warning mb-0.5">Catatan:</p>
          <p className="text-xs text-foreground/80">{preview.catatan}</p>
        </div>
      )}

      {/* ── Action Buttons ── */}
      {hasActions && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onVerify && preview.status === "Menunggu Verifikasi" && (
            <Button
              size="sm"
              className="bg-info hover:bg-info/90 text-background flex-1"
              onClick={() => onVerify(preview)}
            >
              <Check className="h-4 w-4 mr-1" /> Verifikasi
            </Button>
          )}
          {onLanjut && preview.status === "Diverifikasi" && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-hover text-primary-foreground flex-1"
              onClick={() => onLanjut(preview)}
            >
              <ChevronUp className="h-4 w-4 mr-1" /> Lanjut Approval
            </Button>
          )}
          {onApprove && preview.status === "Menunggu Approval" && (
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 text-background flex-1"
              onClick={() => {
                setPendingRecord(preview);
                setSignerModalOpen(true);
              }}
            >
              <FileText className="h-4 w-4 mr-1" /> Approve & TTD
            </Button>
          )}
          {onReject && preview.status !== "Disetujui" && preview.status !== "Ditolak" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1"
              onClick={() => setRejectModalOpen(true)}
            >
              <X className="h-4 w-4 mr-1" /> Tolak
            </Button>
          )}
        </div>
      )}

      {/* ── Rejection Modal ── */}
      <RejectionModal
        open={rejectModalOpen}
        record={preview}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      {/* ── Signer Selection Modal ── */}
      {pendingRecord && (
        <Dialog open={signerModalOpen} onOpenChange={(v) => { if (!v) { setSignerModalOpen(false); setPendingRecord(null); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-success" /> Pilih Penandatangan
              </DialogTitle>
              <DialogDescription>
                {pendingRecord.nama_surat} — {pendingRecord.pemohon}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm font-medium text-foreground">
                Siapa yang menandatangani surat ini?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { onApprove?.(pendingRecord, "Kepala Desa"); setSignerModalOpen(false); setPendingRecord(null); }}
                  className="w-full text-left rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 p-4 transition"
                >
                  <p className="font-semibold text-foreground">H. Sumardi, S.Sos.</p>
                  <p className="text-sm text-muted-foreground">Kepala Desa Seruni Mumbul</p>
                </button>
                <button
                  onClick={() => { onApprove?.(pendingRecord, "Sekretaris Desa"); setSignerModalOpen(false); setPendingRecord(null); }}
                  className="w-full text-left rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 p-4 transition"
                >
                  <p className="font-semibold text-foreground">Sekretaris Desa</p>
                  <p className="text-sm text-muted-foreground">Sekretaris Desa Seruni Mumbul</p>
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSignerModalOpen(false); setPendingRecord(null); }}>
                Batal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
