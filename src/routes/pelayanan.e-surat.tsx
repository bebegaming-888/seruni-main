import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import ESurat from "@/pages/ESurat";

export const Route = createFileRoute("/pelayanan/e-surat")({
  validateSearch: (search: Record<string, unknown>): { kode?: string } => ({
    kode: typeof search.kode === "string" ? search.kode : undefined,
  }),
  head: () => {
    const s = getSettings();
    return {
      meta: [
        { title: `E-Surat — Layanan Surat Online ${s?.village?.name ?? "Desa"}` },
        {
          name: "description",
          content:
            "Ajukan surat desa secara online. Verifikasi NIK otomatis, form terpandu, dan dokumen dikirim via WhatsApp.",
        },
      ],
    };
  },
  component: ESurat,
});
