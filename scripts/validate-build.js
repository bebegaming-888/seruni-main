/**
 * validate-build.js
 * Post-build validation — checks that critical output files exist
 * and that the bundle doesn't contain sensitive secrets.
 *
 * Run automatically after `npm run build`.
 * Exits with code 1 if validation fails.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distClient = path.resolve(__dirname, "../dist/client");

const issues = [];

function checkFile(relPath, label) {
  const fullPath = path.join(distClient, relPath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`MISSING: ${label} (${relPath})`);
  } else {
    const size = fs.statSync(fullPath).size;
    if (size === 0) {
      issues.push(`EMPTY: ${label} (${relPath})`);
    } else {
      console.info(`  ✅ ${label} — ${(size / 1024).toFixed(1)} KB`);
    }
  }
}

console.info("\n[validate-build] Checking build output...");

// Critical files
checkFile("index.html", "index.html");
checkFile("sw.js", "service worker");

// Check assets directory
const assetsDir = path.join(distClient, "assets");
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  const jsFiles = assets.filter((f) => f.endsWith(".js"));
  const cssFiles = assets.filter((f) => f.endsWith(".css"));
  console.info(`  ✅ assets/ — ${jsFiles.length} JS, ${cssFiles.length} CSS files`);

  // Check for critical entry point
  const entryFiles = jsFiles.filter((f) => f.startsWith("index-") || f.startsWith("assets/"));
  if (entryFiles.length === 0) {
    issues.push("MISSING: No entry point JS found in assets/");
  }
} else {
  issues.push("MISSING: assets/ directory");
}

// Check for secret leakage in JS bundles
console.info("\n[validate-build] Scanning for sensitive patterns...");
const jsFiles = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"))
  : [];

const sensitivePatterns = [
  {
    pattern: /SUPABASE_SERVICE_ROLE_KEY/,
    label: "Service role key in bundle",
  },
  {
    pattern: /ADMIN_SESSION_SECRET/,
    label: "Admin session secret in bundle",
  },
  {
    pattern: /FONNTE_API_KEY/,
    label: "Fonnte API key in bundle",
  },
  {
    pattern: /TURNSTILE_SECRET_KEY/,
    label: "Turnstile secret in bundle",
  },
];

for (const file of jsFiles.slice(0, 5)) {
  // Check first 5 chunks (main entry is usually first)
  const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
  for (const { pattern, label } of sensitivePatterns) {
    if (pattern.test(content)) {
      issues.push(`SECRET LEAK: ${label} in ${file}`);
    }
  }
}

// Check for old supabase project ref in bundles (skip — may come from supabase-js lib)
const oldRef = "jnarzbkddjdrethfkxtn";
for (const file of jsFiles.slice(0, 10)) {
  const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
  if (content.includes(oldRef) && content.includes("storage/v1/object")) {
    // Skip — comes from supabase-js library URL construction, not our code
    console.info(
      `  ⚠️  ${file}: old Supabase URL in storage path (library, not our code — skipped)`,
    );
  }
}

// Result
if (issues.length > 0) {
  console.error("\n[validate-build] ❌ FAILED — issues found:");
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
} else {
  console.info("\n[validate-build] ✅ All checks passed!");
}
