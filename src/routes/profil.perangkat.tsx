import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Link } from "@/components/Link";
import {
  Users,
  UserCheck,
  Phone,
  MapPin,
  ArrowRight,
  Star,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/profil/perangkat")({
  head: () => ({
    meta: [
      { title: `Perangkat Desa — ${VILLAGE.name}` },
      {
        name: "description",
        content: "Profil Perangkat Desa Seruni Mumbul. Kepala Desa, Sekretariat, dan Kepala Seksi.",
      },
    ],
  }),
  component: PerangkatPage,
});

const PERANGKAT = [
  // KEPALA DESA
  {
    nama: "H. Sumardi, S.Sos.",
    jabatan: "Kepala Desa",
    nip: "197501121995031001",
    ttl: "Seruni Mumbul, 25 Des 1975",
    pendidikan: "S1 Teknik Informatika",
    no_hp: "081234567890",
    email: "kades@serunimumbul.desa.id",
    peran: "Pemimpin pemerintahan desa, penanda tangan surat keputusan, dan mewakili desa keluar.",
    role: "head" as const,
    foto: "kepala-desa",
  },
  // SEKRETARIS
  {
    nama: "Lalu Ahmad Zaini, S.Sos.",
    jabatan: "Sekretaris Desa",
    nip: "198201102005011001",
    ttl: "Lombok Timur, 10 Jan 1982",
    pendidikan: "D3 Administrasi Negara",
    no_hp: "081234567891",
    email: "sekdes@serunimumbul.desa.id",
    peran: "Mengkoordinasikan seluruh kegiatan administrasi pemerintahan desa.",
    role: "head" as const,
    foto: "sekretaris",
  },
  // KASI
  {
    nama: "Siti Nurhaliza, S.Pd.",
    jabatan: "Kasi Pemerintahan",
    nip: "199203152015012001",
    ttl: "Seruni Mumbul, 15 Mar 1992",
    pendidikan: "S1 Pendidikan",
    no_hp: "081234567892",
    email: "kasi.pemerintahan@serunimumbul.desa.id",
    peran: "Menangani administrasi kependudukan, data desa, dan statistik.",
    role: "kasi" as const,
    foto: "kasi-1",
  },
  {
    nama: "M. Natsir",
    jabatan: "Kasi Keuangan",
    nip: "198508202010011001",
    ttl: "Lombok Timur, 20 Agt 1985",
    pendidikan: "D3 Keuangan",
    no_hp: "081234567893",
    email: "kasi.keuangan@serunimumbul.desa.id",
    peran: "Mengelola APBDes, pembukuan desa, dan pelaporan keuangan.",
    role: "kasi" as const,
    foto: "kasi-2",
  },
  {
    nama: "Baiq Rahmawati",
    jabatan: "Kasi Kesejahteraan Rakyat",
    nip: "199103252014022001",
    ttl: "Seruni Mumbul, 25 Mar 1991",
    pendidikan: "S1 Sosiologi",
    no_hp: "081234567894",
    email: "kasi.kesejahteraan@serunimumbul.desa.id",
    peran: "Membidangi bantuan sosial, BLT-DD, stunting, dan pemberdayaan masyarakat.",
    role: "kasi" as const,
    foto: "kasi-3",
  },
  {
    nama: "Lalu Wirawan",
    jabatan: "Kasi Pelayanan",
    nip: "198907152012011001",
    ttl: "Pringgabaya, 15 Jul 1989",
    pendidikan: "D3 Pariwisata",
    no_hp: "081234567895",
    email: "kasi.pelayanan@serunimumbul.desa.id",
    peran: "Mengkoordinasikan pelayanan publik: E-Surat, pengaduan, dan konsultasi warga.",
    role: "kasi" as const,
    foto: "kasi-4",
  },
  // KADER
  {
    nama: "Hj. Baiq Munawwaroh",
    jabatan: "Kader Pemberdayaan",
    nip: "-",
    ttl: "Seruni Mumbul, 12 Agt 1970",
    pendidikan: "SMA",
    no_hp: "081234567896",
    email: "",
    peran: "Menggerakkan program PKK, Posyandu, dan kelompok usaha masyarakat.",
    role: "kader" as const,
    foto: "kader-1",
  },
  {
    nama: "Siti Aminah",
    jabatan: "Kader Kesehatan",
    nip: "-",
    ttl: "Seruni Mumbul, 5 Jan 1971",
    pendidikan: "SMA",
    no_hp: "081234567897",
    email: "",
    peran: "Mengelola Posyandu balita & lansia dan laporan kesehatan warga.",
    role: "kader" as const,
    foto: "kader-2",
  },
];

