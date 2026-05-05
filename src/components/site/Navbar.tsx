import { useEffect, useState } from "react";
import { Link } from "@/components/Link";
import { Menu, X, Search, Bell, ChevronDown, ArrowUpRight } from "lucide-react";
import { NAV, VILLAGE } from "@/data/site";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    let lastY = window.scrollY;
    const update = () => {
      // Hysteresis: turn on >32, off <16 — prevents flicker near threshold
      setScrolled((prev) => (prev ? lastY > 16 : lastY > 32));
      ticking = false;
    };
    const onScroll = () => {
      lastY = window.scrollY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 transition-all duration-300 ${scrolled ? "bg-transparent border-transparent shadow-none backdrop-blur-0" : "backdrop-blur-xl border bg-white/15 border-white/20 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.25)]"}`}
      >
        <Link
          to="/"
          className={`flex items-center gap-2 shrink-0 transition-all duration-300 overflow-hidden ${scrolled ? "opacity-0 pointer-events-none -translate-x-2 w-0" : "opacity-100 translate-x-0"}`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">
            S
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-ui text-[13px] font-bold text-white">{VILLAGE.name}</div>
            <div className="font-ui text-[10px] text-white/70">Pringgabaya · Lombok Timur</div>
          </div>
        </Link>

        <nav
          className={`hidden lg:flex items-center gap-0.5 transition-all duration-300 ease-out ${scrolled ? "opacity-0 -translate-y-1 pointer-events-none max-w-0 overflow-hidden" : "opacity-100 translate-y-0 max-w-3xl"}`}
        >
          {NAV.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
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
                          <div className="font-body text-xs text-muted-foreground mt-0.5">
                            {c.desc}
                          </div>
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

        <div className="flex items-center gap-1.5">
          <button
            className={`h-8 w-8 items-center justify-center rounded-full transition-all duration-300 bg-white/15 text-white hover:bg-white/25 border border-white/20 ${scrolled ? "hidden opacity-0 scale-95" : "hidden sm:flex opacity-100 scale-100"}`}
            aria-label="Cari"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            className={`h-8 w-8 items-center justify-center rounded-full transition-all duration-300 relative bg-white/15 text-white hover:bg-white/25 border border-white/20 ${scrolled ? "hidden opacity-0 scale-95" : "hidden sm:flex opacity-100 scale-100"}`}
            aria-label="Notifikasi"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
          </button>
          <Link
            to="/login"
            className={`items-center gap-1 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover px-3.5 py-1.5 font-ui text-[13px] font-semibold transition-all duration-300 ${scrolled ? "hidden opacity-0 scale-95" : "hidden md:inline-flex opacity-100 scale-100"}`}
          >
            Login
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full shadow-md active:scale-95 cursor-pointer border border-black/20"
            style={{ backgroundColor: scrolled ? "rgba(22,25,31,0.95)" : "rgba(30,34,42,0.85)" }}
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="text-white">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-card shadow-elev overflow-y-auto p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <div className="font-display text-xl font-bold text-ink">{VILLAGE.name}</div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-full bg-cream flex items-center justify-center"
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
                            onClick={() => setOpen(false)}
                            className="block py-2 font-ui text-sm text-muted-foreground hover:text-primary"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
              className="mt-6 btn-pill bg-primary text-primary-foreground w-full justify-center"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
