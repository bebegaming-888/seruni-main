import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/Link";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import { useSettings, getSettings } from "@/lib/settings-store";
import { getLembagaWithStruktur } from "@/lib/lembaga-store";
import { getMediaUrl } from "@/lib/media-upload";
import { usePageContentStore, useKwtStore } from "@/lib/content-store";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/sections/PageHero";

import {
  ScrollText,
  Users,
  ClipboardCheck,
  Heart,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";

export const Route = createFileRoute("/profil/pkkrw")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `PKK & KWT — ${v.name}` },
        {
          name: "description",
          content: `Program Pemberdayaan Kesejahteraan Keluarga dan Kelompok Wanita Tani Desa ${v.name}.`,
        },
      ],
    };
  },
  component: () => <PKKRWPage />,
});

export function PKKRWPage() {
  const v = useVillage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLembagaWithStruktur>>>(null);
  const [loading, setLoading] = useState(true);
  const { items: pageItems } = usePageContentStore();
  const { items: kwtItems } = useKwtStore();

  useEffect(() => {
    getLembagaWithStruktur("pkk").then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const programPkkItems = (() => {
    const found = pageItems.find(
      (p) => p.page_key === "profil_pkkrw" && p.content_type === "programs",
    );
    if (found?.items.length) return found.items;
    return [
      {
        label: "Pendidikan & Keterampilan",
        description:
          "Kursus menjahit, Microsoft Office, dan literasi digital untuk ibu-ibu rumah tangga.",
        status: "Aktif",
      },
      {
        label: "Kesehatan Keluarga",
        description: "Posyandu balita & lansia, pemeriksaan ibu hamil, dan GERMAS.",
        status: "Aktif",
      },
      {
        label: "Perencanaan Keluarga",
        description: "Kelas KB, konsultasi kesehatan reproduksi, dan edukasi gizi balita.",
        status: "Aktif",
      },
      {
        label: "Kelompok Usaha Bersama",
        description:
          "Pembinaan kelompok usaha produktif: kue tradisional, kerajinan, dan pertanian organik.",
        status: "Aktif",
      },
      {
        label: "Penguatan Rumah Tangga",
        description: "Bantuan pangan, bedah rumah, dan program keluarga harapan.",
        status: "Aktif",
      },
      {
        label: "Keterlibatan Masyarakat",
        description:
          "Gotong royong, kerja bakti bulanan, dan pengelolaan sampah berbasis komunitas.",
        status: "Aktif",
      },
    ];
  })();

  const logoUrl = data?.lembaga.logo_storage_path
    ? getMediaUrl(data.lembaga.logo_storage_path, "public-media")
    : data?.lembaga.logo_url;

  const aktifCount = data?.allPengurus.length ?? 0;

  const kwtData = kwtItems.length
    ? kwtItems.map((k) => ({
        nama: k.nama,
        dusun: k.dusun,
        anggota: k.anggota,
        produk: k.produk,
      }))
    : [
        {
          nama: "KWT Melati",
          dusun: "Mandar",
          anggota: 28,
          produk: "Kue tradisional & jajanan pasar",
        },
        { nama: "KWT Mawar", dusun: "Sasak", anggota: 22, produk: "Manisan & dodol lombok" },
        { nama: "KWT Sejahtera", dusun: "Dames", anggota: 35, produk: "Keripik & emping" },
        { nama: "KWT Anggrek", dusun: "Brantapen Asri", anggota: 19, produk: "Tenun & bordir" },
      ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="PKK &"
          titleSecond="KWT"
          description="Pemberdayaan keluarga melalui pendidikan, kesehatan, ekonomi kreatif, dan kesejahteraan sosial."
          badge="Pemberdayaan Keluarga"
          badgeIcon={<Heart className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Profil" }, { label: "PKK" }]}
        />

        {/* Program Kerja */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto">
            <p className="font-ui text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Program Kerja 2026
            </p>
            <h2 className="font-display text-3xl font-bold text-ink mb-8">6 Bidang Kegiatannya</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programPkkItems.map((p) => (
                <div
                  key={p.label}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-bold text-ink mb-1.5 leading-tight">
                    {p.label}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed mb-3">
                    {p.description}
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
              <Link
                to="/profil/lembaga"
                className="hidden sm:inline-flex items-center gap-2 font-ui text-sm text-primary font-semibold hover:underline shrink-0"
              >
                Lembaga Lain →
              </Link>
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
                  {kwtData.map((k) => (
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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : data?.allPengurus.length === 0 ? (
                <p className="font-body text-muted-foreground text-center py-8">
                  Data kepengurusan belum diisi.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data?.allPengurus.map((p) => {
                    const strukturNode = data.allStruktur.find((s) => s.id === p.struktur_id);
                    const isRoot = strukturNode?.level === 0;
                    const fotoUrl = p.foto_storage_path
                      ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
                      : p.foto_url;
                    return (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-4 ${isRoot ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {fotoUrl ? (
                            <img
                              src={fotoUrl}
                              alt={p.nama}
                              className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-display font-bold text-ink leading-tight">
                              {p.nama}
                            </p>
                            <p className="font-ui text-xs text-muted-foreground mt-0.5">
                              {strukturNode?.nama_jabatan ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-4">
                {[
                  {
                    icon: MapPin,
                    text:
                      data?.lembaga.kontak_info?.alamat ||
                      `Balai Desa ${v.village}, Ruang PKK Lt. 1`,
                  },
                  {
                    icon: Phone,
                    text: data?.lembaga.kontak_info?.telepon || "Hubungi sekretariat PKK",
                  },
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
