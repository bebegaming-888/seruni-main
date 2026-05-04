import { createFileRoute } from "@tanstack/react-router";
import MonitoringSurat from "@/pages/MonitoringSurat";

export const Route = createFileRoute("/pelayanan/monitoring")({
  head: () => ({
    meta: [
      { title: "Lacak Pengajuan — Monitoring E-Surat" },
      { name: "description", content: "Pantau status pengajuan surat desa secara real-time." },
    ],
  }),
  component: MonitoringSurat,
});
