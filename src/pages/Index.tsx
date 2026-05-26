import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { TransparansiSection } from "@/components/sections/TransparansiSection";
import { KependudukanSection } from "@/components/sections/KependudukanSection";
import { NewsUpdateSection } from "@/components/sections/NewsUpdateSection";
import { EPasarSection } from "@/components/sections/EPasarSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { SuratSection } from "@/components/sections/SuratSection";
import { ProgramSection } from "@/components/sections/ProgramSection";
import { TestimonialSlider } from "@/components/sections/TestimonialSlider";
import { WisataSection } from "@/components/sections/WisataSection";
import { IDMSection } from "@/components/sections/IDMSection";
import { AgendaSection } from "@/components/sections/AgendaSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { EconomySection } from "@/components/sections/EconomySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { useVillage } from "@/hooks/use-village";
import { useReveal } from "@/hooks/use-reveal";

// Reusable scroll-reveal wrapper for sections with stacking support
function ScrollRevealSection({
  children,
  className = "",
  stackZ = 1,
  overlap = "none",
}: {
  children: React.ReactNode;
  className?: string;
  stackZ?: number;
  overlap?: "none" | "sm" | "md" | "lg" | "xl";
}) {
  const [ref, visible] = useReveal<HTMLDivElement>({ threshold: 0.05 });
  return (
    <div
      ref={ref}
      className={`reveal section-stack stack-z-${stackZ} stack-overlap-${overlap} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const Index = () => {
  const { village, district, regency } = useVillage();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main className="pt-[calc(var(--navbar-height)+var(--safe-area-top)+12px)]">
        <h1 className="sr-only">
          Desa {village} — Portal Resmi {district}, {regency}
        </h1>

        {/* Hero — no overlap */}
        <ScrollRevealSection stackZ={1} overlap="none">
          <HeroSection />
        </ScrollRevealSection>

        {/* 4 new overlapping sections after Hero */}
        <ScrollRevealSection stackZ={2} overlap="md">
          <TransparansiSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={3} overlap="sm">
          <KependudukanSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={4} overlap="none">
          <NewsUpdateSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={5} overlap="md">
          <EPasarSection />
        </ScrollRevealSection>

        {/* Original sections from About onward */}
        <ScrollRevealSection stackZ={6} overlap="none">
          <AboutSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={7} overlap="md">
          <SuratSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={8} overlap="none">
          <ProgramSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={9} overlap="none">
          <TestimonialSlider />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={10} overlap="sm">
          <WisataSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={11} overlap="sm">
          <IDMSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={12} overlap="none">
          <AgendaSection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={13} overlap="md">
          <GallerySection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={14} overlap="none">
          <EconomySection />
        </ScrollRevealSection>
        <ScrollRevealSection stackZ={15} overlap="none">
          <ContactSection />
        </ScrollRevealSection>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
