import { SectionTitle } from "@/components/site/SectionTitle";
import { Link } from "@/components/Link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { TextReveal } from "@/components/ui/TextReveal";

const score = 0.7842;
const sub = [
  { name: "IKS — Indeks Ketahanan Sosial", val: 0.81, desc: "Pendidikan, kesehatan, modal sosial" },
  { name: "IKE — Indeks Ketahanan Ekonomi", val: 0.74, desc: "Keragaman ekonomi & akses modal" },
  { name: "IKL — Indeks Ketahanan Lingkungan", val: 0.79, desc: "Kualitas lingkungan & mitigasi" },
];

const trend = [0.61, 0.66, 0.71, 0.75, 0.78];

export function IDMSection() {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - score * c;

  return (
    <section
      id="idm"
      className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-8 bg-cream overflow-hidden"
    >
      <div className="mx-auto max-w-7xl w-full grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="eyebrow text-primary mb-3">Indeks Desa Membangun</p>
          <SectionTitle first="Skor" second="Maju" className="text-ink mb-5" />
          <p className="font-body text-muted-foreground mb-5 max-w-md">
            Indeks Desa Membangun mengukur perkembangan desa dari sisi sosial, ekonomi, dan
            lingkungan. Kami terus naik 5 tahun berturut-turut.
          </p>

          <div className="space-y-4">
            {sub.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-ui text-sm font-semibold text-ink">{s.name}</span>
                  <span className="font-display font-bold text-ink">{s.val.toFixed(2)}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${s.val * 100}%` }}
                  />
                </div>
                <p className="font-body text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/informasi/idm"
            className="btn-pill bg-ink text-background hover:bg-primary mt-5 inline-flex group"
          >
            <TextReveal mode="hover">Lihat Detail IDM</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 inline ml-1" />
          </Link>
        </div>

        <div className="relative aspect-square max-w-md mx-auto w-full">
          <div className="absolute inset-0 rounded-full bg-card shadow-card" />
          <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="10"
            />
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-display text-7xl font-bold text-ink leading-none">
              {score.toFixed(2)}
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success text-ink font-ui text-xs font-bold">
              MAJU
            </div>
            <div className="mt-3 font-ui text-xs text-muted-foreground">Tahun data: 2026</div>
            <div className="mt-5 flex items-end gap-1 h-8">
              {trend.map((t, i) => (
                <div
                  key={i}
                  className="w-2 rounded-sm bg-primary"
                  style={{ height: `${t * 100}%` }}
                />
              ))}
            </div>
            <div className="font-ui text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" /> 5 tahun naik
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
