/**
 * VerifikasiModal — Terima atau Tolak Verifikasi
 *
 * Actions:
 * - Terima: Status → "Diverifikasi" → Kirim WA notifikasi
 * - Tolak: Input catatan → Status → "Ditolak" → Kirim WA dengan alasan
 */

import { useState } from "react";
import { X as XIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { type SuratRecord, saveRecord } from "@/lib/esurat-store";
import { notifySurat } from "@/lib/esurat-notif";
import { syncSaveRecord, syncSetStatus } from "@/lib/useSupabaseSync";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface VerifikasiModalProps {
  record: SuratRecord;
  onClose: () => void;
}

export function VerifikasiModal({ record, onClose }: VerifikasiModalProps) {
  const [mode, setMode] = useState<"choose" | "reject">("choose");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);

  const session = getSession();

  const handleTerima = async () => {
    if (!session) {
      toast.error("Session tidak valid");
      return;
    }

    setLoading(true);
    try {
      // Update status
      const timestamp = new Date().toISOString();
      const actor = session.username ?? session.userId ?? "System";
      const history = record.status_history ? [...record.status_history] : [];
      history.push({ status: "Diverifikasi", timestamp, actor });

      const updated: SuratRecord = {
        ...record,
        status: "Diverifikasi",
        verified_at: timestamp,
        verified_by: actor,
        status_history: history,
        updated_at: timestamp,
      };

      saveRecord(updated);
      await syncSaveRecord(updated, session.username ?? session.userId);

      // Send WA notification
      await notifySurat(updated, "verify");

      toast.success("Surat berhasil diverifikasi");
      onClose();
    } catch (err) {
      console.error("[VerifikasiModal] Error:", err);
      toast.error("Gagal memverifikasi surat");
    } finally {
      setLoading(false);
    }
  };

  const handleTolak = async () => {
    if (!catatan.trim()) {
      toast.error("Catatan penolakan wajib diisi");
      return;
    }

    if (!session) {
      toast.error("Session tidak valid");
      return;
    }

    setLoading(true);
    try {
      // Update status
      const timestamp = new Date().toISOString();
      const actor = session.username ?? session.userId ?? "System";
      const history = record.status_history ? [...record.status_history] : [];
      history.push({ status: "Ditolak", timestamp, actor, catatan: catatan.trim() });

      const updated: SuratRecord = {
        ...record,
        status: "Ditolak",
        catatan: catatan.trim(),
        verified_at: timestamp,
        verified_by: actor,
        status_history: history,
        updated_at: timestamp,
      };

      saveRecord(updated);
      await syncSaveRecord(updated, session.username ?? session.userId);

      // Send WA notification with rejection reason
      await notifySurat(updated, "reject", catatan.trim());

      toast.success("Surat ditolak");
      onClose();
    } catch (err) {
      console.error("[VerifikasiModal] Error:", err);
      toast.error("Gagal menolak surat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="font-display text-xl font-bold">Verifikasi Surat</h2>
            <p className="font-ui text-sm text-muted-foreground mt-0.5">
              {record.kode} #{record.no}
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
        <div className="p-6">
          {mode === "choose" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="font-body text-sm">
                  <span className="font-semibold">Pemohon:</span> {record.pemohon}
                </p>
                <p className="font-body text-sm mt-1">
                  <span className="font-semibold">NIK:</span> {record.nik}
                </p>
                <p className="font-body text-sm mt-1">
                  <span className="font-semibold">Jenis Surat:</span> {record.nama_surat}
                </p>
              </div>

              <p className="font-body text-sm text-muted-foreground">
                Apakah data pengajuan sudah sesuai dan lengkap?
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={handleTerima}
                  disabled={loading}
                  className="flex-1 h-12 bg-success hover:bg-success/90"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Terima
                </Button>
                <Button
                  onClick={() => setMode("reject")}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1 h-12"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Tolak
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="font-ui text-sm font-semibold mb-2 block">
                  Alasan Penolakan <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Jelaskan alasan penolakan (akan dikirim ke pemohon via WA)..."
                  rows={5}
                  className="resize-none"
                />
                <p className="font-ui text-xs text-muted-foreground mt-1">
                  Pesan ini akan dikirim ke pemohon melalui WhatsApp.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setMode("choose")}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleTolak}
                  disabled={loading || !catatan.trim()}
                  variant="destructive"
                  className="flex-1 h-12"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Tolak Surat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
