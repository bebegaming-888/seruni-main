// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Plugin untuk inject VITE_BUILD_HASH — git commit hash atau timestamp
// Dipakai di service worker registration agar setiap deploy punya SW cache berbeda
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

// Vite plugin untuk generate index.html saat production build
// Ini弥补了 @lovable.dev/vite-tanstack-config 的 auto-generated config
// 不会为 client 环境生成入口 HTML 的特性
export default defineConfig({
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
    },
    plugins: [buildHashPlugin()],
    define: {
      // Inject langsung ke chunk JS (tidak di-minify away).
      // Dipakai di __root.tsx untuk service worker registration.
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
    },
  },
});
