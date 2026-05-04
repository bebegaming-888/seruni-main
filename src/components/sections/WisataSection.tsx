import { SectionTitle } from "@/components/site/SectionTitle";
import { useState } from "react";
import { Link } from "@/components/Link";
import { ArrowUpRight, Star, Cloud } from "lucide-react";
import pantai from "@/assets/wisata-pantai.jpg";
import airterjun from "@/assets/wisata-airterjun.jpg";
import budaya from "@/assets/wisata-budaya.jpg";

const wisata = [
  {
    img: pantai,
    name: "Pantai Mumbul",
    category: "Alam",
    desc: "Pasir putih dan air biru jernih dengan perahu nelayan tradisional.",
    weather: "29°C",
    rating: 4.8,
  },
  {
    img: airterjun,
    name: "Air Terjun Seruni",
    category: "Alam",
    desc: "Air terjun jernih di tengah hutan Lombok yang asri.",
    weather: "26°C",
    rating: 4.9,
  },
  {
    img: budaya,
    name: "Sentra Tenun Sasak",
    category: "Budaya",
    desc: "Pusat kerajinan tenun tradisional dengan motif khas Lombok.",
    weather: "28°C",
    rating: 4.7,
  },
];

const filters = ["Semua", "Alam", "Budaya", "Kuliner", "Homestay"];

export function WisataSection() {
  const [filter, setFilter] = useState("Semua");
  const list = filter === "Semua" ? wisata : wisata.filter((w) => w.category === filter);

  return (
    <section id="wisata" className="py-20 sm:py-28 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="eyebrow text-primary mb-3">Destinasi Wisata</p>
            <SectionTitle first="Pesona" second="desa" className="text-ink" />
          </div>
          <Link
            to="/wisata/destinasi"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            Eksplorasi Wisata
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-pill border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-ink border-border hover:border-primary"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {list.map((w) => (
            <article
              key={w.name}
              className="group rounded-3xl overflow-hidden bg-card border border-border hover:shadow-elev transition-shadow"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={w.img}
                  alt={w.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  width={1024}
                  height={1280}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-white/95 text-ink text-[11px] font-ui font-semibold">
                    {w.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-ink text-[11px] font-ui font-semibold">
                    <Cloud className="h-3 w-3" /> {w.weather}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-ui text-sm font-semibold">{w.rating}</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight">{w.name}</h3>
                  <p className="font-body text-sm text-white/80 mt-1.5 line-clamp-2">{w.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
