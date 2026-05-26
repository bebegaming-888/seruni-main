/**
 * Preloader — Dark tactical loading screen
 *
 * Shows on first page load per session.
 * Dark background with diagonal stripes + rotating crosshair spinner.
 * Fades out after 2.5s or when app is ready (whichever comes first).
 *
 * Inspired by: thekrakentraining.com preloader pattern
 * Content preserved: village name + subtitle
 */

import { useEffect, useState, useRef } from "react";
import { getVillage } from "@/lib/village-dynamic";

const SESSION_KEY = "seruni_preloader_done";
const PRELOADER_DURATION_MS = 2500;

interface PreloaderProps {
  /** Called when preloader finishes (after animation) */
  onComplete?: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onComplete?.();
      return;
    }

    // Check if already shown this session
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      onComplete?.();
      return;
    }

    // Show preloader with fade-in
    setVisible(true);

    // Trigger title entrance animation
    titleTimerRef.current = setTimeout(() => setTitleVisible(true), 400);

    // Start exit at ~80% of duration
    exitTimerRef.current = setTimeout(() => {
      setExiting(true);
    }, PRELOADER_DURATION_MS * 0.8);

    // Remove after full duration + exit animation
    removeTimerRef.current = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(false);
      onComplete?.();
    }, PRELOADER_DURATION_MS + 500);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <>
      <style>{`
@keyframes preloader-spin {
  to { transform: rotate(360deg); }
}
@keyframes preloader-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.preloader-spin-slow {
  animation: preloader-spin 2s linear infinite;
}
.preloader-pulse-dot {
  animation: preloader-pulse 1.4s ease-in-out infinite;
}
`}</style>
      <div
        className={`preloader-v2${exiting ? " exiting" : ""} animate-blur-in`}
        role="progressbar"
        aria-label="Memuat aplikasi"
        aria-live="polite"
      >
        {/* Background gradient — dark + diagonal stripes */}
        <div className="preloader-v2__bg" />

        {/* Content */}
        <div className="preloader-v2__content">
          {/* Rotating crosshair spinner */}
          <div className="preloader-v2__logo">
            <svg
              className="preloader-spin-slow"
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer dashed circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.4"
              />
              {/* Crosshair lines */}
              <line
                x1="32"
                y1="4"
                x2="32"
                y2="16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="32"
                y1="48"
                x2="32"
                y2="60"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="32"
                x2="16"
                y2="32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="48"
                y1="32"
                x2="60"
                y2="32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Inner circle */}
              <circle
                cx="32"
                cy="32"
                r="6"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
                fill="none"
              />
              {/* Center dot */}
              <circle cx="32" cy="32" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Loading text — mono, uppercase */}
          <p
            className={`preloader-v2__loading-text ${titleVisible ? "animate-fade-in" : "opacity-0"}`}
          >
            LOADING<span className="preloader-pulse-dot">.</span>
            <span className="preloader-pulse-dot" style={{ animationDelay: "0.2s" }}>
              .
            </span>
            <span className="preloader-pulse-dot" style={{ animationDelay: "0.4s" }}>
              .
            </span>
          </p>

          {/* Village name — reads from settings store dynamically */}
          <h1 className={`preloader-v2__title ${titleVisible ? "animate-slide-up" : "opacity-0"}`}>
            {getVillage("name") ?? "Desa Seruni Mumbul"}
          </h1>
          <p className={`preloader-v2__subtitle ${titleVisible ? "animate-fade-in" : "opacity-0"}`}>
            Portal Resmi Pemerintah Desa
          </p>
        </div>

        {/* Decorative corner elements */}
        <div className="preloader-v2__corner preloader-v2__corner--tl" />
        <div className="preloader-v2__corner preloader-v2__corner--tr" />
        <div className="preloader-v2__corner preloader-v2__corner--bl" />
        <div className="preloader-v2__corner preloader-v2__corner--br" />

        {/* Animated gradient border — orange accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #FF5722 0%, #BFC9D1 50%, #FF5722 100%)",
            backgroundSize: "200% 100%",
            animation: "gradient-slide 2s linear infinite",
          }}
        />
      </div>
    </>
  );
}
