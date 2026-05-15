import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useVillage } from "@/hooks/use-village";
import { getVillage } from "@/lib/village-dynamic";
import {
  initPerangkatStore,
  getPerangkatTreeWithPersons,
  type PerangkatStruktur,
} from "@/lib/perangkat-desa-store";
import { getMediaUrl } from "@/lib/media-upload";
import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronRight, CheckCircle2, ShieldCheck, Phone } from "lucide-react";

export const Route = createFileRoute("/profil/perangkat")({
  head: () => {
    const v = getVillage();
    return {
      meta: [
        { title: `Perangkat Desa — ${v.name}` },
        {
          name: "description",
          content: `Profil Perangkat Desa ${v.name}. Kepala Desa, Sekretariat, dan Kepala Seksi.`,
        },
      ],
    };
  },
  component: () => <PerangkatPage />,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agt",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

function initial(str?: string) {
  return str?.trim().charAt(0).toUpperCase() ?? "?";
}

const KATEGORI_CONFIG: Record<
  string,
  { color: string; border: string; badge: string; badgeClass: string }
> = {
  Pimpinan: {
    color: "from-primary/10 to-primary/5",
    border: "border-primary/30",
    badge: "Pimpinan",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  Kesekretariatan: {
    color: "from-primary/10 to-primary/5",
    border: "border-primary/30",
    badge: "Secretary",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  "Pelaksana Teknis": {
    color: "from-info/10 to-info/5",
    border: "border-info/30",
    badge: "Kasie",
    badgeClass: "bg-info/15 text-info border-info/30",
  },
  "Pelaksana Kewilayahan": {
    color: "from-success/10 to-success/5",
    border: "border-success/30",
    badge: "Kadus",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  "Staf/Operator": {
    color: "from-muted/30 to-muted/10",
    border: "border-muted-foreground/30",
    badge: "Staf",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

// ── Tree Card (struktur node + person) ─────────────────────────────────────

function StrukturCard({ node, isRoot }: { node: PerangkatStruktur; isRoot?: boolean }) {
  const [open, setOpen] = useState(isRoot ?? false);
  const cfg = KATEGORI_CONFIG[node.kategori] ?? {
    color: "from-muted/20 to-muted/10",
    border: "border-border",
    badge: node.kategori,
    badgeClass: "bg-muted text-muted-foreground",
  };
  const p = node.person;
  const hasChildren = (node.children?.length ?? 0) > 0;

  const fotoUrl = p?.foto_storage_path
    ? getMediaUrl(p.foto_storage_path, "perangkat-fotos")
    : p?.foto_url;

  return (
    <div
      className={`rounded-2xl border ${isRoot ? "border-primary/40 bg-primary/5" : "border-border bg-card"} p-5`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={p?.nama}
            className="h-14 w-14 rounded-2xl object-cover shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <span className="font-display text-2xl font-bold text-muted-foreground">
              {p ? initial(p.nama) : initial(node.nama_jabatan)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
            >
              {cfg.badge}
            </span>
            {p?.nomor_sk && (
              <span className="text-[10px] font-ui text-muted-foreground px-2 py-0.5">
                {p.nomor_sk}
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-bold text-ink leading-tight">
            {p?.nama ?? <span className="text-muted-foreground italic">Lowong</span>}
          </h3>
          <p className="font-ui text-xs text-muted-foreground mt-0.5">{node.nama_jabatan}</p>
        </div>
        {hasChildren && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 rounded hover:bg-muted transition text-muted-foreground"
            aria-label={open ? "Tutup" : "Buka"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Person detail rows */}
      {p && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-4">
          <InfoRow
            label="TTL"
            value={
              [p.tempat_lahir, p.tanggal_lahir ? fmtDate(p.tanggal_lahir) : ""]
                .filter(Boolean)
                .join(", ") || "-"
            }
          />
          <InfoRow label="Pend." value={p.pendidikan || "-"} />
          <InfoRow label="SK" value={p.nomor_sk || "-"} />
          <InfoRow
            label="Terbit"
            value={p.tanggal_terbit_sk ? fmtDate(p.tanggal_terbit_sk) : "-"}
          />
          <InfoRow label="HP" value={p.no_hp || "-"} />
        </div>
      )}

      {/* Children */}
      {hasChildren && open && (
        <div className="mt-4 pl-4 border-l-2 border-border space-y-3">
          {node.children!.map((child) => (
            <StrukturCard key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-ui text-[10px] text-muted-foreground w-10 shrink-0">{label}</span>
      <span className="font-ui text-xs text-foreground truncate">{value}</span>
    </div>
  );
}

// ── Org chart box (kades → direct children) ─────────────────────────────────

function OrgChart({ roots }: { roots: PerangkatStruktur[] }) {
  const kades = roots.find((r) => r.nama_jabatan === "Kepala Desa");
  const directChildren = kades?.children ?? [];
  const fotoUrl = kades?.person?.foto_storage_path
    ? getMediaUrl(kades.person.foto_storage_path, "perangkat-fotos")
    : kades?.person?.foto_url;

  if (!kades) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Kades box */}
      <div className="w-48 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-display text-lg font-bold overflow-hidden">
          {fotoUrl ? (
            <img src={fotoUrl} alt={kades.person?.nama} className="h-full w-full object-cover" />
          ) : (
            initial(kades.person?.nama)
          )}
        </div>
        <p className="font-display text-sm font-bold text-ink">
          {kades.person?.nama ?? <span className="text-muted-foreground italic">Lowong</span>}
        </p>
        <p className="font-ui text-[10px] text-muted-foreground mt-0.5">Kepala Desa</p>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Connector */}
      <div className="w-full max-w-sm h-px bg-border relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-px h-6 bg-border" />
      </div>

      {/* Direct children */}
      {directChildren.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
          {directChildren.slice(0, 5).map((child) => {
            const person = child.person;
            const childFotoUrl = person?.foto_storage_path
              ? getMediaUrl(person.foto_storage_path, "perangkat-fotos")
              : person?.foto_url;
            return (
              <div
                key={child.id}
                className="rounded-xl border border-border bg-muted/30 p-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-info/10 text-info flex items-center justify-center mx-auto mb-2 font-display text-sm font-bold overflow-hidden">
                  {childFotoUrl ? (
                    <img
                      src={childFotoUrl}
                      alt={person?.nama}
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    initial(person?.nama)
                  )}
                </div>
                <p className="font-display text-xs font-bold text-ink leading-tight truncate">
                  {person?.nama.split(",")[0].trim() ?? (
                    <span className="text-muted-foreground italic text-[9px]">Lowong</span>
                  )}
                </p>
                <p className="font-ui text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {child.nama_jabatan}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PerangkatPage() {
  const v = useVillage();
  const [tree, setTree] = useState<PerangkatStruktur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initPerangkatStore()
      .then(() => {
        setTree(getPerangkatTreeWithPersons());
        setLoading(false);
      })
      .catch((e) => {
        console.error("[profil.perangkat] initPerangkatStore failed:", e);
        setLoading(false);
      });
  }, []);

  // Count active persons
  const totalPersons = tree.reduce<number>((acc, node) => {
    const countNode = (n: PerangkatStruktur): number =>
      (n.person ? 1 : 0) + (n.children?.reduce<number>((a, c) => a + countNode(c), 0) ?? 0);
    return acc + countNode(node);
  }, 0);

  // Flat list of all struktur nodes for grouping by kategori
  function flattenNodes(nodes: PerangkatStruktur[]): PerangkatStruktur[] {
    return nodes.reduce<PerangkatStruktur[]>((acc, n) => {
      acc.push(n);
      if (n.children) acc.push(...flattenNodes(n.children));
      return acc;
    }, []);
  }

  const flat = flattenNodes(tree);
  const byKategori: Record<string, PerangkatStruktur[]> = {};
  for (const n of flat) {
    if (!n.person) continue; // only show filled positions in grouped list
    const key = n.kategori;
    if (!byKategori[key]) byKategori[key] = [];
    byKategori[key].push(n);
  }

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
              <span className="text-primary">{v.name}</span>
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-6">
              Pemerintahan desa dijalankan oleh perangkat yang terdiri dari Kepala Desa,
              Sekretariat, dan Kepala Seksi yang mengabdi untuk melayani masyarakat.
            </p>
            {loading ? (
              <div className="font-ui text-xs text-muted-foreground">Memuat…</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {totalPersons} Perangkat Aktif
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {totalPersons} Perangkat Aktif
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Grouped list by kategori */}
        <section className="px-4 mb-14">
          <div className="max-w-5xl mx-auto space-y-8">
            {loading ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground font-body">
                Memuat…
              </div>
            ) : flat.filter((n) => n.person).length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground font-body">
                Data perangkat desa belum tersedia.
              </div>
            ) : (
              Object.entries(byKategori).map(([kategori, nodes]) => {
                const cfg = KATEGORI_CONFIG[kategori] ?? {
                  color: "from-muted/20 to-muted/10",
                  border: "border-border",
                  badge: kategori,
                  badgeClass: "bg-muted text-muted-foreground",
                };
                return (
                  <div key={kategori}>
                    <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full bg-gradient-to-b ${
                          kategori === "Pimpinan" || kategori === "Kesekretariatan"
                            ? "from-primary to-primary-hover"
                            : kategori === "Pelaksana Teknis"
                              ? "from-info to-blue-400"
                              : kategori === "Pelaksana Kewilayahan"
                                ? "from-success to-green-400"
                                : "from-muted-foreground to-muted"
                        }`}
                      />
                      {cfg.badge}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nodes.map((n) => (
                        <StrukturCard key={n.id} node={n} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Struktur Organisasi */}
        {!loading && tree.length > 0 && (
          <section className="px-4 mb-16">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-3xl font-bold text-ink mb-6">Struktur Organisasi</h2>
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <OrgChart roots={tree} />
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
