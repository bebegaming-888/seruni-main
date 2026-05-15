import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import { getVillage } from "@/lib/village-dynamic";

import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => {
    const settings = getSettings();
    return {
      meta: [
        {
          title: `Desa ${getVillage("village")} — Portal Resmi ${getVillage("district")}, ${getVillage("regency")}`,
        },
        {
          name: "description",
          content: `Portal resmi Desa ${getVillage("village")}. Layanan E-Surat online, informasi desa, wisata, dan transparansi anggaran.`,
        },
      ],
    };
  },
  component: Index,
});
