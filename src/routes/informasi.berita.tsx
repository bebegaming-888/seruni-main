/**
 * informasi.berita.tsx — News portal listing page
 *
 * BRAND COMPLIANT — full rewrite:
 *   Navbar + Footer  → @/components/site/{Navbar,Footer}
 *   Fonts           → Fraunces (display) | Raleway (body) | Poppins (ui)
 *   Brand Palette   → E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
 *   Dark mode       → brand palette surface overrides only
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useSettings } from "@/lib/settings-store";
import { PageHero } from "@/components/sections/PageHero";
import {
  CATEGORIES,
  formatRelativeDate,
  formatDate,
  type Article,
  type ArticleCategory,
} from "@/data/berita";
import { useBeritaStore } from "@/lib/content-store";
import { Newspaper, Eye, Clock, Search, X, CalendarDays, User, Bookmark } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { ArticleCardSkeleton } from "@/components/ui/skeleton";

// ── Category Brand Colors ─────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { text: string; bg: string }> = {
  Berita: { text: "text-[hsl(27,79%,52%)]", bg: "bg-[hsl(27,79%,52%_/_0.1)]" },
  Pengumuman: { text: "text-[hsl(27,55%,71%)]", bg: "bg-[hsl(27,55%,71%_/_0.1)]" },
  Agenda: { text: "text-[hsl(190,75%,36%)]", bg: "bg-[hsl(190,75%,36%_/_0.1)]" },
};

function getCatStyle(cat: string) {
  return CAT_STYLE[cat] ?? { text: "text-muted-foreground", bg: "bg-muted" };
}

// ── Color constants (HSL, Tailwind-safe) ───────────────────────────────────────
const HSL_ORANGE = "text-[hsl(27,79%,52%)]";
const HSL_WARM = "text-[hsl(27,55%,71%)]";
const HSL_TEAL = "text-[hsl(190,75%,36%)]";
const HSL_BG_ORANGE = "bg-[hsl(27,79%,52%_/_0.1)]";
const HSL_BG_TEAL = "bg-[hsl(190,75%,36%_/_0.1)]";
const HSL_LIGHT = "bg-[hsl(0,0%,96%)]"; // ≈ #F4F4F4
const HSL_BORDER = "border-[hsl(0,0%,84%)]"; // ≈ #D5D5D5

// ── Hero Primary Article ─────────────────────────────────────────────────────
function HeroPrimary({ article }: { article: Article }) {
  return (
    <article className="flex flex-col gap-4">
      <Link
        to="/informasi/berita/$slug"
        params={{ slug: article.slug }}
        search={{} as any}
        className="block aspect-video overflow-hidden rounded-2xl bg-muted"
      >
        {article.cover_image ? (
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
            width={1280}
            height={720}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[hsl(0,0%,96%)]">
            <Newspaper className="h-12 w-12 text-[hsl(0,0%,84%)]" />
          </div>
        )}
      </Link>
      <div>
        {(() => {
          const cs = getCatStyle(article.category);
          return (
            <Link
              to="/informasi/berita"
              search={{ q: "", category: article.category }}
              className={`inline-block text-[11px] font-ui font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cs.bg}`}
              style={{ color: cs.text }}
            >
              {article.category}
            </Link>
          );
        })()}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight mt-2 mb-3">
          <Link to="/informasi/berita/$slug" params={{ slug: article.slug }} search={{} as any}>
            {article.title}
          </Link>
        </h2>
        <p className="font-body text-muted-foreground leading-relaxed text-sm sm:text-base mb-4 line-clamp-3">
          {article.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground font-ui">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {article.author.nama}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(article.published_at)}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.read_time} menit
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Hero Secondary Article ───────────────────────────────────────────────────
function HeroSecondary({ article }: { article: Article }) {
  const cs = getCatStyle(article.category);
  return (
    <article className="flex items-start gap-3 py-4 border-b border-border last:border-0 last:pb-0 first:pt-0">
      {article.cover_image && (
        <Link
          to="/informasi/berita/$slug"
          params={{ slug: article.slug }}
          search={{} as any}
          className="shrink-0 w-20 h-16 overflow-hidden rounded-xl bg-muted"
        >
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            width={640}
            height={360}
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <span
          className="inline-block text-[10px] font-ui font-bold uppercase tracking-wider mb-1"
          style={{ color: cs.text }}
        >
          {article.category}
        </span>
        <h3 className="font-display text-sm font-semibold text-ink leading-tight line-clamp-2">
          <Link to="/informasi/berita/$slug" params={{ slug: article.slug }} search={{} as any}>
            {article.title}
          </Link>
        </h3>
        <p className="text-[11px] text-muted-foreground font-ui mt-1">
          {formatRelativeDate(article.published_at)} · {article.read_time}m
        </p>
      </div>
    </article>
  );
}

// ── Grid Article Card ─────────────────────────────────────────────────────────
function ArticleCard({ article }: { article: Article }) {
  const cs = getCatStyle(article.category);
  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card hover:border-[hsl(27,79%,52%_/_0.3)] transition group flex flex-col">
      <Link
        to="/informasi/berita/$slug"
        params={{ slug: article.slug }}
        search={{} as any}
        className="block aspect-video overflow-hidden bg-[hsl(0,0%,96%)]"
      >
        {article.cover_image ? (
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
            width={640}
            height={360}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="h-8 w-8 text-[hsl(0,0%,84%)]" />
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <span
          className="inline-block text-[10px] font-ui font-bold uppercase tracking-wider"
          style={{ color: cs.text }}
        >
          {article.category}
        </span>
        <h3 className="font-display text-base font-bold text-ink leading-snug line-clamp-2 flex-1">
          <Link to="/informasi/berita/$slug" params={{ slug: article.slug }} search={{} as any}>
            {article.title}
          </Link>
        </h3>
        <p className="font-body text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
          <div>
            <p className="font-ui text-[11px] font-semibold text-foreground">
              {article.author.nama}
            </p>
            <p className="font-ui text-[10px] text-muted-foreground">
              {formatRelativeDate(article.published_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-ui">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.read_time}m
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.views}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

// Skeleton now imported from @/components/ui/skeleton

// ── Main Page ─────────────────────────────────────────────────────────────────
function BeritaPage() {
  const { village } = useSettings();
  const store = useBeritaStore();
  const items = store.items;

  useEffect(() => {
    store.load();
  }, [store]);

  const search = useSearch({ from: "/informasi/berita" });
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState(search.q ?? "");
  const [searchFocused, setSearchFocused] = useState(false);

  const selectedCategory = (search.category as string) ?? "Semua";
  const searchQuery = (search.q as string) ?? "";

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      navigate({ search: { q: inputValue, category: selectedCategory } as any });
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue, selectedCategory, navigate]);

  const setCategory = useCallback(
    (cat: string) => navigate({ search: { q: inputValue, category: cat } as any }),
    [navigate, inputValue],
  );

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of items) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (selectedCategory !== "Semua" && a.category !== selectedCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        (a.tags as string[]).some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [items, selectedCategory, searchQuery]);

  const heroPrimary = filtered[0];
  const heroSecondary = filtered.slice(1, 4);
  const gridItems = filtered.slice(selectedCategory === "Semua" && !searchQuery ? 4 : 0);

  const isLoading = items.length === 0;

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        <PageHero
          titleFirst="Portal"
          titleSecond="Berita"
          description="Kabar terkini seputar kegiatan, pengumuman, dan agenda desa — faktual dari pemerintah desa."
          badge="Informasi"
          badgeIcon={<Newspaper className="h-3.5 w-3.5" />}
          breadcrumbs={[{ label: "Informasi" }, { label: "Berita" }]}
        />

        {/* Date bar */}
        <div className="bg-[hsl(0,0%,96%)] border-b border-[hsl(0,0%,84%)]">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-end">
            <span className="font-ui text-[11px] text-muted-foreground">{todayStr}</span>
          </div>
        </div>

        {/* Hero */}
        {!isLoading && (
          <section className="py-10 px-4">
            <div className="max-w-6xl mx-auto">
              {heroPrimary ? (
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2">
                    <HeroPrimary article={heroPrimary} />
                  </div>
                  <div className="border-l border-border pl-8 space-y-0 divide-y divide-border">
                    <h3 className="font-ui text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pt-1">
                      Lainnya
                    </h3>
                    {(heroSecondary.length > 0 ? heroSecondary : items.slice(0, 3)).map((a) => (
                      <HeroSecondary key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                  <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h2 className="font-display text-2xl font-bold text-ink mb-2">
                    Portal Berita {village.name}
                  </h2>
                  <p className="font-body text-muted-foreground">
                    Portal informasi kegiatan, pengumuman, dan berita desa.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Category filter */}
        <div className="sticky-nav bg-background border-b border-[hsl(0,0%,84%)]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategory("Semua")}
                className={`inline-flex items-center gap-1.5 px-4 py-3 border-b-2 font-ui text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === "Semua"
                    ? "border-[hsl(27,79%,52%)] text-[hsl(27,79%,52%)]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
                <span className="text-[10px] font-normal">({items.length})</span>
              </button>
              {CATEGORIES.map((cat) => {
                const cs = getCatStyle(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-4 py-3 border-b-2 font-ui text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "border-[hsl(27,79%,52%)] text-[hsl(27,79%,52%)]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    style={selectedCategory === cat ? {} : { color: cs.text }}
                  >
                    {cat}
                    <span className="text-[10px] font-normal">({categoryCounts[cat] ?? 0})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-[hsl(0,0%,84%)]">
              <h2 className="font-display text-lg font-bold text-ink">
                {selectedCategory === "Semua"
                  ? searchQuery
                    ? `Hasil pencarian: "${searchQuery}"`
                    : "Semua Artikel"
                  : selectedCategory}
              </h2>
              <span className="font-ui text-xs text-muted-foreground">
                {isLoading ? "..." : `${filtered.length} artikel`}
              </span>
            </div>

            {/* Skeleton */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            ) : gridItems.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(27,79%,52%_/_0.1)] flex items-center justify-center mx-auto mb-4">
                  <Newspaper className="h-7 w-7 text-[hsl(27,79%,52%)]" />
                </div>
                <h3 className="font-display text-xl font-bold text-ink mb-2">
                  {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "Belum Ada Artikel"}
                </h3>
                <p className="font-body text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  {searchQuery
                    ? "Coba kata kunci lain atau pilih kategori berbeda."
                    : "Artikel akan muncul setelah ditambahkan oleh admin desa."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setInputValue("");
                      setCategory("Semua");
                    }}
                    className="btn-pill bg-ink text-background hover:bg-ink/90"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {gridItems.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export const Route = createFileRoute("/informasi/berita")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    category:
      typeof search.category === "string" && CATEGORIES.includes(search.category as ArticleCategory)
        ? (search.category as ArticleCategory)
        : ("Semua" as string),
  }),
  component: BeritaPage,
});
