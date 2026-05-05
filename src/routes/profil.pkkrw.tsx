import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import {
  ScrollText,
  Users,
  ClipboardCheck,
  Heart,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/profil/pkkrw")({
  head: () => ({
    meta: [
      { title: `PKK & KWT — ${VILLAGE.name}` },
      {
        name: "description",
        content:
          "Program Pemberdayaan Kesejahteraan Keluarga dan Kelompok Wanita Tani Desa Seruni Mumbul.",
      },
    ],
  }),
  component: () => <PKKRWPage />,
});

const PROGRAM_PKK = [
  {
    title: "Pendidikan & Keterampilan",
    desc: "Kursus menjahit, Microsoft Office, dan literasi digital untuk ibu-ibu rumah tangga.",
    status: "Aktif",
  },
  {
    title: "Kesehatan Keluarga",
    desc: "Posyandu balita & lansia, pemeriksaan ibu hamil, dan GERMAS (Gerakan Masyarakat Hidup Sehat).",
    status: "Aktif",
  },
  {
    title: "Perencanaan Keluarga",
    desc: "Kelas KB, konsultasi kesehatan reproduksi, dan edukasi gizi balita.",
    status: "Aktif",
  },
  {
    title: "Kelompok Usaha Bersama",
    desc: "Pembinaan 12 kelompok usaha produktif: kue tradisional, kerajinan, dan pertanian organik.",
    status: "Aktif",
  },
  {
    title: "Penguatan Rumah Tangga",
    desc: "Bantuan pangan, bedah rumah, dan program keluarga harapan untuk rumah tangga kurang mampu.",
    status: "Aktif",
  },
  {
    title: "Keterlibatan Masyarakat",
    desc: "Gotong royong, kerja bakti bulanan, dan pengelolaan sampah berbasis komunitas.",
    status: "Aktif",
  },
];

const KWT = [
  {
    nama: "KWT Melati",
    dusun: "Mumbul Timur",
    anggota: 28,
    produk: "Kue tradisional & jajanan pasar",
  },
  { nama: "KWT Mawar", dusun: "Mumbul Barat", anggota: 22, produk: "Manisan & dodol lombok" },
  { nama: "KWT Sejahtera", dusun: "Mumbul Selatan", anggota: 35, produk: "Keripik & emping" },
  { nama: "KWT Anggrek", dusun: "Mumbul Tengah", anggota: 19, produk: "Tenun & bordir" },
];

const PENGURUS = [
  { nama: "Hj. Baiq Munawwaroh", jabatan: "Ketua TP-PKK Desa", role: "primary" },
  { nama: "Siti Nuraini", jabatan: "Sekretaris", role: "secondary" },
  { nama: "Baiq Rahmawati", jabatan: "Bendahara", role: "secondary" },
  { nama: "Siti Aminah", jabatan: "Kabid Pendidikan & Keterampilan", role: "normal" },
  { nama: "Hj. Maryati", jabatan: "Kabid Kesehatan", role: "normal" },
  { nama: "Nurfatimah", jabatan: "Kabid Ekonomi Kreatif", role: "normal" },
];

export function PKKRWPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Heart className="h-3.5 w-3.5" />
              Pemberdayaan Keluarga
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              PKK & Kelompok Wanita Tani
              <br />
              <span className="text-primary">{VILLAGE.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              TP-PKK (Kelompok Wanita) berperan dalam pemberdayaan keluarga melalui program
              pendidikan, kesehatan, ekonomi kreatif, dan kesejahteraan sosial. Saat ini aktif 104
              anggota dan 4 KWT di setiap dusun.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />4 KWT Aktif
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <Users className="h-3.5 w-3.5" />
                104 Anggota
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary">
                <Star className="h-3.5 w-3.5" />
                12 Program Aktif
              </span>
            </div>
          </div>
        </section>

        {/* Program Kerja */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Kerja 2026
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">6 Bidang Kegiatannya</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROGRAM_PKK.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-bold text-ink mb-1.5 leading-tight">
                    {p.title}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
                    {p.desc}
                  </p>
                  <span className="text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KWT */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Potensi Ekonomi
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">
                  Kelompok Wanita Tani (KWT)
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Usaha produktif per dusun untuk pemberdayaan ekonomi perempuan
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Nama KWT
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Dusun
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Jumlah Anggota
                    </th>
                    <th className="px-4 py-3 font-ui font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Produk Unggulan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {KWT.map((k) => (
                    <tr
                      key={k.nama}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="px-4 py-3 font-display font-semibold">{k.nama}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{k.dusun}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">
                        {k.anggota} orang
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {k.produk}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pengurus */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-ink mb-6 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                Dewan Ketua TP-PKK Desa
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PENGURUS.map((p) => (
                  <div
                    key={p.nama}
                    className={`rounded-xl border p-4 ${p.role === "primary" ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}
                  >
                    <p className="font-display font-bold text-ink leading-tight">{p.nama}</p>
                    <p className="font-ui text-xs text-muted-foreground mt-0.5">{p.jabatan}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-4">
                {[
                  { icon: MapPin, text: "Balai Desa Seruni Mumbul, Ruang PKK Lt. 1" },
                  { icon: Phone, text: "+62 812-3456-7890 (Ketua)" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-ui text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
