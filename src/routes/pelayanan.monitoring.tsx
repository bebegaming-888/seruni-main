import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import MonitoringSurat from "@/pages/MonitoringSurat";

export const Route = createFileRoute("/pelayanan/monitoring")({
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `Lacak Pengajuan — Monitoring E-Surat ${s?.village?.name ?? ""}` },
        { name: "description", content: "Pantau status pengajuan surat desa secara real-time." },
      ],
    };
  },
  component: MonitoringSurat,
});
