import { createFileRoute, HeadContent } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import { getVillage } from "@/lib/village-dynamic";
import { useState, useEffect, Component, type ReactNode } from "react";

import IndexPage from "@/pages/Index";

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
  component: IndexRouteWithBoundary,
});

// ── Error Boundary untuk Index page ──────────────────────────────────────────
// Prevents entire page from white-screening if a single section throws.
// Shows fallback content instead of crashing the whole page.
class IndexErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[IndexErrorBoundary] Caught error:", error.message, error.stack);
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-12 text-center bg-cream" role="alert" aria-live="polite">
          <p className="font-ui text-sm text-muted-foreground">Bagian ini sedang tidak tersedia.</p>
          {import.meta.env.DEV && this.state.error && (
            <p className="mt-2 text-xs text-destructive font-mono max-w-md mx-auto">
              {this.state.error}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Safe wrapper: catches render errors per section ──────────────────────────
// Wraps the entire page so any thrown error is caught without white-screening.
function SafeIndexPage() {
  return (
    <IndexErrorBoundary>
      <IndexPage />
    </IndexErrorBoundary>
  );
}

// ── Main route component ───────────────────────────────────────────────────────
function IndexRouteWithBoundary() {
  return <SafeIndexPage />;
}
