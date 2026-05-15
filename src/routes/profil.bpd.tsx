import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { getLembagaWithStruktur } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { useEffect, useState } from "react";

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
  Loader2,
  User,
} from "lucide-react";

export const Route = createFileRoute("/profil/bpd")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `BPD — ${v.name}` },
        {
          name: "description",
          content: `Badan Permusyawaratan Desa ${v.name}. Suara rakyat, pengawasan tata kelola desa.`,
        },
      ],
    };
  },
  component: () => <BPDPage />,
});

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
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLembagaWithStruktur("bpd").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const logoUrl = data?.lembaga.logo_storage_path
    ? getMediaUrl(data.lembaga.logo_storage_path, "public-media")
    : data?.lembaga.logo_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo BPD"
                className="h-20 w-20 rounded-2xl object-contain border border-border bg-white/50 mb-6"
              />
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Users className="h-3.5 w-3.5" />
              Badan Permusyawaratan Desa
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-4">
              BPD
              <br />
              <span className="text-primary">{v.name}</span>
            </h1>

            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              {data?.lembaga.deskripsi ||
                "Wadah representam suara rakyat dalam pemerintahan desa. BPD menjalankan fungsi pembentukan peraturan, pembahasan anggaran, dan pengawasan kinerja pemerintah desa."}
            </p>
            {loading ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-muted text-muted-foreground px-3 py-1 font-ui text-xs font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat…
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data?.allPengurus.length ?? 0} anggota aktif
                </div>
                {data?.lembaga.periode_mulai && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                    {data.lembaga.periode_mulai.slice(0, 4)}–
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "—"}
                  </div>
                )}
              </div>
            )}
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

        {/* Anggota — Kartu Nama */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Kepengurusan
                </p>
                <h2 className="font-display text-3xl font-bold text-ink">
                  Susunan Kepengurusan BPD
                </h2>
                {data?.lembaga.periode_mulai && (
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Periode {data.lembaga.periode_mulai.slice(0, 4)} —{" "}
                    {data.lembaga.periode_selesai?.slice(0, 4) ?? "—"}
                  </p>
                )}
              </div>
              <Link
                to="/profil/lembaga"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lembaga Lain <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data?.allPengurus.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border text-center py-16 font-body text-muted-foreground">
                Data kepengurusan belum diisi. Buka panel admin untuk mengelola.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.allPengurus.map((p) => {
                  const strukturNode = data.allStruktur.find((s) => s.id === p.struktur_id);
                  const isRoot = strukturNode?.level === 0;
                  const fotoUrl = p.foto_storage_path
                    ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
                    : p.foto_url;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-5 flex items-start gap-4 ${
                        isRoot ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={p.nama}
                          className="h-14 w-14 rounded-full object-cover border border-border shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full border ${isRoot ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground"}`}
                          >
                            {strukturNode?.nama_jabatan ?? "—"}
                          </span>
                        </div>
                        <p className="font-display text-base font-bold text-ink leading-tight">
                          {p.nama}
                        </p>
                        <p className="font-ui text-xs text-muted-foreground mt-0.5">
                          {[
                            p.tempat_lahir,
                            p.tanggal_lahir
                              ? new Date(p.tanggal_lahir).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                        {p.pendidikan && (
                          <p className="font-ui text-xs text-muted-foreground">{p.pendidikan}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                      "Rapat Paristiwa — sesuai kebutuhan (quorum 2/3 anggota)",
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
                      {
                        icon: MapPin,
                        text: data?.lembaga.kontak_info?.alamat || `Balai Desa ${v.name}, Lt. 2`,
                      },
                      {
                        icon: Phone,
                        text: data?.lembaga.kontak_info?.telepon || "Hubungi sekretariat BPD",
                      },
                      {
                        icon: Users,
                        text:
                          data?.lembaga.kontak_info?.jam_layanan ||
                          "Jam layanan: Senin–Jumat, 08.00–15.00 WITA",
                      },
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
