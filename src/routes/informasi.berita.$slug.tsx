import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getSettings } from "@/lib/settings-store";
import { Link } from "@/components/Link";
import { formatDate, formatRelativeDate } from "@/data/berita";
import { useBeritaStore } from "@/lib/content-store";
import { sanitizeHtml } from "@/lib/utils";
import { ArrowLeft, Eye, Clock, Tag, Calendar, Share2, Bookmark, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/informasi/berita/$slug")({
  head: ({ params }) => {
    const article = useBeritaStore.getState().items.find((a) => a.slug === params.slug);
    const { village } = getSettings();
    return {
      meta: [
        { title: article ? `${article.title} — ${village.name}` : "Artikel Tidak Ditemukan" },
        {
          name: "description",
          content: article?.excerpt ?? "Artikel tidak ditemukan.",
        },
      ],
    };
  },
  component: () => <ArticleDetailPage />,
});

function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      to="/informasi/berita"
      search={{ category: "Semua" } as Record<string, string>}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-2.5 py-1 font-ui text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
    >
      <Tag className="h-3 w-3" />
      {tag}
    </Link>
  );
}

export function ArticleDetailPage() {
  const { slug } = Route.useParams();
  const items = useBeritaStore((state) => state.items);
  const article = items.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="rounded-2xl border border-border bg-card p-12">
              <div className="font-display text-6xl font-bold text-muted-foreground/50 mb-4">
                404
              </div>
              <h1 className="font-display text-2xl font-bold text-ink mb-2">
                Artikel Tidak Ditemukan
              </h1>
              <p className="font-body text-sm text-muted-foreground mb-6">
                Artikel yang Anda cari tidak tersedia atau telah dipindahkan.
              </p>
              <Link
                to="/informasi/berita"
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 font-ui text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Berita
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const related = items
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Article Header */}
        <section className="relative pt-24 pb-8 px-4 bg-gradient-to-br from-primary/5 via-background to-muted/30">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-5 font-ui text-xs text-muted-foreground">
              <Link to="/informasi/berita" className="hover:text-primary transition-colors">
                Berita
              </Link>
              <span>/</span>
              <span className="text-primary font-semibold">{article.category}</span>
            </div>

            {/* Category badge */}
            <div className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-ui text-xs font-semibold text-primary mb-4">
              {article.category}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink leading-tight mb-4">
              {article.title}
            </h1>

            <p className="font-body text-base text-muted-foreground leading-relaxed mb-6">
              {article.excerpt}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-display text-sm font-bold text-primary">
                  {article.author.nama[0]}
                </div>
                <div>
                  <p className="font-ui text-xs font-semibold text-foreground leading-tight">
                    {article.author.nama}
                  </p>
                  <p className="font-ui text-[10px] text-muted-foreground">{article.author.role}</p>
                </div>
              </div>

              <div className="h-4 w-px bg-border/50 hidden sm:block" />

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-ui text-xs">{formatDate(article.published_at)}</span>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-ui text-xs">{article.read_time} menit baca</span>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-ui text-xs">{article.views.toLocaleString()}x dilihat</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-3 py-1.5 font-ui text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak
              </button>
              <ShareButton title={article.title} />
              <BookmarkButton articleId={article.id} title={article.title} />
            </div>
          </div>
        </section>

        {/* Article Body */}
        <section className="px-4 mb-10">
          <div className="max-w-3xl mx-auto">
            {/* Cover area */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 h-52 sm:h-72 mb-8 flex items-center justify-center overflow-hidden">
              <div className="text-center p-6">
                <div className="font-display text-2xl font-bold text-primary/40 mb-2">
                  {article.category}
                </div>
                <p className="font-ui text-xs text-primary/40">{article.cover_image}</p>
              </div>
            </div>

            {/* Content */}
            <div
              className="prose prose-sm sm:prose-base max-w-none font-body"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
              style={
                {
                  "--tw-prose-body": "var(--color-foreground)",
                  "--tw-prose-headings": "var(--color-ink)",
                  "--tw-prose-links": "var(--color-primary)",
                } as React.CSSProperties
              }
            />

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-border/50">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="px-4 mb-16">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-xl font-bold text-ink mb-4">Artikel Terkait</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to="/informasi/berita/$slug"
                    params={{ slug: r.slug }}
                    className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <div className="inline-flex rounded-full bg-muted/60 border border-border/50 px-2 py-0.5 font-ui text-[10px] font-semibold text-muted-foreground mb-2">
                      {r.category}
                    </div>
                    <h3 className="font-display text-sm font-bold text-ink leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {r.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-ui text-[10px]">{r.read_time}m</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back link */}
        <section className="px-4 mb-10">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/informasi/berita"
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 font-ui text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Berita
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ShareButton({ title }: { title: string }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // dismissed
      }
    } else {
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link berhasil disalin ke clipboard");
      } catch {
        toast.error("Gagal menyalin link");
      }
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-3 py-1.5 font-ui text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
    >
      <Share2 className="h-3.5 w-3.5" />
      Bagikan
    </button>
  );
}

function BookmarkButton({ articleId, title }: { articleId: string; title: string }) {
  const [saved, setSaved] = useState(() => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem("article_bookmarks") ?? "[]");
      return bookmarks.includes(articleId);
    } catch {
      return false;
    }
  });

  const toggle = () => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem("article_bookmarks") ?? "[]");
      if (saved) {
        const updated = bookmarks.filter((id: string) => id !== articleId);
        localStorage.setItem("article_bookmarks", JSON.stringify(updated));
        setSaved(false);
        toast.success("Dihapus dari tersimpan");
      } else {
        bookmarks.push(articleId);
        localStorage.setItem("article_bookmarks", JSON.stringify(bookmarks));
        setSaved(true);
        toast.success("Disimpan");
      }
    } catch {
      toast.error("Gagal menyimpan");
    }
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-xs font-medium transition-colors ${
        saved
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-muted/60 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-primary" : ""}`} />
      {saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}
