import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import LacakPage from "@/pages/LacakPage";

export const Route = createFileRoute("/pelayanan/lacak")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `Lacak Surat — ${s?.village?.name ?? "Desa"}` },
        {
          name: "description",
          content: "Lacak status pengajuan surat Anda secara publik tanpa login.",
        },
      ],
    };
  },
  component: LacakPage,
});
