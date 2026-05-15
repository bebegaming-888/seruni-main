import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useSettings, getSettings } from "@/lib/settings-store";
import { usePengumumanStore } from "@/lib/content-store";
import { Bell, Info, AlertCircle, Search, Clock, Calendar, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { type PengumumanItem } from "@/lib/content-store";

export const Route = createFileRoute("/informasi/pengumuman")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Pengumuman Desa — ${village.name}` },
        {
          name: "description",
          content: `Informasi dan pengumuman penting bagi warga ${village.name}.`,
        },
      ],
    };
  },
  component: () => <PengumumanPage />,
});

const PRIORITY_STYLES = {
  urgent: {
    badge: "bg-primary text-primary-foreground animate-pulse-soft",
    icon: AlertCircle,
    label: "URGENT",
    border: "border-primary/30",
    bg: "bg-primary/5",
  },
  important: {
    badge: "bg-warning text-ink",
    icon: Bell,
    label: "PENTING",
    border: "border-warning/30",
    bg: "bg-warning/5",
  },
  normal: {
    badge: "bg-muted text-ink",
    icon: Info,
    label: "INFO",
    border: "border-border",
    bg: "bg-card",
  },
};

function AnnouncementCard({ item }: { item: PengumumanItem }) {
  const s =
    PRIORITY_STYLES[item.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.normal;
  const Icon = s.icon;

  return (
    <div
      className={`group rounded-3xl border ${s.border} ${s.bg} p-6 hover:shadow-lg transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-ui font-bold ${s.badge}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {s.label}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="font-ui text-xs">{item.date}</span>
        </div>
      </div>

      <h3 className="font-display text-xl font-bold text-ink leading-tight group-hover:text-primary transition-colors">
        {item.title}
      </h3>
      <p className="font-body text-sm text-muted-foreground mt-3 flex-1 leading-relaxed">
        {item.excerpt}
      </p>

      {item.countdown && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-2xl bg-background/50 border border-border/50">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="font-ui text-xs font-semibold text-primary">{item.countdown}</span>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
        <button className="font-ui text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5 group/btn">
          Lihat Detail
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

export function PengumumanPage() {
  const { village } = useSettings();
  const store = usePengumumanStore();
  const items = store.items;

  useEffect(() => {
    store.load();
  }, [store]);

  const search = useSearch({ from: "/informasi/pengumuman" });
  const navigate = Route.useNavigate();
  const [inputValue, setInputValue] = useState(search.q || "");

  const handleSearch = (val: string) => {
    setInputValue(val);
    navigate({ search: { q: val } });
  };

  const filtered = items.filter((item) => {
    const q = (search.q || "").toLowerCase();
    return !q || item.title.toLowerCase().includes(q) || item.excerpt.toLowerCase().includes(q);
  });

  const urgentCount = items.filter((i) => i.priority === "urgent").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Bell className="h-3.5 w-3.5" />
              Pusat Informasi
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Pengumuman Warga
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Informasi resmi, himbauan, dan pengumuman penting dari Pemerintah {village.name} untuk
              seluruh masyarakat.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <Bell className="h-3.5 w-3.5" />
                {items.length} Pengumuman
              </span>
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary animate-pulse-soft">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {urgentCount} Urgent
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Filter & Search */}
        <section className="px-4 mb-8 -mt-4">
          <div className="max-w-5xl mx-auto">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari pengumuman..."
                className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 font-ui text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-display text-xl font-bold text-ink mb-2">
                  Pengumuman tidak ditemukan
                </p>
                <p className="font-body text-muted-foreground">
                  Coba gunakan kata kunci lain untuk mencari informasi yang Anda butuhkan.
                </p>
                <button
                  onClick={() => handleSearch("")}
                  className="mt-6 btn-pill bg-primary text-primary-foreground hover:opacity-90"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => (
                  <AnnouncementCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
