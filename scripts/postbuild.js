/**
 * postbuild.js — Generate production index.html for SPA deployment
 *
 * Runs after `npm run build`. Reads the TanStack Start manifest from dist/server/assets/
 * (or dist/client/assets/) and rewrites dist/client/index.html with the correct
 * client entry script path + window.$_TSR bootstrap.
 *
 * Problem: TanStack Start uses window.$_TSR for SPA hydration.
 *   SSR mode:  server injects bootstrap via tsrScript (includes router + manifest)
 *   SPA mode:  NO server — window.$_TSR only has lifecycle hooks, missing router
 *              → Sj() crashes at window.$_TSR.router||mn()
 * Fix: read manifest from dist/ and inject a minimal router bootstrap inline.
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

const match = manifestContent.match(/clientEntry:\s*"([^"]+)"/);
if (!match) {
  console.warn("[postbuild] clientEntry not found in manifest, skipping");
  process.exit(0);
}
const clientEntry = match[1];

// Copy server .js assets to client directory
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

// ── Build window.$_TSR bootstrap ──────────────────────────────────────────────
//
// Sj() in TanStack Start requires window.$_TSR.router to exist.
// SSR mode:  server injects via tsrScript (includes full router + manifest)
// SPA mode:  NO server injection → inject a minimal valid router bootstrap here
//            so Sj() doesn't crash at window.$_TSR.router||mn()
//
// The manifest file is: const tsrStartManifest = () => ({routes:{...}, clientEntry:"..."});
// We eval it to extract the routes object, then JSON.stringify it for the inline script.

let routesJson = "null";
try {
  // Strip export, evaluate the manifest function, extract routes
  const stripped = manifestContent
    .replace(/^const tsrStartManifest = /, "")
    .replace(/\nexport\s*\{[^}]*\};?\s*$/, "");
  // The expression starts with () => ({...}); — eval directly (no extra parens needed)
  // eslint-disable-next-line no-eval
  const manifestFn = eval(stripped);
  const data = typeof manifestFn === "function" ? manifestFn() : manifestFn;
  const routes = (data && (data.routes || data)) || {};
  routesJson = JSON.stringify(routes);
  console.info("[postbuild] Routes manifest extracted OK, size:", routesJson.length, "bytes");
} catch (e) {
  console.warn("[postbuild] Could not extract routes from manifest:", e.message);
}

// The inline script sets window.$_TSR with an empty-match router.
// This satisfies the window.$_TSR.router||mn() guard in Sj().
// The router then immediately rehydrates on the client with the full router instance.
const bootstrapScript = `<script>
window.$_TSR={buffer:[],h(){this.hydrated=!0,this.c()},c(){this.hydrated&&this.streamEnded&&delete window.$_TSR},e(){this.streamEnded=!0,this.c()},router:{matches:[],lastMatchId:null,dehydratedData:null,manifest:${routesJson}}};
</script>`;

const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Desa Seruni Mumbul</title>
    <link rel="icon" type="image/svg" href="/favicon.svg" />
    <meta name="description" content="Website resmi Pemerintah Desa Seruni Mumbul, Pringgabaya, Lombok Timur, NTB" />
  </head>
  <body>
    <div id="app"></div>
    ${bootstrapScript}
    <script type="module" crossorigin="anonymous" src="${clientEntry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distClient, "index.html"), html, "utf-8");
console.info(`[postbuild] Done — index.html updated with client entry: ${clientEntry}`);