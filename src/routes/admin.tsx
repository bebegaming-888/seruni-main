import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getSettings } from "@/lib/settings-store";

const Admin = lazy(() => import("@/pages/Admin"));

export const Route = createFileRoute("/admin")({
  head: () => {
    const s = getSettings();
    return {
      meta: [{ title: `Admin — ${s?.village?.name ?? "Verifikasi E-Surat"}` }],
    };
  },
  component: () => (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Memuat panel admin…</span>
          </div>
        </div>
      }
    >
      <Admin />
    </Suspense>
  ),
});
