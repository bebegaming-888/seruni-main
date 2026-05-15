import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "@/components/Link";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
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
  ClipboardList,
  Send,
  Sparkles,
  Trophy,
  Loader2,
  Copy,
  AlertCircle,
  UserCircle,
  LogOut,
  Smartphone,
  Paperclip,
  X,
  FileIcon,
  Upload,
} from "lucide-react";
import { type Penduduk, PENDUDUK_MOCK } from "@/data/penduduk";
import { initTemplateStore, listTemplates, type SuratTemplate } from "@/lib/template-store";
import { lookupPenduduk, type SuratRecord, type Lampiran } from "@/lib/esurat-store";
import { syncSaveRecord } from "@/lib/useSupabaseSync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { enqueueOfflineSubmission } from "@/lib/offline-queue";
import { WifiOff } from "lucide-react";
import { formatDateLong } from "@/lib/utils";
import { notifySurat } from "@/lib/esurat-notif";
import { isWargaLoggedIn, getWargaSession, logoutWarga } from "@/lib/warga-auth";
import { initPendudukStore } from "@/lib/penduduk-store";

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { id: 0, title: "Pilih Surat", desc: "Tentukan jenis layanan", icon: FileText },
  { id: 1, title: "Verifikasi NIK", desc: "Cek data kependudukan", icon: IdCard },
  { id: 2, title: "Identitas", desc: "Konfirmasi data autofill", icon: ShieldCheck },
  { id: 3, title: "Detail Pengajuan", desc: "Lengkapi form khusus", icon: ClipboardList },
  { id: 4, title: "Review & Submit", desc: "Periksa & kirim", icon: Send },
];

function generateTrackingNumber(code: string) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const ts = String(d.getTime()).slice(-6); // last 6 digits of timestamp
  const rand = Math.floor(Math.random() * 9000 + 1000); // extra randomness to prevent guessability
  return `${code}-${yy}${mm}${dd}-${ts}${rand}`;
}

