import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, QrCode, FileCheck, Loader2, ArrowRight } from "lucide-react";
import { getVillage } from "@/lib/village-dynamic";
import { useVillage } from "@/hooks/use-village";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";

export const Route = createFileRoute("/verifikasi")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: "Verifikasi Surat — " + v.name },
        {
          name: "description",
          content:
            "Cek keabsahan dokumen surat dari Desa " +
            v.village +
            ". Masukkan nomor surat atau scan QR code.",
        },
      ],
    };
  },
  component: VerifikasiPage,
});

function VerifikasiPage() {
  const { village: villageName, inisial_desa, inisial_jabatan } = useVillage();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    // Navigate to the dynamic route for this number
    window.location.href = `/verifikasi/${encodeURIComponent(trimmed)}`;
  };

  // Sanitasi: hanya alphanumeric + dash + slash + spasi + titik untuk nomor surat.
  // Mencegah XSS via dangerouslySetInnerHTML di list item.
  // placeholderExample sudah alphanumeric dari useVillage() — defense in depth.
  const raw = `474/0001/${inisial_jabatan}.${inisial_desa}/V/${new Date().getFullYear()}`;
  const placeholderExampleSafe = raw.replace(/[^a-zA-Z0-9/\s.,-]/g, "").slice(0, 120);
  // placeholderExampleSafe is alphanumeric-only — direct JSX interpolation is safe

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHero
        titleFirst="Verifikasi"
        titleSecond="Dokumen"
        description="Cek keabsahan dokumen surat dari desa."
        badge="Verifikasi Surat"
        badgeIcon={<QrCode className="h-3.5 w-3.5" />}
      />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Contoh: ${placeholderExampleSafe}`}
              className="w-full h-12 pl-12 pr-32 rounded-2xl border border-border bg-card font-ui text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-5 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-semibold hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Cek
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-ui text-sm font-semibold text-foreground mb-1">Nomor Surat</p>
                <p className="font-body text-xs text-muted-foreground leading-relaxed">
                  Masukkan nomor surat lengkap yang tercetak di dokumen (misal:{" "}
                  <span className="font-mono text-[10px]">{placeholderExampleSafe}</span>)
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10">
                <QrCode className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-ui text-sm font-semibold text-foreground mb-1">QR Code</p>
                <p className="font-body text-xs text-muted-foreground leading-relaxed">
                  Scan QR code yang tercetak di pojok dokumen surat — akan langsung membuka halaman
                  verifikasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How to find the number */}
        <div className="rounded-2xl border border-border bg-muted/30 p-5">
          <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cara menemukan nomor surat
          </p>
          <ol className="space-y-2">
            {[
              "Lihat di bagian atas dokumen surat — setelah logo desa",
              "Biasanya dimulai dengan kode klasifikasi (misal: 474/, 475/)",
              "Contoh lengkap: ",
              "Jika tidak menemukan, hubungi kantor desa untuk konfirmasi",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 font-body text-xs text-muted-foreground"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-ui text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {/* Safe: all items are plain text, no HTML needed */}
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <Footer />
    </div>
  );
}
