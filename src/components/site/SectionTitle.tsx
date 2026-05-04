type Props = {
  first: string;
  second: string;
  className?: string;
  as?: "h1" | "h2";
  variant?: "section" | "hero";
};

const FRAUNCES_STACK = `"Fraunces", Georgia, "Times New Roman", serif`;

// eslint-disable-next-line no-control-regex
const CONTROL_STRIP = /[\x00-\x1f\x7f]/;

function sanitizeWord(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input.normalize("NFKC").replace(CONTROL_STRIP, "").trim();
  if (!cleaned) return fallback;
  const first = cleaned.split(/\s+/)[0] ?? "";
  return (first || fallback).slice(0, 32);
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
    <Tag className={`${baseClass} text-ink ${className}`} style={{ fontFamily: FRAUNCES_STACK }}>
      <span className="not-italic" style={{ fontFamily: FRAUNCES_STACK }}>
        {f}
      </span>{" "}
      <em
        className="italic text-primary"
        style={{ fontFamily: FRAUNCES_STACK, fontStyle: "italic" }}
      >
        {s}
      </em>
    </Tag>
  );
}
