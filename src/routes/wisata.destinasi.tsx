import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { useSettings, getSettings } from "@/lib/settings-store";

import { Compass, MapPin, Camera, Star, ArrowRight, Info } from "lucide-react";

export const Route = createFileRoute("/wisata/destinasi")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Destinasi Wisata — ${v.name}` },
        {
          name: "description",
          content: `Jelajahi keindahan alam dan destinasi wisata unggulan di ${v.village}.`,
        },
      ],
    };
  },
  component: () => <DestinasiPage />,
});

function DestinationCard({
  item,
}: {
  item: {
    id: string;
    title: string;
    category: string;
    rating: number;
    reviews: number;
    image: string;
    desc: string;
  };
}) {
  const { village: villageName } = useVillage();

  return (
    <div className="group bg-card border border-border rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all duration-500">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
            {item.category}
          </span>
        </div>
      </div>
      <div className="p-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 text-warning">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-ui text-sm font-bold">{item.rating}</span>
          </div>
          <span className="text-muted-foreground text-xs font-body">({item.reviews} ulasan)</span>
        </div>
        <h3 className="font-display text-2xl font-bold text-ink mb-3 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">{item.desc}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="font-ui text-xs font-semibold">{villageName}</span>
          </div>
          <button className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DestinasiPage() {
  const { village: villageName } = useVillage();

  const destinations = [
    {
      id: "1",
      title: `Pantai ${villageName}`,
      category: "Alam",
      rating: 4.8,
      reviews: 124,
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
      desc: "Pantai berpasir putih dengan gradasi air laut biru yang memukau, cocok untuk melihat matahari terbit.",
    },
    {
      id: "2",
      title: "Kampung Tenun Sasak",
      category: "Budaya",
      rating: 4.9,
      reviews: 86,
      image:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800",
      desc: "Pusat kerajinan tenun tradisional di mana pengunjung dapat belajar menenun langsung dari pengrajin lokal.",
    },
    {
      id: "3",
      title: `Bukit ${villageName}`,
      category: "Alam",
      rating: 4.7,
      reviews: 52,
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800",
      desc: "Spot terbaik untuk melihat panorama seluruh desa dan pesisir Pringgabaya dari ketinggian.",
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative text-center lg:text-left grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-6">
                <Compass className="h-3.5 w-3.5" />
                Explorasi Desa
              </div>
              <h1 className="font-display text-5xl sm:text-6xl font-bold text-ink mb-6 tracking-tight leading-[1.1]">
                Temukan Keajaiban <span className="text-primary">Tersembunyi</span>
              </h1>
              <p className="font-body text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Dari pesisir pantai yang tenang hingga warisan budaya yang kental, nikmati
                pengalaman tak terlupakan di destinasi wisata unggulan kami.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <button className="btn-pill bg-ink text-white hover:bg-black px-8">
                  Lihat Semua
                </button>
                <button className="btn-pill border border-border text-ink hover:bg-muted px-8">
                  Peta Wisata
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-[3rem] bg-gradient-to-tr from-primary to-info opacity-10 blur-3xl absolute inset-0 -rotate-12 scale-110" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&q=80&w=400"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1544911845-1f34a3ea3db3?auto=format&fit=crop&q=80&w=400"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1506929662133-570c13349779?auto=format&fit=crop&q=80&w=400"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Quick Filter */}
        <section className="py-12 px-4 border-b border-border">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { icon: Camera, label: "Spot Foto" },
              { icon: Star, label: "Populer" },
              { icon: MapPin, label: "Budaya" },
              { icon: Compass, label: "Alam" },
            ].map((cat, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-3 group text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="h-14 w-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-all group-hover:-translate-y-1">
                  <cat.icon className="h-6 w-6" />
                </div>
                <span className="font-ui text-xs font-bold uppercase tracking-widest">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Destinasi List */}
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((dest) => (
                <DestinationCard key={dest.id} item={dest} />
              ))}
            </div>
          </div>
        </section>

        {/* Information CTA */}
        <section className="px-4 mb-24">
          <div className="max-w-5xl mx-auto p-12 rounded-[3rem] bg-ink text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <path
                  d="M0,50 Q25,0 50,50 T100,50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                <path
                  d="M0,60 Q25,10 50,60 T100,60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                <path
                  d="M0,40 Q25,-10 50,40 T100,40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center text-center lg:text-left">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  Ingin Berkunjung?
                </h2>
                <p className="font-body text-lg text-background/70 mb-8 leading-relaxed">
                  Kami siap membantu merencanakan kunjungan Anda. Dapatkan informasi akomodasi,
                  pemandu lokal, dan tips perjalanan.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button className="w-full sm:w-auto h-14 px-8 rounded-full bg-primary text-primary-foreground font-ui font-bold hover:bg-primary-hover transition-all">
                    Hubungi Tourist Center
                  </button>
                  <div className="flex items-center gap-2 text-background/50 font-ui text-sm italic">
                    <Info className="h-4 w-4" />
                    Buka 08:00 - 20:00 WITA
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                <h4 className="font-display text-xl font-bold mb-6">Tiket Masuk & Parkir</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="font-body text-background/60">Wisatawan Domestik</span>
                    <span className="font-ui font-bold">Rp 10.000</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="font-body text-background/60">Mancanegara</span>
                    <span className="font-ui font-bold">Rp 25.000</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-body text-background/60">Parkir Kendaraan</span>
                    <span className="font-ui font-bold">Rp 2.000 - 5.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
