import { SectionTitle } from "@/components/site/SectionTitle";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { useVillage } from "@/hooks/use-village";

const jam = [
  { day: "Senin", h: "08:00 – 15:00" },
  { day: "Selasa", h: "08:00 – 15:00" },
  { day: "Rabu", h: "08:00 – 15:00" },
  { day: "Kamis", h: "08:00 – 15:00" },
  { day: "Jumat", h: "08:00 – 11:30" },
  { day: "Sabtu", h: "Tutup" },
  { day: "Minggu", h: "Tutup" },
];

const today = new Date().getDay(); // 0=Min .. 6=Sab
const todayIdx = today === 0 ? 6 : today - 1;

export function ContactSection() {
  const { village: villageName, address, phone, whatsapp, email } = useVillage();

  return (
    <section id="kontak" className="py-20 sm:py-28 px-4 sm:px-8 bg-muted/50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow text-primary mb-3">Kontak & Lokasi</p>
          <SectionTitle first="Hubungi" second="kami" className="text-ink" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map placeholder */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-border h-[420px] relative">
            <iframe
              title={`Peta Desa ${villageName}`}
              src="https://www.openstreetmap.org/export/embed.html?bbox=116.55%2C-8.65%2C116.65%2C-8.55&layer=mapnik&marker=-8.6%2C116.6"
              className="w-full h-full"
              loading="lazy"
            />
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-xs rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-success mb-1">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
                <span className="font-ui text-xs font-bold uppercase tracking-wider">
                  Buka sekarang
                </span>
              </div>
              <div className="font-display font-bold text-ink">Kantor Desa {villageName}</div>
              <div className="font-body text-xs text-muted-foreground mt-1">{address}</div>
            </div>
          </div>

          {/* Info kontak + jam */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-card border border-border p-6 space-y-3">
              <a href={`tel:${phone}`} className="flex items-center gap-3 hover:text-primary group">
                <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-ui text-xs text-muted-foreground">Telepon</div>
                  <div className="font-ui font-semibold text-foreground group-hover:text-primary">
                    {phone}
                  </div>
                </div>
              </a>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:text-primary group"
              >
                <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-ui text-xs text-muted-foreground">WhatsApp</div>
                  <div className="font-ui font-semibold text-foreground group-hover:text-primary">
                    Chat Admin Desa
                  </div>
                </div>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 hover:text-primary group"
              >
                <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-ui text-xs text-muted-foreground">Email</div>
                  <div className="font-ui font-semibold text-ink group-hover:text-primary text-sm">
                    {email}
                  </div>
                </div>
              </a>
              <div className="flex items-start gap-3 pt-3 border-t border-border">
                <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-ui text-xs text-muted-foreground">Alamat</div>
                  <div className="font-ui text-sm text-ink leading-snug">{address}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-ink text-background p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-ui text-xs font-bold uppercase tracking-wider">
                  Jam Pelayanan
                </span>
              </div>
              <ul className="space-y-1.5">
                {jam.map((j, i) => (
                  <li
                    key={j.day}
                    className={`flex items-center justify-between font-ui text-sm py-1 px-2 rounded-lg ${i === todayIdx ? "bg-primary text-primary-foreground" : "text-background/80"}`}
                  >
                    <span className="font-semibold">{j.day}</span>
                    <span>{j.h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
