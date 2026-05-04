import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Verifikasi E-Surat Desa" }],
  }),
  component: Admin,
});
