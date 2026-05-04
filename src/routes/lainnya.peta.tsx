import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { MapLeaflet } from "@/components/ui/map-leaflet";
import { FACILITIES } from "@/data/map-facilities";
import { MapPin, Info, Navigation } from "lucide-react";

export const Route = createFileRoute("/lainnya/peta")({
  head: () => ({
    meta: [
      { title: `Peta Desa — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Peta interaktif wilayah Desa ${VILLAGE.name}. Lokasi kantor desa, fasilitas umum, dan objek wisata.`,
      },
    ],
  }),
  component: PetaPage,
});

export function PetaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Navigation className="h-3.5 w-3.5" />
              Peta Wilayah
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Peta Interaktif
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Jelajahi lokasi penting di {VILLAGE.name} secara interaktif. Klik marker untuk melihat
              detail fasilitas.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <MapPin className="h-3.5 w-3.5" />
                {FACILITIES.length} Titik Lokasi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-3 py-1 font-ui text-xs font-semibold text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Klik marker untuk detail
              </span>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <MapLeaflet height="560px" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
