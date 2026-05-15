import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import Admin from "@/pages/admin";

export const Route = createFileRoute("/admin")({
  head: () => {
    const s = getSettings();
    return {
      meta: [{ title: `Admin — ${s?.village?.name ?? "Verifikasi E-Surat"}` }],
    };
  },
  component: Admin,
});
