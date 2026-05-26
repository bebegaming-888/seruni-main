import { ArrowUpRight, FileText, BarChart2, Users, ShieldCheck } from "lucide-react";
import { Link } from "@/components/Link";
import { SectionTitle } from "@/components/site/SectionTitle";
import { TextReveal } from "@/components/ui/TextReveal";

const items = [
  { icon: FileText, label: "APBDes 2026", desc: "Anggaran Pendapatan & Belanja Desa" },
  { icon: BarChart2, label: "Realisasi Dana", desc: "Capaian penyerapan dana desa" },
  { icon: Users, label: "Struktur Organisasi", desc: "Perangkat desa & tupoksi" },
  { icon: ShieldCheck, label: "LHKPN", desc: "Laporan harta kekayaan" },
];

export function TransparansiSection() {
  return (
    <section className="min-h-screen bg-muted flex items-center py-20 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl w-full">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary mb-3">Tata Kelola Terbuka</p>
          <SectionTitle first="Transparansi" second="Publik" className="text-foreground mb-3" />
          <p className="font-body text-muted-foreground mb-8 leading-relaxed">
            Desa Seruni Mumbul berkomitmen pada pemerintahan terbuka. Seluruh dokumen perencanaan,
            anggaran, dan laporan dapat diakses oleh seluruh masyarakat.
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {items.map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-card border border-border p-4 hover:bg-accent transition-colors group"
              >
                <item.icon className="h-6 w-6 text-primary mb-3" />
                <div className="font-display font-bold text-foreground text-base leading-tight">
                  <TextReveal mode="hover">{item.label}</TextReveal>
                </div>
                <div className="font-ui text-xs text-muted-foreground mt-1">{item.desc}</div>
              </div>
            ))}
          </div>

          <Link
            to="/profil/tata-kelola"
            className="mt-8 btn-pill bg-primary text-primary-foreground hover:bg-primary inline-flex group"
          >
            <TextReveal mode="hover">Lihat Semua Dokumen</TextReveal>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
