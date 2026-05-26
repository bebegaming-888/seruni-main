/**
 * useReveal — Unified scroll reveal + stagger hook (CSS-only, no GSAP/Lenis)
 *
 * Combines: useScrollReveal + useStaggerReveal + useScrollRevealStagger
 * All from the old use-scroll-reveal.ts and useScrollReveal.ts.
 *
 * Usage:
 *   const [ref, isVisible] = useReveal<HTMLDivElement>()
 *   <div ref={ref} className={`reveal ${isVisible ? "is-visible" : ""}`}>
 *
 *   const ref = useStaggerReveal<HTMLDivElement>({ stagger: 0.08 })
 *   <div ref={ref} className="reveal-stagger">
 *     <div>Item 1</div>
 *     <div>Item 2</div>
 *   </div>
 */

import { useEffect, useRef, useState, type RefObject } from "react";

interface RevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  visibleClass?: string;
}

interface StaggerOptions {
  stagger?: number;
  threshold?: number;
}

/** Single element scroll reveal — adds .is-visible class when in viewport */
export function useReveal<T extends HTMLElement>(
  options: RevealOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -5% 0px",
    once = true,
    visibleClass = "is-visible",
  } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(visibleClass);
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove(visibleClass);
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, visibleClass]);

  return [ref, isVisible];
}

/** Stagger reveal for parent container — adds .is-visible to children with delay */
export function useStaggerReveal<T extends HTMLElement>(
  options: StaggerOptions = {},
): RefObject<T | null> {
  const { stagger = 0.08, threshold = 0.1 } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.querySelectorAll(":scope > *").forEach((child) => {
        (child as HTMLElement).style.opacity = "1";
        (child as HTMLElement).style.transform = "none";
      });
      return;
    }

    const children = Array.from(el.querySelectorAll(":scope > *")) as HTMLElement[];
    children.forEach((child, i) => {
      (child as HTMLElement).style.transitionDelay = `${i * stagger}s`;
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stagger, threshold]);

  return ref;
}
