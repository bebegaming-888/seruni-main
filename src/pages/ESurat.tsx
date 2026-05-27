/**
 * ESurat — Redesigned 2025
 *
 * Prinsip: "Senjangan & Ramah" — semudah mungkin untuk segala usia.
 *
 * Alur 2 halaman:
 *   Halaman 1: Pilih jenis surat → daftar kategori + pencarian
 *   Halaman 2: Form Pengajuan → NIK autofill + field tambahan + submit
 *
 * Tidak perlu login warga. Cukup NIK untuk verifikasi.
 * Data warga diambil dari tabel warga (bukan mock/dummy).
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "@/components/Link";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  FileText,
  Clock,
  Users,
  ShieldCheck,
  IdCard,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Smartphone,
  Paperclip,
  X,
  FileIcon,
  Upload,
  Camera,
  BookOpen,
  Briefcase,
  Heart,
  GraduationCap,
  Stethoscope,
  Sprout,
  Building2,
  Home,
  ScrollText,
  ChevronRight,
  WifiOff,
  Info,
  CheckCircle2,
  Star,
  Copy,
  ExternalLink,
  Bell,
  Calendar,
  Award,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { type Penduduk, PENDUDUK_MOCK } from "@/data/penduduk";
import { initTemplateStore, listTemplates, type SuratTemplate } from "@/lib/template-store";
import { lookupPenduduk, searchWarga, type SuratRecord, type Lampiran } from "@/lib/esurat-store";
import { submitSurat } from "@/lib/esurat-submit";
import { isSupabaseConfigured } from "@/lib/supabase";
import { enqueueOfflineSubmission } from "@/lib/offline-queue";
import { formatDateLong, formatFileSize } from "@/lib/utils";
import { notifySurat } from "@/lib/esurat-notif";
import { getWargaSession } from "@/lib/warga-auth";

/* ════════════════════════════════════════════════════
   TIPE & KONSTANTA
════════════════════════════════════════════════════ */
type View = "list" | "form" | "success";

const isSelfieAttachment = (a: Lampiran) =>
  a.name.toLowerCase().includes("selfie") || a.name.toLowerCase().includes("foto");

