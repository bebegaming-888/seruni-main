/**
 * EditSurat — "Koreksi Pengajuan" page for warga.
 *
 * Allows editing of submitted records that are still in early workflow stages
 * ("Menunggu Verifikasi" or "Diverifikasi"). Warga cannot edit records that are
 * already "Menunggu Approval", "Disetujui", or "Ditolak".
 *
 * Editable: form fields (extraData), WA contact, attachments, correction note.
 * NOT editable: NIK, full identity, surat type/kode.
 *
 * Accessible at /masuk/edit-surat?no=TRK-XXXX-XXXX — requires warga login + own record.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  isWargaLoggedIn,
  getWargaSession,
} from "@/lib/warga-auth";
import {
  getRecord,
  saveRecord,
  type SuratRecord,
  type Lampiran,
  lookupPenduduk,
} from "@/lib/esurat-store";
import { getTemplate, type SuratTemplate } from "@/lib/template-store";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import {
  ArrowLeft,
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  Paperclip,
  FileIcon,
  Upload,
  X,
  Camera,
  Send,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Penduduk } from "@/data/penduduk";
import { syncSaveRecord } from "@/lib/useSupabaseSync";

const EDITABLE_STATUSES = ["Menunggu Verifikasi", "Diverifikasi"] as const;

export default function EditSurat() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/masuk/edit-surat" });
  const no = search.no ?? "";

  const session = getWargaSession();
  const wargaId = session?.warga?.id;

  const [record, setRecord] = useState<SuratRecord | null>(null);
  const [penduduk, setPenduduk] = useState<Penduduk | null>(null);
  const [template, setTemplate] = useState<SuratTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>("");

  // Editable state
  const [contactWa, setContactWa] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Lampiran[]>([]);
  const [correctionNote, setCorrectionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Guard: must be logged in
  useEffect(() => {
    if (!isWargaLoggedIn()) {
      navigate({ to: "/masuk/warga" });
    }
  }, [navigate]);

  // Load record
  useEffect(() => {
    if (!no || !wargaId) return;

    const r = getRecord(no);
    if (!r) {
      setLoading(false);
      setAuthError("Pengajuan tidak ditemukan. Pastikan Anda mengakses halaman yang benar.");
      return;
    }

    if (r.warga_id && r.warga_id !== wargaId) {
      setLoading(false);
      setAuthError("Anda tidak memiliki akses untuk mengoreksi pengajuan ini.");
      return;
    }

    if (!EDITABLE_STATUSES.includes(r.status as typeof EDITABLE_STATUSES[number])) {
      setLoading(false);
      setAuthError(
        `Pengajuan tidak dapat diedit karena status saat ini adalah "${r.status}". Hanya pengajuan dengan status "Menunggu Verifikasi" atau "Diverifikasi" yang dapat dikoreksi.`,
      );
      return;
    }

    setRecord(r);
    setContactWa(r.kontak ?? "");
    setExtraData({ ...r.data });

    // Load penduduk data
    lookupPenduduk(r.nik).then((w) => {
      if (w) setPenduduk(w as Penduduk);
    });

    // Load template
    const t = getTemplate(r.kode);
    setTemplate(t ?? null);
    setAttachments([...(r.attachments ?? [])]);

    setLoading(false);
  }, [no, wargaId]);

  const updateData = (key: string, val: string) => setExtraData((d) => ({ ...d, [key]: val }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 10 - attachments.length;
    if (files.length > remaining) {
      toast.error(`Maksimal 10 lampiran. Sisa ${remaining} slot.`, { description: "Kurangi jumlah lampiran atau hapus file yang tidak diperlukan." });
      return;
    }
    const newFiles: Lampiran[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} terlalu besar. Maks 5MB.`, { description: "Kompres file atau gunakan format dengan ukuran lebih kecil." });
        continue;
      }
      const data_url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: file.type, size: file.size, data_url });
    }
    setAttachments((a) => [...a, ...newFiles]);
    e.target.value = "";
  };

  const removeAttachment = (i: number) =>
    setAttachments((a) => a.filter((_, idx) => idx !== i));

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const handleSubmit = async () => {
    if (!record || !correctionNote.trim()) {
      toast.error("Wajib isi catatan koreksi — jelaskan apa yang diperbaiki.", { description: "Jelaskan secara singkat apa yang Anda koreksi dan mengapa." });
      return;
    }
    setSubmitting(true);

    const editedBy = session?.warga?.nama ?? "Warga";
    const now = new Date().toISOString();
    // Diff: only mark fields that actually changed vs original record
    const changedFields: string[] = [];
    if (contactWa !== record.kontak) changedFields.push("kontak");
    if (JSON.stringify(extraData) !== JSON.stringify(record.data)) changedFields.push("data");
    const selfieInAttachments = attachments.find(
      (a) =>
        a.name.toLowerCase().includes("selfie") ||
        a.name.toLowerCase().includes("foto"),
    );
    if (selfieInAttachments) {
      // selfie may be new or changed
      const oldSelfie = record.foto_selfie;
      if (!oldSelfie || oldSelfie.data_url !== selfieInAttachments.data_url) {
        changedFields.push("foto_selfie");
      }
    }
    const docAttachments = attachments.filter(
      (a) =>
        !a.name.toLowerCase().includes("selfie") &&
        !a.name.toLowerCase().includes("foto"),
    );
    const oldDocAttachments = (record.attachments ?? []).filter(
      (a) =>
        !a.name.toLowerCase().includes("selfie") &&
        !a.name.toLowerCase().includes("foto"),
    );
    if (JSON.stringify(docAttachments) !== JSON.stringify(oldDocAttachments)) {
      changedFields.push("attachments");
    }
    const editEntry = {
      timestamp: now,
      edited_by: editedBy,
      correction_note: correctionNote.trim(),
      changed_fields: changedFields,
    };
    const selfieEntry = attachments.find(
      (a) =>
        a.name.toLowerCase().includes("selfie") ||
        a.name.toLowerCase().includes("foto"),
    );
    const updated: SuratRecord = {
      ...record,
      kontak: contactWa,
      data: extraData,
      attachments,
      foto_selfie: selfieEntry ?? record.foto_selfie,
      updated_by: editedBy,
      updated_at: now,
      edit_history: [...(record.edit_history ?? []), editEntry],
      catatan: `[EDIT] ${correctionNote.trim()}\n\n${record.catatan ?? ""}`.trim(),
    };

    saveRecord(updated);
    await syncSaveRecord(updated, editedBy);

    toast.success("Koreksi berhasil disimpan", {
      description: `Pengajuan ${record.no} telah diperbarui.`,
    });
    setSubmitting(false);
    setConfirmOpen(false);
    navigate({ to: "/masuk/pengajuan-saya" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="font-ui text-sm">Memuat data pengajuan…</span>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="rounded-full bg-destructive/10 h-14 w-14 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold">Tidak Bisa Edit</h2>
          <p className="font-body text-muted-foreground">{authError}</p>
          <Link
            to="/masuk/pengajuan-saya"
            className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover inline-flex"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Pengajuan Saya
          </Link>
        </div>
      </div>
    );
  }

  if (!record || !template) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Record identity banner */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="font-ui text-[10px] font-bold text-primary tracking-widest">
                {record.kode}
              </span>
              <h2 className="font-display text-xl font-bold mt-0.5">{record.nama_surat}</h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                #{record.no} · Diajukan {new Date(record.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-ui font-semibold border ${
                record.status === "Menunggu Verifikasi"
                  ? "text-warning bg-warning/10 border-warning/30"
                  : "text-info bg-info/10 border-info/30"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {record.status}
            </span>
          </div>

          {/* Identity info — read only */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-ui text-[10px] text-muted-foreground uppercase tracking-wider">Nama</p>
              <p className="font-display font-bold mt-0.5">{record.pemohon}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-ui text-[10px] text-muted-foreground uppercase tracking-wider">NIK</p>
              <p className="font-mono font-bold mt-0.5">{record.nik}</p>
            </div>
          </div>

          {/* Koreksi note from admin */}
          {record.catatan && (
            <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="font-ui text-[10px] text-warning font-bold uppercase tracking-wider mb-1">
                Catatan Admin
              </p>
              <p className="font-ui text-sm text-foreground/80">{record.catatan}</p>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="font-ui text-xs text-info leading-relaxed">
            <strong>Yang bisa diedit:</strong> nomor WhatsApp, field formulir di bawah, lampiran dokumen, dan catatan koreksi.
            <strong> Tidak bisa diedit:</strong> NIK, nama, dan jenis surat.
          </p>
        </div>

        {/* WA Contact */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Nomor WhatsApp
          </h3>
          <Label className="font-ui font-semibold">
            Nomor WA untuk notifikasi <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            value={contactWa}
            onChange={(e) => setContactWa(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="08xxxxxxxxxx atau +62xxxxxxxx"
            inputMode="tel"
            className="mt-2 font-ui"
          />
          <p className="font-ui text-[11px] text-muted-foreground mt-1">
            Notifikasi status akan dikirim ke nomor ini via WhatsApp
          </p>
        </div>

        {/* Form fields (editable) */}
        {template.fields.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
            <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Data Formulir
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {template.fields.map((f) => (
                <div key={f.key} className={f.colSpan === 2 ? "sm:col-span-2" : ""}>
                  <Label className="font-ui font-semibold">
                    {f.label}
                    {f.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {f.helper && (
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{f.helper}</p>
                  )}
                  <div className="mt-1.5">
                    {f.type === "textarea" ? (
                      <Textarea
                        value={extraData[f.key] ?? ""}
                        onChange={(e) => updateData(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={extraData[f.key] ?? ""}
                        onValueChange={(v) => updateData(f.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih…" />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.type}
                        value={extraData[f.key] ?? ""}
                        onChange={(e) => updateData(f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selfie section */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="h-4 w-4 text-success" />
            <h3 className="font-display font-bold text-base">Foto Selfie</h3>
          </div>
          <p className="font-body text-xs text-muted-foreground mb-4">
            Perbarui foto selfie jika diperlukan.
          </p>
          {(() => {
            const selfie = attachments.find(
              (a) =>
                a.name.toLowerCase().includes("selfie") || a.name.toLowerCase().includes("foto"),
            );
            if (selfie?.data_url) {
              return (
                <div className="relative inline-block">
                  <img
                    src={selfie.data_url}
                    alt="Foto selfie"
                    className="h-40 w-40 rounded-xl object-cover border-2 border-success/40"
                  />
                  <button
                    onClick={() =>
                      setAttachments((a) =>
                        a.filter(
                          (_, i) =>
                            !(
                              a[i].name.toLowerCase().includes("selfie") ||
                              a[i].name.toLowerCase().includes("foto")
                            ),
                        ),
                      )
                    }
                    className="absolute -bottom-2 -right-2 bg-destructive text-white rounded-full p-1.5 hover:bg-destructive/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }
            return (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-success hover:bg-success/5 cursor-pointer text-muted-foreground hover:text-success transition">
                <Camera className="h-8 w-8" />
                <p className="font-body text-sm text-center">Upload foto selfie baru</p>
                <p className="font-ui text-[11px] text-muted-foreground">JPG/PNG · maks 5MB</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Ukuran terlalu besar. Maks 5MB.", { description: "Kompres foto selfie dan pastikan ukurannya tidak lebih dari 5MB." });
                      return;
                    }
                    const data_url = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (ev) => resolve(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    });
                    const filtered = attachments.filter(
                      (a) =>
                        !a.name.toLowerCase().includes("selfie") &&
                        !a.name.toLowerCase().includes("foto"),
                    );
                    setAttachments([...filtered, { name: `selfie_${Date.now()}.jpg`, type: file.type, size: file.size, data_url }]);
                    e.target.value = "";
                  }}
                />
              </label>
            );
          })()}
        </div>

        {/* Document attachments */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="h-4 w-4 text-primary" />
            <h3 className="font-display font-bold text-base">Dokumen Pendukung</h3>
            <span className="ml-auto font-ui text-xs text-muted-foreground">
              {attachments.filter((a) => !a.name.includes("selfie") && !a.name.includes("foto")).length}/10
            </span>
          </div>

          {attachments.filter((a) => !a.name.includes("selfie") && !a.name.includes("foto")).length > 0 && (
            <div className="space-y-2 mb-4">
              {attachments
                .filter((a) => !a.name.includes("selfie") && !a.name.includes("foto"))
                .map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border"
                  >
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm truncate">{a.name}</p>
                      <p className="font-ui text-[11px] text-muted-foreground">{formatSize(a.size)}</p>
                    </div>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-muted-foreground hover:text-destructive transition shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          <label
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer text-muted-foreground hover:text-primary transition"
          >
            <Upload className="h-6 w-6" />
            <p className="font-body text-sm text-center">Tambah dokumen pendukung</p>
            <p className="font-ui text-[11px] text-muted-foreground">PDF, JPG, PNG · maks 5MB per file</p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Correction note */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">
            Catatan Koreksi <span className="text-destructive">*</span>
          </h3>
          <Textarea
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            placeholder="Jelaskan apa yang Anda koreksi dan mengapa. Contoh: 'Memperbarui alamat tinggal karena salah ketik di baris pertama.'"
            rows={3}
          />
          <p className="font-ui text-[11px] text-muted-foreground mt-1.5">
            Catatan ini akan dicatat sebagai history perubahan dan membantu admin memahami konteks koreksi Anda.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/masuk/pengajuan-saya" })}
          >
            Batal
          </Button>
          <Button
            className="btn-pill bg-primary hover:bg-primary-hover"
            onClick={() => setConfirmOpen(true)}
            disabled={!correctionNote.trim()}
          >
            <Check className="h-4 w-4 mr-1" /> Simpan Koreksi
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Simpan Koreksi</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menyimpan koreksi untuk pengajuan #{record.no}?
              Admin akan melihat perubahan ini dan data lama akan tercatat di log aktivitas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary-hover"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Ya, Simpan Koreksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}