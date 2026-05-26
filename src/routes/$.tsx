import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/Link";
import { getSettings } from "@/lib/settings-store";
import { useSettings } from "@/lib/settings-store";
import { Home, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/$")({
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `404 — ${s?.village?.name ?? "Halaman Tidak Ditemukan"}` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: NotFoundPage,
});

function NotFoundPage() {
  const { village } = useSettings();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <span className="font-display text-3xl font-bold text-primary">{village.name[0]}</span>
          </div>
        </div>

        {/* 404 */}
        <div>
          <h1 className="font-display text-[120px] font-bold leading-none text-foreground/10 select-none">
            404
          </h1>
          <div className="-mt-8">
            <h2 className="font-display text-2xl font-bold text-ink mb-2">
              Halaman Tidak Ditemukan
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              Halaman yang Anda cari tidak tersedia, telah dipindahkan, atau URL yang Anda masukkan
              salah.
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="rounded-2xl border border-border bg-card p-5 text-left">
          <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Yang bisa Anda lakukan:
          </p>
          <ul className="space-y-2 font-body text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Periksa kembali URL yang Anda ketik
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Kunjungi{" "}
              <Link to="/" className="text-primary font-semibold hover:underline">
                Beranda
              </Link>{" "}
              untuk melihat semua halaman
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Ajukan surat melalui{" "}
              <Link to="/pelayanan/e-surat" className="text-primary font-semibold hover:underline">
                E-Surat
              </Link>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Hubungi kantor desa di {village.phone}
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary px-5 py-2.5 font-ui text-sm font-semibold transition-colors"
          >
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card text-foreground hover:bg-muted px-5 py-2.5 font-ui text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Halaman Sebelumnya
          </button>
        </div>

        {/* Footer note */}
        <p className="font-ui text-xs text-muted-foreground/60">
          {village.name} · {village.district}
        </p>
      </div>
    </div>
  );
}
