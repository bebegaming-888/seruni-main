/**
 * ApproveModal — Approve atau Tolak Surat
 *
 * Actions:
 * - Terima:
 *   1. Input nomor surat (auto-generate atau manual)
 *   2. Generate QR Code (server-side HMAC)
 *   3. Status → "Disetujui"
 *   4. Generate PDF
 *   5. Kirim WA + PDF link
 * - Tolak: Input catatan → Status → "Ditolak" → Kirim WA
 */

import { useState } from "react";
import { X as XIcon, CheckCircle2, XCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { type SuratRecord, saveRecord } from "@/lib/esurat-store";
import { notifySurat } from "@/lib/esurat-notif";
import { syncSaveRecord } from "@/lib/useSupabaseSync";
import { getSession, getSessionToken } from "@/lib/auth";
import { getKodeKlasifikasi } from "@/lib/nomor-surat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ApproveModalProps {
  record: SuratRecord;
  onClose: () => void;
}

export function ApproveModal({ record, onClose }: ApproveModalProps) {
  const [mode, setMode] = useState<"choose" | "approve" | "reject">("choose");
  const [nomorSurat, setNomorSurat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingNomor, setGeneratingNomor] = useState(false);

  const session = getSession();

  const handleGenerateNomor = async () => {
    setGeneratingNomor(true);
    try {
      // FIX: Add klasifikasi parameter (required by server) and use correct response field (nomor, not nomor_surat)
      const klasifikasi = getKodeKlasifikasi(record.kode);
      const sessionToken = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      const res = await fetch("/api/generate-nomor-surat", {
        method: "POST",
        headers,
        body: JSON.stringify({ kode: record.kode, klasifikasi }),
      });

      if (!res.ok) {
        throw new Error("Gagal generate nomor surat");
      }

      const data = await res.json();
      // FIX: API returns { ok, nomor } — not { ok, nomor_surat }
      if (data.ok && data.nomor) {
        setNomorSurat(data.nomor);
        toast.success("Nomor surat berhasil di-generate");
      } else {
        throw new Error(data.error ?? "Gagal generate nomor surat");
      }
    } catch (err) {
      console.error("[ApproveModal] Generate nomor error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal generate nomor surat");
    } finally {
      setGeneratingNomor(false);
    }
  };

  const handleApprove = async () => {
    if (!nomorSurat.trim()) {
      toast.error("Nomor surat wajib diisi");
      return;
    }

    if (!session) {
      toast.error("Session tidak valid");
      return;
    }

    setLoading(true);
    try {
      // 1. Generate QR payload (server-side HMAC)
      const sessionToken = getSessionToken();
      const qrRes = await fetch("/api/sign-surat-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          no: record.no,
          nik: record.nik,
          kode: record.kode,
          signer: session.username ?? "Kepala Desa",
        }),
      });

      if (!qrRes.ok) {
        throw new Error("Gagal generate QR payload");
      }

      const qrData = await qrRes.json();
      const qrPayload = qrData.raw; // full QR payload = data|signature

      // 2. Update record
      const timestamp = new Date().toISOString();
      const actor = session.username ?? session.userId ?? "System";
      const history = record.status_history ? [...record.status_history] : [];
      history.push({ status: "Disetujui", timestamp, actor });

      const updated: SuratRecord = {
        ...record,
        no: nomorSurat.trim(), // Update dengan nomor surat resmi
        status: "Disetujui",
        approved_at: timestamp,
        approved_by: actor,
        signed_at: timestamp,
        signed_by: session.username ?? "Kepala Desa",
        signer_title: "Kepala Desa",
        qr_payload: qrPayload,
        status_history: history,
        updated_at: timestamp,
      };

      saveRecord(updated);
      await syncSaveRecord(updated, session.username ?? session.userId);

      // 3. Send WA notification with PDF link
      await notifySurat(updated, "approve");

      toast.success("Surat berhasil disetujui");
      onClose();
    } catch (err) {
      console.error("[ApproveModal] Error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal menyetujui surat");
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
      const timestamp = new Date().toISOString();
      const actor = session.username ?? session.userId ?? "System";
      const history = record.status_history ? [...record.status_history] : [];
      history.push({ status: "Ditolak", timestamp, actor, catatan: catatan.trim() });

      const updated: SuratRecord = {
        ...record,
        status: "Ditolak",
        catatan: catatan.trim(),
        approved_at: timestamp,
        approved_by: actor,
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
      console.error("[ApproveModal] Error:", err);
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
            <h2 className="font-display text-xl font-bold">Approval Surat</h2>
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
                Apakah surat ini siap untuk ditandatangani dan diterbitkan?
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => setMode("approve")}
                  disabled={loading}
                  className="flex-1 h-12 bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Setujui
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
          ) : mode === "approve" ? (
            <div className="space-y-4">
              <div>
                <label className="font-ui text-sm font-semibold mb-2 block">
                  Nomor Surat <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    placeholder="Contoh: 147/001/KDS.SRMB/V/2026"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGenerateNomor}
                    disabled={generatingNomor || loading}
                    variant="outline"
                    className="shrink-0"
                  >
                    {generatingNomor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="font-ui text-xs text-muted-foreground mt-1">
                  Klik tombol di samping untuk generate nomor otomatis, atau ketik manual.
                </p>
              </div>

              <div className="rounded-xl border border-info/30 bg-info/10 p-4">
                <p className="font-ui text-xs text-info-foreground">
                  <strong>Catatan:</strong> Setelah disetujui, surat akan:
                </p>
                <ul className="font-ui text-xs text-info-foreground mt-2 space-y-1 ml-4 list-disc">
                  <li>Diberi nomor surat resmi</li>
                  <li>Ditandatangani dengan QR Code</li>
                  <li>Dikirim ke pemohon via WhatsApp</li>
                  <li>Tersedia untuk diunduh sebagai PDF</li>
                </ul>
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
                  onClick={handleApprove}
                  disabled={loading || !nomorSurat.trim()}
                  className="flex-1 h-12 bg-success hover:bg-success/90"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Setujui & Kirim
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
