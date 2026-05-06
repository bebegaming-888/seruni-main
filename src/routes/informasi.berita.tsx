import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { VILLAGE } from "@/data/site";
import { Link } from "@/components/Link";
import { CATEGORIES, formatRelativeDate, type Article, type ArticleCategory } from "@/data/berita";
import { useBeritaStore } from "@/lib/content-store";
import { Newspaper, Eye, Clock, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/informasi/berita")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "Semua",
  }),
  component: () => <BeritaPage />,
});

function Badge({
  label,
  color = "text-primary",
  bg = "bg-primary/10",
  border = "border-primary/20",
}: {
  label: string;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold ${color} ${bg} ${border}`}
    >
      {label}
    </span>
  );
}

function FeaturedCard({ article }: { article: Article }) {
  return (
    <Link
      to="/informasi/berita/$slug"
      params={{ slug: article.slug }}
      className="group relative flex flex-col sm:flex-row gap-4 rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      {/* Cover */}
      <div className="sm:w-48 h-36 sm:h-auto shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Newspaper className="h-8 w-8 text-primary/50 mb-2" />
          <span className="font-ui text-xs text-primary/60 font-medium">{article.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 min-w-0">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge label={article.category} />
          <span className="font-ui text-[10px] text-muted-foreground">
            {formatRelativeDate(article.published_at)}
          </span>
        </div>
        <h3 className="font-display text-base sm:text-lg font-bold text-ink leading-snug group-hover:text-primary transition-colors mb-2">
          {article.title}
        </h3>
        <p className="font-body text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-ui text-[10px] text-muted-foreground">{article.author.nama}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-ui text-[10px]">{article.read_time} menit</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span className="font-ui text-[10px]">{article.views.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to="/informasi/berita/$slug"
      params={{ slug: article.slug }}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={article.category} />
        <span className="font-ui text-[10px] text-muted-foreground">
          {formatRelativeDate(article.published_at)}
        </span>
      </div>

      <h3 className="font-display text-sm font-bold text-ink leading-snug group-hover:text-primary transition-colors">
        {article.title}
      </h3>

      <p className="font-body text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
        {article.excerpt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-3">
          <span className="font-ui text-[10px] text-muted-foreground truncate max-w-[120px]">
            {article.author.nama}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="font-ui text-[10px]">{article.read_time}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span className="font-ui text-[10px]">{article.views}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 font-ui text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export function BeritaPage() {
  const items = useBeritaStore((state) => state.items);
  const search = useSearch({ from: "/informasi/berita" });
  const navigate = Route.useNavigate();
  const [inputValue, setInputValue] = useState(search.q);

  const selectedCategory = (search.category as ArticleCategory | "Semua") ?? "Semua";
  const searchQuery = search.q ?? "";

  const setCategory = (cat: ArticleCategory | "Semua") =>
    navigate({ search: { q: searchQuery, category: cat } });

  const handleSearch = (val: string) => {
    setInputValue(val);
    navigate({ search: { q: val, category: selectedCategory } });
  };

  const featured = items.filter((a) => a.featured);
  const filtered = items.filter((a) => {
    const matchCategory = selectedCategory === "Semua" || a.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some((t: string) => t.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-12 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
          <div className="max-w-5xl mx-auto relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-5">
              <Newspaper className="h-3.5 w-3.5" />
              Portal Informasi
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              Berita & Artikel
            </h1>
            <p className="font-body text-muted-foreground max-w-xl text-base leading-relaxed mb-5">
              Kabar terkini dari {VILLAGE.name}. Berita desa, pengumuman penting, dan informasi
              kegiatan masyarakat.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 border border-info/20 px-3 py-1 font-ui text-xs font-semibold text-info">
                <Newspaper className="h-3.5 w-3.5" />
                {items.length} Artikel
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 font-ui text-xs font-semibold text-success">
                {featured.length} Featured
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Search */}
        <section className="px-4 mb-8 -mt-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <SearchBar
                value={inputValue}
                onChange={handleSearch}
                placeholder="Cari berita, pengumuman..."
              />

              {/* Category filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setCategory("Semua")}
                  className={`shrink-0 rounded-full border px-3 py-1 font-ui text-xs font-semibold transition-all ${
                    selectedCategory === "Semua"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  Semua
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 rounded-full border px-3 py-1 font-ui text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        {selectedCategory === "Semua" && !searchQuery && (
          <section className="px-4 mb-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Artikel Pilihan
              </h2>
              <div className="space-y-4">
                {featured.map((article) => (
                  <FeaturedCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Articles */}
        <section className="px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-info" />
                {selectedCategory === "Semua" ? "Semua Artikel" : selectedCategory}
              </h2>
              <span className="font-ui text-xs text-muted-foreground">
                {filtered.length} artikel
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-ink mb-1">Tidak ada hasil</p>
                <p className="font-body text-sm text-muted-foreground">
                  Coba ubah kata kunci atau kategori pencarian.
                </p>
                <button
                  onClick={() => {
                    handleSearch("");
                    setCategory("Semua");
                    setInputValue("");
                  }}
                  className="mt-4 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 font-ui text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((article) => (
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
