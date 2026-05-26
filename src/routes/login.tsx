import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { login as authLogin, isLoggedIn, loginHybrid } from "@/lib/auth";
import { logAudit } from "@/lib/settings-store";
import { Link } from "@/components/Link";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getSettings, useSettings } from "@/lib/settings-store";

// Turnstile site key — set via environment variables
// Jika tidak ada atau di dev mode, widget tidak di-render
const TURNSTILE_SITE_KEY = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "");

export const Route = createFileRoute("/login")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Login Admin — ${village.name}` },
        { name: "description", content: "Halaman login admin Sistem Informasi Desa." },
      ],
      links: TURNSTILE_SITE_KEY
        ? [{ rel: "preconnect", href: "https://challenges.cloudflare.com" }]
        : [],
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { village } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

  useEffect(() => {
    if (isLoggedIn()) navigate({ to: "/admin" });
  }, [navigate]);

  // Inisialisasi Turnstile setelah mount
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;

    const container = turnstileRef.current;
    if (widgetIdRef.current) return; // sudah di-render

    const renderWidget = () => {
      if (typeof window === "undefined" || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
        theme: "light",
      });
    };

    // Cek apakah script Turnstile sudah dimuat
    if (window.turnstile) {
      renderWidget();
    } else {
      // Inject script Turnstile jika belum ada
      const existing = document.getElementById("turnstile-script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = "";
      }
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Username dan password wajib diisi", {
        description: "Masukkan email/username dan password untuk masuk.",
      });
      return;
    }

    // Jika Turnstile aktif, validasi token sebelum submit
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Verifikasi keamanan belum selesai. Silakan selesaikan CAPTCHA terlebih dahulu.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    // Hybrid login: edge function first (httpOnly cookie) → local fallback
    const result = await loginHybrid(email, password, remember);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error ?? "Login gagal");
      return;
    }

    const session = result.session!;
    logAudit(session.username, "Login", session.role);
    toast.success(`Selamat datang, ${session.name}`, {
      description: "Anda telah masuk ke dashboard admin.",
    });
    navigate({ to: "/admin" });
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left visual panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-hover p-10 text-primary-foreground">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3 z-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 font-display text-lg font-bold">
            S
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold">{village.name}</div>
            <div className="font-ui text-xs text-white/70">Sistem Informasi Desa</div>
          </div>
        </Link>

        <div className="relative z-10 space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 font-ui text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Portal Admin Resmi
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Selamat datang kembali di Dashboard Pelayanan Desa
          </h1>
          <p className="font-body text-white/80">
            Kelola permohonan surat, verifikasi data penduduk, dan layani warga dengan cepat melalui
            satu sistem terintegrasi.
          </p>

          <ul className="space-y-3 pt-4">
            {[
              "Verifikasi & Approval Surat Online",
              "E-Signature dengan QR Code",
              "Notifikasi WhatsApp Otomatis",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 font-ui text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 font-ui text-xs text-white/60">
          © {new Date().getFullYear()} {village.name}. All rights reserved.
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="lg:hidden mb-8 inline-flex items-center gap-2 font-ui text-sm text-muted-foreground hover:text-primary"
          >
            ← Kembali ke beranda
          </Link>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-ink">Login Admin</h2>
            <p className="font-body text-sm text-muted-foreground mt-2">
              Masuk untuk mengakses dashboard pelayanan desa.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="font-ui text-xs font-semibold text-ink mb-1.5 block">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@desa.id"
                  autoComplete="username"
                  className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-3 font-ui text-sm text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="font-ui text-xs font-semibold text-ink mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-10 font-ui text-sm text-ink placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                  aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {TURNSTILE_SITE_KEY ? (
              <div>
                <div ref={turnstileRef} className="flex justify-start" />
                {!turnstileToken && (
                  <p className="flex items-center gap-1.5 mt-2 font-ui text-[11px] text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    Mohon selesaikan verifikasi untuk melanjutkan
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-cream/40 p-3 text-center">
                <p className="font-ui text-[11px] text-muted-foreground">
                  Mode dev — set VITE_TURNSTILE_SITE_KEY untuk mengaktifkan CAPTCHA
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 font-ui text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Ingat saya
              </label>
              <button
                type="button"
                onClick={() =>
                  toast.info("Hubungi operator desa untuk reset password", {
                    description: "Hubungi Sekretariat Desa jika lupa password.",
                  })
                }
                className="font-ui text-xs font-semibold text-primary hover:underline"
              >
                Lupa password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Masuk Dashboard
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="rounded-xl border border-dashed border-border bg-cream/40 p-3 text-center">
              <p className="font-ui text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Akun Admin Tetap
              </p>
              <p className="font-ui text-xs text-muted-foreground">
                Hubungi operator desa untuk akses admin panel.
              </p>
            </div>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-ui text-[11px] uppercase tracking-wider text-muted-foreground">
              Atau
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/pelayanan/e-surat"
              className="h-11 rounded-xl border border-border bg-card font-ui text-xs font-semibold text-ink hover:bg-cream transition-colors inline-flex items-center justify-center"
            >
              Ajukan Surat
            </Link>
            <Link
              to="/pelayanan/monitoring"
              className="h-11 rounded-xl border border-border bg-card font-ui text-xs font-semibold text-ink hover:bg-cream transition-colors inline-flex items-center justify-center"
            >
              Cek Status
            </Link>
          </div>

          <p className="mt-8 text-center font-ui text-xs text-muted-foreground">
            Belum punya akun admin?{" "}
            <span className="text-ink font-semibold">Hubungi Sekretariat Desa</span>
          </p>
        </div>
      </section>
    </main>
  );
}
