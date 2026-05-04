import { createFileRoute } from "@tanstack/react-router";
import ESurat from "@/pages/ESurat";

export const Route = createFileRoute("/pelayanan/e-surat")({
  head: () => ({
    meta: [
      { title: "E-Surat — Layanan Surat Online Desa Seruni Mumbul" },
      {
        name: "description",
        content:
          "Ajukan surat desa secara online. Verifikasi NIK otomatis, form terpandu, dan dokumen dikirim via WhatsApp.",
      },
    ],
  }),
  component: ESurat,
});
