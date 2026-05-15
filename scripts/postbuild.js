/**
 * postbuild.js — Generate production index.html for SPA deployment
 *
 * Runs after `npm run build`. Reads the TanStack Start manifest from dist/server/assets/
 * (or dist/client/assets/) and rewrites dist/client/index.html with the correct
 * client entry script path.
 *
 * Background: @lovable.dev/vite-tanstack-config does not generate a
 * production-ready index.html for the client bundle — it only works in dev mode
 * where Vite's dev server resolves `virtual:tanstack-start-client-entry` at runtime.
 * In production, the index.html must reference the hashed client entry chunk directly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distClient = path.resolve(__dirname, "../dist/client");
const distServer = path.resolve(__dirname, "../dist/server");

function findManifest() {
  for (const dir of [path.join(distServer, "assets"), path.join(distClient, "assets")]) {
    try {
      const files = fs.readdirSync(dir);
      const found = files.find((f) => f.startsWith("_tanstack-start-manifest_v-"));
      if (found) return { file: found, dir };
    } catch {
      // dir may not exist yet
    }
  }
  return null;
}

const manifest = findManifest();
if (!manifest) {
  console.warn("[postbuild] TanStack manifest not found, skipping");
  process.exit(0);
}

const manifestContent = fs.readFileSync(path.join(manifest.dir, manifest.file), "utf-8");

// Extract clientEntry from the manifest, e.g. "/assets/index-XXXXXXXX.js"
const match = manifestContent.match(/clientEntry:\s*"([^"]+)"/);
if (!match) {
  console.warn("[postbuild] clientEntry not found in manifest, skipping");
  process.exit(0);
}
const clientEntry = match[1];

// Copy server .js assets to client directory (TanStack Start puts them in server/)
if (manifest.dir !== path.join(distClient, "assets")) {
  const serverDir = path.join(distServer, "assets");
  const clientDir = path.join(distClient, "assets");
  for (const file of fs.readdirSync(serverDir)) {
    if (file.endsWith(".js")) {
      fs.copyFileSync(path.join(serverDir, file), path.join(clientDir, file));
    }
  }
  console.info("[postbuild] Copied server assets to client directory");
}

// Generate production index.html
const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Desa Seruni Mumbul</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="description" content="Website resmi Pemerintah Desa Seruni Mumbul, Pringgabaya, Lombok Timur, NTB" />
  </head>
  <body>
    <div id="app"></div>
    <script>window.$_TSR={h(){this.hydrated=!0,this.c()},c(){this.hydrated&&this.streamEnded&&delete window.$_TSR},e(){this.streamEnded=!0,this.c()}};</script>
    <script type="module" crossorigin="anonymous" src="${clientEntry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distClient, "index.html"), html, "utf-8");
console.info(`[postbuild] Done — index.html updated with client entry: ${clientEntry}`);
