import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desa Seruni Mumbul — Portal Resmi Pringgabaya, Lombok Timur" },
      {
        name: "description",
        content:
          "Portal resmi Desa Seruni Mumbul. Layanan E-Surat online, informasi desa, wisata, dan transparansi anggaran.",
      },
    ],
  }),
  component: Index,
});
