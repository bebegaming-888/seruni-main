import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import { MapLeaflet } from "@/components/ui/map-leaflet";
import { FACILITIES } from "@/data/map-facilities";
import { MapPin, Info, Navigation } from "lucide-react";

export const Route = createFileRoute("/lainnya/peta")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Peta Desa — ${village.name}` },
        {
          name: "description",
          content: `Peta interaktif wilayah Desa ${village.name}. Lokasi kantor desa, fasilitas umum, dan objek wisata.`,
        },
      ],
    };
  },
  component: () => <PetaPage />,
});

export function PetaPage() {
  const { village } = useSettings();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Peta"
          titleSecond="Interaktif"
          description={"Jelajahi lokasi penting di " + (village as { name?: string }).name + " secara interaktif."}
          badge="Peta Wilayah"
          badgeIcon={<Navigation className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Lainnya" }, { label: "Peta" }]}
        />

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
