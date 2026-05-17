import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "module";
import tsConfigPaths from "vite-tsconfig-paths";

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
    build: {
      chunkSizeWarningLimit: 600,
    },
    plugins: [
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
    },
  },
});
