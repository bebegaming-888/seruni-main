/**
 * POTENSI DESA — Village Potentials Showcase
 * Public page: UMKM, Wisata, Komoditas
 */

import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/lib/settings-store";
import { useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Trees,
  ChevronRight,
  Loader2,
  Phone,
  Star,
  ArrowUpRight,
  Package,
  Utensils,
  Camera,
  Landmark,
} from "lucide-react";

const WISATA_ICONS: Record<string, React.ElementType> = {
  alam: Trees,
  budaya: Landmark,
  kuliner: Utensils,
  event: Camera,
};

interface PotensiData {
  umkm?: { count: number; items: Record<string, unknown>[] };
  wisata?: { count: number; items: Record<string, unknown>[] };
  komoditas?: { count: number; items: Record<string, unknown>[] };
}

export const Route = createFileRoute("/lainnya/potensi-desa")({
  head: () => ({
    meta: [
      { title: "Potensi Desa — Seruni Mumbul" },
      { name: "description", content: "Potensi dan produk Unggulan Desa Seruni Mumbul." },
    ],
  }),
  component: () => <PotensiDesaPage />,
});

function PotensiDesaPage() {
  const { village } = useSettings();
  const [data, setData] = useState<PotensiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"umkm" | "wisata" | "komoditas">("umkm");

  useEffect(() => {
    fetch(`/api/potensi`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const TABS = [
    {
      key: "umkm" as const,
      label: "UMKM & Produk",
      icon: Store,
      desc: "Produk dan usaha masyarakat",
    },
    { key: "wisata" as const, label: "Wisata", icon: Trees, desc: "Destinasi dan tempat menarik" },
    {
      key: "komoditas" as const,
      label: "Komoditas",
      icon: Package,
      desc: "Hasil bumi dan komoditas",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PageHero
          titleFirst="Potensi"
          titleSecond="Desa"
          description={`Jelajahi potensi dan produk unggulan ${village.name}.`}
          badge="Potensi Desa"
          badgeIcon={<MapPin className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Lainnya" }, { label: "Potensi Desa" }]}
        />

        <section className="px-4 py-12">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Tab Switcher */}
            <div className="flex gap-2 border-b border-border">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const count = data?.[tab.key]?.count ?? 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {count > 0 && (
                      <Badge variant="outline" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* UMKM */}
                {activeTab === "umkm" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">UMKM &amp; Produk Desa</h2>
                        <p className="text-sm text-muted-foreground">
                          {data?.umkm?.count ?? 0} usaha mikro dan kecil di {village.name}
                        </p>
                      </div>
                    </div>

                    {data?.umkm?.items && data.umkm.items.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.umkm.items.map((item: Record<string, unknown>) => (
                          <Card
                            key={item.id as string}
                            className="p-5 hover:shadow-card transition-shadow cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="font-bold text-foreground mb-1">
                              {String(item.name ?? "")}
                            </h3>
                            <Badge variant="outline" className="mb-2 text-xs">
                              {String(item.type ?? "UMKM")}
                            </Badge>
                            {String(item.description || "") && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                {String(item.description)}
                              </p>
                            )}
                            {Array.isArray(item.products) && item.products.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {item.products.slice(0, 3).map((p, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-muted px-2 py-0.5 rounded-full"
                                  >
                                    {String(p)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {String(item.address ?? "—")}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-12 text-center">
                        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Belum ada data UMKM.</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Wisata */}
                {activeTab === "wisata" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">Destinasi Wisata</h2>
                        <p className="text-sm text-muted-foreground">
                          {data?.wisata?.count ?? 0} tempat wisata di {village.name}
                        </p>
                      </div>
                    </div>

                    {data?.wisata?.items && data.wisata.items.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.wisata.items.map((item: Record<string, unknown>) => {
                          const catKey = String(item.category ?? "alam").toLowerCase();
                          const IconComp = WISATA_ICONS[catKey] ?? Trees;
                          return (
                            <Card
                              key={item.id as string}
                              className="p-5 hover:shadow-card transition-shadow cursor-pointer group overflow-hidden"
                            >
                              {item.photos &&
                              Array.isArray(item.photos) &&
                              item.photos.length > 0 ? (
                                <div className="w-full h-36 -mx-5 -mt-5 mb-4 relative overflow-hidden rounded-t-2xl">
                                  <img
                                    src={String(item.photos[0])}
                                    alt={String(item.name)}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                  <div className="absolute top-3 right-3">
                                    <Badge className="text-xs">
                                      {String(item.category ?? "Wisata")}
                                    </Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-36 -mx-5 -mt-5 mb-4 bg-gradient-to-br from-primary/20 to-info/20 rounded-t-2xl flex items-center justify-center">
                                  <IconComp className="h-10 w-10 text-primary/60" />
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <h3 className="font-bold text-foreground mb-1">
                                    {String(item.name ?? "")}
                                  </h3>
                                  {String(item.location) && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                      <MapPin className="h-3 w-3" /> {String(item.location)}
                                    </div>
                                  )}
                                  {String(item.description) && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {String(item.description ?? "")}
                                    </p>
                                  )}
                                  {String(item.facilities) && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {String(item.facilities)
                                        .split(",")
                                        .slice(0, 3)
                                        .map((f, i) => (
                                          <span
                                            key={i}
                                            className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full"
                                          >
                                            {String(f).trim()}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground self-center group-hover:text-primary transition-colors" />
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="p-12 text-center">
                        <Trees className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Belum ada data destinasi wisata.</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Komoditas */}
                {activeTab === "komoditas" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold">Komoditas Unggulan</h2>
                        <p className="text-sm text-muted-foreground">
                          {data?.komoditas?.count ?? 0} komoditas dari {village.name}
                        </p>
                      </div>
                    </div>

                    {data?.komoditas?.items && data.komoditas.items.length > 0 ? (
                      <>
                        {/* Category summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Object.entries(
                            data.komoditas.items.reduce(
                              (acc: Record<string, number>, item: Record<string, unknown>) => {
                                const cat = String(item.category ?? "Lainnya");
                                acc[cat] = (acc[cat] ?? 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            ),
                          ).map(([cat, count]) => (
                            <Card key={cat} className="p-4 text-center">
                              <p className="text-2xl font-bold text-primary">{count}</p>
                              <p className="text-xs text-muted-foreground mt-1">{cat}</p>
                            </Card>
                          ))}
                        </div>

                        {/* Full table */}
                        <Card className="p-0 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left py-3 px-4 font-semibold">
                                    Nama Komoditas
                                  </th>
                                  <th className="text-left py-3 px-4 font-semibold">Kategori</th>
                                  <th className="text-left py-3 px-4 font-semibold">Lokasi</th>
                                  <th className="text-left py-3 px-4 font-semibold">
                                    Kisaran Harga
                                  </th>
                                  <th className="text-left py-3 px-4 font-semibold">Satuan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.komoditas.items.map((item: Record<string, unknown>) => (
                                  <tr
                                    key={item.id as string}
                                    className="border-b hover:bg-muted/30"
                                  >
                                    <td className="py-3 px-4 font-semibold">
                                      {String(item.name ?? "")}
                                    </td>
                                    <td className="py-3 px-4">
                                      <Badge variant="outline" className="text-xs">
                                        {String(item.category ?? "—")}
                                      </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground text-xs">
                                      {String(item.location ?? "—")}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-primary">
                                      {String(item.price_range ?? "—")}
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">
                                      {String(item.unit ?? "—")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </>
                    ) : (
                      <Card className="p-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Belum ada data komoditas.</p>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer CTA */}
            <Card className="p-8 text-center bg-primary/5 border-primary/20">
              <h3 className="text-lg font-bold mb-2">Ingin mendaftarkan usaha atau produk Anda?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Hubungi perangkat desa untuk mendaftarkan UMKM, wisata, atau komoditas desa Anda.
              </p>
              <Button>Kontak Desa</Button>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
