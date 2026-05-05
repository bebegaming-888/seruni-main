import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Link } from "@/components/Link";
import {
  requestOtp,
  verifyOtp,
  isWargaLoggedIn,
  getWargaSession,
  saveWargaSession,
  logoutWarga,
} from "@/lib/warga-auth";
import { VILLAGE } from "@/data/site";
import {
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/masuk/warga")({
  head: () => ({
    meta: [
      { title: `Login Warga — Ajukan & Lacak Surat di ${VILLAGE.name}` },
      {
        name: "description",
        content: `Masuk dengan NIK untuk mengajukan surat atau melacak status pengajuan di ${VILLAGE.name}.`,
      },
    ],
  }),
  component: MasukWargaPage,
});

type Step = "nik" | "otp" | "success";

function MasukWargaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("nik");
  const [nik, setNik] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpValue, setOtpValue] = useState(""); // untuk dev mode
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);

  // Redirect jika sudah login
  useEffect(() => {
    if (isWargaLoggedIn()) {
      const session = getWargaSession();
      if (session) {
        toast.info(`Anda sudah login sebagai ${session.warga.nama}`);
      }
      navigate({ to: "/pelayanan/e-surat" });
    }
  }, [navigate]);

  // Auto-submit OTP saat 6 digit terisi
  useEffect(() => {
    if (step === "otp" && otp.replace(/\D/g, "").length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleRequestOtp = async () => {
    const cleanNik = nik.replace(/\D/g, "");
    if (cleanNik.length !== 16) {
      toast.error("NIK harus 16 digit angka");
      return;
    }
    setLoading(true);
    const result = await requestOtp(cleanNik);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setOtpSentTo(result.message);
    if (result.dev_otp) {
      setDevOtp(result.dev_otp);
      toast.info(`[DEV] OTP: ${result.dev_otp}`, { duration: 10000 });
    } else {
      toast.success(result.message);
    }
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 6) return;
    setLoading(true);
    const result = await verifyOtp(nik.replace(/\D/g, ""), cleanOtp);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      setOtp("");
      return;
    }

    saveWargaSession(result.session!);
    toast.success(`Login berhasil! Selamat datang, ${result.session!.warga.nama}`);
    setStep("success");
    setTimeout(() => navigate({ to: "/pelayanan/e-surat" }), 1500);
  };

  const handleLogout = () => {
    logoutWarga();
    toast.success("Berhasil keluar");
    setStep("nik");
    setNik("");
    setOtp("");
    setOtpSentTo("");
    setDevOtp(null);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-base font-bold">
              {VILLAGE.name[0]}
            </div>
            <div>
              <div className="font-display text-sm font-bold leading-tight">{VILLAGE.name}</div>
              <div className="font-ui text-[10px] text-muted-foreground">Sistem Informasi Desa</div>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 font-ui text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Login Warga</h1>
            <p className="font-body text-sm text-muted-foreground">
              Ajukan dan lacak surat dengan NIK + OTP WhatsApp
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="font-ui text-xs text-foreground leading-relaxed">
            <strong>Tanpa password.</strong> Kami akan mengirim kode OTP 6 digit ke nomor WhatsApp
            yang terdaftar di数据库 desa Anda. Tidak punya nomor WA?{" "}
            <Link to="/pelayanan/e-surat" className="text-primary font-semibold hover:underline">
              Ajukan surat tanpa login
            </Link>
            .
          </p>
        </div>

        {/* Step: NIK input */}
        {step === "nik" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
            <div className="space-y-2">
              <label className="font-ui text-xs font-semibold text-foreground block">
                Nomor Induk Kependudukan (NIK)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.slice(0, 16))}
                  placeholder="Masukkan 16 digit NIK"
                  autoFocus
                  className="w-full h-12 rounded-xl border border-border bg-background pl-10 pr-3 font-mono text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              <p className="font-ui text-[11px] text-muted-foreground">
                {nik.replace(/\D/g, "").length}/16 digit
              </p>
            </div>

            <button
              onClick={handleRequestOtp}
              disabled={loading || nik.replace(/\D/g, "").length !== 16}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim OTP…
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Kirim Kode OTP via WhatsApp
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: OTP input */}
        {step === "otp" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
            {/* OTP sent confirmation */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="font-ui text-xs text-foreground">
                {otpSentTo || "Kode OTP sudah dikirim ke WhatsApp Anda."}
              </p>
            </div>

            {/* Dev OTP notice */}
            {devOtp && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <span className="text-warning font-mono font-bold text-sm">DEV: {devOtp}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-ui text-xs font-semibold text-foreground block">
                Kode OTP (6 digit)
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showOtp ? "text" : "tel"}
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="● ● ● ● ● ●"
                  autoFocus
                  className="w-full h-12 rounded-xl border border-border bg-background pl-10 pr-10 font-mono text-xl tracking-[0.3em] text-center text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowOtp((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOtp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="font-ui text-[11px] text-muted-foreground">
                OTP berlaku 5 menit. Masukkan 6 digit kode.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.replace(/\D/g, "").length !== 6}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memverifikasi…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verifikasi & Masuk
                  </>
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep("nik");
                    setOtp("");
                    setDevOtp(null);
                  }}
                  className="font-ui text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Gunakan NIK lain
                </button>
                <button
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="font-ui text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  Kirim Ulang OTP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="rounded-2xl border border-success/20 bg-success/5 p-8 text-center space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-success">Login Berhasil!</h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Mengalihkan ke layanan surat…
              </p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-success" />
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-ui text-[11px] uppercase tracking-wider text-muted-foreground">
            Atau
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Quick actions tanpa login */}
        <div className="space-y-3">
          <Link
            to="/pelayanan/e-surat"
            className="flex items-center justify-between h-12 px-5 rounded-xl border border-border bg-card font-ui text-sm hover:bg-cream transition-colors"
          >
            <span>Ajukan surat tanpa login</span>
            <span className="text-muted-foreground">→</span>
          </Link>
          <Link
            to="/pelayanan/monitoring"
            className="flex items-center justify-between h-12 px-5 rounded-xl border border-border bg-card font-ui text-sm hover:bg-cream transition-colors"
          >
            <span>Cek status pengajuan</span>
            <span className="text-muted-foreground">→</span>
          </Link>
          <Link
            to="/verifikasi/$no"
            relative="path"
            params={{ no: "contoh" }}
            className="flex items-center justify-between h-12 px-5 rounded-xl border border-border bg-card font-ui text-sm hover:bg-cream transition-colors"
          >
            <span>Verifikasi surat via nomor</span>
            <span className="text-muted-foreground">→</span>
          </Link>
        </div>

        {/* Logged in state */}
        {isWargaLoggedIn() && getWargaSession() && (
          <div className="mt-6 rounded-2xl border border-success/20 bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-ui text-xs font-semibold text-success">Logged in as</p>
                <p className="font-display text-sm font-bold mt-0.5">
                  {getWargaSession()!.warga.nama}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  NIK {getWargaSession()!.warga.nik}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive font-ui text-xs font-semibold hover:bg-destructive/10 transition"
              >
                Keluar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
