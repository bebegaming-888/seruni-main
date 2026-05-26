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

// ── Locate TanStack manifest ──────────────────────────────────────────────────
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

// ── Step 1: Locate TanStack manifest ──────────────────────────────────────────
console.info("[postbuild:step-1] Locating TanStack manifest...");
const manifest = findManifest();
if (!manifest) {
  console.warn("[postbuild] TanStack manifest not found, skipping");
  process.exit(0);
}
console.info(`[postbuild:step-1] Manifest found: ${manifest.file}`);

console.info("[postbuild:step-2] Reading manifest content...");
const manifestContent = fs.readFileSync(path.join(manifest.dir, manifest.file), "utf-8");
console.info("[postbuild:step-2] Manifest preview:", manifestContent.substring(0, 500));

// ── Step 3: Extract clientEntry path ─────────────────────────────────────────
console.info("[postbuild:step-3] Extracting client entry path...");
let match = manifestContent.match(/clientEntry:\s*"([^"]+)"/);
if (!match) {
  match = manifestContent.match(/clientEntry:\s*'([^']+)'/);
}
if (!match) {
  const clientAssets = path.join(distClient, "assets");
  try {
    const files = fs.readdirSync(clientAssets);
    console.info(
      "[postbuild:step-3] Client assets files:",
      files.filter((f) => f.endsWith(".js")).slice(0, 10),
    );
    const entryFile = files.find(
      (f) => (f.startsWith("entry-") || f.startsWith("index-")) && f.endsWith(".js"),
    );
    if (entryFile) {
      console.info("[postbuild:step-3] Using fallback entry:", entryFile);
      match = [null, `/assets/${entryFile}`];
    }
  } catch (e) {
    console.warn("[postbuild:step-3] Could not read client assets:", e.message);
  }
}
if (!match) {
  console.warn("[postbuild:step-3] clientEntry not found in manifest, skipping");
  console.warn("[postbuild] Manifest content:", manifestContent);
  process.exit(0);
}
const clientEntry = match[1];
console.info(`[postbuild:step-3] Client entry: ${clientEntry}`);

// ── Step 4: Copy server .js assets to client directory ───────────────────────
console.info("[postbuild:step-4] Copying server assets to client directory...");
if (manifest.dir !== path.join(distClient, "assets")) {
  const serverDir = path.join(distServer, "assets");
  const clientDir = path.join(distClient, "assets");
  for (const file of fs.readdirSync(serverDir)) {
    if (file.endsWith(".js")) {
      fs.copyFileSync(path.join(serverDir, file), path.join(clientDir, file));
    }
  }
  console.info("[postbuild:step-4] Server assets copied to client directory");
} else {
  console.info("[postbuild:step-4] No copy needed — manifest already in client assets");
}

// ── Step 5: Extract routes from manifest ──────────────────────────────────────
console.info("[postbuild:step-5] Extracting routes from manifest...");
let routesJson = "null";
try {
  // Strip manifest wrapper: "const tsrStartManifest = ...export { routes, ... };"
  const stripped = manifestContent
    .replace(/^const tsrStartManifest = /, "")
    .replace(/\nexport\s*\{[^}]*\};?\s*$/, "");

  // Build safe JSON: wrap object literal so JSON.parse handles it
  // e.g. '{"routes":{...},"components":{...}}'
  const trimmed = stripped.trim().replace(/;$/, "");
  if (trimmed.startsWith("{")) {
    routesJson = trimmed;
  } else {
    // Manifest is a IIFE or function — use Function constructor (build-time only, no user input)
    // eslint-disable-next-line no-new-func
    const manifestFn = new Function(`return ${trimmed}`);
    const data = manifestFn();
    routesJson = JSON.stringify(data || {});
  }
  console.info(`[postbuild:step-5] Routes manifest extracted OK (${(routesJson && routesJson.length) ? routesJson.length : 0} bytes)`);
} catch (e) {
  console.warn("[postbuild:step-5] Could not extract routes from manifest:", e.message);
}

// ── Step 6: Generate index.html ───────────────────────────────────────────────
console.info("[postbuild:step-6] Generating index.html...");
const bootstrapScript = `<script>
window.$_TSR={buffer:[],h(){this.hydrated=!0,this.c()},c(){this.hydrated&&this.streamEnded&&delete window.$_TSR},e(){this.streamEnded=!0,this.c()},router:{matches:[],lastMatchId:null,dehydratedData:null,manifest:${routesJson}}};
</script>`;

const nonce = Math.random().toString(36).substring(2, 15);
const buildTime = new Date().toISOString();

const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.fonnte.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:;" />
    <title>Desa Seruni Mumbul</title>
    <link rel="icon" type="image/svg" href="/favicon.svg" />
    <meta name="description" content="Website resmi Pemerintah Desa Seruni Mumbul, Pringgabaya, Lombok Timur, NTB" />
  </head>
  <body>
    <div id="app"></div>
    ${bootstrapScript.replace("<script>", `<script nonce="${nonce}">`)}
    <script type="module" crossorigin="anonymous" src="${clientEntry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distClient, "index.html"), html, "utf-8");
console.info(`[postbuild:step-6] index.html written (${html.length} bytes)`);

// ── Step 7: Generate manifest.json with build info ────────────────────────────
console.info("[postbuild:step-7] Generating manifest.json...");
const manifestMeta = {
  version: "1.0",
  buildTime,
  clientEntry,
  manifestFile: manifest.file,
  routerManifestSize: (routesJson && routesJson.length) ? routesJson.length : 0,
  htmlFileSize: html.length,
  nonce,
};
try {
  fs.writeFileSync(
    path.join(distClient, "manifest.json"),
    JSON.stringify(manifestMeta, null, 2),
    "utf-8",
  );
  console.info("[postbuild:step-7] manifest.json written");
} catch (e) {
  console.warn("[postbuild:step-7] Could not write manifest.json:", e.message);
}

console.info(`[postbuild] Done — index.html updated with client entry: ${clientEntry}`);
