import { ArrowUpRight, Users, Baby, UsersRound, Home } from "lucide-react";
import { Link } from "@/components/Link";
import { SectionTitle } from "@/components/site/SectionTitle";
import { TextReveal } from "@/components/ui/TextReveal";

const stats = [
  { icon: Users, value: "2.847", label: "Total Penduduk" },
  { icon: Baby, value: "312", label: "Balita & Anak" },
  { icon: UsersRound, value: "1.923", label: "Usia Produktif" },
  { icon: Home, value: "892", label: "Kartu Keluarga" },
];

const demographic = [
  { label: "Laki-laki", pct: 51.2, color: "bg-primary" },
  { label: "Perempuan", pct: 48.8, color: "bg-secondary" },
];

export function KependudukanSection() {
  return (
    <section className="min-h-screen bg-card py-20 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: title + demographics */}
          <div>
            <p className="eyebrow text-primary mb-3">Data & Demografi</p>
            <SectionTitle first="Kependudu-" second="kan" className="text-foreground mb-6" />
            <p className="font-body text-muted-foreground mb-8 leading-relaxed">
              Data kependudukan terkini desa Seruni Mumbul berdasarkan register penduduk dan sensus
              terbaru.
            </p>

            {/* Demographics bars */}
            <div className="space-y-4">
              {demographic.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-ui text-sm font-semibold text-foreground">{d.label}</span>
                    <span className="font-display font-bold text-foreground">{d.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.color}`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg bg-muted border border-border p-5 hover:bg-accent transition-colors"
              >
                <s.icon className="h-6 w-6 text-primary mb-3" />
                <div className="font-display text-3xl font-bold text-foreground leading-none">
                  <TextReveal mode="hover">{s.value}</TextReveal>
                </div>
                <div className="font-ui text-xs text-muted-foreground mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <Link
            to="/profil/kependudukan"
            className="btn-pill bg-primary text-primary-foreground hover:bg-primary inline-flex group"
          >
            <TextReveal mode="hover">Data Lengkap Kependudukan</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
