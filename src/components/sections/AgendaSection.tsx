import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import { useAgendaStore } from "@/lib/content-store";
import { TextReveal } from "@/components/ui/TextReveal";

export function AgendaSection() {
  const items = useAgendaStore((state) => state.items);
  const agenda = items.length > 0 ? items.slice(0, 3) : [];

  return (
    <section
      id="agenda"
      className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-primary mb-3">Agenda Mendatang</p>
            <SectionTitle first="Kalender" second="desa" className="text-ink" />
          </div>
          <Link
            to="/informasi/agenda"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            <TextReveal mode="hover">Semua Agenda</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 inline ml-1" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {agenda.map((a) => (
            <article
              key={a.id}
              className="group rounded-2xl bg-card border border-border p-5 hover:bg-ink hover:text-background transition-all"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="text-center shrink-0">
                  <div className="font-display text-4xl font-bold leading-none text-primary">
                    {a.day}
                  </div>
                  <div className="font-ui text-xs font-bold mt-1 text-muted-foreground group-hover:text-background/60 tracking-wider">
                    {a.month}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground group-hover:bg-background/10 group-hover:text-foreground text-[11px] font-ui font-semibold">
                    {a.category}
                  </span>
                  <h3 className="font-display text-lg font-bold mt-2 leading-tight">
                    <TextReveal mode="hover">{a.title}</TextReveal>
                  </h3>
                </div>
              </div>
              <div className="space-y-2 font-ui text-sm text-muted-foreground group-hover:text-background/70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {a.time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {a.location}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border group-hover:border-background/10">
                <span className="inline-flex items-center gap-1.5 text-xs font-ui font-semibold text-info">
                  <span className="h-1.5 w-1.5 rounded-full bg-info" /> Akan Datang
                </span>
                <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
