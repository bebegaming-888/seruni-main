import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "module";
import tsConfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";

const require = createRequire(import.meta.url);

function buildHashPlugin() {
  return {
    name: "vite-build-hash",
    configResolved(config: { env: Record<string, string> }) {
      let hash = Date.now().toString(36);
      try {
        hash = require("child_process")
          .execSync("git rev-parse --short HEAD", {
            encoding: "utf8",
            stdio: "pipe",
          })
          .trim();
      } catch {
        // no git → use timestamp fallback
      }
      config.env.VITE_BUILD_HASH = hash;
    },
  };
}

export default defineConfig({
  vite: {
    server: {
      proxy: {
        // Proxy /api/* to local API server during development
        "/api": {
          target: process.env.VITE_API_PROXY_URL || "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("recharts") || id.includes("recharts/")) return "recharts";
              if (id.includes("@tanstack")) return "tanstack";
              if (id.includes("@radix-ui")) return "radix-ui";
              if (id.includes("date-fns")) return "date-fns";
              if (id.includes("lucide-react")) return "lucide";
              if (id.includes("jspdf") || id.includes("pdf-lib")) return "pdf";
              if (id.includes("leaflet") || id.includes("react-leaflet")) return "maps";
              if (id.includes("@supabase")) return "supabase";
              if (id.includes("zod")) return "zod";
              // Heavy deps that grow the initial bundle: split to own chunk
              if (id.includes("xlsx") || id.includes("xlsx/")) return "xlsx";
              if (id.includes("papaparse") || id.includes("papaparse/")) return "papaparse";
              if (id.includes("quill") || id.includes("quill/")) return "quill";
              if (id.includes("jspdf") || id.includes("jspdf/")) return "pdf";
              if (id.includes("react-day-picker")) return "datepicker";
              if (id.includes("embla-carousel") || id.includes("@embla")) return "carousel";
              return "vendor";
            }
            // Route-level code splitting: Admin + ESurat pages are heavy
            // and only needed after login → split to async chunks
            if (id.includes("/pages/Admin.") || id.includes("/pages/Admin/")) return "admin";
            if (id.includes("/pages/ESurat.") || id.includes("/pages/ESurat/")) return "esurat";
            if (id.includes("/components/admin/LetterLayoutEditor.")) return "letter-editor";
            if (id.includes("/components/admin/LembagaManager.")) return "lembaga";
          },
        },
      },
    },
    plugins: [
      visualizer({
        open: false,
        gzipSize: true,
        filename: "dist-bundle/stats.html",
      }),
      buildHashPlugin(),
      // tsConfigPaths must be explicitly loaded after lovable config
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    define: {
      "import.meta.env.VITE_BUILD_HASH": JSON.stringify(
        (() => {
          try {
            return require("child_process")
              .execSync("git rev-parse --short HEAD", {
                encoding: "utf8",
                stdio: "pipe",
              })
              .trim();
          } catch {
            return Date.now().toString(36);
          }
        })(),
      ),
      // SECURITY FIX: Strip dev bypass flags in production builds
      ...(process.env.NODE_ENV === "production" && {
        "import.meta.env.VITE_DEV_OTP_BYPASS": "undefined",
        "import.meta.env.VITE_DEV_LOGIN_ENABLED": "undefined",
      }),
    },
  },
});
