import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import { AGENDA } from "@/data/site";

export function AgendaSection() {
  return (
    <section id="agenda" className="py-20 sm:py-28 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="eyebrow text-primary mb-3">Agenda Mendatang</p>
            <SectionTitle first="Kalender" second="desa" className="text-ink" />
          </div>
          <Link
            to="/informasi/agenda"
            className="btn-pill bg-ink text-background hover:bg-primary group"
          >
            Semua Agenda
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {AGENDA.map((a) => (
            <article
              key={a.id}
              className="group rounded-3xl bg-card border border-border p-6 hover:bg-ink hover:text-background transition-all"
            >
              <div className="flex items-start gap-5 mb-5">
                <div className="text-center shrink-0">
                  <div className="font-display text-5xl font-bold leading-none text-primary">
                    {a.day}
                  </div>
                  <div className="font-ui text-xs font-bold mt-1 text-muted-foreground group-hover:text-background/60 tracking-wider">
                    {a.month}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-cream text-ink group-hover:bg-background/10 group-hover:text-background text-[11px] font-ui font-semibold">
                    {a.category}
                  </span>
                  <h3 className="font-display text-xl font-bold mt-2 leading-tight">{a.title}</h3>
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
              <div className="mt-5 pt-4 border-t border-border group-hover:border-background/10 flex items-center justify-between">
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