export default function ESurat() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/pelayanan/e-surat" });
  const initial = searchParams.kode ?? "";
  const [step, setStep] = useState<Step>(initial ? 1 : 0);
  const [selectedCode, setSelectedCode] = useState<string>(initial);
  const [nik, setNik] = useState("");
  const [checking, setChecking] = useState(false);
  const [penduduk, setPenduduk] = useState<Penduduk | null>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [autofilledKeys, setAutofilledKeys] = useState<Set<string>>(new Set());
  const [contactWa, setContactWa] = useState("");
  const [attachments, setAttachments] = useState<Lampiran[]>([]);
  const [submitted, setSubmitted] = useState<{
    no: string;
    surat: string;
    cloudSynced?: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // ── Cloudflare Turnstile CAPTCHA ─────────────────────────────────────────
  const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) ?? "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Render Turnstile widget when step reaches 4 (review step)
  useEffect(() => {
    if (step !== 4 || !TURNSTILE_SITE_KEY || !turnstileRef.current) return;

    const container = turnstileRef.current;
    // Skip if already rendered
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      return;
    }

    const init = () => {
      if (typeof window === "undefined" || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
        theme: "auto",
        size: "normal",
      });
    };

    if (window.turnstile) {
      init();
    } else {
      const existing = document.getElementById("turnstile-script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.onload = init;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [step, TURNSTILE_SITE_KEY]);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);

  useEffect(() => {
    let mounted = true;
    initTemplateStore().then(() => {
      if (mounted) {
        setTemplates(listTemplates().filter((t) => t.status === "Disetujui"));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const schema: SuratTemplate | null = useMemo(
    () => (selectedCode ? (templates.find((t) => t.code === selectedCode) ?? null) : null),
    [selectedCode, templates],
  );

  // ── Pre-fill NIK dari session warga yang sudah login ─────────────────────
  // Trigger saat: step 1 (buka halaman) ATAU warga login dari modal di step mana pun
  useEffect(() => {
    if (!penduduk && !autoChecking) {
      const session = getWargaSession();
      if (session?.warga?.nik) {
        setNik(session.warga.nik);
        setAutoChecking(true);
        setTimeout(async () => {
          const found = await lookupPenduduk(session.warga.nik);
          setAutoChecking(false);
          if (found) {
            setPenduduk(found);
            setContactWa(found.no_hp ?? "");
            toast.success("Data Anda dimuat otomatis", {
              description: `Selamat datang, ${found.nama}`,
            });
            // Hanya auto-advance kalau masih di step 1 dan belum ada data
            if (step === 1) setStep(2);
          }
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Autofill extraData dari data penduduk saat masuk Step 4 ───────────────
  useEffect(() => {
    if (step === 3 && penduduk && schema) {
      const newAutofilled = new Set<string>();
      const newData: Record<string, string> = {};
      for (const f of schema.fields) {
        if (f.autofill && !(extraData[f.key] ?? "").trim()) {
          const val = penduduk[f.autofill];
          if (val !== undefined && val !== null && String(val).trim()) {
            newData[f.key] = String(val);
            newAutofilled.add(f.key);
          }
        }
      }
      if (Object.keys(newData).length > 0) {
        setExtraData((prev) => ({ ...newData, ...prev }));
        setAutofilledKeys(newAutofilled);
        toast.info("Beberapa field diisi otomatis dari data kependudukan Anda", {
          duration: 3000,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Scroll to form top when step changes ────────────────────────────────
  useEffect(() => {
    if (step > 0 && !submitted) {
      const el = document.getElementById("form-content");
      if (el) {
        // Jika Hero hilang, kita perlu scroll ke atas container form
        const offset = 100; // navbar + spacing
        const top = el.offsetTop - offset;
        window.scrollTo({ top: top > 0 ? top : 0, behavior: "smooth" });
      }
    } else if (step === 0 || submitted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, submitted]);

  const selectSurat = (code: string) => {
    setSelectedCode(code);
    navigate({
      to: "/pelayanan/e-surat",
      search: { kode: code },
      replace: true,
    });
    setStep(1);
  };

  const checkNik = async () => {
    setNikError(null);
    if (!/^\d{16}$/.test(nik)) {
      setNikError("NIK harus 16 digit angka.");
      return;
    }
    setChecking(true);

    // Ensure penduduk store is initialized before lookup
    // (initAllStores may have been too fast; penduduk-store may have been skipped)
    await initPendudukStore();

    const found = await lookupPenduduk(nik);
    setChecking(false);
    if (!found) {
      setNikError("NIK tidak ditemukan dalam database desa. Silakan hubungi kantor desa.");
      setPenduduk(null);
      return;
    }
    setPenduduk(found);
    setContactWa(found.no_hp ?? "");
    toast.success("Data ditemukan", { description: `Selamat datang, ${found.nama}` });
    setStep(2);
  };

  const validateExtra = () => {
    if (!schema) return false;
    for (const f of schema.fields) {
      if (f.required && !(extraData[f.key] ?? "").toString().trim()) {
        toast.error("Lengkapi data", { description: `Kolom "${f.label}" wajib diisi` });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!contactWa || !/^(\+?62|0)\d{8,13}$/.test(contactWa.replace(/\s|-/g, ""))) {
      toast.error("Nomor WA tidak valid", {
        description: "Gunakan format 08xx atau +62xx (minimal 9 digit setelah kode area)",
      });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    const no = generateTrackingNumber(selectedCode);

    // Bind warga session if logged in — links pemohon to warga record in DB
    const session = isWargaLoggedIn() ? getWargaSession() : null;
    const wargaId: string | undefined = session?.warga?.id;

    const record: SuratRecord = {
      no,
      kode: selectedCode,
      nama_surat: schema?.name ?? "",
      pemohon: penduduk?.nama ?? "",
      nik: penduduk?.nik ?? "",
      kontak: contactWa,
      warga_id: wargaId,
      data: extraData,
      attachments,
      status: "Menunggu Verifikasi",
      created_at: new Date().toISOString(),
    };

    // CAPTCHA guard — offline submissions skip CAPTCHA (enqueued, not submitted directly)
    if (navigator.onLine && TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Verifikasi CAPTCHA diperlukan");
      setSubmitting(false);
      return;
    }
    if (!navigator.onLine) {
      await enqueueOfflineSubmission({ type: "surat", data: record });
      setSubmitted({ no, surat: schema?.name ?? "", cloudSynced: false });
      setSubmitting(false);
      toast.warning("Pengajuan disimpan offline", {
        description: `No. tracking: ${no} — akan dikirim otomatis saat koneksi pulih`,
      });
      return;
    }

    const syncResult = await syncSaveRecord(record, penduduk?.nama ?? "Warga");
    const result = await notifySurat(record, "submit");
    setSubmitted({ no, surat: schema?.name ?? "", cloudSynced: syncResult.cloudSynced });
    setSubmitting(false);
    if (result.ok) {
      toast.success("Pengajuan berhasil dikirim!", {
        description: `No. tracking: ${no} · Notifikasi WA terkirim`,
      });
    } else {
      toast.warning("Pengajuan OK, notifikasi WA gagal", { description: `No. tracking: ${no}` });
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => (s - 1) as Step);
  };

  const canProceedStep2 = !!penduduk;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      {step === 0 && !submitted && (
        <section className="relative pt-28 pb-12 px-4 sm:px-8 bg-gradient-to-br from-ink via-ink to-ink/90 text-background overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, hsl(var(--primary)) 0, transparent 50%), radial-gradient(circle at 80% 70%, hsl(var(--secondary)) 0, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-background/70 hover:text-background mb-6 font-ui text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
            </Link>
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div className="max-w-2xl">
                <p className="eyebrow text-primary mb-3">Layanan Publik · E-Surat</p>
                <h1 className="hero-title text-background">
                  Ajukan surat <em className="not-italic text-primary">online</em> dalam menit.
                </h1>
                <p className="font-body text-background/70 mt-5 text-lg">
                  Verifikasi otomatis lewat NIK, isi formulir terpandu, lacak status real-time.
                  Dokumen final dikirim langsung via WhatsApp.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {isWargaLoggedIn() && getWargaSession() ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/20 border border-success/30 text-success">
                    <UserCircle className="h-4 w-4" />
                    <div className="text-right">
                      <p className="font-ui text-xs font-semibold leading-tight">
                        {getWargaSession()!.warga.nama}
                      </p>
                      <p className="font-mono text-[10px] opacity-80">
                        {getWargaSession()!.warga.nik}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        logoutWarga();
                        toast.success("Berhasil keluar");
                      }}
                      className="ml-1 text-success/70 hover:text-success transition"
                      title="Logout"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/masuk/warga"
                    className="btn-pill bg-background/10 text-background border border-background/20 hover:bg-background/20"
                  >
                    <Smartphone className="h-4 w-4" /> Login Warga
                  </Link>
                )}
                <Link
                  to="/pelayanan/monitoring"
                  className="btn-pill bg-background/10 text-background border border-background/20 hover:bg-background/20"
                >
                  <Search className="h-4 w-4" /> Lacak Pengajuan
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEPPER */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-4">
          {isOffline && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-warning/15 border border-warning/30 text-warning text-xs font-ui font-semibold">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Anda sedang offline. Pengajuan surat tetap bisa disimpan dan akan dikirim saat
                koneksi pulih.
              </span>
            </div>
          )}
          <ol className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <li key={s.id} className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-ui text-sm font-bold transition-all ${
                      done
                        ? "bg-success text-background"
                        : active
                          ? "bg-primary text-primary-foreground shadow-pill scale-105"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden md:block">
                    <div
                      className={`font-ui text-xs font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Langkah {i + 1}
                    </div>
                    <div
                      className={`font-display text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {s.title}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`hidden sm:block h-px w-8 lg:w-16 ${done ? "bg-success" : "bg-border"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* CONTENT */}
      <section id="form-content" className="py-12 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          {submitted ? (
            <SuccessCard data={submitted} />
          ) : (
            <>
              {step === 0 && <StepPilihSurat onSelect={selectSurat} templates={templates} />}
              {step === 1 && (
                <StepVerifikasiNik
                  schema={schema!}
                  nik={nik}
                  setNik={setNik}
                  onCheck={checkNik}
                  checking={checking || autoChecking}
                  error={nikError}
                />
              )}
              {step === 2 && penduduk && (
                <StepIdentitas
                  penduduk={penduduk}
                  contactWa={contactWa}
                  setContactWa={setContactWa}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && schema && (
                <StepDetail
                  schema={schema}
                  data={extraData}
                  setData={setExtraData}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  autofilledKeys={autofilledKeys}
                  onNext={() => {
                    if (validateExtra()) setStep(4);
                  }}
                />
              )}
              {step === 4 && schema && penduduk && (
                <StepReview
                  schema={schema}
                  penduduk={penduduk}
                  extraData={extraData}
                  contactWa={contactWa}
                  attachments={attachments}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  turnstileRef={turnstileRef}
                />
              )}

              {step > 0 && !submitted && (
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={goBack} disabled={submitting}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
                  </Button>
                  {step === 2 && (
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      className="btn-pill bg-primary hover:bg-primary-hover"
                    >
                      Lanjut <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ---------------- STEP COMPONENTS ---------------- */

function StepPilihSurat({
  onSelect,
  templates,
}: {
  onSelect: (code: string) => void;
  templates: SuratTemplate[];
}) {
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats).sort();
  }, [templates]);

  const [activeKat, setActiveKat] = useState(0);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const cat = categories[activeKat];
    let items = templates;
    if (cat) items = items.filter((t) => t.category === cat);
    if (!q.trim()) return items;
    return items.filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(q.toLowerCase()));
  }, [categories, activeKat, q, templates]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary mb-2">Langkah 1</p>
        <h2 className="section-title">Pilih jenis surat</h2>
        <p className="font-body text-muted-foreground mt-2">
          Pilih layanan yang Anda butuhkan. Setiap surat memiliki persyaratan dan estimasi waktu
          berbeda.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setActiveKat(i)}
              className={`btn-pill ${
                activeKat === i
                  ? "bg-ink text-background"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari surat..."
            className="pl-9 rounded-full"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((s) => (
          <button
            key={s.code}
            onClick={() => onSelect(s.code)}
            className="group text-left rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-elev transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-ui text-[11px] font-bold text-primary tracking-widest">
                    {s.code}
                  </span>
                </div>
                <div className="font-display text-lg font-bold text-foreground leading-tight">
                  {s.name}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 font-ui text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {s.eta}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepVerifikasiNik({
  schema,
  nik,
  setNik,
  onCheck,
  checking,
  error,
}: {
  schema: SuratTemplate;
  nik: string;
  setNik: (v: string) => void;
  onCheck: () => void;
  checking: boolean;
  error: string | null;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div className="space-y-6">
        <div>
          <p className="eyebrow text-primary mb-2">Langkah 2</p>
          <h2 className="section-title">Verifikasi NIK Anda</h2>
          <p className="font-body text-muted-foreground mt-2">
            Sistem akan memvalidasi NIK ke database kependudukan desa dan otomatis mengisi data
            identitas Anda.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
          <Label htmlFor="nik" className="font-ui font-semibold">
            Nomor Induk Kependudukan
          </Label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Input
              id="nik"
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="16 digit NIK pada KTP"
              className="font-ui text-lg tracking-wider h-12"
              inputMode="numeric"
            />
            <Button
              onClick={onCheck}
              disabled={checking || nik.length < 16}
              className="btn-pill bg-primary hover:bg-primary-hover h-12 px-6"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Mengecek...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1" /> Cek Data
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="font-ui text-sm">{error}</p>
            </div>
          )}

          {/* DEV-ONLY: Tampilkan NIK contoh hanya di development mode.
              PENTING: Jangan tampilkan di production — data mock bisa mengandung
              data nyata dan melanggar UU PDP. */}
          {import.meta.env.DEV && PENDUDUK_MOCK.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-info/5 border border-info/20">
              <p className="font-ui text-xs font-bold text-info mb-2 uppercase tracking-wider">
                💡 NIK contoh (mode development)
              </p>
              <div className="space-y-1.5">
                {PENDUDUK_MOCK.map((p) => (
                  <button
                    key={p.nik}
                    onClick={() => setNik(p.nik)}
                    className="w-full flex items-center justify-between gap-3 text-left text-xs font-mono hover:bg-info/10 rounded px-2 py-1 transition-colors"
                  >
                    <span className="text-info font-semibold">{p.nik}</span>
                    <span className="text-muted-foreground font-body">{p.nama}</span>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-44 h-fit">
        <SuratInfoCard schema={schema} />
      </aside>
    </div>
  );
}

function StepIdentitas({
  penduduk,
  contactWa,
  setContactWa,
  onNext,
}: {
  penduduk: Penduduk;
  contactWa: string;
  setContactWa: (v: string) => void;
  onNext: () => void;
}) {
  const fields: Array<[string, string]> = [
    ["NIK", penduduk.nik],
    ["Nama Lengkap", penduduk.nama],
    [
      "Tempat, Tanggal Lahir",
      `${penduduk.tempat_lahir}, ${formatDateLong(penduduk.tanggal_lahir)}`,
    ],
    ["Jenis Kelamin", penduduk.jenis_kelamin],
    ["Agama", penduduk.agama],
    ["Status Perkawinan", penduduk.status_perkawinan],
    ["Pekerjaan", penduduk.pekerjaan],
    ["Kewarganegaraan", penduduk.kewarganegaraan],
    ["No. KK", penduduk.no_kk],
    ["RT/RW", `${penduduk.rt}/${penduduk.rw}`],
    ["Dusun", penduduk.dusun],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary mb-2">Langkah 3</p>
        <h2 className="section-title">Konfirmasi data identitas</h2>
        <p className="font-body text-muted-foreground mt-2">
          Data berikut diambil otomatis dari database kependudukan. Bila ada kesalahan, hubungi
          kantor desa untuk pembaruan.
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border-2 border-primary/20 p-6 sm:p-8 shadow-card">
        <div className="flex items-start gap-4 pb-6 border-b border-border">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-ui text-xs font-bold text-success uppercase tracking-wider">
              ✓ Data ditemukan & autofill
            </p>
            <h3 className="font-display text-2xl font-bold mt-1">{penduduk.nama}</h3>
            <p className="font-body text-sm text-muted-foreground">
              Warga Desa {penduduk.desa}, Kec. {penduduk.kecamatan}
            </p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 pt-6">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {k}
              </dt>
              <dd className="font-body text-sm text-foreground mt-0.5">{v}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Alamat
            </dt>
            <dd className="font-body text-sm text-foreground mt-0.5">
              {penduduk.alamat}, RT {penduduk.rt}/RW {penduduk.rw}, Dusun {penduduk.dusun}, Desa{" "}
              {penduduk.desa}, Kec. {penduduk.kecamatan}, {penduduk.kabupaten}, {penduduk.provinsi}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6">
        <Label htmlFor="wa" className="font-ui font-semibold">
          Nomor WhatsApp aktif <span className="text-destructive">*</span>
        </Label>
        <p className="font-body text-xs text-muted-foreground mt-1 mb-3">
          Notifikasi status & file dokumen akan dikirim ke nomor ini.
        </p>
        <Input
          id="wa"
          value={contactWa}
          onChange={(e) => setContactWa(e.target.value)}
          placeholder="08xx-xxxx-xxxx"
          className="h-11"
        />
      </div>
    </div>
  );
}

function StepDetail({
  schema,
  data,
  setData,
  attachments,
  setAttachments,
  autofilledKeys,
  onNext,
}: {
  schema: SuratTemplate;
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
  attachments: Lampiran[];
  setAttachments: (a: Lampiran[]) => void;
  autofilledKeys: Set<string>;
  onNext: () => void;
}) {
  const update = (k: string, v: string) => setData({ ...data, [k]: v });

  const hasAnyAutofill = schema.fields.some((f) => f.autofill && autofilledKeys.has(f.key));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = 10 - attachments.length;
    if (files.length > remaining) {
      toast.error(`Maksimal 10 lampiran. Anda bisa menambahkan ${remaining} file lagi.`);
      return;
    }

    const newFiles: Lampiran[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} terlalu besar. Maks 5MB per file.`);
        continue;
      }
      const data_url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: file.type, size: file.size, data_url });
    }

    setAttachments([...attachments, ...newFiles]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) =>
    setAttachments(attachments.filter((_, i) => i !== index));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary mb-2">Langkah 4</p>
        <h2 className="section-title">Detail pengajuan</h2>
        <p className="font-body text-muted-foreground mt-2">
          Lengkapi data khusus untuk <strong>{schema.name}</strong>.
        </p>
      </div>

      {/* Banner autofill */}
      {hasAnyAutofill && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/8 px-4 py-3">
          <Sparkles className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <p className="font-ui text-xs text-success leading-relaxed">
            <strong>Autofill aktif.</strong> Beberapa field di bawah diisi otomatis dari data
            kependudukan Anda. Anda tetap bisa mengubahnya jika diperlukan.
          </p>
        </div>
      )}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
        <div className="grid sm:grid-cols-2 gap-5">
          {schema.fields.map((f) => (
            <div key={f.key} className={f.colSpan === 2 ? "sm:col-span-2" : ""}>
              <Label className="font-ui font-semibold">
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
                    value={data[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                ) : f.type === "select" ? (
                  <Select value={data[f.key] ?? ""} onValueChange={(v) => update(f.key, v)}>
                    <SelectTrigger>
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
                    value={data[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lampiran section */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-base">Lampiran Dokumen</h3>
          <span className="ml-auto font-ui text-xs text-muted-foreground">
            {attachments.length}/10 file · maks 5MB per file
          </span>
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2 mb-4">
            {attachments.map((a, i) => (
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
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            attachments.length >= 10
              ? "border-muted text-muted-foreground cursor-not-allowed"
              : "border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary"
          }`}
        >
          <Upload className="h-6 w-6" />
          <p className="font-body text-sm text-center">
            {attachments.length >= 10
              ? "Maksimal 10 lampiran tercapai"
              : "Klik untuk pilih file atau drag &amp; drop di sini"}
          </p>
          <p className="font-ui text-[11px] text-muted-foreground">
            PDF, JPG, PNG · maks 5MB per file
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            disabled={attachments.length >= 10}
            className="sr-only"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="btn-pill bg-primary hover:bg-primary-hover">
          Lanjut Review <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function StepReview({
  schema,
  penduduk,
  extraData,
  contactWa,
  attachments,
  onSubmit,
  submitting,
  turnstileRef,
}: {
  schema: SuratTemplate;
  penduduk: Penduduk;
  extraData: Record<string, string>;
  contactWa: string;
  attachments: Lampiran[];
  onSubmit: () => void;
  submitting: boolean;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary mb-2">Langkah 5</p>
        <h2 className="section-title">Review & submit</h2>
        <p className="font-body text-muted-foreground mt-2">
          Periksa kembali sebelum dikirim. Setelah submit, pengajuan akan masuk antrean verifikasi
          admin.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-6 py-4 bg-ink text-background flex items-center justify-between">
          <div>
            <p className="font-ui text-xs uppercase tracking-widest text-background/60">
              Jenis Surat
            </p>
            <p className="font-display text-lg font-bold">{schema.name}</p>
          </div>
          <span className="font-ui text-xs font-bold text-primary bg-background/10 px-3 py-1 rounded-full">
            {schema.code}
          </span>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <ReviewRow label="Pemohon" value={penduduk.nama} />
          <ReviewRow label="NIK" value={penduduk.nik} />
          <ReviewRow
            label="Alamat"
            value={`${penduduk.alamat}, RT ${penduduk.rt}/RW ${penduduk.rw}`}
            colSpan
          />
          <ReviewRow label="Kontak WA" value={contactWa} />
          <ReviewRow label="Estimasi" value={schema.eta} />
        </div>
        {schema.fields.length > 0 && (
          <div className="px-6 pb-6">
            <p className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Detail Pengajuan
            </p>
            <div className="rounded-xl bg-muted p-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {schema.fields.map((f) => (
                <ReviewRow
                  key={f.key}
                  label={f.label}
                  value={extraData[f.key] || "—"}
                  colSpan={f.colSpan === 2}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 bg-muted border-b border-border">
            <p className="font-ui text-xs font-bold uppercase tracking-wider">
              Lampiran ({attachments.length} file)
            </p>
          </div>
          <div>
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-6 py-3 border-b border-border last:border-b-0"
              >
                <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm truncate">{a.name}</p>
                  <p className="font-ui text-[11px] text-muted-foreground">
                    {a.type.split("/")[1]?.toUpperCase() ?? "FILE"} · {formatSize(a.size)}
                  </p>
                </div>
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <p className="font-body text-sm text-foreground">
          Dengan mengirim, saya menyatakan data di atas <strong>benar dan sah</strong>. Pemberian
          data palsu dapat dikenakan sanksi sesuai peraturan yang berlaku.
        </p>
      </div>

      {/* Cloudflare Turnstile CAPTCHA */}
      {turnstileRef && (
        <div className="flex justify-start">
          <div ref={turnstileRef} />
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="btn-pill bg-primary hover:bg-primary-hover h-12 px-8"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" /> Kirim Pengajuan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, colSpan }: { label: string; value: string; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <p className="font-ui text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="font-body text-sm text-foreground mt-0.5 break-words">{value}</p>
    </div>
  );
}

function SuratInfoCard({ schema }: { schema: SuratTemplate }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <span className="font-ui text-xs font-bold text-primary tracking-widest">{schema.code}</span>
      <h3 className="font-display text-xl font-bold mt-1">{schema.name}</h3>
      <p className="font-body text-sm text-muted-foreground mt-2">{schema.description}</p>

      <div className="flex items-center gap-2 mt-4 font-ui text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Estimasi: <strong className="text-foreground">{schema.eta}</strong>
      </div>

      <div className="mt-5">
        <p className="font-ui text-xs font-bold text-foreground uppercase tracking-wider mb-2">
          Persyaratan
        </p>
        <ul className="space-y-1.5">
          {schema.syarat.map((s) => (
            <li key={s} className="flex items-start gap-2 font-body text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SuccessCard({ data }: { data: { no: string; surat: string; cloudSynced?: boolean } }) {
  const syncConfigured = typeof window !== "undefined" && isSupabaseConfigured;
  const syncedCloud = data.cloudSynced === true;
  const storedLocal =
    data.cloudSynced === false || (syncConfigured && data.cloudSynced === undefined);
  const noCloud = !syncConfigured || data.cloudSynced === false;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-success/10 via-card to-primary/5 border-2 border-success/30 p-8 sm:p-12 text-center shadow-elev">
      <div className="inline-flex h-20 w-20 rounded-full bg-success text-background items-center justify-center mb-6 animate-pulse">
        <Check className="h-10 w-10" strokeWidth={3} />
      </div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold">Pengajuan Terkirim!</h2>
      <p className="font-body text-muted-foreground mt-3 max-w-md mx-auto">
        Permohonan <strong>{data.surat}</strong> Anda telah masuk ke sistem dan sedang menunggu
        verifikasi admin desa.
      </p>

      <div className="mt-8 inline-block rounded-2xl bg-ink text-background px-6 py-4">
        <p className="font-ui text-[11px] uppercase tracking-widest text-background/60">
          Nomor Tracking
        </p>
        <p className="font-mono text-2xl font-bold tracking-wider mt-1">{data.no}</p>
      </div>

      {/* Sync status badge */}
      {noCloud ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning border border-warning/30 px-3 py-1.5 text-xs font-ui">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
          Data tersimpan di perangkat
        </div>
      ) : syncedCloud ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success border border-success/30 px-3 py-1.5 text-xs font-ui">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848Zm-10.5 0V6a2.25 2.25 0 0 1 2.25-2.25h.75A2.25 2.25 0 0 1 15 5.25v9.75a2.25 2.25 0 0 1-4.5 0v-4.5Z"
            />
          </svg>
          Tersimpan di server
        </div>
      ) : (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning border border-warning/30 px-3 py-1.5 text-xs font-ui">
          <svg
            className="h-3.5 w-3.5 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          Sync sedang proses…
        </div>
      )}

      <p className="font-body text-sm text-muted-foreground mt-6 max-w-lg mx-auto">
        Simpan nomor tracking di atas. Anda akan menerima pemberitahuan via WhatsApp pada setiap
        perubahan status.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/pelayanan/monitoring"
          className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Search className="h-4 w-4" /> Lacak Pengajuan
        </Link>
        <Link to="/pelayanan/e-surat" className="btn-pill bg-muted text-foreground hover:bg-accent">
          Ajukan Surat Lain
        </Link>
        <Link
          to="/"
          className="btn-pill bg-background border border-border text-foreground hover:bg-muted"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
