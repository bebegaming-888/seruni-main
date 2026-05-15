import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import PengajuanSaya from "@/pages/PengajuanSaya";

export const Route = createFileRoute("/masuk/pengajuan-saya")({
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `Pengajuan Saya — E-Surat ${s?.village?.name ?? "Desa"}` },
        { name: "description", content: "Lacak dan kelola pengajuan surat Anda." },
      ],
    };
  },
  component: PengajuanSaya,
});
