import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, FileText, Trophy, Clock, Users } from "lucide-react";
import { SURAT_KATEGORI } from "@/data/mock-data";
import { useState } from "react";

export function SuratSection() {
  const [active, setActive] = useState(0);
  return (
    <section id="layanan-surat" className="py-20 sm:py-28 px-4 sm:px-8 bg-ink text-background">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="eyebrow text-primary mb-3">Layanan Surat</p>
            <SectionTitle first="Urus" second="surat" className="" />
            <p className="font-body text-background/70 mt-5 max-w-md">
              Ajukan surat resmi secara online dari mana saja. Diproses cepat, status terlacak,
              dokumen siap diunduh.
            </p>
          </div>
          <Link
            to="/pelayanan/e-surat"
            className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover group"
          >
            Mulai Ajukan Surat
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Tabs kategori */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SURAT_KATEGORI.map((k, i) => (
            <button
              key={k.name}
              onClick={() => setActive(i)}
              className={`btn-pill ${active === i ? "bg-primary text-primary-foreground" : "bg-background/10 text-background hover:bg-background/20"}`}
            >
              {k.name}
            </button>
          ))}
        </div>

        <div className="rounded-3xl bg-background/5 backdrop-blur-sm overflow-hidden border border-background/10">
          {SURAT_KATEGORI[active].items.map((s, i) => (
            <div
              key={s.code}
              className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5 ${i !== 0 ? "border-t border-background/10" : ""} hover:bg-background/5 transition-colors`}
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-ui text-xs font-bold text-primary tracking-wider">
                    {s.code}
                  </span>
                  {s.popular && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning text-ink text-[10px] font-ui font-bold">
                      <Trophy className="h-2.5 w-2.5" /> Terpopuler
                    </span>
                  )}
                </div>
                <div className="font-display text-lg font-bold text-background">{s.name}</div>
                <div className="font-ui text-xs text-background/60 mt-1">
                  <Clock className="h-3 w-3 inline mr-1" /> {s.eta}
                </div>
              </div>
              <Link
                to={`/pelayanan/e-surat?kode=${s.code}`}
                className="btn-pill bg-background text-ink hover:bg-primary hover:text-primary-foreground shrink-0"
              >
                Ajukan
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
