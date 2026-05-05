import { useEffect, useState } from "react";
import { Link } from "@/components/Link";
import { Menu, X, Search, Bell, ChevronDown, ArrowUpRight } from "lucide-react";
import { NAV, VILLAGE } from "@/data/site";

// ─── Logo / Brand ───────────────────────────────────────────────────────────
function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">
        S
      </div>
      <div className="hidden sm:block leading-tight">
        <div className="font-ui text-[13px] font-bold text-white">{VILLAGE.name}</div>
        <div className="font-ui text-[10px] text-white/70">Pringgabaya · Lombok Timur</div>
      </div>
    </Link>
  );
}

// ─── Desktop Navigation ─────────────────────────────────────────────────────
function DesktopNav({
  openMenu,
  onMenuEnter,
  onMenuLeave,
}: {
  openMenu: string | null;
  onMenuEnter: (label: string) => void;
  onMenuLeave: () => void;
}) {
  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      {NAV.map((item) => (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() => item.children && onMenuEnter(item.label)}
          onMouseLeave={onMenuLeave}
        >
          {item.children ? (
            <button className="flex items-center gap-1 rounded-full px-2.5 py-1.5 font-ui text-[13px] font-medium text-white hover:text-primary transition-colors">
              {item.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          ) : (
            <Link
              to={item.to}
              className="block rounded-full px-2.5 py-1.5 font-ui text-[13px] font-medium text-white hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          )}

          {/* Dropdown */}
          {item.children && openMenu === item.label && (
            <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 animate-fade-up">
              <div className="w-[340px] rounded-3xl bg-card p-3 shadow-elev border border-border">
                {item.children.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="group flex items-start justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-cream transition-colors"
                  >
                    <div>
                      <div className="font-ui text-sm font-semibold text-ink group-hover:text-primary">
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

// ─── Desktop Action Buttons ───────────────────────────────────────────────────
function DesktopActions() {
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <button
        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-colors"
        aria-label="Cari"
      >
        <Search className="h-3.5 w-3.5" />
      </button>
      <button
        className="h-8 w-8 flex items-center justify-center rounded-full relative bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="h-3.5 w-3.5" />
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
      </button>
      <Link
        to="/login"
        className="hidden md:inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-3.5 py-1.5 font-ui text-[13px] font-semibold transition-colors"
      >
        Login
      </Link>
    </div>
  );
}

// ─── Hamburger Button ───────────────────────────────────────────────────────
// Selalu terlihat di mobile. Warna latar berubah saat scrolled.
function HamburgerButton({
  open,
  scrolled,
  onClick,
}: {
  open: boolean;
  scrolled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full shadow-md active:scale-95 cursor-pointer border border-black/20 transition-colors"
      style={{ backgroundColor: scrolled ? "rgba(22,25,31,0.96)" : "rgba(30,34,42,0.88)" }}
      aria-label={open ? "Tutup menu" : "Buka menu"}
      aria-expanded={open}
    >
      <span className="text-white">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </span>
    </button>
  );
}

// ─── Mobile Menu Drawer ─────────────────────────────────────────────────────
// Muncul saat `open=true`. Menutup saat: backdrop diklik, X diklik, link diklik, Escape ditekan.
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Lock scroll saat menu terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Tutup saat Escape ditekan
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi"
    >
      {/* Backdrop — klik untuk tutup */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-card shadow-elev overflow-y-auto p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <div className="font-display text-xl font-bold text-ink">{VILLAGE.name}</div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-cream flex items-center justify-center"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => (
            <div key={item.label} className="border-b border-border last:border-0">
              {item.children ? (
                <details className="group">
                  <summary className="flex items-center justify-between py-3 font-ui font-semibold text-ink cursor-pointer list-none">
                    {item.label}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pl-3 pb-3 space-y-1">
                    {item.children.map((c) => (
                      <Link
                        key={c.to}
                        to={c.to}
                        onClick={onClose}
                        className="block py-2 font-ui text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ) : (
                <Link
                  to={item.to}
                  onClick={onClose}
                  className="block py-3 font-ui font-semibold text-ink"
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <Link
          to="/login"
          onClick={onClose}
          className="mt-6 flex items-center justify-center gap-1 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-3.5 py-2.5 font-ui text-[13px] font-semibold transition-colors"
        >
          Login
        </Link>
      </div>
    </div>
  );
}

// ─── Sticky Bar Shell ───────────────────────────────────────────────────────
// Menubar utama. Logo + desktop nav + desktop actions + hamburger.
// Saat scrolled: nav items berubah transparan.
// Menggunakan z-index terpusat untuk semua child.
function StickyBar({
  scrolled,
  openMenu,
  onMenuEnter,
  onMenuLeave,
  mobileOpen,
  onMobileToggle,
  onMobileClose,
}: {
  scrolled: boolean;
  openMenu: string | null;
  onMenuEnter: (label: string) => void;
  onMenuLeave: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  onMobileClose: () => void;
}) {
  const navVisible = !scrolled;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4 pointer-events-none">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 pointer-events-auto transition-all duration-300 ${
            scrolled
              ? "bg-transparent border-transparent shadow-none"
              : "backdrop-blur-xl border bg-white/15 border-white/20 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.25)]"
          }`}
        >
          {/* Brand — selalu terlihat */}
          <Brand />

          {/* Desktop nav — fade out saat scrolled (pointer-events-noninteractive tetap aktif) */}
          <div
            className={`hidden lg:block transition-all duration-300 ${
              navVisible
                ? "opacity-100 translate-y-0 max-w-3xl"
                : "opacity-0 -translate-y-1 max-w-0 overflow-hidden"
            }`}
          >
            <DesktopNav openMenu={openMenu} onMenuEnter={onMenuEnter} onMenuLeave={onMenuLeave} />
          </div>

          {/* Desktop actions + hamburger */}
          <div className="flex items-center gap-1.5">
            <div
              className={`transition-all duration-300 ${navVisible ? "opacity-100" : "opacity-0"}`}
            >
              <DesktopActions />
            </div>
            <HamburgerButton open={mobileOpen} scrolled={scrolled} onClick={onMobileToggle} />
          </div>
        </div>
      </header>

      {/* Mobile menu overlay — di luar header agar tidak tertimpa z-index */}
      <MobileMenu open={mobileOpen} onClose={onMobileClose} />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Dropdown desktop — tutup saat scroll bergerak
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Scroll detection dengan hysteresis
  useEffect(() => {
    let rafId: number | null = null;
    let lastY = 0;

    const update = () => {
      setScrolled((prev) => (prev ? lastY > 16 : lastY > 32));
      rafId = null;
    };

    const onScroll = () => {
      lastY = window.scrollY;
      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    // Inisialisasi
    lastY = window.scrollY;
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Tutup mobile menu saat route berubah (navigasi)
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Tutup dropdown desktop saat scroll
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    window.addEventListener("scroll", handler, { once: true });
    return () => window.removeEventListener("scroll", handler);
  }, [openMenu]);

  return (
    <StickyBar
      scrolled={scrolled}
      openMenu={openMenu}
      onMenuEnter={setOpenMenu}
      onMenuLeave={() => setOpenMenu(null)}
      mobileOpen={mobileOpen}
      onMobileToggle={() => setMobileOpen((v) => !v)}
      onMobileClose={() => setMobileOpen(false)}
    />
  );
}
