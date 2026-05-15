import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { type SuratRecord, lookupPenduduk } from "@/lib/esurat-store";
import { getTemplate } from "@/lib/template-store";
import { getSettings } from "@/lib/settings-store";
import { buildRenderedLetter, type RenderedLetter } from "@/lib/letter-engine";
import type { Penduduk } from "@/data/penduduk";
import { LetterPrintWrapper } from "@/components/surat/LetterPrintWrapper";

export function SuratPreviewPanel({ preview }: { preview: SuratRecord }) {
  const [letter, setLetter] = useState<RenderedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

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

        const settings = getSettings();

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

        if (active) {
          setLetter(rendered);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
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

  return (
    <div className="w-full overflow-auto bg-[#f0f0f0] rounded-lg border border-border flex justify-center p-4 max-h-[600px]">
      <div
        className="origin-top bg-white shadow-xl"
        style={{ transform: "scale(0.7)", transformOrigin: "top center", marginBottom: "-30%" }}
      >
        <LetterPrintWrapper letter={letter} namaPemohon={preview.pemohon} nomorSurat={preview.no} />
      </div>
    </div>
  );
}
