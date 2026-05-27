/**
 * tailwind.config.ts — IDE IntelliSense only (Tailwind v4)
 *
 * PURPOSE: Enables VS Code Tailwind IntelliSense extension autocomplete
 * for custom colors, fonts, and spacing defined in src/styles.css.
 *
 * IMPORTANT: This file does NOT control the actual Tailwind build.
 * Tailwind v4 reads its configuration exclusively from CSS (src/styles.css).
 * This config exists only so the IDE can provide class-name suggestions.
 *
 * If you add @config "./tailwind.config.ts" to CSS, keep the theme block
 * in sync with src/styles.css @theme {} block.
 *
 * @see https://tailwindcss.com/docs/configuration
 */

import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Content paths — must match what Tailwind scans for class names
// ---------------------------------------------------------------------------
const content = ["./src/**/*.{ts,tsx,js,jsx}"];

// ---------------------------------------------------------------------------
// Theme — mirrors src/styles.css @theme {} block for IDE autocomplete.
// Only the values IntelliSense needs are included (colors, fonts, radii).
// ---------------------------------------------------------------------------
const theme = {
  extend: {
    // ── Border Radius ─────────────────────────────────────────────────────
    borderRadius: {
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      "2xl": "20px",
      "3xl": "24px",
    },

    // ── Brand & Semantic Colors ────────────────────────────────────────────
    // Light mode values (dark mode values are handled by CSS variables in
    // src/styles.css .dark {} block — IntelliSense shows both automatically).
    colors: {
      // Semantic / shadcn-ui palette
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      card: "hsl(var(--card))",
      "card-foreground": "hsl(var(--card-foreground))",
      popover: "hsl(var(--popover))",
      "popover-foreground": "hsl(var(--popover-foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
        hover: "hsl(var(--primary-hover))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      success: {
        DEFAULT: "hsl(var(--success))",
        foreground: "hsl(var(--success-foreground))",
      },
      warning: {
        DEFAULT: "hsl(var(--warning))",
        foreground: "hsl(var(--warning-foreground))",
      },
      info: {
        DEFAULT: "hsl(var(--info))",
        foreground: "hsl(var(--info-foreground))",
      },
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",

      // Sidebar
      sidebar: {
        DEFAULT: "hsl(var(--sidebar))",
        foreground: "hsl(var(--sidebar-foreground))",
        primary: {
          DEFAULT: "hsl(var(--sidebar-primary))",
          foreground: "hsl(var(--sidebar-primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--sidebar-accent))",
          foreground: "hsl(var(--sidebar-accent-foreground))",
        },
        border: "hsl(var(--sidebar-border))",
        ring: "hsl(var(--sidebar-ring))",
      },

      // Chart palette
      chart: {
        1: "hsl(var(--chart-1))",
        2: "hsl(var(--chart-2))",
        3: "hsl(var(--chart-3))",
        4: "hsl(var(--chart-4))",
        5: "hsl(var(--chart-5))",
      },

      // Brand colors — Zero Hardcore palette
      "brand-teal": "hsl(var(--brand-teal))",
      "brand-orange": "hsl(var(--brand-orange))",
      "brand-sand": "hsl(var(--brand-sand))",
      "brand-dark": "hsl(var(--brand-dark))",
      "brand-muted": "hsl(var(--brand-muted))",
      "brand-light": "hsl(var(--brand-light))",
      ink: "hsl(var(--ink))",

      // E-Surat category badge colors — WCAG AA compliant (Mei 2026)
      "cat-kependudukan": "hsl(var(--color-cat-kependudukan))",
      "cat-sosial": "hsl(var(--color-cat-sosial))",
      "cat-pernikahan": "hsl(var(--color-cat-pernikahan))",
      "cat-usaha": "hsl(var(--color-cat-usaha))",
      "cat-tanah": "hsl(var(--color-cat-tanah))",
      "cat-pendidikan": "hsl(var(--color-cat-pendidikan))",
      "cat-kesehatan": "hsl(var(--color-cat-kesehatan))",
      "cat-pertanian": "hsl(var(--color-cat-pertanian))",
      "cat-surat-dinas": "hsl(var(--color-cat-surat-dinas))",
      "cat-umum": "hsl(var(--color-cat-umum))",
    },

    // ── Fonts ──────────────────────────────────────────────────────────────
    fontFamily: {
      display: ['"Fraunces"', "Georgia", "serif"],
      body: ['"Raleway"', "Helvetica Neue", "sans-serif"],
      ui: ['"Poppins"', "Helvetica Neue", "sans-serif"],
      mono: ['"JetBrains Mono"', "Courier New", "monospace"],
    },
  },
};

// ---------------------------------------------------------------------------
// plugins: [] — no runtime plugins needed for IDE-only config.
// (Tailwind v4 CSS-first; runtime plugins are registered in vite.config.ts.)
// ---------------------------------------------------------------------------
const plugins: Config["plugins"] = [];

const config: Config = { content, theme, plugins };

export default config;
