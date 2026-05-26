import { cn } from "@/lib/utils";
import { TextReveal } from "@/components/ui/TextReveal";

type Props = {
  first: string;
  second: string;
  className?: string;
  as?: "h1" | "h2";
  variant?: "section" | "hero";
};

function sanitizeWord(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input.normalize("NFKC").trim();
  if (!cleaned) return fallback;
  const first = cleaned.split(/\s+/)[0] ?? "";
  return (first || fallback).slice(0, 48);
}

export function SectionTitle({
  first,
  second,
  className = "",
  as = "h2",
  variant = "section",
}: Props) {
  const f = sanitizeWord(first, "Judul");
  const s = sanitizeWord(second, "Bagian");
  const Tag = as as "h2";
  const baseClass = variant === "hero" ? "hero-title" : "section-title";
  return (
    <Tag className={cn(baseClass, "text-foreground", className)}>
      <TextReveal mode="scroll">{f}</TextReveal>
      {second && (
        <>
          {" "}
          <em className="italic text-primary not-italic">
            <TextReveal mode="scroll">{s}</TextReveal>
          </em>
        </>
      )}
    </Tag>
  );
}
