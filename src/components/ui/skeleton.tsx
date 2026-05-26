/**
 * Skeleton loading components — consistent shimmer placeholders for all pages.
 * Uses `skeleton` class from styles.css (shimmer animation via CSS keyframes).
 */
import { cn } from "@/lib/utils";

// ── Base skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

// ── Card skeleton — for article/product grids ────────────────────────────────

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-skeleton p-4 space-y-3", className)}>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

// ── Article card skeleton — for berita/informasi grids ────────────────────

function ArticleCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-skeleton overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────────────────

function TableRowSkeleton({ cols = 5, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3 px-2", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 rounded", i === 0 ? "w-32" : i === cols - 1 ? "w-16" : "w-24")}
        />
      ))}
    </div>
  );
}

// ── Form field skeleton ──────────────────────────────────────────────────

function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

// ── Stat card skeleton — for admin dashboard ─────────────────────────────

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-skeleton p-4 sm:p-5 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  );
}

// ── Hero skeleton — for PageHero ─────────────────────────────────────────

function HeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 py-8 px-4", className)}>
      <div className="space-y-3 max-w-xl">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-12 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

// ── Surat card skeleton — for e-surat list ────────────────────────────────

function SuratCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-skeleton p-4 flex items-start gap-4", className)}>
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

// ── Compact list item skeleton ────────────────────────────────────────────

function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5 px-1", className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>
    </div>
  );
}

// ── Grid of skeleton cards ────────────────────────────────────────────────

function SkeletonGrid({
  count = 6,
  type = "card",
  className,
}: {
  count?: number;
  type?: "card" | "article" | "surat";
  className?: string;
}) {
  const Component =
    type === "article" ? ArticleCardSkeleton : type === "surat" ? SuratCardSkeleton : CardSkeleton;
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  CardSkeleton,
  ArticleCardSkeleton,
  TableRowSkeleton,
  FormFieldSkeleton,
  StatCardSkeleton,
  HeroSkeleton,
  SuratCardSkeleton,
  ListItemSkeleton,
  SkeletonGrid,
};
