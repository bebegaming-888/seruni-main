import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import {
  MessageSquare,
  ShieldAlert,
  Send,
  Info,
  Phone,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/pelayanan/pengaduan")({
  head: () => ({
    meta: [
      { title: `Layanan Pengaduan — ${VILLAGE.name}` },
      {
        name: "description",
        content: `Sampaikan keluhan, aspirasi, atau pengaduan Anda kepada Pemerintah ${VILLAGE.name}.`,
      },
    ],
  }),
  component: () => <PengaduanPage />,
});

function FeatureItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-display text-base font-bold text-ink">{title}</h4>
        <p className="font-body text-sm text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export function PengaduanPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <MessageSquare className="h-3.5 w-3.5" />
              Layanan Aspirasi
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Suara Anda Berharga
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed">
              Membantu mewujudkan {VILLAGE.name} yang lebih baik dengan menyampaikan laporan,
              keluhan, atau saran Anda secara langsung.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 py-16">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-12">
            {/* Left Column: Info & WhatsApp */}
            <div className="lg:col-span-2 space-y-10">
              <div className="space-y-6">
                <FeatureItem
                  icon={ShieldAlert}
                  title="Aman & Rahasia"
                  desc="Identitas Anda akan kami rahasiakan. Fokus kami adalah menyelesaikan permasalahan yang Anda laporkan."
                />
                <FeatureItem
                  icon={HelpCircle}
                  title="Respon Cepat"
                  desc="Tim kami akan memverifikasi dan menindaklanjuti setiap pengaduan dalam waktu maksimal 3x24 jam kerja."
                />
              </div>

              <div className="p-8 rounded-3xl bg-cream border border-primary/10 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Phone className="h-24 w-24" />
                </div>
                <h3 className="font-display text-xl font-bold text-ink mb-2">
                  Layanan Cepat via WA
                </h3>
                <p className="font-body text-sm text-muted-foreground mb-6">
                  Butuh respon lebih cepat? Kirimkan aduan atau laporan Anda langsung melalui chat
                  WhatsApp resmi kami.
                </p>
                <a
                  href={`https://wa.me/${VILLAGE.whatsapp}`}
                  className="btn-pill bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2"
                >
                  Hubungi WhatsApp
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="rounded-[2rem] bg-card border border-border p-12 text-center animate-fade-up">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                    <Send className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mb-3">
                    Laporan Terkirim!
                  </h2>
                  <p className="font-body text-muted-foreground mb-8 max-w-sm mx-auto">
                    Terima kasih telah berpartisipasi. Laporan Anda telah kami terima dengan nomor
                    tiket <strong>#MD-{Math.floor(Math.random() * 9000) + 1000}</strong>.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-pill border border-border text-ink hover:bg-muted"
                  >
                    Kirim Aduan Lainnya
                  </button>
                </div>
              ) : (
                <div className="rounded-[2rem] bg-card border border-border p-8 sm:p-10 shadow-sm">
                  <h3 className="font-display text-xl font-bold text-ink mb-6">
                    Formulir Pengaduan Online
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                          Nama Lengkap
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Masukkan nama Anda"
                          className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                          Nomor WhatsApp
                        </label>
                        <input
                          required
                          type="tel"
                          placeholder="0812xxxx"
                          className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Kategori Pengaduan
                      </label>
                      <select className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 outline-none font-ui text-sm">
                        <option>Infrastruktur & Jalan</option>
                        <option>Pelayanan Publik</option>
                        <option>Keamanan & Ketertiban</option>
                        <option>Kesehatan & Kebersihan</option>
                        <option>Bantuan Sosial</option>
                        <option>Lainnya</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Isi Laporan / Aduan
                      </label>
                      <textarea
                        required
                        placeholder="Ceritakan detail permasalahan atau aspirasi Anda..."
                        rows={5}
                        className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm resize-none"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/50 flex items-start gap-3 border border-border/50">
                      <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="font-body text-xs text-muted-foreground leading-relaxed">
                        Dengan menekan tombol kirim, Anda menyetujui bahwa data yang diberikan
                        adalah benar dan bersedia dihubungi untuk verifikasi lebih lanjut.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-14 rounded-2xl bg-ink text-white font-ui font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-ink/10"
                    >
                      Kirim Laporan
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
