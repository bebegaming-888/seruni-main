import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings, useSettings } from "@/lib/settings-store";
import { getVillage } from "@/lib/village-dynamic";
import { Link } from "@/components/Link";
import { PageHero } from "@/components/sections/PageHero";
import { MessageCircle, Users, Clock, Phone, Calendar, ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/pelayanan/konsultasi")({
  head: () => {
    return {
      meta: [
        { title: `Layanan Konsultasi — ${getVillage("village")}` },
        {
          name: "description",
          content: `Konsultasi langsung dengan perangkat desa ${getVillage("village")} untuk berbagai keperluan administratif dan sosial.`,
        },
      ],
    };
  },
  component: () => <KonsultasiPage />,
});

function ConsultantCard({
  name,
  role,
  schedule,
  photo,
  wa,
}: {
  name: string;
  role: string;
  schedule: string;
  photo?: string;
  wa: string;
}) {
  return (
    <div className="group p-6 rounded-[2rem] bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden border border-border">
          {photo ? (
            <img src={photo} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary">
              <Users className="h-8 w-8" />
            </div>
          )}
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-ink leading-tight">{name}</h3>
          <p className="font-ui text-xs font-bold text-primary uppercase tracking-wider mt-0.5">
            {role}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary/50" />
          <span className="font-ui text-xs font-medium">Senin – Jumat</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Clock className="h-4 w-4 text-primary/50" />
          <span className="font-ui text-xs font-medium">{schedule}</span>
        </div>
      </div>

      <a
        href={`https://wa.me/${wa}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-xl bg-ink text-white font-ui text-sm font-bold hover:bg-primary transition-all flex items-center justify-center gap-2"
      >
        Mulai Konsultasi
        <MessageCircle className="h-4 w-4" />
      </a>
    </div>
  );
}

export function KonsultasiPage() {
  const { village } = useSettings();
  const consultants = village.consultants ?? [];
  const hasConsultants = consultants.some((c) => c.whatsapp);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Layanan"
          titleSecond="Konsultasi"
          description="Konsultasi langsung dengan perangkat desa untuk berbagai keperluan administratif dan sosial."
          badge="Layanan Interaktif"
          badgeIcon={<MessageCircle className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Pelayanan" }, { label: "Konsultasi" }]}
        />

        {/* Features */}
        <section className="px-4 py-16">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
            {[
              {
                title: "Mudah",
                desc: "Konsultasi bisa dilakukan dari mana saja via WhatsApp.",
                icon: MessageCircle,
              },
              {
                title: "Personal",
                desc: "Berbicara langsung dengan perangkat yang berwenang.",
                icon: Users,
              },
              {
                title: "Respon Cepat",
                desc: "Dapatkan jawaban langsung pada jam kerja pelayanan.",
                icon: Clock,
              },
            ].map((f, i) => (
              <div key={i} className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">{f.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Consultants */}
        <section className="px-4 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <h2 className="font-display text-3xl font-bold text-ink">Tim Layanan Kami</h2>
              <p className="font-body text-muted-foreground mt-2">
                Pilih bidang konsultasi sesuai dengan kebutuhan Anda.
              </p>
            </div>
            {hasConsultants ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {consultants
                  .filter((c) => c.whatsapp)
                  .map((c, i) => (
                    <ConsultantCard
                      key={i}
                      name={c.name}
                      role={c.role}
                      schedule={c.schedule}
                      wa={c.whatsapp}
                    />
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-body text-sm text-muted-foreground">
                  Belum ada data konsultan. Hubungi kami melalui tombol di bawah.
                </p>
              </div>
            )}
          </div>
        </section>
        {/* Offline Consultation */}
        <section className="px-4 mb-24">
          <div className="max-w-5xl mx-auto p-10 sm:p-16 rounded-[3rem] bg-ink text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Star className="h-40 w-40" />
            </div>
            <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  Konsultasi Tatap Muka?
                </h2>
                <p className="font-body text-lg text-background/70 mb-8 leading-relaxed">
                  Silakan datang langsung ke Kantor Desa pada jam pelayanan untuk konsultasi yang
                  lebih mendalam mengenai permasalahan yang Anda hadapi.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-ui text-sm font-bold">Jam Kerja Pelayanan</div>
                      <div className="font-body text-xs text-background/60">
                        Senin – Jumat, 08:00 – 16:00 WITA
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <Link
                  to="/lainnya/peta"
                  className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover group h-14 px-8"
                >
                  Lihat Lokasi Kantor
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
