// Client-only Leaflet map — rendered only after mount to avoid SSR window errors
import { useEffect, useRef, useState, useMemo } from "react";
import { useVillage } from "@/hooks/use-village";

export type MapFacility = {
  id: string;
  name: string;
  type:
    | "kantor-desa"
    | "posyandu"
    | "sekolah"
    | "masjid"
    | "olahraga"
    | "pasar"
    | "bumdes"
    | "objek-wisata"
    | "dusun";
  coords: [number, number]; // [lat, lng]
  description?: string;
  dusun?: string;
};

const FACILITIES: MapFacility[] = [
  {
    id: "kantor-desa",
    name: "Kantor Desa",
    type: "kantor-desa",
    coords: [-8.5732, 116.6214],
    description: "Pusat pemerintahan Desa",
  },
  {
    id: "posyandu-mawar",
    name: "Posyandu Mawar",
    type: "posyandu",
    coords: [-8.575, 116.623],
    description: "Pos kesehatan masyarakat untuk balita dan lansia — wilayah Timur",
    dusun: "Dusun Timur",
  },
  {
    id: "posyandu-melati",
    name: "Posyandu Melati",
    type: "posyandu",
    coords: [-8.572, 116.619],
    description: "Pos kesehatan masyarakat — wilayah Barat",
    dusun: "Dusun Barat",
  },
  {
    id: "sekolah-dasar",
    name: "Sekolah Dasar Negeri",
    type: "sekolah",
    coords: [-8.5735, 116.622],
    description: "Sekolah Dasar Negeri di wilayah Desa",
  },
  {
    id: "masjid-jami",
    name: "Masjid Jami Al-Muttaqin",
    type: "masjid",
    coords: [-8.573, 116.6205],
    description: "Masjid utama di wilayah Desa",
  },
  {
    id: "lapangan-olahraga",
    name: "Lapangan Olahraga Desa",
    type: "olahraga",
    coords: [-8.5745, 116.624],
    description: "Lapangan voli dan sepak bola masyarakat",
  },
  {
    id: "pasar-desa",
    name: "Pasar Desa",
    type: "pasar",
    coords: [-8.5728, 116.6235],
    description: "Pasar mingguan，每hari Sabtu",
  },
  {
    id: "bumdes",
    name: "Kantor BUMDes",
    type: "bumdes",
    coords: [-8.5738, 116.6218],
    description: "Pusat usaha BUMDes dan penjualan produk lokal",
  },
  {
    id: "objek-wisata-embung",
    name: "Objek Wisata Desa",
    type: "objek-wisata",
    coords: [-8.576, 116.625],
    description: "Embung wisata dengan pemandangan sawah terasering",
  },
  {
    id: "dusun-timur",
    name: "Dusun Timur",
    type: "dusun",
    coords: [-8.5755, 116.6245],
    dusun: "Dusun Timur",
  },
  {
    id: "dusun-barat",
    name: "Dusun Barat",
    type: "dusun",
    coords: [-8.5715, 116.6185],
    dusun: "Dusun Barat",
  },
];

const TYPE_CONFIG: Record<MapFacility["type"], { color: string; icon: string; label: string }> = {
  "kantor-desa": { color: "#0f7a4a", icon: "🏛️", label: "Kantor Desa" },
  posyandu: { color: "#dc2626", icon: "🏥", label: "Posyandu" },
  sekolah: { color: "#2563eb", icon: "🏫", label: "Sekolah" },
  masjid: { color: "#7c3aed", icon: "🕌", label: "Masjid" },
  olahraga: { color: "#059669", icon: "⚽", label: "Olahraga" },
  pasar: { color: "#d97706", icon: "🏪", label: "Pasar" },
  bumdes: { color: "#0f7a4a", icon: "🏢", label: "BUMDes" },
  "objek-wisata": { color: "#0891b2", icon: "🌿", label: "Objek Wisata" },
  dusun: { color: "#6b7280", icon: "🏘️", label: "Dusun" },
};

const MAPBOX_STYLE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const VILLAGE_CENTER: [number, number] = [-8.5732, 116.6214];

interface VillageMapProps {
  height?: string;
  showSidebar?: boolean;
}

