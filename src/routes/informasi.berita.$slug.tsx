/**
 * informasi.berita.$slug.tsx — Article detail page
 *
 * BRAND COMPLIANT — full rewrite:
 *   Navbar + Footer  → @/components/site/{Navbar,Footer}
 *   Fonts           → Fraunces (display) | Raleway (body) | Poppins (ui)
 *   Brand Palette   → E37222 | 078898 | 66B9BF | EEAA78 | FFFFFF | F4F4F4 | D5D5D5
 *   Dark mode       → brand palette surface overrides only
 *   Category colors → only defined CSS tokens
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { getSettings } from "@/lib/settings-store";
import { formatDate, formatRelativeDate } from "@/data/berita";
import { useBeritaStore } from "@/lib/content-store";
import { sanitizeHtml } from "@/lib/utils";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/sections/PageHero";
import {
  ArrowLeft,
  Eye,
  Clock,
  Tag,
  Calendar,
  Share2,
  Bookmark,
  Printer,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// ── Brand palette (HSL — Tailwind-safe) ───────────────────────────────────────
const HSL = {
  primary: "hsl(27,79%,52%)", // #E37222
  secondary: "hsl(190,75%,36%)", // #078898
  accent: "hsl(183,50%,58%)", // #66B9BF
  warm: "hsl(27,55%,71%)", // #EEAA78
  light: "hsl(0,0%,96%)", // #F4F4F4
  border: "hsl(0,0%,84%)", // #D5D5D5
  text: "hsl(30,5%,10%)", // #1a1918
  textDim: "hsl(30,2%,37%)", // #5c5a56
  textMuted: "hsl(30,2%,55%)", // #9b9890
};

// ── Brand CSS — only 7 palette colors ─────────────────────────────────────────
const BRAND = {
  primary: "#E37222",
  secondary: "#078898",
  accent: "#66B9BF",
  warm: "#EEAA78",
  white: "#FFFFFF",
  light: "#F4F4F4",
  border: "#D5D5D5",
};

const STYLES = `
:root {
  --sa-primary:   ${HSL.primary};
  --sa-secondary: ${HSL.secondary};
  --sa-accent:    ${HSL.accent};
  --sa-warm:      ${HSL.warm};
  --sa-white:      ${HSL.light};
  --sa-light:      ${HSL.light};
  --sa-border:     ${HSL.border};
  /* Text — semi-stable within brand family */
  --sa-text:       ${HSL.text};
  --sa-text-dim:   ${HSL.textDim};
  --sa-text-muted: ${HSL.textMuted};
  /* Fonts — brand only */
  --sa-font-display: 'Fraunces', Georgia, serif;
  --sa-font-body: 'Raleway', system-ui, sans-serif;
  --sa-font-ui: 'Poppins', system-ui, sans-serif;
  --sa-radius: 8px;
}
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode — only brand palette derived surfaces */
    --sa-text:       hsl(30,5%,93%);
    --sa-text-dim:   hsl(30,2%,72%);
    --sa-text-muted: hsl(30,2%,42%);
  }
}
`;

// ── Category Colors — only brand tokens ─────────────────────────────────────────
const CAT_COLOR: Record<string, { color: string; label: string }> = {
  Berita: { color: HSL.primary, label: "Berita" },
  Pengumuman: { color: HSL.warm, label: "Pengumuman" },
  Agenda: { color: HSL.secondary, label: "Agenda" },
  default: { color: HSL.border, label: "" },
};

function getCatColor(cat: string) {
  return CAT_COLOR[cat] ?? CAT_COLOR.default;
}

// ── Reading Progress Bar ────────────────────────────────────────────────────────
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;
      setProgress(Math.min(100, (scrolled / total) * 100));
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: "3px",
        background: "var(--sa-border)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--sa-primary)",
          transition: "width 0.1s linear",
          width: `${progress}%`,
        }}
      />
    </div>
  );
}

// ── Share Button ───────────────────────────────────────────────────────────────
function ShareButton({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    const url = `${window.location.origin}/informasi/berita/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link berhasil disalin", {
          description: "Bagikan link artikel ini ke siapa saja.",
        });
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error("Gagal menyalin link");
      }
    }
  };
  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 font-ui text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
        copied
          ? "bg-[hsl(27,79%,52%)] text-white border-[hsl(27,79%,52%)]"
          : "bg-white text-[hsl(30,2%,37%)] border-[hsl(0,0%,84%)] hover:border-[hsl(190,75%,36%)] hover:text-[hsl(190,75%,36%)]"
      }`}
    >
      <Share2 className="h-3.5 w-3.5" />
      {copied ? "Tersalin!" : "Bagikan"}
    </button>
  );
}

// ── Bookmark Button ────────────────────────────────────────────────────────────
function BookmarkButton({ articleId, title }: { articleId: string; title: string }) {
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("article_bookmarks") ?? "[]").includes(articleId);
    } catch {
      return false;
    }
  });
  const toggle = () => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem("article_bookmarks") ?? "[]");
      if (saved) {
        localStorage.setItem(
          "article_bookmarks",
          JSON.stringify(bookmarks.filter((id: string) => id !== articleId)),
        );
        setSaved(false);
        toast.info("Dihapus dari tersimpan");
      } else {
        bookmarks.push(articleId);
        localStorage.setItem("article_bookmarks", JSON.stringify(bookmarks));
        setSaved(true);
        toast.success("Disimpan", { description: `"${title}" ditambahkan ke bookmark.` });
      }
    } catch {
      toast.error("Gagal menyimpan bookmark.");
    }
  };
  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 font-ui text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
        saved
          ? "bg-[hsl(27,79%,52%)] text-white border-[hsl(27,79%,52%)]"
          : "bg-white text-[hsl(30,2%,37%)] border-[hsl(0,0%,84%)] hover:border-[hsl(190,75%,36%)] hover:text-[hsl(190,75%,36%)]"
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
      {saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}

// ── Article Not Found ─────────────────────────────────────────────────────────
function ArticleNotFound() {
  const { village } = getSettings();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-display text-7xl font-bold text-[hsl(0,0%,84%)] leading-none mb-4">
          404
        </p>
        <h1 className="font-display text-2xl font-bold text-ink mb-3">Artikel Tidak Ditemukan</h1>
        <p className="font-body text-muted-foreground max-w-sm mb-8 leading-relaxed">
          Artikel yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          to="/informasi/berita"
          search={{ q: "", category: "Semua" }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[hsl(27,79%,52%)] text-[hsl(27,79%,52%)] font-ui text-sm font-semibold hover:bg-[hsl(27,79%,52%)] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Berita
        </Link>
      </main>
      <Footer />
    </div>
  );
}

// ── Author initials ─────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function ArticleDetailPage() {
  const { slug } = Route.useParams();
  const items = useBeritaStore((state) => state.items);
  const article = items.find((a) => a.slug === slug);
  const { village } = getSettings();

  if (!article) return <ArticleNotFound />;

  const related = items
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const catColor = getCatColor(article.category);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--sa-font-body)" }}>
      <style>{STYLES}</style>
      <ReadingProgress />
      <Navbar />

      <PageHero
        titleFirst="Portal"
        titleSecond="Berita"
        description={article.excerpt}
        badge={article.category}
        bgImage={article.cover_image ?? undefined}
        breadcrumbs={[{ label: "Informasi" }, { label: "Berita" }, { label: article.title }]}
      />

      {/* Article Header */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            Beranda
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to="/informasi/berita"
            search={{ q: "" as any, category: "Semua" as any }}
            className="hover:text-foreground transition-colors"
          >
            Berita
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: catColor.color, fontWeight: 600 }}>{article.category}</span>
        </nav>

        {/* Category badge */}
        <span
          className="inline-block text-[11px] font-ui font-bold uppercase tracking-widest mb-4 px-2.5 py-1 rounded-full"
          style={{ color: catColor.color, background: `${catColor.color}18` }}
        >
          {article.category}
        </span>

        {/* Title */}
        <h1
          className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-tight mb-5"
          style={{ letterSpacing: "-0.02em" }}
        >
          {article.title}
        </h1>

        {/* Excerpt */}
        <p className="font-body text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
          {article.excerpt}
        </p>

        {/* Meta bar */}
        <div
          className="flex flex-wrap items-center gap-4 py-4 border-y border-[hsl(0,0%,84%)] mb-8"
          style={{ fontFamily: "var(--sa-font-body)" }}
        >
          {/* Author */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-sm font-bold shrink-0"
              style={{ background: "var(--sa-primary)" }}
            >
              {getInitials(article.author.nama)}
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-foreground leading-tight">
                {article.author.nama}
              </p>
              <p className="font-ui text-[11px] text-muted-foreground">{article.author.role}</p>
            </div>
          </div>

          <div className="w-1 h-1 rounded-full bg-muted-foreground" />

          <div className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.published_at)}
          </div>

          <div className="w-1 h-1 rounded-full bg-muted-foreground" />

          <div className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {article.read_time} menit baca
          </div>

          <div className="w-1 h-1 rounded-full bg-muted-foreground" />

          <div className="flex items-center gap-1.5 text-xs font-ui text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {article.views.toLocaleString()}×
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-[hsl(0,0%,84%)] mb-10">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold px-4 py-2 rounded-full border border-[hsl(0,0%,84%)] text-[hsl(30,2%,37%)] hover:border-[hsl(190,75%,36%)] hover:text-[hsl(190,75%,36%)] transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak
          </button>
          <ShareButton title={article.title} slug={article.slug} />
          <BookmarkButton articleId={article.id} title={article.title} />
        </div>
      </section>

      {/* Article Body */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <div
          className="font-body text-base leading-[1.8] text-foreground prose-berita"
          style={{ fontFamily: "var(--sa-font-body)" }}
        >
          <style>{`
            .prose-berita h1, .prose-berita h2, .prose-berita h3,
            .prose-berita h4 { font-family: 'Fraunces', Georgia, serif; font-weight: 700; color: hsl(30,5%,10%); line-height: 1.2; margin: 1.75em 0 0.5em; letter-spacing: -0.01em; }
            .prose-berita h1 { font-size: 1.875rem; }
            .prose-berita h2 { font-size: 1.5rem; }
            .prose-berita h3 { font-size: 1.25rem; }
            .prose-berita h4 { font-size: 1.125rem; }
            .prose-berita p { margin: 0 0 1.25em; }
            .prose-berita a { color: hsl(27,79%,52%); text-decoration: none; }
            .prose-berita a:hover { text-decoration: underline; }
            .prose-berita strong { font-weight: 700; }
            .prose-berita em { font-style: italic; }
            .prose-berita blockquote {
              border-left: 3px solid hsl(27,79%,52%); padding: 0.5rem 0 0.5rem 1.25rem;
              margin: 1.5em 0; color: hsl(30,2%,37%); font-style: italic;
            }
            .prose-berita ul, .prose-berita ol { padding-left: 1.5rem; margin: 0 0 1.25em; }
            .prose-berita li { margin-bottom: 0.375em; }
            .prose-berita img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5em 0; }
            .prose-berita table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.9375rem; }
            .prose-berita th, .prose-berita td { border: 1px solid hsl(0,0%,84%); padding: 0.5rem 0.75rem; text-align: left; }
            .prose-berita th { background: hsl(0,0%,96%); font-weight: 700; }
            .prose-berita code { font-family: 'Courier New', monospace; font-size: 0.875em; background: hsl(0,0%,96%); border: 1px solid hsl(0,0%,84%); padding: 0.1em 0.35em; border-radius: 4px; }
            .prose-berita pre { background: hsl(0,0%,96%); border: 1px solid hsl(0,0%,84%); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1.5em 0; }
            .prose-berita pre code { background: none; border: none; padding: 0; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="pt-8 border-t border-[hsl(0,0%,84%)]">
            <p className="flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-semibold border border-[hsl(0,0%,84%)] text-[hsl(30,2%,37%)] bg-[hsl(0,0%,96%)] hover:bg-[hsl(27,79%,52%)] hover:text-white hover:border-[hsl(27,79%,52%)] transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author card */}
        <div className="mt-10 p-5 rounded-2xl border border-[hsl(0,0%,84%)] bg-[hsl(0,0%,96%)] flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-display text-lg font-bold shrink-0"
            style={{ background: "hsl(27,79%,52%)" }}
          >
            {getInitials(article.author.nama)}
          </div>
          <div>
            <p className="font-body text-sm font-bold text-foreground">{article.author.nama}</p>
            <p className="font-ui text-xs text-muted-foreground mb-2">{article.author.role}</p>
            <p className="font-body text-sm text-[hsl(30,2%,37%)] leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        </div>
      </section>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="border-t border-[hsl(0,0%,84%)] py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-display text-lg font-bold text-ink shrink-0">Artikel Terkait</h2>
              <div className="h-px flex-1 bg-[hsl(0,0%,84%)]" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => {
                const rCat = getCatColor(r.category);
                return (
                  <Link
                    key={r.id}
                    to="/informasi/berita/$slug"
                    params={{ slug: r.slug }}
                    search={{} as any}
                    className="group rounded-2xl border border-[hsl(0,0%,84%)] bg-card p-4 hover:shadow-card hover:border-[hsl(27,79%,52%_/_0.3)] transition flex flex-col gap-2"
                  >
                    <span
                      className="text-[10px] font-ui font-bold uppercase tracking-wider"
                      style={{ color: rCat.color }}
                    >
                      {r.category}
                    </span>
                    <p className="font-display text-sm font-semibold text-ink leading-snug group-hover:text-[hsl(27,79%,52%)] transition-colors line-clamp-3">
                      {r.title}
                    </p>
                    <p className="font-ui text-[11px] text-muted-foreground mt-auto pt-2 border-t border-[hsl(0,0%,84%)] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {r.read_time}m · {formatRelativeDate(r.published_at)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Nav footer */}
      <div className="border-t border-[hsl(0,0%,84%)] py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/informasi/berita"
            search={{ q: "" as any, category: "Semua" as any }}
            className="inline-flex items-center gap-2 font-ui text-sm font-semibold px-5 py-2.5 rounded-full border border-[hsl(0,0%,84%)] text-[hsl(30,2%,37%)] bg-white hover:border-[hsl(190,75%,36%)] hover:text-[hsl(190,75%,36%)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Semua Artikel
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            ↑ Ke atas
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export const Route = createFileRoute("/informasi/berita/$slug")({
  validateSearch: () => ({}),
  head: ({ params }) => {
    const article = useBeritaStore.getState().items.find((a) => a.slug === params.slug);
    const { village } = getSettings();

    // JSON-LD Article structured data
    const articleSchema = article
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          image: article.cover_image,
          datePublished: article.published_at,
          dateModified: article.updated_at ?? article.published_at,
          author: {
            "@type": "GovernmentOrganization",
            name: village.name,
          },
          publisher: {
            "@type": "GovernmentOrganization",
            name: village.name,
            url: "https://serunimumbul.id",
          },
        }
      : null;

    return {
      meta: [
        {
          title: article ? `${article.title} — ${village.name}` : "Artikel Tidak Ditemukan",
        },
        {
          name: "description",
          content: article?.excerpt ?? "Artikel tidak ditemukan.",
        },
        ...(article?.cover_image ? [{ property: "og:image", content: article.cover_image }] : []),
      ],
      scripts: articleSchema
        ? [{ type: "application/ld+json", innerHTML: JSON.stringify(articleSchema) }]
        : [],
    };
  },
  component: ArticleDetailPage,
});
