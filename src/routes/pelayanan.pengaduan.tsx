import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useSettings, getSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import {
  MessageSquare,
  ShieldAlert,
  Send,
  Info,
  Phone,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "@/components/Link";
import {
  submitPengaduan,
  listPengaduan,
  getByTicket,
  type Pengaduan,
  type PengaduanStatus,
} from "@/lib/pengaduan-store";
import { usePengaduanKategoriStore } from "@/lib/content-store";
import { toast } from "sonner";

const STATUS_CONFIG: Record<
  PengaduanStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  Baru: { label: "Baru", color: "text-warning bg-warning/10 border-warning/30", icon: Clock },
  Diproses: {
    label: "Diproses",
    color: "text-info bg-info/10 border-info/30",
    icon: AlertTriangle,
  },
  Selesai: {
    label: "Selesai",
    color: "text-success bg-success/10 border-success/30",
    icon: CheckCircle2,
  },
  Ditolak: {
    label: "Ditolak",
    color: "text-destructive bg-destructive/10 border-destructive/30",
    icon: AlertTriangle,
  },
};

export const Route = createFileRoute("/pelayanan/pengaduan")({
  head: () => {
    const { village } = getSettings();
    return {
      meta: [
        { title: `Layanan Pengaduan — ${village.name}` },
        {
          name: "description",
          content: `Sampaikan keluhan, aspirasi, atau pengaduan Anda kepada Pemerintah ${village.name}.`,
        },
      ],
    };
  },
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

function PengaduanPage() {
  const { village } = useSettings();
  const { items: kategoriItems } = usePengaduanKategoriStore();
  const [tab, setTab] = useState<"kirim" | "lacak">("kirim");

  const kategoriOptions = kategoriItems.length
    ? kategoriItems.map((k) => k.nama)
    : [
        "Infrastruktur & Jalan",
        "Pelayanan Publik",
        "Keamanan & Ketertiban",
        "Kesehatan & Kebersihan",
        "Bantuan Sosial",
        "Lingkungan Hidup",
        "Pertanahan",
        "Lainnya",
      ];
  const [submitted, setSubmitted] = useState(false);
  const [ticketResult, setTicketResult] = useState("");
  const [lacakTicket, setLacakTicket] = useState("");
  const [tracked, setTracked] = useState<Pengaduan | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [kategori, setKategori] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategori || !nama.trim() || !kontak.trim() || !judul.trim() || !isi.trim()) {
      toast.error("Lengkapi semua field yang wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitPengaduan(
        {
          nama: nama.trim(),
          kontak: kontak.trim(),
          kategori: kategori as PengaduanKategori,
          judul: judul.trim(),
          isi: isi.trim(),
        },
        village.whatsapp,
      );
      if (result.ok) {
        setTicketResult(result.ticket);
        setSubmitted(true);
      } else {
        toast.error(result.error ?? "Gagal mengirim pengaduan");
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengirim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLacak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lacakTicket.trim()) return;
    const found = await getByTicket(lacakTicket.trim().toUpperCase());
    if (found) {
      setTracked(found);
      setNotFound(false);
    } else {
      setTracked(null);
      setNotFound(true);
    }
  };

  const StatusBadge = ({ status }: { status: PengaduanStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}
      >
        <Icon className="h-3 w-3" /> {cfg.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <PageHero
          titleFirst="Layanan"
          titleSecond="Aspirasi"
          description="Sampaikan keluhan, aspirasi, atau pengaduan Anda kepada Pemerintah Desa."
          badge="Layanan Aspirasi"
          badgeIcon={<MessageSquare className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Pelayanan" }, { label: "Pengaduan" }]}
        />

        {/* Tab switcher */}
        <section className="px-4 pt-8 pb-0">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex rounded-full bg-muted p-1 gap-1">
              {[
                { key: "kirim" as const, label: "Kirim Pengaduan", icon: Send },
                { key: "lacak" as const, label: "Lacak Status", icon: Search },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold font-ui transition-all ${
                    tab === key
                      ? "bg-ink text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            {tab === "kirim" ? (
              submitted ? (
                <div className="rounded-[2rem] bg-card border border-border p-12 text-center animate-fade-up max-w-lg mx-auto">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mb-3">
                    Laporan Terkirim!
                  </h2>
                  <p className="font-body text-muted-foreground mb-3 max-w-sm mx-auto">
                    Terima kasih telah berpartisipasi. Laporan Anda telah kami terima.
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-4 py-2 mb-8 font-mono font-bold text-lg">
                    {ticketResult}
                  </div>
                  <p className="font-ui text-xs text-muted-foreground mb-6">
                    Catat nomor tiket ini untuk melacak status pengaduan Anda.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setTicketResult("");
                        setNama("");
                        setKontak("");
                        setKategori("");
                        setJudul("");
                        setIsi("");
                      }}
                      className="btn-pill border border-border text-ink hover:bg-muted"
                    >
                      Kirim Aduan Lainnya
                    </button>
                    <button
                      onClick={() => setTab("lacak")}
                      className="btn-pill bg-primary text-primary-foreground hover:bg-primary-hover"
                    >
                      Lacak Status
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-5 gap-12">
                  {/* Left Column: Info & WhatsApp */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-6">
                      <FeatureItem
                        icon={ShieldAlert}
                        title="Aman & Rahasia"
                        desc="Identitas Anda akan kami rahasiakan. Fokus kami adalah menyelesaikan permasalahan yang Anda laporkan."
                      />
                      <FeatureItem
                        icon={HelpCircle}
                        title="Respon Cepat"
                        desc="Tim kami akan menindaklanjuti setiap pengaduan dalam waktu maksimal 3x24 jam kerja."
                      />
                    </div>

                    <div className="p-8 rounded-3xl bg-card border border-primary/10 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Phone className="h-24 w-24" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-ink mb-2">
                        Layanan Cepat via WA
                      </h3>
                      <p className="font-body text-sm text-muted-foreground mb-6">
                        Butuh respon lebih cepat? Hubungi langsung melalui WhatsApp resmi kami.
                      </p>
                      <a
                        href={`https://wa.me/${village.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-pill bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2"
                      >
                        Hubungi WhatsApp
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Form */}
                  <div className="lg:col-span-3">
                    <div className="rounded-[2rem] bg-card border border-border p-8 sm:p-10 shadow-sm">
                      <h3 className="font-display text-xl font-bold text-ink mb-2">
                        Formulir Pengaduan Online
                      </h3>
                      <p className="font-body text-xs text-muted-foreground mb-6">
                        Isi form di bawah. Semua field bertanda * wajib diisi.
                      </p>
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                              Nama Lengkap *
                            </label>
                            <input
                              required
                              type="text"
                              value={nama}
                              onChange={(e) => setNama(e.target.value)}
                              placeholder="Masukkan nama Anda"
                              className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                              Nomor WhatsApp *
                            </label>
                            <input
                              required
                              type="tel"
                              value={kontak}
                              onChange={(e) => setKontak(e.target.value)}
                              placeholder="08xxxxxxxxxx"
                              className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Kategori Pengaduan *
                          </label>
                          <select
                            required
                            value={kategori}
                            onChange={(e) => setKategori(e.target.value)}
                            className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 outline-none font-ui text-sm"
                          >
                            <option value="">— Pilih Kategori —</option>
                            {kategoriOptions.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Judul Singkat *
                          </label>
                          <input
                            required
                            type="text"
                            value={judul}
                            onChange={(e) => setJudul(e.target.value)}
                            placeholder="Ringkasan topik pengaduan Anda"
                            maxLength={100}
                            className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-ui text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="font-ui text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Isi Laporan / Aduan *
                          </label>
                          <textarea
                            required
                            value={isi}
                            onChange={(e) => setIsi(e.target.value)}
                            placeholder="Ceritakan detail permasalahan atau aspirasi Anda secara lengkap..."
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
                          disabled={submitting}
                          className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-ink/10 disabled:opacity-60"
                        >
                          {submitting ? (
                            <>
                              <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                              Mengirim...
                            </>
                          ) : (
                            <>
                              Kirim Laporan
                              <Send className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* ── Lacak Status Tab ── */
              <div className="max-w-xl mx-auto">
                <div className="rounded-[2rem] bg-card border border-border p-8 shadow-sm mb-6">
                  <h3 className="font-display text-xl font-bold text-ink mb-2">Lacak Pengaduan</h3>
                  <p className="font-body text-sm text-muted-foreground mb-5">
                    Masukkan nomor tiket yang Anda terima saat mengirim pengaduan.
                  </p>
                  <form onSubmit={handleLacak} className="flex gap-3">
                    <input
                      type="text"
                      value={lacakTicket}
                      onChange={(e) => setLacakTicket(e.target.value)}
                      placeholder="MD-XXXX"
                      className="flex-1 h-12 px-5 rounded-2xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none font-mono font-semibold text-lg tracking-widest text-center uppercase"
                      maxLength={10}
                    />
                    <button
                      type="submit"
                      className="h-12 px-6 rounded-2xl bg-foreground text-background font-semibold hover:bg-foreground/90 transition-all"
                    >
                      Lacak
                    </button>
                  </form>
                </div>

                {notFound && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                    <p className="font-display text-lg font-bold text-ink">Tiket Tidak Ditemukan</p>
                    <p className="font-body text-sm text-muted-foreground mt-1">
                      Pastikan nomor tiket yang Anda masukkan benar. Tiket format:{" "}
                      <strong>MD-XXXX</strong>.
                    </p>
                  </div>
                )}

                {tracked && (
                  <div className="rounded-2xl border border-border bg-card p-8 shadow-card animate-fade-up">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">Nomor Tiket</p>
                        <p className="font-mono font-bold text-2xl text-primary">
                          {tracked.ticket}
                        </p>
                      </div>
                      <StatusBadge status={tracked.status} />
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-3 py-3 border-b border-border">
                        <span className="font-ui text-xs text-muted-foreground w-24 shrink-0">
                          Kategori
                        </span>
                        <span className="font-semibold">{tracked.kategori}</span>
                      </div>
                      <div className="flex gap-3 py-3 border-b border-border">
                        <span className="font-ui text-xs text-muted-foreground w-24 shrink-0">
                          Judul
                        </span>
                        <span className="font-semibold">{tracked.judul}</span>
                      </div>
                      <div className="flex gap-3 py-3 border-b border-border">
                        <span className="font-ui text-xs text-muted-foreground w-24 shrink-0">
                          Tanggal
                        </span>
                        <span className="font-body">
                          {new Date(tracked.created_at).toLocaleString("id-ID", {
                            dateStyle: "long",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {tracked.admin_tindak && (
                        <div className="flex gap-3 py-3">
                          <span className="font-ui text-xs text-muted-foreground w-24 shrink-0">
                            Tindakan
                          </span>
                          <span className="font-body">{tracked.admin_tindak}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
