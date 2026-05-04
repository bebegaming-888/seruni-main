import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { VILLAGE } from "@/data/site";
import {
  Users,
  FileText,
  Scale,
  CalendarDays,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/profil/bpd")({
  head: () => ({
    meta: [
      { title: `BPD — ${VILLAGE.name}` },
      {
        name: "description",
        content:
          "Badan Permusyawaratan Desa Seruni Mumbul. Suara rakyat, pengawasan tata kelola desa.",
      },
    ],
  }),
  component: BPDPage,
});

const ANGGOTA = [
  {
    nama: "H. M. Zainuddin",
    jabatan: "Ketua",
    ttl: "Seruni Mumbul, 12 Agt 1968",
    Pendidikan: "SMA",
  },
  {
    nama: "Siti Aminah",
    jabatan: "Wakil Ketua",
    ttl: "Seruni Mumbul, 5 Jan 1971",
    Pendidikan: "SMA",
  },
  {
    nama: "Lalu Parto",
    jabatan: "Sekretaris",
    ttl: "Seruni Mumbul, 20 Mar 1974",
    Pendidikan: "D3",
  },
  { nama: "Baiq Hairun", jabatan: "Anggota", ttl: "Seruni Mumbul, 8 Jun 1975", Pendidikan: "SMA" },
  {
    nama: "H. Abdul Kadir",
    jabatan: "Anggota",
    ttl: "Seruni Mumbul, 15 Nov 1973",
    Pendidikan: "S1",
  },
  { nama: "Siti Rohani", jabatan: "Anggota", ttl: "Seruni Mumbul, 3 Feb 1979", Pendidikan: "SMA" },
  { nama: "M. Nasir", jabatan: "Anggota", ttl: "Seruni Mumbul, 22 Jul 1977", Pendidikan: "SMA" },
  {
    nama: "Siti Nurhaliza",
    jabatan: "Anggota",
    ttl: "Seruni Mumbul, 14 Apr 1982",
    Pendidikan: "D3",
  },
];

const TUGAS = [
  {
    icon: Scale,
    title: "Pembentukan Peraturan Desa",
    desc: "Melakukan pembahasan dan memberikan persetujuan terhadap Raperdes sebelum ditetapkan Kades.",
  },
  {
    icon: FileText,
    title: "Pembahasan APBDes",
    desc: "Menampung dan meniscus aspirasi masyarakat dalam rancangan APBDes yang diajukan Kades.",
  },
  {
    icon: UserCheck,
    title: "Pengawasan Kinerja",
    desc: "Mengawasi kinerja pemerintah desa dan menyampaikan hasil pengawasan kepada perangkat desa.",
  },
  {
    icon: CalendarDays,
    title: "Pelaksanaan Musdes",
    desc: "Mengumpulkan masyarakat dalam musyawarah desa untuk membahas program dan kegiatan pembangunan.",
  },
];

export function BPDPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Badan Permusyawaratan Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              BPD
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Wadah representan suara rakyat dalam pemerintahan desa. BPD menjalankan fungsi
              pembentukan peraturan, pembahasan anggaran, dan pengawasan kinerja pemerintah desa.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />8 Anggota aktif · Periode 2021–2027
            </div>
          </div>
        </section>

        {/* Tugas Pokok */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Fungsi Utama
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">Tugas & Wewenang BPD</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {TUGAS.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.title}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-ink mb-1.5">{t.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Anggota */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Kepengurusan
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">Susunan Anggota BPD</h2>
                <p className="font-body text-sm text-muted-foreground mt-1">Periode 2021 — 2027</p>
              </div>
              <Link
                to="/profil/lembaga"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lembaga Lain <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      No
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Nama Lengkap
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Jabatan
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Tempat/Tgl Lahir
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Pendidikan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ANGGOTA.map((a, i) => (
                    <tr
                      key={a.nama}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 font-display font-semibold">{a.nama}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {a.jabatan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {a.ttl}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {a.Pendidikan}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Jadwal Rapat */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Jadwal Rapat Biasa
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                    BPD melaksanakan rapat ordinary setiap bulan untuk membahas agenda desa. Rapat
                    bersifat terbuka untuk masyarakat yang ingin menyampaikan aspirasi.
                  </p>
                  <div className="space-y-2">
                    {[
                      "Rapat koordinasi bulanan — minggu ke-2 setiap bulan",
                      "Rapat Paripurna — sesuai kebutuhan (quorum 2/3 anggota)",
                      "Musyawarah Desa — minimal 2x per tahun",
                    ].map((r) => (
                      <div key={r} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span className="font-ui text-sm text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-2xl p-5">
                  <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Informasi Kontak
                  </h4>
                  <div className="space-y-3">
                    {[
                      { icon: MapPin, text: "Balai Desa Seruni Mumbul, Lt. 2" },
                      { icon: Phone, text: "+62 812-3456-7890 (Sekretaris)" },
                      { icon: Users, text: "Jam layanan: Senin–Jumat, 08.00–15.00 WITA" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="font-ui text-sm text-muted-foreground">{text}</span>
                      </div>
                    ))}
                  </div>
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
