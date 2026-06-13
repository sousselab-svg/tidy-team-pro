#!/usr/bin/env node
// Copies the official TanStack Start SPA shell (dist/client/_shell.html,
// generated because `spa.enabled` is on in vite.config.ts) to
// dist/client/index.html so Capacitor (iOS/Android) can ship it inside the
// native binary. A hand-made index.html cannot boot the app — the client
// entry needs the framework's serialized bootstrap payload, which only the
// prerendered shell contains.
import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..", "dist", "client");
const shellPath = resolve(clientDir, "_shell.html");
const indexPath = resolve(clientDir, "index.html");

if (!existsSync(shellPath)) {
  console.error(
    "[build-capacitor-shell] SPA shell not found at",
    shellPath,
    "\nMake sure vite.config.ts has tanstackStart.spa.enabled = true and the build completed successfully.",
  );
  process.exit(1);
}

copyFileSync(shellPath, indexPath);
console.log("[build-capacitor-shell] Wrote dist/client/index.html (copied from _shell.html)");