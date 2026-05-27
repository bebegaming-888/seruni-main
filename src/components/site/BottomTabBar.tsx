/**
 * BottomTabBar — Persistent mobile navigation for public pages.
 *
 * Shows 5 tabs: Beranda, E-Surat, Lacak, Akun, Menu
 * - Only visible on mobile (<lg)
 * - Hidden on admin routes (/admin/*)
 * - Glass morphism design, 72px tall
 * - "Akun" tab changes based on auth state
 * - "Menu" tab opens the existing FullScreenMenu overlay
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, FileText, Search, User, Menu, LayoutDashboard, X, ArrowUpRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getWargaSession } from "@/lib/warga-auth";
import { useSession } from "@/lib/auth";
import { NAV } from "@/data/navigation";

// ── Tab definitions ──────────────────────────────────────────────────────────

type Tab = {
  label: string;
  href?: string;
  icon: React.ElementType;
  isMenu?: boolean;
};

function useAuthState() {
  const session = useSession();
  const warga = getWargaSession();
  return {
    isLoggedIn: !!(session || warga),
    akunHref: session || warga ? "/admin" : "/masuk/warga",
  };
}

// ── Full-screen overlay opened from "Menu" tab ────────────────────────────────

function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const standaloneItems = NAV.filter((item) => !item.children);
  const categoryItems = NAV.filter((item) => item.children);

  return (
    <div
      className={`nav-overlay${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi"
    >
      {/* Background tile with clip-path animation */}
      <div className="nav-overlay-tile" />

      {/* Content */}
      <div className="relative h-full flex flex-col px-6 sm:px-12 pt-6 pb-safe">
        {/* Header with enhanced close */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          {/* Brand text */}
          <span className="font-display text-lg font-bold text-white/60 tracking-tight">MENU</span>
          <button
            onClick={onClose}
            className="nav-overlay-close flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Standalone links */}
        {standaloneItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 shrink-0">
            {standaloneItems.map((item) => (
              <Link
                key={item.to}
                to={item.to as never}
                onClick={onClose}
                className="nav-overlay-link inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-primary px-4 py-2 font-ui text-sm font-semibold text-white transition-all"
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            ))}
          </div>
        )}
        <div className="w-full h-px bg-white/10 mb-4 shrink-0" />

        {/* Nav links with stagger */}
        <nav className="nav-overlay-links flex-1 min-h-0 overflow-y-auto">
          {categoryItems.map((category) => (
            <div key={category.label} className="mb-6">
              <div className="font-ui text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 mb-1">
                {category.label}
              </div>
              {category.children?.map((child) => (
                <Link
                  key={child.to}
                  to={child.to as never}
                  onClick={onClose}
                  className="nav-overlay-item group flex items-center justify-between rounded-lg px-2 py-4 hover:bg-white/10 transition-colors"
                >
                  <span className="nav-overlay-link nav-overlay-link-text font-display text-2xl font-bold text-white/70 group-hover:text-white transition-colors truncate">
                    {child.label}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-white/20 group-hover:text-primary transition-colors shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 pt-4 border-t border-white/10">
          <p className="font-ui text-xs text-white/30 text-center">
            Desa Seruni Mumbul — Portal Resmi
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Single tab button ────────────────────────────────────────────────────────

function TabButton({
  tab,
  isActive,
  onToggleMenu,
}: {
  tab: Tab;
  isActive: boolean;
  onToggleMenu: () => void;
}) {
  const Icon = tab.icon;

  if (tab.isMenu) {
    return (
      <button
        type="button"
        onClick={onToggleMenu}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-[72px] transition-colors cursor-pointer ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
        }`}
        aria-label="Menu"
      >
        {isActive ? <Menu className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        <span className={`font-ui text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>
          Menu
        </span>
      </button>
    );
  }

  if (tab.href) {
    return (
      <Link
        to={tab.href as never}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-[72px] transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.75} />
        <span className={`font-ui text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>
          {tab.label}
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={tab.label}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-[72px] transition-colors cursor-pointer ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
      }`}
    >
      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.75} />
      <span className={`font-ui text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>
        {tab.label}
      </span>
    </button>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function BottomTabBar() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Resolve auth state BEFORE the early return (Rules of Hooks)
  const session = useSession();
  const warga = getWargaSession();
  const isLoggedIn = !!(session || warga);
  const akunHref = isLoggedIn ? "/admin" : "/masuk/warga";

  // Hide on admin routes or if not mobile
  const isAdminRoute = location.pathname.startsWith("/admin");
  if (!isMobile || isAdminRoute) return null;

  const tabs: Tab[] = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "E-Surat", href: "/pelayanan/e-surat", icon: FileText },
    { label: "Lacak", href: "/pelayanan/lacak", icon: Search },
    {
      label: "Akun",
      href: akunHref,
      icon: isLoggedIn ? LayoutDashboard : User,
    },
    { label: "Menu", icon: Menu, isMenu: true },
  ];

  const isActive = (tab: Tab): boolean => {
    if (tab.isMenu) return menuOpen;
    if (!tab.href) return false;
    if (tab.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(tab.href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex items-stretch bg-white/90 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{
          height: "calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        role="navigation"
        aria-label="Menu utama mobile"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.label}
            tab={tab}
            isActive={isActive(tab)}
            onToggleMenu={() => setMenuOpen((v) => !v)}
          />
        ))}
      </nav>

      {/* Menu overlay */}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
