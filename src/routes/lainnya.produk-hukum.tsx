import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import { useProdukHukumStore } from "@/lib/content-store";
import {
  Scale,
  FileText,
  Download,
  Search,
  BookOpen,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { ProdukHukumItem } from "@/lib/content-store";

export const Route = createFileRoute("/lainnya/produk-hukum")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Produk Hukum — ${village.name}` },
        {
          name: "description",
          content: `Daftar Peraturan Desa (Perdes), Peraturan Kepala Desa, dan produk hukum lainnya di ${village.name}.`,
        },
      ],
    };
  },
  component: () => <ProdukHukumPage />,
});

export function ProdukHukumPage() {
  const { village } = useSettings();
  const { items: docsItems } = useProdukHukumStore();
  const [activeTab, setActiveTab] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const types = ["Semua", "Perdes", "Perkades", "Kepdes"];

  const docsData: ProdukHukumItem[] = docsItems.length
    ? docsItems
    : [
        {
          id: "1",
          type: "Perdes",
          title: "Perdes No. 4 Tahun 2024 tentang APBDes TA 2025",
          year: "2024",
          size: "1.2 MB",
          url: "#",
          description: "Mengatur anggaran pendapatan dan belanja desa tahun anggaran 2025",
        },
        {
          id: "2",
          type: "Perdes",
          title: "Perdes No. 3 Tahun 2024 tentang RKPDes 2025",
          year: "2024",
          size: "2.4 MB",
          url: "#",
          description: "Rencana kerja pembangunan desa tahun 2025",
        },
        {
          id: "3",
          type: "Perkades",
          title: "Perkades No. 8 Tahun 2024 tentang Penyaluran BLT Dana Desa",
          year: "2024",
          size: "0.8 MB",
          url: "#",
          description: "Pedoman penyaluran bantuan langsung tunai dana desa",
        },
        {
          id: "4",
          type: "Perdes",
          title: "Perdes No. 1 Tahun 2023 tentang Pelestarian Budaya Tenun",
          year: "2023",
          size: "3.1 MB",
          url: "#",
          description: "Pelestarian dan pengembangan warisan budaya tenun desa",
        },
        {
          id: "5",
          type: "Kepdes",
          title: "Keputusan Kepala Desa No. 12 Tahun 2024 tentang Pengurus BUMDes",
          year: "2024",
          size: "1.1 MB",
          url: "#",
          description: "Pembentukan pengurus Badan Usaha Milik Desa",
        },
      ];

  const filtered = docsData.filter((d) => {
    const matchesTab = activeTab === "Semua" || d.type === activeTab;
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleDownload = (doc: ProdukHukumItem) => {
    if (doc.url && doc.url !== "#") {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    } else {
      toast.info(
        `PDF "${doc.title}" belum tersedia. Hubungi Sekretariat Desa untuk salinan resmi.`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Produk"
          titleSecond="Hukum"
          description={
            "Transparansi landasan hukum dan peraturan di " +
            (village as { name?: string }).name +
            "."
          }
          badge="Regulasi Desa"
          badgeIcon={<Scale className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Lainnya" }, { label: "Produk Hukum" }]}
        />

        {/* Filter & Search */}
        <section className="px-4 mb-8 -mt-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-full font-ui text-xs font-bold transition-all ${
                    activeTab === t
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari peraturan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-card font-ui text-sm focus:border-primary/50 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 mb-24">
          <div className="max-w-5xl mx-auto">
            {filtered.length === 0 ? (
              <div className="rounded-[2.5rem] border border-border bg-card p-20 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="font-display text-xl font-bold text-ink">
                  Produk hukum tidak ditemukan
                </p>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Coba gunakan kata kunci lain.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4 sm:mb-0">
                      <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                        <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-ui text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                            {doc.type}
                          </span>
                          <span className="font-ui text-[10px] font-bold text-primary/50">
                            TA {doc.year}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-ink leading-snug group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="font-body text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-10">
                      <div className="text-right hidden md:block">
                        <div className="font-ui text-[10px] font-bold text-muted-foreground uppercase">
                          Ukuran
                        </div>
                        <div className="font-display text-sm font-bold text-ink">{doc.size}</div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="h-12 w-12 rounded-2xl bg-ink text-white hover:bg-primary transition-colors flex items-center justify-center shrink-0"
                        title={doc.url && doc.url !== "#" ? "Unduh PDF" : "PDF belum tersedia"}
                      >
                        {doc.url && doc.url !== "#" ? (
                          <Download className="h-5 w-5" />
                        ) : (
                          <ExternalLink className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-16 p-8 rounded-3xl bg-info/5 border border-info/10 flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-info mt-0.5" />
              <div>
                <h4 className="font-display text-lg font-bold text-ink">Informasi Regulasi</h4>
                <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">
                  Sesuai dengan UU Desa, setiap produk hukum desa wajib dipublikasikan untuk dapat
                  diakses oleh masyarakat. Jika Anda memerlukan salinan fisik atau arsip yang lebih
                  lama, silakan hubungi Sekretariat Desa.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
