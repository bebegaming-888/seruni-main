import { Link } from "@/components/Link";
import { ArrowUpRight, Facebook, Instagram, Youtube, MapPin, Phone, Mail } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useVillage } from "@/hooks/use-village";

const cols = [
  {
    title: "Pelayanan",
    links: [
      { label: "E-Surat Online", to: "/pelayanan/e-surat" },
      { label: "Data Penduduk", to: "/pelayanan/penduduk" },
      { label: "Konsultasi", to: "/pelayanan/konsultasi" },
      { label: "Pengaduan", to: "/pelayanan/pengaduan" },
    ],
  },
  {
    title: "Tentang",
    links: [
      { label: "Profil Desa", to: "/profil/desa" },
      { label: "Perangkat Desa", to: "/profil/perangkat" },
      { label: "Lembaga Desa", to: "/profil/lembaga" },
      { label: "Monografi", to: "/lainnya/monografi" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { label: "Berita", to: "/informasi/berita" },
      { label: "Agenda", to: "/informasi/agenda" },
      { label: "Galeri", to: "/informasi/galeri" },
      { label: "IDM", to: "/informasi/idm" },
    ],
  },
  {
    title: "Transparansi",
    links: [
      { label: "APBDes", to: "/laporan/apbdes" },
      { label: "Realisasi", to: "/laporan/realisasi" },
      { label: "RPJMDes", to: "/laporan/rpjmdes" },
      { label: "Produk Hukum", to: "/lainnya/produk-hukum" },
    ],
  },
];

export function Footer() {
  const villageInfo = useVillage();
  const { social } = useSettings();
  const { village: villageName, district, regency, address, phone, email, whatsapp } = villageInfo;
  return (
    <footer className="bg-ink text-background mt-24">
      <section className="px-4 sm:px-8 pt-16 pb-12">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95]">
              Siap melayani.
              <br />
              <em className="text-primary not-italic font-display italic">
                Setiap hari, setiap warga.
              </em>
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-body text-base text-background/70 max-w-md">
              Hubungi kami melalui WhatsApp, email, atau datang langsung ke kantor desa pada jam
              pelayanan.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover group"
              >
                Hubungi via WhatsApp
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/pelayanan/pengaduan"
                className="btn-pill bg-background/10 text-background hover:bg-background/20"
              >
                Sampaikan Aspirasi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-background/10" />

      <section className="px-4 sm:px-8 py-14">
        <div className="mx-auto max-w-7xl grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold">
                S
              </div>
              <div>
                <div className="font-display text-xl font-bold">{villageName}</div>
                <div className="font-ui text-xs text-background/60">
                  {district} · {regency}
                </div>
              </div>
            </div>
            <p className="font-body text-sm text-background/70 leading-relaxed mb-5 max-w-xs">
              Website resmi pemerintah desa untuk pelayanan, transparansi, dan partisipasi warga.
            </p>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {address}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary" /> {phone}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary" /> {email}
              </li>
            </ul>
            <div className="flex gap-2 mt-5">
              {[
                { Icon: Facebook, url: social.facebook },
                { Icon: Instagram, url: social.instagram },
                { Icon: Youtube, url: social.youtube },
              ].map(({ Icon, url }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <div className="font-display text-lg font-bold mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="font-ui text-sm text-background/70 hover:text-background transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-background/10" />
      <div className="px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/60 font-ui">
          <div>© 2026 {villageName}. Semua Hak Dilindungi.</div>
          <div className="flex gap-5">
            <a href="#">Kebijakan Privasi</a>
            <a href="#">Syarat & Ketentuan</a>
            <a href="#">Peta Situs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
