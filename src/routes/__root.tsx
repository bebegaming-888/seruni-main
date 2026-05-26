import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/settings-store";
import { getVillage } from "@/lib/village-dynamic";
import { initSentry } from "@/lib/sentry";
import { ErrorBoundary } from "@sentry/react";
import { BottomTabBar } from "@/components/site/BottomTabBar";
import { Preloader } from "@/components/ui/Preloader";

import { useEffect, useState } from "react";
import { initAllStores } from "@/lib/store-init";
import { processOfflineQueue } from "@/lib/offline-queue";
import { initIDBSync, initRemoteSync } from "@/lib/idb-sync";

import appCss from "../styles.css?url";

// Initialize Sentry (production only)
if (typeof window !== "undefined") {
  initSentry();
  // Initialize multi-tab sync
  initIDBSync();
  initRemoteSync();
}

// Register Service Worker di client-side (bukan di dev mode)
// Version diinject via ?v= agar setiap deploy punya SW cache berbeda → auto-update
function useServiceWorker() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!("serviceWorker" in navigator)) return;
    const swUrl = `/sw.js?v=${import.meta.env.VITE_BUILD_HASH ?? Date.now()}`;
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        console.info("[SW] Registered:", reg.scope);
        // Process offline queue on reconnect
        reg.active?.postMessage({ type: "PROCESS_OFFLINE_QUEUE" });
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }, []);
}

function useSmoothScroll() {
  useEffect(() => {
    // CSS-only smooth scroll — no Lenis needed
    document.documentElement.style.scrollBehavior = "smooth";

    // Sync CSS var for scroll position (for parallax)
    const handleScroll = () => {
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
}

// Listen for online event → process offline queue
function useOfflineQueue() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      console.info("[offline-queue] Connection restored, processing queue...");
      processOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    // Also process on mount if online
    if (navigator.onLine) processOfflineQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => {
    // Guard: during SSR (server-side), stores may not be initialized yet.
    // getSettings()/getVillage() return DEFAULT_SETTINGS which has placeholder strings.
    // We use String() coercion to prevent [object Object] in SSR output.
    const settings = getSettings();
    const vName = String(getVillage("name") ?? "Desa Seruni Mumbul");
    const tagline = String(settings?.branding?.tagline ?? `Portal Resmi ${vName}`);
    const villageName = String(getVillage("village") ?? vName);

    // Dynamic color-scheme based on settings (light/dark/system)
    const theme = settings?.appearance?.theme ?? "light";
    const colorScheme = theme === "system" ? "light dark" : theme;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
        { name: "theme-color", content: settings?.branding?.primary_color ?? "#0f7a4a" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: villageName },
        { name: "color-scheme", content: colorScheme },
        { title: villageName },
        { name: "description", content: tagline },
        { name: "author", content: villageName },
        { property: "og:site_name", content: villageName },
        { property: "og:title", content: villageName },
        { property: "og:description", content: tagline },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: villageName },
        { name: "twitter:description", content: tagline },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  useServiceWorker();
  useOfflineQueue();
  useSmoothScroll();

  // FIX (Mei 2026): Apply .dark class to <html> based on theme setting.
  // CSS already defines .dark {} selectors; this activates them.
  useEffect(() => {
    const settings = getSettings();
    const theme = settings?.appearance?.theme ?? "light";
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle("dark", isDark);
    };

    if (theme === "dark") {
      applyTheme(true);
    } else if (theme === "light") {
      applyTheme(false);
    } else {
      // "system" — follow OS preference
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  return (
    <html lang="id">
      <head>
        {/* Prevent dark mode FOUC — must run before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement.classList;if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.add('dark')}else{d.remove('dark')}}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
        >
          Lewati ke konten utama
        </a>
        <SentryErrorFallback>{children}</SentryErrorFallback>
        <Scripts />
      </body>
    </html>
  );
}

/** Sentry ErrorBoundary dengan fallback kustom */
function SentryErrorFallback({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(props: { error: unknown; resetError: () => void }) => {
        const err = props.error as Error | undefined;
        return (
          <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Terjadi Kesalahan
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Aplikasi mengalami error tak terduga. Silakan refresh halaman.
              </p>
              {import.meta.env.DEV && err?.message && (
                <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
                  {err.message}
                </pre>
              )}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={props.resetError}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Coba Lagi
                </button>
                <a
                  href="/"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Ke Beranda
                </a>
              </div>
            </div>
          </div>
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function RootComponent() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState("Memuat...");

  useEffect(() => {
    console.info("[root] Starting store initialization...");

    let timeoutFired = false;
    const timeoutId = setTimeout(() => {
      console.warn("[root] ⏰ 20s ABSOLUTE TIMEOUT — forcing ready (stores may be incomplete)");
      timeoutFired = true;
      setReady(true);
    }, 20_000);

    initAllStores()
      .then(() => {
        clearTimeout(timeoutId);
        if (!timeoutFired) {
          console.info("[root] ✅ All stores initialized successfully");
          setInitProgress("Hampir siap...");
          setReady(true);
        } else {
          console.warn("[root] Init completed after timeout already fired");
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error("[root] ❌ Store initialization failed:", err);
        console.error("[root] Error stack:", err?.stack);
        setError(err instanceof Error ? err.message : "Initialization failed");
        setInitProgress("Initialization failed");
        // DO NOT setReady(true) — keep error screen visible
      });
  }, []);

  if (!ready) {
    // Loading state dengan spinner + progress message
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-xs">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-ui text-sm text-muted-foreground">{initProgress}</p>
          {error && <div className="mt-2 text-xs text-destructive font-mono">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <Preloader />
      <div id="main-content" className="pb-tab-bar">
        <Outlet />
      </div>
      <BottomTabBar />
      <Toaster richColors position="top-right" />
    </>
  );
}
