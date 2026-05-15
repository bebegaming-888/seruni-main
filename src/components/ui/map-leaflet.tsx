// Client-only Leaflet map wrapper — safe for SSR with dynamic import
import { useEffect, useRef, useState } from "react";
import { FACILITIES, TYPE_CONFIG, type MapFacility } from "@/data/map-facilities";
import { useVillage } from "@/hooks/use-village";

interface MapLeafletProps {
  height?: string;
  showLegend?: boolean;
}

export function MapLeaflet({ height = "500px", showLegend = true }: MapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);
  const [activeType, setActiveType] = useState<string>("all");
  const [selected, setSelected] = useState<MapFacility | null>(null);
  const { village } = useVillage();

  const filtered =
    activeType === "all" ? FACILITIES : FACILITIES.filter((f) => f.type === activeType);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const CENTER: [number, number] = [-8.5732, 116.6214];
      const map = L.map(mapRef.current!, { center: CENTER, zoom: 15, zoomControl: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Approximate village boundary circle
      L.circle(CENTER, {
        radius: 800,
        color: "#0f7a4a",
        fillColor: "#0f7a4a",
        fillOpacity: 0.05,
        weight: 2,
        dashArray: "6 6",
      })
        .addTo(map)
        .bindPopup(village);

      FACILITIES.forEach((facility) => {
        const cfg = TYPE_CONFIG[facility.type];
        const marker = L.circleMarker(facility.coords, {
          radius: 10,
          fillColor: cfg.color,
          color: "#ffffff",
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Poppins, sans-serif; min-width: 160px;">
            <div style="font-size: 16px; margin-bottom: 4px;">${cfg.icon}</div>
            <strong style="font-size: 12px; color: #111827;">${facility.name}</strong>
            ${facility.dusun ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${facility.dusun}</div>` : ""}
            ${facility.description ? `<div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${facility.description}</div>` : ""}
            <div style="font-size: 10px; color: ${cfg.color}; margin-top: 4px; font-weight: 600;">${cfg.label}</div>
          </div>
        `);

        marker.on("click", () => setSelected(facility));
      });

      mapInstanceRef.current = map;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const types = Object.keys(TYPE_CONFIG);

  return (
    <div className="flex flex-col lg:flex-row gap-0 rounded-2xl border border-border overflow-hidden bg-card">
      {/* Sidebar */}
      {showLegend && (
        <div className="lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col max-h-[320px] lg:max-h-none overflow-y-auto">
          {/* Filter */}
          <div className="p-3 border-b border-border/50 space-y-2">
            <p className="font-ui text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
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
              {types.map((type) => {
                const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
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

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filtered.map((facility) => {
              const cfg = TYPE_CONFIG[facility.type];
              return (
                <button
                  key={facility.id}
                  onClick={() => setSelected(facility)}
                  className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors ${
                    selected?.id === facility.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm leading-none mt-0.5">{cfg.icon}</span>
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

      {/* Map container */}
      <div className="flex-1 relative">
        <div ref={mapRef} style={{ height, minHeight: height }} className="w-full" />

        {/* Selected info card */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-64 z-[1000]">
            <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-sm p-3 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{TYPE_CONFIG[selected.type].icon}</span>
                    <span
                      className="rounded-full px-2 py-0.5 font-ui text-[10px] font-semibold text-white"
                      style={{ backgroundColor: TYPE_CONFIG[selected.type].color }}
                    >
                      {TYPE_CONFIG[selected.type].label}
                    </span>
                  </div>
                  <p className="font-display text-sm font-bold text-ink leading-tight">
                    {selected.name}
                  </p>
                  {selected.dusun && (
                    <p className="font-ui text-[10px] text-muted-foreground mt-0.5">
                      {selected.dusun}
                    </p>
                  )}
                  {selected.description && (
                    <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selected.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center font-ui text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
