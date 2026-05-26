import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, AlertCircle, Info, Bell } from "lucide-react";
import { usePengumumanStore } from "@/lib/content-store";
import { TextReveal } from "@/components/ui/TextReveal";

const styles = {
  urgent: {
    badge: "bg-primary text-primary-foreground animate-pulse-soft",
    icon: AlertCircle,
    label: "URGENT",
  },
  important: { badge: "bg-warning text-ink", icon: Bell, label: "PENTING" },
  normal: { badge: "bg-muted text-ink", icon: Info, label: "INFO" },
};

export function AnnouncementSection() {
  const items = usePengumumanStore((state) => state.items);
  const pengumuman = items.length > 0 ? items.slice(0, 3) : [];

  return (
    <section
      id="pengumuman"
      className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-primary mb-3">Pengumuman</p>
            <SectionTitle first="Info" second="penting" className="text-ink" />
          </div>
          <Link
            to="/informasi/pengumuman"
            className="btn-pill bg-cream text-ink hover:bg-ink hover:text-background group"
          >
            <TextReveal mode="hover">Semua Pengumuman</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 inline ml-1" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {pengumuman.map((p) => {
            const s = styles[p.priority];
            const Icon = s.icon;
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 hover:shadow-card transition-shadow flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-ui font-bold ${s.badge}`}
                  >
                    <Icon className="h-3 w-3" />
                    {s.label}
                  </span>
                  {p.countdown && (
                    <span className="font-ui text-xs text-muted-foreground">⏱ {p.countdown}</span>
                  )}
                </div>
                <h3 className="font-display text-lg font-bold text-ink leading-tight mb-1">
                  <TextReveal mode="hover">{p.title}</TextReveal>
                </h3>
                <p className="font-body text-xs text-muted-foreground flex-1 line-clamp-2">
                  {p.excerpt}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="font-ui text-xs text-muted-foreground">{p.date}</span>
                  <Link
                    to="/informasi/pengumuman"
                    className="font-ui text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Selengkapnya <ArrowUpRight className="h-3 w-3 inline" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