/** Generate nomor tracking unik */
function generateTrackingNumber(code: string) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const ts = String(d.getTime()).slice(-6);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${code}-${yy}${mm}${dd}-${ts}${rand}`;
}

/* ════════════════════════════════════════════════════
   KOMPONEN UTAMA
════════════════════════════════════════════════════ */
export default function ESurat() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/pelayanan/e-surat" });
  const [view, setView] = useState<View>(searchParams.kode ? "form" : "list");
  const [selectedCode, setSelectedCode] = useState(searchParams.kode ?? "");
  const [nik, setNik] = useState("");
  const [penduduk, setPenduduk] = useState<Penduduk | null>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [wargaResults, setWargaResults] = useState<Penduduk[]>([]);
  const [selectedWarga, setSelectedWarga] = useState<Penduduk | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [autofilledKeys, setAutofilledKeys] = useState<Set<string>>(new Set());
  /** Identity fields — pre-filled from penduduk, bisa diedit warga */
  const [identityData, setIdentityData] = useState<Record<string, string>>({});
  const [contactWa, setContactWa] = useState("");
  const [attachments, setAttachments] = useState<Lampiran[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load templates ────────────────────────────────── */
  useEffect(() => {
    let mounted = true;
    initTemplateStore()
      .catch((err) => console.warn("[ESurat] initTemplateStore failed:", err))
      .finally(() => {
        if (mounted) {
          setTemplates(listTemplates().filter((t) => t.status?.toLowerCase() === "disetujui"));
          setTemplatesLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  /* ── Pre-fill NIK dari warga session ─────────────── */
  useEffect(() => {
    const session = getWargaSession();
    if (session?.warga?.nik) {
      setNik(session.warga.nik);
      setTimeout(async () => {
        const found = await lookupPenduduk(session.warga.nik);
        if (found) {
          setPenduduk(found);
          setContactWa(found.no_hp ?? "");
          setSelectedWarga(found);
        }
      }, 150);
    }
  }, []);

  /* ── Offline detection ────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = async () => {
      setIsOffline(false);
      const { processOfflineQueue } = await import("@/lib/offline-queue");
      processOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    if (navigator.onLine) {
      import("@/lib/offline-queue").then(({ processOfflineQueue }) => processOfflineQueue());
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── Smart NIK search (debounced 400ms) ──────────── */
  const handleNikChange = useCallback((val: string) => {
    const digits = val.slice(0, 16);
    setNik(digits);
    setNikError(null);
    setSelectedWarga(null);
    setPenduduk(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length < 4) {
      setWargaResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await searchWarga(digits);
      setSearchLoading(false);

      // ── Auto-select: jika user mengetik tepat 16 digit NIK ──
      // Ini mengembalikan behaviour yang hilang saat refactor (esurat-autofill-nik event)
      if (digits.length === 16) {
        // Cek apakah ada exact match di hasil search
        const exactMatch = results.find((r) => r.nik === digits);
        if (exactMatch) {
          setNik(exactMatch.nik);
          setSelectedWarga(exactMatch);
          setPenduduk(exactMatch);
          setContactWa(exactMatch.no_hp ?? "");
          setWargaResults([]);
          setShowDropdown(false);
          return;
        }
        // Fallback: langsung query DB jika tidak ada di hasil search
        const found = await lookupPenduduk(digits);
        if (found) {
          setSelectedWarga(found);
          setPenduduk(found);
          setContactWa(found.no_hp ?? "");
          setWargaResults([]);
          setShowDropdown(false);
        } else {
          setNikError("NIK tidak ditemukan dalam database desa. Silakan hubungi kantor desa.");
          setWargaResults([]);
          setShowDropdown(false);
        }
        return;
      }

      setWargaResults(results);
      setShowDropdown(results.length > 0);
    }, 400);
  }, []);

  const handleSelectWarga = useCallback((w: Penduduk) => {
    setNik(w.nik);
    setSelectedWarga(w);
    setPenduduk(w);
    setContactWa(w.no_hp ?? "");
    setWargaResults([]);
    setShowDropdown(false);
    setNikError(null);
  }, []);

  const schema: SuratTemplate | null = useMemo(
    () => (selectedCode ? (templates.find((t) => t.code === selectedCode) ?? null) : null),
    [selectedCode, templates],
  );

  /* ── Autofill: penduduk + identityData ─────────── */
  useEffect(() => {
    if (penduduk) {
      // Pre-fill editable identity textfields from database
      const idFields: Record<string, string> = {
        nama: penduduk.nama ?? "",
        nik: penduduk.nik ?? "",
        jenis_kelamin: penduduk.jenis_kelamin ?? "",
        tempat_lahir: penduduk.tempat_lahir ?? "",
        tanggal_lahir: penduduk.tanggal_lahir ?? "",
        pekerjaan: penduduk.pekerjaan ?? "",
        alamat: penduduk.alamat ?? "",
        dusun: penduduk.dusun ?? "",
        rt: penduduk.rt ?? "",
        rw: penduduk.rw ?? "",
        desa: penduduk.desa ?? "",
        no_kk: penduduk.no_kk ?? "",
        agama: penduduk.agama ?? "",
        status_kawin: penduduk.status_perkawinan ?? "",
      };
      setIdentityData(idFields);

      // Also autofill template-specific fields if empty
      if (schema) {
        const newAutofilled = new Set<string>();
        const newData: Record<string, string> = {};
        for (const f of schema.fields) {
          if (f.autofill && !(extraData[f.key] ?? "").trim()) {
            const val = penduduk[f.autofill as keyof typeof penduduk];
            if (val !== undefined && val !== null && String(val).trim()) {
              newData[f.key] = String(val);
              newAutofilled.add(f.key);
            }
          }
        }
        if (Object.keys(newData).length > 0) {
          setExtraData((prev) => ({ ...newData, ...prev }));
          setAutofilledKeys(newAutofilled);
          toast.info("Data terisi otomatis dari database desa", { duration: 3000 });
        }
      }
    } else {
      setIdentityData({});
    }
  }, [penduduk]); // eslint-disable-line react-hooks/exhaustive-deps -- schema/extraData intentionally omitted to avoid infinite loops

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!contactWa || !/^(\+?62|0)\d{8,13}$/.test(contactWa.replace(/\s|-/g, ""))) {
      toast.error("Nomor WhatsApp tidak valid", { description: "Gunakan format 08xx atau +62xx" });
      return;
    }

    if (!schema) {
      toast.error("Jenis surat belum dipilih");
      return;
    }

    setSubmitting(true);
    setSubmittingStep(1);
    await new Promise((r) => setTimeout(r, 500));

    const session = getWargaSession();
    const wargaId: string | undefined = session?.warga?.id;
    const selfieEntry = attachments.find(isSelfieAttachment);
    const no = generateTrackingNumber(selectedCode);

    const record: SuratRecord = {
      no,
      kode: selectedCode,
      nama_surat: schema.name ?? "",
      pemohon: (identityData.nama || penduduk?.nama) ?? "",
      nik: (identityData.nik || penduduk?.nik) ?? nik,
      kontak: contactWa,
      warga_id: wargaId,
      // ── DNA SURAT: merge editable identityData (prioritas) + extraData ──
      data: {
        ...identityData,
        ...extraData,
      },
      attachments,
      foto_selfie: selfieEntry,
      status: "Menunggu Verifikasi",
      status_history: [
        {
          status: "Menunggu Verifikasi",
          timestamp: new Date().toISOString(),
          actor: identityData.nama || (penduduk?.nama ?? ""),
        },
      ],
      created_at: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await enqueueOfflineSubmission({ type: "surat", data: record });
      setSubmitting(false);
      setView("success");
      toast.warning("Pengajuan disimpan offline", {
        description: `No. tracking: ${no} — akan dikirim saat koneksi pulih`,
      });
      return;
    }

    setSubmittingStep(2);
    const result = await submitSurat(record, "");
    setSubmittingStep(3);

    if (!result.ok) {
      setSubmitting(false);
      toast.error("Gagal mengirim", { description: result.error });
      return;
    }

    setSubmittingStep(4);
    const notify = await notifySurat(record, "submit");
    setSubmittingStep(5);
    setSubmitting(false);
    setView("success");

    if (notify.ok) {
      toast.success("Pengajuan berhasil dikirim!", {
        description: `No. tracking: ${result.tracking_no ?? no}`,
      });
    } else {
      toast.warning("Pengajuan OK, notifikasi WA gagal", {
        description: `No. tracking: ${result.tracking_no ?? no}`,
      });
    }
  };

  const selectSurat = (code: string) => {
    setSelectedCode(code);
    navigate({ to: "/pelayanan/e-surat", search: { kode: code }, replace: true });
    setView("form");
  };

  const goToList = () => {
    setSelectedCode("");
    navigate({ to: "/pelayanan/e-surat", search: {}, replace: true });
    setView("list");
    setPenduduk(null);
    setSelectedWarga(null);
    setNik("");
    setExtraData({});
    setAutofilledKeys(new Set());
    setIdentityData({});
    setAttachments([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar hanya tampil di view list (halaman publik) */}
      {view === "list" && <Navbar />}

      {/* ══ OFFLINE BANNER ══ */}
      {isOffline && (
        <div className="sticky top-16 z-30 flex items-center gap-2 px-4 py-2.5 bg-warning/15 border-b border-warning/30 text-warning text-xs font-ui font-semibold">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Anda sedang offline. Pengajuan tetap bisa disimpan dan akan dikirim otomatis saat
            terhubung.
          </span>
        </div>
      )}

      {/* ══ VIEW: LIST SURAT ══ */}
      {view === "list" && (
        <>
          <PageHero
            titleFirst="Layanan"
            titleSecond="E-Surat"
            description="Buat pengajuan surat keterangan secara mandiri dan lacak statusnya."
            badge="Pelayanan Publik"
            badgeIcon={<FileText className="h-3.5 w-3.5" />}
          />

          <div className="mx-auto max-w-4xl px-4 sm:px-8 mt-6">
            <div className="bg-muted p-1.5 rounded-2xl flex relative max-w-sm mx-auto shadow-inner">
              <button className="flex-1 py-3 text-sm font-ui font-bold rounded-xl z-10 transition-colors bg-background text-foreground shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Buat Surat
              </button>
              <Link
                to="/pelayanan/lacak"
                className="flex-1 py-3 text-sm font-ui font-bold rounded-xl z-10 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Cek Status
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ══ BACK BUTTON (form & success view) ══ */}
      {(view === "form" || view === "success") && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
            <button
              onClick={goToList}
              aria-label="Kembali ke daftar surat"
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors font-ui font-semibold shrink-0 animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Kembali ke Daftar Surat</span>
            </button>
            {view === "form" && schema && (
              <>
                <div className="h-6 w-px bg-border mx-1 shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-ui text-sm font-bold shadow-md shrink-0">
                    1
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className="font-ui text-[10px] font-semibold text-primary uppercase tracking-wider">
                      Langkah 1
                    </p>
                    <p className="font-display text-sm font-bold truncate">{schema.name}</p>
                  </div>
                </div>
                <div className="h-px flex-1 bg-border mx-2 sm:mx-3" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-ui text-sm font-bold shrink-0">
                    2
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-ui text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Langkah 2
                    </p>
                    <p className="font-display text-sm text-muted-foreground">Isi Form</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ MAIN CONTENT ══ */}
      <section className="py-4 sm:py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {view === "list" && (
            <SuratListView templates={templates} loaded={templatesLoaded} onSelect={selectSurat} />
          )}
          {view === "form" && schema && (
            <FormView
              schema={schema}
              nik={nik}
              onNikChange={handleNikChange}
              wargaResults={wargaResults}
              searchLoading={searchLoading}
              showDropdown={showDropdown}
              onSelectWarga={handleSelectWarga}
              selectedWarga={selectedWarga}
              penduduk={penduduk}
              nikError={nikError}
              extraData={extraData}
              setExtraData={setExtraData}
              autofilledKeys={autofilledKeys}
              identityData={identityData}
              setIdentityData={setIdentityData}
              contactWa={contactWa}
              setContactWa={setContactWa}
              attachments={attachments}
              setAttachments={setAttachments}
              onSubmit={handleSubmit}
              submitting={submitting}
              submittingStep={submittingStep}
              onBack={goToList}
            />
          )}
          {view === "success" && (
            <SuccessView
              schema={schema}
              nik={nik}
              extraData={extraData}
              contactWa={contactWa}
              onNewSubmission={goToList}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   HALAMAN 1: DAFTAR SURAT
   ════════════════════════════════════════════════════ */
function SuratListView({
  templates,
  loaded,
  onSelect,
}: {
  templates: SuratTemplate[];
  loaded: boolean;
  onSelect: (code: string) => void;
}) {
  const [q, setQ] = useState("");
  const [activeKat, setActiveKat] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))).sort(),
    [templates],
  );
  const catCount = useMemo(() => {
    const m = new Map<string, number>();
    templates.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1));
    return m;
  }, [templates]);

  const filtered = useMemo(() => {
    let items = templates;
    if (activeKat) items = items.filter((t) => t.category === activeKat);
    if (q.trim())
      items = items.filter((i) =>
        `${i.code} ${i.name} ${i.description}`.toLowerCase().includes(q.toLowerCase()),
      );
    return items;
  }, [templates, activeKat, q]);

  // Popular = 5 most common letter types
  const popular = useMemo(() => {
    const popularCodes = ["SKTM", "SKU", "SKCK", "SKB", "SPKK"];
    return templates.filter((t) => popularCodes.includes(t.code)).slice(0, 5);
  }, [templates]);

  const CAT_ICONS: Record<string, React.ReactNode> = {
    Kependudukan: <Users className="h-5 w-5" />,
    "Sosial & Ekonomi": <Heart className="h-5 w-5" />,
    "Pernikahan & Keluarga": <Heart className="h-5 w-5" />,
    "Usaha & Ekonomi": <Briefcase className="h-5 w-5" />,
    "Tanah & Properti": <Home className="h-5 w-5" />,
    Pendidikan: <GraduationCap className="h-5 w-5" />,
    "Kesehatan & Khusus": <Stethoscope className="h-5 w-5" />,
    "Pertanian & Lingkungan": <Sprout className="h-5 w-5" />,
    "Surat Dinas": <Building2 className="h-5 w-5" />,
    "Surat Umum & Lainnya": <ScrollText className="h-5 w-5" />,
  };

  const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Kependudukan: {
      bg: "bg-[hsl(var(--color-cat-kependudukan)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-kependudukan))]",
      border: "border-[hsl(var(--color-cat-kependudukan)_/_0.3)]",
    },
    "Sosial & Ekonomi": {
      bg: "bg-[hsl(var(--color-cat-sosial)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-sosial))]",
      border: "border-[hsl(var(--color-cat-sosial)_/_0.3)]",
    },
    "Pernikahan & Keluarga": {
      bg: "bg-[hsl(var(--color-cat-pernikahan)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-pernikahan))]",
      border: "border-[hsl(var(--color-cat-pernikahan)_/_0.3)]",
    },
    "Usaha & Ekonomi": {
      bg: "bg-[hsl(var(--color-cat-usaha)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-usaha))]",
      border: "border-[hsl(var(--color-cat-usaha)_/_0.3)]",
    },
    "Tanah & Properti": {
      bg: "bg-[hsl(var(--color-cat-tanah)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-tanah))]",
      border: "border-[hsl(var(--color-cat-tanah)_/_0.3)]",
    },
    Pendidikan: {
      bg: "bg-[hsl(var(--color-cat-pendidikan)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-pendidikan))]",
      border: "border-[hsl(var(--color-cat-pendidikan)_/_0.3)]",
    },
    "Kesehatan & Khusus": {
      bg: "bg-[hsl(var(--color-cat-kesehatan)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-kesehatan))]",
      border: "border-[hsl(var(--color-cat-kesehatan)_/_0.3)]",
    },
    "Pertanian & Lingkungan": {
      bg: "bg-[hsl(var(--color-cat-pertanian)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-pertanian))]",
      border: "border-[hsl(var(--color-cat-pertanian)_/_0.3)]",
    },
    "Surat Dinas": {
      bg: "bg-[hsl(var(--color-cat-surat-dinas)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-surat-dinas))]",
      border: "border-[hsl(var(--color-cat-surat-dinas)_/_0.3)]",
    },
    "Surat Umum & Lainnya": {
      bg: "bg-[hsl(var(--color-cat-umum)_/_0.15)]",
      text: "text-[hsl(var(--color-cat-umum))]",
      border: "border-[hsl(var(--color-cat-umum)_/_0.3)]",
    },
  };

  return (
    <div className="space-y-8">
      {/* ── Info Banner ── */}
      <div className="rounded-2xl border border-info/20 bg-info/5 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div>
          <p className="font-ui text-sm font-semibold text-foreground">
            Tidak perlu login! Cukup masukkan NIK Anda untuk verifikasi otomatis.
          </p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Data Anda diambil langsung dari database kependudukan desa. Proses hanya 2 menit.
          </p>
        </div>
      </div>

      {/* ── Quick Action: Lacak Surat ── */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 border border-primary/20 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-display text-lg font-bold">Sudah pernah mengajukan?</p>
            <p className="font-body text-sm text-muted-foreground mt-0.5">
              Lacak status pengajuan Anda dengan nomor tracking atau NIK.
            </p>
          </div>
          <Link
            to="/pelayanan/lacak"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary transition shadow-md shrink-0 w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" />
            Lacak Pengajuan
          </Link>
        </div>
      </div>

      {/* ── Skeleton Loading ── */}
      {!loaded ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── SURAT POPULER ── */}
          {popular.length > 0 && !q.trim() && !activeKat && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-warning" />
                <h3 className="font-display text-lg font-bold">Surat Paling Dicari</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {popular.map((s) => {
                  const colors = CAT_COLORS[s.category] ?? {
                    bg: "bg-primary/10",
                    text: "text-primary",
                    border: "border-primary/20",
                  };
                  return (
                    <button
                      key={s.code}
                      onClick={() => onSelect(s.code)}
                      className="group text-left rounded-2xl border border-border bg-card p-4 hover:border-primary hover:shadow-elev transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform`}
                      >
                        {CAT_ICONS[s.category] ?? <FileText className="h-5 w-5" />}
                      </div>
                      <p className="font-ui text-[10px] font-bold tracking-widest text-muted-foreground mb-0.5">
                        {s.code}
                      </p>
                      <p className="font-display text-sm font-bold leading-tight line-clamp-2">
                        {s.name}
                      </p>
                      <p className="font-ui text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.eta}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PENCARIAN ── */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari jenis surat... (contoh: keterangan Usaha)"
                className="pl-12 h-14 text-base rounded-2xl border-border bg-card"
              />
            </div>

            {/* Filter Kategori */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveKat(null)}
                className={`shrink-0 h-9 px-4 rounded-full text-xs font-ui font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeKat === null ? "bg-ink text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Semua ({templates.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveKat(activeKat === cat ? null : cat)}
                  className={`shrink-0 h-9 px-4 rounded-full text-xs font-ui font-semibold transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeKat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {CAT_ICONS[cat]}
                  {catCount.get(cat)}
                </button>
              ))}
            </div>

            {/* Active filter info */}
            {(activeKat || q) && (
              <p className="font-ui text-xs text-muted-foreground">
                Menampilkan <strong className="text-foreground">{filtered.length}</strong> surat
                {activeKat ? ` di "${activeKat}"` : ""}
                {q ? ` matching "${q}"` : ""}
              </p>
            )}
          </div>

          {/* ── DAFTAR SURAT ── */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="font-display text-lg font-bold mt-4">Surat Tidak Ditemukan</h3>
              <p className="font-body text-sm text-muted-foreground mt-2">
                Coba kata kunci lain atau pilih kategori berbeda.
              </p>
              <button
                onClick={() => {
                  setQ("");
                  setActiveKat(null);
                }}
                className="mt-4 text-primary underline font-ui text-sm hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                aria-label="Hapus pencarian dan filter kategori"
              >
                Reset pencarian
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const colors = CAT_COLORS[s.category] ?? {
                  bg: "bg-primary/10",
                  text: "text-primary",
                  border: "border-primary/20",
                };
                return (
                  <button
                    key={s.code}
                    onClick={() => onSelect(s.code)}
                    className="group w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-elev transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}
                      >
                        {CAT_ICONS[s.category] ?? <FileText className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`font-ui text-[10px] font-bold tracking-widest ${colors.text}`}
                          >
                            {s.code}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-ui font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {s.category}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-foreground">
                          {s.name}
                        </h3>
                        <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                          {s.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 font-ui text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.eta}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileIcon className="h-3 w-3" />
                            {s.syarat.length} persyaratan
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   HALAMAN 2: FORM PENGAJUAN
════════════════════════════════════════════════════ */
function FormView({
  schema,
  nik,
  onNikChange,
  wargaResults,
  searchLoading,
  showDropdown,
  onSelectWarga,
  selectedWarga,
  penduduk,
  nikError,
  extraData,
  setExtraData,
  autofilledKeys,
  identityData,
  setIdentityData,
  contactWa,
  setContactWa,
  attachments,
  setAttachments,
  onSubmit,
  submitting,
  submittingStep,
  onBack,
}: {
  schema: SuratTemplate;
  nik: string;
  onNikChange: (v: string) => void;
  wargaResults: Penduduk[];
  searchLoading: boolean;
  showDropdown: boolean;
  onSelectWarga: (w: Penduduk) => void;
  selectedWarga: Penduduk | null;
  penduduk: Penduduk | null;
  nikError: string | null;
  extraData: Record<string, string>;
  setExtraData: (d: Record<string, string>) => void;
  autofilledKeys: Set<string>;
  identityData: Record<string, string>;
  setIdentityData: (d: Record<string, string>) => void;
  contactWa: string;
  setContactWa: (v: string) => void;
  attachments: Lampiran[];
  setAttachments: (a: Lampiran[]) => void;
  onSubmit: () => void;
  submitting: boolean;
  submittingStep: number;
  onBack: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // setShowDropdown wrapped in useCallback to stabilize the effect dependency
  const setShowDropdown = useCallback(
    (v: boolean) => {
      if (v !== showDropdown)
        (document.querySelector("#warga-dropdown") as HTMLDivElement | null)?.setAttribute(
          "data-show",
          String(v),
        );
    },
    [showDropdown],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowDropdown]);

  const update = (k: string, v: string) => setExtraData({ ...extraData, [k]: v });

  const hasAnyAutofill = schema.fields.some((f) => f.autofill && autofilledKeys.has(f.key));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - attachments.length;
    if (files.length > remaining) {
      toast.error(`Maksimal 10 lampiran. Sisa ${remaining} slot.`);
      return;
    }
    const readFile = (file: File): Promise<Lampiran> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) =>
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data_url: ev.target?.result as string,
          });
        reader.readAsDataURL(file);
      });
    const valid = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} terlalu besar. Maks 5MB.`);
        return false;
      }
      return true;
    });
    const newFiles = await Promise.all(valid.map(readFile));
    setAttachments([...attachments, ...newFiles]);
    e.target.value = "";
  };

  const removeAttachment = (i: number) => setAttachments(attachments.filter((_, idx) => idx !== i));

  const handleSelfieFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto terlalu besar. Maks 5MB.");
      return;
    }
    const data_url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    });
    const filtered = attachments.filter((a) => !isSelfieAttachment(a));
    setAttachments([
      ...filtered,
      { name: `selfie_${Date.now()}.jpg`, type: file.type, size: file.size, data_url },
    ]);
    e.target.value = "";
  };

  const selfie = attachments.find(isSelfieAttachment);
  const submitSteps = [
    { n: 1, label: "Memvalidasi data..." },
    { n: 2, label: "Mengirim ke server..." },
    { n: 3, label: "Menyimpan ke database..." },
    { n: 4, label: "Mengirim notifikasi WA..." },
    { n: 5, label: "Selesai!" },
  ];

  return (
    <div className="space-y-6 animate-fade-in" aria-busy={submitting}>
      {/* ── Header Surat ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <FileText className="h-7 w-7" />
        </div>
        <div>
          <p className="font-ui text-[10px] font-bold text-primary uppercase tracking-widest">
            Jenis Surat
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold">{schema.name}</h2>
          <p className="font-body text-xs text-muted-foreground mt-0.5">{schema.description}</p>
        </div>
      </div>

      {/* ── SECTION: NIK + DATA WARGA ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base">Identitas Pemohon</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-ui font-bold self-start sm:self-auto shadow-sm">
            <Sparkles className="h-3 w-3" /> DNA Surat — Auto-fill
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="font-ui font-semibold text-base">
              Nomor Induk Kependudukan (NIK) <span className="text-destructive">*</span>
            </Label>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Ketik NIK atau nama Anda — sistem akan otomatis mengisi data dari database desa.
            </p>
          </div>

          {/* NIK Input dengan Smart Search Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                value={nik}
                onChange={(e) => onNikChange(e.target.value)}
                onFocus={() => {
                  if (wargaResults.length > 0) setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (!showDropdown || wargaResults.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setShowDropdown(true);
                    // Focus first option
                    setTimeout(() => {
                      const first = document.querySelector(
                        "#warga-dropdown button",
                      ) as HTMLButtonElement | null;
                      first?.focus();
                    }, 10);
                  }
                }}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={showDropdown && wargaResults.length > 0}
                placeholder="Ketik NIK atau nama lengkap..."
                className="w-full h-16 rounded-2xl border-2 border-border bg-background pl-14 pr-14 text-lg font-mono tracking-wider placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
              />
              {searchLoading && (
                <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
              )}
              {selectedWarga && (
                <button
                  onClick={() => {
                    onNikChange("");
                    setShowDropdown(false);
                  }}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                  aria-label="Hapus NIK"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {nik.length > 0 && !selectedWarga && !searchLoading && (
                <Check className="absolute right-14 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Dropdown hasil pencarian */}
            {showDropdown && wargaResults.length > 0 && (
              <div
                id="warga-dropdown"
                role="listbox"
                aria-label="Hasil pencarian warga — tekan atas/bawah untuk navigasi"
                aria-multiselectable={false}
                className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-card shadow-elev overflow-hidden animate-slide-down"
              >
                <div className="px-4 py-2.5 border-b border-border bg-muted/50">
                  <p className="font-ui text-[11px] font-semibold text-muted-foreground">
                    {wargaResults.length} warga ditemukan — klik untuk memilih
                  </p>
                </div>
                {wargaResults.map((w) => (
                  <button
                    key={w.nik}
                    role="option"
                    aria-selected={selectedWarga?.nik === w.nik}
                    tabIndex={0}
                    onClick={() => onSelectWarga(w)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectWarga(w);
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = e.currentTarget.nextElementSibling as HTMLButtonElement | null;
                        next?.focus();
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = e.currentTarget
                          .previousElementSibling as HTMLButtonElement | null;
                        prev?.focus();
                      }
                    }}
                    className="w-full text-left px-4 py-3.5 hover:bg-primary/5 border-b border-border last:border-b-0 transition-colors focus-visible:outline-none focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-h-[44px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-foreground">{w.nama}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          NIK {w.nik.slice(0, 4)}****{w.nik.slice(-4)} · {w.dusun}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {nikError && (
              <div className="mt-2 flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-ui text-sm">{nikError}</p>
              </div>
            )}
          </div>

          {/* Card konfirmasi data warga (Auto-fill Success) */}
          {penduduk && (
            <div className="rounded-xl border-2 border-success/30 bg-success/5 p-3 sm:p-4 animate-fade-in mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-ui text-sm font-bold text-success">Data Warga Ditemukan</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      Data diambil secara otomatis dan aman dari database resmi desa. Semua privasi
                      dijamin. Silakan cek dan sesuaikan jika ada perubahan.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success text-success-foreground text-[10px] font-ui font-bold shadow-sm self-start sm:self-auto ml-13 sm:ml-0">
                  <Sparkles className="h-3 w-3" /> Auto-fill
                </span>
              </div>
              <p className="font-ui text-[11px] text-success/80 flex items-center gap-1 mt-3 ml-13 sm:ml-0">
                <CheckCircle2 className="h-3 w-3" />
                Data terisi otomatis — edit jika ada kesalahan atau perubahan
              </p>
            </div>
          )}

          {/* ── Editable Identity Textfields — Accordion for Mobile ── */}
          {penduduk && (
            <Accordion
              type="single"
              defaultValue="identitas-utama"
              collapsible
              className="rounded-2xl border border-border bg-card shadow-sm mb-6 overflow-hidden"
            >
              {/* Section A: Identitas Utama — OPEN by default */}
              <AccordionItem value="identitas-utama">
                <AccordionTrigger className="px-4 sm:px-5 py-3.5 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-ui text-sm font-bold text-foreground">Identitas Utama</p>
                      <p className="font-body text-xs text-muted-foreground">
                        Nama, NIK, TTL, Jenis Kelamin, Agama
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-5 pb-4">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="text-sm font-bold text-foreground mb-3 sr-only">
                      Identitas Utama
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          key: "nama",
                          label: "Nama Lengkap",
                          type: "text",
                          placeholder: "Nama sesuai KTP",
                          autoComplete: "name",
                        },
                        {
                          key: "nik",
                          label: "NIK",
                          type: "text",
                          placeholder: "16 digit NIK",
                          autoComplete: "off",
                        },
                        {
                          key: "tempat_lahir",
                          label: "Tempat Lahir",
                          type: "text",
                          placeholder: "Contoh: Bandung",
                          autoComplete: "address-level2",
                        },
                        {
                          key: "tanggal_lahir",
                          label: "Tanggal Lahir",
                          type: "text",
                          placeholder: "DD/MM/YYYY",
                          autoComplete: "bday",
                        },
                        {
                          key: "jenis_kelamin",
                          label: "Jenis Kelamin",
                          type: "text",
                          placeholder: "Laki-Laki / Perempuan",
                          autoComplete: "sex",
                        },
                        {
                          key: "agama",
                          label: "Agama",
                          type: "text",
                          placeholder: "Islam, Kristen, dll",
                          autoComplete: "off",
                        },
                      ].map(({ key, label, type, placeholder, autoComplete: ac }) => (
                        <div key={key}>
                          <Label className="font-ui font-semibold text-xs text-foreground mb-1 block">
                            {label}
                          </Label>
                          <Input
                            type={type}
                            value={identityData[key] ?? ""}
                            onChange={(e) =>
                              setIdentityData({ ...identityData, [key]: e.target.value })
                            }
                            placeholder={placeholder}
                            autoComplete={ac}
                            className="h-11 rounded-xl text-sm bg-background/50"
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </AccordionContent>
              </AccordionItem>

              {/* Section B: Alamat & Keluarga — COLLAPSED by default */}
              <AccordionItem value="alamat-keluarga">
                <AccordionTrigger className="px-4 sm:px-5 py-3.5 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Home className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="font-ui text-sm font-bold text-foreground">Alamat & Keluarga</p>
                      <p className="font-body text-xs text-muted-foreground">
                        Alamat, RT/RW, No. KK, Status, Pekerjaan
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-5 pb-4">
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="text-sm font-bold text-foreground mb-3 sr-only">
                      Alamat & Keluarga
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          key: "alamat",
                          label: "Alamat Lengkap",
                          type: "textarea",
                          placeholder: "Alamat sesuai KTP",
                          colSpan: true,
                          autoComplete: "street-address address-level1",
                        },
                        {
                          key: "dusun",
                          label: "Dusun",
                          type: "text",
                          placeholder: "Nama dusun",
                          autoComplete: "address-level5",
                        },
                        {
                          key: "rt",
                          label: "RT",
                          type: "text",
                          placeholder: "01",
                          autoComplete: "address-level3",
                        },
                        {
                          key: "rw",
                          label: "RW",
                          type: "text",
                          placeholder: "03",
                          autoComplete: "address-level4",
                        },
                        {
                          key: "desa",
                          label: "Desa / Kelurahan",
                          type: "text",
                          placeholder: "Nama desa",
                          autoComplete: "address-level6",
                        },
                        {
                          key: "no_kk",
                          label: "No. KK",
                          type: "text",
                          placeholder: "Nomor Kartu Keluarga",
                          autoComplete: "off",
                        },
                        {
                          key: "status_kawin",
                          label: "Status Perkawinan",
                          type: "text",
                          placeholder: "Kawin, Belum Kawin, dll",
                          autoComplete: "off",
                        },
                        {
                          key: "pekerjaan",
                          label: "Pekerjaan",
                          type: "text",
                          placeholder: "Contoh: Pedagang",
                          autoComplete: "off",
                        },
                      ].map(({ key, label, type, placeholder, colSpan, autoComplete: ac }) => (
                        <div key={key} className={colSpan ? "sm:col-span-2" : ""}>
                          <Label className="font-ui font-semibold text-xs text-foreground mb-1 block">
                            {label}
                          </Label>
                          {type === "textarea" ? (
                            <Textarea
                              value={identityData[key] ?? ""}
                              onChange={(e) =>
                                setIdentityData({ ...identityData, [key]: e.target.value })
                              }
                              placeholder={placeholder}
                              rows={2}
                              autoComplete={ac}
                              className="rounded-xl text-sm bg-background/50"
                            />
                          ) : (
                            <Input
                              type={type}
                              value={identityData[key] ?? ""}
                              onChange={(e) =>
                                setIdentityData({ ...identityData, [key]: e.target.value })
                              }
                              placeholder={placeholder}
                              autoComplete={ac}
                              className="h-11 rounded-xl text-sm bg-background/50"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <div>
            <Label htmlFor="wa_number" className="text-sm font-semibold text-foreground">
              Nomor WhatsApp aktif <span className="text-destructive">*</span>
            </Label>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Notifikasi status pengajuan akan dikirim ke nomor ini.
            </p>
            <Input
              id="wa_number"
              type="tel"
              inputMode="tel"
              value={contactWa}
              onChange={(e) => setContactWa(e.target.value)}
              placeholder="08xx-xxxx-xxxx"
              autoComplete="tel"
              aria-required="true"
              className="h-14 mt-2 rounded-xl text-base"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION: DETAIL PENGAJUAN ── */}
      {schema.fields.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base">Detail Pengajuan</h3>
          </div>

          {hasAnyAutofill && (
            <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 p-3 mb-4">
              <Sparkles className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <p className="font-ui text-xs text-success">
                <strong>Autofill aktif.</strong> Beberapa field di bawah sudah terisi otomatis dari
                data kependudukan Anda.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {schema.fields.map((f) => (
              <div key={f.key} className={f.colSpan === 2 ? "sm:col-span-2" : ""}>
                <Label className="font-ui font-semibold text-base">
                  {f.label}
                  {f.required && <span className="text-destructive ml-0.5">*</span>}
                  {f.autofill && autofilledKeys.has(f.key) && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-ui font-bold">
                      <Sparkles className="h-2.5 w-2.5" /> Autofill
                    </span>
                  )}
                </Label>
                {f.helper && (
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{f.helper}</p>
                )}
                <div className="mt-2">
                  {f.type === "textarea" ? (
                    <Textarea
                      value={extraData[f.key] ?? ""}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={3}
                      className="rounded-xl"
                    />
                  ) : f.type === "select" ? (
                    <Select value={extraData[f.key] ?? ""} onValueChange={(v) => update(f.key, v)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options?.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type}
                      value={extraData[f.key] ?? ""}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="h-12 rounded-xl"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION: FOTO SELFIE ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-success" />
          <h3 className="font-display font-bold text-base">Foto Selfie dengan KTP</h3>
        </div>
        <p className="font-body text-xs text-muted-foreground mb-4">
          Wajib: foto wajah Anda memegang KTP. Ini sebagai verifikasi bahwa pemohon adalah pemilik
          NIK tersebut.
        </p>

        {selfie?.data_url ? (
          <div className="relative inline-block">
            <img
              src={selfie.data_url}
              alt="Foto selfie"
              className="h-48 w-48 rounded-2xl object-cover border-2 border-success/40"
            />
            <span className="absolute -top-2 -right-2 bg-success text-white rounded-full p-1.5">
              <Check className="h-4 w-4" />
            </span>
            <button
              onClick={() => {
                const idx = attachments.findIndex(isSelfieAttachment);
                const next = [...attachments];
                next.splice(idx, 1);
                setAttachments(next);
              }}
              className="absolute -bottom-2 -right-2 bg-destructive text-white rounded-full p-1.5 hover:bg-destructive/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Hapus foto selfie"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="selfie-input"
            className="flex flex-col items-center justify-center gap-3 p-5 sm:p-8 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-success hover:bg-success/5 transition-all min-h-[44px] focus-within:border-success focus-within:ring-2 focus-within:ring-success focus-within:ring-offset-2"
            aria-label="Ambil atau upload foto selfie dengan KTP"
          >
            <Camera className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-body text-base font-medium text-foreground">
                Ambil atau upload foto selfie
              </p>
              <p className="font-ui text-xs text-muted-foreground mt-1">JPG/PNG · maks 5MB</p>
            </div>
            <input
              id="selfie-input"
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={handleSelfieFile}
            />
          </label>
        )}
      </div>

      {/* ── SECTION: LAMPIRAN ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-base">Dokumen Pendukung</h3>
          <span className="ml-auto font-ui text-xs text-muted-foreground">
            {attachments.filter((a) => !isSelfieAttachment(a)).length}/10 file
          </span>
        </div>

        {attachments.filter((a) => !isSelfieAttachment(a)).length > 0 && (
          <div className="space-y-2 mb-4">
            {attachments
              .filter((a) => !isSelfieAttachment(a))
              .map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border"
                >
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm truncate">{a.name}</p>
                    <p className="font-ui text-[11px] text-muted-foreground">
                      {formatFileSize(a.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachments.indexOf(a))}
                    className="text-muted-foreground hover:text-destructive transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-h-[44px] flex items-center justify-center rounded-lg"
                    aria-label="Hapus lampiran"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}

        <label
          htmlFor="attachment-input"
          className="flex flex-col items-center justify-center gap-2 p-4 sm:p-6 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all min-h-[44px] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
          aria-label="Pilih file dokumen pendukung"
        >
          <Upload className="h-8 w-8" />
          <p className="font-body text-sm text-center">Klik untuk pilih file</p>
          <p className="font-ui text-[11px]">PDF, JPG, PNG · maks 5MB per file</p>
          <input
            id="attachment-input"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </div>

      {/* ── SUBMIT BUTTON ── */}
      <div className="space-y-3">
        <button
          onClick={onSubmit}
          disabled={submitting || !penduduk}
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-ui text-base font-bold hover:bg-primary transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{submitSteps[submittingStep - 1]?.label ?? "Memproses..."}</span>
            </>
          ) : (
            <>
              <Send className="h-6 w-6" />
              Kirim Pengajuan Surat
            </>
          )}
        </button>
        {!penduduk && (
          <p className="text-center font-ui text-xs text-muted-foreground">
            Masukkan NIK Anda terlebih dahulu untuk melanjutkan
          </p>
        )}
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={onBack}
            className="font-ui text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label="Ganti jenis surat"
          >
            <ArrowLeft className="h-4 w-4" /> Ganti jenis surat
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SUCCESS VIEW
════════════════════════════════════════════════════ */
function SuccessView({
  schema,
  nik,
  extraData,
  contactWa,
  onNewSubmission,
}: {
  schema: SuratTemplate | null;
  nik: string;
  extraData: Record<string, string>;
  contactWa: string;
  onNewSubmission: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const no = generateTrackingNumber(schema?.code ?? "SURAT");

  useEffect(() => {
    if (!navigator.onLine) return;
    setTimeout(() => onNewSubmission(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyNo = () => {
    navigator.clipboard.writeText(no).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Success ── */}
      <div className="text-center py-8">
        <div className="inline-flex h-24 w-24 rounded-full bg-success text-background items-center justify-center mb-6 shadow-lg shadow-success/30 animate-bounce-in">
          <CheckCircle2 className="h-14 w-14" strokeWidth={2.5} />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Pengajuan Terkirim!
        </h2>
        <p className="font-body text-muted-foreground mt-3 max-w-md mx-auto">
          Permohonan <strong>{schema?.name}</strong> Anda telah masuk ke sistem dan sedang menunggu
          verifikasi admin desa.
        </p>
      </div>

      {/* ── Tracking Number ── */}
      <div className="rounded-3xl bg-gradient-to-br from-ink via-primary/10 to-primary/5 border-2 border-primary/20 p-5 sm:p-8 text-center shadow-elev">
        <p className="font-ui text-[10px] font-bold text-background/60 uppercase tracking-widest mb-3">
          Nomor Tracking Anda
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <p className="font-mono text-2xl sm:text-3xl font-bold text-background tracking-wider">
            {no}
          </p>
          <button
            onClick={copyNo}
            aria-label="Salin nomor tracking"
            className="h-10 w-10 rounded-xl bg-background/20 flex items-center justify-center hover:bg-background/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-h-[44px] min-w-[44px]"
          >
            {copied ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <Copy className="h-5 w-5 text-background" />
            )}
          </button>
        </div>
        <p className="font-ui text-xs text-background/60 mt-3">
          Simpan nomor ini untuk lacak status pengajuan Anda
        </p>
      </div>

      {/* ── Info Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-info/20 bg-info/5 p-5 flex items-start gap-3">
          <Bell className="h-6 w-6 text-info shrink-0" />
          <div>
            <p className="font-ui text-sm font-bold text-foreground">Notifikasi WhatsApp</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Anda akan menerima update status via WhatsApp di nomor <strong>{contactWa}</strong>.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5 flex items-start gap-3">
          <TrendingUp className="h-6 w-6 text-success shrink-0" />
          <div>
            <p className="font-ui text-sm font-bold text-foreground">Estimasi Proses</p>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              {schema?.eta ?? "1-2 hari kerja"}. Notifikasi akan dikirim setiap ada perubahan
              status.
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/pelayanan/lacak"
          className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary transition-all shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Search className="h-5 w-5" />
          Lacak Pengajuan Saya
        </Link>
        <Link
          to="/pelayanan/e-surat"
          className="flex-1 h-14 rounded-2xl border border-border bg-card text-foreground font-ui text-sm font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <FileText className="h-5 w-5" />
          Ajukan Surat Lain
        </Link>
        <Link
          to="/"
          className="flex-1 h-14 rounded-2xl border border-border bg-card text-foreground font-ui text-sm font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Home className="h-5 w-5" />
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
