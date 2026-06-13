#!/usr/bin/env node
// Generates dist/client/index.html — a minimal SPA shell that boots the
// TanStack client entry. Required for Capacitor (iOS/Android) which ships
// the bundle inside the native binary and cannot run the SSR worker.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..", "dist", "client");
const manifestPath = resolve(clientDir, ".vite", "manifest.json");

if (!existsSync(manifestPath)) {
  console.error("[build-capacitor-shell] Vite manifest not found at", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entry = Object.values(manifest).find((e) => e.isEntry);
if (!entry) {
  console.error("[build-capacitor-shell] No client entry chunk in manifest");
  process.exit(1);
}

const cssEntry = manifest["/dev-server/src/styles.css"] ?? Object.values(manifest).find(
  (e) => typeof e.file === "string" && e.file.endsWith(".css")
);

const cssLinks = [cssEntry?.file, ...(entry.css ?? [])]
  .filter(Boolean)
  .map((href) => `    <link rel="stylesheet" href="/${href}" />`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <title>Field Service</title>
    <meta name="description" content="Field Service mobile app" />
    <link rel="icon" type="image/png" href="/assets/app-icon-CrB3AMZe.png" />
    <link rel="apple-touch-icon" href="/assets/app-icon-CrB3AMZe.png" />
${cssLinks}
    <style>html,body,#root{background:#fff;margin:0;min-height:100vh}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry.file}"></script>
  </body>
</html>
`;

writeFileSync(resolve(clientDir, "index.html"), html, "utf8");
console.log("[build-capacitor-shell] Wrote dist/client/index.html (entry:", entry.file + ")");