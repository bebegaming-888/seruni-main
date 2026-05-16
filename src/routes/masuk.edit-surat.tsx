import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import EditSurat from "@/pages/EditSurat";

export const Route = createFileRoute("/masuk/edit-surat")({
  validateSearch: (search: Record<string, unknown>): { no?: string } => ({
    no: typeof search.no === "string" ? search.no : undefined,
  }),
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `Koreksi Pengajuan — E-Surat ${s?.village?.name ?? "Desa"}` },
        { name: "description", content: "Koreksi atau perbaiki data pengajuan surat Anda." },
      ],
    };
  },
  component: EditSurat,
});