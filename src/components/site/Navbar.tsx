/**
 * Navbar — Main site navigation bar.
 *
 * Behavior:
 * - !scrolled : Full navbar pill visible (desktop = links + login, mobile = hamburger)
 * - scrolled  : Entire navbar HIDDEN. Only a floating hamburger button appears.
 * - Hamburger click → Full-screen menu overlay with categorized navigation.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "@/components/Link";
import { useSession } from "@/lib/auth";
import { Menu, X, ChevronDown, ArrowUpRight, LayoutDashboard, LogOut } from "lucide-react";
import { NAV } from "@/data/navigation";
import { useSettings } from "@/lib/settings-store";
import { useVillage } from "@/hooks/use-village";

// ─── Brand / Logo ─────────────────────────────────────────────────────────────
function Brand() {
  const { village: villageName, district, regency } = useVillage();
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">
        {villageName[0]}
      </div>
      <div className="hidden sm:block leading-tight">
        <div className="font-ui text-[13px] font-bold text-white">{villageName}</div>
        <div className="font-ui text-[10px] text-white/70">
          {district} · {regency}
        </div>
      </div>
    </Link>
  );
}

// ─── Desktop Actions ──────────────────────────────────────────────────────────
function DesktopActions() {
  const session = useSession();
  return (
    <div className="hidden lg:flex items-center gap-1.5">
      {session ? (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-3.5 py-1.5 font-ui text-[13px] font-semibold transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      ) : (
        <Link
          to="/login"
          className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-3.5 py-1.5 font-ui text-[13px] font-semibold transition-colors"
        >
          Login
        </Link>
      )}
    </div>
  );
}

// ─── Desktop Navigation with Dropdown ─────────────────────────────────────────
function DesktopNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback((label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenMenu(label);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 120);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    window.addEventListener("scroll", handler, { once: true });
    return () => window.removeEventListener("scroll", handler);
  }, [openMenu]);

  return (
    <nav
      className="hidden lg:flex items-center gap-0.5"
      role="navigation"
      aria-label="Menu utama desktop"
    >
      {NAV.map((item) => (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() => item.children && handleEnter(item.label)}
          onMouseLeave={handleLeave}
        >
          {item.children ? (
            <button
              type="button"
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 font-ui text-[13px] font-medium text-white hover:text-primary transition-colors"
              aria-expanded={openMenu === item.label}
              aria-haspopup="true"
              onClick={() => setOpenMenu((prev) => (prev === item.label ? null : item.label))}
            >
              {item.label}
              <ChevronDown
                className={`h-3 w-3 opacity-60 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <Link
              to={item.to}
              className="block rounded-full px-2.5 py-1.5 font-ui text-[13px] font-medium text-white hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          )}

          {item.children && openMenu === item.label && (
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 pt-3 animate-fade-up z-50"
              onMouseEnter={() => handleEnter(item.label)}
              onMouseLeave={handleLeave}
            >
              <div className="w-[340px] rounded-3xl bg-card p-3 shadow-elev border border-border">
                {item.children.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    onClick={() => setOpenMenu(null)}
                    className="group flex items-start justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted dark:hover:bg-muted/80 transition-colors"
                  >
                    <div>
                      <div className="font-ui text-sm font-semibold text-foreground group-hover:text-primary">
                        {c.label}
                      </div>
                      <div className="font-body text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Full-Screen Menu Overlay ──────────────────────────────────────────────────
function FullScreenMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const { district } = useVillage();

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
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
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi"
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0d1017]/97 backdrop-blur-xl" />

      {/* Content — flex column, full height, no scroll */}
      <div className="relative h-full flex flex-col px-5 sm:px-10 lg:px-16 pt-5 pb-4">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <Brand />
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* ── Standalone links (Beranda) ── */}
        {standaloneItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 shrink-0">
            {standaloneItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-primary px-4 py-1.5 font-ui text-sm font-semibold text-white transition-all"
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            ))}
          </div>
        )}

        <div className="w-full h-px bg-white/10 mb-3 shrink-0" />

        {/* ── Category grid — fills remaining height, single-line items, no desc ── */}
        <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-3 gap-x-4 overflow-hidden">
          {categoryItems.map((category) => (
            <div key={category.label} className="overflow-hidden">
              {/* Category header */}
              <div className="font-ui text-[11px] font-bold text-white/40 uppercase tracking-widest px-2 pt-2 pb-1">
                {category.label}
              </div>
              {/* Items — label only, no description */}
              {category.children?.map((child) => (
                <Link
                  key={child.to}
                  to={child.to}
                  onClick={onClose}
                  className="group flex items-center justify-between rounded-lg px-2 py-[9px] hover:bg-white/8 transition-colors"
                >
                  <span className="font-ui text-[15px] font-medium text-white/80 group-hover:text-white transition-colors truncate leading-none">
                    {child.label}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/20 group-hover:text-primary transition-colors shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* ── Bottom auth bar ── */}
        <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="font-body text-xs text-white/25 truncate">{district}</div>
          <div className="flex items-center gap-2 shrink-0">
            {session ? (
              <>
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 font-ui text-sm font-semibold transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    import("@/lib/auth").then(({ logout }) => logout());
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 font-ui text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 font-ui text-sm font-semibold transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll detection
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 50);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Close menu on SPA route change
  useEffect(() => {
    const handler = () => setMenuOpen(false);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <>
      {/* ── Full navbar pill — HIDDEN when scrolled ── */}
      <header
        className={`fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4 pointer-events-none transition-all duration-300 ${
          scrolled ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 pointer-events-auto backdrop-blur-xl border bg-white/15 border-white/20 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.25)]">
          <Brand />

          {/* Desktop nav links */}
          <DesktopNav />

          {/* Right side: login (desktop) + hamburger (mobile only when not scrolled) */}
          <div className="flex items-center gap-1.5">
            <DesktopActions />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full bg-ink/88 border border-black/20 shadow-md active:scale-95 cursor-pointer transition-colors"
              aria-label="Buka menu"
              aria-expanded={menuOpen}
            >
              <span className="text-white">
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Floating hamburger — ONLY visible when scrolled ── */}
      {scrolled && (
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="fixed top-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink/95 backdrop-blur-md border border-white/10 shadow-xl active:scale-95 cursor-pointer transition-all hover:scale-105"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
        >
          <span className="text-white">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
      )}

      {/* ── Full-screen menu overlay ── */}
      <FullScreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
