/**
 * TextReveal — Unified text scramble animation (replaces TextScramble + ScrambleText)
 *
 * Three modes:
 * - "load": Animates once on component mount
 * - "scroll": Animates when enters viewport
 * - "hover": Interactive scramble on mouse enter/leave
 *
 * Usage:
 *   <TextReveal mode="hover">Click me</TextReveal>
 *   <TextReveal mode="scroll" className="text-2xl">Heading</TextReveal>
 */

import { useRef, useEffect, type ReactNode, type ElementType } from "react";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789▯|";

interface TextRevealProps {
  children: ReactNode;
  mode?: "load" | "scroll" | "hover";
  className?: string;
  as?: ElementType;
}

function scrambleText(el: HTMLElement, duration = 400): () => void {
  const original = el.dataset.textRevealOrigin ?? el.textContent ?? "";
  el.dataset.textRevealOrigin = original;

  const start = performance.now();
  let rafId: number;

  const tick = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const visibleCount = Math.floor(progress * original.length);

    el.textContent = original
      .split("")
      .map((char, i) => {
        if (i < visibleCount || char === " ") return char;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      })
      .join("");

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      el.textContent = original;
    }
  };

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

export function TextReveal({
  children,
  mode = "hover",
  className = "",
  as: Tag = "span",
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip on touch devices or reduced motion
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || prefersReduced) return;

    if (mode === "hover") {
      const onEnter = () => scrambleText(el, 350);
      const onLeave = () => {
        el.textContent = el.dataset.textRevealOrigin ?? "";
      };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      };
    }

    if (mode === "load") {
      const timer = setTimeout(() => scrambleText(el, 600), 200);
      return () => clearTimeout(timer);
    }

    if (mode === "scroll") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            scrambleText(el, 600);
            observer.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [mode]);

  return (
    <Tag ref={ref as React.RefObject<HTMLElement>} className={className}>
      {children}
    </Tag>
  );
}
