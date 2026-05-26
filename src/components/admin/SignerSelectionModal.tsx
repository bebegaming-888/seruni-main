/**
 * SignerSelectionModal — Dynamic Signer Selection
 *
 * Fetches signers from letter_signers table and displays them for selection.
 * Replaces hardcoded 2-signer list in SuratPreviewPanel.
 */

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SuratRecord } from "@/lib/esurat-store";

interface Signer {
  id: string;
  role: string;
  title: string;
  name: string;
  nip?: string;
}

interface SignerSelectionModalProps {
  open: boolean;
  record: SuratRecord | null;
  onClose: () => void;
  onSelect: (record: SuratRecord, signerTitle: string) => void;
}

export function SignerSelectionModal({
  open,
  record,
  onClose,
  onSelect,
}: SignerSelectionModalProps) {
  const [signers, setSigners] = useState<Signer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/list-signers")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.signers) {
            setSigners(data.signers);
          } else {
            // Fallback to hardcoded signers
            setSigners([
              {
                id: "1",
                role: "kepala_desa",
                title: "Kepala Desa Seruni Mumbul",
                name: "H. Sumardi, S.Sos.",
              },
              {
                id: "2",
                role: "sekretaris_desa",
                title: "Sekretaris Desa Seruni Mumbul",
                name: "Sekretaris Desa",
              },
            ]);
          }
        })
        .catch(() => {
          // Fallback on error
          setSigners([
            {
              id: "1",
              role: "kepala_desa",
              title: "Kepala Desa Seruni Mumbul",
              name: "H. Sumardi, S.Sos.",
            },
            {
              id: "2",
              role: "sekretaris_desa",
              title: "Sekretaris Desa Seruni Mumbul",
              name: "Sekretaris Desa",
            },
          ]);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-success" /> Pilih Penandatangan
          </DialogTitle>
          <DialogDescription>
            {record.nama_surat} — {record.pemohon}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-foreground">
            Siapa yang menandatangani surat ini?
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : signers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Tidak ada penandatangan tersedia.
            </div>
          ) : (
            <div className="space-y-2">
              {signers.map((signer) => (
                <button
                  key={signer.id}
                  onClick={() => {
                    onSelect(record, signer.title);
                    onClose();
                  }}
                  className="w-full text-left rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 p-4 transition"
                >
                  <p className="font-semibold text-foreground">{signer.name}</p>
                  <p className="text-sm text-muted-foreground">{signer.title}</p>
                  {signer.nip && (
                    <p className="text-xs text-muted-foreground mt-1">NIP: {signer.nip}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
