import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { NewsSection } from "@/components/sections/NewsSection";
import { AnnouncementSection } from "@/components/sections/AnnouncementSection";
import { SuratSection } from "@/components/sections/SuratSection";
import { WisataSection } from "@/components/sections/WisataSection";
import { IDMSection } from "@/components/sections/IDMSection";
import { AgendaSection } from "@/components/sections/AgendaSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { EconomySection } from "@/components/sections/EconomySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { useVillage } from "@/hooks/use-village";

const Index = () => {
  const { village, district, regency } = useVillage();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main>
        <h1 className="sr-only">
          Desa {village} — Portal Resmi {district}, {regency}
        </h1>
        <HeroSection />
        <AboutSection />
        <NewsSection />
        <AnnouncementSection />
        <SuratSection />
        <WisataSection />
        <IDMSection />
        <AgendaSection />
        <GallerySection />
        <EconomySection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