export function VillageMap({ height = "500px", showSidebar = true }: VillageMapProps) {
  const { village: villageName } = useVillage();
  const villageNameRef = useRef(villageName);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [activeType, setActiveType] = useState<MapFacility["type"] | "all">("all");
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);

  const filtered = (
    activeType === "all" ? FACILITIES : FACILITIES.filter((f) => f.type === activeType)
  ).map((f) => {
    return {
      ...f,
      name: f.name.includes("Desa") ? f.name.replace("Desa", villageName) : f.name,
      description: f.description?.includes("Desa")
        ? f.description.replace("Desa", villageName)
        : f.description,
    };
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let L: typeof import("leaflet");

    import("leaflet").then((leafletModule) => {
      L = leafletModule.default ?? leafletModule;

      // Fix default marker icon for bundlers
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: VILLAGE_CENTER,
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer(MAPBOX_STYLE, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add circle for approximate village boundary
      L.circle(VILLAGE_CENTER, {
        radius: 800,
        color: "#0f7a4a",
        fillColor: "#0f7a4a",
        fillOpacity: 0.05,
        weight: 2,
        dashArray: "6 6",
      })
        .addTo(map)
        .bindPopup(`Desa ${villageNameRef.current}`);

      FACILITIES.forEach((facility) => {
        const config = TYPE_CONFIG[facility.type];
        const marker = L.circleMarker(facility.coords, {
          radius: 10,
          fillColor: config.color,
          color: "#fff",
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: 'Raleway', sans-serif; min-width: 160px;">
            <div style="font-size: 18px; margin-bottom: 4px;">${config.icon}</div>
            <strong style="font-size: 13px; color: #111;">${facility.name}</strong>
            ${facility.dusun ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${facility.dusun}</div>` : ""}
            ${facility.description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${facility.description}</div>` : ""}
            <div style="font-size: 10px; color: ${config.color}; margin-top: 4px; font-weight: 600;">${config.label}</div>
          </div>
        `);

        marker.on("click", () => {
          setSelectedFacility(facility);
        });
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [villageName]);

  const facilityTypes = Object.keys(TYPE_CONFIG) as Array<MapFacility["type"]>;

  return (
    <div className="flex flex-col lg:flex-row gap-0 rounded-2xl border border-border overflow-hidden bg-card">
      {/* Sidebar */}
      {showSidebar && (
        <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col max-h-[300px] lg:max-h-none overflow-y-auto">
          {/* Filter */}
          <div className="p-3 border-b border-border/50">
            <p className="font-ui text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Filter Fasilitas
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveType("all")}
                className={`rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold transition-all ${
                  activeType === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                Semua
              </button>
              {facilityTypes.map((type) => {
                const cfg = TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold transition-all ${
                      activeType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend / List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filtered.map((facility) => {
              const cfg = TYPE_CONFIG[facility.type];
              return (
                <button
                  key={facility.id}
                  onClick={() => setSelectedFacility(facility)}
                  className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors ${
                    selectedFacility?.id === facility.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{cfg.icon}</span>
                  <div className="min-w-0">
                    <p className="font-ui text-xs font-semibold text-foreground leading-tight truncate">
                      {facility.name}
                    </p>
                    {facility.dusun && (
                      <p className="font-ui text-[10px] text-muted-foreground">{facility.dusun}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} style={{ height, minHeight: height }} className="w-full" />

        {/* Selected facility info overlay */}
        {selectedFacility && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-64 z-[1000]">
            <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-sm p-3 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{TYPE_CONFIG[selectedFacility.type].icon}</span>
                    <span
                      className="rounded-full px-2 py-0.5 font-ui text-[10px] font-semibold text-white"
                      style={{ backgroundColor: TYPE_CONFIG[selectedFacility.type].color }}
                    >
                      {TYPE_CONFIG[selectedFacility.type].label}
                    </span>
                  </div>
                  <p className="font-display text-sm font-bold text-ink leading-tight">
                    {selectedFacility.name}
                  </p>
                  {selectedFacility.dusun && (
                    <p className="font-ui text-[10px] text-muted-foreground mt-0.5">
                      {selectedFacility.dusun}
                    </p>
                  )}
                  {selectedFacility.description && (
                    <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedFacility.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center font-ui text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attribution overlay */}
        <div className="absolute bottom-1 right-2 z-[1000]">
          <span className="font-ui text-[9px] text-muted-foreground/60">© OpenStreetMap</span>
        </div>
      </div>
    </div>
  );
}

export { FACILITIES, TYPE_CONFIG };