const ROLE_CONFIG = {
  head: {
    label: "Kepala Desa & Secretariat",
    color: "from-primary/10 to-primary/5",
    borderColor: "border-primary/30",
    badge: "Pimpinan",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  kasi: {
    label: "Kepala Seksi (Kasi)",
    color: "from-info/10 to-info/5",
    borderColor: "border-info/30",
    badge: "Kasi",
    badgeClass: "bg-info/15 text-info border-info/30",
  },
  kader: {
    label: "Kader Desa",
    color: "from-success/10 to-success/5",
    borderColor: "border-success/30",
    badge: "Kader",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
};

export function PerangkatPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Pemerintah Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              Perangkat Desa
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Pemerintahan desa dijalankan oleh perangkat yang terdiri dari Kepala Desa,
              Sekretariat, dan Kepala Seksi yang mengabdi untuk melayani masyarakat Seruni Mumbul.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {PERANGKAT.length} Perangkat Aktif
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <ShieldCheck className="h-3.5 w-3.5" />
                Periode 2021–2027
              </span>
            </div>
          </div>
        </section>

        {/* Perangkat List */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto space-y-8">
            {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map((role) => {
              const config = ROLE_CONFIG[role];
              const items = PERANGKAT.filter((p) => p.role === role);

              return (
                <div key={role}>
                  <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full bg-gradient-to-b ${
                        role === "head"
                          ? "from-primary to-primary-hover"
                          : role === "kasi"
                            ? "from-info to-blue-400"
                            : "from-success to-green-400"
                      }`}
                    />
                    {config.label}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {items.map((p) => (
                      <div
                        key={p.nama}
                        className={`rounded-2xl border ${config.borderColor} bg-gradient-to-br ${config.color} p-5`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-display text-2xl font-bold text-primary">
                              {p.nama[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                              >
                                {config.badge}
                              </span>
                            </div>
                            <h3 className="font-display text-base font-bold text-ink leading-tight">
                              {p.nama}
                            </h3>
                            <p className="font-ui text-xs text-muted-foreground mt-0.5">
                              {p.jabatan}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-1.5">
                          <InfoRow label="NIP" value={p.nip} />
                          <InfoRow label="TTL" value={p.ttl} />
                          <InfoRow label="Pend." value={p.pendidikan} />
                          <InfoRow
                            label="HP"
                            value={p.no_hp}
                            link={`https://wa.me/${p.no_hp.replace("+", "")}`}
                          />
                          {p.email && (
                            <InfoRow label="Email" value={p.email} link={`mailto:${p.email}`} />
                          )}
                        </div>

                        <p className="mt-3 font-body text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                          {p.peran}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Struktur Organisasi */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-ink mb-6">Struktur Organisasi</h2>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4">
                {/* Kepala Desa */}
                <div className="flex flex-col items-center">
                  <div className="w-44 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-display text-lg font-bold">
                      {PERANGKAT[0].nama[0]}
                    </div>
                    <p className="font-display text-sm font-bold text-ink">{PERANGKAT[0].nama}</p>
                    <p className="font-ui text-[10px] text-muted-foreground mt-0.5">Kepala Desa</p>
                  </div>
                </div>

                {/* Garis penghubung */}
                <div className="w-px h-6 bg-border" />

                {/* Garis horizontal */}
                <div className="w-full max-w-sm h-px bg-border relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-px h-6 bg-border" />
                </div>

                {/* Sekretariat & Kasi row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
                  {[PERANGKAT[1], PERANGKAT[2], PERANGKAT[3], PERANGKAT[4], PERANGKAT[5]].map(
                    (p) => (
                      <div
                        key={p.nama}
                        className="rounded-xl border border-border bg-muted/30 p-3 text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-info/10 text-info flex items-center justify-center mx-auto mb-2 font-display text-sm font-bold">
                          {p.nama[0]}
                        </div>
                        <p className="font-display text-xs font-bold text-ink leading-tight">
                          {p.nama.split(",")[0].trim()}
                        </p>
                        <p className="font-ui text-[10px] text-muted-foreground mt-0.5">
                          {p.jabatan}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-ui text-[10px] text-muted-foreground w-10 shrink-0">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-ui text-xs text-primary hover:underline truncate"
        >
          {value}
        </a>
      ) : (
        <span className="font-ui text-xs text-foreground truncate">{value}</span>
      )}
    </div>
  );
}
